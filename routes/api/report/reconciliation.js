const express = require('express');
const knex = require('../../../db/knex');
const helpers = require('../../../middlewares/_helpers');
const router = new express.Router();
const excel = require("node-excel-export");

router.get('/list', (req, res) => {
    const company = parseInt(req.userData.company);
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    helpers.serverLog(dateFrom);
    helpers.serverLog(dateTo);

    knex.raw(`
    SELECT
	* 
FROM
	reconciliation r 
WHERE
	r.company = ${company} 
	AND r."begin_date" BETWEEN '${dateFrom} 00:00:00' 
	AND '${dateTo} 23:59:59'
    ORDER BY
    id DESC
    `)
        .then(reconciliation => {
            return res.status(200).json(reconciliation.rows);
        }).catch((err) => {
            helpers.serverLog(err)
            return res.status(500).json(err);
        });
});

module.exports = router;