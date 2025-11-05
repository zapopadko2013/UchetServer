const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");
const router = new express.Router();
const excel = require("node-excel-export");

router.get("/", (req, res) => {
  const point = req.query.pointid;
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  knex.raw(`
  SELECT
	rl."id",
	rl.revisionnumber,
	rl.point,
	rl.company,
	rl.createdate,
	rl."admin", 
	rl.status,
	rl.submitdate,
	u."name",
  rl."type",
  case rl."type" 
	WHEN 2 THEN (SELECT br.brand FROM brands br WHERE br."id" = rl.type_id) 
	WHEN 3 THEN (SELECT cat."name" FROM categories cat WHERE cat."id" = rl.type_id) 
	ELSE 'По всем товарам' END
	AS type_name 
FROM
	revision_list rl
	INNER JOIN erp_users u ON rl."admin" = u."id"
WHERE
	rl.company = ${company} 
	AND rl.point = ( SELECT stock FROM pointset WHERE point = ${point} ) 
	AND rl.status = 'COMPLETED'
  ORDER BY rl.createdate DESC
`)
    .then((revisions) => {
      revisions.rows.forEach((revision) => {
        revision.username = helpers.decrypt(revision.name);
      });
      return res.status(200).json(revisions.rows);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/details", (req, res) => {
  const company = req.userData.company;
  const revisionnumber = req.query.revisionnumber;
  const parametr = req.query.parametr;
  const od = req.query.onlyDiff;
  let diffIn = "";
  let diffOut = "";
  if (Number(od) === 1 ) {
    diffIn = "and r.unitswas - r.units <> 0";
    diffOut = "and sc.units - sc.units <> 0";
 
  }

  const point = knex("revision_list").select("point").where("revisionnumber","=",revisionnumber);
  let revision_in = `
  select 
  pr.id, pr.code as code, pr.name as name, 
  r.attributes as attributes,
  array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a. listcode = s.attributes and a.company = s.company),', ') as attributesCaption,
	r.unitswas as unitswas, r.units as units, r.price, 
	r.price * r.units as left_cost,  
	r.units - r.unitswas as diff, r.price * (r.units - r.unitswas) as diff_price, 
	r.revisiondate as revisiondate, 
	r.outofrevision as outofrevision
from revisiondiary r
left join stockcurrent s
on s.product = r.product and s.attributes = r.attributes 
and s.company = r.company and r.point = s.point
left join products pr
on r.product = pr.id and r.company = pr.company
where r.revisionnumber = ${revisionnumber} ${diffIn} and r.outofrevision <> 1` 
  ;

  let revision_out = `
  SELECT pr.id, pr.code, pr.name, sc.attributes, 
  array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a. listcode = sc.attributes and a.company = sc.company),', ') as attributesCaption,
  sc.units as units, sc.units as unitswas, sp.price,
sc.units * sp.price as left_cost,
sc.units - sc.units as diff,
sp.price * (sc.units - sc.units) as diff_price,
rl.submitdate as revisiondate,
3 as outofrevision
FROM stockcurrent sc
				INNER JOIN products pr
					ON sc.product = pr.id and sc.company = pr.company
						INNER JOIN storeprices sp
							on sp.stock = sc.id
						INNER JOIN revision_list rl 
							ON rl.point = sc.point and rl.company = sc.company
								AND CASE
									WHEN rl.type = 2 THEN 
										pr.brand = rl.type_id
											WHEN rl.type = 3 THEN 
												pr.category = rl.type_id
													ELSE TRUE END
														WHERE sc.point = (${point}) AND sc.company = ${company} AND NOT pr.deleted AND sc.units <> 0
															AND rl.status = upper('completed') and rl.revisionnumber = ${revisionnumber}
																AND sc.id NOT IN 
																	(SELECT s.id FROM stockcurrent s 
																		LEFT JOIN revisiondiary rd
																			ON rd.product = s.product AND rd.attributes = s.attributes AND rd.point = s.point AND rd.company = s.company
																				WHERE rd.revisionnumber = ${revisionnumber} )  ${diffOut} `;

  let union = "";

  if (Number(parametr) === 1) {
    union = "union";
  }
  else if (Number(parametr) === 2) {
    revision_out = "";
  }
  else if (Number(parametr) === 3){
    revision_in = "";
  }

  knex.raw(
    `${revision_in}
    ${union}
    ${revision_out}
    order by outofrevision desc, revisiondate, units desc
    `
  ).then((revisions) => {
      console.log(parametr);
      return res.status(200).json(revisions.rows);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
  });
  
/*
router.get("/details", (req, res) => {
  const revisionnumber = req.query.revisionnumber;
  const parametr = req.query.parametr;
  const condition = parametr.toString() === "1" ? "" : parametr.toString() === "2" ? " AND rd.outofrevision = 2" : parametr.toString() === "3" ? "AND rd.outofrevision <> 2" : "";
  // const oir = req.query.onlyInRev === "1" ? " AND rd.outofrevision = 2" : "";
  const od = req.query.onlyDiff === "1" ? " AND rd.unitswas - rd.units <> 0" : "";
  knex.raw(`
  SELECT
	rd.revisiondate,
	rd.units,
	rd.unitswas,
	rd."user",
	rd.product,
  "p"."name",
  "p".code,
	rd."attributes",
	rd.price,
  rd.outofrevision,
	array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a. listcode = st.attributes and a.company = st.company),', ') as attributesCaption
FROM
	revisiondiary rd
  INNER JOIN products "p" ON rd.product = "p"."id"
  INNER JOIN stockcurrent st ON (rd.product = st.product AND rd.point = st.point AND rd."attributes" = st."attributes")
WHERE
	revisionnumber = ${revisionnumber + condition + od}
`)
    .then((revisions) => {
      return res.status(200).json(revisions.rows);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});
*/
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
    code: {
      displayName: "Штрих-код",
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
            displayName: "Штрих-код",
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

  knex("revisiondiary")
    .innerJoin("pointset", { "revisiondiary.point": "pointset.stock" })
    .innerJoin("erp_users", { "revisiondiary.user": "erp_users.id" })
    .where({
      "pointset.point": point,
      "revisiondiary.company": company,
    })
    //    .whereNot({"revisiondiary.revtype":0})//revtype 0 - холодная неподтвержденная ревизия
    .andWhereRaw(
      "(revisiondiary.revtype <> 0 or revisiondiary.revtype is NULL)"
    )
    .andWhereRaw("(revisiondiary.revsubmit = 1)")
    .select(
      knex.raw(
        `case when revisiondiary.submitdate is null then revisiondiary.revisiondate else revisiondiary.submitdate end as date`
      ),
      //knex.raw("revisiondiary.createdate::date as date"),
      // "revisiondiary.revisiondate as revisiondate",
      //"revisiondiary.submitdate as submitdate",
      "erp_users.name as username",
      "revisiondiary.user as userid"
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

router.post("/detailsexcel", (req, res) => {
  helpers.serverLog(req.body.revisionDetails);
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

  let data = [];

  req.body.revisionDetails.forEach((el) => {
    data.push({
      ...el,
      total_price: parseFloat(el.price) * parseFloat(el.units),
      total_price_was: parseFloat(el.price) * parseFloat(el.unitswas),
      units_diff: parseFloat(el.units) - parseFloat(el.unitswas),
      price_diff: parseFloat(el.price) * parseFloat(el.units) - parseFloat(el.price) * parseFloat(el.unitswas)
    })
  })
  
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
    code: {
      displayName: "Штрих-код",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    name: {
      displayName: "Наименование товара",
      headerStyle: styles.emptyCell,
      width: "50", // <- width in chars (when the number is passed as string)
    },
    unitswas: {
      displayName: "Количество до ревизии",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    units: {
      displayName: "Количество после ревизии",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    price: {
      displayName: "Цена реализации на момент ревизии",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    total_price: {
      displayName: "Остаток в ценах реализации",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    units_diff: {
      displayName: "Разница в шт.",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    price_diff: {
      	  
	  //////05.10.2023 	
      //displayName: "Разница в тг.",
	  displayName: "Разница в "+val,
	  //////05.10.2023
	  
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    }
  };

  const report = excel.buildExport([
    {
      name: "Ревизия",
      specification: specification,
      data: data,
    }
  ]);
  res.attachment("report.xlsx");
  return res.send(report);
});

module.exports = router;
