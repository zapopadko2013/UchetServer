const express = require("express");
const knex = require("../../db/knex");
const moment = require("moment");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();

const totalprice = require("./report/totalprice");
const history = require("./report/history");
const salesplan = require("./report/salesplan");
const sales = require("./report/sales");
const transactions = require("./report/transactions");
const movement = require("./report/movement");
const excel = require("node-excel-export");
const procurementanalysis = require("./report/procurementanalysis");
const revision = require("./report/revision");
const revision_old = require("./report/revision_old");
const fizcustomers = require("./report/fizcustomers");
const consignment = require("./report/consignment");
const expire_date = require("./report/expire_date");
const cashbox = require("./report/cashbox");
const certificates = require("./report/certificates");
const reconciliation = require("./report/reconciliation");
const stockbalance = require("./report/stockbalance");
const illiquidproducts = require("./report/illiquidproducts");
const grossprofit = require("./report/grossprofit");
const analytics = require("./report/analytics");

router.use("/certificates", certificates);
router.use("/totalprice", totalprice);
router.use("/history", history);
router.use("/salesplan", salesplan);
router.use("/sales", sales);
router.use("/transactions", transactions);
router.use("/movement", movement);
router.use("/procurementanalysis", procurementanalysis);
router.use("/revision", revision);
router.use("/revision_old", revision_old);
router.use("/fizcustomers", fizcustomers);
router.use("/consignment", consignment);
router.use("/expire_date", expire_date);
router.use("/cashbox", cashbox);
router.use("/reconciliation", reconciliation);
router.use("/stockbalance", stockbalance);
router.use("/illiquidproducts", illiquidproducts);
router.use("/grossprofit", grossprofit);
router.use("/analytics", analytics);

//Here you specify the export structure
const styles = {
  emptyCell: {},
};

const specification = {
  index: {
    displayName: "",
    headerStyle: styles.emptyCell,
    width: "6", // <- width in chars (when the number is passed as string)
  },
  pointname: {
    displayName: "Cклад",
    headerStyle: styles.emptyCell,
    width: "30", // <- width in chars (when the number is passed as string)
  },
  productname: {
    displayName: "Наименование товара",
    headerStyle: styles.emptyCell,
    width: "50", // <- width in pixels
  },
  code: {
    displayName: "Штрих код",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  price: {
    displayName: "Цена",
    headerStyle: styles.emptyCell,
    width: "14", // <- width in pixels
  },
  units: {
    displayName: "Количество",
    headerStyle: styles.emptyCell,
    width: "11", // <- width in pixels
  },
  currstockid: {
    displayName: "stockID",
    headerStyle: styles.emptyCell,
    width: "13", // <- width in pixels
  },
};

router.get("/stockbalance/excel", async (req, res) => {
  const counterparty =
    typeof req.query.counterparty !== "undefined" &&
    req.query.counterparty !== null
      ? req.query.counterparty
      : "0";
  const date = req.query.date;
  const brand =
    typeof req.query.brand !== "undefined" && req.query.brand !== null
      ? req.query.brand
      : "@";
  const attribute =
    typeof req.query.attribute !== "undefined" && req.query.attribute !== null
      ? req.query.attribute
      : "@";
  const category =
    typeof req.query.category !== "undefined" && req.query.category !== null
      ? req.query.category
      : "@";
  let company = req.userData.company;
  const attrval =
    typeof req.query.attrval !== "undefined" && req.query.attrval !== null
      ? req.query.attrval
      : "";
  const stockid =
    typeof req.query.stockID !== "undefined" && req.query.stockID !== null
      ? req.query.stockID
      : "0";
  const notattr =
    typeof req.query.notattr !== "undefined" && req.query.notattr !== null
      ? req.query.notattr
      : "0";
  const barcode =
    typeof req.query.barcode !== "undefined" && req.query.barcode !== null
      ? req.query.barcode
      : "0";
  const nds =
    typeof req.query.nds !== "undefined" && req.query.nds !== null
      ? req.query.nds
      : "@";
  const consignment = typeof req.query.consignment !== "undefined" && req.query.consignment !== null ? Boolean(req.query.consignment) : Boolean(true);

  const styles = {
    headerDark: {
      fill: {
        fgColor: {
          rgb: "FF000000",
        },
      },
      font: {
        color: {
          rgb: "FFFFFFFF",
        },
        sz: 14,
        bold: true,
        underline: true,
      },
    },
    emptyCell: {
      font: {
        bold: true,
      },
    },
  };

  const heading = [
    [
      { value: "a1", style: styles.headerDark },
      { value: "b1", style: styles.headerDark },
      { value: "c1", style: styles.headerDark },
      { value: "d1", style: styles.headerDark },
      { value: "e1", style: styles.headerDark },
      { value: "f1", style: styles.headerDark },
      { value: "g1", style: styles.headerDark },
    ],
    ["a2", "b2", "c2", "d2", "e2", "f2", "g2"],
  ];

  let p_count;
  let p_costtotal;
  let p_pricetotal;
  let p_unitstotal;
  let result;

  var now = new Date();
  var day = ("0" + now.getDate()).slice(-2);
  var month = ("0" + (now.getMonth() + 1)).slice(-2);
  var today = now.getFullYear() + "-" + month + "-" + day;
  var date_req = "'" + date + "'";

  const specification = {
    pointname: {
      displayName: "Cклад",
      headerStyle: styles.emptyCell,
      width: "30", // <- width in chars (when the number is passed as string)
    },
    productname: {
      displayName: "Наименование товара",
      headerStyle: styles.emptyCell,
      width: "50", // <- width in chars (when the number is passed as string)
    },
    code: {
      displayName: "Штрих код",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    cost: {
      displayName: "Общая себестоимость",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    price: {
     displayName: "Текущая цена",
     headerStyle: styles.emptyCell,
     width: "15", // <- width in chars (when the number is passed as string)
   },
    price_total: {
      displayName: "Остаток в ценах реализации",
      headerStyle: styles.emptyCell,
      width: "27", // <- width in chars (when the number is passed as string)
    },
    units: {
      displayName: "Количество",
      headerStyle: styles.emptyCell,
      width: "13", // <- width in chars (when the number is passed as string)
    },
    /*brand: {
               displayName: 'Бренд',
               headerStyle: styles.emptyCell,
               width: '30' // <- width in chars (when the number is passed as string)
          },
          category: {
               displayName: 'Категория',
               headerStyle: styles.emptyCell,
               width: '30' // <- width in chars (when the number is passed as string)
          },*/
    nds: {
      displayName: "НДС",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
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

  const snapshots = knex("analytics.stockcurrent_part_snapshots")
    .select(
      knex.raw("analytics.stockcurrent_part_snapshots.company as company"),
      knex.raw("analytics.stockcurrent_part_snapshots.point as point"),
      knex.raw("analytics.stockcurrent_part_snapshots.product as product"),
      knex.raw("analytics.stockcurrent_part_snapshots.attributes as attributes"),
      knex.raw("sum(analytics.stockcurrent_part_snapshots.units) as uni"),
      knex.raw("coalesce(sum(analytics.stockcurrent_part_snapshots.purchaseprice * analytics.stockcurrent_part_snapshots.units),0) as totalcost"),
      knex.raw("min(analytics.stockcurrent_part_snapshots.purchaseprice) as cost")
    )
    .where({ snapdate: date, company: company })
    .groupBy("company", "point", "product", "attributes" /*,'snapdate','date'*/)
    .as("ss");
     
  const consigsnap = knex("consignment_snapshots")
    .select('consignment_snapshots.company as company','consignment_snapshots.stockid as stockid',
          knex.raw('sum(consignment_snapshots.units) as units'),
          knex.raw('sum(consignment_snapshots.purchaseprice * consignment_snapshots.units) as purchasetotal'),
          knex.raw('sum(consignment_snapshots.price * consignment_snapshots.units) as pricetotal')
     )
    .where({ snapdate: date, company: company })
    .groupBy("company", "stockid")
    .as("consigsnap");

  const consig = knex("consignment")
    .select('consignment.company as company','consignment.stockid as stockid',
          knex.raw('sum(consignment.units) as units'),
          knex.raw('sum(consignment.price * consignment.units) as pricetotal')
     )
    .where({ company: company })
     .andWhere('consignment.units','>',0)
    .groupBy("company", "stockid")
    .as("consig");	

  if (company === "15" && req.query.company) {
    company = req.query.company;
  }

  var conditions = { "points.company": company, "points.status": "ACTIVE", "products.deleted": false };

  if (barcode !== "") conditions["products.code"] = barcode;
  if (stockid !== "0") conditions["points.id"] = stockid;
  if (nds !== "@") conditions["products.taxid"] = nds;
  if (brand !== "@") conditions["products.brand"] = brand;
  if (category !== "@") conditions["products.category"] = category;

  var baseQuery = knex("points")
    .innerJoin("stockcurrent", {
      "stockcurrent.point": "points.id",
      "points.company": "stockcurrent.company",
    })
     
     .leftJoin(consigsnap, {
      "consigsnap.stockid": "stockcurrent.id",
      "consigsnap.company": "stockcurrent.company",
    })
     .leftJoin(consig, {
      "consig.stockid": "stockcurrent.id",
      "consig.company": "stockcurrent.company",
    })
     
    .innerJoin("storeprices", {
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "stockcurrent.company",
    })
    .innerJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "stockcurrent.company",
    })
    //.leftJoin('categories',{'categories.id':'products.category','categories.company':'stockcurrent.company'})
    .leftJoin(
      knex.raw(
        `categories on (categories.id = products.category and categories.company in (${company},0))`
      )
    )
    .leftJoin("brands", "brands.id", "products.brand")
    .leftJoin(snapshots, {
      "ss.company": "stockcurrent.company",
      "ss.product": "stockcurrent.product",
      "ss.point": "stockcurrent.point",
      "ss.attributes": "stockcurrent.attributes",
    })
    .where(conditions)
     .modify(function (params3) { 
          if (date == today && consignment) {
          this.select(knex.raw("(stockcurrent.units + coalesce(consig.units,0)) as units"));
        } else if (date == today && !consignment) {
          this.select(knex.raw("stockcurrent.units as units"));
        } else if (date != today && consignment){
            this.select(knex.raw("ss.uni as units"));	
          } else if (date != today && !consignment) {
            this.select(knex.raw("(ss.uni - coalesce(consigsnap.units,0)) as units"));	
          }	
     })
     /*.modify(function (params4) { 
          if (date == today) {
          this.select(knex.raw("(consig.units) as consunits"),knex.raw("(consig.pricetotal) as consprice"));
          } else {
            this.select(knex.raw("(consigsnap.units) as consunits"),knex.raw("(consigsnap.pricetotal) as consprice"),knex.raw("(consigsnap.purchasetotal) as conspurchase"));	
          }	
     })*/
    .select(
      knex.raw("stockcurrent.company as company"),
      knex.raw("stockcurrent.product as product"),
       
       knex.raw("coalesce(coalesce(consigsnap.units,consig.units),0) as consunits"),
       knex.raw("coalesce(coalesce(consigsnap.pricetotal,consig.pricetotal),0) as consprice"), 
       knex.raw("coalesce(consigsnap.purchasetotal,0) as conspurchase"),
       
      knex.raw("points.id as id"),
      "points.point_type as pointType",
      knex.raw("points.name as pointname"),
      knex.raw("products.name as productname"),
      knex.raw("products.code as code"),
      knex.raw("storeprices.price as price"),
      knex.raw(
        "case " +
          notattr +
          "when 1 then array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') else '' end as attributescaption"
      ),
      knex.raw("categories.name as category"),
      knex.raw("brands.brand as brand"),
      knex.raw("stockcurrent.attributes as attributes"),
      knex.raw(
        "case when products.taxid = 0 then 'Без НДС' else 'С НДС' end as nds"
      ),
      knex.raw("coalesce(ss.totalcost,0) as totalcost"),
      knex.raw("coalesce(ss.cost,0) as cost")
    )
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
            .whereRaw("attributelistcode.id = stockcurrent.attributes")
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
            .whereRaw("attributelistcode.id = stockcurrent.attributes")
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
            .whereRaw("attributelistcode.id = stockcurrent.attributes")
            .andWhereRaw("attributenames.id = ?", [attribute])
            .andWhereRaw("attributelistcode.company = ?", [company])
        : this.select(knex.raw("1"));
    })
    //.orderBy('pointname','productname','products.code','pointType')
    //.orderBy('id','productname','attributescaption')
    .orderBy("id")
    //.orderBy('productname')
    //.orderBy('attributescaption')
    .as("bs");

  if (notattr == "1") {
    var innerQuery = knex(baseQuery)
      .select(
        "bs.id",
        "bs.pointType",
        "bs.pointname",
        "bs.productname",
        "bs.code",
        "bs.brand",
        "bs.price",
        /*'bs.counterparty',*/ "bs.category",
        /*knex.raw(
          "round(coalesce(bs.price,0)::numeric,2) as price"
        )*/ /*,knex.raw('coalesce(bs.cost,0) as cost'),*/
        "bs.attributescaption",
        knex.raw("round(coalesce(bs.units,0)::numeric,3) as units"),
        "bs.nds"
      )
      .modify(function (params2) {
        if (date == today && consignment) {
          this.select(knex.raw(`round(coalesce((select coalesce(sp.purchaseprice * sp.units,0)
                                                  from stockcurrent_part as sp 
                                                       where sp.company = bs.company
                                                            and sp.point = bs.id
                                                            and sp.product = bs.product
                                                            and sp.attributes = bs.attributes),0)::numeric,2) as cost`));
        } else if (date == today && !consignment) {
          this.select(knex.raw(`round(coalesce((select coalesce(sp.purchaseprice * sp.units,0)
                                                  from stockcurrent_part as sp 
                                                       where sp.company = bs.company
                                                            and sp.point = bs.id
                                                            and sp.product = bs.product
                                                            and sp.attributes = bs.attributes),0)::numeric,2) - round(coalesce((select coalesce(min(sp.purchaseprice)*bs.consunits,0) 
                                                  from stockcurrent_part as sp 
                                                       where sp.company = bs.company
                                                            and sp.point = bs.id
                                                            and sp.product = bs.product 												
                                                            and sp.units > 0
                                                            and sp.attributes = bs.attributes
                                                            and sp.date = (select min(sp2.date)
                                                                                     from stockcurrent_part as sp2
                                                                                          where sp2.company = sp.company
                                                                                               and sp2.point = sp.point
                                                                                               and sp2.product = sp.product 	
                                                                                               and sp2.units > 0
                                                                                               and sp.attributes = bs.attributes)),0)::numeric,2) as cost`));
        } else if (date != today && consignment){
            this.select(knex.raw(`round(bs.totalcost::numeric,2) as cost`));	
          } else if (date != today && !consignment) {
            this.select(knex.raw(`round(bs.totalcost::numeric-bs.conspurchase::numeric,2) as cost`));	
          }
      })
       .modify(function (params6) {
           if (consignment) {
                this.select(knex.raw("round(coalesce(((bs.units - bs.consunits) * bs.price)+bs.consprice,0)::numeric,2) as price_total")); 
           } else {
                this.select(knex.raw("round(coalesce(bs.units * bs.price,0)::numeric,2) as price_total"));
           }
       })
      .as("iq");

    // Расчет общего количества страниц
    p_count = await knex(innerQuery)
      .count() /*.sum('iq.cost as costtotal')*/
      .sum("iq.units as unitstotal")
       .sum("iq.cost as costtotal")
       .sum("iq.price as pricetotal")
    //console.log(p_count[0]['costtotal']);
    p_costtotal = p_count[0]["costtotal"];
    p_pricetotal = p_count[0]["pricetotal"];
    p_unitstotal = p_count[0]["unitstotal"];
    //p_count = Math.ceil(p_count[0]['count']/itemsPerPage);

    knex(innerQuery)
      .select(
        "id",
        "pointType",
        "pointname",
        "productname",
        "code",
        "brand",
        "category",
        "price",
        "price_total",
        "attributescaption",
        "units",
        "nds",
        "cost"
      ) //.limit(itemsPerPage).offset(itemFrom)
      .then((stockbalance) => {
        stockbalance.forEach((stock) => {
          stock.productname =
            stock.productname + ", " + stock.attributescaption;
          if (stock.pointType !== 0) {
            stock.pointname = stock.pointname.substring(
              0,
              stock.pointname.length - 1
            );
            stock.pointname = stock.pointname.substring(13);
            stock.pointname = `Склад точки "${helpers.decrypt(
              stock.pointname
            )}"`;
          }
        });

        const finalStock = {
          index: "Общий итог",
          cost: p_costtotal,
          price: p_pricetotal,
          units: p_unitstotal,
        };
        stockbalance.push(finalStock);
        const report = excel.buildExport([
          // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
          {
            name: "Report", // <- Specify sheet name (optional)
            //heading: heading, // <- Raw heading array (optional)
            //merges: merges, // <- Merge cell ranges
            specification: specification, // <- Report specification
            data: stockbalance, // <-- Report data
          },
        ]);

        // You can then return this straight
        res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
        return res.send(report);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  } else {
    var innerQuery = knex(baseQuery)
      .select(
        "bs.id",
        "bs.pointType",
        "bs.pointname",
        "bs.productname",
        "bs.code",
        "bs.brand",
        "bs.price",
        "bs.category",
        "bs.nds",
        knex.raw("round(sum(coalesce(bs.units,0))::numeric,3) as units")
      )
      //.sum('bs.units as units')
      .groupBy(
        "bs.id",
        "bs.pointType",
        "bs.pointname",
        "bs.productname",
        "bs.code",
        "bs.brand",
        "bs.price",
        "bs.category",
        "bs.nds",
        "bs.company",
        "bs.product"
      )
      .modify(function (params) {
           if (date == today && consignment) {
          this.select(knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
                                                  from stockcurrent_part as sp 
                                                       where sp.company = bs.company
                                                            and sp.point = bs.id
                                                            and sp.product = bs.product),0)::numeric,2) as cost`));
        } else if (date == today && !consignment) {
          this.select(knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
                                                  from stockcurrent_part as sp 
                                                       where sp.company = bs.company
                                                            and sp.point = bs.id
                                                            and sp.product = bs.product),0)::numeric,2) - round(coalesce((select coalesce(min(sp.purchaseprice)*sum(bs.consunits),0) 
                                                  from stockcurrent_part as sp 
                                                       where sp.company = bs.company
                                                            and sp.point = bs.id
                                                            and sp.product = bs.product 												
                                                            and sp.units > 0
                                                            and sp.date = (select min(sp2.date)
                                                                                     from stockcurrent_part as sp2
                                                                                          where sp2.company = sp.company
                                                                                               and sp2.point = sp.point
                                                                                               and sp2.product = sp.product 	
                                                                                               and sp2.units > 0)),0)::numeric,2) as cost`));
        } else if (date != today && consignment){
            this.select(knex.raw(`round(sum(bs.totalcost)::numeric,2) as cost`));	
          } else if (date != today && !consignment) {
            this.select(knex.raw(`round(sum(bs.totalcost)::numeric-sum(bs.conspurchase)::numeric,2) as cost`));	
          }          
      })
       .modify(function (params4) {
           if (consignment) {
                this.select(knex.raw("round(coalesce(sum(((bs.units - bs.consunits) * bs.price)+bs.consprice),0)::numeric,2) as price_total")); 
           } else {
                this.select(knex.raw("round(coalesce(sum(bs.units * bs.price),0)::numeric,2) as price_total"));
           }
       })
      .as("iq");

    // Расчет общего количества страниц
    p_count = await knex(innerQuery)
      .count()
      .sum("iq.cost as costtotal")
      .sum("iq.price_total as pricetotal")
      .sum("iq.units as unitstotal");
    //console.log('Count: ' + p_count[0]['count']);
    p_costtotal = p_count[0]["costtotal"];
    p_pricetotal = p_count[0]["pricetotal"];
    p_unitstotal = p_count[0]["unitstotal"];
    //p_count = Math.ceil(p_count[0]['count']/itemsPerPage);

    knex(innerQuery)
      .select(
        "id",
        "pointType",
        "pointname",
        "productname",
        "code",
        "brand",
        "category",
        "price",
        "price_total",
        "units",
        "nds",
        "cost"
      ) //.limit(itemsPerPage).offset(itemFrom)
      .then((stockbalance) => {
        stockbalance.forEach((stock) => {
          if (stock.pointType !== 0) {
            stock.pointname = stock.pointname.substring(
              0,
              stock.pointname.length - 1
            );
            stock.pointname = stock.pointname.substring(13);
            stock.pointname = `Склад точки "${helpers.decrypt(
              stock.pointname
            )}"`;
          }
        });

        const finalStock = {
          index: "Общий итог",
          cost: p_costtotal,
          price: p_pricetotal,
          units: p_unitstotal,
        };
        stockbalance.push(finalStock);
        const report = excel.buildExport([
          // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
          {
            name: "Report", // <- Specify sheet name (optional)
            //heading: heading, // <- Raw heading array (optional)
            //merges: merges, // <- Merge cell ranges
            specification: specification, // <- Report specification
            data: stockbalance, // <-- Report data
          },
        ]);

        // You can then return this straight
        res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
        return res.send(report);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  }
});

router.get("/stockbalance/old_excel", async (req, res) => {
  const counterparty =
    typeof req.query.counterparty !== "undefined" &&
    req.query.counterparty !== null
      ? req.query.counterparty
      : "0";
  const date = req.query.date;
  const brand =
    typeof req.query.brand !== "undefined" && req.query.brand !== null
      ? req.query.brand
      : "@";
  const attribute =
    typeof req.query.attribute !== "undefined" && req.query.attribute !== null
      ? req.query.attribute
      : "@";
  const category =
    typeof req.query.category !== "undefined" && req.query.category !== null
      ? req.query.category
      : "@";
  let company = req.userData.company;
  const attrval =
    typeof req.query.attrval !== "undefined" && req.query.attrval !== null
      ? req.query.attrval
      : "";
  const stockid =
    typeof req.query.stockID !== "undefined" && req.query.stockID !== null
      ? req.query.stockID
      : "0";
  const notattr =
    typeof req.query.notattr !== "undefined" && req.query.notattr !== null
      ? req.query.notattr
      : "0";
  const barcode =
    typeof req.query.barcode !== "undefined" && req.query.barcode !== null
      ? req.query.barcode
      : "0";
  const nds =
    typeof req.query.nds !== "undefined" && req.query.nds !== null
      ? req.query.nds
      : "@";

  let p_count;
  let p_costtotal;
  let p_pricetotal;
  let p_unitstotal;
  let result;

  var now = new Date();
  var day = ("0" + now.getDate()).slice(-2);
  var month = ("0" + (now.getMonth() + 1)).slice(-2);
  var today = now.getFullYear() + "-" + month + "-" + day;
  var date_req = "'" + date + "'";

  const specification = {
    pointname: {
      displayName: "Cклад",
      headerStyle: styles.emptyCell,
      width: "30", // <- width in chars (when the number is passed as string)
    },
    productname: {
      displayName: "Наименование товара",
      headerStyle: styles.emptyCell,
      width: "50", // <- width in chars (when the number is passed as string)
    },
    code: {
      displayName: "Штрих код",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    cost: {
      displayName:
        notattr == "1" ? "Себестоимость одной штуки" : "Общая себестоимость",
      headerStyle: styles.emptyCell,
      width: "30", // <- width in chars (when the number is passed as string)
    },
    price: {
      displayName:
        notattr == "1"
          ? "Цена реализации за штуку"
          : "Остаток в ценах реализации",
      headerStyle: styles.emptyCell,
      width: "30", // <- width in chars (when the number is passed as string)
    },
    units: {
      displayName: "Количество",
      headerStyle: styles.emptyCell,
      width: "30", // <- width in chars (when the number is passed as string)
    },
    /*brand: {
			displayName: 'Бренд',
			headerStyle: styles.emptyCell,
			width: '30' // <- width in chars (when the number is passed as string)
		},
		category: {
			displayName: 'Категория',
			headerStyle: styles.emptyCell,
			width: '30' // <- width in chars (when the number is passed as string)
		},*/
    nds: {
      displayName: "НДС",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
  };

  if (company === "0" && req.query.company) {
    company = req.query.company;
  }

  const snapshots = knex("analytics.stockcurrent_part_snapshots")
    .select(
      knex.raw("analytics.stockcurrent_part_snapshots.company as company"),
      knex.raw("analytics.stockcurrent_part_snapshots.point as point"),
      knex.raw("analytics.stockcurrent_part_snapshots.product as product"),
      knex.raw("analytics.stockcurrent_part_snapshots.attributes as attributes"),
      knex.raw("sum(analytics.stockcurrent_part_snapshots.units) as uni"),
      knex.raw(
        "coalesce(sum(analytics.stockcurrent_part_snapshots.purchaseprice * analytics.stockcurrent_part_snapshots.units),0) as totalcost"
      ),
      knex.raw("min(analytics.stockcurrent_part_snapshots.purchaseprice) as cost")
    )
    .where({ snapdate: date, company: company })
    .groupBy("company", "point", "product", "attributes" /*,'snapdate','date'*/)
    .as("ss");

  var conditions = { "points.company": company, "points.status": "ACTIVE" };

  if (barcode !== "") conditions["products.code"] = barcode;
  if (stockid !== "0") conditions["points.id"] = stockid;
  if (nds !== "@") conditions["products.taxid"] = nds;
  if (brand !== "@") conditions["products.brand"] = brand;
  if (category !== "@") conditions["products.category"] = category;

  var baseQuery = knex("points")
    .innerJoin("stockcurrent", {
      "stockcurrent.point": "points.id",
      "points.company": "stockcurrent.company",
    })
    .innerJoin("storeprices", {
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "stockcurrent.company",
    })
    .innerJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "storeprices.company",
    })
    //.leftJoin('categories',{'categories.id':'products.category','categories.company':'stockcurrent.company'})
    .leftJoin(
      knex.raw(
        `categories on (categories.id = products.category and categories.company in (${company},0))`
      )
    )
    .leftJoin("brands", "brands.id", "products.brand")
    .leftJoin(snapshots, {
      "ss.company": "stockcurrent.company",
      "ss.product": "stockcurrent.product",
      "ss.point": "stockcurrent.point",
      "ss.attributes": "stockcurrent.attributes",
    })
    .where(conditions)
    .select(
      knex.raw("stockcurrent.company as company"),
      knex.raw("stockcurrent.product as product"),
      knex.raw("points.id as id"),
      "points.point_type as pointType",
      knex.raw("points.name as pointname"),
      knex.raw("products.name as productname"),
      knex.raw("products.code as code"),
      knex.raw(
        "case '" +
          date +
          "' when '" +
          today +
          "' then stockcurrent.units else ss.uni end as units"
      ),
      knex.raw("storeprices.price as price"),
      knex.raw(
        "case " +
          notattr +
          "when 1 then array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') else '' end as attributescaption"
      ),
      knex.raw("categories.name as category"),
      knex.raw("brands.brand as brand"),
      knex.raw("stockcurrent.attributes as attributes"),
      knex.raw(
        "case when products.taxid = 0 then 'Без НДС' else 'С НДС' end as nds"
      ),
      knex.raw("coalesce(ss.totalcost,0) as totalcost"),
      knex.raw("coalesce(ss.cost,0) as cost")
    )
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
            .whereRaw("attributelistcode.id = stockcurrent.attributes")
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
            .whereRaw("attributelistcode.id = stockcurrent.attributes")
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
            .whereRaw("attributelistcode.id = stockcurrent.attributes")
            .andWhereRaw("attributenames.id = ?", [attribute])
            .andWhereRaw("attributelistcode.company = ?", [company])
        : this.select(knex.raw("1"));
    })
    //.orderBy('pointname','productname','products.code','pointType')
    //.orderBy('id','productname','attributescaption')
    .orderBy("id")
    //.orderBy('productname')
    //.orderBy('attributescaption')
    .as("bs");

  if (notattr == "1") {
    var innerQuery = knex(baseQuery)
      .select(
        "bs.id",
        "bs.pointType",
        "bs.pointname",
        "bs.productname",
        "bs.code",
        "bs.brand",
        /*'bs.counterparty',*/ "bs.category",
        knex.raw(
          "round(coalesce(bs.price,0)::numeric,2)::float8 as price"
        ) /*,knex.raw('coalesce(bs.cost,0) as cost')*/,
        "bs.attributescaption",
        knex.raw("round(coalesce(bs.units,0)::numeric,3)::float8 as units"),
        "bs.nds"
      )
      .orderBy("bs.id")
      .orderBy("units", "desc")
      //.orderBy('bs.productname')
      //.orderBy('bs.attributescaption')
      .modify(function (params) {
        if (date == today) {
          this.select(
            knex.raw(`coalesce((select coalesce(sum(sp3.purchaseprice * sp3.units),0)
										from stockcurrent_part as sp3 
											where sp3.company = bs.company
												and sp3.point = bs.id
												and sp3.attributes = bs.attributes
												and sp3.product = bs.product),0) as totalcost`)
          );
        } else {
          this.select(knex.raw(`bs.totalcost as totalcost`));
        }
      })
      .modify(function (params2) {
        if (date == today) {
          this.select(
            knex.raw(`round(coalesce((select coalesce(min(sp.purchaseprice),0)
										from stockcurrent_part as sp 
											where sp.company = bs.company
												and sp.point = bs.id
												and sp.product = bs.product 												
												and sp.attributes = bs.attributes
												and sp.units > 0
												and sp.date = (select min(sp2.date)
																	from stockcurrent_part as sp2
																		where sp2.company = sp.company
																			and sp2.point = sp.point
																			and sp2.product = sp.product 	
																			and sp2.attributes = sp.attributes
																			and sp2.units > 0)),0)::numeric,2)::float8 as cost`)
          );
        } else {
          this.select(knex.raw(`round(bs.cost::numeric,2)::float8 as cost`));
        }
      })
      .as("iq");

    // Расчет общего количества страниц
    p_count = await knex(innerQuery)
      .count() /*.sum('iq.cost as costtotal')*/
      .sum("iq.units as unitstotal")
      .select(
        knex.raw(`sum(iq.price*iq.units) as pricetotal`),
        knex.raw(`sum(iq.totalcost) as costtotal`)
      );
    //console.log(p_count[0]['costtotal']);
    p_costtotal = p_count[0]["costtotal"];
    p_pricetotal = p_count[0]["pricetotal"];
    p_unitstotal = p_count[0]["unitstotal"];
    //p_count = Math.ceil(p_count[0]['count']/itemsPerPage);

    knex(innerQuery)
      .select(
        "id",
        "pointType",
        "pointname",
        "productname",
        "code",
        "brand",
        "category",
        "price",
        "attributescaption",
        "units",
        "nds",
        "cost"
      ) //.limit(itemsPerPage).offset(itemFrom)
      .then((stockbalance) => {
        stockbalance.forEach((stock) => {
          stock.productname =
            stock.productname + ", " + stock.attributescaption;
          if (stock.pointType !== 0) {
            stock.pointname = stock.pointname.substring(
              0,
              stock.pointname.length - 1
            );
            stock.pointname = stock.pointname.substring(13);
            stock.pointname = `Склад точки "${helpers.decrypt(
              stock.pointname
            )}"`;
          }
        });

        const finalStock = {
          index: "Общий итог",
          cost: p_costtotal,
          price: p_pricetotal,
          units: p_unitstotal,
        };
        stockbalance.push(finalStock);

        const report = excel.buildExport([
          // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
          {
            name: "Report", // <- Specify sheet name (optional)
            //heading: heading, // <- Raw heading array (optional)
            //merges: merges, // <- Merge cell ranges
            specification: specification, // <- Report specification
            data: stockbalance, // <-- Report data
          },
        ]);

        // You can then return this straight
        res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
        return res.send(report);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  } else {
    var innerQuery = knex(baseQuery)
      .select(
        "bs.id",
        "bs.pointType",
        "bs.pointname",
        "bs.productname",
        "bs.code",
        "bs.brand",
        /*'bs.counterparty',*/ "bs.category",
        knex.raw(
          "round(coalesce(sum(bs.units * bs.price),0)::numeric,2)::float8 as price"
        ),
        "bs.nds" /*, knex.raw('coalesce(sum(bs.units * bs.cost),0) as cost')*/,
        knex.raw("round(sum(coalesce(bs.units,0))::numeric,3)::float8 as units")
      )
      //.sum('bs.units as units')
      .groupBy(
        "bs.id",
        "bs.pointType",
        "bs.pointname",
        "bs.productname",
        "bs.code",
        "bs.brand",
        /*'bs.counterparty',*/ "bs.category",
        "cost",
        "bs.nds",
        "bs.company",
        "bs.product"
      )
      .orderBy("bs.id")
      .orderBy("units", "desc")
      //.orderBy('bs.productname')
      .modify(function (params) {
        if (date == today) {
          this.select(
            knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
										from stockcurrent_part as sp 
											where sp.company = bs.company
												and sp.point = bs.id
												and sp.product = bs.product),0)::numeric,2)::float8 as cost`)
          );
        } else {
          this.select(
            knex.raw(
              `round(sum(bs.totalcost)::numeric,2)::float8 as cost`
            ) /*knex.raw(`coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
										from analytics.stockcurrent_part_snapshots as sp 
											where sp.company = bs.company
												and sp.point = bs.id
												and sp.product = bs.product 												
												and sp.snapdate = ${date_req}),0) as cost`)*/
          );
        }
      })
      .as("iq");

    // Расчет общего количества страниц
    p_count = await knex(innerQuery)
      .count()
      .sum("iq.cost as costtotal")
      .sum("iq.price as pricetotal")
      .sum("iq.units as unitstotal");
    //console.log('Count: ' + p_count[0]['count']);
    p_costtotal = p_count[0]["costtotal"];
    p_pricetotal = p_count[0]["pricetotal"];
    p_unitstotal = p_count[0]["unitstotal"];
    //p_count = Math.ceil(p_count[0]['count']/itemsPerPage);

    knex(innerQuery)
      .select(
        "id",
        "pointType",
        "pointname",
        "productname",
        "code",
        "brand",
        "category",
        "price",
        "units",
        "nds",
        "cost"
      ) //.limit(itemsPerPage).offset(itemFrom)
      .then((stockbalance) => {
        stockbalance.forEach((stock) => {
          if (stock.pointType !== 0) {
            stock.pointname = stock.pointname.substring(
              0,
              stock.pointname.length - 1
            );
            stock.pointname = stock.pointname.substring(13);
            stock.pointname = `Склад точки "${helpers.decrypt(
              stock.pointname
            )}"`;
          }
        });

        const finalStock = {
          index: "Общий итог",
          cost: p_costtotal,
          price: p_pricetotal,
          units: p_unitstotal,
        };
        stockbalance.push(finalStock);

        const report = excel.buildExport([
          // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
          {
            name: "Report", // <- Specify sheet name (optional)
            //heading: heading, // <- Raw heading array (optional)
            //merges: merges, // <- Merge cell ranges
            specification: specification, // <- Report specification
            data: stockbalance, // <-- Report data
          },
        ]);

        // You can then return this straight
        res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
        return res.send(report);
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
  }
});

router.get("/stockbalance/alexandro", (req, res) => {
  knex("points")
    .innerJoin("stockcurrent", {
      "stockcurrent.point": "points.id",
      "stockcurrent.company": "points.company",
    })
    .innerJoin("storeprices", {
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "stockcurrent.company",
    })
    .innerJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "storeprices.company",
    })
    .where({
      "points.id": req.query.stockID,
      "points.company": req.userData.company,
    })
    .orderBy("products.name")
    .select(
      "stockcurrent.id as stockcurrentid",
      "products.name as productname",
      "products.code",
      "stockcurrent.units",
      "storeprices.price",
      knex.raw(
        "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes),', ') as attributescaption"
      )
    )
    .then((stockbalance) => {
      return res.status(200).json(stockbalance);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/stockbalance/product", (req, res) => {
  const where = {};
  const barcode = req.query.barcode;
  const stockID = req.query.stockID;
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  if (!stockID || stockID === "0") {
    where["products.code"] = barcode;
    where["points.company"] = company;
  } else {
    where["products.code"] = barcode;
    where["points.id"] = stockID;
    where["points.company"] = company;
  }

  knex("points")
    .innerJoin("stockcurrent", {
      "stockcurrent.point": "points.id",
      "stockcurrent.company": "points.company",
    })
    .innerJoin("storeprices", {
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "stockcurrent.company",
    })
    .innerJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "storeprices.company",
    })
    .where(where)
    .orderBy("products.name")
    .select(
      "points.name as pointname",
      "products.name as productname",
      "products.code",
      "stockcurrent.units",
      "storeprices.price",
      knex.raw(
        "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributescaption"
      )
    )
    .then((stockbalance) => {
      stockbalance.forEach((stock) => {
        stock.pointname = stock.pointname.substring(
          0,
          stock.pointname.length - 1
        );
        stock.pointname = stock.pointname.substring(13);
        stock.pointname = `Склад точки "${helpers.decrypt(stock.pointname)}"`;
      });

      return res.status(200).json(stockbalance);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

// select c.name, d.person, case when d.opercode = 3 and d.operdate::date <> current_date then 'Не закрыта'
//                               when d.opercode = 3 then 'Открыта'
//                               when d.opercode = 4 then 'Закрыта'
//                               else 'Не было активности' end, d.operdate
//     from cashboxes c
//       left join cashboxdiary d on (d.cashbox = c.id)
//       inner join points p on (p.id = c.point)
//             where p.company = 15
//               and c.deleted = false
//                 and (d.operdate in (
//                   select max(d.operdate)
//                     from cashboxdiary d
//                       left join cashboxes c on (c.id = d.cashbox)
//                       left join points p on (p.id = c.point)
//                         where p.company = 15
//                           and d.opercode in (3,4)
//                               group by c.id) or d.id is null);

const specificationcustom = {
  uuid_: {
    displayName: "uuid",
    headerStyle: styles.emptyCell,
    width: "13", // <- width in pixels
  },
  type: {
    displayName: "Тип",
    headerStyle: styles.emptyCell,
    width: "6", // <- width in chars (when the number is passed as string)
  },
  prodtype: {
    displayName: "Группы",
    headerStyle: styles.emptyCell,
    width: "30", // <- width in chars (when the number is passed as string)
  },
  code: {
    displayName: "Код",
    headerStyle: styles.emptyCell,
    width: "30", // <- width in chars (when the number is passed as string)
  },
  productname: {
    displayName: "Наименование товара",
    headerStyle: styles.emptyCell,
    width: "50", // <- width in pixels
  },
  externalcode: {
    displayName: "Внешний код",
    headerStyle: styles.emptyCell,
    width: "30", // <- width in chars (when the number is passed as string)
  },
  vendorcode: {
    displayName: "Артикул",
    headerStyle: styles.emptyCell,
    width: "30", // <- width in chars (when the number is passed as string)
  },
  price: {
    displayName: "Цена продажи",
    headerStyle: styles.emptyCell,
    width: "14", // <- width in pixels
  },
  buyprice: {
    displayName: "Закупочная цена",
    headerStyle: styles.emptyCell,
    width: "14", // <- width in pixels
  },
  buycurrency: {
    displayName: "Валюта(Закупочная цена)",
    headerStyle: styles.emptyCell,
    width: "14", // <- width in pixels
  },
  minimum_balance: {
    displayName: "Неснижаемый остаток",
    headerStyle: styles.emptyCell,
    width: "14", // <- width in pixels
  },
  barcode: {
    displayName: "Штрихкод EAN13",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  country: {
    displayName: "Страна",
    headerStyle: styles.emptyCell,
    width: "13", // <- width in pixels
  },
  nds: {
    displayName: "НДС",
    headerStyle: styles.emptyCell,
    width: "13", // <- width in pixels
  },
  provider: {
    displayName: "Поставщик",
    headerStyle: styles.emptyCell,
    width: "13", // <- width in pixels
  },
  units: {
    displayName: "Количество",
    headerStyle: styles.emptyCell,
    width: "11", // <- width in pixels
  },
};

router.get("/stockbalance/excelpurebeauty", (req, res) => {
  const where = {};
  const barcode = req.query.barcode;
  const stockid = req.query.stockID;
  const company = req.userData.company;

  where["points.company"] = company;
  if (stockid && stockid !== "0" && barcode && barcode !== "0") {
    where["products.code"] = barcode;
    where["points.id"] = stockid;
  } else if (stockid && stockid !== "0") {
    where["points.id"] = stockid;
  } else if (barcode && barcode !== "0") {
    where["products.code"] = barcode;
  }

  knex("points")
    .innerJoin("stockcurrent", {
      "stockcurrent.point": "points.id",
      "stockcurrent.company": "points.company",
    })
    .innerJoin("storeprices", {
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "stockcurrent.company",
    })
    .innerJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "storeprices.company",
    })
    .leftJoin("categories", {
      "categories.id": "products.category",
      "categories.company": "products.company",
    })
    .leftJoin("product_accounting", {
      "product_accounting.company": "stockcurrent.company",
      "product_accounting.product": "stockcurrent.product",
      "product_accounting.attributes": "stockcurrent.attributes",
      "product_accounting.id": knex.raw(
        "(select max(id) from product_accounting where product_accounting.attributes = stockcurrent.attributes and product_accounting.product = stockcurrent.product and product_accounting.company = stockcurrent.company)"
      ),
    })
    .leftJoin("counterparties", {
      "counterparties.id": "product_accounting.company",
    })
    .leftJoin("taxes", "taxes.id", "products.taxid")
    .where(where)
    .orderBy("stockcurrent.units")
    .select(
      "products.name as productname",
      "products.code as barcode",
      "stockcurrent.units",
      "storeprices.price",
      "stockcurrent.id as currstockid",
      "product_accounting.purchaseprice as buyprice",
      knex.raw("(taxes.rate * 100) as nds"),
      "products.taxid",
      knex.raw("coalesce(categories.name,'Без категории') as prodtype"),
      knex.raw(
        "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributescaption"
      ),
      knex.raw(
        `array_to_string(array(select c.name from counterparties c inner join counterparty2product cp on (cp.counterparty = c.id and cp.company = c.company) where cp.product = products.id and cp.company = ${company}),', ') as provider`
      )
    )
    .then((stockbalance) => {
      const totalValue = { price: 0, units: 0 };
	  
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
	  
      stockbalance.forEach((stock, idx) => {
        stock.productname += stock.attributescaption
          ? ", " + stock.attributescaption
          : "";
        stock.index = idx + 1;
        totalValue.price = totalValue.price + stock.price * stock.units;
        totalValue.units = totalValue.units + stock.units;
        
		
		//////05.10.2023
        //stock.buycurrency = "KZT";
		stock.buycurrency = val;
		//////05.10.2023
		
      });

      const finalStock = {
        index: "Общий итог",
        price: totalValue.price,
        units: totalValue.units,
      };
      stockbalance.push(finalStock);
      const merges = [
        {
          start: { row: stockbalance.length + 1, column: 1 },
          end: { row: stockbalance.length + 1, column: 4 },
        },
      ];

      const report = excel.buildExport([
        // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
        {
          name: "Report", // <- Specify sheet name (optional)
          //heading: heading, // <- Raw heading array (optional)
          merges: merges, // <- Merge cell ranges
          specification: specificationcustom, // <- Report specification
          data: stockbalance, // <-- Report data
        },
      ]);

      // You can then return this straight
      res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
      return res.send(report);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/stockbalance/excelpurebeauty_sold", (req, res) => {
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
  if (company === "0") company = req.query.company;
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

  knex("transactions")
    .innerJoin("transaction_details", {
      "transaction_details.transactionid": "transactions.id",
      "transaction_details.company": "transactions.company",
    })
    .innerJoin("products", {
      "products.id": "transaction_details.product",
      "products.company": "transaction_details.company",
    })
    .innerJoin("points", {
      "points.id": "transactions.point",
      "points.company": "transactions.company",
    })
    .innerJoin("pointset", "pointset.point", "transactions.point")
    .innerJoin(
      knex.raw(
        "stockcurrent as s on (transaction_details.product = s.product and transaction_details.attributes = s.attributes and pointset.stock = s.point and transaction_details.company = s.company)"
      )
    )
    //.innerJoin('storeprices', {'storeprices.stock': 's.id', 'storeprices.company': 's.company'})
    .leftJoin(
      knex.raw(
        `categories as c on (products.category = c.id and c.company in (products.company,0))`
      )
    )
    .leftJoin("product_accounting", {
      "product_accounting.product": "s.product",
      "product_accounting.attributes": "s.attributes",
      "product_accounting.id": knex.raw(
        "(select max(id) from product_accounting where product_accounting.attributes = s.attributes and product_accounting.product = s.product)"
      ),
    })
    .leftJoin("brands", "brands.id", "products.brand")
    .where((pt) => {
      point !== "0"
        ? pt.where({ "points.id": point, "points.company": company })
        : pt.where({ "points.company": company });
    })
    .andWhere((tt) => {
      type !== "@"
        ? tt.where({ "transactions.tickettype": type })
        : tt.whereIn("transactions.tickettype", [0, 1]);
    })
    .select(
      "products.name as productname",
      "products.code as barcode",
      "s.id as currstockid",
      knex.raw("coalesce(c.name,'Без категории') as prodtype"),
      knex.raw("(transaction_details.taxrate * 100) as nds"),
      //'storeprices.price',
      knex.raw(
        "(transaction_details.price - ((transaction_details.discount + transaction_details.ticketdiscount)/transaction_details.units * case when transactions.tickettype = 1 then (-1) else 1 end) - (transaction_details.bonuspay/transaction_details.units * case when transactions.tickettype = 1 then (-1) else 1 end)) * case when transactions.tickettype = 1 then (-1) else 1 end as price"
      ),
      knex.raw("coalesce(product_accounting.purchaseprice,0) as buyprice"),
      "transactions.tickettype",
      knex.raw(
        "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes and a.company = s.company),', ') as attributescaption"
      ),
      knex.raw(
        `array_to_string(array(select c.name from counterparties c inner join counterparty2product cp on (cp.counterparty = c.id and cp.company = c.company) where cp.product = products.id and cp.company = ${company}),', ') as provider`
      )
    )
    .sum("transaction_details.units as units")
    .andWhereBetween(knex.raw("transactions.date::date"), [
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
      category !== "@"
        ? this.select("*")
            .from("categories")
            .andWhereRaw("id = ?", [category])
            .whereRaw("id = products.category")
            .andWhereRaw(`c.company in (${company},0)`)
        : this.select(knex.raw("1"));
    })
    .whereExists(function () {
      brand !== "@"
        ? this.select("*")
            .from("brands")
            .andWhereRaw("id = ?", [brand])
            .whereRaw("id = products.brand")
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
            .whereRaw("attributelistcode.id = s.attributes")
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
            .whereRaw("attributelistcode.id = s.attributes")
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
            .whereRaw("attributelistcode.id = s.attributes")
            .andWhereRaw("attributenames.id = ?", [attribute])
            .andWhereRaw("attributelistcode.company = ?", [company])
        : this.select(knex.raw("1"));
    })
    .groupBy(
      "products.name",
      "products.code",
      "s.id",
      "c.name",
      "product_accounting.purchaseprice",
      "transaction_details.taxrate",
      "provider",
      knex.raw(
        "(transaction_details.price - ((transaction_details.discount + transaction_details.ticketdiscount)/transaction_details.units * case when transactions.tickettype = 1 then (-1) else 1 end) - (transaction_details.bonuspay/transaction_details.units * case when transactions.tickettype = 1 then (-1) else 1 end))"
      ),
      "transactions.tickettype"
    )
    .orderBy("productname")
    .then((sales) => {
      const totalValue = { price: 0, units: 0 };
	  
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
	  
      sales.forEach((stock, idx) => {
        stock.productname += stock.attributescaption
          ? ", " + stock.attributescaption
          : "";
        stock.index = idx + 1;
        totalValue.price = totalValue.price + stock.price * stock.units;
        totalValue.units = totalValue.units + stock.units;
        
		
		//////05.10.2023
        //stock.buycurrency = "KZT";		
		stock.buycurrency = val;
		//////05.10.2023
		
      });

      //const finalStock = { index: 'Общий итог', price: totalValue.price, units: totalValue.units }
      //sales.push(finalStock);
      const merges = [
        //{ start: { row: sales.length + 1, column: 1 }, end: { row: sales.length + 1, column: 4 } }
      ];

      const report = excel.buildExport([
        // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
        {
          name: "Report", // <- Specify sheet name (optional)
          //heading: heading, // <- Raw heading array (optional)
          merges: merges, // <- Merge cell ranges
          specification: specificationcustom, // <- Report specification
          data: sales, // <-- Report data
        },
      ]);

      // You can then return this straight
      res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
      return res.send(report);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

// router.get("/cashbox/state", (req, res) => {
//   let company = req.userData.company;
//   if (company === "0") company = req.query.company;

//   knex("points")
//     .innerJoin("cashboxes", "cashboxes.point", "points.id")
//     .leftJoin("cashboxdiary", {
//       "cashboxdiary.cashbox": "cashboxes.id",
//       "points.company": "cashboxdiary.company",
//     })
//     .where({ "points.company": company, "cashboxes.deleted": false })
//     .andWhere("cashboxdiary.opercode", "<>", 6)
//     .andWhere(function () {
//       this.whereIn(
//         "cashboxdiary.operdate",
//         knex("cashboxdiary as d")
//           .leftJoin("cashboxes as c", "c.id", "d.cashbox")
//           .leftJoin("points as p", {
//             "p.id": "c.point",
//             "p.company": "d.company",
//           })
//           .where({ "d.company": company })
//           .whereIn("d.opercode", [3, 4])
//           .max("d.operdate")
//           .groupBy("c.id")
//       ).orWhereNull("cashboxdiary");
//     })
//     .distinct(
//       "cashboxes.id as id",
//       "cashboxes.name",
//       "cashboxdiary.operdate",
//       "points.name as point",
//       "cashboxdiary.person",
//       knex.raw(`case when cashboxdiary.opercode = 3 and cashboxdiary.operdate::date <> current_date then 'NOTCLOSED' 
// 			when cashboxdiary.opercode = 3 then 'OPEN' 
// 			when cashboxdiary.opercode = 4 then 'CLOSE' 
// 			else 'NOACTIVITY' end as state`)
//     )
//     //.orderBy('points.id')
//     //.orderBy('cashboxes.id')
//     .then((cashboxstate) => {
//       cashboxstate.forEach((cashbox) => {
//         cashbox.name = helpers.decrypt(cashbox.name);
//         cashbox.point = helpers.decrypt(cashbox.point);
//       });
//       return res.status(200).json(cashboxstate);
//     })
//     .catch((err) => {
//       return res.status(500).json(err);
//     });
// });

router.get("/cashbox/cashbox-operations", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const cashbox = req.query.cashbox;
  let company = req.userData.company;

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

const specificationtrans = {
  index: {
    displayName: "",
    headerStyle: styles.emptyCell,
    width: "6", // <- width in chars (when the number is passed as string)
  },
  date: {
    displayName: "Дата",
    headerStyle: styles.emptyCell,
    width: "20", // <- width in chars (when the number is passed as string)
  },
  paymenttype: {
    displayName: "Способ оплаты",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  tickettype: {
    displayName: "Тип операции",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  price: {
    displayName: "Общая сумма",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  cashboxuser: {
    displayName: "Кассир",
    headerStyle: styles.emptyCell,
    width: "40", // <- width in pixels
  },
};

router.get("/transactions/excel", (req, res) => {
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const point =
    typeof req.query.point !== "undefined" && req.query.point !== null
      ? req.query.point
      : "0";
  const client = req.query.client;
  const tokenCompany = req.userData.company;
  const company = req.query.company ? req.query.company : tokenCompany;
  const consignator =
    typeof req.query.consignator !== "undefined" &&
    req.query.consignator !== null
      ? req.query.consignator
      : "0";

  knex("transactions")
    .innerJoin("points", {
      "points.id": "transactions.point",
      "points.company": "transactions.company",
    })
    .innerJoin("cashboxes", "cashboxes.id", "transactions.cashbox")
    .innerJoin("cashbox_users", "cashbox_users.id", "transactions.cashboxuser")
    .leftJoin("cashbox_users as cons", "cons.id", "transactions.sellerid")
    .where({ "transactions.company": company /*, 'points.id': point*/ })
    .andWhereBetween(knex.raw("transactions.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .where((pt) => {
      client !== "jur"
        ? pt.where({ "transactions.customerid": "0" })
        : pt.andWhereNot({ "transactions.customerid": "0" /*consignator*/ });
      if (consignator !== "0") {
        pt.where({ "transactions.customerid": consignator });
      }
      if (point !== "0") {
        pt.where({ "points.id": point });
      }
    })
    .select(
      "transactions.id",
      "transactions.ticketid",
      knex.raw("to_char(transactions.date,'DD.MM.YYYY HH24:MI:SS') as date"),
      "transactions.price",
      knex.raw(
        `(transactions.discount + transactions.detailsdiscount) as discount`
      ),
      "transactions.cardpay",
      "transactions.cashpay",
      "transactions.debitpay",
      "transactions.bonuspay",
      "transactions.bonusadd",
      "cashboxes.name as cashbox",
      "cashbox_users.name as cashboxuser",
      knex.raw(
        "(case transactions.paymenttype when 'cash' then 'Наличный' when 'card' then 'Безналичный' when 'mixed' then 'Смешанный' when 'debt' then 'Долг' when 'debit' then 'Безналичный перевод' else 'Неопределенный' end) as paymenttype"
      ),
      knex.raw(
        "(case when transactions.tickettype = 0 then 'Продажа' else 'Возврат' end) as tickettype"
      ),
      "points.id as pointid",
      "points.name as pointname",
      knex.raw(`coalesce(cons.name,'') as consultant`)
    )
    .orderBy("transactions.date", "desc")
    .then((transactions) => {
      transactions.forEach((transaction, idx) => {
        transaction.pointname = helpers.decrypt(transaction.pointname);
        transaction.cashbox = helpers.decrypt(transaction.cashbox);
        transaction.index = idx + 1;
      });

      const merges = [
        //{ start: { row: transactions.length + 1, column: 1 }, end: { row: transactions.length + 1, column: 4 } }
      ];

      const report = excel.buildExport([
        // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
        {
          name: "Report", // <- Specify sheet name (optional)
          //heading: heading, // <- Raw heading array (optional)
          //merges: merges, // <- Merge cell ranges
          specification: specificationtrans, // <- Report specification
          data: transactions, // <-- Report data
        },
      ]);

      // You can then return this straight
      res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
      return res.send(report);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

/*
router.get("/grossprofit", (req, res) => {
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
      : "0";
  const nds =
    typeof req.query.nds !== "undefined" && req.query.nds !== null
      ? req.query.nds
      : "@";

  var conditions = { "stockdiary.company": company };
  if (point !== "0") conditions["pointset.point"] = point;
  if (barcode !== "") conditions["products.code"] = barcode;
  if (nds !== "@") conditions["products.taxid"] = nds;
  if (brand !== "@") conditions["products.brand"] = brand;
  if (category !== "@") conditions["products.category"] = category;

  var table = knex("stockdiary")
    .innerJoin("products", {
      "products.company": "stockdiary.company",
      "products.id": "stockdiary.product",
    })
    //.leftJoin("categories", {"categories.company": "products.company", "categories.id": "products.category"})
    .leftJoin(
      knex.raw(
        `categories on (categories.id = products.category and categories.company in (products.company,0))`
      )
    )
    .leftJoin("brands", { "products.brand": "brands.id" })
    .leftJoin("pointset", { "pointset.stock": "stockdiary.point" })
    .select(
      knex.raw("products.name as prod_name"),
      knex.raw("products.code as code"),
      knex.raw(
        "products.name || case when stockdiary.attributes <> 0 then ' | ' else '' end || array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockdiary.attributes),', ') as name"
      ),
      knex.raw("coalesce(categories.name,'Без категории') as category"),
      knex.raw("coalesce(brands.brand,'Бренд не указан') as brand"),
      //knex.raw(
      //  "sum(coalesce(((stockdiary.price-coalesce(stockdiary.purchaseprice,0)) * stockdiary.units),0)) as gross_profit"
      //),
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
      )
    )
    .groupBy(
      "products.name",
      "products.code",
      "stockdiary.attributes",
      "categories.name",
      "brands.brand",
      "nds"
    )
    .where(conditions)
    .whereIn("stockdiary.reason", [-1, 2])
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
      .then((grossprofit) => {
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

*/

/*
router.post("/grossprofit", (req, res) => {
	// return res.status(500).json("Отчет временно недоступен. Приносим извинения за неудобства");

  const dateFrom = moment(req.body.dateFrom);
  const dateTo = moment(req.body.dateTo);
  const point = req.body.point;
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
*/

/*
router.get("/grossprofit/stock", (req, res) => {

  const company = req.userData.company;
  const startdate = req.query.startdate;
  const enddate = req.query.enddate;
  const brand = req.query.brand;
  const category = req.query.category;
  const tax = req.query.tax;
  const attribute = req.query.attribute;
  const attrval = req.query.attrval;
  const point = req.query.point;
  const counterparty = req.query.counterparty;
  const barcode = req.query.barcode;

  let condition_join = "";
  let condition_where = "";
  if  (Number(req.query.attribute) !== -1) {
   condition_join = "inner join attrlist al on al.listcode = sp.attributes";
   condition_where = `and ((al.attribute = ${attribute} or ${attribute} = -1) and (al.value = '${attrval}' or '${attrval}' = '-1'))`;
  } 
  
  
  //,coalesce(sum(sn1.units),0) as dateTo_units
	//,coalesce(sum(sn2.units),0) as dateFrom_units
  
  
  //left join analytics.stockcurrent_part_snapshots sn1
	//on sn1.product = sp.product and sn1.company = sp.company and sn1.point = sp.point and sn1.snapdate = '${startdate}'::date
	//left join analytics.stockcurrent_part_snapshots sn2 
	//on sn2.product = sp.product and sn2.company = sp.company and sn2.point = sp.point and sn2.snapdate = '${enddate}'::date
  

  knex.raw(`select 
  sp."name" as prod_name,
	sp.code,
	sp.name || case when sp.attributes <> 0 then ' | '|| array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = sp.attributes),', ') else '' end as name,
	sp.category,
	sp.brand,
	sum(case when sp.price >= sp.purchaseprice then (sp.price-sp.purchaseprice)*sp.units else 0 end) as gross_profit,
	sum(sp.units) as units,
	sum(coalesce((sp.price * sp.units),0)) as salesamount,
	sum(coalesce((coalesce(sp.purchaseprice,0) * sp.units),0)) as cost,
	sp.tax as nds
  ,co.name as counterparty
  ,0 as dateto_units
  ,0 as datefrom_units
  from stockproduct sp
      left join pointset po
      on po.stock = sp.point
      ${condition_join}
      inner join counterparty2product c2p
			on c2p.product = sp.product and c2p.company = sp.company
			inner join counterparties co
			on c2p.counterparty = co.id and c2p.company = co.company

			where sp.company = ${company}
	
		and	sp."date" between '${startdate}'::date and '${enddate}'::date
	  and (po.point = ${point} or ${point} = -1)
	  and (sp.categoryid = ${category} or ${category} =-1)
		and (sp.brandid = ${brand}  or ${brand} = -1)
	  and (sp.taxid = ${tax} or ${tax} = -1) 
    and (c2p.counterparty = ${counterparty} or ${counterparty} = -1)
    and (sp.code = '${barcode}' or '${barcode}' = '')
    ${condition_where}
	group by sp."name", sp.code, sp.attributes,sp.category,sp.brand,sp.tax, co."name"
  order by prod_name
  `)
  .then((result) => {
    return res.status(200).json(result.rows);
  })
  .catch((err) => {
    console.log(err)
    return res.status(500).json(result);
  })
});
*/

module.exports = router;
