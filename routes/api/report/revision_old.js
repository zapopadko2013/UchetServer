const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");
const router = new express.Router();
const excel = require("node-excel-export");

//()=>({date: "2019-09-03T18:00:00.000Z", username: "", userid: "41"})
router.get("/", (req, res) => {
  const point = req.query.pointid;
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  knex("revisiondiary_old")
    .innerJoin("pointset", { "revisiondiary_old.point": "pointset.stock" })
    .innerJoin("erp_users", { "revisiondiary_old.user": "erp_users.id" })
    .where({
      "pointset.point": point,
      "revisiondiary_old.company": company,
    })
    //    .whereNot({"revisiondiary_old.revtype":0})//revtype 0 - холодная неподтвержденная ревизия
    .andWhereRaw(
      "(revisiondiary_old.revtype <> 0 or revisiondiary_old.revtype is NULL)"
    )
    .select(
      knex.raw(
        `case when revisiondiary_old.submitdate is null then revisiondiary_old.revisiondate else revisiondiary_old.submitdate end as date`
      ),
      "erp_users.name as username",
      "revisiondiary_old.user as userid",
      "revisiondiary_old.revcondition"
    )
    .groupBy("date", "username", "userid", "revcondition")
    .orderBy("date", "desc")
    .then((revisions) => {
      revisions.forEach((revision) => {
        revision.showDate = revision.date;
        revision.date = moment(revision.date).format("YYYY-MM-DD HH:mm:ss");
        revision.username = helpers.decrypt(revision.username);
      });
      return res.status(200).json(revisions);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//({attribute: "L80763-01.03.18",date: "2019-09-04T08:42:04.591Z",product: "27",units: 3,unitswas: 0,username: " "})
router.get("/details", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const userid = req.query.userid;
  //const dateRev = moment(req.query.dateRev);
  const submitdate = req.query.submitDate;
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  const price = knex.select(
    knex.raw(`round(coalesce((select coalesce(min(sp.purchaseprice),0)
                    from stockcurrent_part as sp 
                      where sp.company = revisiondiary_old.company
                        and sp.point = revisiondiary_old.point
                        and sp.product = revisiondiary_old.product
                        and sp.attributes = revisiondiary_old.attributes
                        and sp.units > 0
                        and sp.date = (select min(sp2.date)
                                  from stockcurrent_part as sp2
                                    where sp2.company = sp.company
                                      and sp2.point = sp.point
                                      and sp2.product = sp.product
                                      and sp2.attributes = sp.attributes
                                      and sp2.units > 0)),0)::numeric,2) as purchaseprice`)
  );

  knex("revisiondiary_old")
    .innerJoin("erp_users", { "revisiondiary_old.user": "erp_users.id" })
    .innerJoin("products", { "revisiondiary_old.product": "products.id" })
    .where({
      "revisiondiary_old.user": userid,
      "revisiondiary_old.company": company,
    })
    .andWhere(
      knex.raw(
        `case when revisiondiary_old.submitdate is null then revisiondiary_old.revisiondate else revisiondiary_old.submitdate end`
      ),
      submitdate
    )
    //    .whereNot({"revisiondiary_old.revtype":0})//revtype 0 - холодная неподтвержденная ревизия
    .andWhereRaw(
      "(revisiondiary_old.revtype <> 0 or revisiondiary_old.revtype is NULL)"
    )
    .select(
      "revisiondiary_old.createdate as date",
      "revisiondiary_old.units as units",
      "revisiondiary_old.unitswas as unitswas",
      "revisiondiary_old.price as unitprice",
      "revisiondiary_old.product as prodid",
      knex.raw(`(${price})`),
      "products.name as product",
      "products.code as barcode",
      "erp_users.name as username",
      knex.raw(
        `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = revisiondiary_old.attributes),', ') as attrvalue`
      ),
      knex.raw(
        `array_to_string(array(select a.listcode from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = revisiondiary_old.attributes),', ') as attribute`
      )
    )
    .orderBy("date", "desc")
    .then((revisions) => {
      revisions.forEach((revision) => {
        revision.username = helpers.decrypt(revision.username);
      });
      helpers.serverLog(req.originalUrl, revisions, "success");
      return res.status(200).json(revisions);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err.stack, "error");
      return res.status(500).json(err);
    });
});

router.post("/excel", (req, res) => {
  const excelDetails = req.body.excelDetails;
  const revisorData = req.body.revisorData;
  //let company = req.query.company;
  //if (company === "15" && req.query.company) company = req.query.company;
  const styles = {
    header: {
      font: {
        color: {
          rgb: "FF000000",
        },
        sz: 14,
        bold: true,
      },
    },
    emptyCell: {},
  };
  const heading = [[{ value: revisorData, style: styles.header }]];
  
  //////05.10.2023
  
  let val="";
  // let curr = JSON.parse(helpers.decrypt(req.userData.locales));
  let curr = JSON.parse(req.userData.locales);

	 if (curr == null)
 {
	 val="KZT"; 
 }  
  else
  {    
val=curr.LC_MONETARY;
  }
 
 
  //////05.10.2023

  const specification = {
    barcode: {
      displayName: "Штрихкод",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    product: {
      displayName: "Наименование товара",
      headerStyle: styles.emptyCell,
      width: "50", // <- width in chars (when the number is passed as string)
    },
    attrvalue: {
      displayName: "Атрибут",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    unitswas: {
      displayName: "До ревизии",
      headerStyle: styles.emptyCell,
      // cellFormat: function (value, row) {
      //   // <- Renderer function, you can access also any row.property
      //   return value.toLocaleString("ru", {
      //     minimumFractionDigits: 3,
      //   });
      // },
      width: "10", // <- width in chars (when the number is passed as string)
    },
    unitsTotalAmount: {
      displayName: "Остаток в ценах реализации",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    units: {
      displayName: "После ревизии",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    unitprice: {
      displayName: "Цена реализации на момент ревизии",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    unitsResAmount: {
      displayName: "Результат ревизии в шт.",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    unitsResPrice: {
      
	  
	  //////05.10.2023
	  //displayName: "Результат ревизии в тг.",
	  displayName: "Результат ревизии в " +val,
	  //////05.10.2023
	  
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    date: {
      displayName: "Время проведения ревизии",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
  };

  const merges = [
    { start: { row: 1, column: 1 }, end: { row: 1, column: 10 } },
  ];

  const report = excel.buildExport([
    // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
    {
      name: "Report", // <- Specify sheet name (optional)
      heading: heading, // <- Raw heading array (optional)
      merges: merges, // <- Merge cell ranges
      specification: specification, // <- Report specification
      data: excelDetails, // <-- Report data
    },
  ]);
  // You can then return this straight
  res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
  return res.send(report);
});

router.get("/excel_difference", (req, res) => {
  const date = req.query.dateRev;
  const userid = req.query.userid;
  const point = req.query.point;
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  knex("revision_difference")
    .where({
      "revision_difference.revision_submit_date": date,
      "revision_difference.company": company,
      "revision_difference.user": userid,
      "revision_difference.point": point,
    })
    .orderBy("revision_difference.revision_submit_date")
    .select(
      "revision_difference.barcode as barcode",
      "revision_difference.name as name",
      "revision_difference.purchaseprice as purchaseprice",
      "revision_difference.sellprice as sellprice",
      "revision_difference.units as units",
      "revision_difference.attributes as attributes",
      "revision_difference.attrvalue as attrvalue",
      "revision_difference.revision_submit_date as date"
    )
    .then((difference) => {
      if (difference.length > 0) {
        const styles = {
          header: {
            font: {
              color: {
                rgb: "FF000000",
              },
              sz: 14,
              bold: true,
            },
          },
          emptyCell: {},
        };
        const heading = [
          [
            {
              value: `Дата: ${date}`,
              style: styles.header,
            },
          ],
        ];
        const specification = {
          barcode: {
            displayName: "Штрихкод",
            headerStyle: styles.emptyCell,
            width: "50", // <- width in chars (when the number is passed as string)
          },
          name: {
            displayName: "Наименование товара",
            headerStyle: styles.emptyCell,
            width: "50", // <- width in chars (when the number is passed as string)
          },
          attrvalue: {
            displayName: "Атрибут",
            headerStyle: styles.emptyCell,
            width: "10", // <- width in chars (when the number is passed as string)
          },
          purchaseprice: {
            displayName: "Цена закупки",
            headerStyle: styles.emptyCell,
            width: "10", // <- width in chars (when the number is passed as string)
          },
          sellprice: {
            displayName: "Цена продажи",
            headerStyle: styles.emptyCell,
            width: "10", // <- width in chars (when the number is passed as string)
          },
          units: {
            displayName: "Количество",
            headerStyle: styles.emptyCell,
            width: "10", // <- width in chars (when the number is passed as string)
          },
          attributes: {
            displayName: "Атрибут (доп.)",
            headerStyle: styles.emptyCell,
            width: "10", // <- width in chars (when the number is passed as string)
          },
        };

        const merges = [
          { start: { row: 1, column: 1 }, end: { row: 1, column: 10 } },
        ];

        const report = excel.buildExport([
          // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
          {
            name: "Report", // <- Specify sheet name (optional)
            heading: heading, // <- Raw heading array (optional)
            merges: merges, // <- Merge cell ranges
            specification: specification, // <- Report specification
            data: difference, // <-- Report data
          },
        ]);

        // You can then return this straight

        res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
        return res.send(report);
      } else {
        helpers.serverLog("not found");
        return res.status(200).json(difference);
      }
    })
    .catch((err) => {
      helpers.serverLog(err);
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/notconfirmed", (req, res) => {
  const point = req.query.pointid;
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  knex("revisiondiary_old")
    .innerJoin("pointset", { "revisiondiary_old.point": "pointset.stock" })
    .innerJoin("erp_users", { "revisiondiary_old.user": "erp_users.id" })
    .where({
      "pointset.point": point,
      "revisiondiary_old.company": company,
    })
    //    .whereNot({"revisiondiary_old.revtype":0})//revtype 0 - холодная неподтвержденная ревизия
    .andWhereRaw(
      "(revisiondiary_old.revtype <> 0 or revisiondiary_old.revtype is NULL)"
    )
    .andWhereRaw("(revisiondiary_old.revsubmit = 1)")
    .select(
      knex.raw(
        `case when revisiondiary_old.submitdate is null then revisiondiary_old.revisiondate else revisiondiary_old.submitdate end as date`
      ),
      //knex.raw("revisiondiary_old.createdate::date as date"),
      // "revisiondiary_old.revisiondate as revisiondate",
      //"revisiondiary_old.submitdate as submitdate",
      "erp_users.name as username",
      "revisiondiary_old.user as userid"
    )

    .groupBy("date", "username", "userid" /*, "submitdate"*/)
    .orderBy("date", "desc")
    .then((revisions) => {
      revisions.forEach((revision) => {
        revision.username = helpers.decrypt(revision.username);
      });
      helpers.serverLog(req.originalUrl, revisions, "success");
      return res.status(200).json(revisions);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

module.exports = router;
