const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");

const router = new express.Router();

// select to_char(s.date,'DD.MM.YYYY HH24:MI:SS') as date, r.name, sum(units) as units,
//   i.altnumber||' от '||to_char(i.invoicedate,'DD.MM.YYYY') as invoice,
//   array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes),', ') as attr
// from stockdiary s
// left join reasontypes r on (r.id = s.reason)
// inner join products p on (p.id = s.product)
// inner join pointset ps on (ps.stock = s.point)
// left join invoices i on (s.invoice = i.invoicenumber)
// where ps.point = 173
// and s.date::date between to_date('10.02.2019','DD.MM.YYYY') and to_date('26.03.2019','DD.MM.YYYY')
// and p.code = '9006968006093'
// and s.units > 0
// group by s.date, r.name, s.attributes, i.altnumber, to_char(i.invoicedate,'DD.MM.YYYY')
// order by s.date desc

/*router.get("/", (req, res) => {
  let { barcode, point, dateFrom, dateTo } = req.query;
  dateFrom = moment(dateFrom);
  dateTo = moment(dateTo);
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex("stockdiary as s")
    .leftJoin("reasontypes as r", "r.id", "s.reason")
    .innerJoin("products as p", {
      "p.id": "s.product",
      "p.company": "s.company",
    })
    .innerJoin("pointset as ps", "ps.stock", "s.point")
    .leftJoin("invoices as i", {
      "s.invoice": "i.invoicenumber",
      "i.company": "p.company",
    })
    .leftJoin("points as points1", {
      "points1.id": "i.stockto",
      "points1.company": "i.company",
    })
    .leftJoin("points as points2", {
      "points2.id": "i.stockfrom",
      "points2.company": "i.company",
    })
    .where({ "ps.point": point, "p.code": barcode, "s.company": company })
    //.andWhereNot({ 's.units': 0 })
    .andWhereBetween(knex.raw("s.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .select(
      "s.date",
      "r.name",
      "points1.name as stockto",
      "points2.name as stockfrom",
      "points1.point_type as stocktotype",
      "points2.point_type as stockfromtype",
      knex.raw(
        `i.altnumber||' от '||to_char(i.invoicedate,'DD.MM.YYYY') as invoice`
      ),
      knex.raw(
        `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes and a.company = ${company}),', ') as attr`
      )
    )
    .sum(
      knex.raw(
        `case when s.reason in (-4,-1,-2,-3,2,-5,-6)  then -units else units end`
      )
    )
    .groupBy(
      "s.date",
      "r.name",
      "s.attributes",
      "points1.name",
      "points2.name",
      "points1.point_type",
      "points2.point_type",
      "i.altnumber",
      "i.invoicedate"
    )
    .orderBy("s.date", "desc")
    .then((movement) => {
      if (movement.length > 0) {
        movement.forEach((invoice) => {
          if (invoice.stocktotype !== 0 && invoice.stockto) {
            invoice.stockto = invoice.stockto.substring(
              0,
              invoice.stockto.length - 1
            );
            invoice.stockto = invoice.stockto.substring(13);
            invoice.stockto = `Склад точки "${helpers.decrypt(
              invoice.stockto
            )}"`;
          }
          if (invoice.stockfromtype !== 0 && invoice.stockfrom) {
            invoice.stockfrom = invoice.stockfrom.substring(
              0,
              invoice.stockfrom.length - 1
            );
            invoice.stockfrom = invoice.stockfrom.substring(13);
            invoice.stockfrom = `Склад точки "${helpers.decrypt(
              invoice.stockfrom
            )}"`;
          }
        });

        const where = {};
        where["products.code"] = barcode;
        where["pointset.point"] = point;
        where["stockcurrent.company"] = company;

        knex("stockcurrent")
          .innerJoin("products", {
            "products.id": "stockcurrent.product",
            "products.company": "stockcurrent.company",
          })
          .innerJoin("pointset", { "pointset.stock": "stockcurrent.point" })
          .where(where)
          .sum("stockcurrent.units")
          .then((units) => {
            movement[0].units = units[0].sum;
            return res.status(200).json(movement);
          })
          .catch((err) => {
            return res.status(500).json(err);
          });
      } else {
        return res.status(200).json(movement);
      }
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});*/

router.get("/", (req, res) => {
  let { barcode, point, dateFrom, dateTo } = req.query;
  dateFrom = moment(dateFrom);
  dateTo = moment(dateTo);
  let company = req.userData.company;
  let currentUnits;
  let currentUnitsCons;
  if (company === "0" && req.query.company) company = req.query.company;

  var now = new Date();
  var day = ("0" + now.getDate()).slice(-2);
  var month = ("0" + (now.getMonth() + 1)).slice(-2);
  var today = now.getFullYear() + "-" + month + "-" + day;

  knex("stockcurrent")
    .leftJoin(
      knex("consignment")
        .select(knex.raw("sum(units) as units"), "stockid", "company")
        .groupBy("stockid", "company")
        .as("t"),
      function () {
        this.on("stockcurrent.id", "=", "t.stockid").andOn(
          "stockcurrent.company",
          "=",
          "t.company"
        );
      }
    )
    .innerJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "stockcurrent.company",
    })
    .innerJoin("pointset", { "pointset.stock": "stockcurrent.point" })
    .where((pt) => {
      pt.where({
        "products.code": barcode,
        "pointset.point": point,
        "stockcurrent.company": company,
      });
    })
    .sum("stockcurrent.units as units")
    .sum("t.units as consunits")
    .then((units) => {
      currentUnits = new Number(units[0].units);
      currentUnitsCons = new Number(units[0].consunits);

    knex("stockdiary as s")
    .leftJoin("reasontypes as r", "r.id", "s.reason")
    .innerJoin("products as p", { "p.id": "s.product", "p.company": "s.company" })
    .innerJoin("pointset as ps", "ps.stock", "s.point")
    .leftJoin("invoices as i", { "s.invoice": "i.invoicenumber", "i.company": "p.company" })
    .leftJoin("points as points1", { "points1.id": "i.stockto", "points1.company": "i.company" })
    .leftJoin("points as points2", { "points2.id": "i.stockfrom", "points2.company": "i.company" })
	  .leftJoin("customers as c", { "s.customer": "c.id", "s.company": "c.company" })
    .where({ "ps.point": point, "p.code": barcode, "s.company": company })
    .andWhereNot({ "s.units": 0 })
	//20230523 fix to address new reasontypes in stockdiary
	////10.07.2023
	//.andWhereRaw(`((s.reason between  -99 and 99) or s.reason in (100,400))`)
    .andWhereBetween("s.reason", [-99, 99])
	////10.07.2023    
	.andWhereBetween(knex.raw("s.date::date"), [ dateFrom.format(), dateTo.format() ])
    .select(
      "s.date",
      knex.raw(`r.name||case when s.customer is not null then ' ('||c.name||')' else '' end as name`),
      "points1.name as stockto",
      "points2.name as stockfrom",
      "points1.point_type as stocktotype",
      "points2.point_type as stockfromtype",
      knex.raw(`i.altnumber||' от '||to_char(i.invoicedate,'DD.MM.YYYY') as invoice`),
      knex.raw(`array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes and a.company = ${company}),', ') as attr`)
    )
    .sum(knex.raw(`case when s.reason in (-4,-1,-2,-3,2,-6)  then -units else units end`))
    .groupBy("s.date", "r.name", "s.attributes", "points1.name", "points2.name", "points1.point_type", "points2.point_type", "i.altnumber", "i.invoicedate", "s.customer", "c.name")
    .orderBy("s.date", "desc")
    .then(movement => {
      if (movement.length > 0){
        movement.forEach(invoice => {
          if (invoice.stocktotype !== 0 && invoice.stockto) {
            invoice.stockto = invoice.stockto.substring(
              0,
              invoice.stockto.length - 1
            );
            invoice.stockto = invoice.stockto.substring(13);
            invoice.stockto = `Склад точки "${helpers.decrypt(
              invoice.stockto
            )}"`;
          }
          if (invoice.stockfromtype !== 0 && invoice.stockfrom) {
            invoice.stockfrom = invoice.stockfrom.substring(
              0,
              invoice.stockfrom.length - 1
            );
            invoice.stockfrom = invoice.stockfrom.substring(13);
            invoice.stockfrom = `Склад точки "${helpers.decrypt(
              invoice.stockfrom
            )}"`;
          }
        });

            const where = {};
            where["products.code"] = barcode;
            where["pointset.point"] = point;
            where["analytics.stockcurrent_part_snapshots.company"] = company;
            knex("analytics.stockcurrent_part_snapshots")
              .innerJoin("products", {
                "products.id": "analytics.stockcurrent_part_snapshots.product",
                "products.company":
                  "analytics.stockcurrent_part_snapshots.company",
              })
              .innerJoin("pointset", {
                "pointset.stock": "analytics.stockcurrent_part_snapshots.point",
              })
              .where(where)
              .whereIn(
                knex.raw(
                  "analytics.stockcurrent_part_snapshots.snapdate::date"
                ),
                [dateFrom.subtract(1, "days").format(), dateTo.format()]
              )
              .select("analytics.stockcurrent_part_snapshots.snapdate")
              .sum("analytics.stockcurrent_part_snapshots.units")
              .groupBy("analytics.stockcurrent_part_snapshots.snapdate")
              .orderBy("analytics.stockcurrent_part_snapshots.snapdate")
              .then((units) => {
                // unitsfrom
                if (typeof units[0] === "undefined") {
                  if (dateFrom.format("YYYY-MM-DD") > "2019-11-24") {
                    dateFrom.format("YYYY-MM-DD") !== today
                      ? (movement[0].unitsfrom = 0)
                      : (movement[0].unitsfrom = currentUnits);
                  } else {
                    movement[0].unitsfrom = -1;
                  }
                } else {
                  movement[0].unitsfrom = units[0].sum;
                }
                // unitsto
                if (typeof units[1] === "undefined") {
                  if (dateTo.format("YYYY-MM-DD") > "2019-11-24") {
                    dateTo.format("YYYY-MM-DD") !== today
                      ? (movement[0].unitsto = 0)
                      : (movement[0].unitsto = currentUnits);
                    dateTo.format("YYYY-MM-DD") !== today
                      ? (movement[0].unitstowith = 0)
                      : (movement[0].unitstowith =
                          currentUnitsCons + currentUnits);
                  } else {
                    movement[0].unitsto = -1;
                  }
                } else {
                  movement[0].unitsto = units[1].sum;
                }
                return res.status(200).json(movement);
              })
              .catch((err) => {
                return res.status(500).json(err);
              });
          } else {
            return res.status(200).json(movement);
          }
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).json(err);
        });
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

module.exports = router;
