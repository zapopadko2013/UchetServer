const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");

const router = new express.Router();

//select id, brand, manufacturer, deleted from brands
router.get("/", (req, res) => {
  const where = { deleted: req.query.deleted };
  knex("brands")
    .where(where)
    .orderBy("brand")
    .then((brands) => {
      return res.status(200).json(brands);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/search", (req, res) => {
  const brandName = req.query.brand ? req.query.brand.toLowerCase() : "";

  knex("brands")
    .where({ deleted: false })
    .whereRaw("lower(brands.brand) like (?)", ["%" + brandName + "%"])
    .distinct("brands.brand", "brands.id")
    .select()
    .limit(60)
    .then((brands) => {
      return res.status(200).json(brands);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/margin", (req, res) => {
  const brandName = req.query.brand ? req.query.brand.toLowerCase() : "";
  let company = req.userData.company;

  knex("brands")
    .leftJoin("margin_plan as m", {
      "m.object": "brands.id",
      "m.type": knex.raw("?", [2]),
      "m.company": knex.raw("?", [company]),
      "m.active": knex.raw("?", [true]),
    })
    .where({ deleted: false })
    .whereRaw("lower(brands.brand) like (?)", ["%" + brandName + "%"])
    .distinct(
      "brands.brand",
      "brands.id",
      knex.raw("(case when m.rate is null then 0 else m.rate end) as rate"),
      knex.raw("(case when m.sum is null then 0 else m.sum end) as sum")
    )
    .select()
    .limit(60)
    .then((brands) => {
      return res.status(200).json(brands);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//{"user" : 1, "brand" : {"id" : "1", "brand" : "", "manufacturer" : "", "deleted" : false}}
router.post("/manage", (req, res) => {
  req.body.user = req.userData.id;

  console.log(req.body);

  //	return res.status(200).json('');

  knex
    .raw("select brand_management(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].brand_management.code == "success" ? 200 : 400)
        .json(result.rows[0].brand_management);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//{"user" : 1, "bind" : {"product":1,"brand":2}}
router.post("/addtoproduct", (req, res) => {
  req.body.user = req.userData.id;

  console.log(req.body);

  //return res.status(200).json('');

  knex
    .raw("select brand_binding(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].brand_binding.code == "success" ? 200 : 400)
        .json(result.rows[0].brand_binding);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

module.exports = router;
