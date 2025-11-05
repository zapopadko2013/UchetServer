const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");

const excel = require("node-excel-export");

const router = new express.Router();

router.get("/", (req, res) => {
  const barcode =
    typeof req.query.barcode !== "undefined" && req.query.barcode !== null
      ? req.query.barcode
      : "";
  const brand =
    typeof req.query.brand !== "undefined" && req.query.brand !== null
      ? req.query.brand
      : "@";
  const category =
    typeof req.query.category !== "undefined" && req.query.category !== null
      ? req.query.category
      : "@";
  const stockid =
    typeof req.query.stockID !== "undefined" && req.query.stockID !== null
      ? req.query.stockID
      : "0";

  knex
    .raw(
      `select st.id, p.name as point_name, pr.code, pr.name as product_name, c.name as category, b.brand
      from stockcurrent st
      inner join points p
      on st.point=p.id and st.company=p.company
      inner join products pr
      on st.product=pr.id and st.company=pr.company 
      inner join brands b
      on pr.brand=b.id
      inner join categories c
      on pr.category=c.id
      where st.company=${
        req.userData.company
      } and pr.deleted=false and p.status='ACTIVE' and
    ${barcode ? `pr.code='${barcode}' and ` : ""} 
    ${brand !== "@" ? `pr.brand='${brand}' and ` : ""}  
    ${stockid !== "0" ? `st.point='${stockid}' and ` : ""} 
    ${
      category !== "@" && category.length > 0
        ? `pr.category in (${category.map((c) => `'${c}'`).join(",")}) and `
        : ""
    }
    st.product not in 
      (select product from stockdiary 
      where company=${req.userData.company} and date BETWEEN to_timestamp( '${
        req.query.dateFrom
      } 00:00:00', 'dd.mm.yyyy HH24:MI:SS' ) 
		  AND to_timestamp( '${req.query.dateTo} 23:59:59', 'dd.mm.yyyy HH24:MI:SS' ) )`
    )
    .then((result) => {
      let data = result.rows.slice();
      data = data.map((item) => {
        if (item.point_name === "Центральный склад") return item;
        const point_name = item.point_name.substring(13);
        return {
          ...item,
          point_name: `Склад точки ${helpers.decrypt(point_name)}`,
        };
      });
      return res.status(200).json(data);
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.post("/excel", (req, res) => {
  try {
    const body = req.body;

    let i = 1;
    for (let el of body.products) {
      el.number = i;
      i++;
    }
    const styles = {
      header: {
        font: {
          color: {
            rgb: "FF000000",
          },
          sz: 12,
          bold: false,
        },
      },

      emptyCell: {},
    };

    const specification = {
      number: {
        displayName: "№",
        headerStyle: styles.header,
        width: "5", // <- width in chars (when the number is passed as string)
        height: "10",
      },
      point_name: {
        displayName: "Склад",
        headerStyle: styles.header,
        width: "14", // <- width in chars (when the number is passed as string)
        height: "10",
      },
      code: {
        displayName: "Штрих-код",
        headerStyle: styles.header,
        width: "14", // <- width in chars (when the number is passed as string)
        height: "10",
      },
      product_name: {
        displayName: "Наименование",
        headerStyle: styles.header,
        width: "14", // <- width in chars (when the number is passed as string)
        height: "10",
      },
      category: {
        displayName: "Категория",
        headerStyle: styles.header,
        width: "14", // <- width in chars (when the number is passed as string)
      },
      brand: {
        displayName: "Бренд",
        headerStyle: styles.header,
        width: "14", // <- width in chars (when the number is passed as string)
      },
    };

    const merges = [
      { start: { row: 1, column: 1 }, end: { row: 1, column: 1 } },
      { start: { row: 2, column: 1 }, end: { row: 2, column: 1 } },
      { start: { row: 1, column: 2 }, end: { row: 1, column: 2 } },
      { start: { row: 2, column: 2 }, end: { row: 2, column: 2 } },
      { start: { row: 1, column: 3 }, end: { row: 1, column: 3 } },
      { start: { row: 2, column: 3 }, end: { row: 2, column: 3 } },
    ];

    const report = excel.buildExport([
      // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: body.dat, // <- Specify sheet name (optional)
        //heading: heading, // <- Raw heading array (optional)
        merges: merges, // <- Merge cell ranges
        specification: specification, // <- Report specification
        data: body.products, // <-- Report data
      },
    ]);
    // You can then return this straight
    res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
    return res.send(report);
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;
