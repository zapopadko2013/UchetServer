const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();

router.get('/', (req, res) => {
	const company = req.userData.company;
	const name    = req.query.name;

	knex("settings as s")
    .select("s.value")
    .where({"s.company": company, "s.name": name})
    .then((sqlres) => {
      return res.status(200).json(sqlres);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//{"settings":[{"name":"","value":""},{"name":"","value":""}]}
router.post('/add', (req, res) => {
	req.body.company = req.userData.company;
	helpers.serverLog(req.originalUrl, req.body);	
	knex.raw('select add_settings(?)', [req.body])
	.then(result => {
		res.status(result.rows[0].add_settings? 200 : 400).json(result.rows[0].add_settings);
		return;
	}).catch((err) => {
		res.status(500).json(err)
		return;
	});
});

module.exports = router;