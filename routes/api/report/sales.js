const express = require('express');
const knex = require('../../../db/knex');
const helpers = require('../../../middlewares/_helpers');
const moment = require('moment');
const excel = require("node-excel-export");
moment.locale("ru");
const router = new express.Router();


router.post("/", (req, res) => {
  const dateFrom = moment(req.body.dateFrom);
  const dateTo = moment(req.body.dateTo);
  const point = req.body.point;
  const counterparty =
    typeof req.body.counterparty !== "undefined" &&
    req.body.counterparty !== null
      ? req.body.counterparty
      : "0";
  const category =
    typeof req.body.category !== "undefined" && req.body.category !== null
      ? req.body.category
      : "@";
  const brand =
    typeof req.body.brand !== "undefined" && req.body.brand !== null
      ? req.body.brand
      : "@";
  let company = req.userData.company;
  if (company === "15" && req.body.company) company = req.body.company;
  const attribute =
    typeof req.body.attribute !== "undefined" && req.body.attribute !== null
      ? req.body.attribute
      : "@";
  const attrval =
    typeof req.body.attrval !== "undefined" && req.body.attrval !== null
      ? req.body.attrval
      : "";
  const type =
    typeof req.body.type !== "undefined" &&
    req.body.type !== null &&
    req.body.type !== "@"
      ? req.body.type
      : "0";
  const notattr =
    typeof req.body.notattr !== "undefined" && req.body.notattr !== null
      ? req.body.notattr
      : "0";
  const code = req.body.code;

  const setStock = (point) => {
    return knex("pointset").select("stock").where("point", point);
  };

  
  //console.log("33");
  
  const stockTableColumns = [
    "stockcurrent.product as product",
    "stockcurrent.company as company",
  ];

  const stockTableGrouping = ["stockcurrent.product", "stockcurrent.company"];

  var stockTable = knex("stockcurrent")
    .select(stockTableColumns)
    .sum("stockcurrent.units as stock")
    .groupBy(stockTableGrouping)
    .as("st");

  const conditions = {
    "st.product": "tbl1.product",
    "st.company": "tbl1.company",
  };

  var innerQuery = knex("transactions")
    .innerJoin("transaction_details", {
      "transaction_details.transactionid": "transactions.id",
    })
    .innerJoin("products", { "products.id": "transaction_details.product" })
    // 15.08.2022
    .innerJoin("products_barcode", { "products_barcode.product": "transaction_details.product" })
    // 15.08.2022
    .innerJoin("points", { "points.id": "transactions.point" })
    .innerJoin("pointset", "pointset.point", "transactions.point")
    .innerJoin(
      knex.raw(
        "stockcurrent as s on (transaction_details.product = s.product and transaction_details.attributes = s.attributes and pointset.stock = s.point and transaction_details.company = s.company)"
      )
    )

    .leftJoin(
      knex.raw(
        `categories as c on (products.category = c.id and c.company in (${company},0))`
      )
    )
    .leftJoin("brands", "brands.id", "products.brand")
    .leftJoin(knex.raw("cashbox_users as u on (u.id = transactions.sellerid)"))
    .whereRaw(`transactions.company = ${req.userData.company}`)
    .andWhereRaw(`(${point} = 0 or points.id = ${point})`)
    .andWhereRaw(`(${type} = 0 or transactions.tickettype = ${type})`)
    .andWhereRaw(`(products_barcode.barcode = '${code}' or '${code}' = '')`)
    .select(
      knex.raw("transactions.date as sell_date"),
      knex.raw("u.name as consultant"),
      knex.raw("points.id as point"),
      knex.raw("s.units as stock"),
      knex.raw("max(transaction_details.taxrate * 100) as taxrate"),
      knex.raw("s.product as product"),
      knex.raw("s.company as company"),
      knex.raw("transaction_details.attributes as attributes"),
      knex.raw(
        "case transactions.tickettype when 0 then 'Продажа' when 1 then 'Возврат' else 'Не определен' end as type"
      ),
      knex.raw(
        "case " +
          notattr +
          " when 1 then products.name || array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = transaction_details.attributes),', ') else products.name end as name"
      ),
	  ///////06.10.2023
      /*
	  knex.raw(
        `sum(round(cast((transaction_details.totalprice-transaction_details.discount-transaction_details.bonuspay-transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2)) as tax`
      ),
	  */
	  knex.raw(
        `(round(cast((transaction_details.totalprice-transaction_details.discount-transaction_details.bonuspay-transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2)) as tax`
      ),
	  ///////06.10.2023
      knex.raw(
        `array_to_string(array(select c.name from counterparties c inner join counterparty2product cp on (cp.counterparty = c.id and cp.company = c.company) where cp.product = products.id and cp.company = ${company}),', ') as counterparty`
      ),
      knex.raw("coalesce(c.name,'Без категории') as category"),
      "brands.brand",
	  
	  ///////06.10.2023
      /*     
	 knex.raw(
        `sum(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount`
      ),
      knex.raw(
        `sum(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) - (transaction_details.bonuspay * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount_bonus`
      ),
      knex.raw(
        `sum(transaction_details.discount + transaction_details.ticketdiscount) as discount`
      )
    )
    .sum("transaction_details.totalprice as fullprice")
    .sum("transaction_details.bonuspay as bonus")
    .sum("transaction_details.units as units")
	*/
	knex.raw(
        `(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount`
      ),
      knex.raw(
        `(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) - (transaction_details.bonuspay * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount_bonus`
      ),
      knex.raw(
        `(transaction_details.discount + transaction_details.ticketdiscount) as discount`
      )
    
    ,knex.raw("transaction_details.totalprice as fullprice")
    ,knex.raw("transaction_details.bonuspay as bonus")
    ,knex.raw("transaction_details.units as units")
	)
	///////06.10.2023
    .andWhereBetween(knex.raw("transactions.date::date"), [
      dateFrom.format(),
      dateTo.format(),
    ])
    .whereExists(function () {
      counterparty !== "0"
        ? this.select("*")
            .from("counterparty2product as cp")
            .whereRaw("cp.counterparty = ?", [counterparty])
            .andWhereRaw("cp.product = products.id")
            .andWhereRaw("cp.company = ?", [company])
        : this.select(knex.raw("1"));
    })
    .whereExists(function () {
      category !== "@"
        ? this.select("*")
            .from("categories")
            .andWhereRaw(`id in (${category.map((c) => `'${c}'`).join(",")})`) //"id = ?", [category]
            .whereRaw("id = products.category")
            .andWhereRaw(`c.company in (${company},0)`)
        : this.select(knex.raw("1"));
    })
    .whereExists(function () {
      brand !== "@"
        ? this.select("*")
            .from("brands")
            .andWhereRaw("id = ?", [brand])
            .whereRaw("id = products.brand")
        : this.select(knex.raw("1"));
    })
  
    .groupBy(
      "u.name",
      "points.id",
      "s.units",
      "s.product",
      "s.company",
      "products.id",
      "products.name",
      "transaction_details.attributes",
      "c.name",
      "brands.brand",
      "transactions.tickettype",
      "transactions.date"
	  
	  ///////06.10.2023 
	  ,"transaction_details.totalprice",
	  "transaction_details.discount",
	  "transaction_details.bonuspay",
	  "transaction_details.ticketdiscount"
      ,"transaction_details.taxrate",
	  "transaction_details.units"
	  ///////06.10.2023
	  
    )
    .as("tbl1");

  if (point !== "0") {
    stockTableColumns.push("stockcurrent.point as point");
    stockTableGrouping.push("stockcurrent.point");
  }
  
  ///////06.10.2023
  
  // console.log("22");
  
  //console.log(innerQuery.toSQL());
  
  ///////06.10.2023

  if (notattr == 1) {
    stockTableColumns.push("stockcurrent.attributes");
    conditions["st.attributes"] = "tbl1.attributes";
    stockTableGrouping.push("stockcurrent.attributes");

    knex(innerQuery)
      .innerJoin(stockTable, conditions)
      .select(
        "tbl1.consultant",
        "tbl1.counterparty",
        "tbl1.type",
        "tbl1.sell_date",
        "tbl1.name",
        "tbl1.brand",
        "tbl1.category",
        "tbl1.taxrate",
        knex.raw("st.stock::float8 as stock")
      )
      .sum("tbl1.units as units")
      .sum("tbl1.tax as tax")
      .sum("tbl1.price_discount as price_discount")
      .sum("tbl1.price_discount_bonus as price_discount_bonus")
      .sum("tbl1.fullprice as fullprice")
      .modify(function (params) {
        if (point !== "0") {
          this.where("st.point", setStock(point));
        }
      })
      .groupBy(
        "tbl1.consultant",
        "tbl1.counterparty",
        "st.stock",
        "tbl1.type",
        "tbl1.name",
        "tbl1.taxrate",
        "tbl1.category",
        "tbl1.brand",
        "tbl1.sell_date"
      )
      .orderBy("sell_date", "desc")
      .orderBy("name")
      .then((sales) => {
        return res.status(200).json(sales);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  } else {
    knex(innerQuery)
      .innerJoin(stockTable, conditions)
      .select(
        "tbl1.consultant",
        "tbl1.counterparty",
        "tbl1.type",
        "tbl1.sell_date",
        "tbl1.name",
        "tbl1.brand",
        "tbl1.category",
        knex.raw("st.stock::float8 as stock")
      )
      .sum("tbl1.units as units")
      .sum("tbl1.price_discount as price_discount")
      .sum("tbl1.price_discount_bonus as price_discount_bonus")
      .sum("tbl1.fullprice as fullprice")
      .modify(function (params) {
        if (point !== "0") {
          this.where("st.point", setStock(point));
        }
      })
      .groupBy(
        "tbl1.consultant",
        "tbl1.counterparty",
        "st.stock",
        "tbl1.counterparty",
        "tbl1.type",
        "tbl1.name",
        "tbl1.brand",
        "tbl1.category",
        "tbl1.sell_date"
      )
      .orderBy("sell_date", "desc")
      .orderBy("name")
      .then((sales) => {
        return res.status(200).json(sales);
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  }
});

router.post("/simple", (req, res) => {
  const barcode =
    typeof req.body.barcode !== "undefined" && req.body.barcode !== null
      ? req.body.barcode
      : "";
  const brand =
    typeof req.body.brand !== "undefined" && req.body.brand !== null
      ? req.body.brand
      : "@";
  const category =
    typeof req.body.category !== "undefined" && req.body.category !== null
      ? req.body.category
      : "@";
  const counterparty =
    typeof req.body.counterparty !== "undefined" &&
    req.body.counterparty !== null
      ? req.body.counterparty
      : "0";
  /*const pointID =
    typeof req.body.pointID !== "undefined" && req.body.pointID !== null
      ? req.body.pointID
			: "0";*/

		const pointID =
			typeof req.body.pointID !== "undefined" && req.body.pointID !== null
			? parseInt(req.body.pointID) > 0 ? parseInt(req.body.pointID)+1 : req.body.pointID
			: "0";

	  //const stockID = knex("pointset").select("stock").where("point","=",pointID);

	  knex.raw(
        `
        SELECT  
           distinct		
		case s.reason when -1 then 'Продажа' else 'Возврат' end as reason, s.product, s.price, s.units, 
		p.name as point_name, pr.name as product_name, b.brand, c.name as category_name
	  FROM (
		select product, point as point_id, sum(price*units) as price, sum(units) as units, company, reason
		  from stockdiary
		where company=${req.userData.company}
		  and reason IN (-1,2)
		  and date::date between to_date('${req.body.dateFrom}','dd.mm.yyyy') and to_date('${req.body.dateTo}','dd.mm.yyyy') 
		  GROUP BY product, point_id, company, reason
	  ) as s
    
    inner join products pr on (pr.id=s.product)
    -- 15.08.2022
    inner join products_barcode pb on (pb.product=s.product)
    -- 15.08.2022
		left join categories c on (c.id=pr.category)
		left join brands b on (b.id = pr.brand)
		left join points p on (p.id = s.point_id)
	  WHERE
		s.price <> 0
		-- 20240129 AB fix remove certificates from report <
		and pr.type = 0
	    -- 20240129 AB fix remove certificates from report >
    -- 15.08.2022
    -- ${barcode ? ` and pr.code = '${barcode}'` : ""}
    ${barcode ? ` and pb.barcode = '${barcode}'` : ""}
    -- 15.08.2022
		${brand !== "@" ? ` and pr.brand = ${brand}` : ""} 
		${pointID !== "0" ? ` and s.point_id = ${pointID}` : ""} 
		${category !== "@" && category.length > 0 ? ` and pr.category in (${category.map((c) => `${c}`).join(",")})` : ""}
	  ORDER BY s.units desc, pr.name asc;
        `
	  )
    .then((result) => {
      let data = result.rows.slice();
      data = data.map((item) => {
        const point_name = item.point_name.substring(13);
        return {
          ...item,
          point_name: `${helpers.decrypt(point_name)}`,
        };
      });
      return res.status(200).json(data);
    })
    .catch((err) => {
		console.log(err);
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    });
});

/////////19.01.2024


router.get('/dailysales', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const client = req.query.client; // fiz/jur

	const tokenCompany = req.userData.company;
	const company = req.query.company ? req.query.company : tokenCompany;
	const isHolding = req.query.holding ? req.query.holding : false;
	const adminCompany = 15;


	knex('transactions')
		//.innerJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
		.innerJoin('cashbox_users', 'cashbox_users.id', 'transactions.cashboxuser')
		.innerJoin('points', { 'points.id': 'cashbox_users.point', 'points.company': 'transactions.company' })
		
		/////////19.01.2024 
		.leftJoin('salesplan', { 'cashbox_users.id': 'salesplan.object', 'salesplan.type': 1 })
		.leftJoin(knex.raw(`
		team_daily on transactions.company=team_daily.company and cashbox_users.name=team_daily.name and cast(team_daily.dat as date)= cast(transactions.date as date)
		`))
		/////////19.01.2024
		
		.where({ 'transactions.company': company })
		//20240129 AB exclude certificate sales from report <
		.whereNot({"transactions.ofdurl": "certificate"})
		//20240129 AB exclude certificate sales from report >		
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.where((pt) => {
			client !== 'jur' ? pt.where({ 'transactions.customerid': '0' }) : pt.andWhereNot({ 'transactions.customerid': '0' })
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
		.select('cashbox_users.name',
			//knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withoutVATcash, 
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withoutVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withVATcash,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as VAT,
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithoutVATcash,
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithoutVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithVATcash,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as retVAT`))
			knex.raw(`coalesce(sum(case when transactions.tickettype = 0 then transactions.cashpay else null end),0) as cash,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.cashpay else null end),0) as retcash,					  
					  ----22.09.2023
					  coalesce(sum(case when transactions.tickettype = 0 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null)  then transactions.cardpay else null end),0) as card,
					  coalesce(sum(case when transactions.tickettype = 1 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null) then transactions.cardpay else null end),0) as retcard,
					  coalesce(sum(case when transactions.tickettype = 0 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null) then transactions.debitpay else null end),0) as debitpay,
					  coalesce(sum(case when transactions.tickettype = 1 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null) then transactions.debitpay else null end),0) as retdebitpay,
					  coalesce(sum(case when transactions.tickettype = 0 and position('KASPI' in paymenttransid)>0 then transactions.debitpay+transactions.cardpay else null end),0) as kaspipay,
					  coalesce(sum(case when transactions.tickettype = 1 and position('KASPI' in paymenttransid)>0 then transactions.debitpay+transactions.cardpay else null end),0) as retkaspipay,
					  ---coalesce(sum(case when transactions.tickettype = 0 then transactions.cardpay else null end),0) as card,
					  ---coalesce(sum(case when transactions.tickettype = 1 then transactions.cardpay else null end),0) as retcard,
					  ---coalesce(sum(case when transactions.tickettype = 0 then transactions.debitpay else null end),0) as debitpay,
					  ---coalesce(sum(case when transactions.tickettype = 1 then transactions.debitpay else null end),0) as retdebitpay,
					  ----22.09.2023
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.debtpay else null end),0) as debtpay,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.bonuspay else null end),0) as bonuspay,
					  coalesce(sum(case when transactions.tickettype = 1 then -transactions.bonuspay else null end),0) as retbonuspay,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.certpay else null end),0) as certpay,
					  coalesce(sum(case when transactions.tickettype = 0 then (transactions.discount + transactions.detailsdiscount) else null end),0) as discount,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.price + transactions.bonuspay else null end),0) as total_discount,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.price else null end),0) as total_discount_bonus,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.price - transactions.bonuspay else null end),0) as rettotal
					 
					 ----19.01.2024
					 ,sum(transactions.price) as sumprod					  
,salesplan.daily	
,case when sum(transactions.price) > salesplan.daily then round(cast(salesplan.drate*sum(transactions.price)/100 as numeric),2) else '0' end as award
,team_daily.plan 
,team_daily.total_award 
,cast(transactions."date" as date) as datezap
----19.01.2024 

					`)  )
		.groupBy('cashbox_users.name'
		
		/////////19.01.2024 
		,knex.raw(`cast(transactions.date as date) `)
		,'salesplan.daily'
		,'salesplan.drate'
        ,'team_daily.plan' 
        ,'team_daily.total_award' 
		/////////19.01.2024 
		
		)
		
		
		/////////19.01.2024
		
		.orderBy(
		'cashbox_users.name'
		,knex.raw(`, cast(transactions.date as date) `)
		)
		// .orderBy('sum', 'desc')
		
		/////////19.01.2024
		
		.then(sales => {
			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});



router.get('/vatdailysales', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const client = req.query.client; // fiz/jur

	const tokenCompany = req.userData.company;
	const company = req.query.company ? req.query.company : tokenCompany;
	const isHolding = req.query.holding ? req.query.holding : false;
	const adminCompany = 15;

	knex('transactions')
		.innerJoin('transaction_details', { 'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company' })
		.innerJoin('cashbox_users', 'cashbox_users.id', 'transactions.cashboxuser')
		.innerJoin('points', { 'points.id': 'cashbox_users.point', 'points.company': 'transactions.company' })
		
		/////////19.01.2024
		.leftJoin('salesplan', { 'cashbox_users.id': 'salesplan.object', 'salesplan.type': 1 })
		.leftJoin(knex.raw(`
		team_daily on transactions.company=team_daily.company and cashbox_users.name=team_daily.name and cast(team_daily.dat as date)= cast(transactions.date as date)
		`))
		/////////19.01.2024
		
		.where({ 'transactions.company': company })
		//20240129 AB exclude certificate sales from report <
		.whereNot({"transactions.ofdurl": "certificate"})
		//20240129 AB exclude certificate sales from report >
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.where((pt) => {
			client !== 'jur' ? pt.where({ 'transactions.customerid': '0' }) : pt.andWhereNot({ 'transactions.customerid': '0' })
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
		.select('cashbox_users.name',
			knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then transaction_details.totalprice else null end),0) as withVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then transaction_details.nds else null end),0) as VAT,
				coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.ticketdiscount else null end),0) as total_discount,
				coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as total_discount_bonus,				
				coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as retwithoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then transaction_details.totalprice else null end),0) as retwithVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then transaction_details.nds else null end),0) as retVAT,
				coalesce(sum(case when transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as rettotal
				
				---19.01.2024
					 ,sum(transactions.price) as sumprod					  
,salesplan.daily	
,case when sum(transactions.price) > salesplan.daily then round(cast(salesplan.drate*sum(transactions.price)/100 as numeric),2) else '0' end as award
,team_daily.plan 
,team_daily.total_award 
,cast(transactions.date as date) as datezap
----19.01.2024 
				
				` ) )
		.groupBy('cashbox_users.name'
		
		/////////19.01.2024 
		,knex.raw(`cast(transactions.date as date) `)
		,'salesplan.daily'
		,'salesplan.drate'
        ,'team_daily.plan' 
        ,'team_daily.total_award' 
		/////////19.01.2024 
		
		)
		/////////19.01.2024
		
		.orderBy(
		'cashbox_users.name'
		,knex.raw(`, cast(transactions.date as date) `)
		)
		// .orderBy('sum', 'desc')
		
		/////////19.01.2024
		.then(sales => {
			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});


/////////19.01.2024

router.get('/cashboxuser', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const client = req.query.client; // fiz/jur

	const tokenCompany = req.userData.company;
	const company = req.query.company ? req.query.company : tokenCompany;
	const isHolding = req.query.holding ? req.query.holding : false;
	const adminCompany = 15;


	knex('transactions')
		//.innerJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
		.innerJoin('cashbox_users', 'cashbox_users.id', 'transactions.cashboxuser')
		.innerJoin('points', { 'points.id': 'cashbox_users.point', 'points.company': 'transactions.company' })
		.where({ 'transactions.company': company })
		//20240129 AB exclude certificate sales from report <
		.whereNot({"transactions.ofdurl": "certificate"})
		//20240129 AB exclude certificate sales from report >
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.where((pt) => {
			client !== 'jur' ? pt.where({ 'transactions.customerid': '0' }) : pt.andWhereNot({ 'transactions.customerid': '0' })
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
		.select('cashbox_users.name',
			//knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withoutVATcash, 
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withoutVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withVATcash,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as VAT,
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithoutVATcash,
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithoutVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithVATcash,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as retVAT`))
			knex.raw(`coalesce(sum(case when transactions.tickettype = 0 then transactions.cashpay else null end),0) as cash,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.cashpay else null end),0) as retcash,					  
					  ----22.09.2023
					  coalesce(sum(case when transactions.tickettype = 0 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null)  then transactions.cardpay else null end),0) as card,
					  coalesce(sum(case when transactions.tickettype = 1 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null) then transactions.cardpay else null end),0) as retcard,
					  coalesce(sum(case when transactions.tickettype = 0 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null) then transactions.debitpay else null end),0) as debitpay,
					  coalesce(sum(case when transactions.tickettype = 1 and (position('KASPI' in paymenttransid)=0 or position('KASPI' in paymenttransid) is null) then transactions.debitpay else null end),0) as retdebitpay,
					  coalesce(sum(case when transactions.tickettype = 0 and position('KASPI' in paymenttransid)>0 then transactions.debitpay+transactions.cardpay else null end),0) as kaspipay,
					  coalesce(sum(case when transactions.tickettype = 1 and position('KASPI' in paymenttransid)>0 then transactions.debitpay+transactions.cardpay else null end),0) as retkaspipay,
					  ---coalesce(sum(case when transactions.tickettype = 0 then transactions.cardpay else null end),0) as card,
					  ---coalesce(sum(case when transactions.tickettype = 1 then transactions.cardpay else null end),0) as retcard,
					  ---coalesce(sum(case when transactions.tickettype = 0 then transactions.debitpay else null end),0) as debitpay,
					  ---coalesce(sum(case when transactions.tickettype = 1 then transactions.debitpay else null end),0) as retdebitpay,
					  ----22.09.2023
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.debtpay else null end),0) as debtpay,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.bonuspay else null end),0) as bonuspay,
					  coalesce(sum(case when transactions.tickettype = 1 then -transactions.bonuspay else null end),0) as retbonuspay,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.certpay else null end),0) as certpay,
					  coalesce(sum(case when transactions.tickettype = 0 then (transactions.discount + transactions.detailsdiscount) else null end),0) as discount,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.price + transactions.bonuspay else null end),0) as total_discount,
					  coalesce(sum(case when transactions.tickettype = 0 then transactions.price else null end),0) as total_discount_bonus,
					  coalesce(sum(case when transactions.tickettype = 1 then transactions.price - transactions.bonuspay else null end),0) as rettotal`))
		.groupBy('cashbox_users.name')
		// .orderBy('sum', 'desc')
		.then(sales => {
			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

// select c.name, 
//    coalesce(sum(case when td.taxrate = 0 and t.tickettype = 0 and t.paymenttype = 'cash' then td.totalprice else null end),0) as withoutVATcash, 
//	  coalesce(sum(case when td.taxrate = 0 and t.tickettype = 0 and t.paymenttype = 'card' then td.totalprice else null end),0) as withoutVATcard,
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 0 and t.paymenttype = 'cash' then td.totalprice else null end),0) as withVATcash,
//	  coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 0 and t.paymenttype = 'card' then td.totalprice else null end),0) as withVATcard,
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 0 then round(cast(td.totalprice/(td.taxrate+1)*td.taxrate as numeric),2)else null end),0) as VAT,    
//	  coalesce(sum(case when td.taxrate = 0 and t.tickettype = 1 and t.paymenttype = 'cash' then td.totalprice else null end),0) as retwithoutVATcash,
//	  coalesce(sum(case when td.taxrate = 0 and t.tickettype = 1 and t.paymenttype = 'card' then td.totalprice else null end),0) as retwithoutVATcard,
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 1 and t.paymenttype = 'cash' then td.totalprice else null end),0) as retwithVATcash,
//	  coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 1 and t.paymenttype = 'card' then td.totalprice else null end),0) as retwithVATcard,
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 1 then round(cast(td.totalprice/(td.taxrate+1)*td.taxrate as numeric),2) else null end),0) as retVAT
// from transactions t
// inner join transaction_details td on (td.transactionid = t.id)
// inner join points ps on (ps.id = t.point)
// inner join cashboxes c on (c.id = t.cashbox)
// where ps.company = 15
// and t.date::date between to_date('30.11.2018','DD.MM.YYYY') and to_date('30.12.2018','DD.MM.YYYY')
// group by c.name
//


router.get('/cashbox', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const client = req.query.client; // fiz/jur

	const tokenCompany = req.userData.company;
	const company = req.query.company ? req.query.company : tokenCompany;
	const isHolding = req.query.holding ? req.query.holding : false;
	const adminCompany = 15;


	knex('transactions')
		//.innerJoin('transaction_details', {'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company'})
		.innerJoin('cashboxes', 'cashboxes.id', 'transactions.cashbox')
		.innerJoin('points', { 'points.id': 'cashboxes.point', 'points.company': 'transactions.company' })
		.where({ 'transactions.company': company })
		//20240129 AB exclude certificate sales from report <
		.whereNot({"transactions.ofdurl": "certificate"})
		//20240129 AB exclude certificate sales from report >
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.where((pt) => {
			client !== 'jur' ? pt.where({ 'transactions.customerid': '0' }) : pt.andWhereNot({ 'transactions.customerid': '0' })
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
		.select('cashboxes.name', 'cashboxes.id', 'points.name as point', 'points.id as pointID',
			//knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withoutVATcash, 
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withoutVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withVATcash,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as withVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as VAT,    
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithoutVATcash,
			//	coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithoutVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 and transactions.paymenttype = 'cash' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithVATcash,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 and transactions.paymenttype = 'card' then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay else null end),0) as retwithVATcard,
			//	coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as retVAT`))
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
		.groupBy('cashboxes.name', 'points.name', 'cashboxes.id', 'points.id')
		.orderBy('points.id')
		.orderBy('cashboxes.id')
		.then(sales => {
			sales.forEach(sale => {
				sale.name = helpers.decrypt(sale.name);
				sale.point = helpers.decrypt(sale.point);
			});

			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/ndscashboxuser', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const client = req.query.client; // fiz/jur

	const tokenCompany = req.userData.company;
	const company = req.query.company ? req.query.company : tokenCompany;
	const isHolding = req.query.holding ? req.query.holding : false;
	const adminCompany = 15;

	knex('transactions')
		.innerJoin('transaction_details', { 'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company' })
		.innerJoin('cashbox_users', 'cashbox_users.id', 'transactions.cashboxuser')
		.innerJoin('points', { 'points.id': 'cashbox_users.point', 'points.company': 'transactions.company' })
		.where({ 'transactions.company': company })
		//20240129 AB exclude certificate sales from report <
		.whereNot({"transactions.ofdurl": "certificate"})
		//20240129 AB exclude certificate sales from report >
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.where((pt) => {
			client !== 'jur' ? pt.where({ 'transactions.customerid': '0' }) : pt.andWhereNot({ 'transactions.customerid': '0' })
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
		.select('cashbox_users.name',
			knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then transaction_details.totalprice else null end),0) as withVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then transaction_details.nds else null end),0) as VAT,
				coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.ticketdiscount else null end),0) as total_discount,
				coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as total_discount_bonus,				
				coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as retwithoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then transaction_details.totalprice else null end),0) as retwithVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then transaction_details.nds else null end),0) as retVAT,
				coalesce(sum(case when transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as rettotal`))
		.groupBy('cashbox_users.name')
		.then(sales => {
			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/ndscashbox', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const client = req.query.client; // fiz/jur

	const tokenCompany = req.userData.company;
	const company = req.query.company ? req.query.company : tokenCompany;
	const isHolding = req.query.holding ? req.query.holding : false;
	const adminCompany = 15;


	knex('transactions')
		.innerJoin('transaction_details', { 'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company' })
		.innerJoin('cashboxes', 'cashboxes.id', 'transactions.cashbox')
		.innerJoin('points', { 'points.id': 'cashboxes.point', 'points.company': 'transactions.company' })
		.where({ 'transactions.company': company })
		//20240129 AB exclude certificate sales from report <
		.whereNot({"transactions.ofdurl": "certificate"})
		//20240129 AB exclude certificate sales from report >
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.where((pt) => {
			client !== 'jur' ? pt.where({ 'transactions.customerid': '0' }) : pt.andWhereNot({ 'transactions.customerid': '0' })
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
		.select('cashboxes.name', 'cashboxes.id', 'points.name as point', 'points.id as pointID',
			knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as VAT,
				   coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.ticketdiscount else null end),0) as total_discount,
				   coalesce(sum(case when transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as total_discount_bonus,
				coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as retwithoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as retwithVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then round(cast((transaction_details.totalprice)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as retVAT,
				coalesce(sum(case when transactions.tickettype = 1 then transaction_details.totalprice + transaction_details.discount + transaction_details.ticketdiscount else null end),0) as rettotal`))
		.groupBy('cashboxes.name', 'points.name', 'cashboxes.id', 'points.id')
		.orderBy('points.id')
		.orderBy('cashboxes.id')
		.then(sales => {
			sales.forEach(sale => {
				sale.name = helpers.decrypt(sale.name);
				sale.point = helpers.decrypt(sale.point);
			});

			return res.status(200).json(sales);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

// select ps.name, 
//    coalesce(sum(case when td.taxrate = 0 and t.tickettype = 0 then td.totalprice else null end),0) as withoutVAT, 
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 0 then td.totalprice else null end),0) as withVAT,
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 0 then round(cast(td.totalprice/(td.taxrate+1)*td.taxrate as numeric),2) else null end),0) as VAT,
//    coalesce(sum(case when td.taxrate = 0 and t.tickettype = 1 then t.price else null end),0) as retwithoutVAT,
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 1 then t.price else null end),0) as retwithVAT,
//    coalesce(sum(case when td.taxrate <> 0 and t.tickettype = 1 then round(cast(td.totalprice/(td.taxrate+1)*td.taxrate as numeric),2) else null end),0) as retVAT
// from transactions t
// inner join transaction_details td on (td.transactionid = t.id)
// inner join points ps on (ps.id = t.point)
// where ps.company = 15
// and t.date::date between to_date('30.11.2018','DD.MM.YYYY') and to_date('30.12.2018','DD.MM.YYYY')
// group by ps.name;

// Не юзается
router.get('/point', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);

	knex('transactions')
		.innerJoin('transaction_details', { 'transaction_details.transactionid': 'transactions.id', 'transaction_details.company': 'transactions.company' })
		.innerJoin('points', { 'points.id': 'transactions.point', 'points.company': 'transactions.company' })
		.where({ 'transactions.company': req.userData.company })
		//20240129 AB exclude certificate sales from report <
		.whereNot({"transactions.ofdurl": "certificate"})
		//20240129 AB exclude certificate sales from report >
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.select('points.name',
			knex.raw(`coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withoutVAT, 
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as withVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 0 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as VAT,
				coalesce(sum(case when transaction_details.taxrate = 0 and transactions.tickettype = 1 then transactions.price - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as retwithoutVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then transactions.price - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount else null end),0) as retwithVAT,
				coalesce(sum(case when transaction_details.taxrate <> 0 and transactions.tickettype = 1 then round(cast((transaction_details.totalprice - transaction_details.discount - transaction_details.bonuspay - transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2) else null end),0) as retVAT`)
		)
		.groupBy('points.name')
		.then(sales => {
			sales.forEach(sale => {
				sale.name = helpers.decrypt(sale.name);
			});
			return res.status(200).json(sales);
		}).catch((err) => {
			console.log(err)
			return res.status(500).json(err);
		});
});

router.get('/withoutdate',(req,res) => {
	
	
	const barcode = typeof req.query.barcode !== "undefined" && req.query.barcode !== null ? req.query.barcode : ""; // штрихкод
	const brand = typeof req.query.brand !== "undefined" && req.query.brand !== null && req.query.brand !== '@' ?  req.query.brand : "-1"; // бренд
	const category = typeof req.query.category !== "undefined" && req.query.category !== null  && req.query.category !== '@' ? req.query.category : "-1"; //категориЯ
	const client_type = typeof req.query.client_type !== "undefined" && req.query.client_type !== null && req.query.client_type !== '@' ? req.query.client_type : "-1"; // юр.лицо, физ.лицо
	const company = req.userData.company; // компанииЯ
	const counterparty = typeof req.query.counterparty !== "undefined" && req.query.counterparty !== null && Number(req.query.counterparty) !== 0 ?  req.query.counterparty : "-1"; // контрагент
	const data = `${new Date().getFullYear()}-01-01`;  // дата
	const dateFrom = typeof req.query.dateFrom !== "undefined" && req.query.dateFrom !== null ? moment(req.query.dateFrom).format() :moment(data).format(); // дата "с"
	const dateTo = typeof req.query.dateTo !== "undefined" && req.query.dateTo !== null ? moment(req.query.dateTo).format() : moment().format(); // дата "по"
	const point = typeof req.query.point !== "undefined" && req.query.point !== null && Number(req.query.point) !== 0 ? req.query.point : "-1"; // точка (склад)
	const sell_type = typeof req.query.sell_type !== "undefined" && req.query.sell_type != null && req.query.sell_type !== '@' ? req.query.sell_type : "-1"; // тип продаж (розница, оптом)
	const transaction_type = typeof req.query.transaction_type !== "undefined" && req.query.transaction_type != null && req.query.transaction_type !== '@' ? req.query.transaction_type : "-1";// тип транзакции (продажа, возврат)
	//const dateFrom = req.query.dateFrom ? moment(req.query.dateFrom) :'0';
	//const dateTo = req.query.dateTo ? moment(req.query.dateTo) :'0';
	
	

	knex.raw(`
	select 
    case when tr.tickettype = 0 then 'Продажа' else 'Возврат' end as type, 
    pr.code , pr.name, 
    sum(trd.units) as units, 
    sum(trd.totalprice) as totalprice,
    (select co.name from counterparty2product c2p, counterparties co 
      where c2p.counterparty = co.id 
        and pr.id = c2p.product 
          and pr.company = c2p.company
            limit 1
  ) as counterparty ,
    b.brand, 
    ca.name as category,
    coalesce(
      (select sum(s.units )  
        from stockcurrent s 
          where s.product = trd.product 
            and s.company = tr.company
            and (${point} = -1 or s.point = (select stock from pointset where point = ${point}))  
          ),0) as stock
  from transactions tr
    inner join transaction_details trd on (tr.id = trd.transactionid and (trd.wholesale = ${sell_type} or ${sell_type} = -1))
    inner join products pr on (pr.id = trd.product and (pr.code = '${barcode}' or '${barcode}' = ''  ) and pr.company = tr.company)
    left join customers cu on (cu.id = tr.customerid and cu.company = tr.company)
    left join brands b on (pr.brand = b.id and (b.id = ${brand} or ${brand} = -1)) 
    left join categories ca on (pr.category = ca.id and (ca.id = ${category} or ${category} = -1) and ca.company = tr.company)  
  where
    tr.company = ${company} 
    and tr.date::date between '${dateFrom}'::date and '${dateTo}'::date
    and (${client_type} = -1 or ((${client_type} = 0 and tr.customerid = 0) or (${client_type} = 1 and tr.customerid > 0)))
    and (tr.point = ${point} or ${point} = -1)
    and (tr.tickettype = ${transaction_type} or ${transaction_type} = -1)
	-- 20240129 AB fix remove certificates from report <
	and pr.type = 0
	-- 20240129 AB fix remove certificates from report >
    
    group by tr.tickettype, pr.code, pr.name, b.brand, ca.name, counterparty, trd.product, tr.company
		`)
		// and tr.date between '${dateFrom}'::timestamp and '${dateTo}'::timestamp 
        
        .then((result) => {
            return res.status(200).json(result.rows);
        })
        .catch((err) => {
            helpers.log(err);
            return res.status(500).json(err);
        });
	});
 

	

router.post('/withoutdate/excel',(req,res) => {

  const dataSales = req.body.dataSales;

    let add_fields = (arg) => {
        let i = 1;
        for (f of arg) {
    
            f.number = i;
            i++;
        }
    }
    
    add_fields(dataSales);

	const styles = {
	  header: {
		font: {
		  color: {
			rgb: "FF000000",
		  },
		  sz: 12,
		  bold: true,
		},
	  },
	  emptyCell: {},
	};
	const heading = [[{ value: 0, style: styles.header }]];
	
	
	//////05.10.2023
  
  let val="";
//   let curr = JSON.parse(helpers.decrypt(req.userData.locales));
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
    
	const specificationSales = {
		number: {
		displayName: "№",
		headerStyle: styles.header,
		width: "5", 
	  },
		code: {
		displayName: " Код",
		headerStyle: styles.header,
		width: "15", 
	  },
	  	name: {
		displayName: "Наименование",
		headerStyle: styles.header,
		width: "40", 
	  },
	  	brand: {
		displayName: " Бренд",
		headerStyle: styles.header,
		width: "15", 
	  },
	  	category: {
		displayName: "Категория",
		headerStyle: styles.header,
		width: "15", 
	  },
	 	units: {
		displayName: "Количество",
		headerStyle: styles.header,
		width: "10", 
	  },
	  price: {
		
		
		//////05.10.2023  
		//displayName: "Цена, тг",
		displayName: "Цена, "+val,
		
	    //////05.10.2023
		
		headerStyle: styles.header,
		width: "10", 
	  },
	  	totalprice: {
				
		//////05.10.2023
		//displayName: "Сумма, тг",
		displayName: "Сумма, "+val,
		 
	  //////05.10.2023
		
		headerStyle: styles.header,
		width: "10", 
	  },
	  	stock: {
		displayName: "Остаток",
		headerStyle: styles.header,
		width: "10",
	  },
      counterparty: {
		displayName: "Поставщик",
		headerStyle: styles.header,
		width: "20", 
	  },
	};
  
	const merges = [
	];
  
	const report = excel.buildExport([
	  {
		name: "Report",
		merges: merges, 
		specification: specificationSales, 
		data: dataSales, 
	  }
	]);
	
  res.attachment("report.xlsx");
	return res.send(report);
    
})


router.post("/prods_excel", (req, res) => {
	let data = req.body.sales;
	let arr = [];
	data.forEach((element, i) => {
		arr.push({
			...element, id: i + 1, date: moment(element.sell_date).format('lll')
		})
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
		id: {
			displayName: "",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		type: {
			displayName: "Тип",
			headerStyle: styles.emptyCell,
			width: "20", // <- width in chars (when the number is passed as string)
		},
		date: {
			displayName: "Дата",
			headerStyle: styles.emptyCell,
			width: "50", // <- width in chars (when the number is passed as string)
		},
		name: {
			displayName: "Наименование товара",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		consultant: {
			displayName: "Консультант",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		price_discount: {
			displayName: "Итоговая сумма c учётом применённой скидки",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		price_discount_bonus: {
			displayName: "Итоговая сумма c учётом применённой скидки (за минусом использованных бонусов)",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		units: {
			displayName: "Количество",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		stock: {
			displayName: "Текущий остаток",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		counterparty: {
			displayName: "Контрагент",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		brand: {
			displayName: "Бренд",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
		category: {
			displayName: "Категория",
			headerStyle: styles.emptyCell,
			width: "15", // <- width in chars (when the number is passed as string)
		},
	};

	const report = excel.buildExport([
		{
			name: "Проданные товары",
			specification: specification,
			data: arr,
		}
	]);
	res.attachment("report.xlsx");
	return res.send(report);
});

/*
router.get("/simple", (req, res) => {  
	const barcode =
	  typeof req.query.barcode !== "undefined" && req.query.barcode !== null
		? req.query.barcode
		: "";
	const brand =
	  typeof req.query.brand !== "undefined" && req.query.brand !== null
		? req.query.brand
		: "@";
	const category =
	  typeof req.query.category !== "undefined" && req.query.category !== null
		? req.query.category
		: "@";
	const pointID =
	  typeof req.query.pointID !== "undefined" && req.query.pointID !== null
		? parseInt(req.query.pointID) > 0 ? parseInt(req.query.pointID)+1 : req.query.pointID
		: "0";

	knex.raw(
	  `SELECT   
		case s.reason when -1 then 'Продажа' else 'Возврат' end as reason, s.product, s.price, s.units, 
		p.name as point_name, pr.name as product_name, b.brand, c.name as category_name
	  FROM (
		select product, point as point_id, sum(price*units) as price, sum(units) as units, company, reason
		  from stockdiary
		where company=${req.userData.company}
		  and reason IN (-1,2)
		  and date::date between to_date('${req.query.dateFrom}','dd.mm.yyyy') and to_date('${req.query.dateTo}','dd.mm.yyyy') 
		  GROUP BY product, point_id, company, reason
	  ) as s
		inner join products pr on (pr.id=s.product)
		left join categories c on (c.id=pr.category)
		left join brands b on (b.id = pr.brand)
		left join points p on (p.id = s.point_id)
	  WHERE
		s.price <> 0
		${barcode ? ` and pr.code = '${barcode}'` : ""}
		${brand !== "@" ? ` and pr.brand = ${brand}` : ""} 
		${pointID !== "0" ? ` and s.point_id = ${pointID}` : ""} 
		${category !== "@" && category.length > 0 ? ` and pr.category in (${category.map((c) => `${c}`).join(",")})` : ""}
	  ORDER BY s.units desc, pr.name asc
	`).then((result) => {
		let data = result.rows.slice();
		data = data.map((item) => {
		  const point_name = item.point_name.substring(13);
		  return {
			...item,
			point_name: `${helpers.decrypt(point_name)}`,
		  };
		});
		return res.status(200).json(data);
	}).catch((err) => {
		return res.status(500).json({
		  success: false,
		  error: err.message,
		});
	});
});
*/

/*
router.get("/", (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const point = req.query.point;
	const counterparty =
	  typeof req.query.counterparty !== "undefined" &&
	  req.query.counterparty !== null
		? req.query.counterparty
		: "0";
	const category =
	  typeof req.query.category !== "undefined" && req.query.category !== null
		? req.query.category
		: "@";
	const brand =
	  typeof req.query.brand !== "undefined" && req.query.brand !== null
		? req.query.brand
		: "@";
	let company = req.userData.company;
	if (company === "0" && req.query.company) company = req.query.company;
	const attribute =
	  typeof req.query.attribute !== "undefined" && req.query.attribute !== null
		? req.query.attribute
		: "@";
	const attrval =
	  typeof req.query.attrval !== "undefined" && req.query.attrval !== null
		? req.query.attrval
		: "";
	const type =
	  typeof req.query.type !== "undefined" &&
	  req.query.type !== null &&
	  req.query.type !== "@"
		? req.query.type
		: "0";
	const notattr =
	  typeof req.query.notattr !== "undefined" && req.query.notattr !== null
		? req.query.notattr
		: "0";
	const code = req.query.code;
  
	const setStock = (point) => {
	  return knex("pointset").select("stock").where("point", point);
	};
  
	const stockTableColumns = [
	  "stockcurrent.product as product",
	  "stockcurrent.company as company",
	];
  
	const stockTableGrouping = ["stockcurrent.product", "stockcurrent.company"];
  
	var stockTable = knex("stockcurrent")
	  .select(stockTableColumns)
	  .sum("stockcurrent.units as stock")
	  .groupBy(stockTableGrouping)
	  .as("st");
  
	const conditions = {
	  "st.product": "tbl1.product",
	  "st.company": "tbl1.company",
	};
  
	var innerQuery = knex("transactions")
	  .innerJoin("transaction_details", {
		"transaction_details.transactionid": "transactions.id",
	  })
	  .innerJoin("products", { "products.id": "transaction_details.product" })
	  .innerJoin("points", { "points.id": "transactions.point" })
	  .innerJoin("pointset", "pointset.point", "transactions.point")
	  .innerJoin(
		knex.raw(
		  "stockcurrent as s on (transaction_details.product = s.product and transaction_details.attributes = s.attributes and pointset.stock = s.point and transaction_details.company = s.company)"
		)
	  )
  
	  .leftJoin(
		knex.raw(
		  `categories as c on (products.category = c.id and c.company in (${company},0))`
		)
	  )
	  .leftJoin("brands", "brands.id", "products.brand")
	  .leftJoin(knex.raw("cashbox_users as u on (u.id = transactions.sellerid)"))
	  .whereRaw(`transactions.company = ${req.userData.company}`)
	  .andWhereRaw(`(${point} = 0 or points.id = ${point})`)
	  .andWhereRaw(`(${type} = 0 or transactions.tickettype = ${type})`)
	  .andWhereRaw(`(products.code = '${code}' or '${code}' = '')`)
	  .select(
		knex.raw("transactions.date as sell_date"),
		knex.raw("u.name as consultant"),
		knex.raw("points.id as point"),
		knex.raw("s.units as stock"),
		knex.raw("max(transaction_details.taxrate * 100) as taxrate"),
		knex.raw("s.product as product"),
		knex.raw("s.company as company"),
		knex.raw("transaction_details.attributes as attributes"),
		knex.raw("case transactions.tickettype when 0 then 'Продажа' when 1 then 'Возврат' else 'Не определен' end as type"),
		knex.raw("case "+notattr +" when 1 then products.name || array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = transaction_details.attributes),', ') else products.name end as name"),
		knex.raw(`sum(round(cast((transaction_details.totalprice-transaction_details.discount-transaction_details.bonuspay-transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2)) as tax`),
		knex.raw(`array_to_string(array(select c.name from counterparties c inner join counterparty2product cp on (cp.counterparty = c.id and cp.company = c.company) where cp.product = products.id and cp.company = ${company}),', ') as counterparty`),
		knex.raw("coalesce(c.name,'Без категории') as category"),
		"brands.brand",
		knex.raw(`sum(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount`),
		knex.raw(`sum(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) - (transaction_details.bonuspay * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount_bonus`),
		knex.raw(`sum(transaction_details.discount + transaction_details.ticketdiscount) as discount`)
	  )
	  .sum("transaction_details.totalprice as fullprice")
	  .sum("transaction_details.bonuspay as bonus")
	  .sum("transaction_details.units as units")
	  .andWhereBetween(knex.raw("transactions.date::date"), [
		dateFrom.format(),
		dateTo.format(),
	  ])
	  .whereExists(function () {
		counterparty !== "0"
		  ? this.select("*")
			  .from("counterparty2product as cp")
			  .whereRaw("cp.counterparty = ?", [counterparty])
			  .andWhereRaw("cp.product = products.id")
			  .andWhereRaw("cp.company = ?", [company])
		  : this.select(knex.raw("1"));
	  })
	  .whereExists(function () {
		category !== "@"
		  ? this.select("*")
			  .from("categories")
			  .andWhereRaw(`id in (${category.map((c) => `'${c}'`).join(",")})`) //"id = ?", [category]
			  .whereRaw("id = products.category")
			  .andWhereRaw(`c.company in (${company},0)`)
		  : this.select(knex.raw("1"));
	  })
	  .whereExists(function () {
		brand !== "@"
		  ? this.select("*")
			  .from("brands")
			  .andWhereRaw("id = ?", [brand])
			  .whereRaw("id = products.brand")
		  : this.select(knex.raw("1"));
	  })
	  //.whereExists(function () {
			// attribute == '0' ? this.select('*').from('attributelistcode').leftJoin('attrlist', { 'attrlist.listcode': 'attributelistcode.id', 'attrlist.company': 'attributelistcode.company' })
			//	  .leftJoin('attributenames', 'attributenames.id', 'attrlist.attribute').whereRaw('attributelistcode.id = s.attributes').andWhereRaw('attributelistcode.id = 0') :
			//	  attribute !== '@' && attrval !== '' ? this.select('*').from('attributelistcode').leftJoin('attrlist', { 'attrlist.listcode': 'attributelistcode.id', 'attrlist.company': 'attributelistcode.company' })
			//		  .leftJoin('attributenames', 'attributenames.id', 'attrlist.attribute').whereRaw('attributelistcode.id = s.attributes').andWhereRaw('attributenames.id = ?', [attribute])
			//		  .andWhereRaw(`lower(attrlist.value) like lower(('%'||?||'%'))`, [attrval]).andWhereRaw('attributelistcode.company = ?', [company]) :
			//		  attribute !== '@' && attrval == '' ? this.select('*').from('attributelistcode').leftJoin('attrlist', { 'attrlist.listcode': 'attributelistcode.id', 'attrlist.company': 'attributelistcode.company' })
			//			  .leftJoin('attributenames', 'attributenames.id', 'attrlist.attribute').whereRaw('attributelistcode.id = s.attributes').andWhereRaw('attributenames.id = ?', [attribute])
			//			  .andWhereRaw('attributelistcode.company = ?', [company]) : this.select(knex.raw('1'))
		  //})
	  .groupBy(
		"u.name",
		"points.id",
		"s.units",
		"s.product",
		"s.company",
		"products.id",
		"products.name",
		"transaction_details.attributes",
		"c.name",
		"brands.brand",
		"transactions.tickettype",
		"transactions.date"
	  )
	  .as("tbl1");
  
	if (point !== "0") {
	  stockTableColumns.push("stockcurrent.point as point");
	  stockTableGrouping.push("stockcurrent.point");
	}
  
	if (notattr == 1) {
	  stockTableColumns.push("stockcurrent.attributes");
	  conditions["st.attributes"] = "tbl1.attributes";
	  stockTableGrouping.push("stockcurrent.attributes");
  
	  knex(innerQuery)
		.innerJoin(stockTable, conditions)
		.select(
		  "tbl1.consultant",
		  "tbl1.counterparty",
		  "tbl1.type",
		  "tbl1.sell_date",
		  "tbl1.name",
		  "tbl1.brand",
		  "tbl1.category",
		  "tbl1.taxrate",
		  knex.raw("st.stock::float8 as stock")
		)
		.sum("tbl1.units as units")
		.sum("tbl1.tax as tax")
		.sum("tbl1.price_discount as price_discount")
		.sum("tbl1.price_discount_bonus as price_discount_bonus")
		.sum("tbl1.fullprice as fullprice")
		.modify(function (params) {
		  if (point !== "0") {
			this.where("st.point", setStock(point));
		  }
		})
		.groupBy(
		  "tbl1.consultant",
		  "tbl1.counterparty",
		  "st.stock",
		  "tbl1.type",
		  "tbl1.name",
		  "tbl1.taxrate",
		  "tbl1.category",
		  "tbl1.brand",
		  "tbl1.sell_date"
		)
		.orderBy("sell_date", "desc")
		.orderBy("name")
		.then((sales) => {
		  return res.status(200).json(sales);
		})
		.catch((err) => {
		  console.log(err);
		  return res.status(500).json(err);
		});
	} else {
	  knex(innerQuery)
		.innerJoin(stockTable, conditions)
		.select(
		  "tbl1.consultant",
		  "tbl1.counterparty",
		  "tbl1.type",
		  "tbl1.sell_date",
		  "tbl1.name",
		  "tbl1.brand",
		  "tbl1.category",
		  knex.raw("st.stock::float8 as stock")
		)
		.sum("tbl1.units as units")
		.sum("tbl1.price_discount as price_discount")
		.sum("tbl1.price_discount_bonus as price_discount_bonus")
		.sum("tbl1.fullprice as fullprice")
		.modify(function (params) {
		  if (point !== "0") {
			this.where("st.point", setStock(point));
		  }
		})
		.groupBy(
		  "tbl1.consultant",
		  "tbl1.counterparty",
		  "st.stock",
		  "tbl1.counterparty",
		  "tbl1.type",
		  "tbl1.name",
		  "tbl1.brand",
		  "tbl1.category",
		  "tbl1.sell_date"
		)
		.orderBy("sell_date", "desc")
		.orderBy("name")
		.then((sales) => {
		  return res.status(200).json(sales);
		})
		.catch((err) => {
		  console.log(err);
		  return res.status(500).json(err);
		});
	}
	});
	
*/

/*router.get('/', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const point = req.query.point;
	const counterparty = typeof (req.query.counterparty) !== "undefined" && req.query.counterparty !== null ? req.query.counterparty : '0';
	const category = typeof (req.query.category) !== "undefined" && req.query.category !== null ? req.query.category : '@';
	const brand = typeof (req.query.brand) !== "undefined" && req.query.brand !== null ? req.query.brand : '@';
	let company = req.userData.company
	if (company === "0" && req.query.company) company = req.query.company
	const attribute = typeof (req.query.attribute) !== "undefined" && req.query.attribute !== null ? req.query.attribute : '@';
	const attrval = typeof (req.query.attrval) !== "undefined" && req.query.attrval !== null ? req.query.attrval : '';
	const type = typeof (req.query.type) !== "undefined" && req.query.type !== null && req.query.type !== '@' ? req.query.type : '0';
	const notattr = typeof (req.query.notattr) !== "undefined" && req.query.notattr !== null ? req.query.notattr : '0';
	const code = req.query.code;

	const setStock = (point) => {
		return knex('pointset').select('stock').where('point', point);
	}

	const stockTableColumns = ['stockcurrent.product as product', 'stockcurrent.company as company'];

	const stockTableGrouping = ['stockcurrent.product', 'stockcurrent.company'];

	var stockTable = knex('stockcurrent')
		.select(stockTableColumns)
		.sum('stockcurrent.units as stock')
		.groupBy(stockTableGrouping)
		.as('st')

	const conditions = { 'st.product': 'tbl1.product', 'st.company': 'tbl1.company' }

	var innerQuery = knex('transactions')
		.innerJoin('transaction_details', { 'transaction_details.transactionid': 'transactions.id' })
		.innerJoin('products', { 'products.id': 'transaction_details.product' })
		.innerJoin('points', { 'points.id': 'transactions.point' })
		.innerJoin('pointset', 'pointset.point', 'transactions.point')
		.innerJoin(knex.raw('stockcurrent as s on (transaction_details.product = s.product and transaction_details.attributes = s.attributes and pointset.stock = s.point and transaction_details.company = s.company)'))

		.leftJoin(knex.raw(`categories as c on (products.category = c.id and c.company in (${company},0))`))
		.leftJoin('brands', 'brands.id', 'products.brand')
		.leftJoin(knex.raw('cashbox_users as u on (u.id = transactions.sellerid)'))
		.whereRaw(`transactions.company = ${req.userData.company}`)
		.andWhereRaw(`(${point} = 0 or points.id = ${point})`)
		.andWhereRaw(`(${type} = 0 or transactions.tickettype = ${type})`)
		.andWhereRaw(`(products.code = '${code}' or '${code}' = '')`)
		.select(
			knex.raw('transactions.date as sell_date'),
			knex.raw('u.name as consultant'),
			knex.raw('points.id as point'),
			knex.raw('s.units as stock'),
			knex.raw('max(transaction_details.taxrate * 100) as taxrate'),
			knex.raw('s.product as product'),
			knex.raw('s.company as company'),
			knex.raw('transaction_details.attributes as attributes'),
			knex.raw("case transactions.tickettype when 0 then 'Продажа' when 1 then 'Возврат' else 'Не определен' end as type"),
			knex.raw("case " + notattr + " when 1 then products.name || array_to_string(array(select ' | '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = transaction_details.attributes),', ') else products.name end as name"),
			knex.raw(`sum(round(cast((transaction_details.totalprice-transaction_details.discount-transaction_details.bonuspay-transaction_details.ticketdiscount)/(transaction_details.taxrate+1)*transaction_details.taxrate as numeric),2)) as tax`),
			knex.raw(`array_to_string(array(select c.name from counterparties c inner join counterparty2product cp on (cp.counterparty = c.id and cp.company = c.company) where cp.product = products.id and cp.company = ${company}),', ') as counterparty`),
			knex.raw("coalesce(c.name,'Без категории') as category"), 
			'brands.brand',
			knex.raw(`sum(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount`),
			knex.raw(`sum(cast(transaction_details.totalprice - ((transaction_details.discount + transaction_details.ticketdiscount) * case when transactions.tickettype = 1 then (-1) else 1 end) - (transaction_details.bonuspay * case when transactions.tickettype = 1 then (-1) else 1 end) as numeric))::float8 as price_discount_bonus`),
			knex.raw(`sum(transaction_details.discount + transaction_details.ticketdiscount) as discount`)
		)
		.sum('transaction_details.totalprice as fullprice')
		.sum('transaction_details.bonuspay as bonus')
		.sum('transaction_details.units as units')
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.whereExists(function () {
			counterparty !== '0' ? this.select('*').from('counterparty2product as cp').whereRaw('cp.counterparty = ?', [counterparty]).andWhereRaw('cp.product = products.id').andWhereRaw('cp.company = ?', [company]) : this.select(knex.raw('1'))
		})
		.whereExists(function () {
			category !== '@' ? this.select('*').from('categories').andWhereRaw('id = ?', [category]).whereRaw('id = products.category').andWhereRaw(`c.company in (${company},0)`) : this.select(knex.raw('1'))
		})
		.whereExists(function () {
			brand !== '@' ? this.select('*').from('brands').andWhereRaw('id = ?', [brand]).whereRaw('id = products.brand') : this.select(knex.raw('1'))
		})
		
		.groupBy('u.name', 'points.id', 's.units', 's.product', 's.company', 'products.id', 'products.name', 'transaction_details.attributes', 'c.name', 'brands.brand', 'transactions.tickettype', 'transactions.date')
		.as('tbl1')

	if (point !== '0') {

		stockTableColumns.push('stockcurrent.point as point');
		stockTableGrouping.push('stockcurrent.point');
	}

	if (notattr == 1) {

		stockTableColumns.push('stockcurrent.attributes');
		conditions['st.attributes'] = 'tbl1.attributes';
		stockTableGrouping.push('stockcurrent.attributes');

		knex(innerQuery)
			.innerJoin(stockTable, conditions)
			.select('tbl1.consultant', 'tbl1.counterparty', 'tbl1.type', 'tbl1.sell_date', 'tbl1.name', 'tbl1.brand', 'tbl1.category', 'tbl1.taxrate', knex.raw('st.stock::float8 as stock'))
			.sum('tbl1.units as units')
			.sum('tbl1.tax as tax')
			.sum('tbl1.price_discount as price_discount')
			.sum('tbl1.price_discount_bonus as price_discount_bonus')
			.sum('tbl1.fullprice as fullprice')
			.modify(function (params) {
				if (point !== '0') {
					this.where('st.point', setStock(point))
				}
			})
			.groupBy('tbl1.consultant', 'tbl1.counterparty', 'st.stock', 'tbl1.type', 'tbl1.name', 'tbl1.taxrate', 'tbl1.category', 'tbl1.brand', 'tbl1.sell_date')
			.orderBy('sell_date', 'desc')
			.orderBy('name')
			.then(sales => {
				return res.status(200).json(sales);
			}).catch((err) => {
				console.log(err)
				return res.status(500).json(err);
			});
	} else {
		knex(innerQuery)
			.innerJoin(stockTable, conditions)
			.select('tbl1.consultant', 'tbl1.counterparty', 'tbl1.type', 'tbl1.sell_date', 'tbl1.name', 'tbl1.brand', 'tbl1.category', knex.raw('st.stock::float8 as stock'))
			.sum('tbl1.units as units')
			.sum('tbl1.price_discount as price_discount')
			.sum('tbl1.price_discount_bonus as price_discount_bonus')
			.sum('tbl1.fullprice as fullprice')
			.modify(function (params) {
				if (point !== '0') {
					this.where('st.point', setStock(point))
				}
			})
			.groupBy('tbl1.consultant', 'tbl1.counterparty', 'st.stock', 'tbl1.counterparty', 'tbl1.type', 'tbl1.name', 'tbl1.brand', 'tbl1.category', 'tbl1.sell_date')
			.orderBy('sell_date', 'desc')
			.orderBy('name')
			.then(sales => {
				return res.status(200).json(sales);
			}).catch((err) => {
				console.log(err)
				return res.status(500).json(err);
			});
	}
});
*/




module.exports = router;
