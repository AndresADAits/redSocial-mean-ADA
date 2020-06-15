'use strict'

var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user');
var Follow = require('../models/follow');
var Message = require('../models/message');

// Comprobar conexión correcta
function probando(req, res) {
	res.status(200).send({ message: 'Prueba message.js OK!' });
}
// Duarda los mensajes si se le envia una cabecera con el token de autorizacion, y por el body un texto y un id del destinatario. 
// Guarda aparte de emisor y receptor, el momento en el que se envio este mensaje.
function saveMessage(req, res) {
	var params = req.body;

	if (!params.text || !params.receiver) return res.status(200).send({ message: 'Envia los datos necesarios' });

	var message = new Message();
	message.emitter = req.user.sub;
	message.receiver = params.receiver;
	message.text = params.text;
	message.created_at = moment().unix();
	message.viewed = 'false';

	message.save((err, messageStored) => {
		if (err) return res.status(500).send({ message: 'Error en el Servidor, intentelo más tarde.' });
		if (!messageStored) return res.status(500).send({ message: 'Error al enviar el mensaje' });

		return res.status(200).send({ message: messageStored });
	});
}
// Devuelve una lista ordenada por los ultimos mensajes recibidos y paginada,  además del mensaje  se envia  datos del emisor del mensaje como id, nombre, correo, nick, etc.
function getReceivedMessages(req, res) {
	var userId = req.user.sub;

	var page = 1;
	if (req.params.page) {
		page = req.params.page;
	}

	var itemsPerPage = 4;
// .sort('-created_at') hace que se me devuelva el ultimo mensaje el primero en la lista.
	Message.find({ receiver: userId }).populate('emitter', 'name surname image nick _id').sort('-created_at').paginate(page, itemsPerPage, (err, messages, total) => {
		if (err) return res.status(500).send({ message: 'Error en el servidor, intentelo más tarde' });
		if (!messages) return res.status(404).send({ message: 'No se encuentran mensajes' });

		return res.status(200).send({
			total: total,
			pages: Math.ceil(total / itemsPerPage),
			messages
		});
	});
}
// Devuelve una lista muy parecida a la anterior, pero en este caso de mensajes que hemos enviado.
function getEmmitMessages(req, res) {
	var userId = req.user.sub;

	var page = 1;
	if (req.params.page) {
		page = req.params.page;
	}

	var itemsPerPage = 4;

	Message.find({ emitter: userId }).populate('emitter receiver', 'name surname image nick _id').sort('-created_at').paginate(page, itemsPerPage, (err, messages, total) => {
		if (err) return res.status(500).send({ message: 'Error en la petición' });
		if (!messages) return res.status(404).send({ message: 'No hay mensajes' });

		return res.status(200).send({
			total: total,
			pages: Math.ceil(total / itemsPerPage),
			messages
		});
	});
}
// Muestra la cantidad de mensajes no leidos
function getUnviewedMessages(req, res) {
	var userId = req.user.sub;

	Message.count({ receiver: userId, viewed: 'false' }).exec((err, count) => {
		if (err) return res.status(500).send({ message: 'Error en el servidor, intentelo más tarde' });
		return res.status(200).send({
			'unviewed': count
		});
	});
}
// Cambia la propiedad message.viewed a true para cuando leamos un mensaje, ya no cuente como no leido.
function setViewedMessages(req, res) {
	var userId = req.user.sub;

	Message.update({ receiver: userId, viewed: 'false' }, { viewed: 'true' }, { "multi": true }, (err, messagesUpdated) => {
		if (err) return res.status(500).send({ message: 'Error en la petición' });
		return res.status(200).send({
			messages: messagesUpdated
		});
	});
}

module.exports = {
	probando,
	saveMessage,
	getReceivedMessages,
	getEmmitMessages,
	getUnviewedMessages,
	setViewedMessages
};