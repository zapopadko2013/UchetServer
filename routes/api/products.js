const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");

const router = new express.Router();

router.get("/stockcurrent/point", (req, res) => {
  let productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";

  knex("products")
    .leftJoin("stockcurrent", {
      "stockcurrent.product": "products.id",
      "stockcurrent.company": "products.company",
    })
    .leftJoin("points", {
      "points.id": "stockcurrent.point",
      "points.company": "stockcurrent.company",
    })
    .where({ "points.company": req.userData.company })
    .andWhere({ "products.deleted": false })
    .whereNot({ "points.point_type": 0 })
    .whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])
    .distinct(
      knex.raw(
        "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributescaption"
      ),
      "products.name",
      "products.id",
      "products.code",
      "stockcurrent.attributes"
    )
    .select()
    .limit(60)
    .orderBy("name")
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

/////13.09.2022
router.get("/stockcurrent/stock1", (req, res) => {
  let productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";
  let barcode = req.query.barcode;
  const isWeightProduct = req.query.isWeightProduct;
  const condition = knex.raw("products.category <> ?", [-1]);
  const stocktoid = req.query.stocktoid;
  const category = req.query.category; 
  const brand = req.query.brand;

  
    knex("products")
      .innerJoin("stockcurrent", {
        "stockcurrent.product": "products.id",
        "stockcurrent.company": "products.company",
      })
      .innerJoin("points", {
        "points.id": "stockcurrent.point",
        "points.company": "stockcurrent.company",
      })
      .innerJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })

      .innerJoin("pointset", "pointset.stock", "stockcurrent.point")
      .innerJoin("storeprices", {
      "storeprices.store": "pointset.point",
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "stockcurrent.company",
    })
    .leftJoin(purchase, {
      "purchase.product": "stockcurrent.product",
      "purchase.company": "stockcurrent.company",
    })


      .where({ "points.id": req.query.stockid })
      .andWhereRaw(`products.deleted = false`)
      .modify(function (queryBuilder) {
        if (isWeightProduct === "false") {
          queryBuilder.andWhere(condition);
        }
        if (stocktoid) {
          queryBuilder
            .where("stockcurrent.units", "<>", 0)
        }
        if (stocktoid) {
          queryBuilder
            .leftJoin("stockcurrent as s", {
              "stockcurrent.product": "s.product",
              "stockcurrent.company": "s.company",
              "stockcurrent.attributes": "s.attributes",
              "s.point": parseInt(stocktoid, 0),
            })
            .select("s.id as idto");
        }
        if (brand) {
          queryBuilder
            .where("products.brand","=",brand)
        }
        if (category) {
          queryBuilder
            .where("products.category","=",category)
        }
      })
      //.andWhere(knex.raw("products.category <> ?", [-1]))
      //.whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])
      .select(
        "products.name",
        "products.id as prodid",
        "stockcurrent.id",
        "stockcurrent.units",
        "products.code",
        "stockcurrent.attributes",
        "unit_spr.shortname as unitspr_shortname",
        knex.raw(
          "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributesCaption"
        )

        ,
      "storeprices.price",
      "storeprices.wholesale_price",
      "products.category",
      "storeprices.pieceprice",
      "products.piece",
      "products.unitsprid",
      knex.raw("coalesce(purchase.purchaseprice,0) as purchaseprice")

      )
      //.limit(2)
      .orderBy("name")
      .then((products) => {
        return res.status(200).json(products);
      })
      .catch((err) => {
        helpers.log(err);
        return res.status(500).json(err);
      });
  
});

/////13.09.2022


router.get("/stockcurrent/stock", (req, res) => {
  let productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";
  let barcode = req.query.barcode;
  const isWeightProduct = req.query.isWeightProduct;
  const condition = knex.raw("products.category <> ?", [-1]);
  const stocktoid = req.query.stocktoid;
  const category = req.query.category; 
  const brand = req.query.brand;

  if (barcode) {
    knex("products")
      .innerJoin("stockcurrent", {
        "stockcurrent.product": "products.id",
        "stockcurrent.company": "products.company",
      })
      .innerJoin("storeprices", {
        "storeprices.stock": "stockcurrent.id",
        "storeprices.company": "products.company",
      })
      .innerJoin("points", {
        "points.id": "stockcurrent.point",
        "points.company": "stockcurrent.company",
      })
      .innerJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })

      ///15.07.2022
      .leftJoin("products_barcode", { "products.id":"products_barcode.product", "products.company": "products_barcode.company", })      
      //.where({ "points.id": req.query.stockid, "products.code": barcode })
      .whereRaw(`points.id = '${req.query.stockid}' and  (products.code='${barcode}' Or products_barcode.barcode ='${barcode}') `)
      ///15.07.2022

      .andWhereRaw(`products.deleted = false`)
      .modify(function (queryBuilder) {
        if (isWeightProduct === "false") {
          queryBuilder.andWhere(condition);
        }
        if (stocktoid) {
          queryBuilder
            .where("stockcurrent.units", "<>", 0)
        }
        //для инвойса на перемещение чтобы по stocktoid подтягивать цену.
        if (stocktoid) {
          queryBuilder
            .leftJoin("stockcurrent as s", {
              "stockcurrent.product": "s.product",
              "stockcurrent.company": "s.company",
              "stockcurrent.attributes": "s.attributes",
              "s.point": parseInt(stocktoid, 0),
            })
            .select("s.id as idto");
        }
        
      })
      // .andWhere(knex.raw("products.category <> ?", [-1]))
      
      .select(
        "products.name",
        "products.id as prodid",
        "stockcurrent.id",
        "stockcurrent.units",
        knex.raw('ROUND(stockcurrent.units, 0) as units'),
        "storeprices.price",

        ///15.07.2022 
        //"products.code",
        knex.raw(`${barcode} as code `),
        ///15.07.2022

        "stockcurrent.attributes",
        "unit_spr.shortname as unitspr_shortname",
        knex.raw(
          "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributesCaption"
        )
      )

      ///15.07.2022
      .distinct()
      ///15.07.2022

      .then((product) => {
        return res.status(200).json(product);
      })
      .catch((err) => {
        helpers.log(err);
        return res.status(500).json(err);
      });

  } else {
    knex("products")
      .innerJoin("stockcurrent", {
        "stockcurrent.product": "products.id",
        "stockcurrent.company": "products.company",
      })
      .innerJoin("points", {
        "points.id": "stockcurrent.point",
        "points.company": "stockcurrent.company",
      })
      .innerJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })
      .where({ "points.id": req.query.stockid })
      .andWhereRaw(`products.deleted = false`)
      .modify(function (queryBuilder) {
        if (isWeightProduct === "false") {
          queryBuilder.andWhere(condition);
        }
        if (stocktoid) {
          queryBuilder
            .where("stockcurrent.units", "<>", 0)
        }
        if (stocktoid) {
          queryBuilder
            .leftJoin("stockcurrent as s", {
              "stockcurrent.product": "s.product",
              "stockcurrent.company": "s.company",
              "stockcurrent.attributes": "s.attributes",
              "s.point": parseInt(stocktoid, 0),
            })
            .select("s.id as idto");
        }
        if (brand) {
          queryBuilder
            .where("products.brand","=",brand)
        }
        if (category) {
          queryBuilder
            .where("products.category","=",category)
        }
      })
      //.andWhere(knex.raw("products.category <> ?", [-1]))
      .whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])
      .select(
        "products.name",
        "products.id as prodid",
        "stockcurrent.id",
        "stockcurrent.units",
        "products.code",
        "stockcurrent.attributes",
        "unit_spr.shortname as unitspr_shortname",
        knex.raw(
          "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributesCaption"
        )
      )
      .limit(30)
      .orderBy("name")
      .then((products) => {
        return res.status(200).json(products);
      })
      .catch((err) => {
        helpers.log(err);
        return res.status(500).json(err);
      });
  }
});

// select distinct pr.name||' | '||array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes),', ') as attributes,
// st.price, pa.purchaseprice
// from products pr
// left join stockcurrent s on (s.product = pr.id)
// left join points p on (p.id = s.point and p.company = 15)
// left join categories c on (c.id = pr.category)
// left join storeprices st on (st.stock = s.id)
// left join product_accounting pa on (pa.product = s.product and pa.attributes = s.attributes)
// where pr.code = '8901140114119'
// and (pr.company = 15 or pr.company = 0)
// and pa.id = (
//   select max(pa.id)
//     from product_accounting pa
//       where pa.product = s.product
//         and pa.attributes = s.attributes
// )


/* 
router.get("/getProductByBarcode", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const barcode = req.query.barcode;
  knex.raw(`
    SELECT 	 
      "categories"."id" as "categoryid", 
      "categories"."name" as "category", 

      "brands"."brand", 
      "brands"."id" as "brandid", 

      "products"."code", 
      "products"."name", 
      "products"."id", 
      "products"."cnofeacode", 
      "products"."piece", 
      "products"."pieceinpack",
      "products"."unitsprid", 
      "products"."isstaticprice", 
      "products"."taxid", 
      "products"."bonusrate",
      "products"."details", 
      0 as attributes,

      
      "product_static_prices"."price" as "staticprice", 

      "storeprices"."price", 
      "storeprices"."pieceprice", 
      "storeprices"."wholesale_price", 
      
      "unit_spr"."shortname" as "unitspr_shortname", 
      "unit_spr"."name" as "unitspr_name", 

      (select pa.purchaseprice
        from product_accounting as pa
        where pa.company = "products".company
          and pa.product = "products"."id"
          and pa."date" = (
            select max("date") 
            from product_accounting
            where company = "products".company
              and product = "products"."id") limit 1) as lastpurchaseprice, 


      (case when m.rate is null then 0 else m.rate end) as rate, 
      (case when m.sum is null then 0 else m.sum end) as sum,
      
      null as attributescaption, 
      null as detailscaption

    FROM "products" 
    left join "stockcurrent" on "stockcurrent"."product" = "products"."id" and "stockcurrent"."company" = "products"."company" 
    left join "categories" on "categories"."id" = "products"."category" 
    left join "storeprices" on "storeprices"."stock" = "stockcurrent"."id" and "storeprices"."company" = "stockcurrent"."company" 
    left join "brands" on "brands"."id" = "products"."brand" 
    left join "margin_plan" as "m" on "m"."object" = "products"."id" and "m"."type" = 1 and "m"."company" = "products"."company" and "m"."active" = true
    left join "unit_spr" on "unit_spr"."id" = "products"."unitsprid" 
    left join "product_static_prices" on "products"."id" = "product_static_prices"."product" and "product_static_prices"."company" = "products"."company" 

       
    --15.07.2022
    left join "products_barcode" on "products"."id" = "products_barcode"."product" and "products"."company"="products_barcode"."company"
    --15.07.2022

    WHERE
      
      --15.07.2022
      --"products"."code" = '${barcode}'

      ("products"."code" = '${barcode}'
        or "products_barcode"."barcode"='${barcode}'
      )
      --15.07.2022    
      and "products"."deleted" = false
      and "products"."company" = ${company}
      and products.category <> -1
    LIMIT 1
  `).then((products) => {
    if (!products.rows[0]) {
      knex("products_spr")
        .where({ "products_spr.code": barcode })
        .select(
          "products_spr.id",
          "products_spr.code",
          "products_spr.name",
          "products_spr.brandid",
          knex.raw("0 as brand"),
          knex.raw("0 as rate"),
          knex.raw("0 as sum")
        ).first()
        .then((product) => {
          if (product) {
            product.cnofeacode = null;
            product.attributes = "0";
            product.unitsprid = "1";
            product.bonusrate = 1;
            product.attributescaption = "";
            product.id = product.id + "s";
            return res.status(200).json(product);
          } else {
            return res.status(200).json({});
          }
        })
        .catch((err) => {
          return res.status(500).json(err);
        });
    } else {
      return res.status(200).json(products.rows[0]);
    }
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

/*
router.get("/getProductByBarcode", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const barcode = req.query.barcode;
  
  knex.raw(`
    SELECT 	 
      "categories"."id" as "categoryid", 
      "categories"."name" as "category", 

      "brands"."brand", 
      "brands"."id" as "brandid", 

       
      '${barcode}' as "code",
      "products"."name", 
      "products"."id", 
      "products"."cnofeacode", 
      "products"."piece", 
      "products"."pieceinpack",
      "products"."unitsprid", 
      "products"."isstaticprice", 
      "products"."taxid", 
      "products"."bonusrate",
      "products"."details", 
      "products"."attributes",
      

      
      "product_static_prices"."price" as "staticprice", 

      "storeprices"."price", 
      "storeprices"."pieceprice", 
      "storeprices"."wholesale_price", 
      
      "unit_spr"."shortname" as "unitspr_shortname", 
      "unit_spr"."name" as "unitspr_name", 

      (select pa.purchaseprice
        from product_accounting as pa
        where pa.company = "products".company
          and pa.product = "products"."id"
          and pa."date" = (
            select max("date") 
            from product_accounting
            where company = "products".company
              and product = "products"."id")
              limit 1) as lastpurchaseprice, 


      (case when m.rate is null then 0 else m.rate end) as rate, 
      (case when m.sum is null then 0 else m.sum end) as sum,
      
      null as attributescaption, 
      null as detailscaption

    FROM "products" 
    left join "stockcurrent" on "stockcurrent"."product" = "products"."id" and "stockcurrent"."company" = "products"."company" 
    left join "categories" on "categories"."id" = "products"."category" 
    left join "storeprices" on "storeprices"."stock" = "stockcurrent"."id" and "storeprices"."company" = "stockcurrent"."company" 
    left join "brands" on "brands"."id" = "products"."brand" 
    left join "margin_plan" as "m" on "m"."object" = "products"."id" and "m"."type" = 1 and "m"."company" = "products"."company" and "m"."active" = true
    left join "unit_spr" on "unit_spr"."id" = "products"."unitsprid" 
    left join "product_static_prices" on "products"."id" = "product_static_prices"."product" and "product_static_prices"."company" = "products"."company" 
   
    --15.07.2022
    left join "products_barcode" on "products"."id" = "products_barcode"."product" and "products"."company"="products_barcode"."company"
    --15.07.2022


    WHERE

    --15.07.2022
     --"products"."code" = '${barcode}'

      ("products"."code" = '${barcode}'
         or "products_barcode"."barcode"='${barcode}'
	  )
    --15.07.2022    

      and "products"."deleted" = false
      and "products"."company" = ${company}
      and products.category <> -1
    LIMIT 1
  `).then((products) => { 
    if (!products.rows[0]) {
      knex("products_spr")
        .where({ "products_spr.code": barcode })
        .select(
          "products_spr.id",
          "products_spr.code",
          "products_spr.name",
          "products_spr.brandid",
          knex.raw("0 as brand"),
          knex.raw("0 as rate"),
          knex.raw("0 as sum")
        ).first()
        .then((product) => {
          if (product) {
            product.cnofeacode = null;
            product.attributes = "0";
            product.unitsprid = "1";
            product.bonusrate = 1;
            product.attributescaption = "";
            product.id = product.id + "s";
            return res.status(200).json(product);
          } else {
            return res.status(200).json({});
          }
        })
        .catch((err) => {
          return res.status(500).json(err);
        });
    } else {
      return res.status(200).json(products.rows[0]);
    }
  }).catch((err) => {
    return res.status(500).json(err);
  });
});
*/

router.get("/getProductByBarcode", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const barcode = req.query.barcode;
  knex.raw(`
    SELECT 	 
      "categories"."id" as "categoryid", 
      "categories"."name" as "category", 

      "brands"."brand", 
      "brands"."id" as "brandid", 

      "products"."code", 
      "products"."name", 
      "products"."id", 
      "products"."cnofeacode", 
      "products"."piece", 
      "products"."pieceinpack",
      "products"."unitsprid", 
      "products"."isstaticprice", 
      "products"."taxid", 
      "products"."bonusrate",
      "products"."details", 
      0 as attributes,

      
      "product_static_prices"."price" as "staticprice", 

      "storeprices"."price", 
      "storeprices"."pieceprice", 
      "storeprices"."wholesale_price", 
      
      "unit_spr"."shortname" as "unitspr_shortname", 
      "unit_spr"."name" as "unitspr_name", 

      (select pa.purchaseprice
        from product_accounting as pa
        where pa.company = "products".company
          and pa.product = "products"."id"
          and pa."date" = (
            select max("date") 
            from product_accounting
            where company = "products".company
              and product = "products"."id") limit 1) as lastpurchaseprice, 


      (case when m.rate is null then 0 else m.rate end) as rate, 
      (case when m.sum is null then 0 else m.sum end) as sum,
      
      -----24.07.2023	
      --null as attributescaption, 	
      --null as detailscaption	
      	
      products."attributes" ,products.details 	
      ,(select jsonb_agg(jsonb_build_object('attribute_id',a1.attribute, 	
      'attribute_name', attr1.values, 'attribute_value', a1.value,	
      'attribute_listcode', a1.listcode, 'attribute_format', attr1.format))	
      from attrlist as a1 inner join attributenames as attr1 on (attr1.id=a1.attribute)	
      where a1.listcode=products.attributes	
      limit 1) as attributescaption	
      ,(select jsonb_agg(jsonb_build_object('attribute_id',a1.attribute, 	
      'attribute_name', attr1.values, 'attribute_value', a1.value,	
      'attribute_listcode', a1.listcode, 'attribute_format', attr1.format))	
      from attrlist as a1 inner join attributenames as attr1 on (attr1.id=a1.attribute)	
      where a1.listcode=products.details 	
      limit 1) as detailscaption	
      -----24.07.2023
      	  
	 
    FROM "products" 
    left join "stockcurrent" on "stockcurrent"."product" = "products"."id" and "stockcurrent"."company" = "products"."company" 
    left join "categories" on "categories"."id" = "products"."category" 
    left join "storeprices" on "storeprices"."stock" = "stockcurrent"."id" and "storeprices"."company" = "stockcurrent"."company" 
    left join "brands" on "brands"."id" = "products"."brand" 
    left join "margin_plan" as "m" on "m"."object" = "products"."id" and "m"."type" = 1 and "m"."company" = "products"."company" and "m"."active" = true
    left join "unit_spr" on "unit_spr"."id" = "products"."unitsprid" 
    left join "product_static_prices" on "products"."id" = "product_static_prices"."product" and "product_static_prices"."company" = "products"."company" 

       
    --15.07.2022
    left join "products_barcode" on "products"."id" = "products_barcode"."product" and "products"."company"="products_barcode"."company"
    --15.07.2022

    WHERE
      
      --15.07.2022
      --"products"."code" = '${barcode}'

      ("products"."code" = '${barcode}'
        or "products_barcode"."barcode"='${barcode}'
      )
      --15.07.2022    
      and "products"."deleted" = false
      and "products"."company" = ${company}
      and products.category <> -1
    LIMIT 1
  `).then((products) => {
    if (!products.rows[0]) {
      knex("products_spr")
            .leftJoin("brands_copy", {
              "brands_copy.id": "products_spr.brandid",
            })
            .where({ "products_spr.code": barcode })
            .select(
              "products_spr.id",
              "products_spr.code",
              "products_spr.name",
              "products_spr.brandid",
              "brands_copy.brand",
              knex.raw("0 as rate"),
              knex.raw("0 as sum")
            )
            .first()
            .then((product) => {
              if (product) {
                product.cnofeacode = null;
                product.attributes = "0";
                product.unitsprid = "1";
                product.bonusrate = 1;
                product.attributescaption = "";
                product.id = product.id + "s";

                return res.status(200).json(product);
              } else {
                return res.status(200).json({});
              }
            })
            .catch((err) => {
              console.log(err);
              return res.status(500).json(err);
            });
      // knex("products_spr")
      //   .where({ "products_spr.code": barcode })
      //   .select(
      //     "products_spr.id",
      //     "products_spr.code",
      //     "products_spr.name",
      //     "products_spr.brandid",
      //     knex.raw("0 as brand"),
      //     knex.raw("0 as rate"),
      //     knex.raw("0 as sum")
      //   ).first()
      //   .then((product) => {
      //     if (product) {
      //       product.cnofeacode = null;
      //       product.attributes = "0";
      //       product.unitsprid = "1";
      //       product.bonusrate = 1;
      //       product.attributescaption = "";
      //       product.id = product.id + "s";
      //       return res.status(200).json(product);
      //     } else {
      //       return res.status(200).json({});
      //     }
      //   })
      //   .catch((err) => {
      //     return res.status(500).json(err);
      //   });
    } else {
      return res.status(200).json(products.rows[0]);
    }
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

///////13.10.2025

router.get("/getProductByBarcodeLocalNow", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const barcode = req.query.barcode;
  knex.raw(`
    SELECT 	 
      "categories"."id" as "categoryid", 
      "categories"."name" as "category", 

      "brands"."brand", 
      "brands"."id" as "brandid", 

      "products"."code", 
      "products"."name", 
      "products"."id", 
      "products"."cnofeacode", 
      "products"."piece", 
      "products"."pieceinpack",
      "products"."unitsprid", 
      "products"."isstaticprice", 
      "products"."taxid", 
      "products"."bonusrate",
      "products"."details", 
      0 as attributes,

      
      "product_static_prices"."price" as "staticprice", 

      "storeprices"."price", 
      "storeprices"."pieceprice", 
      "storeprices"."wholesale_price", 
      
      "unit_spr"."shortname" as "unitspr_shortname", 
      "unit_spr"."name" as "unitspr_name", 

      (select pa.purchaseprice
        from product_accounting as pa
        where pa.company = "products".company
          and pa.product = "products"."id"
          and pa."date" = (
            select max("date") 
            from product_accounting
            where company = "products".company
              and product = "products"."id") limit 1) as lastpurchaseprice, 


      (case when m.rate is null then 0 else m.rate end) as rate, 
      (case when m.sum is null then 0 else m.sum end) as sum,
      
      -----24.07.2023	
      --null as attributescaption, 	
      --null as detailscaption	
      	
      products."attributes" ,products.details 	
      ,(select jsonb_agg(jsonb_build_object('attribute_id',a1.attribute, 	
      'attribute_name', attr1.values, 'attribute_value', a1.value,	
      'attribute_listcode', a1.listcode, 'attribute_format', attr1.format))	
      from attrlist as a1 inner join attributenames as attr1 on (attr1.id=a1.attribute)	
      where a1.listcode=products.attributes	
      limit 1) as attributescaption	
      ,(select jsonb_agg(jsonb_build_object('attribute_id',a1.attribute, 	
      'attribute_name', attr1.values, 'attribute_value', a1.value,	
      'attribute_listcode', a1.listcode, 'attribute_format', attr1.format))	
      from attrlist as a1 inner join attributenames as attr1 on (attr1.id=a1.attribute)	
      where a1.listcode=products.details 	
      limit 1) as detailscaption	
      -----24.07.2023
      	  
	 
    FROM "products" 
    left join "stockcurrent" on "stockcurrent"."product" = "products"."id" and "stockcurrent"."company" = "products"."company" 
    left join "categories" on "categories"."id" = "products"."category" 
    left join "storeprices" on "storeprices"."stock" = "stockcurrent"."id" and "storeprices"."company" = "stockcurrent"."company" 
    left join "brands" on "brands"."id" = "products"."brand" 
    left join "margin_plan" as "m" on "m"."object" = "products"."id" and "m"."type" = 1 and "m"."company" = "products"."company" and "m"."active" = true
    left join "unit_spr" on "unit_spr"."id" = "products"."unitsprid" 
    left join "product_static_prices" on "products"."id" = "product_static_prices"."product" and "product_static_prices"."company" = "products"."company" 

       
    --15.07.2022
    left join "products_barcode" on "products"."id" = "products_barcode"."product" and "products"."company"="products_barcode"."company"
    --15.07.2022

    WHERE
      
      --15.07.2022
      --"products"."code" = '${barcode}'

      ("products"."code" = '${barcode}'
        or "products_barcode"."barcode"='${barcode}'
      )
      --15.07.2022    
      and "products"."deleted" = false
      and "products"."company" = ${company}
      --13.10.2025
      --and products.category <> -1
      --13.10.2025
    LIMIT 1
  `).then((products) => {
    return res.status(200).json(products.rows[0]);
    // if (!products.rows[0]) {
    //   knex("products_spr")
    //         .leftJoin("brands_copy", {
    //           "brands_copy.id": "products_spr.brandid",
    //         })
    //         .where({ "products_spr.code": barcode })
    //         .select(
    //           "products_spr.id",
    //           "products_spr.code",
    //           "products_spr.name",
    //           "products_spr.brandid",
    //           "brands_copy.brand",
    //           knex.raw("0 as rate"),
    //           knex.raw("0 as sum")
    //         )
    //         .first()
    //         .then((product) => {
    //           if (product) {
    //             product.cnofeacode = null;
    //             product.attributes = "0";
    //             product.unitsprid = "1";
    //             product.bonusrate = 1;
    //             product.attributescaption = "";
    //             product.id = product.id + "s";

    //             return res.status(200).json(product);
    //           } else {
    //             return res.status(200).json({});
    //           }
    //         })
    //         .catch((err) => {
    //           console.log(err);
    //           return res.status(500).json(err);
    //         });
    //   // knex("products_spr")
    //   //   .where({ "products_spr.code": barcode })
    //   //   .select(
    //   //     "products_spr.id",
    //   //     "products_spr.code",
    //   //     "products_spr.name",
    //   //     "products_spr.brandid",
    //   //     knex.raw("0 as brand"),
    //   //     knex.raw("0 as rate"),
    //   //     knex.raw("0 as sum")
    //   //   ).first()
    //   //   .then((product) => {
    //   //     if (product) {
    //   //       product.cnofeacode = null;
    //   //       product.attributes = "0";
    //   //       product.unitsprid = "1";
    //   //       product.bonusrate = 1;
    //   //       product.attributescaption = "";
    //   //       product.id = product.id + "s";
    //   //       return res.status(200).json(product);
    //   //     } else {
    //   //       return res.status(200).json({});
    //   //     }
    //   //   })
    //   //   .catch((err) => {
    //   //     return res.status(500).json(err);
    //   //   });
    // } else {
    //   return res.status(200).json(products.rows[0]);
    // }
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

////////13.10,2025

router.get("/getProductByBarcodeLocal", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const barcode = req.query.barcode;
  knex.raw(`
    SELECT 	 
      "categories"."id" as "categoryid", 
      "categories"."name" as "category", 

      "brands"."brand", 
      "brands"."id" as "brandid", 

      "products"."code", 
      "products"."name", 
      "products"."id", 
      "products"."cnofeacode", 
      "products"."piece", 
      "products"."pieceinpack",
      "products"."unitsprid", 
      "products"."isstaticprice", 
      "products"."taxid", 
      "products"."bonusrate",
      "products"."details", 
      0 as attributes,

      
      "product_static_prices"."price" as "staticprice", 

      "storeprices"."price", 
      "storeprices"."pieceprice", 
      "storeprices"."wholesale_price", 
      
      "unit_spr"."shortname" as "unitspr_shortname", 
      "unit_spr"."name" as "unitspr_name", 

      (select pa.purchaseprice
        from product_accounting as pa
        where pa.company = "products".company
          and pa.product = "products"."id"
          and pa."date" = (
            select max("date") 
            from product_accounting
            where company = "products".company
              and product = "products"."id") limit 1) as lastpurchaseprice, 


      (case when m.rate is null then 0 else m.rate end) as rate, 
      (case when m.sum is null then 0 else m.sum end) as sum,
      
      -----24.07.2023	
      --null as attributescaption, 	
      --null as detailscaption	
      	
      products."attributes" ,products.details 	
      ,(select jsonb_agg(jsonb_build_object('attribute_id',a1.attribute, 	
      'attribute_name', attr1.values, 'attribute_value', a1.value,	
      'attribute_listcode', a1.listcode, 'attribute_format', attr1.format))	
      from attrlist as a1 inner join attributenames as attr1 on (attr1.id=a1.attribute)	
      where a1.listcode=products.attributes	
      limit 1) as attributescaption	
      ,(select jsonb_agg(jsonb_build_object('attribute_id',a1.attribute, 	
      'attribute_name', attr1.values, 'attribute_value', a1.value,	
      'attribute_listcode', a1.listcode, 'attribute_format', attr1.format))	
      from attrlist as a1 inner join attributenames as attr1 on (attr1.id=a1.attribute)	
      where a1.listcode=products.details 	
      limit 1) as detailscaption	
      -----24.07.2023
      	  
	 
    FROM "products" 
    left join "stockcurrent" on "stockcurrent"."product" = "products"."id" and "stockcurrent"."company" = "products"."company" 
    left join "categories" on "categories"."id" = "products"."category" 
    left join "storeprices" on "storeprices"."stock" = "stockcurrent"."id" and "storeprices"."company" = "stockcurrent"."company" 
    left join "brands" on "brands"."id" = "products"."brand" 
    left join "margin_plan" as "m" on "m"."object" = "products"."id" and "m"."type" = 1 and "m"."company" = "products"."company" and "m"."active" = true
    left join "unit_spr" on "unit_spr"."id" = "products"."unitsprid" 
    left join "product_static_prices" on "products"."id" = "product_static_prices"."product" and "product_static_prices"."company" = "products"."company" 

       
    --15.07.2022
    left join "products_barcode" on "products"."id" = "products_barcode"."product" and "products"."company"="products_barcode"."company"
    --15.07.2022

    WHERE
      
      --15.07.2022
      --"products"."code" = '${barcode}'

      ("products"."code" = '${barcode}'
        or "products_barcode"."barcode"='${barcode}'
      )
      --15.07.2022    
      and "products"."deleted" = false
      and "products"."company" = ${company}
      
      and products.category <> -1
      
    LIMIT 1
  `).then((products) => {
    return res.status(200).json(products.rows[0]);
    // if (!products.rows[0]) {
    //   knex("products_spr")
    //         .leftJoin("brands_copy", {
    //           "brands_copy.id": "products_spr.brandid",
    //         })
    //         .where({ "products_spr.code": barcode })
    //         .select(
    //           "products_spr.id",
    //           "products_spr.code",
    //           "products_spr.name",
    //           "products_spr.brandid",
    //           "brands_copy.brand",
    //           knex.raw("0 as rate"),
    //           knex.raw("0 as sum")
    //         )
    //         .first()
    //         .then((product) => {
    //           if (product) {
    //             product.cnofeacode = null;
    //             product.attributes = "0";
    //             product.unitsprid = "1";
    //             product.bonusrate = 1;
    //             product.attributescaption = "";
    //             product.id = product.id + "s";

    //             return res.status(200).json(product);
    //           } else {
    //             return res.status(200).json({});
    //           }
    //         })
    //         .catch((err) => {
    //           console.log(err);
    //           return res.status(500).json(err);
    //         });
    //   // knex("products_spr")
    //   //   .where({ "products_spr.code": barcode })
    //   //   .select(
    //   //     "products_spr.id",
    //   //     "products_spr.code",
    //   //     "products_spr.name",
    //   //     "products_spr.brandid",
    //   //     knex.raw("0 as brand"),
    //   //     knex.raw("0 as rate"),
    //   //     knex.raw("0 as sum")
    //   //   ).first()
    //   //   .then((product) => {
    //   //     if (product) {
    //   //       product.cnofeacode = null;
    //   //       product.attributes = "0";
    //   //       product.unitsprid = "1";
    //   //       product.bonusrate = 1;
    //   //       product.attributescaption = "";
    //   //       product.id = product.id + "s";
    //   //       return res.status(200).json(product);
    //   //     } else {
    //   //       return res.status(200).json({});
    //   //     }
    //   //   })
    //   //   .catch((err) => {
    //   //     return res.status(500).json(err);
    //   //   });
    // } else {
    //   return res.status(200).json(products.rows[0]);
    // }
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

router.get("/getProductById", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const id = req.query.id;

  knex.raw(`
    SELECT 	 
      "categories"."id" as "categoryid", 
      "categories"."name" as "category", 

      "brands"."brand", 
      "brands"."id" as "brandid", 

      "products"."code", 
      "products"."name", 
      "products"."id", 
      "products"."cnofeacode", 
      "products"."piece", 
      "products"."pieceinpack",
      "products"."unitsprid", 
      "products"."isstaticprice", 
      "products"."taxid", 
      "products"."bonusrate",
      "products"."details", 
      "products"."attributes",

      
      "product_static_prices"."price" as "staticprice", 

      "storeprices"."price", 
      "storeprices"."pieceprice", 
      "storeprices"."wholesale_price", 
      
      "unit_spr"."shortname" as "unitspr_shortname", 
      "unit_spr"."name" as "unitspr_name", 
      

      (select pa.purchaseprice
        from product_accounting as pa
        where pa.company = "products".company
          and pa.product = "products"."id"
          and pa."date" = (
            select max("date") 
            from product_accounting
            where company = "products".company
              and product = "products"."id")) as lastpurchaseprice, 


      (case when m.rate is null then 0 else m.rate end) as rate, 
      (case when m.sum is null then 0 else m.sum end) as sum,
      
      null as attributescaption, 
      null as detailscaption,
     --29.07.2022
      --pb.barcode
      "products_barcode".barcode
     --29.07.2022

    FROM "products" 
    left join "stockcurrent" on "stockcurrent"."product" = "products"."id" and "stockcurrent"."company" = "products"."company" 
    left join "categories" on "categories"."id" = "products"."category" 
    left join "storeprices" on "storeprices"."stock" = "stockcurrent"."id" and "storeprices"."company" = "stockcurrent"."company" 
    left join "brands" on "brands"."id" = "products"."brand" 
    left join "margin_plan" as "m" on "m"."object" = "products"."id" and "m"."type" = 1 and "m"."company" = "products"."company" and "m"."active" = true
    left join "unit_spr" on "unit_spr"."id" = "products"."unitsprid" 
    left join "product_static_prices" on "products"."id" = "product_static_prices"."product" and "product_static_prices"."company" = "products"."company" 
    --29.07.2022
    --inner join products_barcode pb on "products"."id" = pb.product and "products"."company" = pb.company
    --29.07.2022

    
    --15.07.2022
    left join "products_barcode" on "products"."id" = "products_barcode"."product" and "products"."company"="products_barcode"."company"
    --15.07.2022
    WHERE
    --15.07.2022
    
     ("products"."id" = '${id}'
        or "products_barcode"."product"='${id}'
   )
   --15.07.2022    
      
   --"products".id = ${id}
      and "products"."deleted" = false
      and "products"."company" = ${company}
       
      and products.category <> -1
     
    LIMIT 1
  `).then((products) => { //(select count(*) from products_barcode where product = ${id})

    if (!products.rows[0]) {
      knex("products_spr")
        .where({ "products_spr.id": id} )
        .select(
          "products_spr.id",
          "products_spr.code",
          "products_spr.name",
          "products_spr.brandid",
          knex.raw("0 as brand"),
          knex.raw("0 as rate"),
          knex.raw("0 as sum")
        ).first()
        .then((product) => {
          if (product) {
            product.cnofeacode = null;
            product.attributes = "0";
            product.unitsprid = "1";
            product.bonusrate = 1;
            product.attributescaption = "";
            product.id = product.id + "s";
            return res.status(200).json(product);
          } else {
            return res.status(200).json({});
          }
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).json(err);
        });
    } else {
      return res.status(200).json(products.rows);
    }
  }).catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  });
});


router.get("/barcode/old", (req, res) => {
  let company = req.query.company ? req.query.company : req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const barcode = req.query.barcode;
  const isWeight = req.query.isWeight;
  const point =
    typeof req.query.point !== "undefined" && req.query.point !== null
      ? req.query.point
      : "0";
  const shop =
    typeof req.query.shop !== "undefined" && req.query.shop !== null
      ? req.query.shop
      : "0";
  const attributes =
    typeof req.query.attributes !== "undefined" && req.query.attributes !== null
      ? req.query.attributes
      : "@";

  const allSpr = parseInt(req.query.all, 10);

  var conditions = {

    ///21.07.2022
    //"products.code": barcode,
    ///21.07.2022

    "products.deleted": false,
    "categories.deleted": false,
    "products.company": company,
  };
  if (point !== "0") conditions["stockcurrent.point"] = point;
  if (shop !== "0") conditions["pointset.point"] = shop;
  if (attributes !== "@") conditions["stockcurrent.attributes"] = attributes;

  const cost = knex("stockcurrent_part as sp")
    .leftJoin("products as p", {
      "p.id": "sp.product",
      "p.company": "sp.company",
    })
    .select(
      knex.raw(`coalesce(min(sp.purchaseprice),0) as purchaseprice`),
      "sp.product",
      "sp.point"
    )
    .where({
      "sp.date": knex("stockcurrent_part as sp2")
        .min("sp2.date")
        .andWhereRaw("sp2.company = sp.company")
        .andWhereRaw("sp2.point = sp.point")
        .andWhereRaw("sp2.product = sp.product")
        .andWhereRaw("sp2.attributes = sp.attributes")
        .andWhere("sp2.units", ">", 0),
    })
    .andWhere("sp.units", ">", 0)
    .andWhere("sp.company", "=", company)
    .andWhere("p.code", "=", barcode)
    .modify(function (params) {
      if (attributes !== "@") this.andWhere("sp.attributes", "=", attributes);
    })
    .groupBy("sp.product", "sp.point")
    .as("co");

  const cost2 = knex("stockcurrent_part as sp3")
    .leftJoin("products as p2", {
      "p2.id": "sp3.product",
      "p2.company": "sp3.company",
    })
    .select(
      knex.raw(`coalesce(max(sp3.purchaseprice),0) as purchaseprice`),
      "sp3.product",
      "sp3.point"
    )
    .where({
      "sp3.date": knex("stockcurrent_part as sp4")
        .max("sp4.date")
        .andWhereRaw("sp4.company = sp3.company")
        .andWhereRaw("sp4.point = sp3.point")
        .andWhereRaw("sp4.product = sp3.product")
        .andWhereRaw("sp4.attributes = sp3.attributes"),
    })
    .andWhere("sp3.company", "=", company)
    .andWhere("p2.code", "=", barcode)
    .modify(function (params2) {
      if (attributes !== "@") this.andWhere("sp3.attributes", "=", attributes);
    })
    .groupBy("sp3.product", "sp3.point")
    .as("co2");

  const productBarcode = knex("products")
    .where("code", "=", barcode)
    .select("id");

  const invoiceCompany = knex("invoices")
    .where("type", "=", 2)
    .andWhere("status", "=", "ACCEPTED")
    .andWhere("company", "=", company)
    .select("invoicenumber");

  const temp = knex("products as pr")
    .innerJoin("invoicelist as il", {
      "il.stock": "pr.id"
    })
    .innerJoin("invoices as i", {
      "i.invoicenumber": "il.invoice"
    })
    .innerJoin("counterparties as co", {
      "co.id": "i.counterparty"
    })
    .select(
      knex.raw(`pr.id as productid`),
      "pr.name",
      "i.invoicenumber",
      knex.raw(`co.id as conterpartyid`),
      knex.raw(`coalesce(co.name, '') as counterparty`)
    )
    .where({
      "i.invoicenumber": knex("invoicelist as il2")
        .max("il2.invoice")
        .whereIn("il2.invoice", invoiceCompany)
        .andWhere(
          function () {
            this.whereIn("il2.stock", productBarcode)
          })
    })
    .as("temptable");

  const attrview = knex("attrlist")
    .innerJoin("attributenames", { "attributenames.id": "attrlist.attribute" })
    .select(
      knex.raw('jsonb_agg(jsonb_build_object(\'attribute_id\',attrlist.attribute, \'attribute_name\', attributenames.values, \'attribute_value\', attrlist.value, \'attribute_listcode\', attrlist.listcode, \'attribute_format\', attributenames.format)) AS attributesCaption'),
      "attrlist.listcode"
    )
    .groupBy("attrlist.listcode")
    .as("attrviewtable");

  const detailview = knex("attrlist")
    .innerJoin("attributenames", { "attributenames.id": "attrlist.attribute" })
    .select(
      knex.raw('jsonb_agg(jsonb_build_object(\'attribute_id\',attrlist.attribute, \'attribute_name\', attributenames.values, \'attribute_value\', attrlist.value, \'attribute_listcode\', attrlist.listcode, \'attribute_format\', attributenames.format)) AS detailsCaption'),
      "attrlist.listcode"
    )
    .groupBy("attrlist.listcode")
    .as("detailviewtable");
  
  //29.07.2022
  const product_id = knex("products_barcode")
  .select("product")
  .where("barcode","=",barcode)
  .andWhere("company","=",company);
  //29.07.2022

  !barcode
    ? res.status(500).json({ error: "barcode is empty" })
    : knex("products")
      .leftJoin("stockcurrent", {
        "stockcurrent.product": "products.id",
        "stockcurrent.company": "products.company",
      })
      .leftJoin("points", {
        "points.id": "stockcurrent.point",
        "points.company": "stockcurrent.company",
      })
      .leftJoin("pointset", { "pointset.stock": "stockcurrent.point" })
      //.leftJoin(knex.raw('points on (points.id = stockcurrent.point and points.company =' + company + ')'))
      .leftJoin("categories", { "categories.id": "products.category" })
      .leftJoin("storeprices", {
        "storeprices.stock": "stockcurrent.id",
        "storeprices.company": "stockcurrent.company",
      })
      .leftJoin("brands", { "brands.id": "products.brand" })
      .leftJoin(cost, {
        "co.point": "stockcurrent.point",
        "co.product": "stockcurrent.product",
      })
      .leftJoin(cost2, {
        "co2.point": "stockcurrent.point",
        "co2.product": "stockcurrent.product",
      })
      .leftJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })
      .leftJoin("product_static_prices", {
        "products.id": "product_static_prices.product",
        "product_static_prices.company": "products.company",
      })
      .leftJoin("margin_plan as m", {
        "m.object": "products.id",
        "m.type": knex.raw("?", [3]),
        "m.company": "products.company",
        "m.active": knex.raw("?", [true]),
      })
      .leftJoin(temp, { "temptable.productid": "products.id" })
      .leftJoin(attrview, { "attrviewtable.listcode": "products.attributes" })
      .leftJoin(detailview, { "detailviewtable.listcode": "products.details" })

      ///21.07.2022
      .leftJoin("products_barcode", { "products.id":"products_barcode.product", "products.company": "products_barcode.company", })      
      ///21.07.2022

      .where(conditions)

      ///29.07.2022
      ///21.07.2022
      .andWhereRaw(` (products.code='${barcode}' Or products_barcode.barcode ='${barcode}') `)
      
      ///21.07.2022
      //.andWhere("products_barcode.product","=",product_id)
      //29.07.2022


      .modify(function (params) {
        if (isWeight) this.andWhere(knex.raw("products.category = ?", [-1]));
        else this.andWhere(knex.raw("products.category <> ?", [-1]));
      })
      // .modify(function (params) {
      //   if (isWeight) this.andWhere(knex.raw("stockcurrent.category = ?", [-1]));

      // })
      //.andWhere(knex.raw("products.category <> ?", [-1]))
      //.andWhere(function () {
      //this.where('products.company', '0').orWhere('products.company', company)
    //})
      .distinct(
        "brands.brand",
        "brands.id as brandid",
        //"products.code",
        "products.name",
        "products.id",
        "products.cnofeacode",

        "products.piece",
        "products.pieceinpack",

        "categories.id as categoryid",
        "categories.name as category",
        "products.unitsprid",
        "products.isstaticprice",
        "product_static_prices.price as staticprice",
        "storeprices.price",
        "storeprices.pieceprice",
        "storeprices.wholesale_price",
        "products.taxid",
        "products.bonusrate",
        "unit_spr.shortname as unitspr_shortname",
        "unit_spr.name as unitspr_name",
        knex.raw("coalesce(co2.purchaseprice,0) as lastpurchaseprice"),
        knex.raw("coalesce(co.purchaseprice,0) as purchaseprice"),
        knex.raw("(case when m.rate is null then 0 else m.rate end) as rate"),
        knex.raw("(case when m.sum is null then 0 else m.sum end) as sum"),
        knex.raw("coalesce(temptable.counterparty,'') as counterparty"),
        "products.details",
        "products.attributes",
        knex.raw("attrviewtable.attributescaption as attributescaption"),
        knex.raw("detailviewtable.detailscaption as detailscaption")      
        ,"products_barcode.barcode as code"
      )
      .select()
      .first()
      .then((products) => {
        helpers.serverLog(products);
        if (!products && allSpr === 1) {
          knex("products_spr")
            .leftJoin("brands_copy", {
              "brands_copy.id": "products_spr.brandid",
            })
            .where({ "products_spr.code": barcode })
            .select(
              "products_spr.id",
              "products_spr.code",
              "products_spr.name",
              "products_spr.brandid",
              "brands_copy.brand",
              knex.raw("0 as rate"),
              knex.raw("0 as sum")
            )
            .first()
            .then((product) => {
              if (product) {
                product.cnofeacode = null;
                product.attributes = "0";
                product.unitsprid = "1";
                product.bonusrate = 1;
                product.attributescaption = "";
                product.id = product.id + "s";

                return res.status(200).json(product);
              } else {
                return res.status(200).json(products);
              }
            })
            .catch((err) => {
              console.log(err);
              return res.status(200).json(products);
            });
        } else {
          return res.status(200).json(products);
        }
      })
      .catch((err) => {
        console.log(err.stack);
        return res.status(500).json(err);
      });
});

router.get("/barcode", (req,res) => {

  knex.raw(`select p1.id, name,

  --15.07.2022  
   '${req.query.barcode}' as code
  --code 
  --15.07.2022
 
  from products p1

  --15.07.2022
  left join products_barcode p2 on (p1.id=p2.product and p1.company=p2.company)
  --where code = '${req.query.barcode}'  
  where (code = '${req.query.barcode}'  or  barcode='${req.query.barcode}')
  --15.07.2022 

  and p1.company = ${req.userData.company}
  and not deleted limit 1`)
  .then((product) => {
    console.log(product.rows[0]);
    return res.status(200).json(product.rows[0]);
  })
  .catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  })

});

/*
router.get("/getProductByBarcode", (req,res) => {

  knex.raw(`select id, name, code, bonusrate
  from products 
  where code = '${req.query.barcode}' 
  and company = ${req.userData.company}
  and not deleted`)
  .then((product) => {
    console.log(product.rows[0]);
    return res.status(200).json(product.rows[0]);
  })
  .catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  })

});
*/


router.get("/", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;
  const barcode = req.query.barcode ? req.query.barcode : ""
  const isReport = req.query.report ? req.query.report : false;

  const productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";

  knex("products")
    .leftJoin(
      knex.raw(
        `categories on (categories.id = products.category and categories.company in (products.company,0))`
      )
    )
    .leftJoin("brands", { "brands.id": "products.brand" })
    .leftJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })

     ///15.07.2022
      .leftJoin("products_barcode", { "products.id":"products_barcode.product", "products.company": "products_barcode.company", })
     ///15.07.2022      
      
    .where(function () {
      this.where("products.company", "0").orWhere("products.company", company);
    })
    .andWhere({ "products.deleted": false })
    .whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])
    .modify(function (p) {
      if (!isReport) this.andWhere(knex.raw("products.category <> ?", [-1]));
    })
    .modify(function (p) {

      ///15.07.2022
      //if (barcode !== "") this.andWhereRaw(`products.code like '%${barcode}%'`);
      if (barcode !== "") this.andWhereRaw(`(products.code = '${barcode}' or  products_barcode.barcode = '${barcode}') `);
      ///15.07.2022

    })
    .modify(function (p) {
      if (req.query.brand) this.andWhereRaw(`products.brand = ${req.query.brand}`);
    })
    .modify(function (p) {
      if (req.query.category) this.andWhereRaw(`products.category = ${req.query.category}`);
    })
    .distinct(
      "products.name",
      "products.id",
      "products.code",
      "products.category",
      "products.taxid",
      "products.cnofeacode",
      "products.brand",
      "products.unitsprid",
      "products.deleted",
      "products.piece",
      "products.pieceinpack",
      "categories.name as catname",
      "brands.brand as brandname",
      "unit_spr.shortname as unitsprname"
    )
    .select()
    .limit(60)
    .orderBy("products.id","desc")
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

//сервис для мониторинга остатков
//дублирую чтобы не утяжелять обычный сервис который используется везде
router.get("/stockmonitoring", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  const isReport = req.query.report ? req.query.report : false;

  const productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";

  const barcode = req.query.barcode
    ? req.query.barcode.toLowerCase()
    : "";

  knex("products")
    .leftJoin(
      knex.raw(
        `categories on (categories.id = products.category and categories.company in (products.company,0))`
      )
    )
    .leftJoin("brands", { "brands.id": "products.brand" })
    .leftJoin(
      knex.raw(
        `stockmonitoring on (stockmonitoring.product = products.id and stockmonitoring.company = products.company)`
      )
    )
    .leftJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })

    ///15.07.2022
      .leftJoin("products_barcode", { "products.id":"products_barcode.product", "products.company": "products_barcode.company", })      
    ///15.07.2022


    .where(function () {
      this.where("products.company", "0").orWhere("products.company", company);
    })
    .andWhere({ "products.deleted": false })
    .whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])

    ///15.07.2022
    //.whereRaw("lower(products.code) like (?)", [barcode + "%"])
    .whereRaw(`lower(products.code) = '${barcode}' Or products_barcode.barcode = '${barcode}' `)
      
    //.whereRaw("lower(products.code) like (?) Or products_barcode.barcode like (?)", [barcode + "%"], [barcode + "%"])
    ///15.07.2022


    .modify(function (p) {
      if (!isReport) this.andWhere(knex.raw("products.category <> ?", [-1]));
    })
    .distinct(
      "products.name",
      "products.id",
      "products.code",
      "products.category",
      "products.taxid",
      "products.cnofeacode",
      "products.brand",
      "products.unitsprid",
      "products.deleted",
      "products.piece",
      "products.pieceinpack",
      "categories.name as catname",
      "brands.brand as brandname",
      "unit_spr.shortname as unitsprname",
      "stockmonitoring.units as minimalstock"
    )
    .select()
    .limit(60)
    .orderBy("name")
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/withminimalstock", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  knex.raw(`
    SELECT
        p.code,
        p.name,
        sm.units,
        sm.id as stockm_id
    FROM
        "stockmonitoring" sm
    INNER JOIN products p on p.id = sm.product
    WHERE
	      sm.company = ${company}
        AND sm.type = 1  `)
    .then((products) => {
      return res.status(200).json(products.rows);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});


//сервис для справочника, с соединением таблицы предельных цен
//дублирую чтобы не утяжелять обычный сервис который используется везде
router.get("/withprice", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  const productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";

  let lim = 60;
  if (req.query.type === "list") {
    lim = 5000;
  }

  knex("products")
    .leftJoin("product_static_prices", {
      "products.id": "product_static_prices.product",
      "product_static_prices.company": "products.company",
    })
    .innerJoin("stockcurrent", {
      "stockcurrent.product": "products.id"
    })
    .innerJoin("storeprices", {
      "storeprices.stock": "stockcurrent.id"
    })
    .where(function () {
      this.where("products.company", "0").orWhere("products.company", company);
    })
    .whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])
    .andWhere(knex.raw("products.category <> ?", [-1]))
    .distinct(
      "products.name",
      "products.id",
      "products.code",
      "product_static_prices.price as staticprice"
    )
    .select(
      "products.name",
      "products.id",
      "products.code",
      "product_static_prices.price as staticprice",
      "storeprices.price")
    .limit(lim)
    .orderBy("name")
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

//сервис для справочника, поиск в перемешку по товару и штрихкоду
router.get("/mixedsearch", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  const productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";

  const point = req.query.point;

  if (!point) return res.status(200).json();
  if (point === "0") {
    knex("products")
      .where(function () {
        this.where("products.company", "0").orWhere(
          "products.company",
          company
        );
      })
      .whereRaw(`lower(products.name||' '||products.code) like (?)`, [
        "%" + productName + "%",
      ])
      .andWhere(knex.raw("products.category <> ?", [-1]))
      .distinct("products.name", "products.id", "products.code")
      .select()
      .limit(60)
      .orderBy("name")
      .then((products) => {
        return res.status(200).json(products);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  } else {
    const where = {};
    where["pointset.point"] = point;
    where["stockcurrent.company"] = company;
    knex("stockcurrent")
      .innerJoin("products", {
        "products.id": "stockcurrent.product",
        "products.company": "stockcurrent.company",
      })
      .innerJoin("pointset", { "pointset.stock": "stockcurrent.point" })
      .innerJoin("storeprices", { "storeprices.stock": "stockcurrent.id" })
      .where(where)
      .andWhere(knex.raw("products.category <> ?", [-1]))
      .whereRaw(`lower(products.name||' '||products.code) like (?)`, [
        "%" + productName + "%",
      ])
      .distinct("products.name", "products.id", "products.code")
      .select("storeprices.price")
      .limit(60)
      .orderBy("products.name")
      .then((products) => {
        return res.status(200).json(products);
      })
      .catch((err) => {
        return res.status(500).json(err);
      });
  }
});

////12.01.2023
router.get("/bypointdiscount", (req, res) => {
const productName = req.query.productName ? req.query.productName.toLowerCase() : "";
  const company = req.userData.company;
  const point = req.query.point;
  const barcode = req.query.barcode ? req.query.barcode : "";
  if (!point) return res.status(200).json();
  else {

//////14.03.2023
    knex.raw(`
	 select distinct p.name, p.id, p.code,st.price, s.units, p.attributes
,sum(d.discount) as discount
,(st.price-
 round((st.price/100)*sum(d.discount))) as sumdiscount

 from 
 stockcurrent s 
 inner join products p on (
 p.id=s.product and
 p.company=s.company
 )
 inner join pointset ps on (ps.stock=s.point)
 inner join storeprices st on (st.stock=s.id)
 left join discounts d on (
 s.id=d."object" and d.expirationdate >= current_date
 AND d.isactive is true and s.company=d.company and ps.point=d.point
 )


where 
(p.code = '${barcode}' or  
----(length('${productName}')>3 and
p.name ilike '%${productName}%' 
----)

)

and 
p.deleted=false
and 
 ps.point = ${point}
   and s.company = ${company}
    and p.deleted = false

group by p.name, p.id, p.code,st.price, s.units, p.attributes	
limit 30	
 `)
    .then((products) => {
      return res.status(200).json(products.rows);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
	 
	 /*
	 knex.raw(`
	 
	 select distinct p.name, p.id, p.code,st.price, s.units, p.attributes

,
(select sum(d.discount) from products p1 
inner join stockcurrent s on (
s.product=p1.id and
s.company=p1.company)
left join discounts d on (
s.id=d."object" 
)
where 
p1.code=p.code
and p1.company =p.company
AND d.expirationdate >= current_date
AND d.isactive is true) as discount

,
(
st.price-
round((st.price/100)*(select sum(d.discount) from products p1 
inner join stockcurrent s on (
s.product=p1.id and
s.company=p1.company)
left join discounts d on (
s.id=d."object" 
)
where 
p1.code=p.code
and p1.company =p.company
AND d.expirationdate >= current_date
AND d.isactive is true) 
)
)as sumdiscount
from 
stockcurrent s 
inner join products p on (
p.id=s.product and
p.company=s.company
)
inner join pointset ps on (ps.stock=s.point)
inner join storeprices st on (st.stock=s.id)

where 
(p.code = '${barcode}' or (length('${productName}')>3 and p.name ilike '%${productName}%' ))

and 
p.deleted=false
and 
 ps.point = ${point}
   and s.company = ${company}
    and p.deleted = false
	limit 30
 `)
    .then((products) => {
      return res.status(200).json(products.rows);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
	*/
//////14.03.2023	
	 
	
  }
  
  });



////12.01.2023


router.get("/bypoint", (req, res) => {
  const productName = req.query.productName ? req.query.productName.toLowerCase() : "";
  const company = req.userData.company;
  const point = req.query.point;
  const barcode = req.query.barcode ? req.query.barcode : "";
  if (!point) return res.status(200).json();
  else {
    const where = {};
    where["pointset.point"] = point;
    where["stockcurrent.company"] = company;
    where["products.deleted"] = false;
    knex("stockcurrent")
      .innerJoin("products", {
        "products.id": "stockcurrent.product",
        "products.company": "stockcurrent.company",
      })
      .innerJoin("pointset", { "pointset.stock": "stockcurrent.point" })
      .innerJoin("storeprices", { "storeprices.stock": "stockcurrent.id" })
      .where(where)
      //.andWhere(knex.raw("products.category <> ?", [-1]))
      .whereRaw("products.name ilike (?)", ["%" + productName + "%"])
      .whereRaw("products.code = (?)", [barcode])
      .distinct("products.name", "products.id", "products.code")
      .select("storeprices.price", "stockcurrent.units", "products.attributes")
      .limit(60)
      .orderBy("products.name")
      .then((products) => {
        return res.status(200).json(products);
      })
      .catch((err) => {
        return res.status(500).json(err);
      });
  }
});

//{"company" : 1, "user" : 1, "bonusrate" : { "type" : cat, "rate" : 12, "id" : 1}}
router.post("/change_bonusrate", (req, res) => {
  req.body.company = req.userData.company;
  req.body.user = req.userData.id;

  //20231117 AB change bonusrate for all products <
  if (req.body.bonusrate.type == 'allprod') {
	
	////29.02.2024
    
	 knex
      .raw("select product_bonusrate_management_all(?)", [req.body])
      .then((result) => {
        helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
        result = result.rows[0].product_bonusrate_management_all;
        return res.status(result.code == "success" ? 200 : 500).json(result);
      })
      .catch((err) => {
        return res.status(500).json(err);
    });
	
	/*
	knex('products')
      .where({"company": req.userData.company, "deleted": "false"})
      .update({"bonusrate": req.body.bonusrate.rate})
      .then((result) => {
        console.log(`products.js /change_bonusrate allprod result: ${JSON.stringify(result)}`)
        //helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
        // result = result.rows[0].product_bonusrate_management;
        return res.status(200).json(result);
      })
      .catch((err) => {
        return res.status(500).json(err);
      });
     */

     ////29.02.2024

  }else {
    knex
      .raw("select product_bonusrate_management(?)", [req.body])
      .then((result) => {
        helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
        result = result.rows[0].product_bonusrate_management;
        return res.status(result.code == "success" ? 200 : 500).json(result);
      })
      .catch((err) => {
        return res.status(500).json(err);
    });
  };
    //20231117 AB change bonusrate for all products >
});



router.get("/bonusratebyid", (req, res) => {
  const company = req.userData.company;

  knex("products")
    .where({ "products.company": company, "products.id": req.query.id })
    .select("products.bonusrate")
    .first()
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/bonusratebycategories", (req, res) => {
  const company = req.userData.company;

  knex("categories")
    .where({ "categories.company": company })
    .select(
      "categories.id",
      "categories.name",
      "categories.bonusrate",
      knex.raw(
        "array(select json_build_object('id',p.id,'name',p.name,'bonusrate',bonusrate) from products p where p.company = categories.company and p.category = categories.id and p.bonusrate <> categories.bonusrate) as exception"
      )
    )
    //.first()
    .then((categories) => {
      return res.status(200).json(categories);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

//20230810 by ab
router.get("/bonusrateconflicts", (req, res) => {
  const company = req.userData.company;
  const catId = req.query.catId;
  knex("categories")
    .where({ 
      "categories.company": company 
      , "categories.id": catId
    })
    .select(
      "categories.id",
      "categories.name",
      "categories.bonusrate",
      knex.raw(`
      	array(select json_build_object('id',p.id,'name',p.name,'bonusrate',bonusrate) 
      	from products p 
      	where p.company = categories.company 
      	and p.category = categories.id 
      	and p.bonusrate <> categories.bonusrate
      	) as conflict
      `)	
    )
    //      	and categories.id = '${catId}'
    //.first()
    .then((categories) => {
      return res.status(200).json(categories);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/unitspr", (req, res) => {
  knex("unit_spr")
    .where({ "unit_spr.deleted": false })
    .select(
      "unit_spr.id",
      "unit_spr.name",
      "unit_spr.shortname",
      "unit_spr.fps"
    )
    .orderBy("unit_spr.id")
    .then((unitspr) => {
      return res.status(200).json(unitspr);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//для подтягивания товаров со статичной ценой
router.get("/staticprice/list", (req, res) => {
  const company = req.userData.company;
  const barcode = req.query.barcode;
  const activePage = req.query.activePage;
  const itemsPerPage = req.query.itemsPerPage;
  knex("products")
    .leftJoin("product_static_prices", {
      "products.id": "product_static_prices.product",
      "product_static_prices.company": "products.company",
    })
    .where({ "products.company": company, "products.isstaticprice": "true" })
    .modify(function (p) {
      if (barcode) this.andWhere("products.code", barcode);
    })
    .select(
      "products.id",
      "products.name",
      "products.code",
      "product_static_prices.price as staticprice"
    )
    .orderBy("products.name")
    .limit(itemsPerPage)
    .offset((activePage - 1) * itemsPerPage)
    .then((products) => {
      knex("products")
        .where({
          "products.company": company,
          "products.isstaticprice": "true",
        })
        .modify(function (p) {
          if (barcode) this.andWhere("products.code", barcode);
        })
        .count("products.id")
        .then((itemsCount) => {
          return res
            .status(200)
            .json({ itemsCount: itemsCount[0].count, products });
        })
        .catch((err) => {
          return res.status(500).json(err);
        });
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//для подтягивания товаров со статичной ценой
router.get("/staticprice/listcopy", (req, res) => {
  const company = req.userData.company;
  const barcode = req.query.barcode;
  knex("products")
    .leftJoin("product_static_prices", {
      "products.id": "product_static_prices.product",
      "product_static_prices.company": "products.company",
    })
    .where({ "products.company": company, "products.isstaticprice": "true" })
    .modify(function (p) {
      if (barcode) this.andWhere("products.code", barcode);
    })
    .select(
      "products.id",
      "products.name",
      "products.code",
      "product_static_prices.price as staticprice"
    )
    .orderBy("products.name")
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//для справочника товаров со статичной ценой
router.get("/staticprice/search", (req, res) => {
  const company = req.userData.company;

  const productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";

  knex("products")
    .leftJoin("product_static_prices", {
      "products.id": "product_static_prices.product",
      "product_static_prices.company": "products.company",
    })
    .where({ "products.company": company, "products.isstaticprice": "true" })
    .whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])
    .select(
      "products.id",
      "products.name",
      "products.code",
      "product_static_prices.price as staticprice"
    )
    .limit(50)
    .orderBy("products.name")
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//удаление товара из списока товаров со статичной ценой
router.post("/staticprice/deleteprod", (req, res) => {
  req.body.user = req.userData.id;
  knex
    .raw("select staticprice_deleteprod(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].staticprice_deleteprod;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//{"user":1,"company":1,"product":{"name":"", "category":"", "brand":"", "taxid":"", "unitsprid":"", "piece":"", "pieceinpack":"","":""}}
router.post("/update", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select productspr_update(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].productspr_update.code == "success" ? 200 : 400)
        .json(result.rows[0].productspr_update);
    })
    .catch((err) => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

router.get("/margin", (req, res) => {
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  const isReport = req.query.report ? req.query.report : false;

  const productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";
  
  knex("products as p")
    .leftJoin(
      knex.raw(
        `categories on (categories.id = p.category and categories.company in (p.company,0))`
      )
    )
    .leftJoin("margin_plan as m", {
      "m.object": "p.id",
      "m.type": knex.raw("?", [3]),
      "m.company": "p.company",
      "m.active": knex.raw("?", [true]),
    })
    .leftJoin("brands", { "brands.id": "p.brand" })
    .leftJoin("unit_spr", { "unit_spr.id": "p.unitsprid" })
    .where(function () {
      this.where("p.company", "0").orWhere("p.company", company);
    })
    .andWhere({ "p.deleted": false })
    .whereRaw("lower(p.name) like (?)", ["%" + productName + "%"])
    .modify(function (p) {
      if (!isReport) this.andWhere(knex.raw("p.category <> ?", [-1]));
    })
    //.distinct
    .select(
      "p.name",
      "p.id",
      "p.code",
      "p.category",
      "p.taxid",
      "p.cnofeacode",
      "p.brand",
      "p.unitsprid",
      "p.deleted",
      "p.piece",
      "p.pieceinpack",
      "categories.name as catname",
      "brands.brand as brandname",
      "unit_spr.shortname as unitsprname",
      knex.raw("(case when m.rate is null then 0 else m.rate end) as rate"),
      knex.raw("(case when m.sum is null then 0 else m.sum end) as sum")
    )
    //.select()
    .limit(60)
    //.orderBy("name")
    
  
    .then((products) => {
      //console.log()
      return res.status(200).json(products);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get('/searchbyname', (req,res) => {
  const productName = req.query.productName
  ? req.query.productName.toLowerCase()
  : "";

  const company = req.userData.company;
  
  knex.raw(`select pr.id, pr.name, pr.code
  from products pr
  where pr.name ilike '%${productName}%'
  and pr.company = ${company}
  and not pr.deleted

  -----23.10.2025
  and pr.category <> -1
  -----23.10.2025

  order by pr.name
  limit 60`)
  .then((products) => {
    //console.log()
    return res.status(200).json(products.rows);
  })
  .catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  });
})

//{"user":1,"company":1,"product":{"name":"", "category":"", "brand":"", "taxid":"", "unitsprid":"", "piece":"", "pieceinpack":"","":""}}
router.post("/create", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select productspr_create(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].productspr_create.code == "success" ? 200 : 400)
        .json(result.rows[0].productspr_create);
    })
    .catch((err) => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

router.post("/add_products_barcode", (req,res) => {
  req.body.company = req.userData.company;
  req.body.user = req.userData.id;
  console.log(req.body);
  knex.raw('select add_products_barcode (?)',[req.body])
  .then((result) => {
    console.log(result.rows);
    
    return res.status(result.rows[0].add_products_barcode.code == "success" ? 200: 400)
      .json(result.rows[0].add_products_barcode);

  })
  .catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  })
});






module.exports = router;
