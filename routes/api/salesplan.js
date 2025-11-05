const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const router = new express.Router();

router.get('/cashboxuser', (req, res) => {
	knex('salesplan')
		.leftJoin('cashbox_users', 'salesplan.object', 'cashbox_users.id')
		.leftJoin('points', 'cashbox_users.point', 'points.id')
		.where({ 'points.company': req.userData.company, 'salesplan.type': '1' })
		.select('salesplan.daily', 'salesplan.monthly', 'salesplan.quarterly', 'salesplan.yearly',
			'cashbox_users.name', 'salesplan.object as id',  'salesplan.type', 'points.name as pointName',
			'salesplan.drate','salesplan.mrate','salesplan.qrate','salesplan.yrate')
		.orderBy('cashbox_users.name')
		.then(salesplan => {
			salesplan.forEach(saleplan => {
				saleplan.name = helpers.decrypt(saleplan.name) || saleplan.name;
				saleplan.pointName = helpers.decrypt(saleplan.pointName);
			});
			return res.status(200).json(salesplan);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/point', (req, res) => {
	knex('salesplan')
		.leftJoin('points', 'salesplan.object', 'points.id')
		.where({ 'points.company': req.userData.company, 'salesplan.type': '3' })
		.select('salesplan.daily', 'salesplan.monthly', 'salesplan.quarterly', 'salesplan.yearly',
			'salesplan.object as id', 'salesplan.type', 'points.name',
			'salesplan.drate','salesplan.mrate','salesplan.qrate','salesplan.yrate')
		.orderBy('points.id')
		.then(salesplan => {
			salesplan.forEach(saleplan => {
				saleplan.name = helpers.decrypt(saleplan.name);
			});
			return res.status(200).json(salesplan);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.post('/manage', (req, res) => {
	req.body.user = req.userData.id;

	console.log('plan_management');
	console.log(req.body);

	knex.raw('select plan_management(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].plan_management;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

module.exports = router;