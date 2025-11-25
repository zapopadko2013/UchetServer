const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.get('/', (req, res) => {
	
	const company = req.userData.company;
	
	knex('attributenames')
		.select('attributenames.id', 'attributenames.category', 'attributenames.values', 'attributenames.deleted', 'attributenames.format',
			knex.raw(`array(select value  
						from attributespr 
							where attributeid = attributenames.id
							  and company = ${company}
								and deleted is false
								  order by id) as sprvalues`))
		.where({ 'deleted': false })
		.orderBy('attributenames.id')
		.then(attributenames => {
			return res.status(200).json(attributenames);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

//////24.11.2025
router.get('/inactive', (req, res) => {
	
	const company = req.userData.company;
	
	knex('attributenames')
		.select('attributenames.id', 'attributenames.category', 'attributenames.values', 'attributenames.deleted', 'attributenames.format',
			knex.raw(`array(select value  
						from attributespr 
							where attributeid = attributenames.id
							  and company = ${company}
								and deleted is true
								  order by id) as sprvalues`))
		.where({ 'deleted': true })
		.orderBy('attributenames.id')
		.then(attributenames => {
			return res.status(200).json(attributenames);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});
//////24.11.2025

router.get('/list', (req, res) => {
	knex('attrlist')
		.leftJoin('attributenames', { 'attributenames.id': 'attrlist.attribute' })
		.where({ 'attrlist.listcode': req.query.listCode, 'attrlist.company': req.userData.company })
		.then(attrlist => {
			return res.status(200).json(attrlist);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.post('/add', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select add_attributes(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].add_attributes;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/delete', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select del_attributes(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].del_attributes;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/updatespr', (req, res) => {
	req.body.user = req.userData.id;

	knex.raw('select attributespr_management(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].attributespr_management;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.get('/getspr', (req, res) => {
	
	const company = req.userData.company;
	
	knex('attributenames')
		.select('attributenames.id', 'attributenames.category', 'attributenames.values')
		.where({ 'deleted': false, 'format': 'SPR'})
		.andWhereNot({ 'attributenames.deleted': true })
		.orderBy('attributenames.id')
		.then(attributenames => {
			return res.status(200).json(attributenames);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/getsprattr', (req, res) => {
	
	const company = req.userData.company;
	const sprid   = req.query.sprid;
	
	knex('attributespr')
		.select('attributespr.id', 'attributespr.value', 'attributespr.deleted')
		.where({ 'attributeid': sprid, 'company': company})
		.orderBy('attributespr.id')
		.then(attributenames => {
			return res.status(200).json(attributenames);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/getformat', (req, res) => {
	
	const company = req.userData.company;
	
	knex('format')
		.select('format.name', 'format.description')
		.orderBy('format.name')
		.then(format => {
			return res.status(200).json(format);
		}).catch((err) => {
			return res.status(500).json(err);
		});
		
});

module.exports = router;