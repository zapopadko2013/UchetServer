const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();
const moment = require("moment");
const excel = require("node-excel-export");

//Новая ревизия
router.get("/listactive", (req, res) => {
  knex.raw(`
  SELECT
	rl."id",
	rl.revisionnumber,
	rl.point,
	ps.point  as pointid,
	rl.company,
	rl.createdate,
	rl.submitdate,
	rl.status,
	rl."admin",
	eu."name",
	pt."name" AS point_name,
  rl."type",
	rl."type_id",
	case rl."type" 
	WHEN 2 THEN (SELECT br.brand FROM brands br WHERE br."id" = rl.type_id) 
	WHEN 3 THEN (SELECT cat."name" FROM categories cat WHERE cat."id" = rl.type_id) 
	ELSE 'По всем товарам' END
	AS type_name 
FROM
	"revision_list" rl
	INNER JOIN erp_users eu ON eu."id" = rl."admin" 
	AND eu.company = rl.company
	INNER JOIN pointset ps ON ps.stock = rl.point
	INNER JOIN points pt ON pt."id" = ps.point 
	AND pt.company = rl.company 
WHERE
	rl.company = ${req.userData.company} 
	AND rl.status = 'ACTIVE'
  `)
    .then((result) => {
      helpers.serverLog(result.rows);
      result.rows.forEach((rev) => {
        rev.name = helpers.decrypt(rev.name);
        rev.point_name = helpers.decrypt(rev.point_name);
        if (rev.point_name === "") rev.point_name = "Центральный склад";
      });
      return res.status(200).json(result.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/points", (req, res) => {
  knex.raw(`
  SELECT
	points."id",
	pointset.stock as stockid,
	points."name"
FROM
	points
	INNER JOIN pointset ON points."id" = pointset.point 
WHERE
points.company = ${req.userData.company}
	and points.status = 'ACTIVE' `)
    .then((result) => {
      result.rows.forEach((point) => {
        point.name = helpers.decrypt(point.name);
        if (point.name == "") point.name = "Центральный склад";
      });
      return res.status(200).json(result.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/revisiontemp/list", (req, res) => {
  const all = req.query.all ? "" : `  AND rt."user" = ${req.userData.id}`
  knex.raw(`
  SELECT
	rt.createdate,
	rt.units,
	rt.point,
	rt."user",
	rt.company,
	rt.product,
	rt."attributes",
	rt.unitswas,
	rt.revisionnumber,
  rt.outofrevision,
	st."id" AS stockid,
	"p".code,
	"p"."name",
  st.units as current_stock,
	array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = st.attributes and a.company = st.company),', ') as attributesCaption
	,array_to_string(array(select a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = st.attributes and a.company = st.company),', ') as attributesMobile
FROM
	"revision_temp" rt
	INNER JOIN stockcurrent st ON ( rt.product = st.product AND st."attributes" = rt."attributes" AND rt.point = st.point )
	INNER JOIN products "p" ON st.product = "p"."id" 
WHERE
    rt.point = ${req.query.point} 
    AND rt.revisionnumber = ${req.query.revisionnumber} 
    ${all}
    ORDER BY rt.editdate DESC`)
    .then((result) => {
      return res.status(200).json(result.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/checkactive", (req, res) => {
  knex.raw(
    `SELECT
    * 
  FROM
    "revision_list" 
  WHERE
    point = ${req.query.point} 
    AND status = 'ACTIVE'`)
    .then((result) => {
      return res.status(200).json(result.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.post('/revisionlist/add', (req, res) => {
  req.body.admin = req.userData.id;
  knex.raw('select revisionlist_add(?)', [req.body])
    .then((result) => {
      return res.status(200).json(result.rows)
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});

router.get("/unitsbybarcode", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const name = req.query.name ? req.query.name : "";
  const barcode = req.query.barcode ? req.query.barcode : "";
  const point = req.query.point;
  const company = req.userData.company;

  knex("stockcurrent")
    .innerJoin("products", "stockcurrent.product", "products.id")
    .innerJoin("pointset", "stockcurrent.point", "pointset.stock")
  
    //15.07.2022
    .leftJoin("products_barcode", { "products.id":"products_barcode.product", "products.company": "products_barcode.company", })      
    //15.07.2022

    .where({
      "pointset.stock": point,
      "stockcurrent.company": company,
      "products.deleted": false,
    })

    
    //15.07.2022
    //.andWhere(knex.raw(`products.name ilike '%${name}%' and products.code ilike '%${barcode}%'`))
    .andWhere(knex.raw(`products.name ilike '%${name}%' and (products.code = '${barcode}' or products_barcode.barcode = '${barcode}'  )`))
    //15.07.2022

    .select(
      "stockcurrent.product",
      "products.name",
      "products.code",
      "stockcurrent.attributes",
      "stockcurrent.units",
      knex.raw(
        `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes),', ') as attrvalue`
      )
    )
    
    ///15.07.2022
    .distinct()
    ///15.07.2022
    
    .then((result) => {
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// router.post('/revisionlist/delete', (req, res) => {
//   const revisionnumber = req.body.revisionnumber;
//   knex.raw(`update revision_list
//   set status = 'CANCELLED'
//   where revisionnumber = ${revisionnumber}`)
//     .then((result) => {
//       return res.status(200).json('{"result":"success"}')
//     })
//     .catch((err) => {
//       return res.status(500).json(err)
//     })
// });

router.post('/revisionlist/delete', (req, res) => {
  //const revisionnumber = req.body.revisionnumber;
  req.body.admin = req.userData.id;
  helpers.serverLog(req.body);
  knex.raw('select revisionlist_delete(?)', [req.body])
    .then((result) => {
      return res.status(200).json(result.rows[0])
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});

router.post('/revisiontemp/update', (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex.raw('select revisiontemp_update(?)', [req.body])
    .then((result) => {
      return res.status(200).json(result.rows)
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});

router.post('/revisiontemp/edit', (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  knex.raw(`update revision_temp
  set units = ?
  where product = ? and revisionnumber = ? and attributes = ?`, [req.body.units, req.body.product, req.body.revnumber, req.body.attributes])
    .then((result) => {
      return res.status(200).json(result)
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});

router.post('/revisiontemp/delete', (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  knex.raw(`delete from revision_temp
  where product = ? and revisionnumber = ? and "user" = ? and "attributes" = ?`, [req.body.product, req.body.revnumber, req.body.user, req.body.attributes])
    .then((result) => {
      return res.status(200).json(result)
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err)
    })
});

router.post('/revisiontemp/insert', (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  knex.raw('select revisiontemp_insert(?)', [req.body])
    .then((result) => {
      return res.status(200).json(result.rows[0].revisiontemp_insert)
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});

router.post('/revisiondiary/add', (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  helpers.serverLog(req.body);
  knex.raw('select revisiondiary_add(?)', [req.body])
    .then((result) => {
      return res.status(200).json(result.rows)
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});

router.post('/revisiontemp/out', (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex.raw('select revisiontemp_out(?)', [req.body])
    .then((result) => {
      return res.status(200).json(result.rows)
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});


router.post("/inrevisiontoexcel", (req, res) => {
  let arr = [];
  req.body.revisionProducts.forEach(element => {
    arr.push({
      ...element,
      new_name: element.name + " " + element.attributescaption
    })
  });
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

  const specification = {
    code: {
      displayName: "Штрих-код",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    new_name: {
      displayName: "Наименование",
      headerStyle: styles.emptyCell,
      width: "50", // <- width in chars (when the number is passed as string)
    },
    units: {
      displayName: "Отсканированное количество",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
  };

  const report = excel.buildExport([
    {
      name: "Товары прошедшие ревизию",
      specification: specification,
      data: arr,
    }
  ]);
  res.attachment("report.xlsx");
  return res.send(report);
});

router.post("/outofrevisiontoexcel", (req, res) => {
  let arr = [];
  req.body.outOfRevisionProducts.forEach(element => {
    arr.push({
      ...element,
      new_name: element.name + (element.attributes !== "0" ? " " + element.attrvalue : "")
    })
  });
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

  const specification = {
    code: {
      displayName: "Штрих-код",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    new_name: {
      displayName: "Наименование",
      headerStyle: styles.emptyCell,
      width: "50", // <- width in chars (when the number is passed as string)
    },
    units: {
      displayName: "Количество",
      headerStyle: styles.emptyCell,
      width: "15", // <- width in chars (when the number is passed as string)
    },
  };

  const report = excel.buildExport([
    {
      name: "Товары не прошедшие ревизию",
      specification: specification,
      data: arr,
    }
  ]);
  res.attachment("report.xlsx");
  return res.send(report);
});

//Старая ревизия

//{company, user, pointid, products: [{prodid,unitswas,time,attribute,units}]}
router.post("/", (req, res) => {
  req.body.company = req.userData.company;
  helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select revision(?)", [req.body])
    .then((result) => {
      result.rows[0].revision
        ? helpers.log(req.originalUrl, result, "success")
        : helpers.log(req.originalUrl, result, "error");
      res
        .status(result.rows[0].revision ? 200 : 400)
        .json(result.rows[0].revision);
      return;
    })
    .catch((err) => {
      helpers.log(req.originalUrl, err, "error");
      helpers.serverLog(req.originalUrl, err, "error");
      res.status(500).json(err);
      return;
    });
});

router.get("/productunits", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const product = req.query.productid;
  const attributes = req.query.attributeid;
  const point = req.query.pointid;
  const company = req.userData.company;

  knex("stockcurrent")
    .innerJoin("pointset", "stockcurrent.point", "pointset.stock")
    .where({
      "stockcurrent.product": product,
      "stockcurrent.attributes": attributes,
      "pointset.point": point,
      "stockcurrent.company": company,
    })
    .select("stockcurrent.units")
    .first()
    .then((result) => {
      helpers.serverLog(req.originalUrl, result, "success");
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/deletetempproduct", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const point = req.query.point;
  const product = req.query.product;
  const attributes = req.query.attributes;
  const user = req.userData.id;
  const company = req.userData.company;

  const maxDateLine = knex("revision_temp").max("createdate").where({
    point: point,
    product: product,
    attributes: attributes,
    company: company,
    user: user,
  });

  knex("revision_temp")
    .whereIn("createdate", knex.raw(maxDateLine))
    .del()
    .then((result) => {
      helpers.serverLog(req.originalUrl, result, "success");
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/temprevproducts", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const point = req.query.point;
  const user = req.userData.id;
  const company = req.userData.company;
  const today = moment(new Date());

  knex("revision_temp")
    .innerJoin("products", "revision_temp.product", "products.id")
    .innerJoin("pointset", "revision_temp.point", "pointset.point")
    .innerJoin("stockcurrent", {
      "stockcurrent.point": "pointset.stock",
      "stockcurrent.company": "revision_temp.company",
      "stockcurrent.product": "revision_temp.product",
      "stockcurrent.attributes": "revision_temp.attributes",
    })
    .where({
      "revision_temp.user": user,
      "revision_temp.company": company,
      "revision_temp.point": point,
    })
    .andWhere(knex.raw("revision_temp.createdate::date"), today.format())
    .select(
      "revision_temp.product",
      "revision_temp.attributes",
      "products.name",
      "products.code",
      "stockcurrent.units",
      knex.raw("now() as date"),
      knex.raw(
        `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = revision_temp.attributes),', ') as attrvalue`
      )
    )
    .sum("revision_temp.units as factUnits")
    .max("revision_temp.createdate as createdate ")
    .groupBy(
      "revision_temp.product",
      "revision_temp.attributes",
      "attrvalue",
      "products.name",
      "products.code",
      "stockcurrent.units"
    )
    .orderBy("createdate", "desc")
    .then((resultRevProducts) => {
      let respJson = {
        code: "success",
        result: [],
        revProducts: resultRevProducts,
      };
      helpers.serverLog(req.originalUrl, respJson, "success");
      return res.status(200).json(respJson);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//сервис для записи данных в темповую таблицу ревизии
//если не передается атрибут и продукт, то идет поиск в стоке по штрихкоду
//если в стоке 0 или более записей возвращаются записи для выбора конкретной
//если в стоке 1 запись то инсертим в темп таблицу ревизии и возвращаем полный список товаров из этой таблицы
//если передается атрибут и продукт, то сразу инсертим его в таблицу и возвращаем список товаров в ней
router.get("/temprevision", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const barcode = req.query.barcode;
  const point = req.query.point;
  const user = req.userData.id;
  const company = req.userData.company;
  const today = moment(new Date());

  const product = req.query.product;
  const attributes = req.query.attributes;

  const insertJson = {
    createdate: knex.fn.now(),
    units: 1,
    point,
    company,
    user,
    product,
    attributes,
  };

  const knexInsert = knex("revision_temp").insert(insertJson).returning("*");

  const knexGetRevProducts = knex("revision_temp")
    .innerJoin("products", "revision_temp.product", "products.id")
    .where({
      "revision_temp.user": user,
      "revision_temp.company": company,
      "revision_temp.point": point,
    })
    .andWhere(knex.raw("revision_temp.createdate::date"), today.format())
    .select(
      "revision_temp.product",
      "revision_temp.attributes",
      "products.name",
      "products.code",
      knex.raw(
        `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = revision_temp.attributes),', ') as attrvalue`
      )
    )
    .sum("revision_temp.units as factUnits")
    .max("revision_temp.createdate as date")
    .groupBy(
      "revision_temp.product",
      "revision_temp.attributes",
      "attrvalue",
      "products.name",
      "products.code"
    )
    .orderBy("date", "desc");

  if (product && attributes) {
    knex
      .raw(`${knexInsert}`)
      .then((insertResult) => {
        helpers.serverLog(req.originalUrl, insertResult, "success");
        knex
          .raw(`${knexGetRevProducts}`)
          .then((resultRevProducts) => {
            let respJson = {
              code: "success",
              result: [],
              revProducts: resultRevProducts.rows,
            };
            return res.status(200).json(respJson);
          })
          .catch((err) => {
            err.inserted = "success";
            helpers.serverLog(req.originalUrl, err, "error");
            return res.status(500).json(err);
          });
      })
      .catch((err) => {
        helpers.serverLog(req.originalUrl, err, "error");
        return res.status(500).json(err);
      });
  } else {
    knex("stockcurrent")
      .innerJoin("products", "stockcurrent.product", "products.id")
      .innerJoin("pointset", "stockcurrent.point", "pointset.stock")
      .where({
        "pointset.point": point,
        "products.code": barcode,
        "stockcurrent.company": company,
      })
      .select(
        "stockcurrent.product",
        "products.name",
        "products.code",
        "stockcurrent.attributes",
        "stockcurrent.units",
        knex.raw(
          `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes),', ') as attrvalue`
        )
      )
      .then((result) => {
        let respJson = { code: "success", result, revProducts: [] };
        if (result.length === 1) {
          insertJson.product = result[0].product;
          insertJson.attributes = result[0].attributes;
          knex
            .raw(`${knexInsert}`)
            .then((insertResult) => {
              helpers.serverLog(req.originalUrl, insertResult, "success");
              knex
                .raw(`${knexGetRevProducts}`)
                .then((resultRevProducts) => {
                  let respJson = {
                    code: "success",
                    result: [],
                    revProducts: resultRevProducts.rows,
                  };
                  return res.status(200).json(respJson);
                })
                .catch((err) => {
                  err.inserted = "success";
                  helpers.serverLog(req.originalUrl, err, "error");
                  return res.status(500).json(err);
                });
            })
            .catch((err) => {
              helpers.serverLog(req.originalUrl, err, "error");
              return res.status(500).json(err);
            });
        } else return res.status(200).json(respJson);
      })
      .catch((err) => {
        helpers.serverLog(req.originalUrl, err, "error");
        return res.status(500).json(err);
      });
  }
});

router.get("/revisionusers", (req, res) => {
  helpers.serverLog(req.originalUrl);
  knex("erp_users")
    .innerJoin("user2roles", "user2roles.user", "erp_users.id")
    .innerJoin("companies", "companies.id", "erp_users.company")
    .where({
      "user2roles.role": 6,
      "erp_users.status": "ACTIVE",
      "companies.status": "ACTIVE",
      "companies.bin": helpers.encrypt(req.query.bin),
    })
    .select("erp_users.id", "erp_users.login", "erp_users.name")
    .then((result) => {
      result.forEach((user) => {
        user.name = helpers.decrypt(user.name);
      });

      const respJson = {
        revisionUsers: result,
      };

      helpers.serverLog(req.originalUrl, respJson, "success");
      return res.status(200).json(respJson);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});



//copy of api/point service and includes central stock
router.get("/point", (req, res) => {
  helpers.serverLog(req.originalUrl);
  knex("points")
    .where({
      "points.company": req.userData.company,
      "points.status": "ACTIVE",
    })
    .whereIn("points.point_type", [0, 2])
    .select("points.id", "points.name", "points.point_type")
    .then((points) => {
      points = points.map((point) => {
        return {
          id: point.id,
          name:
            point.point_type === 2 ? helpers.decrypt(point.name) : point.name,
        };
      });

      helpers.serverLog(req.originalUrl, points, "success");
      return res.status(200).json(points);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/coldrevproducts", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const point = req.query.point;
  const company = req.userData.company;
  const today = moment(new Date());
  const user = req.userData.id;

  knex("revisiondiary")
    .innerJoin("products", "products.id", "revisiondiary.product")
    .innerJoin("pointset", "revisiondiary.point", "pointset.stock")
    .where({
      "pointset.point": point,
      "revisiondiary.company": company,
      "revisiondiary.user": user,
      "revisiondiary.revtype": 0,
      "revisiondiary.submitdate": null,
    })
    .andWhere(knex.raw("revisiondiary.createdate::date"), today.format())
    .select(
      "revisiondiary.product as product",
      "revisiondiary.attributes as attributes",
      "revisiondiary.units as factUnits",
      "revisiondiary.unitswas as units",
      "products.name as name",
      "products.code as code",
      knex.raw(
        `array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = revisiondiary.attributes),', ') as attrvalue`
      ),
      knex.raw("revisiondiary.createdate::text as date")
    )
    .orderBy("revisiondiary.createdate", "desc")
    .then((products) => {
      helpers.serverLog(req.originalUrl, products, "success");
      return res.status(200).json(products);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// delete temporary-table data from revisiondiary during cold revision and manual quantity entry
router.get("/deleterevproducts", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const point = req.query.point;
  const company = req.userData.company;
  const today = moment(new Date());
  const user = req.userData.id;

  knex("revisiondiary")
    .where({
      "revisiondiary.company": company,
      "revisiondiary.user": user,
      "revisiondiary.revtype": 0,
      "revisiondiary.submitdate": null,
    })
    //code below is working similar to 'join':
    //innerJoin("pointset", "revisiondiary.point", "pointset.stock")
    //where({"pointset.point": point})
    .whereIn("point", function () {
      this.select("stock").from("pointset").where("point", point);
    })
    .andWhere(knex.raw("revisiondiary.createdate::date"), today.format())
    .del()
    .then((products) => {
      helpers.serverLog(req.originalUrl, products, "success");
      return res.status(200).json(products);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// delete temporary-table data from revisiondiary during cold revision and scanning in a row
router.get("/deletetemprevproducts", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const point = req.query.point;
  const company = req.userData.company;
  const today = moment(new Date());
  const user = req.userData.id;

  knex("revision_temp")
    .where({
      "revision_temp.user": user,
      "revision_temp.company": company,
      "revision_temp.point": point,
    })
    .andWhere(knex.raw("revision_temp.createdate::date"), today.format())
    .del()
    .then((products) => {
      helpers.serverLog(req.originalUrl, products, "success");
      return res.status(200).json(products);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// difference between data from cold temporary revision table and current stock for revtype 3.
router.get("/comparerevisiontostock", (req, res) => {
  helpers.serverLog(req.originalUrl);
  const point = req.query.point;
  const company = req.userData.company;
  const today = moment(new Date());
  const user = req.userData.id;

  const price = knex.select(
    knex.raw(`round(coalesce((select coalesce(min(sp.purchaseprice),0)
                    from stockcurrent_part as sp 
                      where sp.company = stockcurrent.company
                        and sp.point = stockcurrent.point
                        and sp.product = stockcurrent.product
                        and sp.attributes = stockcurrent.attributes
                        and sp.units > 0
                        and sp.date = (select min(sp2.date)
                                  from stockcurrent_part as sp2
                                    where sp2.company = sp.company
                                      and sp2.point = sp.point
                                      and sp2.product = sp.product   
                                      and sp2.attributes = sp.attributes
                                      and sp2.units > 0)),0)::numeric,2) 
                                      as purchaseprice`)
  );
  ////////////////////

  helpers.serverLog(
    knex("stockcurrent")
      .innerJoin("products", "stockcurrent.product", "products.id")
      .innerJoin("pointset", "stockcurrent.point", "pointset.stock")
      .innerJoin("storeprices", {
        "storeprices.stock": "stockcurrent.id",
        "storeprices.company": "stockcurrent.company",
      })
      .where({
        "pointset.point": point,
        "products.deleted": false,
        "stockcurrent.company": company,
      })
      //.andWhere(knex.raw("products.category <> ?", [-1]))
      .whereNot("stockcurrent.units", 0)
      .select(
        "stockcurrent.product",
        "products.name",
        "products.code",
        "stockcurrent.attributes",
        "stockcurrent.units",
        "storeprices.price as sellprice",
        knex.raw(`(${price})`),
        knex.raw(
          `array_to_string(array(
          select n.values||': '||a.value 
          from attrlist a 
          left join attributenames n 
          on (n.id = a.attribute)
          where a.listcode = stockcurrent.attributes),', ') 
          as attrvalue`
        )
      )
      .whereNotExists(function () {
        this.select(
          "revisiondiary.product as product",
          "revisiondiary.attributes as attributes",
          "revisiondiary.units as factUnits",
          "revisiondiary.unitswas as units",
          "products.name as name",
          "products.code as code",
          knex.raw(
            `array_to_string(array(
            select n.values||': '||a.value 
            from attrlist a 
            left join attributenames n 
            on (n.id = a.attribute) 
            where a.listcode = revisiondiary.attributes),', ') 
            as attrvalue`
          ),
          knex.raw("revisiondiary.createdate::text as date")
        )
          .from("revisiondiary")
          .innerJoin("products", "products.id", "revisiondiary.product")
          .innerJoin("pointset", "revisiondiary.point", "pointset.stock")
          .where({
            "pointset.point": point,
            "revisiondiary.company": company,
            "revisiondiary.user": user,
            "revisiondiary.revtype": 0,
            "revisiondiary.submitdate": null,
          })
          .andWhere(knex.raw("revisiondiary.createdate::date"), today.format())
          .whereRaw("stockcurrent.product = revisiondiary.product");
      })
      .toSQL()
  );

  ///////////////////////////
  knex("stockcurrent")
    .innerJoin("products", "stockcurrent.product", "products.id")
    .innerJoin("pointset", "stockcurrent.point", "pointset.stock")
    .innerJoin("storeprices", {
      "storeprices.stock": "stockcurrent.id",
      "storeprices.company": "stockcurrent.company",
    })
    .where({
      "pointset.point": point,
      "products.deleted": false,
      "stockcurrent.company": company,
    })
    //.andWhere(knex.raw("products.category <> ?", [-1]))
    .whereNot("stockcurrent.units", 0)
    .select(
      "stockcurrent.product",
      "products.name",
      "products.code",
      "stockcurrent.attributes",
      "stockcurrent.units",
      "storeprices.price as sellprice",
      knex.raw(`(${price})`),
      knex.raw(
        `array_to_string(array(
          select n.values||': '||a.value 
          from attrlist a 
          left join attributenames n 
          on (n.id = a.attribute)
          where a.listcode = stockcurrent.attributes),', ') 
          as attrvalue`
      )
    )
    .whereNotExists(function () {
      this.select(
        "revisiondiary.product as product",
        "revisiondiary.attributes as attributes",
        "revisiondiary.units as factUnits",
        "revisiondiary.unitswas as units",
        "products.name as name",
        "products.code as code",
        knex.raw(
          `array_to_string(array(
            select n.values||': '||a.value 
            from attrlist a 
            left join attributenames n 
            on (n.id = a.attribute) 
            where a.listcode = revisiondiary.attributes),', ') 
            as attrvalue`
        ),
        knex.raw("revisiondiary.createdate::text as date")
      )
        .from("revisiondiary")
        .innerJoin("products", "products.id", "revisiondiary.product")
        .innerJoin("pointset", "revisiondiary.point", "pointset.stock")
        .where({
          "pointset.point": point,
          "revisiondiary.company": company,
          "revisiondiary.user": user,
          "revisiondiary.revtype": 0,
          "revisiondiary.submitdate": null,
        })
        .andWhere(knex.raw("revisiondiary.createdate::date"), today.format())
        .whereRaw("stockcurrent.product = revisiondiary.product");
    })
    .then((result) => {
      helpers.serverLog("3");
      helpers.serverLog(req.originalUrl, result, "success");

      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/comparetemprevision", (req, res) => {
  const point = req.query.point;
  const company = req.userData.company;
  const user = req.userData.id;
  const type = req.query.type;


  knex.raw(`select  stockcurrent.product,
  products.name,
  products.code,
  stockcurrent.attributes,
  stockcurrent.units,
  storeprices.price as sellprice,
  products.category,
	products.brand,
	rl.type,
  round(coalesce((select coalesce(min(sp.purchaseprice),0)
                    from stockcurrent_part as sp
                      where sp.company = stockcurrent.company
                        and sp.point = stockcurrent.point
                        and sp.product = stockcurrent.product
                        and sp.attributes = stockcurrent.attributes
                        and sp.units > 0
                        and sp.date = (select min(sp2.date)
                                  from stockcurrent_part as sp2
                                    where sp2.company = sp.company
                                      and sp2.point = sp.point
                                      and sp2.product = sp.product   
                                      and sp2.attributes = sp.attributes
                                      and sp2.units > 0)),0)::numeric,2) 
                                      as purchaseprice,
  array_to_string(array(
    select n.values||': '||a.value
    from attrlist a
    left join attributenames n
    on (n.id = a.attribute)
    where a.listcode = stockcurrent.attributes),', ')
    as attrvalue
  from stockcurrent 
  inner join products on products.id = stockcurrent.product
  left join storeprices on storeprices.stock = stockcurrent.id and  storeprices.company = stockcurrent.company
  inner join revision_list rl on rl.point = stockcurrent.point and rl.company = stockcurrent.company
    and 
		  case
			  when rl.type = 2 then
				  products.brand = rl.type_id
			  when rl.type = 3 then
			  	products.category = rl.type_id
			  else
				  true
		  end
  where stockcurrent.point = ${point} and products.deleted = false and stockcurrent.company = ${company} and stockcurrent.units <> 0 and rl.status = upper('active')
  and not exists (
    select revision_temp.product as product,
        revision_temp.attributes as attributes,
        revision_temp.units as factUnits,
        products.name as name,
        products.code as code,
        array_to_string(array(
              select n.values||': '||a.value
              from attrlist a
              left join attributenames n
              on (n.id = a.attribute)
              where a.listcode = revision_temp.attributes),', ')
              as attrvalue,
			cast(revision_temp.createdate::text as date)
from revision_temp
inner join products on products.id = revision_temp.product 
where
stockcurrent.point = ${point} and
revision_temp.company = ${company} and
stockcurrent.product = revision_temp.product
and stockcurrent.attributes = revision_temp.attributes
)`)
    .then((result) => {
      return res.status(200).json(result.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});


router.post("/excel_difference", (req, res) => {
  const excelDetails = req.body.excelDetails;
  const revisorData = req.body.revisorData;

  helpers.serverLog(excelDetails, revisorData);
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

  const specification = {
    code: {
      displayName: "Штрихкод",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    name: {
      displayName: "Название",
      headerStyle: styles.emptyCell,
      width: "50", // <- width in chars (when the number is passed as string)
    },
    attrvalue: {
      displayName: "Атрибут",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    units: {
      displayName: "Количество",
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
  };

  const merges = [
    { start: { row: 1, column: 1 }, end: { row: 1, column: 10 } },
  ];

  const difference = excel.buildExport([
    // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
    {
      name: "Difference", // <- Specify sheet name (optional)
      heading: heading, // <- Raw heading array (optional)
      merges: merges, // <- Merge cell ranges
      specification: specification, // <- Report specification
      data: excelDetails, // <-- Report data
    },
  ]);
  // You can then return this straight
  res.attachment("difference.xlsx"); // This is sails.js specific (in general you need to set headers)
  return res.send(difference);
});

router.post("/savedifference", (req, res) => {
  //helpers.serverLog(req.query);
  const differenceList = req.body.differenceList;
  const point = req.body.pointid;
  const date = req.body.date;
  const user = req.userData.id;
  const company = req.userData.company;

  let insertJson = differenceList.map((dl) => {
    return {
      barcode: dl.code,
      name: dl.name,
      product: dl.product,
      purchaseprice: dl.purchaseprice,
      sellprice: dl.sellprice,
      units: dl.units,
      date: dl.date,
      attributes: dl.attributes,
      attrvalue: dl.attrvalue,
      company,
      point,
      user,
      revision_submit_date: date,
    };
  });

  const knexInsert = knex("revision_difference").insert(insertJson);
  knex
    .raw(`${knexInsert}`)
    .then((insertResult) => {
      helpers.serverLog(req.originalUrl, insertResult, "success");
      return res.status(200).json(req.originalUrl + " success");
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post('/rev/update', (req, res) => {
  knex
    .raw(`update revisiondiary
  set units = ?
  where product = ?`, [req.body.units, req.body.id])
    .then((result) => {
      return res.status(200).json(result.rows)
    })
    .catch((err) => {
      return res.status(500).json(err)
    })
});

// router.post("/revisionidle", (req, res) => {
//   req.body.company = req.userData.company;
//   helpers.serverLog(req.originalUrl, req.body);

//   knex
//     .raw("select revision_idle(?)", [req.body])
//     .then((result) => {
//       helpers.serverLog(req.originalUrl, result, "success");
//       res
//         .status(result.rows[0].revision_idle ? 200 : 400)
//         .json(result.rows[0].revision_idle);
//       return;
//     })
//     .catch((err) => {
//       helpers.serverLog(req.originalUrl, err, "error");
//       res.status(500).json(err);
//       return;
//     });
// });

module.exports = router;
