const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");
const excel = require("node-excel-export");

const router = new express.Router();

router.get("/sold", (req, res) => {
	const company = req.userData.company;
	// const dateFrom = moment(req.query.dateFrom).format('L');
	// const dateTo = moment(req.query.dateTo).format('L');
	const dateFrom = req.query.dateFrom;
	const dateTo = req.query.dateTo;
	helpers.serverLog("company", company, "success")
	helpers.serverLog("dateFrom", dateFrom, "success")
	helpers.serverLog("dateTo", dateTo, "success")

	knex.raw(`
	SELECT G
	.code AS id,
	G.denomination AS nominal,
	G.selldate AS sell_date,
	G.expiredate AS shelflife,
CASE
		WHEN G.active = TRUE THEN
	CASE
			WHEN DATE ( G.expiredate ) < CURRENT_DATE THEN
			'Активен, истек срок годности' ELSE'Активен' 
		END ELSE'Использован' 
	END AS status 
FROM
	giftcertificates G 
WHERE
	G."id" IN (
	SELECT
		d.idcert 
	FROM
		giftcertificatesdiary d 
	WHERE
		d.company = ${company}` +
		// убрано по причине наличия кнопки "Активировать" в отчёте, которая не добавляет запись в таблицу транзакций
		// +
		// `AND d.transactionid IN ( SELECT T.ID FROM transactions T WHERE T.company = ${company})` 
		// + 
		` AND d."date" BETWEEN to_timestamp( '${dateFrom} 00:00:00', 'dd.mm.yyyy HH24:MI:SS' ) 
		AND to_timestamp( '${dateTo} 23:59:59', 'dd.mm.yyyy HH24:MI:SS' )  
		AND d.reason = 2
	) 
ORDER BY
	G.denomination,
	G.selldate
`)
		.then(result => {
			helpers.serverLog(req.originalUrl, result.rows, "success");
			return res.status(200).json(result.rows);
		})
		.catch(err => {
			helpers.serverLog(req.originalUrl, err.stack, 'error');
			return res.status(500).json(err);
		});
});

router.post("/soldtoexcel", (req, res) => {
	let certificates = req.body.arr;

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
		id: {
			displayName: "Номер сертификата",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		nominal: {
			displayName: "Номинал",
			headerStyle: styles.emptyCell,
			width: "10", // <- width in chars (when the number is passed as string)
		},
		sell_date: {
			displayName: "Дата продажи",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		shelflife: {
			displayName: "Срок действия",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		status: {
			displayName: "Статус",
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
			name: "Проданные сертификаты",
			merges: merges,
			specification: specification,
			data: certificates,
		}
	]);
	res.attachment("report.xlsx");
	return res.send(report);
});


router.get("/used", (req, res) => {
	const company = req.userData.company;
	// const dateFrom = moment(req.query.dateFrom).format('L');
	// const dateTo = moment(req.query.dateTo).format('L');
	const dateFrom = req.query.dateFrom;
	const dateTo = req.query.dateTo;
	helpers.serverLog("company", company, "success")
	helpers.serverLog("dateFrom", dateFrom, "success")
	helpers.serverLog("dateTo", dateTo, "success")
	knex.raw(`
	  SELECT G
		  .code AS id,
		  G.denomination AS nominal,
		  d."date" AS use_date,
		  d.transactionid AS tr_id 
	  FROM
		  giftcertificates G,
		  giftcertificatesdiary d 
	  WHERE
		  G."id" = d.idcert 
		  AND G.company = d.company 
		  AND d.company = ${company}
		  AND d.transactionid IN ( SELECT T.ID FROM transactions T WHERE T.company = ${company} ) 
		  AND d."date" BETWEEN to_date( '${dateFrom}', 'dd.mm.yyyy' ) 
		  AND to_date( '${dateTo}', 'dd.mm.yyyy' ) 
		  AND d.reason = 3
	  ORDER BY
		  G.denomination,
		  d."date"
	  `)
		.then(result => {
			helpers.serverLog(req.originalUrl, result.rows, "success");
			return res.status(200).json(result.rows);
		})
		.catch(err => {
			helpers.serverLog(req.originalUrl, err.stack, 'error');
			return res.status(500).json(err);
		});
});

router.post("/usedtoexcel", (req, res) => {
	let certificates = req.body.arr;

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
		id: {
			displayName: "Номер сертификата",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		nominal: {
			displayName: "Номинал",
			headerStyle: styles.emptyCell,
			width: "10", // <- width in chars (when the number is passed as string)
		},
		sell_date: {
			displayName: "Дата использования",
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
			name: "Использованные сертификаты",
			merges: merges,
			specification: specification,
			data: certificates,
		}
	]);
	res.attachment("report.xlsx");
	return res.send(report);
});

router.post("/statustoexcel", (req, res) => {
	let certificates = req.body.arr;

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
			displayName: "Номер сертификата",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		denomination: {
			displayName: "Номинал",
			headerStyle: styles.emptyCell,
			width: "10", // <- width in chars (when the number is passed as string)
		},
		expiredate: {
			displayName: "Дата истечения",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		type: {
			displayName: "Тип",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		selldate: {
			displayName: "Дата продажи",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		status: {
			displayName: "Статус",
			headerStyle: styles.emptyCell,
			width: "30", // <- width in chars (when the number is passed as string)
		},
	};

	const report = excel.buildExport([
		{
			name: "Статус сертификатов",
			specification: specification,
			data: certificates,
		}
	]);
	res.attachment("report.xlsx");
	return res.send(report);
});

module.exports = router;
