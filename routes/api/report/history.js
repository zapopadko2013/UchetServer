const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");

const router = new express.Router();

////13.09.2022
router.get("/invoicesnoformation", (req, res) => {
  const prodID = req.query.prodID ? req.query.prodID : 0;
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const invoicetype = req.query.invoicetype;
  const stockFrom =
    typeof req.query.stockFrom !== "undefined" && req.query.stockFrom !== null
      ? req.query.stockFrom
      : "0";
  const stockTo =
    typeof req.query.stockTo !== "undefined" && req.query.stockTo !== null
      ? req.query.stockTo
      : "0";

  const counterpartie =
    req.query.counterpartie !== "undefined" && req.query.counterpartie !== null
      ? req.query.counterpartie
      : "0";
  const consignator =
    req.query.consignator !== "undefined" && req.query.consignator !== null
      ? req.query.consignator
      : "0";

  let altinvoicetype;

  if (invoicetype === "16") {
    altinvoicetype = "0";
  } else if (invoicetype === "17") {
    altinvoicetype = "1";
  } else {
    altinvoicetype = "-1";
  }

  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  let stocks = [];

  if (stockFrom !== "0") stocks["invoices.stockfrom"] = stockFrom;
  if (stockTo !== "0") stocks["invoices.stockto"] = stockTo;
  if (counterpartie !== "0") stocks["invoices.counterparty"] = counterpartie;

  if (invoicetype !== "16" && invoicetype !== "17") {
    knex("invoices")
      .leftJoin("invoicelist as l", {
        "l.invoice": "invoices.invoicenumber",
        "l.company": "invoices.company",
      })
      .leftJoin("invoicetypes", "invoices.type", "invoicetypes.id")
      .leftJoin("points as p", {
        "p.id": "invoices.stockto",
        "p.company": "invoices.company",
      })
      .leftJoin("points as p1", {
        "p1.id": "invoices.stockfrom",
        "p1.company": "invoices.company",
      })
      .leftJoin("counterparties", {
        "counterparties.id": "invoices.counterparty",
        "counterparties.company": "invoices.company",
      })
      .innerJoin("erp_users", {
        "erp_users.id": "invoices.creator",
        "erp_users.company": "invoices.company",
      })
      .where({
        "invoices.company": company,
        "invoicetypes.id": invoicetype,
      })
      .andWhere(stocks)
      .andWhereBetween(knex.raw("invoices.invoicedate::date"), [
        dateFrom.format(),
        dateTo.format(),
      ])
      //если есть id товара подтянет только те инвойсы в которых этот товар фигурирует.
      .andWhere(
        knex.raw(`case when ${prodID}>0 then invoices.status not in ('CANCELED') 
                        and exists(
                                select 1 from invoicelist i
                                LEFT JOIN stockcurrent as s on s.id = i.stock and s.company = i.company
                                where i.invoice = invoices.invoicenumber and
                                i.company = invoices.company and
                                (i.stock = ${prodID} or s.product = ${prodID})
                        ) else invoices.status not in ('CANCELED') end`) //'FORMATION'
                              )
      
      .andWhere(
        knex.raw(` invoices.status not in ('FORMATION') `)
       )
      
      
      .select(
        "invoices.altnumber",
        "invoices.invoicenumber",
        "invoices.invoicedate",
        knex.raw(`case when invoices.status = upper('in_process') then 'Ожидает обработки от кассы' 
        when invoices.status = upper('accepted') then 'Принят на кассе'
        when invoices.status = upper('FORMATION') then 'Формирование'
        when invoices.status = upper('canceled') then 'Отменен'
        end as status`),
        "invoicetypes.name as invoicetype",
        "invoicetypes.id as invoicetypeid",
        "p.name as stockto",
        "p1.name as stockfrom",
        "p.point_type as stocktotype",
        "p1.point_type as stockfromtype",
        "counterparties.bin",
        "counterparties.name as counterparty",
        "erp_users.name as name",
        knex.raw("sum(coalesce(l.purchaseprice,0)*l.units) as purchaseprice"),
        knex.raw("sum(coalesce(l.newprice,0)*l.units) as newprice")
      )
      .groupBy(
        "invoices.altnumber",
        "invoices.invoicenumber",
        "invoices.invoicedate",
        "invoices.status",
        "invoicetypes.name",
        "invoicetypes.id",
        "p.name",
        "p1.name",
        "p.point_type",
        "p1.point_type",
        "counterparties.bin",
        "counterparties.name",
        "erp_users.name",
      )
      .orderBy("invoicetypes.id", "asc")
      .orderBy("invoices.invoicedate", "desc")
      .then((invoices) => {
        helpers.serverLog("invoices: ", invoices);
        invoices.forEach((invoice) => {
          invoice.name = helpers.decrypt(invoice.name);
          if (invoice.stocktotype !== 0) {
            if (invoice.stocktotype === 2) {
              invoice.stockto = `${helpers.decrypt(invoice.stockto)}`;
            } else {
              invoice.stockto = invoice.stockto.substring(
                0,
                invoice.stockto.length - 1
              );
              invoice.stockto = invoice.stockto.substring(13);
              invoice.stockto = `Склад точки "${helpers.decrypt(
                invoice.stockto
              )}"`;
            }
          }
          if (invoice.stockfromtype !== 0) {
            if (invoice.stockfromtype === 2) {
              invoice.stockfrom = `${helpers.decrypt(invoice.stockfrom)}`;
            } else {
              invoice.stockfrom = invoice.stockfrom.substring(
                0,
                invoice.stockfrom.length - 1
              );
              invoice.stockfrom = invoice.stockfrom.substring(13);
              invoice.stockfrom = `Склад точки "${helpers.decrypt(
                invoice.stockfrom
              )}"`;
            }
          }
        });

        return res.status(200).json(invoices);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  } else {
    knex
      .select(
        "i.altinvoice as altnumber",
        "i.invoicenumber as invoicenumber",
        "i.date as invoicedate",
        knex.raw("'ACCEPTED' as status"),
        "invoicetypes.name as invoicetype",
        "invoicetypes.id as invoicetypeid",
        "p.name as stockto",
        "p.name as stockfrom",
        "p.point_type as stocktotype",
        "p.point_type as stockfromtype",
        knex.raw("c.bin as bin"),
        knex.raw("c.name as counterparty"),
        "u.name as name",
        knex.raw("sum(l.totalprice) as purchaseprice"),
        knex.raw("sum(l.totalprice) as newprice")
      )
      .from("consignment_invoices as i")
      .leftJoin("consignment_invoicelist as l", {
        "l.company": "i.company",
        "i.invoicenumber": "l.invoice",
      })
      .innerJoin("customers as c", {
        "c.id": "i.customer",
        "c.company": "i.company",
      })
      .leftJoin("cashbox_users as u", { "u.id": "i.cashboxuser" })
      .leftJoin("invoicetypes", "invoicetypes.id", Number(invoicetype))
      .leftJoin("points as p", { "p.id": "i.point", "p.company": "i.company" })
      .where({
        "i.company": company,
        "i.type": altinvoicetype,
      })
      .where((pt) => {
        if (consignator !== "0") {
          pt.where({ "i.customer": consignator });
        }
      })
      .andWhereBetween(knex.raw("i.date::date"), [
        dateFrom.format(),
        dateTo.format(),
      ])
      .modify(function (queryBuilder) {
        //если есть id товара подтянет только те инвойсы в которых этот товар фигурирует.
        //(Делает почти тоже самое что и сверху для других типов накладных, но используя Knex синтаксис.)
        if (prodID) {
          queryBuilder.whereExists(function () {
            this.select()
              .from("consignment_invoicelist as cil")
              .leftJoin("stockcurrent as s", {
                "s.id": "cil.stockid",
                "s.company": "cil.company",
              })
              .whereRaw("?? = ??", ["cil.invoice", "i.invoicenumber"])
              .whereRaw("?? = ??", ["cil.company", "i.company"])
              .where(function () {
                this.where("cil.stockid", prodID).orWhere("s.product", prodID);
              });
          });
        }
      })
      .groupBy(
        "altnumber",
        "i.invoicenumber",
        "i.date",
        "status",
        "invoicetypes.name",
        "invoicetypes.id",
        "p.name",
        "p.name",
        "p.point_type",
        "p.point_type",
        "c.bin",
        "counterparty",
        "u.name"
      )
      .orderBy("invoicetypes.id", "asc")
      .orderBy("i.date", "desc")
      .then((invoices) => {
        helpers.serverLog("invoices: ", invoices);
        invoices.forEach((invoice) => {
          invoice.stockto = `${helpers.decrypt(invoice.stockto)}`;
          invoice.stockfrom = invoice.stockto;
        });

        return res.status(200).json(invoices);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  }
});
// SELECT l.units,l.newprice,l.purchaseprice,l.updateallprodprice,l.prodchanges,
//    case when i.type in (1,2) then p.name
//         else p2.name end,
//    case when i.type in (1,2) then p.code
//         else p2.code end,
//    case when i.type in (1,2) then p.cnofeacode
//         else p2.cnofeacode end,
//    case when i.type in (1,2) then p.taxid
//         else p2.taxid end,
//        array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = coalesce(s.attributes,s2.attributes)),', ') as attributes
//    FROM invoices i
//    LEFT JOIN invoicelist l on (l.invoice = i.invoicenumber)
//    LEFT JOIN stockcurrent s on (s.id = l.stockto)
//    LEFT JOIN products p on (p.id = s.product)
//    LEFT JOIN stockcurrent s2 on (s2.id = l.stock)
//    LEFT JOIN products p2 on (p2.id = s2.product)
//   WHERE i.invoicenumber = 465;

////13.09.2022

////13.09.2022
router.get("/invoices1", (req, res) => {
  const prodID = req.query.prodID ? req.query.prodID : 0;
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const invoicetype = req.query.invoicetype;
  const stockFrom =
    typeof req.query.stockFrom !== "undefined" && req.query.stockFrom !== null
      ? req.query.stockFrom
      : "0";
  const stockTo =
    typeof req.query.stockTo !== "undefined" && req.query.stockTo !== null
      ? req.query.stockTo
      : "0";

  const counterpartie =
    req.query.counterpartie !== "undefined" && req.query.counterpartie !== null
      ? req.query.counterpartie
      : "0";
  const consignator =
    req.query.consignator !== "undefined" && req.query.consignator !== null
      ? req.query.consignator
      : "0";

  let altinvoicetype;

  if (invoicetype === "16") {
    altinvoicetype = "0";
  } else if (invoicetype === "17") {
    altinvoicetype = "1";
  } else {
    altinvoicetype = "-1";
  }

  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  let stocks = [];

  if (stockFrom !== "0") stocks["invoices.stockfrom"] = stockFrom;
  if (stockTo !== "0") stocks["invoices.stockto"] = stockTo;
  if (counterpartie !== "0") stocks["invoices.counterparty"] = counterpartie;

  if (invoicetype !== "16" && invoicetype !== "17") {
    knex("invoices")
      .leftJoin("invoicelist as l", {
        "l.invoice": "invoices.invoicenumber",
        "l.company": "invoices.company",
      })
      .leftJoin("invoicetypes", "invoices.type", "invoicetypes.id")
      .leftJoin("points as p", {
        "p.id": "invoices.stockto",
        "p.company": "invoices.company",
      })
      .leftJoin("points as p1", {
        "p1.id": "invoices.stockfrom",
        "p1.company": "invoices.company",
      })
      .leftJoin("counterparties", {
        "counterparties.id": "invoices.counterparty",
        "counterparties.company": "invoices.company",
      })
      .innerJoin("erp_users", {
        "erp_users.id": "invoices.creator",
        "erp_users.company": "invoices.company",
      })
      .where({
        "invoices.company": company,
        "invoicetypes.id": invoicetype,
      })
      .andWhere(stocks)
      .andWhereBetween(knex.raw("invoices.invoicedate::date"), [
        dateFrom.format(),
        dateTo.format(),
      ])
      //если есть id товара подтянет только те инвойсы в которых этот товар фигурирует.
      .andWhere(
        knex.raw(`case when ${prodID}>0 then invoices.status not in ('CANCELED') 
                        and exists(
                                select 1 from invoicelist i
                                LEFT JOIN stockcurrent as s on s.id = i.stock and s.company = i.company
                                where i.invoice = invoices.invoicenumber and
                                i.company = invoices.company and
                                (i.stock = ${prodID} or s.product = ${prodID})
                        ) else invoices.status not in ('CANCELED') end`) //'FORMATION'
                              )
      
      .andWhere(
        knex.raw(` invoices.status not in ('FORMATION') `)
       )
      
      
      .select(
        "invoices.altnumber",
        "invoices.invoicenumber",
        "invoices.invoicedate",
        knex.raw(`case when invoices.status = upper('in_process') then 'Ожидает обработки от кассы' 
        when invoices.status = upper('accepted') then 'Принят на кассе'
        when invoices.status = upper('FORMATION') then 'Формирование'
        when invoices.status = upper('canceled') then 'Отменен'
        end as status`),
        "invoicetypes.name as invoicetype",
        "invoicetypes.id as invoicetypeid",
        "p.name as stockto",
        "p1.name as stockfrom",
        "p.point_type as stocktotype",
        "p1.point_type as stockfromtype",
        "counterparties.bin",
        "counterparties.name as counterparty",
        "erp_users.name as name",
        knex.raw("sum(coalesce(l.purchaseprice,0)*l.units) as purchaseprice"),
        knex.raw("sum(coalesce(l.newprice,0)*l.units) as newprice")
      )
      .groupBy(
        "invoices.altnumber",
        "invoices.invoicenumber",
        "invoices.invoicedate",
        "invoices.status",
        "invoicetypes.name",
        "invoicetypes.id",
        "p.name",
        "p1.name",
        "p.point_type",
        "p1.point_type",
        "counterparties.bin",
        "counterparties.name",
        "erp_users.name",
      )
      .orderBy("invoicetypes.id", "asc")
      .orderBy("invoices.invoicedate", "desc")
      .then((invoices) => {
        helpers.serverLog("invoices: ", invoices);
        invoices.forEach((invoice) => {
          invoice.name = helpers.decrypt(invoice.name);
          if (invoice.stocktotype !== 0) {
            if (invoice.stocktotype === 2) {
              invoice.stockto = `${helpers.decrypt(invoice.stockto)}`;
            } else {
              invoice.stockto = invoice.stockto.substring(
                0,
                invoice.stockto.length - 1
              );
              invoice.stockto = invoice.stockto.substring(13);
              invoice.stockto = `Склад точки "${helpers.decrypt(
                invoice.stockto
              )}"`;
            }
          }
          if (invoice.stockfromtype !== 0) {
            if (invoice.stockfromtype === 2) {
              invoice.stockfrom = `${helpers.decrypt(invoice.stockfrom)}`;
            } else {
              invoice.stockfrom = invoice.stockfrom.substring(
                0,
                invoice.stockfrom.length - 1
              );
              invoice.stockfrom = invoice.stockfrom.substring(13);
              invoice.stockfrom = `Склад точки "${helpers.decrypt(
                invoice.stockfrom
              )}"`;
            }
          }
        });

        return res.status(200).json(invoices);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  } else {
    knex
      .select(
        "i.altinvoice as altnumber",
        "i.invoicenumber as invoicenumber",
        "i.date as invoicedate",
        knex.raw("'ACCEPTED' as status"),
        "invoicetypes.name as invoicetype",
        "invoicetypes.id as invoicetypeid",
        "p.name as stockto",
        "p.name as stockfrom",
        "p.point_type as stocktotype",
        "p.point_type as stockfromtype",
        knex.raw("c.bin as bin"),
        knex.raw("c.name as counterparty"),
        "u.name as name",
        knex.raw("sum(l.totalprice) as purchaseprice"),
        knex.raw("sum(l.totalprice) as newprice")
      )
      .from("consignment_invoices as i")
      .leftJoin("consignment_invoicelist as l", {
        "l.company": "i.company",
        "i.invoicenumber": "l.invoice",
      })
      .innerJoin("customers as c", {
        "c.id": "i.customer",
        "c.company": "i.company",
      })
      .leftJoin("cashbox_users as u", { "u.id": "i.cashboxuser" })
      .leftJoin("invoicetypes", "invoicetypes.id", Number(invoicetype))
      .leftJoin("points as p", { "p.id": "i.point", "p.company": "i.company" })
      .where({
        "i.company": company,
        "i.type": altinvoicetype,
      })
      .where((pt) => {
        if (consignator !== "0") {
          pt.where({ "i.customer": consignator });
        }
      })
      .andWhereBetween(knex.raw("i.date::date"), [
        dateFrom.format(),
        dateTo.format(),
      ])
      .modify(function (queryBuilder) {
        //если есть id товара подтянет только те инвойсы в которых этот товар фигурирует.
        //(Делает почти тоже самое что и сверху для других типов накладных, но используя Knex синтаксис.)
        if (prodID) {
          queryBuilder.whereExists(function () {
            this.select()
              .from("consignment_invoicelist as cil")
              .leftJoin("stockcurrent as s", {
                "s.id": "cil.stockid",
                "s.company": "cil.company",
              })
              .whereRaw("?? = ??", ["cil.invoice", "i.invoicenumber"])
              .whereRaw("?? = ??", ["cil.company", "i.company"])
              .where(function () {
                this.where("cil.stockid", prodID).orWhere("s.product", prodID);
              });
          });
        }
      })
      .groupBy(
        "altnumber",
        "i.invoicenumber",
        "i.date",
        "status",
        "invoicetypes.name",
        "invoicetypes.id",
        "p.name",
        "p.name",
        "p.point_type",
        "p.point_type",
        "c.bin",
        "counterparty",
        "u.name"
      )
      .orderBy("invoicetypes.id", "asc")
      .orderBy("i.date", "desc")
      .then((invoices) => {
        helpers.serverLog("invoices: ", invoices);
        invoices.forEach((invoice) => {
          invoice.stockto = `${helpers.decrypt(invoice.stockto)}`;
          invoice.stockfrom = invoice.stockto;
        });

        return res.status(200).json(invoices);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  }
});
// SELECT l.units,l.newprice,l.purchaseprice,l.updateallprodprice,l.prodchanges,
//    case when i.type in (1,2) then p.name
//         else p2.name end,
//    case when i.type in (1,2) then p.code
//         else p2.code end,
//    case when i.type in (1,2) then p.cnofeacode
//         else p2.cnofeacode end,
//    case when i.type in (1,2) then p.taxid
//         else p2.taxid end,
//        array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = coalesce(s.attributes,s2.attributes)),', ') as attributes
//    FROM invoices i
//    LEFT JOIN invoicelist l on (l.invoice = i.invoicenumber)
//    LEFT JOIN stockcurrent s on (s.id = l.stockto)
//    LEFT JOIN products p on (p.id = s.product)
//    LEFT JOIN stockcurrent s2 on (s2.id = l.stock)
//    LEFT JOIN products p2 on (p2.id = s2.product)
//   WHERE i.invoicenumber = 465;

////13.09.2022


router.get("/invoices", (req, res) => {
  const prodID = req.query.prodID ? req.query.prodID : 0;
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const invoicetype = req.query.invoicetype;
  const stockFrom =
    typeof req.query.stockFrom !== "undefined" && req.query.stockFrom !== null
      ? req.query.stockFrom
      : "0";
  const stockTo =
    typeof req.query.stockTo !== "undefined" && req.query.stockTo !== null
      ? req.query.stockTo
      : "0";

  const counterpartie =
    req.query.counterpartie !== "undefined" && req.query.counterpartie !== null
      ? req.query.counterpartie
      : "0";
  const consignator =
    req.query.consignator !== "undefined" && req.query.consignator !== null
      ? req.query.consignator
      : "0";

  let altinvoicetype;

  if (invoicetype === "16") {
    altinvoicetype = "0";
  } else if (invoicetype === "17") {
    altinvoicetype = "1";
  } else {
    altinvoicetype = "-1";
  }

  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  let stocks = [];

  if (stockFrom !== "0") stocks["invoices.stockfrom"] = stockFrom;
  if (stockTo !== "0") stocks["invoices.stockto"] = stockTo;
  if (counterpartie !== "0") stocks["invoices.counterparty"] = counterpartie;

  if (invoicetype !== "16" && invoicetype !== "17") {
    knex("invoices")
      .leftJoin("invoicelist as l", {
        "l.invoice": "invoices.invoicenumber",
        "l.company": "invoices.company",
      })
      .leftJoin("invoicetypes", "invoices.type", "invoicetypes.id")
      .leftJoin("points as p", {
        "p.id": "invoices.stockto",
        "p.company": "invoices.company",
      })
      .leftJoin("points as p1", {
        "p1.id": "invoices.stockfrom",
        "p1.company": "invoices.company",
      })
      .leftJoin("counterparties", {
        "counterparties.id": "invoices.counterparty",
        "counterparties.company": "invoices.company",
      })
      .innerJoin("erp_users", {
        "erp_users.id": "invoices.creator",
        "erp_users.company": "invoices.company",
      })
      .where({
        "invoices.company": company,
        "invoicetypes.id": invoicetype,
      })
      .andWhere(stocks)
      .andWhereBetween(knex.raw("invoices.invoicedate::date"), [
        dateFrom.format(),
        dateTo.format(),
      ])
      //если есть id товара подтянет только те инвойсы в которых этот товар фигурирует.
      .andWhere(
        knex.raw(`case when ${prodID}>0 then invoices.status not in ('CANCELED') 
                        and exists(
                                select 1 from invoicelist i
                                LEFT JOIN stockcurrent as s on s.id = i.stock and s.company = i.company
                                where i.invoice = invoices.invoicenumber and
                                i.company = invoices.company and
                                (i.stock = ${prodID} or s.product = ${prodID})
                        ) else invoices.status not in ('CANCELED') end`) //'FORMATION'
                              )
      ////13.09.2022
      //.andWhere(
      //  knex.raw(` invoices.status not in ('FORMATION') `)
      // )
      ////13.09.2022 
      
      .select(
        "invoices.altnumber",
        "invoices.invoicenumber",
        "invoices.invoicedate",
        knex.raw(`case when invoices.status = upper('in_process') then 'Ожидает обработки от кассы' 
        when invoices.status = upper('accepted') then 'Принят на кассе'
        when invoices.status = upper('FORMATION') then 'Формирование'
        when invoices.status = upper('canceled') then 'Отменен'
        end as status`),
        "invoicetypes.name as invoicetype",
        "invoicetypes.id as invoicetypeid",
        "p.name as stockto",
        "p1.name as stockfrom",
        "p.point_type as stocktotype",
        "p1.point_type as stockfromtype",
        "counterparties.bin",
        "counterparties.name as counterparty",
        "erp_users.name as name",
        knex.raw("sum(coalesce(l.purchaseprice,0)*l.units) as purchaseprice"),
        knex.raw("sum(coalesce(l.newprice,0)*l.units) as newprice"),
        knex.raw("count(l.*) as quantity"), // 23.12.2022
        // 27.12.2022
        "p.id as pointto",
        "p1.id as pointfrom",
        "counterparties.id as counterpartyid" 
        // 27.12.2022
      )
      .groupBy(
        "invoices.altnumber",
        "invoices.invoicenumber",
        "invoices.invoicedate",
        "invoices.status",
        "invoicetypes.name",
        "invoicetypes.id",
        "p.name",
        "p1.name",
        "p.point_type",
        "p1.point_type",
        "counterparties.bin",
        "counterparties.name",
        "erp_users.name",
        // 27.12.2022
        "p.id",
        "p1.id",
        "counterparties.id"
        // 27.12.2022
      )
      .orderBy("invoicetypes.id", "asc")
      .orderBy("invoices.invoicedate", "desc")
      .then((invoices) => {
        helpers.serverLog("invoices: ", invoices);
        invoices.forEach((invoice) => {
          invoice.name = helpers.decrypt(invoice.name);
          if (invoice.stocktotype !== 0) {
            if (invoice.stocktotype === 2) {
              invoice.stockto = `${helpers.decrypt(invoice.stockto)}`;
            } else {
              invoice.stockto = invoice.stockto.substring(
                0,
                invoice.stockto.length - 1
              );
              invoice.stockto = invoice.stockto.substring(13);
              invoice.stockto = `Склад точки "${helpers.decrypt(
                invoice.stockto
              )}"`;
            }
          }
          if (invoice.stockfromtype !== 0) {
            if (invoice.stockfromtype === 2) {
              invoice.stockfrom = `${helpers.decrypt(invoice.stockfrom)}`;
            } else {
              invoice.stockfrom = invoice.stockfrom.substring(
                0,
                invoice.stockfrom.length - 1
              );
              invoice.stockfrom = invoice.stockfrom.substring(13);
              invoice.stockfrom = `Склад точки "${helpers.decrypt(
                invoice.stockfrom
              )}"`;
            }
          }
        });

        return res.status(200).json(invoices);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  } else {
    knex
      .select(
        "i.altinvoice as altnumber",
        "i.invoicenumber as invoicenumber",
        "i.date as invoicedate",
        knex.raw("'ACCEPTED' as status"),
        "invoicetypes.name as invoicetype",
        "invoicetypes.id as invoicetypeid",
        "p.name as stockto",
        "p.name as stockfrom",
        "p.point_type as stocktotype",
        "p.point_type as stockfromtype",
        knex.raw("c.bin as bin"),
        knex.raw("c.name as counterparty"),
        "u.name as name",
        knex.raw("sum(l.totalprice) as purchaseprice"),
        knex.raw("sum(l.totalprice) as newprice")
      )
      .from("consignment_invoices as i")
      .leftJoin("consignment_invoicelist as l", {
        "l.company": "i.company",
        "i.invoicenumber": "l.invoice",
      })
      .innerJoin("customers as c", {
        "c.id": "i.customer",
        "c.company": "i.company",
      })
      .leftJoin("cashbox_users as u", { "u.id": "i.cashboxuser" })
      .leftJoin("invoicetypes", "invoicetypes.id", Number(invoicetype))
      .leftJoin("points as p", { "p.id": "i.point", "p.company": "i.company" })
      .where({
        "i.company": company,
        "i.type": altinvoicetype,
      })
      .where((pt) => {
        if (consignator !== "0") {
          pt.where({ "i.customer": consignator });
        }
      })
      .andWhereBetween(knex.raw("i.date::date"), [
        dateFrom.format(),
        dateTo.format(),
      ])
      .modify(function (queryBuilder) {
        //если есть id товара подтянет только те инвойсы в которых этот товар фигурирует.
        //(Делает почти тоже самое что и сверху для других типов накладных, но используя Knex синтаксис.)
        if (prodID) {
          queryBuilder.whereExists(function () {
            this.select()
              .from("consignment_invoicelist as cil")
              .leftJoin("stockcurrent as s", {
                "s.id": "cil.stockid",
                "s.company": "cil.company",
              })
              .whereRaw("?? = ??", ["cil.invoice", "i.invoicenumber"])
              .whereRaw("?? = ??", ["cil.company", "i.company"])
              .where(function () {
                this.where("cil.stockid", prodID).orWhere("s.product", prodID);
              });
          });
        }
      })
      .groupBy(
        "altnumber",
        "i.invoicenumber",
        "i.date",
        "status",
        "invoicetypes.name",
        "invoicetypes.id",
        "p.name",
        "p.name",
        "p.point_type",
        "p.point_type",
        "c.bin",
        "counterparty",
        "u.name"
      )
      .orderBy("invoicetypes.id", "asc")
      .orderBy("i.date", "desc")
      .then((invoices) => {
        helpers.serverLog("invoices: ", invoices);
        invoices.forEach((invoice) => {
          invoice.stockto = `${helpers.decrypt(invoice.stockto)}`;
          invoice.stockfrom = invoice.stockto;
        });

        return res.status(200).json(invoices);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  }
});
// SELECT l.units,l.newprice,l.purchaseprice,l.updateallprodprice,l.prodchanges,
//    case when i.type in (1,2) then p.name
//         else p2.name end,
//    case when i.type in (1,2) then p.code
//         else p2.code end,
//    case when i.type in (1,2) then p.cnofeacode
//         else p2.cnofeacode end,
//    case when i.type in (1,2) then p.taxid
//         else p2.taxid end,
//        array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = coalesce(s.attributes,s2.attributes)),', ') as attributes
//    FROM invoices i
//    LEFT JOIN invoicelist l on (l.invoice = i.invoicenumber)
//    LEFT JOIN stockcurrent s on (s.id = l.stockto)
//    LEFT JOIN products p on (p.id = s.product)
//    LEFT JOIN stockcurrent s2 on (s2.id = l.stock)
//    LEFT JOIN products p2 on (p2.id = s2.product)
//   WHERE i.invoicenumber = 465;

router.get("/invoice/details", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  const invoicetype =
    typeof req.query.invoicetype !== "undefined" &&
      req.query.invoicetype !== null
      ? req.query.invoicetype
      : "0";

  if (invoicetype !== "16" && invoicetype !== "17") {    
    knex.raw(`
    SELECT
    "l"."units",
    "l"."newprice",
    "l"."oldprice",
    COALESCE("l"."wholesale_price",0) as wholesale_price,
    "l"."comments" AS "reason",
    "l"."purchaseprice",
    "l"."prodchanges",
    COALESCE ( "sp1"."price", "sp2"."price" ) AS "price",
    COALESCE ( "sp1"."pieceprice", "sp2"."pieceprice" ) AS "pieceprice",
    COALESCE ( p1."name", p2."name" ) AS "name",
    COALESCE ( p1.code, p2.code ) AS code,
    COALESCE ( b1.brand, b2.brand ) AS brand,
    COALESCE (l.newprice*l.units, 0) as price_total,
  CASE
      
      WHEN i."type" IN ( 1, 2 ) THEN
      p1.NAME ELSE p2.NAME 
    END,
  CASE
    
    WHEN i."type" IN ( 1, 2 ) THEN
    p1.code ELSE p2.code 
    END,
  CASE
    
    WHEN i."type" IN ( 1, 2 ) THEN
    p1.cnofeacode ELSE p2.cnofeacode 
    END,
  CASE
    
    WHEN i."type" IN ( 1, 2 ) THEN
    p1.taxid ELSE p2.taxid 
    END,
    array_to_string(
      ARRAY (
      SELECT
        n.
      VALUES
        || ': ' || "a".
      VALUE
        
      FROM
        attrlist "a"
        LEFT JOIN attributenames n ON ( n."id" = "a"."attribute" ) 
      WHERE
        "a".listcode = COALESCE ( s1."attributes", s2."attributes" ) 
        AND "a".company = COALESCE ( s1.company, s2.company ) 
      ),
      ', ' 
    ) AS attributesCaption 
	
	----13.01.2023 
	,(select sum(d.discount) from products p 
inner join stockcurrent s on (
s.product=p.id and
s.company=p.company)
left join discounts d on (
s.id=d."object" 
)
where 
p.code=COALESCE ( p1.code, p2.code )
and p.company ="i"."company"
AND d.expirationdate >= current_date
AND d.isactive is true) as discount
    ,
    COALESCE ( "sp1"."price", "sp2"."price" )-
    round((COALESCE ( "sp1"."price", "sp2"."price" )*
    (select sum(d.discount) from products p 
inner join stockcurrent s on (
s.product=p.id and
s.company=p.company)
left join discounts d on (
s.id=d."object" 
)
where 
p.code=COALESCE ( p1.code, p2.code )
and p.company ="i"."company"
AND d.expirationdate >= current_date
AND d.isactive is true) )/100) as sumdiscount
----13.01.2023 
	
  FROM
    "invoices" AS "i"
    LEFT JOIN "invoicelist" "l" ON ( "l"."invoice" = "i"."invoicenumber" AND "l"."company" = "i"."company" )
    LEFT JOIN "stockcurrent" "s1" ON "s1"."id" = "l"."stockto" 
    AND "s1"."company" = "l"."company"
    LEFT JOIN "products" "p1" ON ( "p1"."id" = "s1"."product" AND "p1"."company" = "s1"."company" )
    LEFT JOIN "brands" AS "b1" ON "b1"."id" = "p1"."brand"
    LEFT JOIN "stockcurrent" AS "s2" ON ( "s2"."id" = "l"."stock" AND "s2"."company" = "l"."company" )
    LEFT JOIN "storeprices" "sp1" ON ( "sp1"."stock" = "s1"."id" AND "sp1"."company" = "s1"."company" )
    LEFT JOIN "storeprices" "sp2" ON ( "sp2"."stock" = "s2"."id" AND "sp2"."company" = "s2"."company" )
    LEFT JOIN "products" AS "p2" ON "p2"."id" = "s2"."product" 
    AND "p2"."company" = "s2"."company"
    LEFT JOIN "brands" AS "b2" ON "b2"."id" = "p2"."brand" 
  WHERE
	"i"."invoicenumber" = ${req.query.invoicenumber}
		AND "i"."company" = ${company}
    `)
      .then((results) => {
        let details = results.rows;
        return res.status(200).json(details);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  } else {
    knex("consignment_invoicelist as l")
      .innerJoin("stockcurrent as s", {
        "s.id": "l.stockid",
        "s.company": "l.company",
      })
      .innerJoin("products as p", {
        "p.id": "s.product",
        "p.company": "s.company",
      })
      .where({ "l.invoice": req.query.invoicenumber, "l.company": company })
      .select(
        "l.units",
        "l.price",
        knex.raw("null as reason"),
        knex.raw("0 as purchaseprice"),
        knex.raw("null as prodchanges"),
        "p.name as name",
        "p.code as code",
        "p.cnofeacode as cnofeacode",
        "p.taxid as taxid",
        knex.raw(
          `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes and a.company = s.company),', ') as attributesCaption`
        )
      )
      .then((details) => {
        return res.status(200).json(details);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  }
});

module.exports = router;
