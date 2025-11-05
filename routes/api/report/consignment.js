const express = require("express");
const knex = require("../../../db/knex");
const helpers = require("../../../middlewares/_helpers");
const moment = require("moment");

const router = new express.Router();

//Контрагент | Наименование товара | Штрих-код | Количество | Цена реализации (шт) | Остаток в ценах реализации | Бренд | Категория | Номер накладной | Себестоимость по FIFO (шт)
router.get('/', (req, res) => {
	
	const company  = req.userData.company;
	const customer = typeof(req.query.consignator) !== "undefined" && req.query.consignator !== null ? req.query.consignator : '0';
	const brand = typeof req.query.brand !== "undefined" && req.query.brand !== null ? req.query.brand : "@";
	const category = typeof req.query.category !== "undefined" && req.query.category !== null ? req.query.category : "@";
	
	const cost = knex('stockcurrent_part as sp')
		.select(knex.raw(`min(sp.purchaseprice) as purchaseprice`), 'sp.company', 'sp.point', 'sp.product', 'sp.attributes')
		.where({'sp.date': knex('stockcurrent_part as sp2')
								.min('sp2.date')
								.andWhereRaw('sp2.company = sp.company')
								.andWhereRaw('sp2.point = sp.point')
								.andWhereRaw('sp2.product = sp.product')
								.andWhereRaw('sp2.attributes = sp.attributes')
								.andWhere('sp2.units', '>', 0)
		})
		.andWhere('sp.units', '>', 0)
		.andWhere('sp.company', '=', company)
		.groupBy('sp.company','sp.point','sp.product','sp.attributes')
		.as('co');
		
	knex('consignment as ct')
		.innerJoin('customers as c', { 'c.id': 'ct.customer', 'c.company': 'ct.company' })
		.innerJoin('stockcurrent as s', { 's.company': 'c.company', 's.id': 'ct.stockid' })
		.innerJoin('products as p', { 'p.company': 's.company', 'p.id': 's.product' })
		.innerJoin('brands as b', { 'b.id': 'p.brand' })
		.innerJoin('pointset as set', {'set.stock': 's.point'})
		.innerJoin(
			knex.raw(
				`categories as cat on (cat.id = p.category and cat.company in (${company},0))`
			)
       )
		.leftJoin(cost, { 'co.company': 's.company', 'co.point': 's.point', 'co.product': 's.product', 'co.attributes': 's.attributes' })
		.where('ct.units', '<>', 0)
		.select('c.name as customer', 'p.name as prodname', 'p.code as codename', 'ct.units', 'ct.price as price', knex.raw('ct.price * ct.units as totalprice'), 'b.brand', 'cat.name as category',
					'ct.invoice','co.purchaseprice as purchaseFIFO','set.point as point','ct.date',
			knex.raw(
				"array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes and a.company = s.company),', ') as attributescaption"
			))
		.where((pt) => {
			customer !== '0' ? pt.where({ 'ct.customer': customer, 'ct.company': company }) : pt.where({ 'ct.company': company })
			if (brand !== "@") {pt.where({ 'p.brand': brand })}
			if (category !== "@") {pt.where({ 'p.category': category })}
		})
		.orderBy('codename')
		.orderBy('ct.invoice','desc')
		.then(consig => {
			return res.status(200).json(consig);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

//Инвойс/Транзакция (номер от 12.12.2012) | Контрагент | ФИО кассира | Общая цена | Общая скидка
router.get('/invoices', (req, res) => {
	
	const company  = req.userData.company;
	
	const customer = typeof(req.query.customer) !== "undefined" && req.query.customer !== null ? req.query.customer : '0';
	const dateFrom = moment(req.query.dateFrom);
	const dateTo   = moment(req.query.dateTo);
	
	knex('transactions as t')
		.innerJoin('customers as c', { 'c.id': 't.customerid', 'c.company': 't.company' })
		.innerJoin('cashbox_users as u', { 'u.id': 't.cashboxuser' })
		.innerJoin('cashboxes', 'cashboxes.id', 't.cashbox')
		.innerJoin('points as p', {'p.id': 't.point', 'p.company': 't.company'})
		.andWhereBetween(knex.raw('t.date::date'), [dateFrom.format(), dateTo.format()])
		.where((ptt) => {
			customer !== '0' ? ptt.where({ 't.customerid': customer, 't.company': company }) : ptt.where({ 't.company': company })
		})
		.andWhereRaw("t.consignment IS TRUE")
		.select('t.id as number',knex.raw(`to_char(t.date,'DD.MM.YYYY HH24:MI:SS') as date`),'c.name as customer','u.name as cashboxuser','t.price as totalprice',
							knex.raw(`(t.discount + t.detailsdiscount) as totaldiscount`),knex.raw(`'Продажа' as type`),'t.point as pointid','p.name as pointname','t.tickettype as tickettype','cashboxes.name as cashbox')
		.union([				
			knex.select('i.invoicenumber as number',knex.raw(`to_char(i.date,'DD.MM.YYYY HH24:MI:SS') as date`),'c.name as customer','u.name as cashboxuser',knex.raw(`sum(l.totalprice) as totalprice`),knex.raw(`sum(l.discount) as totaldiscount`),
					knex.raw(`case i.type when 0 then 'Передано на консигнацию' when 1 then 'Возвращено' else 'Неизвестная операция' end as type`),'i.point as pointid','p.name as pointname',knex.raw(`0 as tickettype`),'cashboxes.name as cashbox')
				.from('consignment_invoices as i')
				.innerJoin('consignment_invoicelist as l', { 'l.company': 'i.company', 'i.invoicenumber': 'l.invoice' })
				.innerJoin('customers as c', { 'c.id': 'i.customer', 'c.company': 'i.company' })
				.innerJoin('cashbox_users as u', { 'u.id': 'i.cashboxuser' })
				.innerJoin('points as p', {'p.id': 'i.point', 'p.company': 'i.company'})
				.innerJoin('cashboxes', 'cashboxes.id', 'i.cashbox')
				.where((pt) => {
					customer !== '0' ? pt.where({ 'i.customer': customer, 'i.company': company }) : pt.where({ 'i.company': company })
				})
				.andWhereBetween(knex.raw('i.date::date'), [dateFrom.format(), dateTo.format()])
				.groupBy('i.invoicenumber','i.date','c.name','u.name','type','i.point','tickettype','p.name','cashboxes.name')		
		])
		.orderBy('date', 'desc')
		.then(invoices => {
			invoices.forEach(invoice => {
				invoice.pointname = helpers.decrypt(invoice.pointname);
				invoice.cashbox = helpers.decrypt(invoice.cashbox);
			});
			return res.status(200).json(invoices);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

// Всякая детализация (инвойсы, транзакции)
router.get('/invoicedetails', (req, res) => {
	 
	const company  = req.userData.company;
	const type 	   = req.query.type;
	const invoice  = req.query.invoice;
	
	//Транзакции
	if (type === 'Продажа') {
		knex('transactions')
			.innerJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
			.innerJoin('points', {'points.id': 'transactions.point', 'points.company': 'transaction_details.company'})
			.innerJoin('products', {'products.id': 'transaction_details.product', 'products.company': 'transaction_details.company'})
			.innerJoin('unit_spr', {'unit_spr.id': 'products.unitsprid'})
			.where({ 'transactions.id': invoice, 'transactions.company': company })
			.groupBy('transactions.tickettype','transactions.date','transactions.price','transactions.cardpay','transactions.bonuspay','transactions.certpay','transactions.debtpay','transactions.cashpay','transactions.debitpay','transactions.bonusadd','transactions.bonuscardid','transactions.discount','transactions.detailsdiscount')
			.select(knex.raw(`to_char(transactions.date,'DD.MM.YYYY HH24:MI:SS') as date,transactions.price,transactions.cardpay,case when transactions.tickettype = 1 then -transactions.bonuspay else transactions.bonuspay end as bonuspay,transactions.certpay,transactions.debtpay,
				transactions.cashpay,transactions.debitpay,transactions.bonusadd,transactions.bonuscardid,(transactions.discount + transactions.detailsdiscount) as discount,
				json_agg(json_build_object('name',products.name||array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = transaction_details.attributes and a.company = transaction_details.company),', '),
				'units',transaction_details.units,'price',transaction_details.price,'totalprice',transaction_details.totalprice,'taxrate',transaction_details.taxrate,'code',products.code,'bonusadd',transaction_details.bonusadd,
				'bonuspay',transaction_details.bonuspay,'unitspr_shortname',unit_spr.shortname,'attributes',transaction_details.attributes,'discount',round(cast(transaction_details.discount+transaction_details.ticketdiscount as numeric),2)::float8,'nds',round(cast(transaction_details.nds as numeric),2)::float8)) as details`))
			.first()
			.then(transactions => {
				return res.status(200).json(transactions);
			}).catch((err) => {
				return res.status(500).json(err);
			});
	// Инвойсы (накладные)		
	} else {
		knex('consignment_invoicelist as l')
			.innerJoin('stockcurrent as s', { 's.company': 'l.company', 's.id': 'l.stockid'})
			.innerJoin('products as p', { 's.company': 'p.company', 's.product': 'p.id'})
			.innerJoin('unit_spr', {'unit_spr.id': 'p.unitsprid'})
			.where({ 'l.invoice': invoice, 'l.company': company })
			.select(knex.raw(`p.name||array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes and a.company = s.company),', ') as name`),
				'p.code','l.units','l.price','l.totalprice','l.discount','unit_spr.shortname')
			.then(invoices => {
				return res.status(200).json(invoices);
			}).catch((err) => {
				return res.status(500).json(err);
			});
	}
	
});

//Обшие продажи по консигнаторам (без НДС)
router.get('/sales', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const company  = req.userData.company;
	
	//knex('transactions')
	knex('customers as c')
		//.innerJoin('customers as c', { 'c.id': 'transactions.customerid', 'c.company': 'transactions.company' })
		.leftJoin('transactions', function() {
			this.on('c.id', '=', 'transactions.customerid')
				.on('c.company', '=', 'transactions.company')
				.onBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
				.on(knex.raw(`transactions.consignment IS TRUE`))
		})	
		.where({ 'c.company': company })
		//.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		//.andWhereRaw("transactions.consignment IS TRUE")
		.select('c.name',
			knex.raw(`coalesce(sum(case when transactions.tickettype = 0 then transactions.cashpay else null end),0) as cash,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.cashpay else null end),0) as retcash,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.cardpay else null end),0) as card,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.cardpay else null end),0) as retcard,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.debitpay else null end),0) as debitpay,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.debitpay else null end),0) as retdebitpay,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.debtpay else null end),0) as debtpay,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.bonuspay else null end),0) as bonuspay,
					  coalesce(sum(case when transactions.tickettype = 1 then -transactions.bonuspay else null end),0) as retbonuspay,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.certpay else null end),0) as certpay,
					  coalesce(sum(case when transactions.tickettype = 0 then (transactions.discount + transactions.detailsdiscount) else null end),0) as discount,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.price + transactions.bonuspay else null end),0) as total_discount,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.price else null end),0) as total_discount_bonus,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.price - transactions.bonuspay else null end),0) as rettotal`))
		.groupBy('c.name')
		.then(sales => {
			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

//Обшие продажи по консигнаторам (НДС)
router.get('/ndssales', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const company  = req.userData.company;

	//knex('transactions')
	knex('customers as c')
		.leftJoin('transactions', function() {
			this.on('c.id', '=', 'transactions.customerid')
				.on('c.company', '=', 'transactions.company')
				.onBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
				.on(knex.raw(`transactions.consignment IS TRUE`))
		})
		.leftJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
		//.innerJoin('customers as c', { 'c.id': 'transactions.customerid', 'c.company': 'transactions.company' })
		.where({ 'c.company': company })
		//.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		//.andWhereRaw("transactions.consignment IS TRUE")
		.select('c.name',
			knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as VAT,
					coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.ticketdiscount else null end),0) as total_discount,
					coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as total_discount_bonus,				
				coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as retwithoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as retwithVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then round(cast((transaction_details.totalprice)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as retVAT,
				coalesce(sum(case when transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as rettotal`))
		.groupBy('c.name')
		.then(sales => {
			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

// Общее
router.get('/total', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const company  = req.userData.company;
	const consignator = typeof(req.query.consignator) !== "undefined" && req.query.consignator !== null ? req.query.consignator : '0';
	
	const details = knex('customers as c')
		.leftJoin('stockdiary as s', function() {
			this.on('c.id', '=', 's.customer')
				.on('c.company', '=', 's.company')
				.onBetween(knex.raw('s.date::date'), [dateFrom.format(), dateTo.format()])
				.onNotNull('s.customer')
		})
		.where({ 'c.company': company })
		.where((pt) => {
			consignator !== "0" ? pt.where({ 'c.id': consignator }) : pt.andWhereNot({ 'c.id': '0' })
		})
		.select('c.name','c.company','c.id',
			knex.raw(`coalesce(sum(case when s.reason = 6  then (s.units*s.price) else null end),0) as returns,
					  coalesce(sum(case when s.reason = -6 then (s.units*s.price) else null end),0) as transfers,
					  coalesce(sum(case when s.reason = -1 then (s.units*s.price) else null end),0) as sales
					`))
		.groupBy('c.name','c.company','c.id').as('t');
		
	knex(details)
		.leftJoin('consignment as c', { 'c.company': 't.company', 't.id': 'c.customer'})
		.select('t.name','t.returns','t.transfers','t.sales',knex.raw(`coalesce(sum(c.units*c.price),0) as total`))
		.groupBy('t.name','t.returns','t.transfers','t.sales')
		.then(total => {
			return res.status(200).json(total);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

module.exports = router;			