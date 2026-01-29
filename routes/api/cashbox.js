const express = require("express");
const fileUpload = require("express-fileupload");
const moment = require("moment");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const excel = require("node-excel-export");

const folder = "./public/pos_update";

const router = new express.Router();
router.use(fileUpload());

router.get("/", (req, res) => {
  knex("cashboxes")
    .join("points", { "cashboxes.point": "points.id" })
    .select(
      "cashboxes.id",
      "cashboxes.name",

      ///29.01.2026
      "cashboxes.kaspiip",      
      ///29.01.2026

      "points.name as point_name",
      "points.id as point"
    )
    .where({ "points.company": req.userData.company, "cashboxes.deleted": "f" })
    .then((cashboxes) => {
      cashboxes.forEach((cashbox) => {
        cashbox.name = helpers.decrypt(cashbox.name);
        cashbox.point_name = helpers.decrypt(cashbox.point_name);
      });
      return res.status(200).json(cashboxes);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/infos", (req,res) =>{
  const company = req.query.company ? req.query.company : req.userData.company;
  const point = req.query.point ? req.query.point : 0;
  const cond = point === 0 ? '' : `where point = ${point}`;
  
  knex.raw(`select * from cashboxes ${cond} order by id;`)
  .then((point) =>{
    point.rows.forEach(elem => {
      
      elem.name = helpers.decrypt(elem.name, 'secret').toString();
    })
    return res.status(200).json(point.rows)
  })
  .catch((err) => {
    console.log(err);
    return  res.status(500).json(err);
  })
});

router.get("/debt_details", (req, res) => {
  let company = req.userData.company;
  if (company === "15") company = req.query.company;
  const shiftnumber = req.query.shiftnumber;

  knex.raw(`
    select tbl.name, tbl.currDebt, (select sum(debt) from debtorsdiary d where d.company = tbl.company and d.customer = tbl.fiz_customerid) as totalDebt
    from
      (select f.firstname||' '||f.lastname as name, t.fiz_customerid, t.company, sum(t.debtpay) as currDebt from 
        transactions t, 
        fiz_customers f
      where t.company = ${company} and shiftnumber = ${shiftnumber} and debtpay > 0
        and t.fiz_customerid = f."id"
        and t.company = f.company
        GROUP BY f.firstname||' '||f.lastname, t.fiz_customerid, t.company) tbl
  `).then((data) => {
      return res.status(200).json(data.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/inactive", (req, res) => {
  knex("cashboxes")
    .join("points", { "cashboxes.point": "points.id" })
    .select(
      "cashboxes.id",
      "cashboxes.name",
      "points.name as point_name",
      ///29.01.2026
      "cashboxes.kaspiip",      
      ///29.01.2026
      "points.id as point"
      
    )
    .where({ "points.company": req.userData.company, "cashboxes.deleted": "t" })
    .then((cashboxes) => {
      cashboxes.forEach((cashbox) => {
        cashbox.name = helpers.decrypt(cashbox.name);
        cashbox.point_name = helpers.decrypt(cashbox.point_name);
      });
      return res.status(200).json(cashboxes);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.post("/manage", (req, res) => {
  req.body.user = req.userData.id;

  req.body.cashbox.name = helpers.encrypt(req.body.cashbox.name);
  req.body.cashbox.point_name = helpers.encrypt(req.body.cashbox.point_name);

  console.log(req.body);

  knex
    .raw("select cashbox_management(?)", [req.body])
    .then((result) => {
      result = result.rows[0].cashbox_management;
      return res.status(result.code == "success" ? 200 : 400).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//выгрузка файла на сервер для обновления
router.post("/upload", (req, res) => {
  let uploadFile = req.files.file;

  const fileName = `${req.files.file.name}`;
  uploadFile.mv(`${folder}/${fileName}`, function (err) {
    if (err) {
      return res.status(500).send(err);
    }

    res.status(200).json({
      file: `${folder}/${fileName}`,
    });
  });
});

//добавление обновления на все кассы
router.get("/updates", (req, res) => {
  const filename = req.query.filename;

  const needupdate = "1";
  req.query.userId = req.userData.id;

  const cashboxes = req.query.cashboxes ? req.query.cashboxes : [];
  
  knex
    .raw(`select nextval('cashbox_update_id_seq')`)
    .then((seqResult) => {
      knex("cashbox_updates")
        .insert(
          knex.raw(
            `select cashboxes.id as cashboxid,
		    			'${filename}' as filenames,
		    			companies.id as company,
		    			${needupdate} as needupdate,
					${seqResult.rows[0].nextval} as id,
		 			now() as createdate
				    from cashboxes 
				    INNER JOIN points on points.id = cashboxes.point and points.status = 'ACTIVE'
				    INNER JOIN companies on companies.id = points.company and companies.status = 'ACTIVE'
				    where cashboxes.deleted=false and cashboxes.isengaged=true
					${cashboxes.length === 0
              ? ""
              : `and cashboxes.id in (select unnest(ARRAY[${cashboxes}]))`
            }`
          )
        )
        .then((result) => {
          return res.status(result.rowCount > 0 ? 200 : 400).json(result);
        })
        .catch((err) => {
          helpers.serverLog(err);
          return res.status(500).json(err);
        });
    })
    .catch((err) => {
      helpers.serverLog(err);
      return res.status(500).json(err);
    });
});

//список компаний с числом необновленных касс
router.get("/updates/info/companies", (req, res) => {
	
  ///06.02.2023	
  const partner_id = req.query.partner_id;	
  ///06.02.2023	
	
  knex(
    knex.raw(`(select p.name,c.* 
	from companies p
	inner join cashbox_updates c on c.company = p.id where partner_id = ${partner_id}) as d
	`)
  )
    .select(
      "d.name",
      "d.company",
      knex.raw(`count(*) filter (where d.needupdate = 1) as needupdateCount`)
    )
    .groupBy("d.company", "d.name")
    .orderBy("d.company")
    .then((result) => {
      result.forEach((company) => {
        company.name = helpers.decrypt(company.name);
      });
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err.stack, "error");
      return res.status(500).json(err);
    });
});

//разбивака касс по точкам со статусом обновления
router.get("/updates/info/details", (req, res) => {
  const company = req.query.company;

  knex(
    knex.raw(
      `(select cashboxid from cashbox_updates where company = ${company} group by cashboxid order by cashboxid)as p`
    )
  ) //"cashbox_updates"
    .innerJoin("cashboxes", "cashboxes.id", "p.cashboxid")
    .innerJoin("points ", {
      "points.id": "cashboxes.point",
      "points.point_type": 2,
    })
    .select(
      "points.name as pointname",
      knex.raw(`json_agg(json_build_object('id',p.cashboxid,'needupdate',
	(case when (select needupdate from cashbox_updates i where i.cashboxid = p.cashboxid and i.needupdate = 1 GROUP BY i.needupdate,i.cashboxid) is null then 0 else 1 end),
	'name',cashboxes.name)) as cashboxes`)
    )
    .groupBy("points.name")
    .then((result) => {
      result.forEach((point) => {
        point.pointname = helpers.decrypt(point.pointname);
        point.cashboxes.forEach((cashbox) => {
          cashbox.name = helpers.decrypt(cashbox.name);
        });
      });
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err.stack, "error2");
      return res.status(500).json(err);
    });
});

//вывод всех обновлений по конкретной кассе
router.get("/updates/info/cashbox", (req, res) => {
  const cashboxid = req.query.cashboxid;

  knex("cashbox_updates")
    .select("cashboxid", "filename", "needupdate", "id", "status")
    .where({ cashboxid })
    .orderBy("id", "desc")
    .then((result) => {
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err.stack, "error");
      return res.status(500).json(err);
    });
});

//севрси для отмены обновления (конкретного обновления на кассе, обновленяня по id, всех обновлений)
router.get("/updates/cancel", (req, res) => {
  const cashboxid = req.query.cashboxid;
  const id = req.query.id;
  const where = { needupdate: 1 };
  if (cashboxid) where.cashboxid = cashboxid;
  if (id) where.id = id;

  knex("cashbox_updates")
    .update({ needupdate: 0, status: "ABORTED" })
    .where(where)
    .then((result) => {
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err.stack, "error");
      return res.status(500).json(err);
    });
});

//список всех обновлений которые должны быть загружены на какие либо кассы
router.get("/updates/info", (req, res) => {
  knex("cashbox_updates")
    .select(
      "id",
      "filename",
      knex.raw(
        `json_build_object('count',(count(*) filter (where needupdate = 1)),
				 'updated',(count(*) filter (where needupdate = 0 and (status <> 'ABORTED' or status is null))),
				 'aborted',(count(*) filter (where needupdate = 0 and status = 'ABORTED'))) as details`
      )
    )
    .groupBy("id", "filename")
    .orderBy("id", "desc")
    .then((result) => {
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err.stack, "error");
      return res.status(500).json(err);
    });
});

//список всех обновлений которые должны быть загружены на какие либо кассы
router.get("/z_report", (req, res) => {


  const cashbox = req.query.cashbox;
  const company = req.userData.company;
  const dateFrom = moment(req.query.dateFrom).format('YYYY-MM-DD');
  const dateTo = req.query.dateTo;
  helpers.serverLog(dateFrom);
  helpers.serverLog(dateTo);
  helpers.serverLog(company);
  helpers.serverLog(cashbox);

  ////////11.01.2024
/*
  knex
    .raw(
      `
  select c.zreport from cashboxdiary c 
    where 
      c.company = ${company} and 
      date(c.operdate) BETWEEN date('${dateFrom}') and date('${dateTo}') and 
      c.opercode = 4 and 
      c.cashbox =${cashbox} and 
      c.zreport is not null
    ORDER BY c.shiftnumber
`
    )
	*/
	
knex
    .raw(
      `
  select c.zreport from cashboxdiary c where c.id in  (
      select id from 
      (
      select c.operdate,max(id) as id from cashboxdiary c 
    where 
      c.company = ${company} and 
      date(c.operdate) BETWEEN date('${dateFrom}') and date('${dateTo}') and 
      c.opercode = 4 and 
      c.cashbox =${cashbox} and 
      c.zreport is not null
      group by c.operdate order by c.operdate desc
      ) t1
)
`
    )	
////////11.01.2024
    .then((result) => {
      const newArr = [];
      result.rows.forEach((e) => {
        newArr.push(e["zreport"]);
      });
      return res.status(200).json(newArr);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err.stack, "error");
      return res.status(500).json(err);
    });
});

router.post("/z_excel", (req, res) => {
  const productsList = req.body.reportsChanged;
  const styles = {
    headerDark: {
      alignment: {
        wrapText: true,
      },
      font: {
        sz: 12,
        bold: true,
      },
    },
  };

  const specification = {
    ShiftNumber: {
      displayName: "Смена",
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    StartDate: {
      displayName: "Открытие Смены", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    UserName: {
      displayName: "Кассир", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    OpenCash: {
      displayName: "Наличные в кассе на начало смены", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    Cash: {
      displayName: "Продажи наличными", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    CRefund: {
      displayName: "Возвраты наличными", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    PKO: {
      displayName: "Приходные кассовые ордера",
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    RKO: {
      displayName: "Расходные кассовые ордера", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    EndDate: {
      displayName: "Закрытие смены", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    CashSumm: {
      displayName: "Наличные в кассе на конец смены", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    Card: {
      displayName: "Продажи картой", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    DebitMinusDebt: {
      displayName: "Продажи безналичными переводами", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    Debt: {
      displayName: "Продажи в долг", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
    Total: {
      displayName: "Итого продаж (нал+картой+перевод+долг)", // мое название
      headerStyle: styles.headerDark,
      width: "15", // <- width in chars (when the number is passed as string)
    },
  };

  const report = excel.buildExport([
    // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
    {
      name: "Report", // <- Specify sheet name (optional)
      // heading, // <- Raw heading array (optional)
      // merges: merges, // <- Merge cell ranges
      specification: specification, // <- Report specification
      data: productsList, // <-- Report data
    },
  ]);
  // You can then return this straight
  res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
  return res.send(report);
});

module.exports = router;
