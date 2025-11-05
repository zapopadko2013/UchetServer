const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.get('/', (req, res) => {
	knex('counterparties')
		.where({ 'counterparties.company': req.query.companyId ? req.query.companyId : req.userData.company, 'counterparties.deleted': 'f' })
		.orderBy('counterparties.name')
		.then(counterparties => {
			return res.status(200).json(counterparties);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/search', (req, res) => {
	const conterpartieName = req.query.counterparty ? req.query.counterparty : '';
	let company = req.userData.company
	if(company === "0" && req.query.company)
		company = req.query.company

	knex('counterparties')
		.where({ 'counterparties.company': company, 'counterparties.deleted': 'f' })
		.whereRaw('lower(counterparties.name) ilike (?)', ['%' + conterpartieName + '%'])
		.distinct('counterparties.name', 'counterparties.id')
		.limit(60)
		.orderBy('counterparties.name')
		.then(counterparties => {
			return res.status(200).json(counterparties);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/inactive', (req, res) => {
	knex('counterparties')
		.where({ 'counterparties.company': req.userData.company, 'counterparties.deleted': 't' })
		.orderBy('counterparties.name')
		.then(counterparties => {
			return res.status(200).json(counterparties);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.post('/manage', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select counterparties_management(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].counterparties_management;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

module.exports = router;