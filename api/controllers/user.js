'use strict'

var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
var fs = require('fs');
var path = require('path');
var User = require('../models/user');
var Follow = require('../models/follow');
var Publication = require('../models/publication');
var jwt = require('../services/jwt');

//Metodos de prueba
function home(req, res) {
    res.status(200).send({
        message: 'Hola mundo'
    });
}

function pruebas(req, res) {
    console.log(req.body);
    res.status(200).send({
        message: 'Prueba'
    });
}

//Registro
function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname &&
        params.nick && params.email &&
        params.password) {

        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        //COMPRUEBO QUE NO EXISTA EL USUARIO YA

        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error en la peticion' })

            if (users && users.length >= 1) {
                return res.status(200).send({ message: 'El usuario ya existe' })
            } else {
                //GUARDO LA CONTRASEÑA CIFRADA
                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;
                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'Error al guardar usuario' })

                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status(404).send({ message: 'No se ha registrado el usuario' });
                        }
                    });
                });

            }
        });


    } else {
        res.status(200).send({ message: 'Faltan campos necesarios' });
    }
}

//Login
function loginUser(req, res) {
    var params = req.body;

    var email = params.email;
    var password = params.password;

    User.findOne({ email: email }, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' })

        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    if (params.gettoken) {

                        //Genero y Devuelvo token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        })

                    } else {
                        //Devuelvo datos de usuario
                        user.password = undefined;
                        return res.status(200).send({ user });
                    }


                } else {
                    return res.status(404).send({ message: 'El usuario no se ha podido identificar' })
                }
            })
        } else {

            return res.status(404).send({ message: 'El usuario no se ha podido identificar' })

        }

    })
}

// Conseguir datos de usuario

function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la peticion' });

        if (!user) return res.status(404).send({ message: 'El usuario no existe' });
        followedThisUser(req.user.sub, userId).then((value) => {
            return res.status(200).send({ user, value });
        });
    });
}
//Función asincrona  que analiza el seguimiento entre usuarios y que devuelve una promesa que es usada en la funcion getUser
function followsThisUser(identity_user_id, user_id) {
    return new Promise(resolve => {
        Follow.findOne({ "user": identity_user_id, "followed": user_id }).exec((err, follows) => {
            if (err) { return handleError(err) }
            resolve(follows)
        })
    })
}

async function followedThisUser(identity_user_id, user_id) {
    var following = await followsThisUser(identity_user_id, user_id)
    var followed = await followsThisUser(user_id, identity_user_id)
    return {
        following: following,
        followed: followed
    }
}
//Devolver listado de usuarios paginado

function getUsers(req, res) {
    var user_id = req.user.sub;

    var page = 1;
    if (req.params.page) {
        page = req.params.page;
    }
    var itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
        if (err) return res.status(500).send({ message: "Error en la peticion", err });
        if (!users) return res.status(404).send({ message: "No hay Usuarios" });

        followUserIds(user_id).then((response) => {
            return res.status(200).send({ message: "Resultados", users, users_following: response.following, users_followed: response.followed, total, pages: Math.ceil(total / itemsPerPage) });
        });
    });
}
//Creacion de dos arrays de ids de usuario,ids de usuarios que seguimos  e ids de usuarios que nos siguen

async function followUserIds(user_id) {

    var following = await Follow.find({ 'user': user_id }).select({ '_id': 0, '__v': 0, 'user': 0 }).exec()
        .then((follows) => {
            return follows;
        })
        .catch((err) => {
            return handleError(err);
        });
    var followed = await Follow.find({ followed: user_id }).select({ '_id': 0, '__v': 0, 'followed': 0 }).exec()
        .then((follows) => {
            return follows;
        })
        .catch((err) => {
            return handleError(err);
        });

    var following_clean = [];

    following.forEach((follow) => {
        following_clean.push(follow.followed);
    });
    var followed_clean = [];

    followed.forEach((follow) => {
        followed_clean.push(follow.user);
    });
    //console.log(following_clean);
    return { following: following_clean, followed: followed_clean }

}

// Devuelve contadores de usuarios que seguimos y que nos siguen
const getCounters = (req, res) => {
    let userId = req.user.sub;
    if (req.params.id) {
        userId = req.params.id;
    }
    getCountFollow(userId).then((value) => {
        return res.status(200).send(value);
    })
}

const getCountFollow = async (user_id) => {
    try {
        // Lo hice de dos formas. "following" con callback de countDocuments y "followed" con una promesa
        let following = await Follow.countDocuments({ "user": user_id }, (err, result) => { return result });
        let followed = await Follow.countDocuments({ "followed": user_id }).then(count => count);
        let publications = await Publication.count({ "user": user_id }, (err, count) => { return count });

        return { following, followed, publications }

    } catch (e) {
        console.log(e);
    }
}

// Edicion datos usuario
function updateUser(req, res){
	var userId = req.params.id;
	var update = req.body;

	// borrar propiedad password
	delete update.password;

	if(userId != req.user.sub){
		return res.status(500).send({message: 'No tienes permiso para actualizar los datos del usuario'});
	}

	User.find({ $or: [
				 {email: update.email.toLowerCase()},
				 {nick: update.nick.toLowerCase()}
		 ]}).exec((err, users) => {
		 
		 	var user_isset = false;
		 	users.forEach((user) => {
		 		if(user && user._id != userId) user_isset = true;
		 	});

		 	if(user_isset) return res.status(404).send({message: 'Los datos ya están en uso'});
		 	
		 	User.findByIdAndUpdate(userId, update, {new:true}, (err, userUpdated) => {
				if(err) return res.status(500).send({message: 'Error en la petición'});

				if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar el usuario'});

				return res.status(200).send({user: userUpdated});
			});

		 });

}

//Imagen usuario

function uploadImage(req, res) {
    var userId = req.params.id;

    if (req.files) {
        var file_path = req.files.image.path;
        // console.log(file_path);
        var file_split = file_path.split('\\');
        //console.log(file_split);

        var file_name = file_split[2];
        //console.log(file_name);

        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1];
        //   console.log(file_ext);

        if (userId != req.user.sub) {

            return removeFileOfUpload(res, files_path, 'No tienes permiso para actualizar la imagen del usuario');

        }

        if (file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {
            // Actualizar documentro de usuario logueado
            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdate) => {
                if (err) return res.status(500).send({ message: 'Error en la peticion' });
                if (!userUpdate) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });
                return res.status(200).send({ user: userUpdate });

            });
        } else {
            return removeFileOfUpload(res, files_path, 'Extensión no valida');

        }


    } else {
        return res.status(200).send({ message: 'No se han subido archivos' });
    }
}


function removeFileOfUpload(res, files_path, message) {
    fs.unlink(files_path, (err) => {
        return res.status(200).send({ message: message });
    });
}

function removeFileOfUpload(res, file_path, message) {
    fs.unlink(file_path, (err) => {
        if (err) return res.status(200).send({ message: message });
    });
}

function getImageFile(req, res) {
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen' });
        }
    });
}


module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile
}