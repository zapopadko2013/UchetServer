const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");

const router = new express.Router();

router.get('/', (req, res) => {
	let company = req.query.companyId ? req.query.companyId : req.userData.company
	if (company === "15" && req.query.company) company = req.query.company
	
    let point_id = req.query.id ? req.query.id : -1;

    knex.raw(`
        select p.id, p.name, p.address, p.is_minus, p.status,
            pt.id as point_type, pt.name as point_type_name, c.wholesale
        from companies c, points p, point_types pt
        where c.id = ${company}
            and c.status = 'ACTIVE'
            and (p.id = ${point_id} or ${point_id} = -1)
            and p.company = c.id
            and p.status = 'ACTIVE'
            and p.point_type in (0,1)
            and pt.id = p.point_type
        order by p.point_type, p.id
    `).then(stockList => {
        stockList.rows.forEach(stock => {
            if (stock.point_type !== 0) {
                stock.name = stock.name.substring(0, stock.name.length - 1);
                stock.name = stock.name.substring(13);
                stock.name = 'Склад точки "' + helpers.decrypt(stock.name) + '"';
            }
            stock.address = helpers.decrypt(stock.address);
        });
        return res.status(200).json(stockList.rows);
    }).catch((err) => {
        console.log(err)
        return res.status(500).json(err);
    });
});

router.get("/inactive", (req, res) => {
  let where = {
    "points.company": req.userData.company,
    "points.status": "CLOSE",
  };

  knex("points")
    .join("point_types", { "points.point_type": "point_types.id" })
    .select(
      "points.id",
      "points.name",
      "points.address",
      "point_types.id as point_type",
      "point_types.name as point_type_name",
      "points.is_minus",
      "points.status"
    )
    .where(where)
    .whereIn("points.point_type", [0, 1])
    .orderBy("point_types.id")
    .then((stockList) => {
      stockList.forEach((stock) => {
        if (stock.point_type !== 0) {
          stock.name = stock.name.substring(0, stock.name.length - 1);
          stock.name = stock.name.substring(13);
          stock.name = 'Склад точки "' + helpers.decrypt(stock.name) + '"';
        }
        stock.address = helpers.decrypt(stock.address);
      });
      return res.status(200).json(stockList);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/related", (req, res) => {
  let where = {
    "point.company": req.userData.company,
    "point.status": "ACTIVE",
    "point.id": req.query.pointid,
  };

  knex("points as point")
    .join("pointset", { "point.id": "pointset.point" })
    .join("points as stock", {
      "pointset.stock": "stock.id",
      "point.company": "stock.company",
    })
    .select("stock.name", "stock.address", "stock.status", "stock.id")
    .where(where)
    .then((stockList) => {
      return res.status(200).json(stockList);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

module.exports = router;
