const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const moment = require('moment');
//20231016 AB rabbitmq integration <
// const amqp = require('amqplib/callback_api');
//const dockerconfig = require("../../config/dockerconfig");
//20231016 AB rabbitmq integration >

const router = new express.Router();

// //20231016 AB rabbitmq integration <
// amqp.connect(dockerconfig.rabbitmqip,(err,connection) => {
//     if(err){
//         throw err;
//     }
//     connection.createChannel((err,channel) => {
//         if(err) {
//             throw err;
//         }
//         let queueName = "adminpage_companies_manage";
//         //let message = "This is rabbitmq test";
//         channel.assertQueue(queueName,{
//             durable: false
//         });
//         channel.consume(queueName, (msg) => {
//             console.log(`Received : ${msg.content.toString()}`);
// 			/*let jcontent = JSON.parse(msg.content);
// 			knex.raw(`
// 				SELECT 1 INTO p_role
// 					FROM user2roles
// 						WHERE "user" = ${jcontent.user}`,
// 			).then(result => {
// 				let p_role = result;
// 				console.log(`p_role : ${p_role}`)
// 			}).catch((err) => {
// 				return res.status(500).json(err);
// 			});
//             if(!p_role) {
// 				console.log(`У вас недостаточно прав для внесения изменений!`);
// 				return res.status(400).json("У вас недостаточно прав для внесения изменений!");
// 			}
// 			console.log(`jcontent.company.status: ${jcontent.company.status}`)
// 			knex.raw(
// 				`
// 				UPDATE companies
// 					SET status = ${jcontent.company.status}
// 						WHERE id = ${jcontent.company.id}
// 				--IF NOT FOUND THEN
// 				--	result :=json_build_object('code','error','text','Данные по компании не найдены!');
// 				`
// 			).catch((err) => {
// 				return res.status(500).json(err);
// 			});*/
// 			//req.body.user = msg.content.userData.id;
// 			knex.raw('select companies_management(?)', [msg.content]).then(result => {
// 				helpers.log(msg.content, result.rows[0], result.fields[0].name );
// 				return res.status(result.rows[0].companies_management.code == 'success' ? 200 : 400).json(result.rows[0].companies_management);
// 			}).catch((err) => {
// 				return res.status(500).json(err);
// 			});
			
// 			channel.ack(msg);
//         })
//     })

// })

router.post('/companies/manage', (req, res) => {
	req.body.user = req.userData.id;
	
	knex.raw('select companies_management(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].companies_management.code == 'success' ? 200 : 400).json(result.rows[0].companies_management);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

//20231016 AB rabbitmq integration >

//select id, name, status from companies
router.get('/companies', (req, res) => {
	
	//////01.09.2023
	const p1 = typeof req.query.partner_id !== "undefined" && req.query.partner_id !== null && 
	req.query.partner_id !== "1" && req.query.partner_id !==1
        ? ` partner_id=${req.query.partner_id}`
		: "";
	///////01.09.2023	
	
	///////16.10.2023
	//knex('companies').whereNot({ id: 0 })
	knex('companies').whereNot({ "companies.id": 0 })
	///////16.10.2023
	
	////03.10.2023
	  .leftJoin("locales", "locales.company", "companies.id")
	////03.10.2023
		
	///////01.09.2023
	///03.02.2023
	//.andWhere({'partner_id': req.query.partner_id})
	///03.02.2023
	.andWhereRaw(p1)
    ///////01.09.2023
	
	.select('companies.id','name','status','bin'
	
	,'locales'
	
	).orderBy('companies.id','desc')
		.then(companies => {
			//console.log(companies);
			companies.forEach(company => {
				company.name = helpers.decrypt(company.name);
				company.bin = helpers.decrypt(company.bin);
				
				////03.10.2023
	            company.locales = JSON.stringify(company.locales);
	            ////03.10.2023
				
			});

			return res.status(200).json(companies);
		}).catch((err) => {
			
			
			
			return res.status(500).json(err);
		});
});

router.get('/barcode', (req, res) => {
	const company = req.query.company;
	const barcode = req.query.barcode;

	!barcode ? res.status(500).json({ error: 'barcode is empty' }) :
		knex('products')
			.leftJoin('stockcurrent', { 'stockcurrent.product': 'products.id', 'stockcurrent.company': 'products.company' })
			.leftJoin('points', { 'points.id': 'stockcurrent.point', 'points.company': 'products.company' })
			//.leftJoin(knex.raw('points on (points.id = stockcurrent.point and points.company =' + company + ')'))
			.leftJoin('categories', { 'categories.id': 'products.category' })
			.leftJoin('storeprices', { 'storeprices.stock': 'stockcurrent.id', 'storeprices.company': 'stockcurrent.company' })
			.leftJoin('brands', {'brands.id': 'products.brand'})
			.leftJoin('product_accounting', function () {
				this
					.on('product_accounting.product', 'stockcurrent.product')
					.on('product_accounting.attributes', 'stockcurrent.attributes')
					.on('product_accounting.company', 'stockcurrent.company');
			})
			.where({ 'products.code': barcode, 'categories.deleted': false })
			.andWhere(function () {
				this.whereIn('product_accounting.id',
					knex('products as p')
						.leftJoin('stockcurrent as s', { 's.product': 'p.id', 's.company': 'p.company'})
						.leftJoin('product_accounting as pa', function () {
							this
								.on('pa.product', 's.product')
								.on('pa.attributes', 's.attributes')
								.on('pa.company', 's.company')
						})
						.where({ 'p.code': barcode })
						.max('pa.id'))
					.orWhereNull('product_accounting')
			})
			.andWhere(function () {
				this.where('products.company', '0').orWhere('products.company', company)
			})
			.distinct('brands.brand', 'brands.id as brandid', 'products.code', 'products.name', 'products.id', 'products.cnofeacode',
				'categories.id as categoryid', 'categories.name as category', 'stockcurrent.attributes',
				'storeprices.price', 'product_accounting.purchaseprice',
				knex.raw("array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = stockcurrent.company),', ') as attributesCaption"))
			.select()
			.first()//временно
			// .orderBy('stockcurrent.id', 'desc') //временно
			.then(products => {
				return res.status(200).json(products);
			}).catch((err) => {
				console.log(err)
				return res.status(500).json(err);
			});
});

router.get('/points', (req, res) => {
	let where = { 'points.company': req.query.companyId, 'points.status': 'ACTIVE', 'points.point_type': '2' };

	knex('points').join('point_types', { 'points.point_type': 'point_types.id' })
		.select('points.id', 'points.name', 'points.address',
			'point_types.id as point_type', 'point_types.name as point_type_name',
			'points.is_minus', 'points.status')
		.where(where)
		.orderBy('point_types.id', 'asc')
		.orderBy('points.id', 'asc')
		.then(points => {
			points.forEach(point => {
				point.name = helpers.decrypt(point.name);
				point.address = helpers.decrypt(point.address);
			});

			return res.status(200).json(points);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});
//20231016 AB rabbitmq integration <
/*
//{"user" : 1, "company" : { "id" : 1, "status" : "ACTIVE"}}
router.post('/companies/manage', (req, res) => {
	req.body.user = req.userData.id;
	
	knex.raw('select companies_management(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].companies_management.code == 'success' ? 200 : 400).json(result.rows[0].companies_management);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});
*/
//20231016 AB rabbitmq integration <
router.get('/company/info', (req, res) => {

	

	knex('companies')
	////03.10.2023
	////20.11.2025
	  //.leftJoin("locales", "locales.company", "companies.id")
	  ////20.11.2025
	////03.10.2023
	.where({ id: req.query.id }).first().select('*',knex.raw(`to_char(certificatedate,'DD.MM.YYYY') as certificatedateform`)).then(user => {
		
		
		
		let userResp = {
			name: helpers.decrypt(user.name),
			bin: helpers.decrypt(user.bin),
			address: helpers.decrypt(user.address),
			head: helpers.decrypt(user.head),
			headIin: helpers.decrypt(user.head_iin),
			accountant: helpers.decrypt(user.accountant),
			accountantIin: helpers.decrypt(user.accountant_iin),
			
			////03.10.2023			
			locales: user.locales,
			////03.10.2023
			
			id: user.id,
			status: user.status,
			certificateNum: user.certificatenum,
			certificateSeries: user.certificateseries,
			certificateDate: user.certificatedateform
		};
		
		res.status(200).json(userResp);
	}).catch((err) => {
		return res.status(500).send(err);
		// return res.status(500).send(err.response);
	});
});

//{"user" : 1, "update" : {"code" : "001231200102", "point" : 169}}
router.post('/updateposstock', (req, res) => {
	req.body.user = req.userData.id;
	
	knex.raw('select stock_correction(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].stock_correction.code == 'success' ? 200 : 400).json(result.rows[0].stock_correction);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

//{"user": 1, "attributes": {"id": 1, "name": "Цвет", "deleted": "1", "format": "SPR"}}
router.post('/updateattributeslist', (req, res) => {
	req.body.user = req.userData.id;
	
	knex.raw('select attributes_management(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].attributes_management.code == 'success' ? 200 : 400).json(result.rows[0].attributes_management);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.get("/companiesrep", (req, res) => {
	
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);

  knex("admincompanies_report")
    .select(knex.raw(`to_char(admincompanies_report.date,'YYYY-MM-DD') as date`),
			'admincompanies_report.allcompanies',
			'admincompanies_report.allpoints',
			'admincompanies_report.newcompanies',
			'admincompanies_report.newpoints',
			'admincompanies_report.activecomp',
			'admincompanies_report.activecompallpoints',
			'admincompanies_report.activecompactivepoints',
			'admincompanies_report.compup',
			'admincompanies_report.compdown',
			'admincompanies_report.opencashboxes',
			'admincompanies_report.opencashboxes3',
			'admincompanies_report.compwithoutopencash')
	.andWhereBetween(knex.raw("admincompanies_report.date"), [dateFrom.format(),dateTo.format()])
    .then((companiesrep) => {
      return res.status(200).json(companiesrep);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/companiesrep_det", (req, res) => {
	
  const dateFrom = moment(req.query.date);	
  const type = req.query.type;

  knex("admincompanies_report_details")
    .select()
	.distinct('companies.name')
	.leftJoin('companies', { 'admincompanies_report_details.object': 'companies.id' })
	.where({ 'admincompanies_report_details.type': type, 'admincompanies_report_details.date': dateFrom.format() })
	//.andWhereBetween(knex.raw("admincompanies_report_details.date"), [dateFrom.format(),dateTo.format()])
    .then((companiesrep_det) => {
		companiesrep_det.forEach(point => {
			point.name = helpers.decrypt(point.name);
		});
      return res.status(200).json(companiesrep_det);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get("/soldrep", (req, res) => {
	
  const dateFrom = moment(req.query.dateFrom);
  const dateTo = moment(req.query.dateTo);
	
	knex.sum('t1.soldsum as soldsum')
		.sum('t1.soldcount as soldcount')
		.sum('t1.soldavg as soldavg')
		.sum('t1.returnsum as returnsum')
		.sum('t1.returncount as returncount')
		.sum('t1.returnavg as returnavg')
		.sum('t1.cashpay as cashpay')
		.sum('t1.countcashpay as countcashpay')
		.sum('t1.cardpay as cardpay')
		.sum('t1.countcardpay as countcardpay')
		.sum('t1.debitpay as debitpay')
		.sum('t1.countdebitpay as countdebitpay')
		.sum('t1.bonuspay as bonuspay')
		.sum('t1.discount as discount')
		.sum('t1.debtpay as debtpay')
		.sum('t1.countdebtpay as countdebtpay')
		//.sum('t1.avgcashpay as avgcashpay')
		//.sum('t1.avgcardpay as avgcardpay')
		//.sum('t1.avgdebitpay as avgdebitpay')
		.select(knex.raw(`to_char(t1.date,'YYYY-MM-DD') as date`),
				knex.raw(`round((sum(t1.cashpay))/(case sum(t1.countcashpay) when 0 then 1 else sum(t1.countcashpay) end),2) as avgcashpay`),
				knex.raw(`round((sum(t1.cardpay))/(case sum(t1.countcardpay) when 0 then 1 else sum(t1.countcardpay) end),2) as avgcardpay`),
				knex.raw(`round((sum(t1.debitpay))/(case sum(t1.countdebitpay) when 0 then 1 else sum(t1.countdebitpay) end),2) as avgdebitpay`),
				knex.raw(`round((sum(t1.debtpay))/(case sum(t1.countdebtpay) when 0 then 1 else sum(t1.countdebtpay) end),2) as avgdebtpay`)
		)//.first()
			.from(function() {
				this.select(
						knex.raw(`case tickettype when 0 then round(sum(price)::numeric,2) else 0 end as soldsum`),
						knex.raw(`case tickettype when 0 then count(*) else 0 end as soldcount`),
						knex.raw(`case tickettype when 0 then round(avg(price)::numeric,2) else 0 end as soldavg`),
						knex.raw(`case tickettype when 1 then round(sum(-price)::numeric,2) else 0 end as returnsum`),
						knex.raw(`case tickettype when 1 then count(*) else 0 end as returncount`),
						knex.raw(`case tickettype when 1 then round(avg(-price)::numeric,2) else 0 end as returnavg`),					
						knex.raw(`round(sum(cashpay)::numeric,2) as cashpay`),
						//knex.raw(`round(avg(case when tickettype = 0 and cashpay <> 0 then cashpay else null end::numeric),2) as avgcashpay`),
						knex.raw(`coalesce(sum(case when tickettype = 0 and cashpay <> 0 then 1 when tickettype = 1 and cashpay <> 0 then -1 else null end),0) as countcashpay`),
						knex.raw(`round(sum(cardpay)::numeric,2) as cardpay`),
						//knex.raw(`round(avg(case when tickettype = 0 and cardpay <> 0 then cardpay else null end::numeric),2) as avgcardpay`),
						knex.raw(`coalesce(sum(case when tickettype = 0 and cardpay <> 0 then 1 when tickettype = 1 and cardpay <> 0 then -1 else null end),0) as countcardpay`),
						knex.raw(`round(sum(debitpay)::numeric,2) as debitpay`),
						//knex.raw(`round(avg(case when tickettype = 0 and debitpay <> 0 then debitpay else null end::numeric),2) as avgdebitpay`),
						knex.raw(`coalesce(sum(case when tickettype = 0 and debitpay <> 0 then 1 when tickettype = 1 and debitpay <> 0 then -1 else null end),0) as countdebitpay`),
						
						knex.raw(`round(sum(debtpay)::numeric,2) as debtpay`),
						knex.raw(`coalesce(sum(case when tickettype = 0 and debtpay <> 0 then 1 when tickettype = 1 and debtpay <> 0 then -1 else null end),0) as countdebtpay`),
						
						knex.raw(`case tickettype when 0 then round(sum(bonuspay)::numeric,2) else round(sum(-bonuspay)::numeric,2) end as bonuspay`),
						knex.raw(`case tickettype when 0 then round(sum(discount + detailsdiscount)::numeric,2) else round(sum(-discount + (-detailsdiscount))::numeric,2) end as discount`),
						knex.raw(`date::date as date`)
					)
					.from('transactions as t')
					///03.02.2023
					.leftJoin('companies', { 't.company': 'companies.id' })
					///03.02.2023					
					.whereNotIn('t.company', [0, 2, 17, 49, 37])
					.whereNotIn('t.id', [168105, 168106, 168107, 168108, 168109, 168110, 168111, 168112, 168113, 168114]) // Сказочные транзакции
					.andWhereBetween(knex.raw('t.date::date'), [dateFrom.format(),dateTo.format()])
					///03.02.2023
	                .andWhere({'partner_id': req.query.partner_id})
	                ///03.02.2023
					.groupBy('t.tickettype',knex.raw(`t.date::date`))
					.as('t1')
					//.first()
			}).as('t2').groupBy(knex.raw(`t1.date::date`)).orderBy(knex.raw(`t1.date::date`))
	//.first()
    .then((soldrep) => {
      return res.status(200).json(soldrep);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.get('/usernames', (req, res) => {
	// helpers.serverLog("123432t")
	knex.raw(`SELECT login FROM erp_users WHERE erp_users.company = ${req.query.comp_id}`)
		.then(usernames => {
			return res.status(200).json(usernames.rows);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

////19.11.2025
router.get('/companytypes', (req, res) => {
	knex("company_types")
		.select('*')
		.then(result => {
			return res.status(200).json(result);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});
////19.11.2025

router.get('/passreset', (req, res) => {
	knex.raw(`SELECT passreset('{"company" : "${req.query.comp_id}", "login" : "${req.query.username}"}' :: json )`)
		.then(result => {
			return res.status(200).json(result.rows);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

module.exports = router;