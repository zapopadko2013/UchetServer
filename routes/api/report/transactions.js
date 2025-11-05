const express = require("express");
const knex = require("../../../db/knex");
const moment = require("moment");
const helpers = require("../../../middlewares/_helpers");
const xl = require("excel4node");
const excel = require("node-excel-export");

const router = new express.Router();

//select t.id, t.date, t.price, (t.price - t.discount) as actprice, t.discount, c.name as cashbox, u.name as user, t.paymenttype, t.tickettype, p.id as pointid, p.name as pointname
//from transactions t
//inner join points p on (p.id = t.point and p.company = t.company)
//inner join cashboxes c on (c.id = t.cashbox)
//inner join cashbox_users u on (u.id = t.cashboxuser)
//where t.company = 15
//and t.date::date between to_date('01.10.2018','DD.MM.YYYY') and to_date('14.12.2019','DD.MM.YYYY')
//order by date desc;

router.get("/", (req, res) => {
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const point =
    typeof req.query.point !== "undefined" && req.query.point !== null
      ? req.query.point
      : "0";
  const client = req.query.client;

  const tokenCompany = req.userData.company;
  const company = req.query.company ? req.query.company : tokenCompany;
  const isHolding = req.query.holding ? req.query.holding : false;
  const adminCompany = 15;
  const consignator =
    typeof req.query.consignator !== "undefined" &&
    req.query.consignator !== null
      ? req.query.consignator
      : "0";
	  
	//////12.02.2024  
	
   const bonuspay = typeof req.query.bonuspay !== "undefined" && req.query.bonuspay !== null 
        ? " transactions.bonuspay>0 "
		: " 1=1";

   const bonusadd = typeof req.query.bonusadd !== "undefined" && req.query.bonusadd !== null 
        ? " transactions.bonusadd>0 "
		: " 1=1";			
    
	//////12.02.2024   

  ////////
  // fs=require("fs")
  //fs.writeFileSync("errorsoob1.txt",
  /*
       console.log(
       knex('transactions')
                .innerJoin('transaction_details', { 'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company' })
                .innerJoin('products', { 'products.id': 'transaction_details.product', 'products.company': 'transaction_details.company' })
                .innerJoin('unit_spr', { 'unit_spr.id': 'products.unitsprid' })


		.innerJoin('points', { 'points.id': 'transactions.point', 'points.company': 'transactions.company' })
		.innerJoin('cashboxes', 'cashboxes.id', 'transactions.cashbox')
		.innerJoin('cashbox_users', 'cashbox_users.id', 'transactions.cashboxuser')
		.leftJoin('cashbox_users as cons', 'cons.id', 'transactions.sellerid')
		.innerJoin('fiz_customers', 'fiz_customers.id', 'transactions.fiz_customerid')
		.where({ 'transactions.company': company })
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.where((pt) => {
			client !== 'jur' ? pt.where({ 'transactions.customerid': '0' }) : pt.andWhereNot({ 'transactions.customerid': '0' })
			if (consignator !== '0') {
				pt.where({ 'transactions.customerid': consignator })
			}
			if (point !== '0') {
				pt.where({ 'points.id': point })
			}
		})
		.andWhere(
			knex.raw(`
                      CASE when ${isHolding} then
                      transactions.company in 
                        (
                        WITH RECURSIVE nodes(id) AS 
                          (
                          SELECT r.id
                          FROM companies AS r
                          WHERE r.id = ${company}
                          UNION ALL
                          SELECT r.id
                          FROM companies AS r, nodes AS nd
                          WHERE nd.id = r.holding_parent
                          )
                          SELECT * FROM nodes
                        )
                      ELSE
                      transactions.company = ${company} 
                      END
                      AND
                      (
                        ${company} = ${tokenCompany} 
                        or ${tokenCompany} = ${adminCompany}
                        or ${company} in
                        (
                        WITH RECURSIVE nodes(id) AS 
                          (
                          SELECT r.id
                          FROM companies AS r
                          WHERE r.id = ${tokenCompany}
                          UNION ALL
                          SELECT r.id
                          FROM companies AS r, nodes AS nd
                          WHERE nd.id = r.holding_parent
                          )
                        SELECT * FROM nodes
                        )
                      )
				    `)
		)
		.select('transactions.id', 'transactions.ticketid', 'transactions.date', 'transactions.price', knex.raw(`(transactions.discount + transactions.detailsdiscount) as discount`), 'transactions.cardpay', 'transactions.cashpay', 'transactions.debitpay', 'transactions.bonuspay', 'transactions.bonusadd',
			'cashboxes.name as cashbox', 'cashbox_users.name as cashboxuser', 'transactions.paymenttype', 'transactions.tickettype', 'points.id as pointid', 'points.name as pointname', knex.raw(`coalesce(cons.name,'') as consultant`),
			knex.raw(`coalesce(firstname || ' ' || lastname,'') as fio`)
                       ,'transactions.markup'

,knex.raw(`json_agg(json_build_object('name',products.name||array_to_string(array(select ' | '||n.values||': '||a.value 
				from attrlist a left join attributenames n on (n.id = a.attribute) 
				where a.listcode = transaction_details.attributes and 
					a.company = transaction_details.company),', '),
			  'units',transaction_details.units,'price',transaction_details.price,'totalprice',transaction_details.totalprice,
			  'taxrate',transaction_details.taxrate,'code',products.code,'bonusadd',transaction_details.bonusadd,
			  'bonuspay',transaction_details.bonuspay,'unitspr_shortname',unit_spr.shortname,'attributes',
			  transaction_details.attributes,'discount',
			  round(cast(transaction_details.discount as numeric),2)::float8,
			  'nds',
			  round(cast(transaction_details.nds as numeric),2)::float8
                          ,'markup',
                          round(cast(transaction_details.markup as numeric),2)::float8                          
                          )
			order by transaction_details.line) as details, 'transactions.customerid'`)

                         )
		.orderBy('transactions.date', 'desc').toSQL()
                 //,"ascii")  
                 ) ;
        */
  ////////

  knex("transactions")
    .innerJoin("transaction_details", {
      "transaction_details.transactionid": "transactions.id",
      "transaction_details.company": "transactions.company",
    })
    .innerJoin("products", {
      "products.id": "transaction_details.product",
      "products.company": "transaction_details.company",
    })
    .innerJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })

    .innerJoin("points", {
      "points.id": "transactions.point",
      "points.company": "transactions.company",
    })
    .innerJoin("cashboxes", "cashboxes.id", "transactions.cashbox")
    .innerJoin("cashbox_users", "cashbox_users.id", "transactions.cashboxuser")
    .leftJoin("cashbox_users as cons", "cons.id", "transactions.sellerid")
    .innerJoin(
      "fiz_customers",
      "fiz_customers.id",
      "transactions.fiz_customerid"
    )

    .groupBy(
      "transactions.id",
      "transactions.ticketid",
      "transactions.date",
      "transactions.price",
      knex.raw(`(transactions.discount + transactions.detailsdiscount)`),
      "transactions.cardpay",
      "transactions.cashpay",
      "transactions.debitpay",
      "transactions.bonuspay",
      "transactions.bonusadd",
      "cashboxes.name",
      "cashbox_users.name",
      "transactions.paymenttype",
      "transactions.tickettype",
      "points.id",
      "points.name",
      knex.raw(`coalesce(cons.name,'')`),
      knex.raw(`coalesce(firstname || ' ' || lastname,'') `),
      "transactions.markup"
    )

    .where({ "transactions.company": company /*, 'points.id': point*/ })
    .andWhereBetween(knex.raw("transactions.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .where((pt) => {
      client !== "jur"
        ? pt.where({ "transactions.customerid": "0" })
        : pt.andWhereNot({ "transactions.customerid": "0" /*consignator*/ });
      if (consignator !== "0") {
        pt.where({ "transactions.customerid": consignator });
      }
      if (point !== "0") {
        pt.where({ "points.id": point });
      }
    })
    .andWhere(
      knex.raw(`
                      CASE when ${isHolding} then
                      transactions.company in 
                        (
                        WITH RECURSIVE nodes(id) AS 
                          (
                          SELECT r.id
                          FROM companies AS r
                          WHERE r.id = ${company}
                          UNION ALL
                          SELECT r.id
                          FROM companies AS r, nodes AS nd
                          WHERE nd.id = r.holding_parent
                          )
                          SELECT * FROM nodes
                        )
                      ELSE
                      transactions.company = ${company} 
                      END
                      AND
                      (
                        ${company} = ${tokenCompany} 
                        or ${tokenCompany} = ${adminCompany}
                        or ${company} in
                        (
                        WITH RECURSIVE nodes(id) AS 
                          (
                          SELECT r.id
                          FROM companies AS r
                          WHERE r.id = ${tokenCompany}
                          UNION ALL
                          SELECT r.id
                          FROM companies AS r, nodes AS nd
                          WHERE nd.id = r.holding_parent
                          )
                        SELECT * FROM nodes
                        )
                      )
				    `)
    )
	
	//////12.02.2024
	.andWhere(knex.raw(`${bonuspay}`))
	.andWhere(knex.raw(`${bonusadd}`))
	//////12.02.2024
	
    .select(
      "transactions.id",
      "transactions.ticketid",
      "transactions.date",
      "transactions.price",
      knex.raw(
        `(transactions.discount + transactions.detailsdiscount) as discount`
      ),
      "transactions.cardpay",
      "transactions.cashpay",
      "transactions.debitpay",
      "transactions.bonuspay",
      "transactions.bonusadd",
      "cashboxes.name as cashbox",
      "cashbox_users.name as cashboxuser",
      "transactions.paymenttype",
      "transactions.tickettype",
      "points.id as pointid",
      "points.name as pointname",
      knex.raw(`coalesce(cons.name,'') as consultant`),
      knex.raw(`coalesce(firstname || ' ' || lastname,'') as fio`),
      "transactions.markup",
      knex.raw(`json_agg(json_build_object('name',products.name||array_to_string(array(select ' | '||n.values||': '||a.value 
				from attrlist a left join attributenames n on (n.id = a.attribute) 
				where a.listcode = transaction_details.attributes and 
					a.company = transaction_details.company),', '),
			  'units',transaction_details.units,'price',transaction_details.price,'totalprice',transaction_details.totalprice,
			  'taxrate',transaction_details.taxrate,'code',products.code,'bonusadd',transaction_details.bonusadd,
			  'bonuspay',transaction_details.bonuspay,'unitspr_shortname',unit_spr.shortname,'attributes',
			  transaction_details.attributes,'discount',
			  round(cast(transaction_details.discount as numeric),2)::float8,
			  'nds',
			  round(cast(transaction_details.nds as numeric),2)::float8
                          ,'markup',
                          round(cast(transaction_details.markup as numeric),2)::float8                          
                          )
			order by transaction_details.line) as details, 'transactions.customerid'`)
    )
    .orderBy("transactions.date", "desc")
    .then((transactions) => {
      try {
        transactions.forEach((transaction) => {
          transaction.pointname = helpers.decrypt(transaction.pointname);
          transaction.cashbox = helpers.decrypt(transaction.cashbox);
        });

        return res.status(200).json(transactions);
      } catch (e) {
        return res.status(200).json(transactions);
      }
    })
    .catch((err) => {
      /////

      //fs=require("fs")
      //fs.writeFileSync("errorsoob1.txt", err,  "ascii")

      return res.status(500).json(err);

      //return res.status(400).send(err)
      //return res.json({success: false, message: err});

      //////
    });
});

//select pd.name||array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = td.attributes and a.company = td.company),', ') as name, td.units, td.price, td.totalprice, td.taxrate, td.bonusadd, td.bonuspay, td.discount
//from transactions t
//inner join transaction_details td on (td.transactionid = t.id)
//inner join points p on (p.id = t.point)
//inner join products pd on (pd.id = td.product)
//where t.id = 416
//and t.company = 6
//order by pd.name

// Не используется
router.get("/details", (req, res) => {
  knex("transactions")
    .innerJoin("transaction_details", {
      "transaction_details.transactionid": "transactions.id",
      "transaction_details.company": "transactions.company",
    })
    .innerJoin("points", {
      "points.id": "transactions.point",
      "points.company": "transaction_details.company",
    })
    .innerJoin("products", {
      "products.id": "transaction_details.product",
      "products.company": "transaction_details.company",
    })
    .where({
      "transactions.id": req.query.transactionid,
      "transactions.company": req.userData.company,
    })
    .select(
      knex.raw(
        `products.name||array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = transaction_details.attributes and a.company = transaction_details.company),', ') as name`
      ),
      "transaction_details.units",
      "transaction_details.price",
      "transaction_details.totalprice",
      "transaction_details.taxrate",
      "products.code",
      "transaction_details.bonusadd",
      "transaction_details.bonuspay",
      knex.raw(
        `round(cast(transaction_details.discount + transaction_details.ticketdiscount as numeric),2)::float8 as discount`
      ),
      knex.raw(
        `round(cast(transaction_details.nds as numeric),2)::float8 as nds`
      )
    )
    .then((transaction) => {
      return res.status(200).json(transaction);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});
/*
router.get('/fulldetails', (req, res) => {
	let company = req.userData.company
	if(company === "15" && req.query.company)
		company = req.query.company

	knex('transactions')
		.innerJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
		.innerJoin('points', {'points.id': 'transactions.point', 'points.company': 'transaction_details.company'})
		.innerJoin('products', {'products.id': 'transaction_details.product', 'products.company': 'transaction_details.company'})
		.innerJoin('unit_spr', {'unit_spr.id': 'products.unitsprid'})
		.where({ 'transactions.id': req.query.transactionid, 'transactions.company': company })
		.groupBy('transactions.tickettype','transactions.date','transactions.price','transactions.cardpay','transactions.bonuspay','transactions.cashpay','transactions.debitpay','transactions.bonusadd','transactions.bonuscardid','transactions.discount','transactions.detailsdiscount')
		.select(knex.raw(`transactions.date,transactions.price,transactions.cardpay,case when transactions.tickettype = 1 then -transactions.bonuspay else transactions.bonuspay end as bonuspay,
			transactions.cashpay,transactions.debitpay,transactions.bonusadd,transactions.bonuscardid,(transactions.discount + transactions.detailsdiscount) as discount,
			json_agg(json_build_object('name',products.name||array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = transaction_details.attributes and a.company = transaction_details.company),', '),
			  'units',transaction_details.units,'price',transaction_details.price,'totalprice',transaction_details.totalprice,'taxrate',transaction_details.taxrate,'code',products.code,'bonusadd',transaction_details.bonusadd,
			  'bonuspay',transaction_details.bonuspay,'unitspr_shortname',unit_spr.shortname,'attributes',transaction_details.attributes,'discount',round(cast(transaction_details.discount+transaction_details.ticketdiscount as numeric),2)::float8,'nds',round(cast(transaction_details.nds as numeric),2)::float8)) as details`))
		.first()
		.then(transaction => {
			return res.status(200).json(transaction);
		}).catch((err) => {
			console.log(err)
			return res.status(500).json(err);
		});
});
*/

router.get("/fulldetails", (req, res) => {
  const tokenCompany = req.userData.company;
  const company = req.query.company ? req.query.company : tokenCompany;
  const isHolding = req.query.holding ? req.query.holding : false;
  const adminCompany = 15;

  knex("transactions")
    .innerJoin("transaction_details", {
      "transaction_details.transactionid": "transactions.id",
      "transaction_details.company": "transactions.company",
    })
    .innerJoin("points", {
      "points.id": "transactions.point",
      "points.company": "transaction_details.company",
    })
    .innerJoin("products", {
      "products.id": "transaction_details.product",
      "products.company": "transaction_details.company",
    })
    .innerJoin("unit_spr", { "unit_spr.id": "products.unitsprid" })
    .leftJoin("cashboxes", { "cashboxes.id": "transactions.cashbox" })
    .leftJoin("cashbox_users", {
      "cashbox_users.id": "transactions.cashboxuser",
    })
    .leftJoin("cashbox_users as sellers", {
      "sellers.id": "transactions.sellerid",
    })
    .leftJoin(
      "fiz_customers",
      "fiz_customers.id",
      "transactions.fiz_customerid"
    )
	////30.01.2024
	.leftJoin(
      "customers",
      "customers.id",
      "transactions.customerid"
    )
	////30.01.2024
    .where({
      "transactions.id": req.query.transactionid,
      "transactions.company": company,
    })
    .groupBy(
      "cashbox_users.name",
      "points.name",
      "cashboxes.name",
      "fio",
      "sellers.name",
      "transactions.tickettype",
      "transactions.date",
      "transactions.price",
      "transactions.cardpay",
      "transactions.bonuspay",
      "transactions.certpay",
      "transactions.debtpay",
      "transactions.cashpay",
      "transactions.debitpay",
      "transactions.bonusadd",
      "transactions.bonuscardid",
      "transactions.discount",
      "transactions.detailsdiscount",
      "transactions.sellerid",
      "transactions.fiz_customerid",
      "transactions.customerid",
      "transactions.markup"
    )
    .select(
      knex.raw(`cashbox_users.name as cashier, points.name as pointname, cashboxes.name as cashboxname, 
			---case when transactions.fiz_customerid = 0 then null else coalesce(fiz_customers.firstname || ' ' || fiz_customers.lastname,'') end as fio, 
			
			-----
  case when transactions.fiz_customerid>0 and transactions.fiz_customerid is not null  then 'Физ. лицо'
       when transactions.customerid>0 and transactions.customerid is not null  then 'Юр. лицо'
       else '' end as namelizo,
  -----
  
  case
    when transactions.fiz_customerid = 0 then 
    ---
   (
   case when transactions.customerid =0 then null
   else coalesce(customers.name,'') 
   end
   )
   ---
    --null
    else coalesce(
    -----
      coalesce(
      fiz_customers.firstname
      ,'')
    -----  
      || ' ' || 
      -----
      coalesce(
      fiz_customers.lastname
      ,'')
      -----
      ,
      ''
    )
  end as fio,
  -------
			
			case when transactions.sellerid = 0 then null else sellers.name end as consultant,
			transactions.date,transactions.price,transactions.cardpay,
                                                
                        transactions.markup,

			case when transactions.tickettype = 1 then -transactions.bonuspay else transactions.bonuspay end as bonuspay,
			transactions.certpay,transactions.debtpay, transactions.cashpay,transactions.debitpay,transactions.bonusadd,
			transactions.bonuscardid,(transactions.discount + transactions.detailsdiscount) as total_discount, transactions.discount as discount,
			json_agg(json_build_object('name',products.name||array_to_string(array(select ' | '||n.values||': '||a.value 
				from attrlist a left join attributenames n on (n.id = a.attribute) 
				where a.listcode = transaction_details.attributes and 
					a.company = transaction_details.company),', '),
			  'units',transaction_details.units,'price',transaction_details.price,'totalprice',transaction_details.totalprice,
			  'taxrate',transaction_details.taxrate,'code',products.code,'bonusadd',transaction_details.bonusadd,
			  'bonuspay',transaction_details.bonuspay,'unitspr_shortname',unit_spr.shortname,'attributes',
			  transaction_details.attributes,'discount',
			  round(cast(transaction_details.discount as numeric),2)::float8,
			  'nds',
			  round(cast(transaction_details.nds as numeric),2)::float8
                          ,'markup',
                          round(cast(transaction_details.markup as numeric),2)::float8                          
                          )
			order by transaction_details.line) as details, 'transactions.customerid'`)
    )
    .first()
    .then((transaction) => {
      transaction.pointname = helpers.decrypt(transaction.pointname);
      transaction.cashboxname = helpers.decrypt(transaction.cashboxname);
      return res.status(200).json(transaction);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

router.get("/discounts", (req, res) => {
  let company = req.userData.company;
  let dateFrom = moment(req.query.dateFrom);
  let cashier = req.query.cashier;
  let dateTo = moment(req.query.dateTo);
  let conditions = { "transactions.company": company };
  const point = req.query.point;

  conditions["transactions.tickettype"] = 0;

  if (company === "15") company = req.query.company;

  if (cashier != "@") {
    conditions["cashbox_users.id"] = cashier;
  }

  if (point !== "0") conditions["points.id"] = point;

  knex("transactions")
    .innerJoin("cashbox_users", "cashbox_users.id", "transactions.cashboxuser")
    .innerJoin("points", "points.id", "transactions.point")
    .where(conditions)
    //.andWhere('transactions.discount','<>', 0)
    .where((pt) => {
      pt.where("transactions.discount", "<>", 0).orWhere(
        "transactions.detailsdiscount",
        "<>",
        0
      );
    })
    .andWhereBetween(knex.raw("transactions.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .select(
      knex.raw("cashbox_users.name as cashiername"),
      knex.raw("points.name as pointname"),
      "transactions.point",
      "transactions.cashbox",
      "cashbox_users.name",
      "transactions.id",
      "transactions.date",
      knex.raw("(transactions.price + transactions.discount) as price"),
      knex.raw(
        "cast((transactions.discount + transactions.detailsdiscount)/(transactions.price + transactions.discount + transactions.detailsdiscount) * 100 as numeric ) as discount_percentage"
      ),
      knex.raw(
        "cast(transactions.discount + transactions.detailsdiscount as numeric) as discount"
      ),
      knex.raw("transactions.price as final_price")
    )
    .orderBy("date", "desc")
    .then((transactions) => {
      transactions.forEach((transaction) => {
        transaction.pointname = helpers.decrypt(transaction.pointname);
        transaction.cashiername = helpers.decrypt(transaction.cashiername);
      });
      return res.status(200).json(transactions);
    })
    .catch((err) => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

//service for printing invoice for jur clients
router.get("/jur", (req, res) => {
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const point = req.query.point;
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex("transactions")
    .innerJoin("cashbox_users", "cashbox_users.id", "transactions.cashboxuser")
    // .innerJoin('points', {'points.id': 'transactions.point','points.id': knex.raw('?',[point]),'points.company':'transactions.company'})
    .innerJoin("customers", {
      "customers.id": "transactions.customerid",
      "customers.company": "transactions.company",
    })
    .where({ "transactions.company": company, "transactions.point": point })
    .andWhereBetween(knex.raw("transactions.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .select(
      "transactions.id",
      "transactions.ticketid",
      "transactions.date",
      "transactions.price",
      "cashbox_users.name as cashboxuser",
      "transactions.tickettype",
      "customers.bin as customerbin",
      "customers.name as customername"
    )
    .orderBy("transactions.date", "desc")
    .then((sales) => {
      //			sales.forEach(sale => {
      //				sale.name = helpers.decrypt(sale.name);
      //			});
      return res.status(200).json(sales);
    })
    .catch((err) => {
      return res.status(500).json(err.stack);
    });
});

/*
select t.date, c.name, cc.name, cc.bin, cc.accountant,
		(select json_agg(json_build_object('id',s.id, 'name', pp.name,'units',r.units,'price', r.price, 'totalprice', r.totalprice,'taxtotalprice', r.taxtotalprice, 'attrvalue',
						array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = r.attributes),', ')))
						from transaction_details r 
							left join products pp on (pp.id = r.product) 
							left join pointset p on (p.point = t.point) 
							left join stockcurrent s on (s.product = r.product and s."attributes" = r."attributes"  and p.stock = s.point) 
						where t.id = r.transactionid)
	from transactions t,
			 customers c,
			 companies cc
	where t.id = 16072
		and c.id = t.customerid
		and cc."id" = t.company
*/
//service for generating invoice xlsx
router.get("/jur/invoice", (req, res) => {
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;
  const transactionId = req.query.transactionId;

  const transDetails = knex("transaction_details")
    .innerJoin("products", "products.id", "transaction_details.product")
    .innerJoin("pointset", "pointset.point", "transactions.point")
    .innerJoin("stockcurrent", {
      "stockcurrent.product": "transaction_details.product",
      "stockcurrent.attributes": "transaction_details.attributes",
      "stockcurrent.point": "pointset.stock",
    })
    .where({ "transaction_details.transactionid": knex.raw("transactions.id") })
    .select(
      knex.raw(`json_agg(json_build_object('id',stockcurrent.id, 'name', products.name,'units',transaction_details.units,'price',
		${knex.raw(
      "transaction_details.price - ((transaction_details.discount + transaction_details.ticketdiscount)/transaction_details.units) - (transaction_details.bonuspay/transaction_details.units)"
    )}
		,'totalprice', 
		${knex.raw(
      "transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount"
    )}
		,'taxtotalprice', transaction_details.nds, 'attrvalue',
		array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = transaction_details.attributes),', '))) as products`)
    );
  // transaction_details.price,
  // transaction_details.totalprice,

  knex("transactions")
    .innerJoin("customers", "customers.id", "transactions.customerid")
    .innerJoin("companies", "companies.id", "transactions.company")
    .where({
      "transactions.company": company,
      "transactions.id": transactionId,
    })
    .first()
    .select(
      "transactions.date",
      "transactions.ticketid",
      "customers.name  as customer",
      "companies.name as company",
      "companies.bin",
      "companies.accountant",
      knex.raw(`(${transDetails})`)
    )
    .then((transactions) => {
      if (!transactions) return res.status(500).json({});

      const clientsListLength = 1;
      const productsListLength = transactions.products.length;

      const customerName = transactions.customer;
      const companyName = helpers.decrypt(transactions.company);
      const companyBin = Number(helpers.decrypt(transactions.bin));
      const headAccountant = helpers.decrypt(transactions.accountant);
      const userPosition = "";
      const userName = "";
      const docNumber = Number(transactions.ticketid);
      const transDate = new Date(transactions.date);
      let month = transDate.getMonth() + 1;
      month = month < 10 ? "0" + month : month;
      const createDate =
        transDate.getDate() + "." + month + "." + transDate.getFullYear();

      // Create a new instance of a Workbook class
      var wb = new xl.Workbook();
      // Add Worksheets to the workbook
      var options = {
        sheetFormat: {
          defaultColWidth: 2.67, //1.38(11px 0.85) //2.67(21px 2.00) //3.5(28px 2.88)
          defaultRowHeight: 11.25,
        },
        pageSetup: {
          scale: 65,
        },
      };
      var ws = wb.addWorksheet("Накладная", options);
      ws.column(1).setWidth(3.5);
      ws.column(11).setWidth(1.38);
      ws.column(17).setWidth(1.38);
      ws.column(18).setWidth(1.38);
      ws.column(35).setWidth(1.38);
      ws.column(38).setWidth(1.38);

      ws.row(6).setHeight(12);
      ws.row(9).setHeight(12);
      ws.row(10).setHeight(12);
      ws.row(12).setHeight(21.75);
      ws.row(15).setHeight(12.75);
      ws.row(18).setHeight(21.75);

      // Create a reusable style
      var font_style = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
        },
        alignment: {
          horizontal: "left",
        },
      });

      var right_border_style = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
        },
        alignment: {
          horizontal: "left",
        },
        border: {
          right: {
            style: "thin",
          },
        },
      });

      var right_align_style = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
        },
        alignment: {
          horizontal: "right",
        },
      });

      var right_align_border_style = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
        },
        alignment: {
          horizontal: "right",
          wrapText: true,
        },
        border: {
          bottom: {
            style: "thin",
          },
          top: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
        },
        numberFormat: "### ### ##0.00",
      });

      var header_style = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
          italics: true,
        },
        alignment: {
          horizontal: "center",
        },
      });

      var table_header_style = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          bottom: {
            style: "thin",
          },
          top: {
            style: "thin",
          },
          right: {
            style: "thin",
          },
          left: {
            style: "thin",
          },
        },
      });

      var input_style = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
          italics: true,
        },
        alignment: {
          horizontal: "left",
          wrapText: true,
        },
        border: {
          bottom: {
            style: "thin",
          },
        },
      });
	  
	   //////05.10.2023
  
  let val="";
  // let curr = JSON.parse(helpers.decrypt(req.userData.locales));
  let curr = JSON.parse(req.userData.locales);

	 if (curr == null)
 {
	 val="KZT"; 
 }  
  else
  {    
val=curr.LC_MONETARY;
  }
 
 
  //////05.10.2023

      var input_style_2 = wb.createStyle({
        font: {
          name: "Arial",
          size: 8,
        },
        alignment: {
          horizontal: "center",
          wrapText: true,
        },
        border: {
          bottom: {
            style: "thin",
          },
        },
      });

      ws.cell(1, 40, 1, 49, true).string("Приложение 26").style(header_style);
      ws.cell(2, 40, 2, 49, true)
        .string("к приказу Министра финансов")
        .style(header_style);
      ws.cell(3, 40, 3, 49, true)
        .string("Республики Казахстан")
        .style(header_style);
      ws.cell(4, 40, 4, 49, true)
        .string("от 20 декабря 2012 года № 562")
        .style(header_style);

      ws.cell(6, 49).string("Форма З-2").style(right_align_style);

      ws.cell(9, 1, 9, 13, true)
        .string("Организация (индивидуальный предприниматель)")
        .style(font_style)
        .style({ alignment: { wrapText: true } });
      ws.cell(9, 14, 9, 36, true)
        .string(companyName)
        .style({
          font: {
            name: "Arial",
            size: 9,
            bold: true,
          },
          alignment: {
            wrapText: true,
            horizontal: "center",
            vertical: "top",
          },
          border: {
            bottom: {
              style: "thin",
            },
          },
        });
      ws.cell(9, 40)
        .string("ИИН/БИН")
        .style(font_style)
        .style({ font: { size: 9 } });
      ws.cell(9, 43, 9, 49, true)
        .number(companyBin)
        .style({
          font: {
            name: "Arial",
            size: 9,
            bold: true,
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
          },
          border: {
            bottom: {
              style: "thin",
            },
            top: {
              style: "thin",
            },
            right: {
              style: "thin",
            },
            left: {
              style: "thin",
            },
          },
          numberFormat: "#",
        });
      ws.cell(12, 42, 12, 45, true)
        .string("Номер документа")
        .style(table_header_style)
        .style({ alignment: { vertical: "bottom" } });
      ws.cell(12, 46, 12, 49, true)
        .string("Дата составления")
        .style(table_header_style)
        .style({ alignment: { vertical: "bottom" } });
      ws.cell(13, 42, 13, 45, true)
        .number(docNumber)
        .style({
          font: {
            name: "Arial",
            size: 8,
            bold: true,
          },
          alignment: {
            horizontal: "center",
            wrapText: true,
          },
          border: {
            bottom: {
              style: "thin",
            },
            top: {
              style: "thin",
            },
            right: {
              style: "thin",
            },
            left: {
              style: "thin",
            },
          },
          numberFormat: "#",
        });
      ws.cell(13, 46, 13, 49, true)
        .string(createDate)
        .style({
          font: {
            name: "Arial",
            size: 8,
            bold: true,
          },
          alignment: {
            horizontal: "center",
            wrapText: true,
          },
          border: {
            bottom: {
              style: "thin",
            },
            top: {
              style: "thin",
            },
            right: {
              style: "thin",
            },
            left: {
              style: "thin",
            },
          },
          // dateFormat: 'dd.mm.yyyy'
        });
      ws.cell(15, 1, 15, 49, true)
        .string("НАКЛАДНАЯ НА ОТПУСК ЗАПАСОВ НА СТОРОНУ")
        .style({
          font: {
            name: "Arial",
            size: 10,
            bold: true,
          },
          alignment: {
            horizontal: "center",
          },
        });

      ws.cell(18, 1, 18, 11, true)
        .string("Организация (индивидуальный предприниматель) - отправитель")
        .style(table_header_style);
      ws.cell(18, 12, 18, 22, true)
        .string("Организация (индивидуальный предприниматель) - получатель")
        .style(table_header_style);
      ws.cell(18, 23, 18, 31, true)
        .string("Ответственный за поставку (Ф.И.О.)")
        .style(table_header_style);
      ws.cell(18, 32, 18, 40, true)
        .string("Транспортная организация")
        .style(table_header_style);
      ws.cell(18, 41, 18, 49, true)
        .string("Товарно-транспортная накладная (номер, дата)")
        .style(table_header_style);

      //следущие данные в строке будут формироваться из списка длина которого равна clientsListLength//пока что толька одна строка
      ws.cell(19, 1, 19, 11, true)
        .string(companyName)
        .style(table_header_style);
      ws.cell(19, 12, 19, 22, true)
        .string(customerName)
        .style(table_header_style);
      ws.cell(19, 23, 19, 31, true).string("").style(table_header_style);
      ws.cell(19, 32, 19, 40, true).string("").style(table_header_style);
      ws.cell(19, 41, 19, 49, true).string("").style(table_header_style);

      ws.row(20 + clientsListLength).setHeight(15.75);
      ws.row(21 + clientsListLength).setHeight(15.75);

      ws.cell(20 + clientsListLength, 1, 21 + clientsListLength, 2, true)
        .string("Номер по порядку")
        .style(table_header_style);
      ws.cell(20 + clientsListLength, 3, 21 + clientsListLength, 14, true)
        .string("Наименование, характеристика")
        .style(table_header_style);
      ws.cell(20 + clientsListLength, 15, 21 + clientsListLength, 19, true)
        .string("Номенкла-\nтурный номер")
        .style(table_header_style);
      ws.cell(20 + clientsListLength, 20, 21 + clientsListLength, 22, true)
        .string("Единица измерения")
        .style(table_header_style);

      ws.cell(20 + clientsListLength, 23, 20 + clientsListLength, 31, true)
        .string("Количество")
        .style(table_header_style);
      ws.cell(21 + clientsListLength, 23, 21 + clientsListLength, 27, true)
        .string("подлежит отпуску")
        .style(table_header_style);
      ws.cell(21 + clientsListLength, 28, 21 + clientsListLength, 31, true)
        .string("отпущено")
        .style(table_header_style);

      
		
		 //////05.10.2023
      //ws.cell(20 + clientsListLength, 32, 21 + clientsListLength, 37, true)
      //  .string("Цена за единицу, в KZT")
     //   .style(table_header_style);
	
     // ws.cell(20 + clientsListLength, 38, 21 + clientsListLength, 43, true)
      //  .string("Сумма с НДС, в KZT")
     //   .style(table_header_style);
     // ws.cell(20 + clientsListLength, 44, 21 + clientsListLength, 49, true)
     //   .string("Сумма НДС, в KZT")
     //   .style(table_header_style);
		
		ws.cell(20 + clientsListLength, 32, 21 + clientsListLength, 37, true)
        .string("Цена за единицу, в "+val)
        .style(table_header_style);

        ws.cell(20 + clientsListLength, 38, 21 + clientsListLength, 43, true)
        .string("Сумма с НДС, в "+val)
        .style(table_header_style);
      ws.cell(20 + clientsListLength, 44, 21 + clientsListLength, 49, true)
        .string("Сумма НДС, в "+val)
        .style(table_header_style);		
		
		//////05.10.2023
		

      ws.cell(22 + clientsListLength, 1, 22 + clientsListLength, 2, true)
        .number(1)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 3, 22 + clientsListLength, 14, true)
        .number(2)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 15, 22 + clientsListLength, 19, true)
        .number(3)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 20, 22 + clientsListLength, 22, true)
        .number(4)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 23, 22 + clientsListLength, 27, true)
        .number(5)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 28, 22 + clientsListLength, 31, true)
        .number(6)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 32, 22 + clientsListLength, 37, true)
        .number(7)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 38, 22 + clientsListLength, 43, true)
        .number(8)
        .style(table_header_style)
        .style({ numberFormat: "#" });
      ws.cell(22 + clientsListLength, 44, 22 + clientsListLength, 49, true)
        .number(9)
        .style(table_header_style)
        .style({ numberFormat: "#" });

      let totalUnits = 0;
      let totalPrice = 0;
      let totalTaxPrice = 0;
      //следущие данные в строке будут формироваться из списка длина которого равна productsListLength
      transactions.products.forEach((product, idx) => {
        const namePart = product.attrvalue ? " " : "" + product.attrvalue;
        const fullName = product.name + namePart;

        if (fullName.length > 117)
          ws.row(23 + clientsListLength + idx).setHeight(46.5);
        else if (fullName.length > 78)
          ws.row(23 + clientsListLength + idx).setHeight(34.5);
        else if (fullName.length > 39)
          ws.row(23 + clientsListLength + idx).setHeight(21.75);

        ws.cell(
          23 + clientsListLength + idx,
          1,
          23 + clientsListLength + idx,
          2,
          true
        )
          .number(1 + idx)
          .style(right_align_border_style)
          .style({ alignment: { horizontal: "center" }, numberFormat: "#" });
        ws.cell(
          23 + clientsListLength + idx,
          3,
          23 + clientsListLength + idx,
          14,
          true
        )
          .string(fullName)
          .style(right_align_border_style)
          .style({ alignment: { horizontal: "left" } });
        ws.cell(
          23 + clientsListLength + idx,
          15,
          23 + clientsListLength + idx,
          19,
          true
        )
          .number(product.id)
          .style(right_align_border_style)
          .style({
            alignment: { horizontal: "center" },
            numberFormat: "00000000000",
          }); //stockId
        ws.cell(
          23 + clientsListLength + idx,
          20,
          23 + clientsListLength + idx,
          22,
          true
        )
          .string("шт")
          .style(right_align_border_style)
          .style({ alignment: { horizontal: "center" } });
        ws.cell(
          23 + clientsListLength + idx,
          23,
          23 + clientsListLength + idx,
          27,
          true
        )
          .number(product.units)
          .style(right_align_border_style);
        ws.cell(
          23 + clientsListLength + idx,
          28,
          23 + clientsListLength + idx,
          31,
          true
        )
          .number(product.units)
          .style(right_align_border_style);
        ws.cell(
          23 + clientsListLength + idx,
          32,
          23 + clientsListLength + idx,
          37,
          true
        )
          .number(product.price)
          .style(right_align_border_style);
        ws.cell(
          23 + clientsListLength + idx,
          38,
          23 + clientsListLength + idx,
          43,
          true
        )
          .number(product.totalprice)
          .style(right_align_border_style);
        ws.cell(
          23 + clientsListLength + idx,
          44,
          23 + clientsListLength + idx,
          49,
          true
        )
          .number(product.taxtotalprice ? product.taxtotalprice : 0)
          .style(right_align_border_style);

        totalUnits += product.units;
        totalPrice += product.totalprice;
        totalTaxPrice += product.taxtotalprice ? product.taxtotalprice : 0;
      });

      const propUnits = helpers.number_to_string(totalUnits);
      const propPrice = helpers.number_to_string(totalPrice, "money");

      //Поля итого
      ws.cell(23 + clientsListLength + productsListLength, 22)
        .string("Итого")
        .style(right_align_style);
      ws.cell(
        23 + clientsListLength + productsListLength,
        23,
        23 + clientsListLength + productsListLength,
        27,
        true
      )
        .number(totalUnits)
        .style(right_align_border_style);
      ws.cell(
        23 + clientsListLength + productsListLength,
        28,
        23 + clientsListLength + productsListLength,
        31,
        true
      )
        .number(totalUnits)
        .style(right_align_border_style);
      ws.cell(
        23 + clientsListLength + productsListLength,
        32,
        23 + clientsListLength + productsListLength,
        37,
        true
      )
        .string("х")
        .style(table_header_style);
      ws.cell(
        23 + clientsListLength + productsListLength,
        38,
        23 + clientsListLength + productsListLength,
        43,
        true
      )
        .number(totalPrice)
        .style(right_align_border_style);
      ws.cell(
        23 + clientsListLength + productsListLength,
        44,
        23 + clientsListLength + productsListLength,
        49,
        true
      )
        .number(totalTaxPrice)
        .style(right_align_border_style);

      const x = clientsListLength + productsListLength;
      if (propPrice.length > 53 || propUnits.length > 21)
        ws.row(25 + x).setHeight(21.75);
      if (propPrice.length > 106 || propUnits.length > 42)
        ws.row(25 + x).setHeight(34.5);
      if (propUnits.length > 100) ws.row(25 + x).setHeight(46.5);
      ws.cell(25 + x, 1)
        .string("Всего отпущено количество запасов (прописью)")
        .style(font_style);
      ws.cell(25 + x, 14, 25 + x, 22, true)
        .string(propUnits)
        .style(input_style);
      
		
		//////05.10.2023
	  /*
	  ws.cell(25 + x, 23, 25 + x, 30, true)
        .string(" на сумму (прописью), в KZT")
        .style(font_style)
        .style({
          alignment: {
            horizontal: "center",
            wrapText: true,
          },
        });
		*/
		
		ws.cell(25 + x, 23, 25 + x, 30, true)
        .string(" на сумму (прописью), в "+val)
        .style(font_style)
        .style({
          alignment: {
            horizontal: "center",
            wrapText: true,
          },
        });
		//////05.10.2023
		
      ws.cell(25 + x, 31, 25 + x, 49, true)
        .string(propPrice)
        .style(input_style);

      ws.row(27 + x).setHeight(21.75);
      ws.cell(27 + x, 1)
        .string("Отпуск разрешил")
        .style(font_style);
      ws.cell(27 + x, 6, 27 + x, 10, true)
        .string(userPosition)
        .style(input_style_2);
      ws.cell(27 + x, 11)
        .string("/")
        .style(font_style);
      ws.cell(27 + x, 17)
        .string("/")
        .style(font_style);
      ws.cell(27 + x, 18, 27 + x, 24, true)
        .string(userName)
        .style(input_style_2);
      ws.cell(27 + x, 12, 27 + x, 16, true)
        .string("")
        .style(input_style_2);
      ws.cell(27 + x, 25)
        .string("")
        .style(right_border_style);
      ws.cell(27 + x, 27)
        .string("По доверенности")
        .style(font_style);
      ws.cell(27 + x, 32, 27 + x, 48, true)
        .string('№_____________ от "____"_____________________ 20___ года')
        .style(font_style)
        .style({ alignment: { wrapText: true } });

      ws.cell(28 + x, 6, 28 + x, 10, true)
        .string("должность")
        .style(header_style);
      ws.cell(28 + x, 12, 28 + x, 16, true)
        .string("подпись")
        .style(header_style);
      ws.cell(28 + x, 18, 28 + x, 24, true)
        .string("расшифровка подписи")
        .style(header_style);
      ws.cell(28 + x, 25)
        .string("")
        .style(right_border_style);

      ws.cell(29 + x, 25)
        .string("")
        .style(right_border_style);
      ws.cell(29 + x, 27)
        .string("выданной")
        .style(font_style);
      ws.cell(29 + x, 30, 29 + x, 48, true)
        .string("")
        .style(input_style_2);

      ws.row(30 + x).setHeight(7.5);
      ws.cell(30 + x, 25)
        .string("")
        .style(right_border_style);

      ws.cell(31 + x, 1)
        .string("Главный бухгалтер")
        .style(font_style);
      ws.cell(31 + x, 6, 31 + x, 10, true)
        .string("")
        .style(input_style_2);
      ws.cell(31 + x, 11)
        .string("/")
        .style(font_style);
      ws.cell(31 + x, 12, 31 + x, 22, true)
        .string(headAccountant)
        .style(input_style_2);
      ws.cell(31 + x, 25)
        .string("")
        .style(right_border_style);
      ws.cell(31 + x, 27, 31 + x, 48, true)
        .string("")
        .style(input_style_2);

      ws.cell(32 + x, 6, 32 + x, 10, true)
        .string("подпись")
        .style(header_style);
      ws.cell(32 + x, 12, 32 + x, 22, true)
        .string("расшифровка подписи")
        .style(header_style);
      ws.cell(32 + x, 25)
        .string("")
        .style(right_border_style);

      ws.cell(33 + x, 1)
        .string("М.П.")
        .style(font_style)
        .style({
          font: {
            bold: true,
          },
        });
      ws.cell(33 + x, 25)
        .string("")
        .style(right_border_style);

      ws.row(34 + x).setHeight(7.5);
      ws.cell(34 + x, 25)
        .string("")
        .style(right_border_style);

      ws.cell(35 + x, 1)
        .string("Отпустил")
        .style(font_style);
      ws.cell(35 + x, 6, 35 + x, 10, true)
        .string("")
        .style(input_style_2);
      ws.cell(35 + x, 11)
        .string("/")
        .style(font_style);
      ws.cell(35 + x, 12, 35 + x, 22, true)
        .string("")
        .style(input_style_2);
      ws.cell(35 + x, 25)
        .string("")
        .style(right_border_style);
      ws.cell(35 + x, 27)
        .string("Запасы получил")
        .style(font_style);
      ws.cell(35 + x, 32, 35 + x, 37, true)
        .string("")
        .style(input_style_2);
      ws.cell(35 + x, 38)
        .string("/")
        .style(font_style);
      ws.cell(35 + x, 39, 35 + x, 48, true)
        .string("")
        .style(input_style_2);

      ws.cell(36 + x, 6, 36 + x, 10, true)
        .string("подпись")
        .style(header_style);
      ws.cell(36 + x, 12, 36 + x, 22, true)
        .string("расшифровка подписи")
        .style(header_style);
      ws.cell(36 + x, 25)
        .string("")
        .style(right_border_style);
      ws.cell(36 + x, 32, 36 + x, 37, true)
        .string("подпись")
        .style(header_style);
      ws.cell(36 + x, 39, 36 + x, 48, true)
        .string("расшифровка подписи")
        .style(header_style);

      ws.setPrintArea(1, 1, 36 + x, 49);

      wb.write("invoice.xlsx", res);

      return res.status(200);
    })
    .catch((err) => {
      return res.status(500).json(err.stack);
    });
});

router.get("/consultants", (req, res) => {
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  let company = req.userData.company;
  if (company === "15" && req.query.company) company = req.query.company;

  knex("transactions as t")
    .innerJoin("cashbox_users as u", { "t.sellerid": "u.id" })
    .where({ "t.company": company })
    .andWhere("t.sellerid", "<>", 0)
    .andWhereBetween(knex.raw("t.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .select(
      "u.id",
      "u.name",
      knex.raw(`sum(t.price + t.bonuspay) as sum`),
      knex.raw(`sum(t.price) as sum_without_bonus`)
    )
    .orderBy("u.name")
    .groupByRaw("u.id, u.name")
    .then((consultants) => {
      return res.status(200).json(consultants);
    })
    .catch((err) => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

router.get("/consultantdetails", (req, res) => {
  //возможны ошибки при изменении часового пояса

  knex
    .raw(
      `
	WITH total_units AS (
	SELECT
	pr.code,
	pr.name,
	FLOOR ( SUM ( d.units ) ) AS units,
	FLOOR ( SUM ( d.price ) ) AS price 
FROM
	products pr
	INNER JOIN transaction_details d ON pr.id = d.product
	INNER JOIN transactions tr ON tr.id = d.transactionid 
WHERE
	tr.sellerid = ${req.query.id}
	AND tr.date BETWEEN '${req.query.dateFrom} 00:00:00'  
	AND '${req.query.dateTo} 23:59:59' 
GROUP BY
	pr.code,
	pr.name )
	SELECT
	* 
FROM
	total_units 
WHERE
	units > 0 
ORDER BY
	units
	`
    )
    .then((consultants) => {
      return res.status(200).json(consultants.rows);
    })
    .catch((err) => {
      helpers.serverLog("err", err);
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

const styles = {
  emptyCell: {},
};

const specificationtrans = {
  index: {
    displayName: "",
    headerStyle: styles.emptyCell,
    width: "6", // <- width in chars (when the number is passed as string)
  },
  date: {
    displayName: "Дата",
    headerStyle: styles.emptyCell,
    width: "20", // <- width in chars (when the number is passed as string)
  },
  paymenttype: {
    displayName: "Способ оплаты",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  tickettype: {
    displayName: "Тип операции",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  price: {
    displayName: "Общая сумма",
    headerStyle: styles.emptyCell,
    width: "15", // <- width in pixels
  },
  cashboxuser: {
    displayName: "Кассир",
    headerStyle: styles.emptyCell,
    width: "40", // <- width in pixels
  },
};

router.get("/excel", (req, res) => {
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
  const point =
    typeof req.query.point !== "undefined" && req.query.point !== null
      ? req.query.point
      : "0";
  const client = req.query.client;

  const tokenCompany = req.userData.company;
  const company = req.query.company ? req.query.company : tokenCompany;
  const isHolding = req.query.holding ? req.query.holding : false;
  const adminCompany = 15;
  const consignator =
    typeof req.query.consignator !== "undefined" &&
    req.query.consignator !== null
      ? req.query.consignator
      : "0";

  // knex("transactions")
  //   .innerJoin("points", {
  // 	"points.id": "transactions.point",
  // 	"points.company": "transactions.company",
  //   })
  //   .innerJoin("cashboxes", "cashboxes.id", "transactions.cashbox")
  //   .innerJoin("cashbox_users", "cashbox_users.id", "transactions.cashboxuser")
  //   .where({ "points.company": company, "points.id": point })
  //   .andWhereBetween(knex.raw("transactions.date::date"), [
  // 	dateFrom.format(),
  // 	dateTo.format(),
  //   ])
  //   .where((pt) => {
  // 	client !== "jur"
  // 	  ? pt.where({ "transactions.customerid": "0" })
  // 	  : pt.andWhereNot({ "transactions.customerid": "0" });
  //   })
  //   .select(
  // 	"transactions.id",
  // 	knex.raw("to_char(transactions.date,'DD.MM.YYYY HH24:MI:SS') as date"),
  // 	"transactions.price",
  // 	"cashboxes.name as cashbox",
  // 	"cashbox_users.name as cashboxuser",
  // 	knex.raw(
  // 	  "(case transactions.paymenttype when 'cash' then 'Наличный' when 'card' then 'Безналичный' when 'mixed' then 'Смешанный' when 'debt' then 'Долг' when 'debit' then 'Безналичный перевод' else 'Неопределенный' end) as paymenttype"
  // 	),
  // 	knex.raw(
  // 	  "(case when transactions.tickettype = 0 then 'Продажа' else 'Возврат' end) as tickettype"
  // 	),
  // 	"points.id as pointid",
  // 	"points.name as pointname"
  //   )
  //   .orderBy("transactions.date", "desc")
  knex("transactions")
    .innerJoin("points", {
      "points.id": "transactions.point",
      "points.company": "transactions.company",
    })
    .innerJoin("cashboxes", "cashboxes.id", "transactions.cashbox")
    .innerJoin("cashbox_users", "cashbox_users.id", "transactions.cashboxuser")
    .leftJoin("cashbox_users as cons", "cons.id", "transactions.sellerid")
    .where({ "transactions.company": company /*, 'points.id': point*/ })
    .andWhereBetween(knex.raw("transactions.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .where((pt) => {
      client !== "jur"
        ? pt.where({ "transactions.customerid": "0" })
        : pt.andWhereNot({ "transactions.customerid": "0" /*consignator*/ });
      if (consignator !== "0") {
        pt.where({ "transactions.customerid": consignator });
      }
      if (point !== "0") {
        pt.where({ "points.id": point });
      }
    })
    .andWhere(
      knex.raw(`
                      CASE when ${isHolding} then
                      transactions.company in 
                        (
                        WITH RECURSIVE nodes(id) AS 
                          (
                          SELECT r.id
                          FROM companies AS r
                          WHERE r.id = ${company}
                          UNION ALL
                          SELECT r.id
                          FROM companies AS r, nodes AS nd
                          WHERE nd.id = r.holding_parent
                          )
                          SELECT * FROM nodes
                        )
                      ELSE
                      transactions.company = ${company} 
                      END
                      AND
                      (
                        ${company} = ${tokenCompany} 
                        or ${tokenCompany} = ${adminCompany}
                        or ${company} in
                        (
                        WITH RECURSIVE nodes(id) AS 
                          (
                          SELECT r.id
                          FROM companies AS r
                          WHERE r.id = ${tokenCompany}
                          UNION ALL
                          SELECT r.id
                          FROM companies AS r, nodes AS nd
                          WHERE nd.id = r.holding_parent
                          )
                        SELECT * FROM nodes
                        )
                      )
				    `)
    )
    .select(
      "transactions.id",
      "transactions.ticketid",
      "transactions.date",
      "transactions.price",
      knex.raw(
        `(transactions.discount + transactions.detailsdiscount) as discount`
      ),
      "transactions.cardpay",
      "transactions.cashpay",
      "transactions.debitpay",
      "transactions.bonuspay",
      "transactions.bonusadd",
      "cashboxes.name as cashbox",
      "cashbox_users.name as cashboxuser",
      "transactions.paymenttype",
      "transactions.tickettype",
      "points.id as pointid",
      "points.name as pointname",
      knex.raw(`coalesce(cons.name,'') as consultant`)
    )
    .orderBy("transactions.date", "desc")
    .then((transactions) => {
      transactions.forEach((transaction, idx) => {
        transaction.pointname = helpers.decrypt(transaction.pointname);
        transaction.cashbox = helpers.decrypt(transaction.cashbox);
        transaction.index = idx + 1;
      });

      const report = excel.buildExport([
        // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
        {
          name: "Report", // <- Specify sheet name (optional)
          //heading: heading, // <- Raw heading array (optional)
          //merges: merges, // <- Merge cell ranges
          specification: specificationtrans, // <- Report specification
          data: transactions, // <-- Report data
        },
      ]);

      // You can then return this straight
      res.attachment("report.xlsx"); // This is sails.js specific (in general you need to set headers)
      return res.send(report);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
});

module.exports = router;
