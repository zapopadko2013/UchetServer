const express = require('express');
const knex = require('../../../db/knex');
const helpers = require('../../../middlewares/_helpers');
const moment = require('moment');

const excel = require("node-excel-export");

const router = new express.Router();

router.get("/simple", (req,res) => {
  knex.raw("select 1 as check_result_column")
  .then(result => {
    console.log(resutl.rows);
    return res.status(200).json(result.rows);

  })
  .catch(err => {
    console.log(err);
    return res.status(500).json(err);
  })
});

router.post("/", (req, res) => {
	// return res.status(500).json("Отчет временно недоступен. Приносим извинения за неудобства");

  const dateFrom =req.body.dateFrom;
  const dateTo = req.body.dateTo;
  const point = req.body.point ? req.body.point: "0";
  const counterparty =
    typeof req.body.counterparty !== "undefined" &&
    req.body.counterparty !== null
      ? req.body.counterparty
      : "0";
  const category =
    typeof req.body.category !== "undefined" && req.body.category !== null
      ? req.body.category
      : "@";
  const brand =
    typeof req.body.brand !== "undefined" && req.body.brand !== null
      ? req.body.brand
      : "@";
  let company = req.userData.company;
  if (company === "0" && req.body.company) company = req.body.company;
  const attribute =
    typeof req.body.attribute !== "undefined" && req.body.attribute !== null
      ? req.body.attribute
      : "@";
  const attrval =
    typeof req.body.attrval !== "undefined" && req.body.attrval !== null
      ? req.body.attrval
      : "";
  const type =
    typeof req.body.type !== "undefined" && req.body.type !== null
      ? req.body.type
      : "@";
  const notattr =
    typeof req.body.notattr !== "undefined" && req.body.notattr !== null
      ? req.body.notattr
      : "0";
  const barcode =
    typeof req.body.barcode !== "undefined" && req.body.barcode !== null
      ? req.body.barcode
      : "";
  const nds =
    typeof req.body.nds !== "undefined" && req.body.nds !== null
      ? req.body.nds
      : "@";

  var conditions = { "stockdiary.company": company };
  if (point !== "0") conditions["pointset.point"] = point;
  if (barcode !== "") conditions["products.code"] = barcode;
  if (nds !== "@") conditions["products.taxid"] = nds;
  if (brand !== "@") conditions["products.brand"] = brand;
  //if (category !== "@") conditions["products.category"] = category;

  
  const point_stock = knex("pointset").select("stock").where("point","=",+point);

  var sps1 = knex("analytics.stockcurrent_part_snapshots")
  .where("company","=",company)
  .andWhere("point","=",point_stock)
  .andWhere("snapdate","=",dateFrom)
  .select(
    "product",
    "attributes",
    "company",
    "point",
    knex.raw("sum(units) as units")
  )
  .groupBy("product",
  "attributes",
  "company",
  "point",
  "snapdate")
  .orderBy("product","attributes")
  .as("sps1")
  
  var sps2 = knex("analytics.stockcurrent_part_snapshots")
  .where("company","=",company)
  .andWhere("point","=",point_stock)
  .andWhere("snapdate","=",dateTo)
  .select(
    "product",
    "attributes",
    knex.raw("sum(units) as units")
  )
  .groupBy("product",
  "attributes",
  )
  .orderBy("product","attributes")
  .as("sps2")

  var table = knex("stockdiary")
    .innerJoin("products", {
      "products.company": "stockdiary.company",
      "products.id": "stockdiary.product",
    })
    .leftJoin(
      knex.raw(
        `categories on (categories.id = products.category and categories.company in (products.company,0))`
      )
    )
    .leftJoin("brands", { "products.brand": "brands.id" })
    .leftJoin("pointset", { "pointset.stock": "stockdiary.point" })
    .leftJoin(sps1,{
      "sps1.product":"stockdiary.product",
      "sps1.attributes":"stockdiary.attributes",
      "sps1.company":"stockdiary.company",
      "sps1.point":"stockdiary.point"})
    .leftJoin(sps2,{
        "sps2.product":"stockdiary.product",
        "sps2.attributes":"stockdiary.attributes",
        })
    .select(
      knex.raw("products.name as prod_name"),
      knex.raw("products.code as code"),
      knex.raw(
        "products.name || case when stockdiary.attributes <> 0 then ' | ' else '' end || array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockdiary.attributes),', ') as name"
      ),
      knex.raw("coalesce(categories.name,'Без категории') as category"),
      knex.raw("coalesce(brands.brand,'Бренд не указан') as brand"),
      knex.raw(
        //"sum(case when stockdiary.price >= stockdiary.purchaseprice then (stockdiary.price-stockdiary.purchaseprice)*stockdiary.units else 0 end) as gross_profit"
        "sum( ((stockdiary.price-stockdiary.purchaseprice)*stockdiary.units) ) as gross_profit"
        ),
      knex.raw("sum(stockdiary.units) as units"),
      knex.raw(
        "sum(coalesce((stockdiary.price * stockdiary.units),0)) as salesamount"
      ),
      knex.raw(
        "sum(coalesce((coalesce(stockdiary.purchaseprice,0) * stockdiary.units),0)) as cost"
      ),
      knex.raw(
        "case when products.taxid = 0 then 'Без НДС' else 'С НДС' end as nds"
      ),
      knex.raw(`coalesce(sps1.units,0) as dateFrom_units`),
      knex.raw(`coalesce(sps2.units,0) as dateTo_units`)      
    )
    .groupBy(
      "products.name",
      "products.code",
      "stockdiary.attributes",
      "categories.name",
      "brands.brand",
      "nds",
      "sps1.units",
      "sps2.units"
    )
    .where(conditions)
    .andWhereRaw(
      `${
        category !== "@" && category.length > 0
          ? `products.category in (${category.map((c) => `'${Number(c)}'`).join(",")})`
          : ""
      }`
    )
    .whereIn("stockdiary.reason", [-1, 2])
    //-- 20240129 AB fix remove certificates from report <
	  .where({"products.type": 0})
	  //-- 20240129 AB fix remove certificates from report >
    .andWhereBetween(knex.raw("stockdiary.date::date"), [
      dateFrom,
      dateTo,
    ])
    .whereExists(function () {
      counterparty !== "0"
        ? this.select("*")
            .from("counterparty2product as cp")
            .whereRaw("cp.counterparty = ?", [counterparty])
            .andWhereRaw("cp.product = products.id")
            .andWhereRaw("cp.company = ?", [req.userData.company])
        : this.select(knex.raw("1"));
    })
    .whereExists(function () {
      attribute == "0"
        ? this.select("*")
            .from("attributelistcode")
            .leftJoin("attrlist", {
              "attrlist.listcode": "attributelistcode.id",
              "attrlist.company": "attributelistcode.company",
            })
            .leftJoin(
              "attributenames",
              "attributenames.id",
              "attrlist.attribute"
            )
            .whereRaw("attributelistcode.id = stockdiary.attributes")
            .andWhereRaw("attributelistcode.id = 0")
        : attribute !== "@" && attrval !== ""
        ? this.select("*")
            .from("attributelistcode")
            .leftJoin("attrlist", {
              "attrlist.listcode": "attributelistcode.id",
              "attrlist.company": "attributelistcode.company",
            })
            .leftJoin(
              "attributenames",
              "attributenames.id",
              "attrlist.attribute"
            )
            .whereRaw("attributelistcode.id = stockdiary.attributes")
            .andWhereRaw("attributenames.id = ?", [attribute])
            .andWhereRaw(`lower(attrlist.value) like lower(('%'||?||'%'))`, [
              attrval,
            ])
            .andWhereRaw("attributelistcode.company = ?", [company])
        : attribute !== "@" && attrval == ""
        ? this.select("*")
            .from("attributelistcode")
            .leftJoin("attrlist", {
              "attrlist.listcode": "attributelistcode.id",
              "attrlist.company": "attributelistcode.company",
            })
            .leftJoin(
              "attributenames",
              "attributenames.id",
              "attrlist.attribute"
            )
            .whereRaw("attributelistcode.id = stockdiary.attributes")
            .andWhereRaw("attributenames.id = ?", [attribute])
            .andWhereRaw("attributelistcode.company = ?", [company])
        : this.select(knex.raw("1"));
    })
    .orderBy("name")
    .as("t");

  if (notattr == 1) {
    table
      //console.log(table)
      .then((grossprofit) => {
        //console.log(grossprofit)
        return res.status(200).json(grossprofit);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  } else {
    knex(table)
      .select(
        knex.raw("t.prod_name as name"),
        "t.category",
        "t.brand",
        "nds",
        "t.code"
      )
      .sum("t.units as units")
      .sum("t.gross_profit as gross_profit")
      .sum("t.salesamount as salesamount")
      .sum("t.cost as cost")
      .sum("t.datefrom_units as datefrom_units")
      .sum("t.dateto_units as dateto_units")
      .groupBy("t.prod_name", "t.category", "t.brand", "nds", "t.code")
      .orderBy("name")
      .then((grossprofit) => {
        return res.status(200).json(grossprofit);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  }
});


router.get("/stock", (req, res) => {
	// return res.status(500).json("Отчет временно недоступен. Приносим извинения за неудобства");

  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const point = req.query.point;
  const counterparty =
    typeof req.query.counterparty !== "undefined" &&
    req.query.counterparty !== null
      ? req.query.counterparty
      : "0";
  const category =
    typeof req.query.category !== "undefined" && req.query.category !== null
      ? req.query.category
      : "@";
  const brand =
    typeof req.query.brand !== "undefined" && req.query.brand !== null
      ? req.query.brand
      : "@";
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;
  const attribute =
    typeof req.query.attribute !== "undefined" && req.query.attribute !== null
      ? req.query.attribute
      : "@";
  const attrval =
    typeof req.query.attrval !== "undefined" && req.query.attrval !== null
      ? req.query.attrval
      : "";
  const type =
    typeof req.query.type !== "undefined" && req.query.type !== null
      ? req.query.type
      : "@";
  const notattr =
    typeof req.query.notattr !== "undefined" && req.query.notattr !== null
      ? req.query.notattr
      : "0";
  const barcode =
    typeof req.query.barcode !== "undefined" && req.query.barcode !== null
      ? req.query.barcode
      : "";
  const nds =
    typeof req.query.nds !== "undefined" && req.query.nds !== null
      ? req.query.nds
      : "@";

  var conditions = { "stockdiary.company": company };
  if (point !== "0") conditions["pointset.point"] = point;
  if (barcode !== "") conditions["products.code"] = barcode;
  if (nds !== "@") conditions["products.taxid"] = nds;
  if (brand !== "@") conditions["products.brand"] = brand;
  //if (category !== "@") conditions["products.category"] = category;

  
  const point_stock = knex("pointset").select("stock").where("point","=",+point);

  var sps1 = knex("analytics.stockcurrent_part_snapshots")
  .where("company","=",company)
  .andWhere("point","=",point_stock)
  .andWhere("snapdate","=",dateFrom.format())
  .select(
    "product",
    "attributes",
    "company",
    "point",
    knex.raw("sum(units) as units")
  )
  .groupBy("product",
  "attributes",
  "company",
  "point",
  "snapdate")
  .orderBy("product","attributes")
  .as("sps1")
  
  var sps2 = knex("analytics.stockcurrent_part_snapshots")
  .where("company","=",company)
  .andWhere("point","=",point_stock)
  .andWhere("snapdate","=",dateTo.format())
  .select(
    "product",
    "attributes",
    knex.raw("sum(units) as units")
  )
  .groupBy("product",
  "attributes",
  )
  .orderBy("product","attributes")
  .as("sps2")

  var table = knex("stockdiary")
    .innerJoin("products", {
      "products.company": "stockdiary.company",
      "products.id": "stockdiary.product",
    })
    .leftJoin(
      knex.raw(
        `categories on (categories.id = products.category and categories.company in (products.company,0))`
      )
    )
    .leftJoin("brands", { "products.brand": "brands.id" })
    .leftJoin("pointset", { "pointset.stock": "stockdiary.point" })
    .leftJoin(sps1,{
      "sps1.product":"stockdiary.product",
      "sps1.attributes":"stockdiary.attributes",
      "sps1.company":"stockdiary.company",
      "sps1.point":"stockdiary.point"})
    .leftJoin(sps2,{
        "sps2.product":"stockdiary.product",
        "sps2.attributes":"stockdiary.attributes",
        })
    .select(
      knex.raw("products.name as prod_name"),
      knex.raw("products.code as code"),
      knex.raw(
        "products.name || case when stockdiary.attributes <> 0 then ' | ' else '' end || array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockdiary.attributes),', ') as name"
      ),
      knex.raw("coalesce(categories.name,'Без категории') as category"),
      knex.raw("coalesce(brands.brand,'Бренд не указан') as brand"),
      knex.raw(
        "sum(case when stockdiary.price >= stockdiary.purchaseprice then (stockdiary.price-stockdiary.purchaseprice)*stockdiary.units else 0 end) as gross_profit"
      ),
      knex.raw("sum(stockdiary.units) as units"),
      knex.raw(
        "sum(coalesce((stockdiary.price * stockdiary.units),0)) as salesamount"
      ),
      knex.raw(
        "sum(coalesce((coalesce(stockdiary.purchaseprice,0) * stockdiary.units),0)) as cost"
      ),
      knex.raw(
        "case when products.taxid = 0 then 'Без НДС' else 'С НДС' end as nds"
      ),
      knex.raw(`coalesce(sps1.units,0) as dateFrom_units`),
      knex.raw(`coalesce(sps2.units,0) as dateTo_units`)      
    )
    .groupBy(
      "products.name",
      "products.code",
      "stockdiary.attributes",
      "categories.name",
      "brands.brand",
      "nds",
      "sps1.units",
      "sps2.units"
    )
    .where(conditions)
    .andWhereRaw(
      `${
        category !== "@" && category.length > 0
          ? `products.category in (${category.map((c) => `'${Number(c)}'`).join(",")})`
          : ""
      }`
    )
    .whereIn("stockdiary.reason", [-1, 2])
    //-- 20240129 AB fix remove certificates from report <
	  .where({"products.type": 0})
	  //-- 20240129 AB fix remove certificates from report >
    .andWhereBetween(knex.raw("stockdiary.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .whereExists(function () {
      counterparty !== "0"
        ? this.select("*")
            .from("counterparty2product as cp")
            .whereRaw("cp.counterparty = ?", [counterparty])
            .andWhereRaw("cp.product = products.id")
            .andWhereRaw("cp.company = ?", [req.userData.company])
        : this.select(knex.raw("1"));
    })
    .whereExists(function () {
      attribute == "0"
        ? this.select("*")
            .from("attributelistcode")
            .leftJoin("attrlist", {
              "attrlist.listcode": "attributelistcode.id",
              "attrlist.company": "attributelistcode.company",
            })
            .leftJoin(
              "attributenames",
              "attributenames.id",
              "attrlist.attribute"
            )
            .whereRaw("attributelistcode.id = stockdiary.attributes")
            .andWhereRaw("attributelistcode.id = 0")
        : attribute !== "@" && attrval !== ""
        ? this.select("*")
            .from("attributelistcode")
            .leftJoin("attrlist", {
              "attrlist.listcode": "attributelistcode.id",
              "attrlist.company": "attributelistcode.company",
            })
            .leftJoin(
              "attributenames",
              "attributenames.id",
              "attrlist.attribute"
            )
            .whereRaw("attributelistcode.id = stockdiary.attributes")
            .andWhereRaw("attributenames.id = ?", [attribute])
            .andWhereRaw(`lower(attrlist.value) like lower(('%'||?||'%'))`, [
              attrval,
            ])
            .andWhereRaw("attributelistcode.company = ?", [company])
        : attribute !== "@" && attrval == ""
        ? this.select("*")
            .from("attributelistcode")
            .leftJoin("attrlist", {
              "attrlist.listcode": "attributelistcode.id",
              "attrlist.company": "attributelistcode.company",
            })
            .leftJoin(
              "attributenames",
              "attributenames.id",
              "attrlist.attribute"
            )
            .whereRaw("attributelistcode.id = stockdiary.attributes")
            .andWhereRaw("attributenames.id = ?", [attribute])
            .andWhereRaw("attributelistcode.company = ?", [company])
        : this.select(knex.raw("1"));
    })
    .orderBy("name")
    .as("t");

  if (notattr == 1) {
    table
      //console.log(table)
      .then((grossprofit) => {
        console.log(grossprofit);
        return res.status(200).json(grossprofit);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  } else {
    knex(table)
      .select(
        knex.raw("t.prod_name as name"),
        "t.category",
        "t.brand",
        "nds",
        "t.code"
      )
      .sum("t.units as units")
      .sum("t.gross_profit as gross_profit")
      .sum("t.salesamount as salesamount")
      .sum("t.cost as cost")
      .sum("t.datefrom_units as datefrom_units")
      .sum("t.dateto_units as dateto_units")
      .groupBy("t.prod_name", "t.category", "t.brand", "nds", "t.code")
      .orderBy("name")
      .then((grossprofit) => {
        console.log(grossprofit);
        return res.status(200).json(grossprofit);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  }
});

module.exports = router;
