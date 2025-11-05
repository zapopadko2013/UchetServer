const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const fs = require("fs");
const router = new express.Router();
const excel = require("node-excel-export");
var iconv = require("iconv-lite");

router.get("/points", (req, res) => {
    let company = req.query.companyId ? req.query.companyId : req.userData.company
    if (company === "15" && req.query.company)
        company = req.query.company

    let where = { 'points.company': company, 'points.status': 'ACTIVE' };

    if (req.query.id) where['points.id'] = req.query.id;

    knex('points').join('point_types', { 'points.point_type': 'point_types.id' })
        .select('points.id', 'points.name', 'points.address',
            'point_types.id as point_type', 'point_types.name as point_type_name',
            'points.is_minus', 'points.status')
        .where(where)
        .whereIn('points.point_type', [0, 1])
        .orderBy('points.point_type')
        .orderBy('points.id')
        .then(stockList => {
            stockList.forEach(stock => {
                if (stock.point_type !== 0) {
                    stock.name = stock.name.substring(0, stock.name.length - 1);
                    stock.name = stock.name.substring(13);
                    stock.name = 'Склад точки "' + helpers.decrypt(stock.name) + '"';
                }
                stock.address = helpers.decrypt(stock.address);
            });

            return res.status(200).json(stockList);
        }).catch((err) => {
            console.log(err)
            return res.status(500).json(err);
        });
});

router.get('/stock', (req, res) => {
    helpers.serverLog(req.query.pointid);
    const point = req.query.pointid;
    knex.raw(`
    SELECT
	p.code,
	p.name 
FROM
	stockcurrent s 
	INNER JOIN products p ON p.id = s.product
WHERE
    s.point = ${point}
    GROUP BY
	p.code,
	p.NAME
    `)
        .then(products => {
            return res.status(200).json(products.rows);
        }).catch((err) => {
            helpers.serverLog(err)
            return res.status(500).json(err);
        });
});

router.post("/to-text", (req, res) => {
    const arr = req.body.arr;
    const date = req.body.date;
    const type = req.body.type;

    let file = fs.createWriteStream(`./public/reconciliation/${date}`);

    file.on("error", function (err) {
        return res.status(500).json(err);
    });
    arr.forEach(function (v) {
        file.write(iconv.encode(v.join(";") + ";\n", "win1251"))
    });
    file.end();
    return res.send(file);
});

router.get("/download", (req, res) => {
    const date = req.query.date;
    let file_path = `./public/reconciliation/${date}`;
    res.download(file_path);
});

router.post("/create", (req, res) => {
    const data = {
        company: parseInt(req.userData.company),
        point: parseInt(req.body.point),
        user: parseInt(req.userData.id),
        out_data: req.body.out_data
    }
    helpers.serverLog(data);
    knex
        .raw("select create_reconciliation(?)", [data])
        .then((result) => {
            return res.status(result.rows[0].create_reconciliation.code == "success" ? 200 : 500).json(result);
        })
        .catch((err) => {
            helpers.serverLog(err);
            return res.status(500).json(err);
        });
});

router.get('/active', (req, res) => {
    const point = req.query.pointid;
    knex.raw(`
    SELECT
	* 
FROM
	reconciliation r 
WHERE
	r.status = 0 
	AND r.point = ${point}
    `)
        .then(reconciliation => {
            return res.status(200).json(reconciliation.rows);
        }).catch((err) => {
            helpers.serverLog(err)
            return res.status(500).json(err);
        });
});

router.post("/delete", (req, res) => {
    const data = {
        id: parseInt(req.body.id),
        user: parseInt(req.userData.id)
    }
    helpers.serverLog(data);
    knex
        .raw("select del_reconciliation(?)", [data])
        .then((result) => {
            return res.status(result.rows[0].del_reconciliation.code == "success" ? 200 : 500).json(result);
        })
        .catch((err) => {
            helpers.serverLog(err);
            return res.status(500).json(err);
        });
});

router.post("/upload", (req, res) => {
    const data = {
        id: parseInt(req.body.id),
        user: parseInt(req.userData.id),
        in_data: req.body.in_data
    }
    helpers.serverLog(data);
    knex
        .raw("select upload_reconciliation(?)", [data])
        .then((result) => {
            return res.status(result.rows[0].upload_reconciliation.code == "success" ? 200 : 500).json(result.rows[0].upload_reconciliation);
        })
        .catch((err) => {
            helpers.serverLog(err);
            return res.status(500).json(err);
        });
});

router.post("/execute", (req, res) => {
    const data = {
        id: parseInt(req.body.id),
    }
    knex
        .raw("select execute_reconciliation(?)", [data])
        .then((result) => {
            return res.status(result.rows[0].execute_reconciliation.code == "success" ? 200 : 500).json(result.rows[0].execute_reconciliation);
        })
        .catch((err) => {
            helpers.serverLog(err);
            return res.status(500).json(err);
        });
});

router.post("/none_toexcel", (req, res) => {
    let arr = req.body.prods;

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
        n: {
            displayName: "",
            headerStyle: styles.emptyCell,
            width: "5", // <- width in chars (when the number is passed as string)
        },
        code: {
            displayName: "Штрих-код",
            headerStyle: styles.emptyCell,
            width: "20", // <- width in chars (when the number is passed as string)
        },
        name: {
            displayName: "Наименование",
            headerStyle: styles.emptyCell,
            width: "50", // <- width in chars (when the number is passed as string)
        },
        stock_units: {
            displayName: "Остаток на складе",
            headerStyle: styles.emptyCell,
            width: "20", // <- width in chars (when the number is passed as string)
        }
    };

    const report = excel.buildExport([
        {
            name: "Не прошедшие сверку",
            specification: specification,
            data: arr,
        }
    ]);
    res.attachment("report.xlsx");
    return res.send(report);
});

router.post("/toexcel", (req, res) => {
    let reconciliation = req.body.summDataResult;
    let arr = [];
    reconciliation.forEach(element => {
        arr.push({ ...element, difference: element.stock_units + element.sale_units - element.tsd_units })
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
        name: {
            displayName: "Наименование",
            headerStyle: styles.emptyCell,
            width: "50", // <- width in chars (when the number is passed as string)
        },
        stock_units: {
            displayName: "Текущий остаток на складе",
            headerStyle: styles.emptyCell,
            width: "15", // <- width in chars (when the number is passed as string)
        },
        sale_units: {
            displayName: "Продано во время сверки",
            headerStyle: styles.emptyCell,
            width: "15", // <- width in chars (when the number is passed as string)
        },
        tsd_units: {
            displayName: "Данные из ТСД",
            headerStyle: styles.emptyCell,
            width: "15", // <- width in chars (when the number is passed as string)
        },
        difference: {
            displayName: "Разница",
            headerStyle: styles.emptyCell,
            width: "15", // <- width in chars (when the number is passed as string)
        },
    };

    const merges = [
        { start: { row: 1, column: 1 }, end: { row: 1, column: 1 } },
        { start: { row: 2, column: 1 }, end: { row: 2, column: 1 } },
        { start: { row: 1, column: 2 }, end: { row: 1, column: 2 } },
        { start: { row: 2, column: 2 }, end: { row: 2, column: 2 } },
    ];

    const report = excel.buildExport([
        {
            name: "Сверка",
            merges: merges,
            specification: specification,
            data: arr,
        }
    ]);
    res.attachment("report.xlsx");
    return res.send(report);
});

router.post("/check", (req, res) => {
    const data = {
        id: parseInt(req.body.id),
    }
    helpers.serverLog(data);
    knex
        .raw("select check_reconciliation(?)", [data])
        .then((result) => {
            helpers.serverLog(result.rows[0].check_reconciliation);
            return res.status(result.rows[0].check_reconciliation.code == "success" ? 200 : 500).json(result.rows[0].check_reconciliation);
        })
        .catch((err) => {
            helpers.serverLog(err);
            return res.status(500).json(err);
        });
});

module.exports = router;
