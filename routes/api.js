const express = require("express");
const knex = require("../db/knex");
const fileUpload = require("express-fileupload");


const reconciliation = require("./api/reconciliation");
const point = require("./api/point");
const brand = require("./api/brand");
const stock = require("./api/stock");
const cashbox = require("./api/cashbox");
const cashboxuser = require("./api/cashboxuser");
const erpuser = require("./api/erpuser");
const company = require("./api/company");
const invoice = require("./api/invoice");
const products = require("./api/products");
const stockcurrent = require("./api/stockcurrent");
const attributes = require("./api/attributes");
const report = require("./api/report");
const salesplan = require("./api/salesplan");
const files = require("./api/files");
const esf = require("./api/esf");
const counterparties = require("./api/counterparties");
const buyers = require("./api/buyers");
const graph = require("./api/graph");
const barcode = require("./api/barcode");
const adminpage = require("./api/adminpage");
const categories = require("./api/categories");
const utils = require("./api/utils");
const revision = require("./api/revision");
const discount = require("./api/discount");
const giftcertificates = require("./api/giftcertificates");
const promotions = require("./api/promotions");
const ticketformat = require("./api/ticketformat");
const news = require("./api/news");
const productsweight = require("./api/productsweight");
const expdatediscount = require("./api/expdatediscount");
const coupons = require("./api/coupons");
const helpers = require("../middlewares/_helpers");
const margin = require("./api/margin");
const settings = require("./api/settings");

const companysettings = require("./api/companysettings");

const nomenclature = require("./api/nomenclature");
const prices = require('./api/prices');
const workorder = require('./api/workorder');
const pluproducts = require("./api/pluproducts");
const newrevision = require("./api/newrevision");

/////09.01.2026
const chatroute = require("./api/chat.route");
/////09.01.2026

const router = new express.Router();

router.use("/reconciliation", reconciliation);
router.use("/adminpage", adminpage);
router.use("/barcode", barcode);
router.use("/brand", brand);
router.use("/point", point);
router.use("/stock", stock);
router.use("/cashbox", cashbox);
router.use("/cashboxuser", cashboxuser);
router.use("/erpuser", erpuser);
router.use("/company", company);
router.use("/invoice", invoice);
router.use("/products", products);
router.use("/stockcurrent", stockcurrent);
router.use("/attributes", attributes);
router.use("/report", report);
router.use("/salesplan", salesplan);
router.use("/files", files);
router.use("/esf", esf);
router.use("/counterparties", counterparties);
router.use("/buyers", buyers);
router.use("/graph", graph);
router.use("/categories", categories);
router.use("/utils", utils);
router.use("/revision", revision);
router.use("/discount", discount);
router.use("/giftcertificates", giftcertificates);
router.use("/promotions", promotions);
router.use("/ticketformat", ticketformat);
router.use("/news", news);
router.use("/productsweight", productsweight);
router.use("/expdatediscount", expdatediscount);
router.use("/coupons", coupons);
router.use("/margin", margin);
router.use("/settings", settings);
router.use("/companysettings",companysettings);

/////09.01.2026
router.use("/chatroute",chatroute);
/////09.01.2026

router.use("/nomenclature",nomenclature);
router.use(fileUpload());
router.use("/prices", prices);
router.use('/workorder',workorder);
router.use("/pluproducts",pluproducts);
router.use("/newrevision",newrevision);

router.get("/auth", (req, res) => {
  knex("user2roles")
    .where({ user: req.userData.id, role: 0 })
    .select("user2roles.role")
    .then((user) => {
      //console.log(user); //user.role?1:0
      const respJson = {
        message: "Auth succeed",
        role: user.length > 0 && user[0].role === "0" ? 1 : 0,
      };
      // helpers.serverLog(req.originalUrl, respJson, "success");
      return res.status(200).json(respJson);
    })
    .catch(() => {
      //возвращаем что все успешно, так как этот селект делается только для проверки роли пользователя
      // и влияет только на отображение контента для админа-аладина
      const respJson = { message: "Auth succeed", role: 0 };
      //helpers.serverLog(req.originalUrl, respJson, "success");
      return res.status(200).json(respJson);
    });
});
//авторизация ревизора
router.get("/revauth", (req, res) => {
  knex("user2roles")
    .where({ user: req.userData.id, role: 6 })
    .select("user2roles.role")
    .then((user) => {
      if (user.length === 0) {
        const respJson = { message: "UNAUTHORIZED" };
        helpers.serverLog(req.originalUrl, respJson, "error");
        return res.status(401).json(respJson);
      } else {
        const respJson = { message: "Auth succeed" };
        // helpers.serverLog(req.originalUrl, respJson, "success");
        return res.status(200).json(respJson);
      }
    })
    .catch(() => {
      const respJson = { message: "UNAUTHORIZED" };
      helpers.serverLog(req.originalUrl, respJson, "error");
      return res.status(401).json(respJson);
    });
});

router.get("/categories", (req, res) => {
  // helpers.serverLog(req.originalUrl);

  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex("categories as c")
    .leftJoin("categories as c2", "c2.parentid", "c.id")
    .where({ "c.deleted": false })
    .whereNull("c.parentid")
    //.andWhere({ 'c.company': company })
    .whereIn("c.company", [company, 0])
    .select(
      knex.raw("coalesce(c.name||' | '||c2.name, c.name) as name"),
      knex.raw("coalesce(c2.id, c.id) as id")
    )
    .orderBy("name")
    .then((categories) => {
      // helpers.serverLog(req.originalUrl, categories, "success");
      return res.status(200).json(categories);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/taxes", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  knex("taxes")
    .orderBy("id")
    .then((taxes) => {
      // helpers.serverLog(req.originalUrl, taxes, "success");
      return res.status(200).json(taxes);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/cnofeaexceptions", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  knex("cnofea_exceptions")
    .where("code", req.query.code)
    .first()
    .then((cnofea_exceptions) => {
      // helpers.serverLog(req.originalUrl, cnofea_exceptions, "success");
      return res.status(200).json(cnofea_exceptions);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/user/exist", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  knex("erp_users")
    .where({ login: req.query.email.toUpperCase() })
    .then((user) => {
      const respJson = { exist: Object.keys(user).length > 0 };
      // helpers.serverLog(req.originalUrl, respJson, "success");
      res.status(200).json(respJson);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).send(err);
    });
});

module.exports = router;
