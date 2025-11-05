const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();

router.get("/", (req, res) => {
  const active = typeof req.query.active !== "undefined" && req.query.active !== null ? req.query.active : "1";
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex('coupons as co')
    .select('co.id','co.number','co.discount',knex.raw(`t.name as objtype`),'co.expire','co.active',knex.raw(`case co.type when 1 then 'На товар' when 2 then 'На чек' else 'Невозможно определить тип' end as type`),
		knex.raw(`case co.objtype 
					when 0 then ''
					when 1 then c.name
					when 2 then b.brand
					when 3 then pr.name||'('||pr.code||')'
					end as object`), knex.raw(`case co.subtype when 1 then 'Многоразовый' when 2 then 'Одноразовый' else 'Невозможно определить подтип' end as subtype`)
	)
	.leftJoin('categories as c', {'c.id': 'co.object', 'c.company': 'co.company', 'c.deleted': knex.raw('?', [false])})
	.leftJoin('brands as b', {'b.id': 'co.object', 'b.deleted': knex.raw('?', [false])})
	.leftJoin('products as pr', {'pr.id': 'co.object', 'pr.company': 'co.company'})
	.leftJoin('couponobjtypes as t', {'t.id': 'co.objtype'})
	.modify(function(params) {
      if (active == 1) {
        this.where({ 'co.company': company, 'co.active': true })/*.where("co.expire",">=",knex.raw(`current_date`))*/;
      } else {
        this.where({ 'co.company': company, 'co.active': false })/*.orWhere("co.expire","<",knex.raw(`current_date`)).where({ 'co.company': company })*/;
      }
	})
	.orderBy('co.id')
    .then(coupons => {
      return res.status(200).json(coupons);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

//{"user":1,"company":1,"coupons":{"discount":1,"object":1,"objtype":1,"expire":"25.11.2020","type":1,"numberfrom":1,"numberto":3}}
router.post('/add', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select coupons_add(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].coupons_add.code == 'success' ? 200 : 400).json(result.rows[0].coupons_add);
	}).catch((err) => {
		console.log(err.stack);
		return res.status(500).json(err);
	});
});

//{"user" : 1, "company" : 1, "id" : 1}
router.post('/del', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select del_coupon(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].del_coupon.code == 'success' ? 200 : 400).json(result.rows[0].del_coupon);
	}).catch((err) => {
		console.log(err.stack);
		return res.status(500).json(err);
	});
});

module.exports = router;