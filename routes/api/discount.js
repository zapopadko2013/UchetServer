const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const router = new express.Router();

router.get('/', (req, res) => {
	let active  = typeof(req.query.active) !== "undefined" && req.query.active !== null ? req.query.active : '1';
	let company = req.userData.company;
	if(company === "0" && req.query.company)
		company = req.query.company
	
	knex('discounttypes as t')
		//.leftJoin('discounts as d', {'t.id': 'd.type', 'd.company': knex.raw('?', [company]), 'd.expirationdate': knex.raw('?', [current_date])})		
				  
		.modify(function (params) {
			if (active == 1) {
				this.leftJoin(knex.raw(`discounts as d on (t.id = d.type and d.company = ${company} and d.expirationdate >= current_date and d.isactive is true)`))
			} else {
				this.leftJoin(knex.raw(`discounts as d on (t.id = d.type and d.company = ${company} and (d.isactive is false or d.expirationdate < current_date))`))												
			}
		})
		.leftJoin('points as p', {'p.id': 'd.object', 'p.company': 'd.company', 'p.status': knex.raw('?', ['ACTIVE'])})
		.leftJoin('points as p2', {'p2.id': 'd.point', 'p2.company': 'd.company', 'p2.status': knex.raw('?', ['ACTIVE'])})
		.leftJoin('categories as c', {'c.id': 'd.object', 'c.company': 'd.company', 'c.deleted': knex.raw('?', [false])})
		.leftJoin('brands as b', {'b.id': 'd.object', 'b.deleted': knex.raw('?', [false])})
		.leftJoin('stockcurrent as s', {'s.id': 'd.object', 's.company': 'd.company'})
		.leftJoin('products as pr', {'pr.id': 's.product', 'pr.company': 's.company'})
		//.leftJoin('stockcurrent as s', {'s.id': 'd.object', 's.company': 'd.company'})
		//.where( { 'p.company': req.userData.company, 'p.status': 'ACTIVE', 'c.deleted': false, 'b.deleted': false } )
		.whereNotIn('t.id', [0]) // Пока не показываем "На все точки" и "Товары"
		.orderBy('t.id')
		.orderBy('p2.id')
		.orderBy('d.id','desc')
		.select('t.id','d.object','d.discount','d.expirationdate','d.startdate','d.discountsum',knex.raw(`d.point as pointid`),knex.raw(`p2.name as pointname`),
			knex.raw(`(case t.id when 1 then p.name when 2 then c.name when 3 then b.brand when 4 then 
	pr.name ||' '|| array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = s.attributes and a.company = s.company),', ') end) as name`), 
			knex.raw(`d.id as discountid`)		
		)
		.then(discounts => {
			discounts.forEach(discount => {
				if (discount.name !== null && discount.id == (0,1))  discount.name = helpers.decrypt(discount.name); 
				if (discount.pointname !== null)				     discount.pointname = helpers.decrypt(discount.pointname);		
			});	
			return res.status(200).json(discounts);
		}).catch((err) => {
			console.log(err.stack)
			return res.status(500).json(err);
		});
		
});

//{"user" : 1, "company" : 1, "id" : 1}
router.post('/del', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select del_discount(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].del_discount.code == 'success' ? 200 : 400).json(result.rows[0].del_discount);
	}).catch((err) => {
		console.log(err.stack);
		return res.status(500).json(err);
	});
});

//{"user" : 1, "company" : 1, "discount" : {"object": 1, "type": 1, "point": 1, "datefrom": "2019-12-06", "dateto": "2022-12-06", "discount": 30, "discountsum": true}}
router.post('/add', async (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;
	//20240127 AB rewrite of add_discount in DB <
	if (!req.body.discount.discount) res.status(400).json({"code":"error","text": "Не указана скидка!"});
	//sort out discount type, when 0 assign 1
	req.body.discount.type = (req.body.discount.type == 0 ? 1 : req.body.discount.type);
	//танцы с бубном для определения временного пояса для даты
	// const offset = yourDate.getTimezoneOffset();
	// let yourDate = new Date(yourDate.getTime() - (offset*60*1000));
	// let today = yourDate.toISOString().split('T')[0];
	let today = new Date().toISOString().split('T')[0];
	//get all points info
	await knex.raw(
		`
		select p.id as pointid 
		--, b.id as cashboxid
		FROM companies c
			   LEFT JOIN points p on (p.company = c.id and p.id = case when ${req.body.discount.point} = 0 then p.id else ${req.body.discount.point} end)
			   --INNER JOIN cashboxes b on (p.id = b.point)
				   WHERE company = ${req.body.company} 
					   AND point_type = '2' 
						   AND p.status = 'ACTIVE'
							   AND c.status = 'ACTIVE'
							   order by p.id;
		`
	) 
	.then(async (result) => {
		points = result.rows;
		//if discount type ==2, i.e. by categories, get all subcategories recursively
		if (req.body.discount.type == 2) {
			await knex.raw(
				`
				with recursive os_recursive(cumul_id, id, parentid) as (
					select array_append(array[]::bigint[],id) , id, parentid
					  from categories
					  where id = ${req.body.discount.object}
					union all 
					  select array_append(cumul_id,cat.id), cat.id, cat.parentid 
					  from os_recursive osr, categories cat
					  where osr.id = cat.parentid 
					)
				  select distinct unnest(cumul_id)  as id from os_recursive;
				`
			)
			.then(async (cats) => {
				cats = cats.rows;
				for (const cat of cats) {
					req.body.discount.object = cat.id;
					try {
						await insertDiscounts(points);
					} catch (err) {
						console.log(`discount.js /add error ${err}`);
						res.status(500).json({"code": "internal_error", "text": err});
					// } finally {
					// 	res.status(200).json({"code": "success", "text": ""});
					};					
				};
				res.status(200).json({"code": "success", "text": ""});
			})
			.catch((err) => {
				console.log(`discount.js /add error ${err}`);
				res.status(500).json({"code": "internal_error", "text": err});
			});
		} else {
			try{	
				await insertDiscounts(points);
			} catch (err) {
				console.log(`discount.js /add error ${err}`);
				res.status(500).json({"code": "internal_error", "text": err});
			} finally {
				res.status(200).json({"code": "success", "text": ""});
			};
		};	
	})
	.catch((err) => {
		console.log(`discount.js /add error ${err}`);
		res.status(500).json({"code": "internal_error", "text": err});
	});

	async function insertDiscounts (points) {
		// points = points.rows;
		let allpointids = [];
		points.forEach((point) => {
			allpointids.push(point.pointid);
		});
		var pointDiscountMap = [];
					for (const point of points) {
						//sort out discount object, when 0 assign points, else itself
						let object = (req.body.discount.type == 0 ? point.pointid : req.body.discount.object);
						await knex('discounts')
						.insert({
							"company" : req.body.company,
							"type": req.body.discount.type,
							"object": object,
							"point": point.pointid,
							"discount": req.body.discount.discount,
							"startdate": req.body.discount.datefrom,
							"expirationdate": req.body.discount.dateto,
							"isactive": true,
							"discountsum": req.body.discount.discountsum,
						})
						.returning('id')
						.then((dis_id) => {
							pointDiscountMap.push({
								"pointid": point.pointid,
								"disid": dis_id[0],							
							});
						});
					};	

					await knex.raw(`
						SELECT b.point, b.id as id
						FROM cashboxes b 
							WHERE b.point in (${allpointids})
									AND b.isengaged = true
									  ORDER BY b.point;
					`)
					.then(async(cashboxes) => {
						cashboxes = cashboxes.rows;
						for (const cashbox of cashboxes) {
							await knex.raw(`
								SELECT count(s.*)
								FROM products p
								LEFT JOIN stockcurrent s on (p.id = s.product and p.company = s.company)
									LEFT JOIN pointset ps on (ps.stock = s.point) 
										WHERE p.company = ${req.body.company}
											AND ps.point = ${cashbox.point}
											AND ((p.category = ${req.body.discount.object} and ${req.body.discount.type} = 2) 
												OR (p.brand = ${req.body.discount.object} and ${req.body.discount.type} = 3) 
												OR (p.id = ${req.body.discount.object} and ${req.body.discount.type} = 4));
							`)
							.then (async (result) => {
								if(result.rows[0].count > 0 || req.body.discount.type == 1) {
									await knex('invoices')
										.insert({
											"invoicedate": today,
											"creator": req.body.user,
											"status": 'IN_PROCESS',
											"company": req.body.company,
											"stockfrom": cashbox.point,
											"stockto": cashbox.point,
											"type": '10',
										})
										.returning('invoicenumber')
										.then(async (invoiceid) => {
											for (const pdm of pointDiscountMap) {
												if(cashbox.point == pdm.pointid) {
													await knex('invoicelist')
													.insert({
														"invoice": invoiceid[0],
														"stock": pdm.disid,
														"attributes": 0,
														"company": req.body.company,
														"newprod": false,
														"delusr": false,
													})
												};
											};
											
										await knex('systemmessage')
											.insert({
												"point": cashbox.point,
												"invoice":  invoiceid[0],
												"type_message": "10",
												"cashbox": cashbox.id,
											})
										})
										.catch((err) => {
											console.log(`discount.js /add error ${err}`);
										});
								}
							})
										
						}

					})
					.catch((err) => {
						console.log(`discount.js /add error ${err}`);
					});
			// })
		// } else {
		// 	try {
		// 		// await points.forEach(async (point) => {
		// 		for (const point of points) {	
		// 			//sort out discount object, when 0 assign points, else - not needed, we only handle type==2 here
		// 			let object = (req.body.discount.type == 0 ? point.pointid : req.body.discount.object);
		// 				await knex('discounts')
		// 				.insert({
		// 					"company" : req.body.company,
		// 					"type": req.body.discount.type,
		// 					"object": object,
		// 					"point": point.pointid,
		// 					"discount": req.body.discount.discount,
		// 					"startdate": req.body.discount.datefrom,
		// 					"expirationdate": req.body.discount.dateto,
		// 					"isactive": true,
		// 					"discountsum": req.body.discount.discountsum,
		// 				})
		// 				.returning('id')
		// 				// .transacting(trx)
		// 				.then(async (dis_id) => {
		// 					await knex('invoices')
		// 					.insert({
		// 						"invoicedate": today,
		// 						"creator": req.body.user,
		// 						"status": 'IN_PROCESS',
		// 						"company": req.body.company,
		// 						"stockfrom": point.pointid,
		// 						"stockto": point.pointid,
		// 						"type": "10",
		// 					})
		// 					.returning('invoicenumber')
		// 					// .transacting(trx)
		// 					.then(async (invoiceid) => {
		// 						await knex('invoicelist')
		// 						.insert({
		// 							"invoice": invoiceid[0],
		// 							"stock": dis_id[0],
		// 							"attributes": 0,
		// 							"company": req.body.company,
		// 							"newprod": false,
		// 							"delusr": false,
		// 						});
		// 						await knex('systemmessage')
		// 						.insert({
		// 							"point": point.pointid,
		// 							"invoice":  invoiceid[0],
		// 							"type_message": "10",
		// 							"cashbox": point.cashboxid,
		// 						});
		// 						// .transacting(trx)
		// 					})
		// 				})
		// 		// })
		// 		}
		// 	} catch (err){
		// 		console.log(`discount.js /add error ${err}`);
		// 	};
		// };
	};

	//20240127 AB rewrite of add_discount in DB >
});

//{"user" : "1","company" : 1,"datefrom": "2019-12-06", "dateto": "2022-12-06", "discount": 30, "stock" : [{"object" : "1", "point":"1"}]}
router.post('/addprod', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select add_discountprod(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].add_discountprod.code == 'success' ? 200 : 400).json(result.rows[0].add_discountprod);
	}).catch((err) => {
		console.log(err.stack);
		return res.status(500).json(err);
	});
});

//{"user": "42", "company": "18", "change": {"discount": true, "prod": [123,345]}}
router.post('/changeflag', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select change_discountflag(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].change_discountflag.code == 'success' ? 200 : 400).json(result.rows[0].change_discountflag);
	}).catch((err) => {
		console.log(err.stack);
		return res.status(500).json(err);
	});
});

// Отобращение исключений по скидкам
router.get('/prodwithoutdis', (req, res) => {
	let company = req.userData.company;
	if(company === "0" && req.query.company)
		company = req.query.company
	
	knex('products as p')
		.where( { 'p.company': company, 'p.isdiscount': knex.raw('?', [false]) } )
		.orderBy('p.name')
		.select('p.id','p.name','p.code')
		.then(products => {
			return res.status(200).json(products);
		}).catch((err) => {
			console.log(err.stack)
			return res.status(500).json(err);
		});
		
});

module.exports = router;