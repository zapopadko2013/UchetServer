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

  knex.raw(`select * from plu_products 
    where not deleted and company = ${company}
    order by id`)
  .then((result) => {
    return res.status(200).json(result.rows);
  })
  .catch((err) => {
    helpers.log(err);
    return res.status(500).json(err);
});

});


router.post("/manage", (req, res) => {
  req.body.company = req.userData.company;

  knex.raw(`select pluproducts_management(?)`,[req.body])
  .then((result) => {
    return res.status(200).json(result.rows[0].pluproducts_management);
  })
  .catch((err) => {
    helpers.log(err);
    return res.status(500).json(err);

});
});

router.post("/create", (req, res) => {
  req.body.company = req.userData.company;
  req.body.user = req.userData.id;

  knex.raw(`select pluproducts_create(?)`,[req.body])
  .then((result) => {
    return res.status(result.rows[0].pluproducts_create.code == "success" ? 200 : 400).json(result.rows[0].pluproducts_create);
  })
  .catch((err) => {
    helpers.log(err);
    return res.status(500).json(err);
});

});

router.post("/delete", (req, res) => {

  req.body.company = req.userData.company;

  knex.raw(`select pluproducts_delete(?)`,[req.body])
  .then((result) => {
    return res.status(result.rows[0].pluproducts_delete.code == "success" ? 200 : 400).json(result.rows[0].pluproducts_delete);
  })
  .catch((err) => {
    helpers.log(err);
    return res.status(500).json(err);
});

});

router.post("/update", (req, res) => {
  req.body.company = req.userData.company;

  /*knex.raw(`update pluproducts
  set name = '${req.body.name}', taxid = ${req.body.taxid}
  where id = ${req.body.product} and company = ${company}`)*/
  
  knex.raw(`select pluproducts_update(?)`,[req.body])
  
  .then((result) => {
    return res.status(result.rows[0].pluproducts_update.code == "success" ? 200 : 400).json(result.rows[0].pluproducts_update);
  })
  .catch((err) => {
    helpers.serverLog(err);
    return res.status(500).json(err);
});

});



router.get("/names", (req, res) => {

  const company = req.userData.company;
  const name = req.query.name !== null && typeof req.query.name !== undefined ? req.query.name : '';

  knex.raw(`select id, name from products 
    where not deleted and company = ${company} and name ilike '%${name}%' and category = -1
    order by id
    fetch first 30 row only`)
  .then((result) => {
    return res.status(200).json(result.rows);
  })
  .catch((err) => {
    
    return res.status(500).json(err);
  });

});

router.get("/details", (req, res) => {

 
  const id = req.query.id ? req.query.id : 0;

  knex.raw(`select id, code, name, taxid as tax
   from products where id = ${id} and not deleted`)
  .then((result) => {
    return res.status(200).json(result.rows[0]);
  })
  .catch((err) => {
    helpers.log(err);
    return res.status(500).json(err);
});

});

router.get("/productsweight", (req, res) => {

  const scale = req.query.scale ? req.query.scale: 0;

  /*
  knex.raw(`select pr.id, pr.code, pr.name, 
  pc.price as purchaseprice, 
  pc2.price as sellprice, 
  pr.taxid as tax, 
  s.hotkey
  from stockcurrent s
  inner join products pr
  on s.product = pr.id and s.company = pr.company 
  inner join prices pc
  on pc.product = pR.id and pc.company = pR.company and pc.type = 0
  inner join prices pc2
  on pc2.product = pr.id and pc2.company = pr.company and pc2.type = 1
  where pr.company = ${req.userData.company} and s.scale = ${scale} and s.units > 0 
  order by pr.code
  
  `)*/
  knex.raw(`select pr.id, pr.code, pr.name, 
  pc.price as purchaseprice, pc2.price as sellprice, 
  pr.taxid as tax, ps.hotkey, ps.scale, case when s.id is null then false else true end as stock 
    from products pr
    inner join pluproducts_scale ps
    on pr.id = ps.product and pr.company = ps.company
    inner join prices pc
    on pc.product = pr.id and pc.company = pr.company and pc.type = 0
    inner join prices pc2
    on pc2.product = pr.id and pc2.company = pr.company and pc2.type = 1
		left join stockcurrent s
		on s.product = pr.id and pr.attributes = s.attributes and pr.company = s.company
    where pr.company = ${req.userData.company} and ps.scale = ${scale}
    order by ps.id desc`)
  .then((result) => {
    return res.status(200).json(result.rows);
  })
  .catch((err) => {
    
    return res.status(500).json(err);
});

});

router.get("/productsweight/p", (req, res) => {

  const point = req.query.point;
  const scale = req.query.scale;
  const company = req.userData.company;

  knex.raw(`select
	p.id,
	p.code as barcode,
	p.name,
	p.taxid,

	s.hotkey,
	s.units as amount,
	coalesce(max(sp.purchaseprice), 0) as lastpurchaseprice,
	st.price,
	s.id as stockcurrentid
	
from products p

inner join stockcurrent s
on p.id = s.product and p.company = s.company
inner join storeprices as st
on s.id = st.stock and s.company = st.company
right join stockcurrent_part as sp
on p.id = sp.product and p.company = sp.company

where s.point = ${point}
and s.scale = ${scale}
and p.company = ${company}
and not p.deleted
and p.category = -1

and sp.date = (select max(sp4.date) from stockcurrent_part sp4
where sp4.company = sp.company 
and sp4.point = sp.point 
and sp4.product = sp.product
and sp4.attributes = sp.attributes)

group by s.units, st.price, p.id, s.id

order by s.hotkey`)
  .then((result) => {
    return res.status(200).json(result.rows);
  })
  .catch((err) => {
    helpers.log(err);
    return res.status(500).json(err);
});

});


router.get("/scales/search", (req, res) => {

  const scaleName = req.query.scale ? req.query.scale.toLowerCase() : "";
  const point = req.query.point ? req.query.point : -1;
  const company = req.userData.company;


  knex.raw(`select 
	  coalesce(s.id) as id,
  	coalesce(s.name) as name
  from 
	  scale s
  where 
	  not s.deleted and (s.point = ${point} or ${point} = -1)
	  and s.company = ${company} and s.name ilike '%${scaleName}%' 
  order by s.id
  fetch first 30 row only
  `)
  .then((result) => {
    return res.status(200).json(result.rows);
  })
  .catch((err) => {
    helpers.log(err);
    return res.status(500).json(err);
});

});

router.post("/scale/invoice", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select scale_invoice(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].scale_invoice.code == "success" ? 200 : 400)
        .json(result.rows[0].scale_invoice);
    })
    .catch((err) => {
      helpers.log(err);
      return res.status(500).json(err);
    });
});

router.get("/oldproducts", (req, res) => {

  const scale = req.query.scale ? req.query.scale.toLowerCase() : -1;
  const company = req.userData.company;

  const name = req.query.name ? req.query.name : "";
  
  knex.raw(`select 
	distinct pr.id, pr.code, pr.name, s.hotkey
from products pr
inner join stockcurrent s
on pr.id = s.product and pr.company = s.company
where pr.company = ${company} 
and pr.name ilike '%${name}%'
and not pr.deleted
and (s.scale = ${scale} or ${scale} = -1)
order by pr.id
fetch first 30 row only`)
  .then((result) => {
    return res.status(200).json(result.rows);
  })
  .catch((err) => {
    helpers.serverLog(err);
    return res.status(500).json(err);
});

});

router.post("/update/hotkey", (req, res) => {

  req.body.company = req.userData.company;

  knex.raw(`select pluproducts_updatehotkey(?)`,[req.body])
  .then((result) => {
    return res.status(result.rows[0].pluproducts_updatehotkey.code == "success" ? 200 : 400)
    .json(result.rows[0].pluproducts_updatehotkey);
  })
  .catch((err) => {
    helpers.serverLog(err);
    return res.status(500).json(err);
});

});

router.post("/delete/good", (req, res) => {

  req.body.company = req.userData.company;

  knex.raw(`select pluproducts_del(?)`,[req.body])
  .then((result) => {
    return res.status(result.rows[0].pluproducts_del.code == "success" ? 200 : 400)
    .json(result.rows[0].pluproducts_del);
  })
  .catch((err) => {
    helpers.serverLog(err);
    return res.status(500).json(err);
});

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


//сервис для подтягивания доступных штрихкодов
////21.11.2025
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


////21.11.2025

router.post("/excel", (req, res) => {
  const plu_products = req.body.plu_products;

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
    /*
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
    */
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
      data: plu_products, // <-- Report data
    },
  ]);
  // You can then return this straight
  res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
  return res.send(report);
});


module.exports = router;
