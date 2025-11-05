const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const nodemailer = require('nodemailer');

const router = new express.Router();

transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'shorynbek@gmail.com',
		pass: 'oshbdragonslayer'
	}
});

router.get('/sendemail', (req, res) => {
	const mailOptions = {
		from: 'shorynbek@gmail.com', // sender address
		to: 'skywalker_alexander@yahoo.com', // list of receivers
		// to: 'shorynbek@gmail.com', // list of receivers
		subject: 'Subject of your email', // Subject line
		html: '<h1 style="color: green">Wake up, Alexander</h1>'// plain text body
	};

	transporter.sendMail(mailOptions, function (err, info) {
		if (err) {
			console.log(err)
			res.status(500).send(err);
		} else {
			console.log(info);
			res.status(200).send(info);
		}
	})
});

router.get('/confirm', (req, res) => {
	console.log(req)
});

module.exports = router;