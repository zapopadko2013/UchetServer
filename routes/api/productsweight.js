const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();
const fs = require("fs");
const excel = require("node-excel-export");
var iconv = require("iconv-lite");

//products weigth based on point and scale
router.get("/", (req, res) => {
  const point = req.query.point;
  const scale = req.query.scale;
  const company = req.userData.company;

  knex("products as p")
    .innerJoin("stockcurrent as s", {
      "p.id": "s.product",
      "p.company": "s.company",
    })
    .innerJoin("storeprices as st", {
      "s.id": "st.stock",
      "s.company": "st.company",
    })

    .rightJoin("stockcurrent_part as sp", {
      "p.id": "sp.product",
      "p.company": "sp.company",
    })
    .where({
      "s.point": point,
      "s.scale": scale,
      "p.company": company,
      "p.deleted": false,
      "p.category": -1,
    })
    .andWhere({
      "sp.date": knex("stockcurrent_part as sp4")
        .max("sp4.date")
        .andWhereRaw("sp4.company = sp.company")
        .andWhereRaw("sp4.point = sp.point")
        .andWhereRaw("sp4.product = sp.product")
        .andWhereRaw("sp4.attributes = sp.attributes"),
    })
    .select(
      "s.units as amount",
      "p.code as barcode",
      "s.hotkey",
      "p.id",
      knex.raw(` coalesce(max(sp.purchaseprice), 0) as lastpurchaseprice`),
      "p.name",
      "st.price",
      "p.taxid",
      "s.id as stockcurrentid"
    )
    .groupBy("s.units", "st.price", "p.id", "s.id")
    .orderBy("s.hotkey")
    .then((productsweightOld) => {
      return res.status(200).json(productsweightOld);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

//сервис для подтягивания доступных штрихкодов
/* router.get("/barcode_unused", (req, res) => {
  const company = req.userData.company;
  //генерит числа от 1 до максимального штрихкода и находит те, которые не входили в серию
  knex
    .raw(
      `select
      tb.code::bigint
    from
      (
      select
        generate_series(1, Max(substring(code from 3 for 5)::bigint)) as code
      from
        products where category=-1 and deleted=false and company=${company}) tb
    where
      tb.code not in (
      select
        substring(code from 3 for 5)::bigint
      from
        products
      where
        company=${company} and category=-1 and deleted=false)
      and tb.code not in(
      select
        substring(code from 3 for 5)::bigint
      from
        products_temp pwi
      where
        company=${company} and category=-1)`
    )
    .then((series) => {
      let barcodes = series.rows;
      //меняет их на целочисленные
      const seriesToInt = barcodes.map((u) => {
        return parseInt(u.code, 0);
      });
      //находит среди них максимальный(для сравнения ниже)
      function getMaxOfArray(numArray) {
        return Math.max.apply(null, numArray);
      }
      const maxRes = getMaxOfArray(seriesToInt);
      //сервис для нахождения двух максимальных штрихкодов из двух таблиц среди уже недоступных
      knex("products as p")
        .where({
          "p.company": company,
          "p.deleted": false,
          "p.category": -1,
        })
        .max(knex.raw("substring(code from 3 for 5)::bigint"))
        .union([
          knex("products_temp as pwi")
            .where({
              "pwi.company": company,
              "pwi.category": -1,
              "pwi.unitsprid": 6,
            })
            .max(knex.raw("substring(code from 3 for 5)::bigint")),
        ])
        .then((b) => {
          //переводит в целочисленное и находит максимальный из двух таблиц
          const m1 = parseInt(b[0].max, 0);
          const m2 = parseInt(b[1].max !== null ? b[1].max : 0, 0);
          const max2 = m1 > m2 ? m1 : m2;
          // если есть максимальный и он больше сгенерируемого максимального, то использовать его...
          if (max2 !== null && max2 > maxRes) {
            barcodes.push({ code: max2 + 1 });
            return res.status(200).json(barcodes);
            // иначе, если он не больше другого макс. - использовать в качестве последнего доступного штрихкода сгенерируемый.
          } else if (maxRes !== null) {
            return res.status(200).json(barcodes);
          } // если не находит максимальный, то ищет его среди не темповой(товары уже выгруженные на кассу) таблицы
          else {
            knex("products as p")
              .innerJoin("stockcurrent as s", {
                "p.id": "s.product",
              })
              .where({
                "p.company": company,
                "p.category": -1,
                "s.isdeleted": false,
              })
              .whereNotNull("s.hotkey")
              .max("substring(p.code from 3 for 5)::bigint")
              .then((b2) => {
                const max3 = parseInt(b2[0].max);
                // проделывает то же самое с сравнениями, но уже с другим значением макс.
                if (max3 !== null && max3 > maxRes) {
                  barcodes.push({ code: max3 + 1 });
                  return res.status(200).json(barcodes);
                } else if (maxRes !== null) {
                  return res.status(200).json(barcodes);
                }
              })
              .catch((err) => {
                helpers.serverLog(err);
                return res.status(500).json(err);
              });
          }
        })
        .catch((err) => {
          helpers.serverLog(err);
        });
    })
    .catch((err) => {
      helpers.serverLog("err:", err);
      knex("products_weight as p")
        .where({
          "p.company": company,
          "p.isdeleted": false,
        })
        .max("p.barcode")
        .then((b) => {
          if (b[0].max !== null) {
            return res.status(200).json(parseInt(b[0].max) + 1);
          } else {
            knex("products as p")
              .innerJoin("stockcurrent as s", {
                "p.id": "s.product",
              })
              .where({
                "p.company": company,
                "p.category": -1,
                "s.isdeleted": false,
              })
              .whereNotNull("s.hotkey")
              .max("substring(code from 3 for 5)::bigint")
              .then((b2) => {
                return res.status(200).json(parseInt(b2[0].max) + 1);
              })
              .catch((err) => {
                helpers.serverLog(err);
                return res.status(500).json(err);
              });
          }
        })
        .catch((err) => {
          helpers.serverLog(err);
        });
    });
}); */

/* ///
router.get("/barcode_unused", async (req, res) => {
  const company = req.userData.company;

  try {
    // 1. Свободные штрихкоды
    const seriesResult = await knex.raw(
      `
      WITH max_code AS (
        SELECT COALESCE(MAX(substring(p.code from 3 for 5)::bigint), 0) AS max_code
        FROM products p
        WHERE p.category = -1 AND p.deleted = false AND p.company = ?
      ),
      series AS (
        SELECT generate_series(1, (SELECT max_code FROM max_code)) AS code
      ),
      used AS (
        SELECT substring(p.code from 3 for 5)::bigint AS code
        FROM products p
        WHERE p.company = ? AND p.category = -1 AND p.deleted = false
        UNION
        SELECT substring(pt.code from 3 for 5)::bigint
        FROM products_temp pt
        WHERE pt.company = ? AND pt.category = -1
      )
      SELECT s.code
      FROM series s
      WHERE s.code NOT IN (SELECT code FROM used)
      ORDER BY s.code
      `,
      [company, company, company]
    );

    const barcodes = seriesResult.rows.map(r => ({ code: Number(r.code) }));
    const maxRes = barcodes.length ? Math.max(...barcodes.map(b => b.code)) : 0;

    // 2. Максимальные коды из products + products_temp
    const maxTwo = await knex("products as p")
      .where({ "p.company": company, "p.deleted": false, "p.category": -1 })
      .max({ max: knex.raw("substring(p.code from 3 for 5)::bigint") })
      .union([
        knex("products_temp as pt")
          .where({ "pt.company": company, "pt.category": -1, "pt.unitsprid": 6 })
          .max({ max: knex.raw("substring(pt.code from 3 for 5)::bigint") }),
      ]);

    const m1 = parseInt(maxTwo[0]?.max || 0);
    const m2 = parseInt(maxTwo[1]?.max || 0);
    const max2 = Math.max(m1, m2);

    if (max2 > maxRes) {
      barcodes.push({ code: max2 + 1 });
      return res.status(200).json(barcodes);
    } else if (maxRes) {
      return res.status(200).json(barcodes);
    }

    // 3. Проверка через stockcurrent
    const b2 = await knex("products as p")
      .innerJoin("stockcurrent as s", { "p.id": "s.product" })
      .where({ "p.company": company, "p.category": -1, "p.deleted": false })
      .max({ max: knex.raw("substring(p.code from 3 for 5)::bigint") });

    const max3 = parseInt(b2[0]?.max || 0);
    if (max3 > maxRes) {
      barcodes.push({ code: max3 + 1 });
      return res.status(200).json(barcodes);
    } else if (maxRes) {
      return res.status(200).json(barcodes);
    }

    // 4. Если ничего нет, вернуть 1
    return res.status(200).json([{ code: 1 }]);

  } catch (err) {
    helpers.serverLog(err);

    try {
      // fallback по products_weight
      const b = await knex("products_weight as p")
        .where({ "p.company": company, "p.isdeleted": false })
        .max({ max: knex.raw("p.barcode") });

      if (b[0]?.max != null) {
        return res.status(200).json([parseInt(b[0].max) + 1]);
      }

      // последний fallback по products + stockcurrent
      const b2 = await knex("products as p")
        .innerJoin("stockcurrent as s", { "p.id": "s.product" })
        .where({ "p.company": company, "p.category": -1, "p.deleted": false })
        .max({ max: knex.raw("substring(p.code from 3 for 5)::bigint") });

      return res.status(200).json([parseInt(b2[0]?.max || 0) + 1]);

    } catch (err2) {
      helpers.serverLog(err2);
      return res.status(500).json(err2);
    }
  }
});
/// */

router.get("/barcode_unused", async (req, res) => {
  const company = req.userData.company;

  try {
    // 1. CTE: объединяем все коды из products и products_temp
    const freeSeries = await knex.raw(
      `
      WITH combined AS (
        SELECT COALESCE(substring(code FROM 3 FOR 5)::bigint,0) AS code
        FROM products
        WHERE company = ? AND category = -1 AND deleted = false
        UNION
        SELECT COALESCE(substring(code FROM 3 FOR 5)::bigint,0) AS code
        FROM products_temp
        WHERE company = ? AND category = -1
      ),
      max_code AS (
        SELECT COALESCE(MAX(code), 0) AS max_code
        FROM combined
      ),
      series AS (
        SELECT generate_series(1, (SELECT max_code FROM max_code)) AS code
      )
      SELECT s.code
      FROM series s
      WHERE NOT EXISTS (
        SELECT 1 FROM combined c WHERE c.code = s.code
      )
      ORDER BY s.code;
      `,
      [company, company]
    );

    // Список свободных кодов
    const barcodes = freeSeries.rows.map(r => ({ code: Number(r.code) }));

    if (barcodes.length > 0) return res.status(200).json(barcodes);

    // 2. Если свободных нет, берём следующий по порядку из products + products_temp
    const maxProducts = await knex("products as p")
      .where({ "p.company": company, "p.deleted": false, "p.category": -1 })
      .max({ max_code: knex.raw("COALESCE(substring(p.code FROM 3 FOR 5)::bigint, 0)") });

    const maxTemp = await knex("products_temp as pt")
      .where({ "pt.company": company, "pt.category": -1 })
      .max({ max_code: knex.raw("COALESCE(substring(pt.code FROM 3 FOR 5)::bigint, 0)") });

    const maxNext = Math.max(
      parseInt(maxProducts[0]?.max_code || 0),
      parseInt(maxTemp[0]?.max_code || 0)
    );

    if (maxNext > 0) return res.status(200).json([{ code: maxNext + 1 }]);

    // 3. Проверка через stockcurrent
    const stockMax = await knex("products as p")
      .innerJoin("stockcurrent as s", { "p.id": "s.product" })
      .where({ "p.company": company, "p.category": -1, "p.deleted": false })
      .max({ max_code: knex.raw("COALESCE(substring(p.code FROM 3 FOR 5)::bigint, 0)") });

    if (stockMax[0]?.max_code > 0) return res.status(200).json([{ code: Number(stockMax[0].max_code) + 1 }]);

    // 4. fallback по products_weight
    const weightMax = await knex("products_weight as p")
      .where({ "p.company": company, "p.isdeleted": false })
      .max({ max: "p.barcode" });

    if (weightMax[0]?.max != null) return res.status(200).json([{ code: Number(weightMax[0].max) + 1 }]);

    // 5. Если совсем ничего нет, вернуть 1
    return res.status(200).json([{ code: 1 }]);

  } catch (err) {
    helpers.serverLog(err);
    return res.status(500).json({ error: "Server error", details: err });
  }
});



//выгрузка PLU
router.post("/to-text", (req, res) => {
  const arr = req.body.arr;
  const date = req.body.date;
  const type = req.body.type;

  var file = fs.createWriteStream(`./public/products_weight/${date}`);

  file.on("error", function (err) {
    return res.status(500).json(err);
  });
  arr.forEach(function (v) {
    //китайские весы не научились распознавать символ `я` в конце наименования товара.
    const lastChar = v[1].slice(-1);
    if (lastChar === "я") {
      v[1] = v[1] + ".";
    }
    //если выбран тип весов штрих-принт, он будет менять формат тип шифрования файла на win1251 вместо utf-8.
    type === 0
      ? file.write(v.join(",") + "\n")
      : file.write(iconv.encode(v.join(",") + "\n", "win1251"));
  });

  file.end();
  return res.send(file);
});

router.get("/download", (req, res) => {
  const date = req.query.date;
  const type = req.query.type;
  let file_path = `./public/products_weight/${date}`;

  if (type !== "0") {
    //если выбран тип весов штрих-принт, он будет менять "file-ending" файла на windows CRLF, потому что Unix LF не поддерживается.
    const readWriteAsync = () => {
      fs.readFile(file_path, null, function (err, data) {
        if (err) throw err;

        const message = iconv.decode(data, "cp1251").toString();
        const newValue = message.replace(/\r\n/gm, "\n").replace(/\n/g, "\r\n");
        const newMessage = iconv.encode(newValue, "win1251");

        fs.writeFile(file_path, newMessage, function (err) {
          if (err) throw err;
          res.download(file_path);
        });
      });
    };
    readWriteAsync();
  } else res.download(file_path);
});

//{company, user, pointid, products: [{prodid,unitswas,time,attribute,units}]}
router.post("/add_temp", (req, res) => {
  req.body.company = req.userData.company;

  knex
    .raw("select productsweight_add(?)", [req.body])
    .then((result) => {
      res
        .status(result.rows[0].productsweight_add ? 200 : 400)
        .json(result.rows[0].productsweight_add);
      return;
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      res.status(500).json(err);
      return;
    });
});

router.post("/delete_temp", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select productsweight_delete(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].productsweight_delete;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//{company, user, pointid, products: [{prodid,unitswas,time,attribute,units}]}
router.post("/edit_temp", (req, res) => {
  req.body.company = req.userData.company;

  knex
    .raw("select productsweight_edit(?)", [req.body])
    .then((result) => {
      res
        .status(result.rows[0].productsweight_edit ? 200 : 400)
        .json(result.rows[0].productsweight_edit);
      return;
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      res.status(500).json(err);
      return;
    });
});

router.post("/add", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select weightgoods_add(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].weightgoods_add;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//get scale reference
router.get("/scales", (req, res) => {
  const company = req.userData.company;
  const point = req.query.point;

  knex("scale as s")
    .where({
      "s.company": company,
      "s.point": point,
    })
    .select("s.id", "s.name", "s.deleted")
    .orderBy("s.name")
    .then((scales) => {
      return res.status(200).json(scales);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

//service for scale spr with limit and search word
router.get("/scales/search", (req, res) => {
  const point = req.query.point;
  const scaleName = req.query.scale ? req.query.scale.toLowerCase() : "";
  const searchQuery = "%" + scaleName + "%";
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  knex("scale as s")
    .where({ "s.deleted": false, "s.point": point })
    .whereIn("s.company", [company, 0])
    .whereRaw("lower(s.name) like (?)", [searchQuery])
    .select(
      knex.raw("coalesce(s.name) as name"),
      knex.raw("coalesce(s.id) as id")
    )
    .limit(30)
    .orderBy("name")
    .then((scales) => {
      return res.status(200).json(scales);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//{"user": 1, "scale": {"id": 1, "name": "Морковка", "deleted": false}}
router.post("/update_scales", (req, res) => {
  req.body.user = req.userData.id;

  knex
    .raw("select scales_management(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].scales_management.code == "success" ? 200 : 400)
        .json(result.rows[0].scales_management);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//get id's and other info after successfully creating invoice
router.post("/parse_information", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select productsweight_parse(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].productsweight_parse;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

// { user: 1, company: 15, product: 1 }
router.post("/del", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select weightgoods_del(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].weightgoods_del;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

// { user: 1, company: 15, product: 1 }
router.post("/detail", (req, res) => {
  knex("stockcurrent")
    .innerJoin("pointset", "pointset.stock", "stockcurrent.point")
    .innerJoin("storeprices", function () {
      this.on({ "storeprices.store": "pointset.point" }).andOn({
        "storeprices.stock": "stockcurrent.id",
        "storeprices.company": "stockcurrent.company",
      });
    })
    .leftJoin("product_accounting", {
      "product_accounting.product": "stockcurrent.product",
      "product_accounting.company": "stockcurrent.company",
    })
    .where({ "stockcurrent.id": req.query.stockcurrentid })
    .andWhere(function () {
      this.whereIn(
        "product_accounting.id",
        knex("product_accounting as pa")
          .leftJoin("stockcurrent as s", function () {
            this.on({ "pa.product": "s.product" })
              .andOn({ "pa.attributes": "s.attributes" })
              .andOn({ "pa.company": "s.company" });
          })
          .where({
            "pa.company": req.userData.company,
            "s.id": req.query.stockcurrentid,
          })
          .max("pa.id")
      );
    })
    .select(
      "stockcurrent.id",
      "stockcurrent.point",
      "stockcurrent.product",
      knex.raw("(stockcurrent.units)::float8 as units"),
      "stockcurrent.attributes",
      "stockcurrent.sku",
      "stockcurrent.company",
      "storeprices.price",
      "product_accounting.purchaseprice"
    )
    .first()
    .then((detail) => {
      return res.status(200).json(detail);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

//get weight products for specific scales and company
router.get("/oldproducts", (req, res) => {
  let company = req.userData.company;
  const scale = req.query.scale;
  if (company === "15" && req.query.company) company = req.query.company;

  const productName = req.query.productName
    ? req.query.productName.toLowerCase()
    : "";

  knex("products")
    .innerJoin("stockcurrent as s", {
      "products.id": "s.product",
      "products.company": "s.company",
    })
    .where(function () {
      this.where("products.company", "0").orWhere("products.company", company);
    })
    .whereRaw("lower(products.name) like (?)", ["%" + productName + "%"])
    .andWhere({ "products.deleted": false, "s.scale": scale })
    .modify(function (p) {
      this.andWhere(knex.raw("products.category = ?", [-1]));
    })
    .distinct("products.name", "products.id", "products.code", "s.hotkey")
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

//update hotkeys
router.post("/updatehotkey", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select productsweight_updatehotkey(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].productsweight_updatehotkey;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

//update hotkeys
router.post("/create_prefix", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select create_prefix(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].create_prefix;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      helpers.serverLog("create_prefix: ", err);
      return res.status(500).json(err);
    });
});

router.post("/excel", (req, res) => {
  const productsList = req.body.productsListChanged;

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

  // const heading = [[{ value: excelDetails, style: styles.header }]];

  const specification = {
    hotkey: {
      displayName: "Номер на весах",
      headerStyle: styles.emptyCell,
      width: "5", // <- width in chars (when the number is passed as string)
    },
    barcode: {
      displayName: "штрихкод",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
    },
    name: {
      displayName: "Наименование товара",
      headerStyle: styles.emptyCell,
      width: "40", // <- width in chars (when the number is passed as string)
    },
    lastpurchaseprice: {
      displayName: "Цена закупа(1кг.)",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    price: {
      displayName: "Цена продажи(1кг.)",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    amount: {
      displayName: "Количество",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    total_purchaseprice: {
      displayName: "Итого цена закупки",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    total_price: {
      displayName: "Итого цена продажи",
      headerStyle: styles.emptyCell,
      width: "10", // <- width in chars (when the number is passed as string)
    },
    taxid: {
      displayName: "НДС",
      headerStyle: styles.emptyCell,
      width: "20", // <- width in chars (when the number is passed as string)
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
      name: "Report", // <- Specify sheet name (optional)
      //heading: heading, // <- Raw heading array (optional)
      merges: merges, // <- Merge cell ranges
      specification: specification, // <- Report specification
      data: productsList, // <-- Report data
    },
  ]);
  // You can then return this straight
  res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
  return res.send(report);
});

module.exports = router;
