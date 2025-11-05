const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");

const router = new express.Router();

router.get("/", (req, res) => {
  knex("cashbox_users")
    .join("points", { "cashbox_users.point": "points.id" })
    .join("cashbox_roles", { "cashbox_users.role": "cashbox_roles.id" })
    .select(
      "cashbox_users.id",
      "cashbox_users.name",
      "cashbox_users.iin",
      "points.name as pointName",
      "points.id as point",
      "cashbox_roles.name as roleName",
      "cashbox_roles.id as role",
      "cashbox_users.discount",
      "cashbox_users.discountperc"
    )
    .where({
      "points.company": req.userData.company,
      "cashbox_users.deleted": "f",
    })
    .then((cashboxusers) => {
      //helpers.serverLog("cashboxusers: ", cashboxusers);
      cashboxusers.forEach((cashboxuser) => {
        cashboxuser.iin = helpers.decrypt(cashboxuser.iin);
        /*cashboxuser.name =
          helpers.decrypt(cashboxuser.name) || cashboxuser.name;*/
        cashboxuser.pointName = helpers.decrypt(cashboxuser.pointName);
      });
      return res.status(200).json(cashboxusers);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/individual/bonus", (req, res) => {
  knex("cashbox_users")
    .join("points", { "cashbox_users.point": "points.id" })
    .join("cashbox_roles", { "cashbox_users.role": "cashbox_roles.id" })
    .join("salesplan", { "salesplan.object": "cashbox_users.id" })
    .select("cashbox_users.id", "cashbox_users.name")
    .where({
      "points.company": req.userData.company,
      "cashbox_users.deleted": "f",
      "salesplan.type": 1,
    })
    .orderBy("cashbox_users.name")
    .then((cashboxusers) => {
      return res.status(200).json(cashboxusers);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/inactive", (req, res) => {
  knex("cashbox_users")
    .join("points", { "cashbox_users.point": "points.id" })
    .join("cashbox_roles", { "cashbox_users.role": "cashbox_roles.id" })
    .select(
      "cashbox_users.id",
      "cashbox_users.name",
      "cashbox_users.iin",
      "points.name as pointName",
      "points.id as point",
      "cashbox_roles.name as roleName",
      "cashbox_roles.id as role"
    )
    .where({
      "points.company": req.userData.company,
      "cashbox_users.deleted": "t",
    })
    .then((cashboxusers) => {
      cashboxusers.forEach((cashboxuser) => {
        cashboxuser.iin = helpers.decrypt(cashboxuser.iin);
        /*cashboxuser.name =
          helpers.decrypt(cashboxuser.name) || cashboxuser.name;*/

        cashboxuser.pointName = helpers.decrypt(cashboxuser.pointName);
        //helpers.serverLog("cashboxuser-item: ", cashboxuser);
      });
      return res.status(200).json(cashboxusers);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/roles", (req, res) => {
  knex("cashbox_roles")
    .where({ deleted: "f" })
    .then((roles) => {
      return res.status(200).json(roles);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.post("/manage", (req, res) => {
  req.body.user = req.userData.id;

  //console.log(req.body);

  req.body.cashboxusr.iin = helpers.encrypt(req.body.cashboxusr.iin);
  // req.body.cashboxusr.name = helpers.encrypt(req.body.cashboxusr.name);
  req.body.cashboxusr.point_name = helpers.encrypt(
    req.body.cashboxusr.point_name
  );

  knex
    .raw("select cashboxusr_management(?)", [req.body])
    .then((result) => {
      //helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].cashboxusr_management;
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

module.exports = router;
