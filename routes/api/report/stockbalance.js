const express = require('express');
const knex = require('../../../db/knex');
const helpers = require('../../../middlewares/_helpers');
const moment = require('moment');

const excel = require("node-excel-export");

const router = new express.Router();

const styles = {
     emptyCell: {},
   };


router.post("/", async (req, res) => {
  const counterparty =
  typeof req.body.counterparty !== "undefined" &&
  req.body.counterparty !== null
    ? req.body.counterparty
    : "0";
const date = req.body.date;

/////22.08.2023
const del =
  typeof req.body.del !== "undefined" && req.body.del !== null
    ? req.body.del
    : false;
/////22.08.2023

const brand =
  typeof req.body.brand !== "undefined" && req.body.brand !== null
    ? req.body.brand
    : "@";
const attribute =
  typeof req.body.attribute !== "undefined" && req.body.attribute !== null
    ? req.body.attribute
    : "@";
const category =
  typeof req.body.category !== "undefined" && req.body.category !== null
    ? req.body.category
    : "@";
let company = req.userData.company;
const attrval =
  typeof req.body.attrval !== "undefined" && req.body.attrval !== null
    ? req.body.attrval
    : "";
const stockid =
  typeof req.body.stockID !== "undefined" && req.body.stockID !== null
    ? req.body.stockID
    : "0";
const notattr =
  typeof req.body.notattr !== "undefined" && req.body.notattr !== null
    ? req.body.notattr
    : "0";
const barcode =
  typeof req.body.barcode !== "undefined" && req.body.barcode !== null
    ? req.body.barcode
    : "0";
// 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
const piece =
  typeof req.body.piece !== "undefined" && req.body.piece !== null
    ? req.body.piece
    : "0";
const pieceinpack =
    typeof req.body.pieceinpack !== "undefined" && req.body.pieceinpack !== null
      ? req.body.pieceinpack
      : "0";
const pieceprice =
    typeof req.body.pieceprice !== "undefined" && req.body.pieceprice !== null
      ? req.body.pieceprice
      : "0";
const unitsprid =
      typeof req.body.unitsprid !== "undefined" && req.body.unitsprid !== null
        ? req.body.unitsprid
        : "0";      
// 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >    
const nds =
  typeof req.body.nds !== "undefined" && req.body.nds !== null
    ? req.body.nds
    : "@";
const itemsPerPage =
  typeof req.body.itemsPerPage !== "undefined" &&
  req.body.itemsPerPage !== null
    ? req.body.itemsPerPage
    : "50";
const pageNumber =
  typeof req.body.pageNumber !== "undefined" && req.body.pageNumber !== null
    ? req.body.pageNumber
    : "1";
const itemFrom = itemsPerPage * (pageNumber - 1);
const flag = req.body.flag;
//console.log("flag"+flag);
const consignment =
  typeof req.body.consignment !== "undefined" &&
  req.body.consignment !== null
    ? req.body.consignment == "true"
    : true; //Boolean(true)

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

if (company === "0" && req.body.company) {
  company = req.body.company;
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
  .groupBy("company", "point", "product", "attributes")
  .as("ss");

  
const consigsnap = knex("consignment_snapshots")
  .select(
    "consignment_snapshots.company as company",
    "consignment_snapshots.stockid as stockid",
    knex.raw("sum(consignment_snapshots.units) as units"),
    knex.raw(
      "sum(consignment_snapshots.purchaseprice * consignment_snapshots.units) as purchasetotal"
    ),
    knex.raw(
      "sum(consignment_snapshots.price * consignment_snapshots.units) as pricetotal"
    )
  )
  .where({ snapdate: date, company: company })
  .groupBy("company", "stockid")
  .as("consigsnap");


const consig = knex("consignment")
  .select(
    "consignment.company as company",
    "consignment.stockid as stockid",
    knex.raw("sum(consignment.units) as units"),
    knex.raw("sum(consignment.price * consignment.units) as pricetotal")
  )
  .where({ company: company })
  .andWhere("consignment.units", "<>", 0)
  .groupBy("company", "stockid")
  .as("consig");


var conditions = {
  "points.company": company,
  "points.status": "ACTIVE",
  "products.deleted": false,
};

/////22.08.2023
if (del=="true" || del==true)
 conditions = {
  "points.company": company,
  "points.status": "ACTIVE",
};
/////22.08.2023

if (barcode !== "") conditions["products.code"] = barcode;
if (stockid !== "0") conditions["points.id"] = stockid;
if (nds !== "@") conditions["products.taxid"] = nds;
if (brand !== "@") conditions["products.brand"] = brand;
//if (category !== "@") conditions["products.category"] = category;

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
    "products.company": "storeprices.company",
  })
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
  .andWhereRaw(
    `${
      category !== "@" && category.length > 0
        ? `products.category in (${category.map((c) => `'${c}'`).join(",")})`
        : ""
    }`
  ) // Для нескольких категорий

  .modify(function (params3) {
    if (date == today && consignment) {
      this.select(
        knex.raw("(stockcurrent.units + coalesce(consig.units,0)) as units")
      );
    } else if (date == today && !consignment) { 
      this.select(knex.raw("stockcurrent.units as units"));
    } else if (date != today && consignment) {
      this.select(knex.raw("ss.uni as units"));
    } else if (date != today && !consignment) {
      this.select(
        knex.raw("(ss.uni - coalesce(consigsnap.units,0)) as units")
      );
    }
  })
  
  
  .select(
    knex.raw("stockcurrent.company as company"),
    knex.raw("stockcurrent.product as product"),

    knex.raw(
      "coalesce(coalesce(consigsnap.units,consig.units),0) as consunits"
    ),
    knex.raw(
      "coalesce(coalesce(consigsnap.pricetotal,consig.pricetotal),0) as consprice"
    ),
    knex.raw("coalesce(consigsnap.purchasetotal,0) as conspurchase"),

    knex.raw("points.id as id"),
    "points.point_type as pointType",
    knex.raw("points.name as pointname"),
    knex.raw("products.name as productname"),
    knex.raw("products.code as code"),
    // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
    knex.raw("products.piece as piece"),
    knex.raw("products.pieceinpack as pieceinpack"),
    knex.raw("storeprices.pieceprice as pieceprice"),
    knex.raw("products.unitsprid as unitsprid"),
    // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
    knex.raw("storeprices.price as price"),
    knex.raw(
      "case " +
        notattr +
        " when 1 then array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') else '' end as attributescaption"
    ),
    knex.raw("categories.name as category"),
    knex.raw("brands.brand as brand"),
    knex.raw("stockcurrent.attributes as attributes"),
    knex.raw(
      "case when products.taxid = 0 then 'Без НДС' else 'С НДС' end as nds"
    ),
    knex.raw("coalesce(ss.totalcost,0) as totalcost"),
    knex.raw(
      "coalesce(ss.cost,0) as cost"
    )
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
  .orderBy("id")
  .as("bs");

if (notattr == "1") {
  var innerQuery = knex(baseQuery)
    .select(
      "bs.id",
      "bs.pointType",
      "bs.pointname",
      "bs.productname",
      "bs.code",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
      "bs.piece",
      "bs.pieceinpack",
      "bs.pieceprice",
      "bs.unitsprid",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
      "bs.brand",
       "bs.category",
      "bs.attributescaption",
      knex.raw("round(coalesce(bs.units,0)::numeric,3) as units"),
      "bs.nds"
    )
    .modify(function (params2) {
      if (date == today && consignment) {
        this.select(
		
		  //////24.08.2023
          /* knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
                                                   from stockcurrent_part as sp 
                                                        where sp.company = bs.company
                                                             and sp.point = bs.id
                                                             and sp.product = bs.product
                                                             and sp.attributes = bs.attributes),0)::numeric,2) as cost`) */
			knex.raw(`round(coalesce((select coalesce(sp.purchaseprice ,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023

															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2) as cost`)												 
		 //////24.08.2023 													 
															 
        );
      } else if (date == today && !consignment) {
        this.select(
		
		  //////24.08.2023
          /* knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
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
                                                                                                and sp2.attributes = sp.attributes)),0)::numeric,2) as cost`) */
	
/*	
	    knex.raw(`round(coalesce((select coalesce(avg(sp.purchaseprice),0)
                                                   from stockcurrent_part as sp 
                                                        where sp.company = bs.company
                                                             and sp.point = bs.id
                                                             and sp.product = bs.product
                                                             and sp.attributes = bs.attributes ),0)::numeric,2) - round(coalesce((select coalesce(avg(sp.purchaseprice),0) 
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
                                                                                                and sp2.attributes = sp.attributes ) ),0)::numeric,2) as cost`) 
*/		

knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`)
																						
		//////24.08.2023																						
																								
        );
      } else if (date != today && consignment) {
		  
        /////01.11.2023  
        //this.select(knex.raw(`round(bs.totalcost::numeric,2) as cost`));
		this.select(
		
		knex.raw(`round(coalesce((select coalesce(sp.purchaseprice ,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023
															   
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2) as cost`)
		
		);
		/////01.11.2023
		
		
      } else if (date != today && !consignment) {
		  
       /////01.11.2023  
        /*
		this.select(
          knex.raw(
            `round(bs.totalcost::numeric-bs.conspurchase::numeric,2) as cost`
          )
        );
		*/
		this.select(
          knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`)
        );
		/////01.11.2023
		
		
      }
    })
	
	
	
	
    .modify(function (params6) {
      if (consignment) {
        this.select(
          knex.raw(
            "round(coalesce(((bs.units - bs.consunits) * bs.price)+bs.consprice,0)::numeric,2) as price"
          )
        );
      } else {
        this.select(
          knex.raw(
            "round(coalesce(bs.units * bs.price,0)::numeric,2) as price"
          )
        );
      }
    })
    .as("iq");

  // Только для первой страницы
  if (flag) {
    // Расчет общего количества страниц
    p_count = await knex(innerQuery)
      
	  
	  //////24.08.2023
      /*
	  .count()
	  
	  .sum("(iq.cost * iq.units) as costtotal")
	  
      //.sum("iq.cost as costtotal")
	  //.sum(knex.raw(' iq.cost * iq.units as costtotal '))
	  //knex.raw( 'SUM(iq.cost * iq.units) AS costtotal' )
	  //.sum("iq.p1 as costtotal")
	  
      .sum("iq.price as pricetotal")
      .sum("iq.units as unitstotal")
	  */
	  ///////
	  
	  .select( 
	  knex.raw( 'count(*) as count' ) ,
	  knex.raw( 'SUM(iq.cost * iq.units) AS costtotal' ) ,
	  knex.raw( 'SUM(iq.price) AS pricetotal' ) ,
	  knex.raw( 'SUM(iq.units) AS unitstotal' ) 
	  )
	  .then((p_count) => {
		//////24.08.2023
    
    p_costtotal = p_count[0]["costtotal"];
    p_pricetotal = p_count[0]["pricetotal"];
    p_unitstotal = p_count[0]["unitstotal"];
    
	
	//////24.08.2023
	//p_count = Math.ceil(p_count[0]["count"] / itemsPerPage);
    p_count1 = Math.ceil(p_count[0]["count"] / itemsPerPage);
	//p_count1 = parseFloat(p_count[0]["count"]) / parseFloat(itemsPerPage);
	
	
	//////
	})
	//////
	//////24.08.2023
	
  }

  

  knex(innerQuery)
    .select(
      "id",
      "pointType",
      "pointname",
      "productname",
      "code",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
      "piece",
      "pieceinpack",
      "pieceprice",
      "unitsprid",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
      "brand",
      "category",
      "price",
      "attributescaption",
      "units",
      "nds",
      //"cost"
	  //////24.08.2023
	  knex.raw("cost * units as cost")
	  	  ,"cost as pricezak"
	  //,knex.raw("(case when units=0 then 0 else cost/units) as pricezak")  
	  //////24.08.2023
    )
    .orderBy("id")
    .orderBy("units", "desc")
    .limit(itemsPerPage)
    .offset(itemFrom)
    .then((stockbalance) => {
		
	  //////24.08.2023
	//  let itogcost=0.0;
  //////24.08.2023
		
      stockbalance.forEach((stock) => {
		  
		  //console.log(itogcost);
		 // console.log(stock.cost);
		  
         //////24.08.2023
		 // itogcost=itogcost+parseFloat(stock.cost);
		 //itogcost=itogcost+parseFloat(stock.cost)*parseFloat(stock.units);
		  //////24.08.2023
		  
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

      if (flag) {
        result = {
          
		  
		  //////24.08.2023	
          //totalCount: p_count,
          totalCount: p_count1,
		  //////24.08.2023
		  
		  //////24.08.2023
          totalcost: p_costtotal,
		  //totalcost: itogcost,
		  //////24.08.2023
		  
          totalprice: p_pricetotal,
          totalunits: p_unitstotal,
          data: stockbalance,
        };
      } else {
        result = { data: stockbalance };
      }
      return res.status(200).json(JSON.stringify(result));
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
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
      "bs.piece",
      "bs.pieceinpack",
      "bs.pieceprice",
      "bs.unitsprid",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
      "bs.brand",
      "bs.category",
      
      "bs.nds" ,
      knex.raw("round(sum(coalesce(bs.units,0))::numeric,3) as units")
    )
    //.sum('bs.units as units')
    .groupBy(
      "bs.id",
      "bs.pointType",
      "bs.pointname",
      "bs.productname",
      "bs.code",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
      "bs.piece",
      "bs.pieceinpack",
      "bs.pieceprice",
      "bs.unitsprid",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
      "bs.brand",
      "bs.category",
      "bs.nds",
      "bs.company",
      "bs.product"
    )
    .modify(function (params) {
      if (date == today && consignment) {
        this.select(
		
		//////24.08.2023
		/*
           knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
                                                   from stockcurrent_part as sp 
                                                        where sp.company = bs.company
                                                             and sp.point = bs.id
                                                             and sp.product = bs.product),0)::numeric,2) as cost`) 
															 */
															 
		knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                              
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2) as cost`)
															 
		//////24.08.2023
		
        );
      } else if (date == today && !consignment) {
        this.select(
		
		  //////24.08.2023
		  /*
           knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
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
                                                                                                and sp2.units > 0)),0)::numeric,2) as cost`) 
			*/
			/*
		knex.raw(`round(coalesce((select coalesce(avg(sp.purchaseprice),0)
                                                   from stockcurrent_part as sp 
                                                        where sp.company = bs.company
                                                             and sp.point = bs.id
                                                             and sp.product = bs.product ),0)::numeric,2) - round(coalesce((select coalesce(avg(sp.purchaseprice),0) 
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
                                                                                                and sp2.units > 0) ),0)::numeric,2) as cost`)	
			*/	

        knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`)
			
		//////24.08.2023																						
																								
        );
      } else if (date != today && consignment) {
		  
		  
        /////01.11.2023		 
        //this.select(knex.raw(`round(sum(bs.totalcost)::numeric,2) as cost`));
		 this.select(
		 knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
                                                               )
															   -------14.09.2023 
															   
                                                               limit 1),0)::numeric,2) as cost`)
		 );
		/////01.11.2023
		
		
      } else if (date != today && !consignment) {
		  
       /////01.11.2023  
        /*
		this.select(
          knex.raw(
            `round(sum(bs.totalcost)::numeric-sum(bs.conspurchase)::numeric,2) as cost`
          )
        );
		*/
		this.select(
          knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product                                                               
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`)
        );
		/////01.11.2023
		
		
      } 
    })
	
	
    .modify(function (params4) {
      if (consignment) {
        this.select(
          knex.raw(
            "round(coalesce(sum(((bs.units - bs.consunits) * bs.price)+bs.consprice),0)::numeric,2) as price"
          )
        );
      } else {
        this.select(
          knex.raw(
            "round(coalesce(sum(bs.units * bs.price),0)::numeric,2) as price"
          )
        );
      }
    })
    .as("iq");

  console.log(innerQuery.toSQL());

  // Только для первой страницы
  if (flag) {
    // Расчет общего количества страниц
    p_count = await knex(innerQuery)
	
	  //////24.08.2023
      /*
	  .count()
	  
	  .sum("(iq.cost * iq.units) as costtotal")
	  
      //.sum("iq.cost as costtotal")
	  //.sum(knex.raw(' iq.cost * iq.units as costtotal '))
	  //knex.raw( 'SUM(iq.cost * iq.units) AS costtotal' )
	  //.sum("iq.p1 as costtotal")
	  
      .sum("iq.price as pricetotal")
      .sum("iq.units as unitstotal")
	  */
	  ///////
	  
	  .select( 
	  knex.raw( 'count(*) as count' ) ,
	  knex.raw( 'SUM(iq.cost * iq.units) AS costtotal' ) ,
	  knex.raw( 'SUM(iq.price) AS pricetotal' ) ,
	  knex.raw( 'SUM(iq.units) AS unitstotal' ) 
	  )
	  .then((p_count) => {
		//////24.08.2023
	  
	  
	  console.log(p_count);
	  console.log(itemsPerPage);
	  console.log(p_count[0]["count"]);
	  
    //console.log('Count: ' + p_count[0]['count']);
    p_costtotal = p_count[0]["costtotal"];
    p_pricetotal = p_count[0]["pricetotal"];
    p_unitstotal = p_count[0]["unitstotal"];
	
	//////24.08.2023
	//p_count = Math.ceil(p_count[0]["count"] / itemsPerPage);
    p_count1 = Math.ceil(p_count[0]["count"] / itemsPerPage);
	//p_count1 = parseFloat(p_count[0]["count"]) / parseFloat(itemsPerPage);
	
	
	//////
	})
	//////
	//////24.08.2023
	
  }
  
  //console.log(p_count.toSQL());

  knex(innerQuery)
    .select(
      "id",
      "pointType",
      "pointname",
      "productname",
      "code",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
      "piece",
      "pieceinpack",
      "pieceprice",
      "unitsprid",
      // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
      "brand",
      "category",
      "price",
      "units",
      "nds",
      //"cost"
	  
	  //////24.08.2023
	  knex.raw("cost * units as cost")
	  ,"cost as pricezak"
	  //,knex.raw("(case when units=0 then 0 else cost/units) as pricezak")  
	  //////24.08.2023
	 
    )
    .orderBy("id")
    .orderBy("units", "desc")
    .limit(itemsPerPage)
    .offset(itemFrom)
    .then((stockbalance) => {
		
	   //////24.08.2023
	 // let itogcost=0.0;
  //////24.08.2023	
		
      stockbalance.forEach((stock) => {
		  
		 // console.log(itogcost);
		  //console.log(stock.cost);
		  
		 //////24.08.2023
		 //itogcost=itogcost+parseFloat(stock.cost);
		  //itogcost=itogcost+parseFloat(stock.cost)*parseFloat(stock.units);
		  //////24.08.2023  
		  
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

      if (flag) {
        result = {
			
		  //////24.08.2023	
          //totalCount: p_count,
          totalCount: p_count1,
		  //////24.08.2023
		  
		  //////24.08.2023
          totalcost: p_costtotal,
		  //totalcost: itogcost,
		  //////24.08.2023
		  
          totalprice: p_pricetotal,
          totalunits: p_unitstotal,
          data: stockbalance,
        };
      } else {
        result = { data: stockbalance };
      }
      return res.status(200).json(JSON.stringify(result));
    })
    .catch((err) => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
}
});

router.get("/alexandro", (req, res) => {
     knex("points")
       .innerJoin("stockcurrent", "stockcurrent.point", "points.id")
       .innerJoin("storeprices", "storeprices.stock", "stockcurrent.id")
       .innerJoin("products", "products.id", "stockcurrent.product")
       .where({ "points.id": req.query.stockID })
       .orderBy("products.name")
       .select(
         "stockcurrent.id as stockcurrentid",
         "products.name as productname",
         "products.code",
         "stockcurrent.units",
         "storeprices.price",
         knex.raw(
           "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributescaption"
         )
       )
       .then((stockbalance) => {
         return res.status(200).json(stockbalance);
       })
       .catch((err) => {
         return res.status(500).json(err);
       });
   });

   
   router.get("/excel", async (req, res) => {
     const counterparty =
       typeof req.query.counterparty !== "undefined" &&
       req.query.counterparty !== null
         ? req.query.counterparty
         : "0";
		 
	 ////////02.11.2023
      let date = req.query.date; 
      if (req.query.date.indexOf('T')>-1) {
         date=req.query.date.substring(0, req.query.date.indexOf('T'));    
      }
		 
     //const date = req.query.date;	 
	 ////////02.11.2023	 
		 
     
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
    // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
     const piece =
        typeof req.body.piece !== "undefined" && req.body.piece !== null
          ? req.body.piece
          : "0";
     const pieceinpack =
        typeof req.body.pieceinpack !== "undefined" && req.body.pieceinpack !== null
          ? req.body.pieceinpack
          : "0";
     const pieceprice =
        typeof req.body.pieceprice !== "undefined" && req.body.pieceprice !== null
            ? req.body.pieceprice
            : "0";
     const unitsprid =
        typeof req.body.unitsprid !== "undefined" && req.body.unitsprid !== null
            ? req.body.unitsprid
            : "0";     
    // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
     const nds =
       typeof req.query.nds !== "undefined" && req.query.nds !== null
         ? req.query.nds
         : "@";
     const consignment = typeof req.query.consignment !== "undefined" && req.query.consignment !== null ? Boolean(req.query.consignment) : Boolean(true);
   
        /////22.08.2023
const del =
  typeof req.query.del !== "undefined" && req.query.del !== null
    ? req.query.del
    : false;
/////22.08.2023
   
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
	   
	   /////24.08.2023
	   pricezak: {
         displayName: "Цена закупа",
         headerStyle: styles.emptyCell,
         width: "20", // <- width in chars (when the number is passed as string)
       },
	   /////24.08.2023
	   
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
       // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
       piece: {
        displayName: "Продажа поштучно",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       pieceinpack: {
        displayName: "Штук в упаковке",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       pieceprice: {
        displayName: "Цена за штуку",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       unitsprid: {
        displayName: "Ед. измерения",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
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
	 
	  /////22.08.2023
if (del=="true" || del==true)
 conditions = {
  "points.company": company,
  "points.status": "ACTIVE"
};
/////22.08.2023
   
     if (barcode !== "") conditions["products.code"] = barcode;
     if (stockid !== "0") conditions["points.id"] = stockid;
     if (nds !== "@") conditions["products.taxid"] = nds;
     if (brand !== "@") conditions["products.brand"] = brand;
     //if (category !== "@") conditions["products.category"] = category;
   
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
       .andWhereRaw(
        `${
          category !== "@" && category.length > 0
            ? `products.category in (${category.map((c) => `'${c}'`).join(",")})`
            : ""
        }`
      ) // Для нескольких категорий
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
         // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
         knex.raw("case when products.piece is true then 'Да' else 'Нет' end as piece"),
         knex.raw("products.pieceinpack as pieceinpack"),
         knex.raw("storeprices.pieceprice as pieceprice"),
         knex.raw("products.unitsprid as unitsprid"),
         // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
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
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
           "bs.piece",
           "bs.pieceinpack",
           "bs.pieceprice",
           "bs.unitsprid",
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
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
             this.select(
			 
			//////24.08.2023
			
			  knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                                limit 1 ),0)::numeric,2) as cost`)); 
															   
				
            /* 				
			knex.raw(`round(coalesce((select coalesce(max(sp.purchaseprice * sp.units),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               ),0)::numeric,2) as cost`));	
            */														   
			//////24.08.2023												   
			 												   
															   
           } else if (date == today && !consignment) {
             this.select(
			 
			 //////24.08.2023
			 
			 knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`));
			 /*
			 knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               limit 1),0)::numeric,2) - round(coalesce((select coalesce(avg(sp.purchaseprice),0) 
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
                                                                                                  and sp.attributes = bs.attributes
                                                                                                  limit 1)),0)::numeric,2) as cost`));
			*/																					               
																								  
			 /*
			  knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               limit 1 ),0)::numeric,2)  as cost`)); 
															   */
			
			/*
			knex.raw(`round(coalesce((select coalesce(max(sp.purchaseprice * sp.units),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               limit 1),0)::numeric,2) - round(coalesce((select coalesce(min(sp.purchaseprice)*bs.consunits,0) 
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
                                                                                                  and sp.attributes = bs.attributes
                                                                                                  ) limit 1),0)::numeric,2) as cost`));																					  
			*/																					  
			//////24.08.2023																					  
																								  
           } else if (date != today && consignment){
			   
			   
               /////01.11.2023
               //this.select(knex.raw(`round(bs.totalcost::numeric,2) as cost`));	
			   this.select(
			   knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                                limit 1 ),0)::numeric,2) as cost`)
			   );	
			   /////01.11.2023	
			   
			   
             } else if (date != today && !consignment) {
              

			  /////01.11.2023 
               //this.select(knex.raw(`round(bs.totalcost::numeric-bs.conspurchase::numeric,2) as cost`));
               this.select(
			   knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`)
			   );
               /////01.11.2023 
			  
			  
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
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
           "piece",
           "pieceinpack",
           "pieceprice",
           "unitsprid",
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
           "brand",
           "category",
           "price",
           "price_total",
           "attributescaption",
           "units",
           "nds",
           //"cost"
		   //////24.08.2023
		   knex.raw("round(coalesce(cost * units ,0)::numeric,2) as cost")
		   ,"cost as pricezak"
	  //,knex.raw("(case when units=0 then 0 else cost/units) as pricezak")  
	  //////24.08.2023
		   
         ) //.limit(itemsPerPage).offset(itemFrom)
         .then((stockbalance) => {
			 
			//////24.08.2023
	  let itogcost=0;
  //////24.08.2023 
			 
           stockbalance.forEach((stock) => {
			   
			   //////24.08.2023
		  itogcost=itogcost+parseFloat(stock.cost);
		  //itogcost=itogcost+parseFloat(stock.cost)*parseFloat(stock.units);
		  //////24.08.2023 
			   
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
             
			 
			 //////24.08.2023
          //cost: p_costtotal,
		  cost: itogcost,
		  //////24.08.2023
			 
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
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
           "bs.piece",
           "bs.pieceinpack",
           "bs.pieceprice",
           "bs.unitsprid",
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
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
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
           "bs.piece",
           "bs.pieceinpack",
           "bs.pieceprice",
           "bs.unitsprid",
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
           "bs.brand",
           "bs.price",
           "bs.category",
           "bs.nds",
           "bs.company",
           "bs.product"
         )
         .modify(function (params) {
              if (date == today && consignment) {
             this.select(
			 
			 //////24.08.2023
			  /*
			  knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               limit 1),0)::numeric,2) as cost`)); 
				*/											   
															   
			knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2) as cost`));	
															   
			//////24.08.2023												   
															   
           } else if (date == today && !consignment) {
             this.select(
			 
			 //////24.08.2023
			 /*
			  knex.raw(`round(coalesce((select coalesce(sum(sp.purchaseprice * sp.units),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               limit 1),0)::numeric,2) - round(coalesce((select coalesce(min(sp.purchaseprice)*sum(bs.consunits),0) 
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
																								  */
			
			
			/*
			knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               limit 1),0)::numeric,2)  as cost`));
															   */
			/*												   
            knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               and sp.attributes = bs.attributes
                                                               limit 1),0)::numeric,2) - round(coalesce((select coalesce(avg(sp.purchaseprice),0) 
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
                                                                                                  and sp.attributes = bs.attributes
                                                                                                  limit 1)),0)::numeric,2) as cost`));
            */		

            knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`)); 
			
			//////24.08.2023																					  
																								  
           } else if (date != today && consignment){
			   
              /////01.11.2023			   
               //this.select(knex.raw(`round(sum(bs.totalcost)::numeric,2) as cost`));
               this.select(
			   knex.raw(`round(coalesce((select coalesce((sp.purchaseprice),0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
															   
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2) as cost`)
			   ); 
               /////01.11.2023
			   
			   
             } else if (date != today && !consignment) {
				 
               /////01.11.2023 				 
               //this.select(knex.raw(`round(sum(bs.totalcost)::numeric-sum(bs.conspurchase)::numeric,2) as cost`));	
			   this.select(
			   knex.raw(`round(coalesce((select coalesce(sp.purchaseprice,0)
                                                     from stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
															   -------14.09.2023
															   and  sp.id in 
                                                               (
                                                               select max(id) from 
                                                                  stockcurrent_part as sp 
                                                          where sp.company = bs.company
                                                               and sp.point = bs.id
                                                               and sp.product = bs.product
                                                               
                                                               )
															   -------14.09.2023
															   
                                                               limit 1),0)::numeric,2)  as cost`)
			   );
			   /////01.11.2023
			   
			   
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
		 
		 console.log(innerQuery.toSQL());
   
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
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
           "piece",
           "pieceinpack",
           "pieceprice",
           "unitsprid",
           // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) >
           "brand",
           "category",
           "price",
           "price_total",
           "units",
           "nds",
           //"cost"
		   
		   //////24.08.2023
		   knex.raw("round(coalesce(cost * units ,0)::numeric,2) as cost")
		   ,"cost as pricezak"
	  //,knex.raw("(case when units=0 then 0 else cost/units) as pricezak")  
	  //////24.08.2023
		   
         ) //.limit(itemsPerPage).offset(itemFrom)
         .then((stockbalance) => {
			 
			//////24.08.2023
	  let itogcost=0;
  //////24.08.2023 
			 
           stockbalance.forEach((stock) => {
			   
			  //////24.08.2023
		  itogcost=itogcost+parseFloat(stock.cost);
		  //itogcost=itogcost+parseFloat(stock.cost)*parseFloat(stock.units);
		  //////24.08.2023  
			   
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
             
			 
			  //////24.08.2023
          //cost: p_costtotal,
		  cost: itogcost,
		  //////24.08.2023
			 
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
   
   
   ///////05.09.2023
   
   router.get("/invoiceexcel", (req, res) => {
	   
	    let company = req.userData.company;
		
		const p1 = typeof req.query.point !== "undefined" && req.query.point !== null 
        ? ` and p.id=${req.query.point}`
		: "";
		
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
	   
	   const specification = {
       name: {
         displayName: "Category",
         headerStyle: styles.emptyCell,
         width: "30", // <- width in chars (when the number is passed as string)
       },
       productname: {
         displayName: "Name",
         headerStyle: styles.emptyCell,
         width: "50", // <- width in chars (when the number is passed as string)
       },
       code: {
         displayName: "Code",
         headerStyle: styles.emptyCell,
         width: "15", // <- width in chars (when the number is passed as string)
       },
       purchaseprice: {
         displayName: "PriceBuy",
         headerStyle: styles.emptyCell,
         width: "20", // <- width in chars (when the number is passed as string)
       },
	   
	   
	   price: {
         displayName: "PriceSell",
         headerStyle: styles.emptyCell,
         width: "20", // <- width in chars (when the number is passed as string)
       },
	   	   
       units: {
        displayName: "Units",
        headerStyle: styles.emptyCell,
        width: "15", // <- width in chars (when the number is passed as string)
      },
       brand: {
         displayName: "Brand",
         headerStyle: styles.emptyCell,
         width: "27", // <- width in chars (when the number is passed as string)
       },
       nds: {
         displayName: "Nds",
         headerStyle: styles.emptyCell,
         width: "13", // <- width in chars (when the number is passed as string)
       },
       
       Cnofeacode: {
         displayName: "Cnofeacode",
         headerStyle: styles.emptyCell,
         width: "10", // <- width in chars (when the number is passed as string)
       },
       // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
       piece: {
        displayName: "Piece",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       pieceinpack: {
        displayName: "PieceInPack",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       unitsprid: {
        displayName: "Unitsprid",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       
     };
	 
	 
	 knex.raw(`
	 
	 
	 select
distinct

c."name" ,
ws.productname,
ws.code,
pa.purchaseprice,
sp.price,
ws.units ,
b.brand,
case when ws.taxid = 0 then 'нет' else 'да' end as nds,
ws.Cnofeacode,
ws.piece,
ws.pieceinpack,
ws.unitsprid
					
				
FROM (
          select sum(s.units) as units, max(s.id) as sid, 
            p.id, s.point as point_id, p.category as category_id, p.brand as brand_id,
            p.brand, p."name" as productname, p.code, p.taxid, s.company
         
            ,case when p.piece is true then 'да' else 'нет' end as piece,
         p.pieceinpack as pieceinpack,
        --p.pieceprice as pieceprice,
         p.unitsprid as unitsprid,
         p.Cnofeacode
          from stockcurrent s
            join products p on p.id = s.product and p.deleted = false            
          where s.units <> 0
            GROUP BY p.id, s.point, p.category, p.brand, p."name", p.code, p.taxid, s.company
        ) ws
        join points p on p.id = ws.point_id and p.status = 'ACTIVE'
        join categories c on c.id = ws.category_id and c.deleted = false
        join brands b on b."id" = ws.brand
        join storeprices sp on sp.stock = ws.sid
        join product_accounting pa on pa.company = ${company} and pa.product = ws.id and pa.id in (
          select max(id) from product_accounting where company = ${company} and product = ws.id
        ) 
        left join "products_barcode" on ws."id" = "products_barcode"."product" and ws."company"="products_barcode"."company"
		 WHERE ws.company = ${company}
		 ${p1}
	 
	 
      
    `).then((stockbalance) => {
      //let stockbalance = result.rows.slice();
	  
	  //let data = result.rows.slice();
      
      //return res.status(200).json(data)
	  
	  
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
         helper.serverLog(err);
         return res.status(500).json(err);
       });
	   
   });	   
   
   
   router.post("/invoiceexcel1", (req, res) => {
	   
	   
		
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
	   
	   const specification = {
       name: {
         displayName: "Category",
         headerStyle: styles.emptyCell,
         width: "30", // <- width in chars (when the number is passed as string)
       },
       productname: {
         displayName: "Name",
         headerStyle: styles.emptyCell,
         width: "50", // <- width in chars (when the number is passed as string)
       },
       code: {
         displayName: "Code",
         headerStyle: styles.emptyCell,
         width: "15", // <- width in chars (when the number is passed as string)
       },
       purchaseprice: {
         displayName: "PriceBuy",
         headerStyle: styles.emptyCell,
         width: "20", // <- width in chars (when the number is passed as string)
       },
	   
	   
	   price: {
         displayName: "PriceSell",
         headerStyle: styles.emptyCell,
         width: "20", // <- width in chars (when the number is passed as string)
       },
	   	   
       units: {
        displayName: "Units",
        headerStyle: styles.emptyCell,
        width: "15", // <- width in chars (when the number is passed as string)
      },
       brand: {
         displayName: "Brand",
         headerStyle: styles.emptyCell,
         width: "27", // <- width in chars (when the number is passed as string)
       },
       nds: {
         displayName: "Nds",
         headerStyle: styles.emptyCell,
         width: "13", // <- width in chars (when the number is passed as string)
       },
       
       Cnofeacode: {
         displayName: "Cnofeacode",
         headerStyle: styles.emptyCell,
         width: "10", // <- width in chars (when the number is passed as string)
       },
       // 20230817 by AB add products.piece to report (download to later enable upload to transfer all product info ) <
       piece: {
        displayName: "Piece",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       pieceinpack: {
        displayName: "PieceInPack",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       unitsprid: {
        displayName: "Unitsprid",
        headerStyle: styles.emptyCell,
        width: "10", // <- width in chars (when the number is passed as string)
       },
       
     };
	 
	 
	
	  
	  
	  const report = excel.buildExport([
             // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
             {
               name: "Report", // <- Specify sheet name (optional)
               //heading: heading, // <- Raw heading array (optional)
               //merges: merges, // <- Merge cell ranges
               specification: specification, // <- Report specification
               data: req.body.data, // <-- Report data
             },
           ]);
   
           // You can then return this straight
           res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
           return res.send(report);
	   	   
		   
	
	   
   });	   
   
   ///////05.09.2023
   
   
   router.get("/product", (req, res) => {
     const where = {};
     const barcode = req.query.barcode;
     const stockID = req.query.stockID;
   
     let company = req.userData.company;
     if (company === "15" && req.query.company) company = req.query.company;
   
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
     }, //,
     //currstockid:{
     //	displayName: 'stickid',
     //	headerStyle: styles.emptyCell,
     //	width: '11' // <- width in pixels
     //}
   };
   
   router.get("/excelpurebeauty", (req, res) => {
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
   
   router.get("/excelpurebeauty_sold", (req, res) => {
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
     const company = req.userData.company;
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
           ? pt.where({
               "points.id": point,
               "points.company": req.userData.company,
             })
           : pt.where({ "points.company": req.userData.company });
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
           "(transaction_details.price - ((transaction_details.discount+transaction_details.ticketdiscount)/transaction_details.units) - transaction_details.bonuspay/transaction_details.units) * case when transactions.tickettype = 1 then (-1) else 1 end as price"
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
           "(transaction_details.price - ((transaction_details.discount + transaction_details.ticketdiscount)/transaction_details.units) - (transaction_details.bonuspay/transaction_details.units))"
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
         helper.serverLog(err);
         return res.status(500).json(err);
       });
   });
   
   router.post("/simple", (req, res) => {
    
	
/////15.09.2023   
	/*
	const barcode =
      typeof req.body.barcode !== "undefined" && req.body.barcode !== null 
	    ? req.body.barcode
        : "";
    */
	
	    
	const barcode =
      typeof req.body.barcode !== "undefined" && req.body.barcode !== null && req.body.barcode !== ""
        ? ` and   (ws.code='${req.body.barcode}' or "products_barcode"."barcode"='${req.body.barcode}')`
        : "";
    
		
	/////15.09.2023 		
		
    const brand =
      typeof req.body.brand !== "undefined" && req.body.brand !== null && req.body.brand !== "@"
        ? req.body.brand
        : "";
    const counterparty =
      typeof req.body.counterparty !== "undefined" && req.body.counterparty !== null && req.body.counterparty !== "0"
        ? req.body.counterparty
        : "";
    const category =
      typeof req.body.category !== "undefined" && req.body.category !== null && req.body.category !== "@"
        ? req.body.category
        : "";
    const stockid =
      typeof req.body.stockID !== "undefined" && req.body.stockID !== null && req.body.stockID !== "0"
        ? req.body.stockID
        : "";
  
    const company = req.body.company || req.userData.company;
	
	//////27.07.2023
	
		
	/////15.09.2023
	/*
	const p1 = typeof req.body.counterparty !== "undefined" && req.body.counterparty !== null && req.body.counterparty !== "0"
        ? ` and c2p.counterparty=${req.body.counterparty}`
		: "";
    */	
	const p1 = typeof req.body.counterparty !== "undefined" && req.body.counterparty !== null && req.body.counterparty !== "0"
        ? ` and exists (select 1 from counterparty2product c2p where c2p.company = ws.company and c2p.product = ws.id and c2p.counterparty=${req.body.counterparty})`
		: "";
	/////15.09.2023		
		
        //: "and cp.id=(select max(c2p.counterparty) from counterparty2product c2p where c2p.company = ws.company and c2p.product = ws.id)";
	const p2 = typeof req.body.counterparty !== "undefined" && req.body.counterparty !== null && req.body.counterparty !== "0"
        ? ` ${req.body.counterparty}`
		: "select max(c2p.counterparty) from counterparty2product c2p where c2p.company = ws.company and c2p.product = ws.id";
	
	//////27.07.2023
  
    knex.raw(`
    SELECT distinct ws.units, ws.category_id, ws.code, ws.productname, c."name" as category, b.brand, sp.pieceprice, 
    pa.purchaseprice, sp.price, p."name" as pointname, case when ws.taxid = 0 then 'Без НДС' else 'С НДС' end as nds,

    -----27.07.2023
    --(select cp.name from counterparties cp 
    --  where cp.id in (select max(c2p.counterparty) from counterparty2product c2p where c2p.company = ws.company and c2p.product = ws.id))as counterparty,
--cp.name as counterparty,
(
      select max(cp.name) from counterparties cp 
       where cp.id in 
       (
       ${p2}
       )
      ) as counterparty,
    -----27.07.2023	
  
      coalesce(sp.wholesale_price,0) as wholesale_price 
  FROM (
      select sum(s.units) as units, max(s.id) as sid, 
        p.id, s.point as point_id, p.category as category_id, p.brand as brand_id,
        p.brand, p."name" as productname, p.code, p.taxid, s.company
      from stockcurrent s
        join products p on p.id = s.product and p.deleted = false            
      where s.units <> 0
        GROUP BY p.id, s.point, p.category, p.brand, p."name", p.code, p.taxid, s.company
    ) ws
    join points p on p.id = ws.point_id and p.status = 'ACTIVE'
    join categories c on c.id = ws.category_id and c.deleted = false
    join brands b on b."id" = ws.brand
    join storeprices sp on sp.stock = ws.sid
    join product_accounting pa on pa.company = ${company} and pa.product = ws.id and pa.id in (
      select max(id) from product_accounting where company = ${company} and product = ws.id
    )       
    --21.07.2022
    left join "products_barcode" on ws."id" = "products_barcode"."product" and ws."company"="products_barcode"."company"
    --21.07.2022
  WHERE ws.company = ${company}
  
${barcode}
${brand ? ` and ws.brand_id=${brand}` : ""}
${p1}
${stockid ? ` and ws.point_id=${stockid}` : ""}
${category && category.length > 0 ? ` and ws.category_id in (${category.map((c) => `${c}`).join(",")})`: ""}
  ORDER BY ws.units desc
    `).then((result) => {
      let data = result.rows.slice();
      data = data.map((item) => {
        if (item.pointname === "Центральный склад") return item;
        const pointname = item.pointname.substring(13);
        return {
          ...item,
          pointname: `Склад точки ${helpers.decrypt(pointname)}`,
        };
      });
      return res.status(200).json(data);
    })
    .catch((err) => {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    });
  });
  
  router.post("/simple/excel", (req, res) => {
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
        number: {
          displayName: "№",
          headerStyle: styles.header,
          width: "5", // <- width in chars (when the number is passed as string)
          height: "10",
        },
        point: {
          displayName: "Склад",
          headerStyle: styles.header,
          width: "14", // <- width in chars (when the number is passed as string)
          height: "10",
        },
        name: {
          displayName: "Наименование",
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
        price: {
          
		  
		  //////05.10.2023	
         // displayName: "Цена продажи, тг",		  
		  displayName: "Цена продажи, "+val,
	  //////05.10.2023
		  
          headerStyle: styles.header,
          width: "11", // <- width in chars (when the number is passed as string)
        },
        purchaseprice: {
          		  
		  //////05.10.2023	
          //displayName: "Цена закупки, тг",		  
		  displayName: "Цена закупки, "+val,
	  //////05.10.2023
		  
          headerStyle: styles.header,
          width: "11", // <- width in chars (when the number is passed as string)
        },
        units: {
          displayName: "Остаток, шт",
          headerStyle: styles.header,
          width: "14", // <- width in chars (when the number is passed as string)
        },
        brand: {
          displayName: "Бренд",
          headerStyle: styles.header,
          width: "14", // <- width in chars (when the number is passed as string)
        },
        category: {
          displayName: "Категория",
          headerStyle: styles.header,
          width: "14", // <- width in chars (when the number is passed as string)
        },
        counterparty: {
          displayName: "Контрагент",
          headerStyle: styles.header,
          width: "14", // <- width in chars (when the number is passed as string)
        },
        nds: {
          displayName: "НДС",
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
