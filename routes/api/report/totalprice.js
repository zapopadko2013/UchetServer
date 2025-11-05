const express = require('express');
const knex = require('../../../db/knex');
const moment = require('moment');

const router = new express.Router();

// select sum(td.totalprice)
// from transactions t
// inner join transaction_details td on (td.transactionid = t.id)
// inner join products p on (p.id = td.product and p.taxid = 0)
// inner join points ps on (ps.id = t.point)
// where ps.company = 15
// and t.date::date between date('1.11.2018') and date('1.11.2018') + interval '1 month';

router.get('/taxfree', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);

	knex('transactions')
		.innerJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
		.innerJoin('products', {'products.id': 'transaction_details.product', 'products.company': 'transaction_details.company'})
		.innerJoin('points', {'points.id': 'transactions.point', 'points.company': 'transactions.company'})
		.where({ 'transactions.company': req.userData.company })
		.andWhere({ 'products.taxid': '0' })
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.select(knex.raw('coalesce(sum(transaction_details.totalprice), 0) as sum'))
		.first()
		.then(totalprice => {
			return res.status(200).json(totalprice);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

// select sum(td.totalprice), sum(round(cast(td.totalprice/(tx.rate+1)*tx.rate as numeric),2))
// from transactions t
// inner join transaction_details td on (td.transactionid = t.id)
// inner join products p on (p.id = td.product and p.taxid <> 0)
// inner join taxes tx on (tx.id = p.taxid)
// inner join points ps on (ps.id = t.point)
// where ps.company = 15
// and t.date::date between date('1.11.2018') and date('1.11.2018') + interval '1 month'; 

router.get('/tax', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);

	knex('transactions')
		.innerJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
		.innerJoin('products', {'products.id': 'transaction_details.product', 'products.company': 'transaction_details.company'})
		.innerJoin('taxes', 'taxes.id', 'products.taxid')
		.innerJoin('points', {'points.id': 'transactions.point', 'points.company': 'transactions.company'})
		.where({ 'transactions.company': req.userData.company })
		.andWhereNot({ 'products.taxid': '0' })
		.andWhereBetween(knex.raw('transactions.date::date'),  [dateFrom.format(), dateTo.format()])
		.select(knex.raw('coalesce(sum(transaction_details.totalprice), 0) as sum'),
			knex.raw('coalesce(sum(round(cast(transaction_details.totalprice/(taxes.rate+1) * taxes.rate as numeric),2)), 0) as taxsum'))
		.first()
		.then(totalprice => {
			return res.status(200).json(totalprice);
		}).catch((err) => {
			console.log(err)
			return res.status(500).json(err);
		});
});

// select sum(t.price)
// from transactions t
// inner join points ps on (ps.id = t.point)
// where ps.company = 15  
// and tickettype = '1' -- статичное значение
// and t.date::date between date('1.11.2018') and date('1.11.2018') + interval '1 month';

router.get('/refund', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);

	knex('transactions')
		.innerJoin('points', {'points.id': 'transactions.point', 'points.company': 'transactions.company'})
		.where({ 'transactions.company': req.userData.company })
		.andWhere({ 'transactions.tickettype': 1 })
		.andWhereBetween(knex.raw('transactions.date::date'),  [dateFrom.format(), dateTo.format()])
		.select(knex.raw('coalesce(sum(transactions.price), 0) as sum'))
		.first()
		.then(totalprice => {
			return res.status(200).json(totalprice);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

module.exports = router;