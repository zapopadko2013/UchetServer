const express = require('express');
const knex = require('../db/knex');
const helpers = require('../middlewares/_helpers');
const router = new express.Router();
const moment = require('moment');

/*
h=6 cash
n=230 check
d=140820 ddmmyy
*/

router.get('/getDetailing', (req, res) => { 

		let count = 0;
		
		knex('transactions as t')
			.innerJoin("points as p", {"t.point" : "p.id", "t.company" : "p.company"})
			.innerJoin("cashbox_users as u", {"u.id" : "t.cashboxuser"})
			.innerJoin("transaction_details as d", {"d.transactionid" : "t.id", "d.company" : "t.company"})
			.innerJoin("products as pr", {"pr.id" : "d.product", "pr.company" : "d.company"})		
			.innerJoin("cashboxes as b", {"b.id" : "t.cashbox"})			
		.where({ 't.cashbox': req.query.h, 't.ticketid': req.query.n, 'b.checkuotside': true }) 
		.andWhere(knex.raw('t.date::date'), knex.raw(`to_date('${req.query.d}'::text,'DDMMYY')`))
		.select(knex.raw(`json_build_object(
				'CashboxRegistrationNumber',b.ofdregnum, 'Address',p.address, 'Number',b.ofdid, 'OrderNumber',t.ticketid, 'RegistratedOn',to_char(t.date,'DD.MM.YYYY HH24:MI:SS'), 'EmployeeName',u.name, 'EmployeeCode',t.cashboxuser,
				'ShiftNumber',t.shiftnumber, 'DocumentNumber',t.ticketid, 'OperationType',case t.tickettype when 1 then 1 else 2 end, 'OperationTypeText',case t.tickettype when 1 then 'Возврат' else 'Продажа' end,
				'Payments',
					('['||json_build_object('Sum',t.price,'PaymentTypeName',case t.paymenttype when 'card' then 'Карта' when 'cash' then 'Наличные' when 'mixed' then 'Смешанная оплата' else 'Безналичные' end)||']')::json,
				'Total',t.price, 'Change',0, 'Taken',t.price, 'Discount',sum(d.discount + d.ticketdiscount), 'MarkupPercent',0, 'Markup',0, 'TaxPercent',max(d.taxrate*100), 
				'Tax',sum(round(cast((d.totalprice-d.discount-d.bonuspay-d.ticketdiscount)/(d.taxrate+1)*d.taxrate as numeric),2)), 'VATPayer',true,
				'Positions', 
					json_agg(json_build_object('PositionName',pr.name, 'PositionCode',0, 'Count',d.units, 'Price',d.price, 'DiscountPercent',0, 'DiscountTenge',0, 'MarkupPercent',0, 'Markup',0, 'TaxPercent',d.taxrate*100,
					'Tax',d.nds, 'IsNds',case when d.nds > 0 then true else false end, 'IsStorno',false, 'MarkupDeleted',false, 'DiscountDeleted',false, 'Sum',d.totalprice, 'UnitCode',d.product
					)), 'IsOffline',false ) as "Data"`))
		.groupBy('t.paymenttype','t.price','t.tickettype','t.date','t.ticketid','b.ofdregnum','b.ofdid','p.address','u.name','t.shiftnumber','t.cashboxuser')
		.first()
		.then(cheque => {
			cheque.Data.Address = helpers.decrypt(cheque.Data.Address);
			cheque.Data.Positions.forEach(details => {
			 	count = count + 1;
				details.PositionCode = count;
			});
			// helpers.serverLog(req.originalUrl, cheque, 'success');
			return res.status(200).json(cheque);
		}).catch((err) => {
			helpers.serverLog(req.originalUrl, err, 'error');
			return res.status(500).json(err);
		});
		
});

/*router.get('/getPoints', (req, res) => { 

		knex('points as p')
		.where({ 'p.point_type': '1' }) 
		//.where({ 'p.company': '52' })
		.whereIn('p.company', [52,20])
		//.whereNotIn('p.company', [2, 3, 17, 0])
		.select('p.id', 'p.address', 'p.company', 'p.status')
		.then(points => {
			points.forEach(point => {
				point.address = helpers.decrypt(point.address);
			});
			return res.status(200).json(points);
		}).catch((err) => {
			return res.status(500).json(err);
		});
		
});*/

module.exports = router;