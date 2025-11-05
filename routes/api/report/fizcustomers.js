const express = require('express');
const knex = require('../../../db/knex');
const helpers = require('../../../middlewares/_helpers');
const moment = require('moment');
const router = new express.Router();
const customer = require('../customer');



//{"company" : 1, "writeoff_debt_customers" : {"id" : "1", "debt" : 500, "user":5, "clientType":0}}
router.post('/writeoff_debt', async (req, res) => {
	//req.body.company = req.userData.company;
	// req.body.writeoff_debt_customers.system = 'ERP';
     if ((process.env.LOG_LEVEL || 1) >= 1) {
	     // helpers.serverLog(req.originalUrl, req.body, 'info');
          helpers.simpleLog("fizcustomers.js", "/writeoff_debt", JSON.stringify(req.originalUrl) + JSON.stringify(req.body));
     }
     const company = req.userData.company;
     const id = req.body.writeoff_debt_customers.id;
     const debt = req.body.writeoff_debt_customers.debt;
     const user = req.body.writeoff_debt_customers.user;
     const system = req.body.writeoff_debt_customers.system ? req.body.writeoff_debt_customers.system : 'ERP';
     const customerType = req.body.writeoff_debt_customers.clientType ? req.body.writeoff_debt_customers.clientType : 0;

     // {"company":"112", "id" : "1", "customerType": "0", "debt" : 500, "user":5, "system": "ERP"}
     try {
          let result = await  customer.writeoffDebt(company, id, customerType, debt, user, system);
          return result.rowCount == 1 
               ? res.status(200).json({"code":"success","result":result}) 
               : res.status(500).json({"code":"error","result":result});
     } catch {
          return res.status(500).json({"code":"error","result":result});
     };
     


	// knex.raw('select writeoff_customers_debt(?)', [req.body])
	// .then(result => {
	// 	helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
	// 	res.status(result.rows[0].writeoff_customers_debt? 200 : 400).json(result.rows[0].writeoff_customers_debt);
	// 	return;
	// }).catch((err) => {
	// 	helpers.serverLog(req.originalUrl, err, 'error');
	// 	res.status(500).json(err)
	// 	return;
	// })
});


//////19.06.2023

// router.get('/total',(req,res) => {
//      const tokenCompany = req.userData.company;
//      const company = req.query.company?req.query.company:tokenCompany;
//      const isHolding = req.query.holding?req.query.holding:false
//      const adminCompany = 15
//      helpers.serverLog("tokenCompany",tokenCompany); 
	 
// 	 //////23.10.2023
	 
// 	 const p1 = typeof req.query.name !== "undefined" && req.query.name !== null 
//         ? ` lower(t.lastname) like lower('%${req.query.name}%') `
// 		: "";
	 
// 	 //////23.10.2023
	 
	 
	 
	 
//      //helpers.serverLog(req.originalUrl,tokenCompany +' ' +company + ' ' + isHolding,'error')
//     knex("companies")
//     .where({ 'id': tokenCompany })
//     .select(knex.raw('coalesce(bonus_group,0) as group'))
//     .then((groups) => {
//           helpers.serverLog(groups);
//         p_group = new Number(groups[0].group);

//         const subQuery =knex('fiz_customers as t')
//             .leftJoin('customers_bonuscards as p', knex.raw(`p.telephone = t.telephone and case when ${p_group} = 0 then p.company = ${company} else p.company in (select id from companies where bonus_group = ${p_group}) end`))
//             .leftJoin('transactions as tr', function() {
//                 this.on('tr.company', '=', 't.company').andOn ('tr.fiz_customerid', '=', 't.id').andOn('tr.fiz_customerid', '<>', 0)
//             })
//             .leftJoin('companies as c', 'c.id', 't.company')
//             .select(
                
//                     knex.raw(`trim(COALESCE(COALESCE(nullif(p.lastname,''),t.lastname),'') || ' ' ||  COALESCE(COALESCE(nullif(p.firstname,''),t.firstname),'')) as fio`),
//                     't.telephone',knex.raw(`COALESCE(p.status,'NOCARD') as cardstatus`),
//                     knex.raw(`COALESCE(t.id,0) as customer_id`)
                
//             )
//                .where(knex.raw(`
//                               CASE WHEN ${isHolding} THEN
//                                    t.company in 
//                                    (
//                                         WITH RECURSIVE nodes(id) AS 
//                                              (
//                                              SELECT r.id
//                                              FROM companies AS r
//                                              WHERE r.id = ${company}
//                                              UNION ALL
//                                              SELECT r.id
//                                              FROM companies AS r, nodes AS nd
//                                              WHERE nd.id = r.holding_parent
//                                              )
//                                         SELECT * FROM nodes
//                             )
//                             AND case when ${p_group} = 0 then t.company = ${company} else t.company in (select id from companies where bonus_group = ${p_group}) end
//                             ELSE case when ${p_group} = 0 then t.company = ${company} else t.company in (select id from companies where bonus_group = ${p_group}) end 
//                         END
//                               AND
//                               (
//                                    ${company} = ${tokenCompany} 
//                                    or ${tokenCompany} = ${adminCompany}
//                                    or ${company} 
//                                    in
//                                    (
//                                         WITH RECURSIVE nodes(id) AS 
//                                              (
//                                              SELECT r.id
//                                              FROM companies AS r
//                                              WHERE r.id = ${tokenCompany}
//                                              UNION ALL
//                                              SELECT r.id
//                                              FROM companies AS r, nodes AS nd
//                                              WHERE nd.id = r.holding_parent
//                                              )
//                                         SELECT * FROM nodes
//                                    )
//                         )
//             `)
//             )
			
// 			///////23.10.2023
// 			.andWhere(knex.raw(`${p1}`))
// 			///////23.10.2023 
			
//             .groupBy("fio", "t.telephone","t.id", "cardstatus","p.bonuses")
// 			.as('t1')
// 			;
             
//             knex.select(knex.raw('Count(*) as total')).from(subQuery) 			 
//             .then(fizcustomers =>{
                
//                 return res.status(200).json(fizcustomers);
//             }).catch((err) => {
//                 helpers.serverLog(req.originalUrl, err.stack, 'error');
//                 return res.status(500).json(err);
//             });
     
//     })
//     .catch((err) => {
//         return res.status(500).json(err);
//     }); 
// });

//////19.06.2023

// router.get('/',(req,res) => {
//      const tokenCompany = req.userData.company;
//      const company = req.query.company?req.query.company:tokenCompany;
//      const isHolding = req.query.holding?req.query.holding:false
//      const adminCompany = 15
//      helpers.serverLog("tokenCompany",tokenCompany);
	 
// 	 /////16.06.2023
// 	 const activePage = req.query.activePage;
//      const itemsPerPage = req.query.itemsPerPage;
// 	 /////16.06.2023
	 
// 	 //////23.10.2023
	 
// 	 const p1 = typeof req.query.name !== "undefined" && req.query.name !== null 
//         ? ` lower(t.lastname) like lower('%${req.query.name}%') `
// 		: "";
	 
// 	 //////23.10.2023
	 
//      //helpers.serverLog(req.originalUrl,tokenCompany +' ' +company + ' ' + isHolding,'error')
//     knex("companies")
//     .where({ 'id': tokenCompany })
//     .select(knex.raw('coalesce(bonus_group,0) as group'))
//     .then((groups) => {
//           helpers.serverLog(groups);
//         p_group = new Number(groups[0].group);

//         knex('fiz_customers as t')
//             .leftJoin('customers_bonuscards as p', knex.raw(`p.telephone = t.telephone and case when ${p_group} = 0 then p.company = ${company} else p.company in (select id from companies where bonus_group = ${p_group}) end`))
//             .leftJoin('transactions as tr', function() {
//                 this.on('tr.company', '=', 't.company').andOn ('tr.fiz_customerid', '=', 't.id').andOn('tr.fiz_customerid', '<>', 0)
//             })
//             .leftJoin('companies as c', 'c.id', 't.company')
//             .select(
//                 knex.raw(`trim(COALESCE(COALESCE(nullif(p.lastname,''),t.lastname),'') || ' ' ||  COALESCE(COALESCE(nullif(p.firstname,''),t.firstname),'')) as fio`),
//                     't.telephone',knex.raw(`COALESCE(p.status,'NOCARD') as cardstatus`),
//                     knex.raw(`COALESCE(t.id,0) as customer_id`),
//                 // 05.05.2023
//                 //knex.raw(`json_build_object('currbonuses',COALESCE(sum(p.bonuses),0),'allbonuses',COALESCE(sum(tr.bonusadd),0),
//                 knex.raw(`json_build_object('currbonuses',round(coalesce(p.bonuses,0)::numeric, 2),'allbonuses',round(COALESCE(sum(tr.bonusadd),0)::numeric, 2),
//                     'spendbonuses',round(COALESCE(sum(tr.bonuspay),0)::numeric, 2),'price',round(COALESCE(sum(tr.price),0)::numeric, 2),
//                     'debt', json_agg(distinct jsonb_build_object('company',t.company,'name',c.name,'debt',t.debt,'id', t.id))) as details`)
//             )
//                .where(knex.raw(`
//                               CASE WHEN ${isHolding} THEN
//                                    t.company in 
//                                    (
//                                         WITH RECURSIVE nodes(id) AS 
//                                              (
//                                              SELECT r.id
//                                              FROM companies AS r
//                                              WHERE r.id = ${company}
//                                              UNION ALL
//                                              SELECT r.id
//                                              FROM companies AS r, nodes AS nd
//                                              WHERE nd.id = r.holding_parent
//                                              )
//                                         SELECT * FROM nodes
//                             )
//                             AND case when ${p_group} = 0 then t.company = ${company} else t.company in (select id from companies where bonus_group = ${p_group}) end
//                             ELSE case when ${p_group} = 0 then t.company = ${company} else t.company in (select id from companies where bonus_group = ${p_group}) end 
//                         END
//                               AND
//                               (
//                                    ${company} = ${tokenCompany} 
//                                    or ${tokenCompany} = ${adminCompany}
//                                    or ${company} 
//                                    in
//                                    (
//                                         WITH RECURSIVE nodes(id) AS 
//                                              (
//                                              SELECT r.id
//                                              FROM companies AS r
//                                              WHERE r.id = ${tokenCompany}
//                                              UNION ALL
//                                              SELECT r.id
//                                              FROM companies AS r, nodes AS nd
//                                              WHERE nd.id = r.holding_parent
//                                              )
//                                         SELECT * FROM nodes
//                                    )
//                         )
//             `)
//             )
			
// 			///////23.10.2023
// 			.andWhere(knex.raw(`${p1}`))
// 			///////23.10.2023 
			
//             .groupBy("fio", "t.telephone","t.id", "cardstatus","p.bonuses") // 05.05.2023
//             .orderBy('fio')
// 			/////16.06.2023
// 			.limit(itemsPerPage)
//             .offset((activePage - 1) * itemsPerPage)
// 			/////16.06.2023
			
//             .then(fizcustomers =>{
//                 fizcustomers.forEach(customers => {
//                     customers.details.debt.forEach(company => {
//                         helpers.serverLog('company ' + JSON.stringify(company));
//                         company.name = helpers.decrypt(company.name);
//                     });
//                 });
//                 return res.status(200).json(fizcustomers);
//             }).catch((err) => {
//                 helpers.serverLog(req.originalUrl, err.stack, 'error');
//                 return res.status(500).json(err);
//             });
     
//     })
//     .catch((err) => {
//         return res.status(500).json(err);
//     }); 
// });

// router.get('/new',(req,res) => {
//      const tokenCompany = req.userData.company;
//      const company = req.query.company?req.query.company:tokenCompany;
//      const isHolding = req.query.holding?req.query.holding:false
//      const adminCompany = 15

//      //helpers.serverLog(req.originalUrl,tokenCompany +' ' +company + ' ' + isHolding,'error')

//      knex('fiz_customers as t')
//      .leftJoin('customers_bonuscards as p','p.fizid','t.id')
//      .select(
// 	't.id','t.company',knex.raw(`trim(COALESCE(t.lastname,'') || ' ' || COALESCE(t.firstname,'')) as name`),
// 	't.telephone',knex.raw(`COALESCE(p.status,'NOCARD') as cardstatus`),
// 	knex.raw(`(
// 			select json_build_object(
// 					'currbonuses',COALESCE(p.bonuses,0),
// 					'allbonuses',COALESCE(sum(tr.bonusadd),0),
// 					'spendbonuses',COALESCE(sum(tr.bonuspay),0),
// 					'price',COALESCE(sum(tr.price),0),
// 					'debt',COALESCE(t.debt,0))
// 			from transactions tr 
// 			where tr.company = t.company
// 				and tr.fiz_customerid = t.id
// 				and tr.fiz_customerid <> 0
//           ) as details`)
//      )
//      .where(knex.raw(`case when ${isHolding} then
//                          t.company in (
//                                    WITH RECURSIVE nodes(id) AS (
//                                         SELECT
//                                                   r.id
//                                              FROM companies AS r
//                                              WHERE r.id = ${company}
//                                         UNION ALL
//                                         SELECT
//                                              r.id
//                                              FROM companies AS r, nodes AS nd
//                                              WHERE nd.id = r.holding_parent
//                                    )
//                                    SELECT * FROM nodes
//                          )
//                     ELSE
//                          t.company = ${company} 
//                     end
//                     and (
//                          ${company} = ${tokenCompany} 
//                          or ${tokenCompany} = ${adminCompany}
//                          or ${company} 
//                                    in (
//                                         WITH RECURSIVE nodes(id) AS (
//                                              SELECT
//                                                        r.id
//                                                   FROM companies AS r
//                                                   WHERE r.id = ${tokenCompany}
//                                              UNION ALL
//                                              SELECT
//                                                   r.id
//                                                   FROM companies AS r, nodes AS nd
//                                                   WHERE nd.id = r.holding_parent
//                                         )
//                                         SELECT * FROM nodes
//                                    )
//                          )
//           `)
//      )
//      .orderBy('name')
//      .then(fizcustomers =>{
//           return res.status(200).json(fizcustomers);
//      }).catch((err) => {
// 	  helpers.serverLog(req.originalUrl, err.stack, 'error');
//           return res.status(500).json(err);
//      });
// });

// router.get('/debt_book',(req,res) => {
//      const date = req.query.date ? moment(req.query.date):'';
//      const company = req.query.company ? req.query.company:req.userData.company; 
//      console.log("date = "+date);
//      if (date===''){
//           knex.raw(`
//                select name,telephone,
//                     case when debt is null then 0 else debt end,
//                     case when credit is null then 0 else credit end,
//                     case when debit is null then 0 else debit end
//                from (
//                     SELECT f.lastname||' '||f.firstname as name, f.telephone, f.debt,
//                          sum((select sum(debt) from "debtorsdiary" where company = d.company and customer = d.customer and date = d.date and type = 1)) as credit,
//                          sum((select sum(debt) from "debtorsdiary" where company = d.company and customer = d.customer and date = d.date and type = -1))as debit
//                     FROM "debtorsdiary" d, fiz_customers f 
//                     where d.company = ${company}
//                          and d.customer = f."id"
//                     GROUP BY name, f.telephone, f.debt
//                     ORDER BY name
//                ) t
//           `)
//           .then(result =>{
//                return res.status(200).json(result.rows);
//           }).catch((err) => {
//                helpers.serverLog(req.originalUrl, err.stack, 'error');
//                return res.status(500).json(err);
//           });
//      }else{
//           knex.raw(`
//                select name,telephone,
//                     case when debt is null then 0 else debt end,
//                     case when credit is null then 0 else credit end,
//                     case when debit is null then 0 else debit end
//                from (
//                     SELECT f.lastname||' '||f.firstname as name, f.telephone, f.debt,
//                          sum((select sum(debt) from "debtorsdiary" where company = d.company and customer = d.customer and date = d.date and type = 1)) as credit,
//                          sum((select sum(debt) from "debtorsdiary" where company = d.company and customer = d.customer and date = d.date and type = -1))as debit
//                     FROM "debtorsdiary" d, fiz_customers f 
//                     where d.company = ${company}
//                          and d."date"::date = to_date('${date.format('L')}','dd.mm.yyyy')
//                          and d.customer = f."id"
//                     GROUP BY name, f.telephone, f.debt
//                     ORDER BY name
//                ) t
//           `)
//           .then(result =>{
//                return res.status(200).json(result.rows);
//           }).catch((err) => {
//                helpers.serverLog(req.originalUrl, err.stack, 'error');
//                return res.status(500).json(err);
//           });
//      }
     
// });

// router.get('/transactions', (req, res) => {
//      const customer = req.query.customer
//      const dateTo = moment(req.query.dateTo)
//      const dateFrom = moment(req.query.dateFrom)

//      let company = req.userData.company;
//      if (company === "0" && req.query.company) company = req.query.company;

//      knex('transactions')
//      .where({'transactions.fiz_customerid':customer,'transactions.company':company})
//      .select('id','price','date','bonuspay','bonusadd','tickettype')
//      .andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
//      .orderBy('date')
//      .then(fizcustomers => {
//           return res.status(200).json(fizcustomers);
//      }).catch((err) => {
// 	  helpers.serverLog(req.originalUrl, err.stack, 'error');
//           return res.status(500).json(err);
//      });
// });

// router.get('/details', (req, res) => {
//      const customer = req.query.customer
//      const dateTo = moment(req.query.dateTo)
//      const dateFrom = moment(req.query.dateFrom)
//      const adminCompany = 15

//      const tokenCompany = req.userData.company;
//      const company = req.query.company?req.query.company:tokenCompany;     
//      const isHolding = req.query.holding?req.query.holding:false

//      knex('transactions as t')
//      .leftJoin('debtorsdiary as d',{'d.transaction':'t.id','d.company':'t.company','d.customer':'t.fiz_customerid'})
//      .where({'t.fiz_customerid':customer})
//      .andWhere(knex.raw(`case when ${isHolding} then
//                          t.company in (
//                                    WITH RECURSIVE nodes(id) AS (
//                                         SELECT
//                                                   r.id
//                                              FROM companies AS r
//                                              WHERE r.id = ${company}
//                                         UNION ALL
//                                         SELECT
//                                              r.id
//                                              FROM companies AS r, nodes AS nd
//                                              WHERE nd.id = r.holding_parent
//                                    )
//                                    SELECT * FROM nodes
//                          )
//                     ELSE
//                          t.company = ${company} 
//                     end
//                     and (
//                          ${company} = ${tokenCompany} 
//                          or ${tokenCompany} = ${adminCompany}
//                          or ${company} 
//                                    in (
//                                         WITH RECURSIVE nodes(id) AS (
//                                              SELECT
//                                                        r.id
//                                                   FROM companies AS r
//                                                   WHERE r.id = ${tokenCompany}
//                                              UNION ALL
//                                              SELECT
//                                                   r.id
//                                                   FROM companies AS r, nodes AS nd
//                                                   WHERE nd.id = r.holding_parent
//                                         )
//                                         SELECT * FROM nodes
//                                    )
//                          )
//           `)
//      )
//      .andWhereBetween(knex.raw('t.date::date'), [dateFrom.format(), dateTo.format()])
//      .select('t.id','t.price','t.date','t.bonuspay','t.bonusadd','t.tickettype',
//           'd.type as debttype','d.debt',knex.raw(`null as system`),knex.raw(`null as username`),knex.raw(`null as point`)
//      )
//      .union(function() {
//           this.select(knex.raw(`null`),knex.raw(`null`),'d.date',knex.raw(`null`),
// 			knex.raw(`null`),knex.raw(`null`),'d.type as debttype','d.debt',
// 			'd.system',knex.raw(`case when d.system = 'ERP' then e.name else c.name end as username`),'p.name as point')
//                .from('debtorsdiary as d')
//                .leftJoin('erp_users as e',{'d.user':'e.id','d.system':knex.raw(`'ERP'`)})
//                .leftJoin('cashbox_users as c',{'d.user':'c.id','d.system':knex.raw(`'POS'`)})
//                .leftJoin('points as p',{'p.id':'c.point'})
//                .whereNull('d.transaction')
//                .andWhere({'d.customer':customer})
//                .andWhereBetween(knex.raw('d.date::date'), [dateFrom.format(), dateTo.format()])
//                .andWhere(knex.raw(`case when ${isHolding} then
//                                    d.company in (
//                                              WITH RECURSIVE nodes(id) AS (
//                                                   SELECT
//                                                             r.id
//                                                        FROM companies AS r
//                                                        WHERE r.id = ${company}
//                                                   UNION ALL
//                                                   SELECT
//                                                        r.id
//                                                        FROM companies AS r, nodes AS nd
//                                                        WHERE nd.id = r.holding_parent
//                                              )
//                                              SELECT * FROM nodes
//                                    )
//                               ELSE
//                                    d.company = ${company} 
//                               end
//                               and (
//                                    ${company} = ${tokenCompany} 
//                                    or ${tokenCompany} = ${adminCompany}
//                                    or ${company} 
//                                              in (
//                                                   WITH RECURSIVE nodes(id) AS (
//                                                        SELECT
//                                                                  r.id
//                                                             FROM companies AS r
//                                                             WHERE r.id = ${tokenCompany}
//                                                        UNION ALL
//                                                        SELECT
//                                                             r.id
//                                                             FROM companies AS r, nodes AS nd
//                                                             WHERE nd.id = r.holding_parent
//                                                   )
//                                                   SELECT * FROM nodes
//                                              )
//                                    )
//                     `)
//                )
//      })
//      .orderBy('date', 'desc')
//      .then(fizcustomers => {
// 	  fizcustomers.forEach(fizcustomer => {
// 		if(fizcustomer.point){
// 	        	fizcustomer.point = helpers.decrypt(fizcustomer.point);
// 		} else {
// 			if(fizcustomer.username)
//       	        		fizcustomer.username = helpers.decrypt(fizcustomer.username);
// 		}
// 	  });
//           return res.status(200).json(fizcustomers);
//      }).catch((err) => {
// 	  helpers.serverLog(req.originalUrl, err.stack, 'error');
//           return res.status(500).json(err);
//      });
// });

// router.get('/products', (req, res) => {
//      const customer = req.query.customer
//      const dateTo = moment(req.query.dateTo)
//      const dateFrom = moment(req.query.dateFrom)
//      const adminCompany = 0

//      const tokenCompany = req.userData.company;
//      const company = req.query.company?req.query.company:tokenCompany;     
//      const isHolding = req.query.holding?req.query.holding:false

//      knex('transactions as t')
//      .innerJoin('transaction_details as p','p.transactionid','t.id')
//      .innerJoin('products as z','z.id','p.product')
//      .where({'t.fiz_customerid':customer})
//      .andWhere(knex.raw(`case when ${isHolding} then
//                          t.company in (
//                                    WITH RECURSIVE nodes(id) AS (
//                                         SELECT
//                                                   r.id
//                                              FROM companies AS r
//                                              WHERE r.id = ${company}
//                                         UNION ALL
//                                         SELECT
//                                              r.id
//                                              FROM companies AS r, nodes AS nd
//                                              WHERE nd.id = r.holding_parent
//                                    )
//                                    SELECT * FROM nodes
//                          )
//                     ELSE
//                          t.company = ${company} 
//                     end
//                     and (
//                          ${company} = ${tokenCompany} 
//                          or ${tokenCompany} = ${adminCompany}
//                          or ${company} 
//                                    in (
//                                         WITH RECURSIVE nodes(id) AS (
//                                              SELECT
//                                                        r.id
//                                                   FROM companies AS r
//                                                   WHERE r.id = ${tokenCompany}
//                                              UNION ALL
//                                              SELECT
//                                                   r.id
//                                                   FROM companies AS r, nodes AS nd
//                                                   WHERE nd.id = r.holding_parent
//                                         )
//                                         SELECT * FROM nodes
//                                    )
//                          )
//           `)
//      )
//      .andWhereBetween(knex.raw('t.date::date'), [dateFrom.format(), dateTo.format()])
//      .select('t.id','t.date','p.product','z.name','p.units','p.totalprice','p.bonusadd','p.bonuspay')
//      .orderBy('t.date', 'desc')
//      .then(fizcustomers => {
// 	  fizcustomers.forEach(fizcustomer => {
// 		if(fizcustomer.point){
// 	        	fizcustomer.point = helpers.decrypt(fizcustomer.point);
// 		} else {
// 			if(fizcustomer.username)
//       	        		fizcustomer.username = helpers.decrypt(fizcustomer.username);
// 		}
// 	  });
//           return res.status(200).json(fizcustomers);
//      }).catch((err) => {
// 	  helpers.serverLog(req.originalUrl, err.stack, 'error');
//           return res.status(500).json(err);
//      });
// });

module.exports = router;