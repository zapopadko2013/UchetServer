const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const router = new express.Router();

router.get('/',(req,res) => {
	let company = req.userData.company;
	if (company === "0" && req.query.company) company = req.query.company;
	const point = req.query.point;

	if(!point){
		helpers.serverLog(req.originalUrl, {status:'error',text:'Не указана точка'}, 'error');
		return res.status(500).json({status:'error',text:'Не указана точка'});
	}

	knex('ticket_format as t')
	.select()
	.where({'t.company':company,'t.point':point})
	.first()
	.then(ticket =>{
		 return res.status(200).json(ticket?ticket:{});
	}).catch((err) => {
	 	helpers.serverLog(req.originalUrl, err.stack, 'error');
		return res.status(500).json(err);
	});
});

router.post('/manage',(req,res) => {
	let company = req.userData.company;
	if(!(company === "0" && req.body.company))
		req.body.company = company;
	
	knex.raw('select ticket_format_management(?)', [req.body]).then(result => {
		result = result.rows[0].ticket_format_management;
		helpers.serverLog(req.originalUrl, result, result.code);
		return res.status(200).json(result);
	}).catch((err) => {
	 	helpers.serverLog(req.originalUrl, err.stack, 'error');
		return res.status(500).json(err);
	});
});

module.exports = router;