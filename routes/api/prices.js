const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.post('/', (req, res) => {

	req.body.user = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select prices_management(?)', [req.body])
		.then(price => { return res.status(200).json(price.rows[0]) })
		.catch((err) => { return res.status(500).json(err) })
});

router.get('/list', (req, res) => {
	let object = Number(req.query.object);
	let barcode = req.query.barcode && req.query.barcode !== "" ? ` AND pr.code = '${req.query.barcode}'` : "";
	let prodName = req.query.prodName && req.query.prodName !== "" ? ` AND pr.name ilike '%${req.query.prodName}%'` : "";
	switch (object) {
		case 1:
			condition = ` AND ps.counterparty = ${req.query.object_id}`
			break;
		case 2:
			condition = ` AND pr.brand = ${req.query.object_id}`
			break;
		case 3:
			condition = ` AND pr.category = ${req.query.object_id}`
			break;
		default:
			condition = "";
			break;
	}

	knex.raw(`
	SELECT
	pr.id as product,
	pr.code,
	pr."name",
	ps.price AS purchase_price,
	mp.rate,
	ps_2.price AS sell_price,
	ps_2.wholesale_price,
	pr.category,
	pr.brand,
	ps.counterparty
FROM
	products pr
	LEFT JOIN prices ps ON pr."id" = ps.product 
	AND ps."type" = 0 AND ps.deleted = FALSE
	LEFT JOIN prices ps_2 ON pr."id" = ps_2.product 
	AND ps_2."type" = 1 AND ps.deleted = FALSE
	LEFT JOIN (
	SELECT
		"object",
		rate,
		MAX ( "id" ) AS max_id 
	FROM
		margin_plan 
	WHERE
		"type" = 3 
		AND company = ${req.userData.company} 
		AND active = TRUE 
	GROUP BY
		"object",
		rate 
	) mp ON mp."object" = pr."id"
WHERE
	pr.company = ${req.userData.company}  
	AND pr.deleted = FALSE
	${condition}
	${barcode}
	${prodName}
	ORDER BY ps.id desc
    `)
		.then((result) => {
			return res.status(200).json(result.rows)
		})
		.catch((err) => { return res.status(500).json(err) })
});

router.get('/listbycounterparty', (req, res) => {
	let object = Number(req.query.object);
	switch (object) {
		case 1:
			condition = ` AND c2p.counterparty = ${req.query.object_id}`
			break;
		case 2:
			condition = ` AND pr.brand = ${req.query.object_id}`
			break;
		case 3:
			condition = ` AND pr.category = ${req.query.object_id}`
			break;
		default:
			condition = "";
			break;
	}
	knex.raw(`
	SELECT
	pr.id as product,
	pr.code,
	pr."name",
	ps.price AS purchase_price,
	mp.rate,
	ps_2.price AS sell_price,
	ps_2.wholesale_price,
	pr.category,
	pr.brand,
	ps.counterparty
FROM
	products pr
	LEFT JOIN prices ps ON pr."id" = ps.product 
	AND ps."type" = 0
	LEFT JOIN prices ps_2 ON pr."id" = ps_2.product 
	AND ps_2."type" = 1
	LEFT JOIN (
	SELECT
		"object",
		rate,
		MAX ( "id" ) AS max_id 
	FROM
		margin_plan 
	WHERE
		"type" = 3 
		AND company = ${req.userData.company} 
		AND active = TRUE 
	GROUP BY
		"object",
		rate 
	) mp ON mp."object" = pr."id"
WHERE
	pr.company = ${req.userData.company}  
	AND pr.deleted = FALSE
	AND ps.counterparty = ${req.query.object_id}
	AND ps.deleted = FALSE
	ORDER BY ps.id desc
    `)
		.then((result) => {
			return res.status(200).json(result.rows)
		})
		.catch((err) => { return res.status(500).json(err) })
});

module.exports = router;