const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();

router.get("/", (req, res) => {
  const active = typeof req.query.active !== "undefined" && req.query.active !== null ? req.query.active : "1";
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex('expdate_discount as e')
    .select('e.id','e.from','e.to','e.type','e.discount','e.deleted')
	.where({'e.company': company,'e.deleted': active == 1 ? false : true})
	.orderBy('e.type')
	.orderBy('e.to')
    .then(expdatediscount => {
      return res.status(200).json(expdatediscount);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

//{"user" : 1, "company" : 1, "expdatediscount" : [{"id": 1, "from": 1, "to": 1, "type": 1, "discount": 30}]}
router.post('/manage', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select expdatediscount_management(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].expdatediscount_management.code == 'success' ? 200 : 400).json(result.rows[0].expdatediscount_management);
	}).catch((err) => {
		console.log(err.stack);
		return res.status(500).json(err);
	});
});

module.exports = router;