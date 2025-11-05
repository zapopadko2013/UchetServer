const express = require('express');
const knex = require('../../../db/knex');
const moment = require('moment');
const helpers = require('../../../middlewares/_helpers');

const router = new express.Router();

router.get('/', (req, res) => {

	 knex.raw(`SELECT p.name as point, pr.name as product, units.total
FROM (
	SELECT distinct d.product, t.point, t.company
		FROM transactions t
			LEFT JOIN transaction_details d on (d.transactionid = t.id and d.company = t.company)
			LEFT JOIN points p on (t.point = p.id and t.company = p.company)
				WHERE t.date::date > current_date - 20
					AND p.company = ${req.userData.company}
) trans
INNER JOIN (
	SELECT tb.point, tb.product, tb.company, tb.total
	  FROM (
		  SELECT p.id as point, s.product, p.company, sum(s.units) as total
			  FROM stockcurrent s
					LEFT JOIN pointset ps on (s.point = ps.stock)
				  LEFT JOIN points p on (ps.point = p.id and p.company = s.company)
					  WHERE p.company = ${req.userData.company}
						  AND s.units <= ${req.query.quantity}
		  GROUP BY p.id, s.product, p.company) tb
			  WHERE tb.total <= ${req.query.quantity}
) units on (trans.product = units.product and trans.point = units.point and trans.company = units.company)
INNER JOIN points p on (p.id = units.point and p.company = units.company)
INNER JOIN products pr on (pr.id = units.product and pr.company = units.company)
ORDER BY p.name;`).then(result => {
		//console.log(result);
		result.rows.forEach(result => {
			result.point = helpers.decrypt(result.point);
		});
	 	return res.status(200).json(result.rows);
	 }).catch(err => {
	 	return res.status(500).json(err);
	 });

});

module.exports = router;