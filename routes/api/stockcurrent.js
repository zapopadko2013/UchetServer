const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");

const router = new express.Router();

router.get("/hasproducts", (req, res) => {
  knex("stockcurrent")
    .innerJoin("points", {
      "points.id": "stockcurrent.point",
      "points.company": "stockcurrent.company",
    })
    .where({ "points.company": req.userData.company })
    .count("stockcurrent.id")
    .first()
    .then((points) => {
      return res.status(200).json(points);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/products", (req, res) => {
  knex("stockcurrent")
    .leftJoin("invoicelist", {
      "invoicelist.stockto": "stockcurrent.id",
      "invoicelist.company": "stockcurrent.company",
    })
    .leftJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "stockcurrent.company",
    })
    .where({
      "invoicelist.invoice": req.query.invoiceNumber,
      "invoicelist.company": req.userData.company,
    })
    .select(
      knex.raw(
        "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ')  as attributescaption"
      ),
      "products.name",
      "stockcurrent.id",
      "products.code",
      "stockcurrent.attributes",
      "stockcurrent.units",
      "invoicelist.units as totalunits"
    )
    // .limit(30)
    .then((products) => {
      return res.status(200).json(products);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/point", (req, res) => {
  if (req.query.barcode) {
    knex("products")
      .innerJoin("stockcurrent", {
        "stockcurrent.product": "products.id",
        "stockcurrent.company": "products.company",
      })
      .innerJoin("points  as p1", {
        "p1.id": "stockcurrent.point",
        "p1.company": "stockcurrent.company",
      })
      .innerJoin("pointset", "pointset.stock", "p1.id")
      .innerJoin("points as p2", {
        "p2.id": "pointset.point",
        "p2.company": "p1.company",
      })
      .where({
        "products.code": req.query.barcode,
        "p1.company": req.userData.company,
      })
      .select(
        "p2.id",
        "stockcurrent.id as stockcurrentid",
        "products.code",
        "products.name",
        "products.id as productID",
        "stockcurrent.attributes",
        knex.raw(
          "array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ')  as attributescaption"
        )
      )
      .then((points) => {
        return res.status(200).json(points);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  } else {
    knex("products")
      .innerJoin("stockcurrent", {
        "stockcurrent.product": "products.id",
        "stockcurrent.company": "products.company",
      })
      .innerJoin("points  as p1", {
        "p1.id": "stockcurrent.point",
        "p1.company": "stockcurrent.company",
      })
      .innerJoin("pointset", "pointset.stock", "p1.id")
      .innerJoin("points as p2", {
        "p2.id": "pointset.point",
        "p2.company": "p1.company",
      })
      .where({
        "products.id": req.query.productId,
        "p1.company": req.userData.company,
        "stockcurrent.attributes": req.query.attributes,
      })
      .select("p2.id", "stockcurrent.id as stockcurrentid")
      .then((points) => {
        return res.status(200).json(points);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  }
});

router.get("/pointprod", (req, res) => {
  knex("products")
    .innerJoin("stockcurrent", {
      "stockcurrent.product": "products.id",
      "stockcurrent.company": "products.company",
    })
    .innerJoin("points  as p1", {
      "p1.id": "stockcurrent.point",
      "p1.company": "stockcurrent.company",
    })
    .innerJoin("pointset", "pointset.stock", "p1.id")
    .innerJoin("points as p2", {
      "p2.id": "pointset.point",
      "p2.company": "p1.company",
    })
    .leftJoin("storeprices", {
      "storeprices.store": "p2.id",
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "p2.company",
    })
    .innerJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })
    .leftJoin("product_static_prices", {
      "products.id": "product_static_prices.product",
      "product_static_prices.company": "products.company",
    })
    ///29.07.2022
    .leftJoin("products_barcode", { "products.id":"products_barcode.product", "products.company": "products_barcode.company", })      
    ///29.07.2022
    .where({
           
      ///29.07.2022
      //"products.code": req.query.barcode,
      //"products.id": req.query.barcode,
      ///29.07.2022
      "products.deleted": false,
      "p1.company": req.userData.company,
    })
        
    ///29.07.2022
    .andWhereRaw(`(products.code='${req.query.barcode}' Or products_barcode.barcode ='${req.query.barcode}') `)
    ///29.07.2022
    
    //.select('p2.id', 'stockcurrent.id as stockcurrentid', 'products.code',
    //	'products.name', 'products.id as productID', 'stockcurrent.attributes',
    //	knex.raw("array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ')  as attributescaption"))
    .groupBy(
      "p2.id",
      "p2.name",
      "p2.address",
      "products.isstaticprice",
      "product_static_prices.price"
    )
    .select(
      knex.raw(`p2.id,p2.name,p2.address,products.isstaticprice,product_static_prices.price as staticprice,
      json_agg(json_build_object('stockcurrentid',stockcurrent.id,'unitspr_shortname',unit_spr.shortname,
      'code',products.code,'name',products.name,'productID',products.id,'attributes',stockcurrent.attributes,
      'price',storeprices.price,'amount',stockcurrent.units,'pieceprice', storeprices.pieceprice, 
      'wholesale_price', storeprices.wholesale_price,'piece',products.piece,			
								'attributescaption',array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes
and a.company = stockcurrent.company),', '))) as info`)
    )
    .then((points) => {
      points.forEach((point) => {
        point.name = helpers.decrypt(point.name);
        point.address = helpers.decrypt(point.address);
      });

      return res.status(200).json(points);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

// select sp.price, pa.purchaseprice
// from stockcurrent s
// inner join pointset ps on (ps.stock = s.point)
// inner join storeprices sp on (sp.store = ps.point and sp.stock = s.id)
// left join product_accounting pa on (pa.product = s.product and pa.id = (
//select max(id) from product_accounting where product = s.product and company = 15 and attributes = s.attributes))
// where s.id = 16

// router.get("/detail", (req, res) => {
//   const purchase = knex("stockcurrent")
//     .innerJoin("product_accounting", {
//       "product_accounting.product": "stockcurrent.product",
//       "product_accounting.company": "stockcurrent.company",
//     })
//     .select(
//       knex.raw("coalesce(product_accounting.purchaseprice,0) as purchaseprice"),
//       "product_accounting.company",
//       "product_accounting.product"
//     )
//     .where({
//       "stockcurrent.company": req.userData.company,
//       "stockcurrent.id": req.query.stockcurrentid,
//     })
//     .andWhere(function () {
//       this.whereIn(
//         "product_accounting.id",
//         knex("product_accounting as pa")
//           .leftJoin("stockcurrent as s", function () {
//             this.on({ "pa.product": "s.product" })
//               .andOn({ "pa.attributes": "s.attributes" })
//               .andOn({ "pa.company": "s.company" });
//           })
//           .where({
//             "pa.company": req.userData.company,
//             "s.id": req.query.stockcurrentid,
//           })
//           .max("pa.id")
//       );
//     })
//     .as("purchase");

//   knex("stockcurrent")
//     .innerJoin("pointset", "pointset.stock", "stockcurrent.point")
//     .leftJoin("products", {
//       "products.id": "stockcurrent.product",
//       "products.company": "stockcurrent.company",
//     })
//     .innerJoin("storeprices", {
//       "storeprices.store": "pointset.point",
//       "storeprices.stock": "stockcurrent.id",
//       "storeprices.company": "stockcurrent.company",
//     })
//     .leftJoin(purchase, {
//       "purchase.product": "stockcurrent.product",
//       "purchase.company": "stockcurrent.company",
//     })
//     .where({
//       "stockcurrent.id": req.query.stockcurrentid,
//       "stockcurrent.company": req.userData.company,
//     })
//     .select(
//       "stockcurrent.id",
//       "stockcurrent.point",
//       "stockcurrent.product",
//       knex.raw("(stockcurrent.units)::float8 as units"),
//       "stockcurrent.attributes",
//       "stockcurrent.sku",
//       "stockcurrent.company",
//       "storeprices.price",
//       "products.category",
//       knex.raw("coalesce(purchase.purchaseprice,0) as purchaseprice")
//     )
//     .modify(function (queryBuilder) {
//       if (req.query.stockcurrentidto) {
//         queryBuilder
//           .leftJoin("storeprices as s", {
//             "storeprices.company": "s.company",
//             "s.stock": parseInt(req.query.stockcurrentidto, 0),
//           })
//           .select("s.price as priceto");
//       }
//     })
//     .first()
//     .then((detail) => {
//       return res.status(200).json(detail);
//     })
//     .catch((err) => {
//       console.log(err);
//       return res.status(500).json(err);
//     });
// });

router.get('/detail', (req, res) => {
  /*knex('stockcurrent')
    .innerJoin('pointset', 'pointset.stock', 'stockcurrent.point')
    .innerJoin('storeprices', function () {
      this.on({ 'storeprices.store': 'pointset.point' }).andOn({ 'storeprices.stock': 'stockcurrent.id', 'storeprices.company': 'stockcurrent.company' })
    })
    .leftJoin('product_accounting', {'product_accounting.product': 'stockcurrent.product', 'product_accounting.company': 'stockcurrent.company'})
    .where({ 'stockcurrent.id': req.query.stockcurrentid })
    .andWhere(function () {
      this.whereIn('product_accounting.id',
        knex('product_accounting as pa')
          .leftJoin('stockcurrent as s', function () {
            this.on({ 'pa.product': 's.product' }).andOn({ 'pa.attributes': 's.attributes' }).andOn({ 'pa.company': 's.company' })
          })
          .where({ 'pa.company': req.userData.company, 's.id': req.query.stockcurrentid})
          .max('pa.id')
      )
    })*/

  const purchase = knex('stockcurrent')
    .innerJoin('product_accounting', { 'product_accounting.product': 'stockcurrent.product', 'product_accounting.company': 'stockcurrent.company' })
    .select(knex.raw('coalesce(product_accounting.purchaseprice,0) as purchaseprice'), 'product_accounting.company', 
    'product_accounting.product')
    .where({ 'stockcurrent.company': req.userData.company, 'stockcurrent.id': req.query.stockcurrentid })
    .andWhere(function () {
      this.whereIn('product_accounting.id',
        knex('product_accounting as pa')
          .leftJoin('stockcurrent as s', function () {
            this.on({ 'pa.product': 's.product' }).andOn({ 'pa.attributes': 's.attributes' }).andOn({ 'pa.company': 's.company' })
          })
          .where({ 'pa.company': req.userData.company, 's.id': req.query.stockcurrentid })
          .max('pa.id')
      )
    })
    .as("purchase");

  knex('stockcurrent')
    .innerJoin('pointset', 'pointset.stock', 'stockcurrent.point')
    .leftJoin('products', { 'products.id': 'stockcurrent.product', 'products.company': 'stockcurrent.company' })
    .innerJoin('storeprices', { 'storeprices.store': 'pointset.point', 'storeprices.stock': 'stockcurrent.id', 'storeprices.company': 'stockcurrent.company' })
    .leftJoin(purchase, { 'purchase.product': 'stockcurrent.product', 'purchase.company': 'stockcurrent.company' })
    .where({ 'stockcurrent.id': req.query.stockcurrentid, 'stockcurrent.company': req.userData.company })
    .select('stockcurrent.id', 'stockcurrent.point', 'stockcurrent.product', knex.raw('(stockcurrent.units)::float8 as units'), 'stockcurrent.attributes',
      'stockcurrent.sku', 'stockcurrent.company', 'storeprices.price', 'products.category', 
      'storeprices.pieceprice', 'storeprices.wholesale_price',
      'products.piece', 'products.unitsprid',
      knex.raw('coalesce(purchase.purchaseprice,0) as purchaseprice'))
    .modify(function (queryBuilder) {
      if (req.query.stockcurrentidto) {
        queryBuilder.leftJoin("storeprices as s", {
          "storeprices.company": "s.company",
          "s.stock": parseInt(req.query.stockcurrentidto, 0),
        })
          .select("s.price as priceto");
      }
    })
    .first()
    .then(detail => {
      return res.status(200).json(detail);
    }).catch((err) => {
      console.log(err)
      return res.status(500).json(err);
    });

})

module.exports = router;
