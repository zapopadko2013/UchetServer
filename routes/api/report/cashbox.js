const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");

const router = new express.Router();

router.get("/state", (req, res) => {
  const tokenCompany = req.userData.company;
  const company = req.query.company ? req.query.company : tokenCompany;
  const isHolding = req.query.holding ? req.query.holding : false;
  const adminCompany = 15;

  const cbl = knex("cashboxdiary")
.select("cashbox",
"company",
"opercode"
)
.max("id as id")
.where({"company":company})
.andWhere({"opercode":4})
.groupBy("cashbox","company","opercode")
.orderBy("cashbox")
.as("cbl")

const cbdl = knex("cashboxdiary as cbd")
.innerJoin(cbl,{"cbl.cashbox":"cbd.cashbox","cbl.id":"cbd.id","cbl.company":"cbd.company"})
.select("cbd.id",
"cbd.operdate",
"cbd.shiftnumber",
"cbd.cashbox",
"cbd.company",
"cbd.person")
.as("cbdl") 

const cbl2 = knex("cashboxdiary")
.select("cashbox",
"company",
"opercode"
)
.max("id as id")
.where({"company":company})
.andWhere({"opercode":3})
.groupBy("cashbox","company","opercode")
.orderBy("cashbox")
.as("cbl2")

const cbdl2 = knex("cashboxdiary as cbd2")
.innerJoin(cbl2,{"cbl2.cashbox":"cbd2.cashbox","cbl2.id":"cbd2.id","cbl2.company":"cbd2.company"})
.select("cbd2.id",
"cbd2.operdate",
"cbd2.shiftnumber",
"cbd2.cashbox",
"cbd2.company",
"cbd2.person")
.as("cbdl2") 

/*  helpers.serverLog(knex("cashboxdiary")
  .leftJoin("cashboxes", "cashboxes.id", "cashboxdiary.cashbox")
  .innerJoin("points", {
    "points.id": "cashboxes.point",
    "points.company": "cashboxdiary.company",
  })
  .where({ "cashboxdiary.company": company, "cashboxes.deleted": false })
  .andWhere(function () {
    this.whereIn(
      "cashboxdiary.operdate",
      knex("cashboxdiary as d")
        .leftJoin("cashboxes as c", "c.id", "d.cashbox")
        .leftJoin("points as p", {
          "p.id": "c.point",
          "p.company": "d.company",
        })
        .where({ "d.company": company })
        .whereIn("d.opercode", [3, 4])
        .max("d.operdate")
        .groupBy("c.id")
    )
  })
  .distinct(
    "cashboxes.id as id",
    "cashboxes.name",
    "cashboxdiary.operdate",
    "points.name as point",
    "cashboxdiary.person",
    "cashboxdiary.shiftnumber",
    knex.raw(`case when cashboxdiary.opercode = 3 and cashboxdiary.operdate::date <> current_date then 'NOTCLOSED' 
      when cashboxdiary.opercode = 3 then 'OPEN' 
      when cashboxdiary.opercode = 4 then 'CLOSE' 
      else 'NOACTIVITY' end as state`)
  ).toSQL());
  */

  /*
  helpers.serverLog("tokenCompany",tokenCompany);
  helpers.serverLog("company",company);
  helpers.serverLog("isHolding",isHolding);
  */

//   knex.raw(`SELECT DISTINCT
// 	"cashboxes"."id" AS "id",
// 	"cashboxes"."name",
// 	"cashboxdiary"."operdate",
// 	"points"."name" AS "point",
// 	"cashboxdiary"."person",
// 	"cashboxdiary"."shiftnumber",
// CASE
		
// 		WHEN cashboxdiary.opercode = 3 
// 		AND cashboxdiary.operdate :: DATE <> CURRENT_DATE THEN
// 			'NOTCLOSED' 
// 			WHEN cashboxdiary.opercode = 3 THEN
// 			'OPEN' 
// 			WHEN cashboxdiary.opercode = 4 THEN
// 			'CLOSE' ELSE'NOACTIVITY' 
// 	END AS STATE 
// 	FROM
// 		"cashboxdiary"
// 		LEFT JOIN "cashboxes" ON "cashboxes"."id" = "cashboxdiary"."cashbox"
// 		INNER JOIN "points" ON "points"."id" = "cashboxes"."point" 
// 		AND "points"."company" = "cashboxdiary"."company" 
// 	WHERE
// 		"cashboxdiary"."company" = 113 
// 		AND "cashboxes"."deleted" = FALSE 
// 		AND (
// 			"cashboxdiary"."operdate" IN (
// 			SELECT MAX
// 				( "d"."operdate" ) 
// 			FROM
// 				"cashboxdiary" AS "d"
// 				LEFT JOIN "cashboxes" AS "c" ON "c"."id" = "d"."cashbox"
// 				LEFT JOIN "points" AS "p" ON "p"."id" = "c"."point" 
// 				AND "p"."company" = "d"."company" 
// 			WHERE
// 				"d"."company" = 113 
// 				AND "d"."opercode" IN ( 3, 4 ) 
// 			GROUP BY
// 				"c"."id" 
// 			) 
// 	)`)



  knex("cashboxdiary")
    .leftJoin("cashboxes", "cashboxes.id", "cashboxdiary.cashbox")
    .leftJoin(cbdl,{"cbdl.cashbox":"cashboxdiary.cashbox","cbdl.company":"cashboxdiary.company"})
    .leftJoin(cbdl2,{"cbdl2.cashbox":"cashboxdiary.cashbox","cbdl2.company":"cashboxdiary.company"})
    .innerJoin("points", {
      "points.id": "cashboxes.point",
      "points.company": "cashboxdiary.company",
    })
    .where({ "cashboxdiary.company": company, "cashboxes.deleted": false })
    .andWhere(function () {
      this.whereIn(
        "cashboxdiary.operdate",
        knex("cashboxdiary as d")
          .leftJoin("cashboxes as c", "c.id", "d.cashbox")
          .leftJoin("points as p", {
            "p.id": "c.point",
            "p.company": "d.company",
          })
          .where({ "d.company": company })
          .whereIn("d.opercode", [3, 4])
          .max("d.operdate")
          .groupBy("c.id")
      )
      // .orWhereNull("cashboxdiary");
    })
    // .andWhere(
    //   knex.raw(`
    //             CASE when ${isHolding} then
    //             cashboxdiary.company in 
    //               (
    //               WITH RECURSIVE nodes(id) AS 
    //                 (
    //                 SELECT r.id
    //                 FROM companies AS r
    //                 WHERE r.id = ${company}
    //                 UNION ALL
    //                 SELECT r.id
    //                 FROM companies AS r, nodes AS nd
    //                 WHERE nd.id = r.holding_parent
    //                 )
    //                 SELECT * FROM nodes
    //               )
    //             ELSE
    //             cashboxdiary.company = ${company} 
    //             END
    //             AND
    //             (
    //               ${company} = ${tokenCompany} 
    //               or ${tokenCompany} = ${adminCompany}
    //               or ${company} in
    //               (
    //               WITH RECURSIVE nodes(id) AS 
    //                 (
    //                 SELECT r.id
    //                 FROM companies AS r
    //                 WHERE r.id = ${tokenCompany}
    //                 UNION ALL
    //                 SELECT r.id
    //                 FROM companies AS r, nodes AS nd
    //                 WHERE nd.id = r.holding_parent
    //                 )
    //               SELECT * FROM nodes
    //               )
    //             )
    //   `)
    // )
    .distinct(
      "cashboxes.id as id",
      "cashboxes.name",
      "cashboxdiary.operdate",
      "points.name as point",
      "cashboxdiary.person",
      "cashboxdiary.shiftnumber",
      knex.raw(`case when cashboxdiary.opercode = 3 and cashboxdiary.operdate::date <> current_date then 'NOTCLOSED' 
			  when cashboxdiary.opercode = 3 then 'OPEN' 
			  when cashboxdiary.opercode = 4 then 'CLOSE' 
			  else 'NOACTIVITY' end as state`),
      "cbdl.shiftnumber as shift_last",
      "cbdl.operdate as operdate_last",
      "cbdl.person as person_last"
      ,"cbdl2.operdate as operdate_last_open"
    )
    //.orderBy('points.id','cashboxes.id','desc')
    //.orderBy('cashboxes.id')
    .then((cashboxstate) => {
      helpers.serverLog("cashboxstate: ", cashboxstate);
      cashboxstate.forEach((cashbox) => {
        cashbox.name = helpers.decrypt(cashbox.name);
        cashbox.point = helpers.decrypt(cashbox.point);
      });
      return res.status(200).json(cashboxstate);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

//test for select from customers_bonuscards table.
router.get("/analytics-history", (req, res) => {
  let company = req.userData.company;
  if (company === "15") company = req.query.company;

  knex("customers_bonuscards")
    .select(
      "customers_bonuscards.id as id",
      "customers_bonuscards.telephone as tel",
      "customers_bonuscards.lastname as lastname",
      "customers_bonuscards.firstname as firstname",
      "customers_bonuscards.bonuses as bonus",
      "customers_bonuscards.status as status",
      "customers_bonuscards.company as companyId"
    )
    .orderBy("customers_bonuscards.id")
    .then((customers) => {
      return res.status(200).json(customers);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/cashbox-operations", (req, res) => {
  const tokenCompany = req.userData.company;
  const company = req.query.company ? req.query.company : tokenCompany;
  const isHolding = req.query.holding ? req.query.holding : false;
  const adminCompany = 15;

  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const cashbox = req.query.cashbox;  

  knex("cashboxdiary")
    .innerJoin("opercodes", "opercodes.id", "cashboxdiary.opercode")
    .innerJoin("cashboxdiary as f2", function () {
      this.on("f2.company", "=", "cashboxdiary.company")
        .andOn("f2.cashbox", "=", "cashboxdiary.cashbox")
        .andOn("f2.opercode", "=", 3)
        .andOn("f2.operdate", "<", "cashboxdiary.operdate");
    })
    .where({ "cashboxdiary.company": company, "cashboxdiary.cashbox": cashbox })  
    .whereNotIn("cashboxdiary.opercode", [3, 4, 5, 6])
    .andWhereBetween(knex.raw("cashboxdiary.operdate::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .select(
      knex.raw(
        "distinct on (cashboxdiary.operdate) cashboxdiary.operdate as date"
      ),
      "f2.operdate as opendate",
      "cashboxdiary.summ as quantity",
      "opercodes.name as name",
      "cashboxdiary.person as person",
      "cashboxdiary.comments as comments",
      "f2.person as conductor"
    )
    .orderBy("cashboxdiary.operdate", "desc")
    .orderBy("f2.operdate", "desc")
    .then((cashboxoperations) => {
      return res.status(200).json(cashboxoperations);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/get_cash", (req, res) => {  
  const company = req.userData.company;
  const cashbox  = req.query.cashbox;
  const shiftnumber = req.query.shiftnumber;
	/*knex.raw(`
  SELECT
  ( SELECT SUM ( cashpay ) FROM transactions WHERE company = ${company} AND cashbox = ${cashbox} AND shiftnumber = ${shiftnumber}) +
   ( SELECT SUM ( summ ) FROM cashboxdiary WHERE company = ${company} AND cashbox = ${cashbox} AND shiftnumber = ${shiftnumber} AND opercode in (1,2,3)) AS Cash 
  `)*/
  knex.raw(`
     SELECT
  coalesce(( SELECT SUM ( cashpay ) FROM transactions WHERE company = ${company} AND cashbox = ${cashbox} AND shiftnumber = ${shiftnumber} 
  AND "date"::date = (SELECT MAX("date"::date) FROM transactions WHERE shiftnumber = ${shiftnumber} AND cashbox = ${cashbox})),0) +
   ( SELECT SUM ( summ ) FROM cashboxdiary WHERE company = ${company} AND cashbox = ${cashbox} AND shiftnumber = ${shiftnumber} AND opercode in (1,2,3)
   AND operdate::date = (SELECT MAX(operdate::date) FROM cashboxdiary WHERE shiftnumber = ${shiftnumber} and cashbox = ${cashbox})) AS cash 
  
  `)
  .then(result => {
    return res.status(200).json(result);
  })
  .catch(err => {
    helpers.serverLog(req.originalUrl,err.stack,'error');
    return res.status(500).json(err);
  });
});

module.exports = router;
