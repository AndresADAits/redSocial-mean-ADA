'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;

// Conexión a BBDD
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/redSocial_mean', { useMongoClient: true})
        .then(() =>{
            console.log("La conexión a la base de datos es correcta");
            
            // Crear servidor
            app.listen(port, ()=>{
                console.log("Servidor corriendo en http://localhost:3800");
            });
        })
        .catch(err => console.log(err));
