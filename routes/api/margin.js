const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();

router.get('/info', (req, res) => {
	helpers.serverLog(req.originalUrl);
	const company = req.userData.company;
	const type    = req.query.type;
	
	knex('margin_plan as m')
		.leftJoin('categories as c', {'c.id': 'm.object', 'c.company': 'm.company', 'c.deleted': knex.raw('?', [false])})
		.leftJoin('brands as b', {'b.id': 'm.object', 'b.deleted': knex.raw('?', [false])})
		.leftJoin('products as p', {'p.id': 'm.object', 'p.company': 'm.company'})
		.where({'m.company': company, 'm.active': true, 'm.type': type})
		.select('m.id','m.rate','m.sum','m.object',
			knex.raw(`(case m.type 
				when 0 then 'все' 
				when 1 then c.name 
				when 2 then b.brand 
				when 3 then p.name end) as name`)
		).then(margin => {		
			return res.status(200).json(margin);
		}).catch((err) => {
			helpers.serverLog(req.originalUrl, err, 'error');
			return res.status(500).json(err);
		});		
});

//{"sum":0,"rate":15,"type":1}
router.post('/add', (req, res) => {
	req.body.company = req.userData.company;
	helpers.serverLog(req.originalUrl, req.body);
	//{"sum":0,"rate":15,"type":1,"company":18,}
	if ((req.body.hasOwnProperty('type') && req.body.hasOwnProperty('rate') && 
		req.body.hasOwnProperty('sum') && req.body.hasOwnProperty('object')) &&
		(req.body.type !== "" && req.body.rate !== "" &&
		req.body.sum !== "" && req.body.object !== "") &&
		(req.body.type !== null && req.body.rate !== null &&
		req.body.sum !== null && req.body.object !== null))
	{			
		if ((req.body.sum === 0 && req.body.rate === 0) ||
			(req.body.sum < 0 || req.body.rate < 0) ||
			(req.body.sum > 0 && req.body.rate > 0)){
			res.status(500).json({'code':'error','text':'Не корректный запрос'})
			return;	
		}

		knex.raw('select add_margin_plan(?)', [req.body])
		.then(result => {
			res.status(result.rows[0].add_margin_plan? 200 : 400).json(result.rows[0].add_margin_plan);
			return;
		}).catch((err) => {
			helpers.serverLog(req.originalUrl, err, 'error');
			res.status(500).json(err)
			return;
		})
	}else{
		res.status(500).json({'code':'error','text':'Не корректный запрос'})
		return;
	}
});
//{"id":15}
router.post('/del', (req, res) => {
	req.body.company = req.userData.company;
	helpers.serverLog(req.originalUrl, req.body);
	//{"id":15,"company":18}
	if (req.body.hasOwnProperty('id')==false || req.body.id == null || req.body.id < 1){
		res.status(500).json({'code':'error','text':'Не корректный запрос'})
		return;		
	}
	knex.raw('select del_margin_plan(?)', [req.body])
	.then(result => {
		res.status(result.rows[0].del_margin_plan? 200 : 400).json(result.rows[0].del_margin_plan);
		return;
	}).catch((err) => {
		helpers.serverLog(req.originalUrl, err, 'error');
		res.status(500).json(err)
		return;
	})
});

module.exports = router;