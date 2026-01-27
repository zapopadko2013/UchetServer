const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
// 20231101 AB <
const verifyToken = require('../../middlewares/verifyToken');
// 20231101 AB ?
const router = new express.Router();

// //20231016 AB rabbitmq integration <
// const amqp = require('amqplib/callback_api');
// const dockerconfig = require("../../config/dockerconfig");
// //20231016 AB rabbitmq integration >

// //20231016 AB rabbitmq integration <
// amqp.connect(dockerconfig.rabbitmqip,(err,connection) => {
//     if(err){
//         throw err;
//     }
//     connection.createChannel((err,channel) => {
//         if(err) {
//             throw err;
//         }
//         let queueName1 = "api_company_manage";
//         //let message = "This is rabbitmq test";
//         channel.assertQueue(queueName1,{
//             durable: false
//         });
//         channel.consume(queueName1, (msg) => {
//             console.log(`queueName: ${queueName1} received : ${msg.content.toString()}`);
// 			knex.raw('select companies_change(?)', [msg.content]).then(result => {
// 				helpers.log(msg.content, result.rows[0], result.fields[0].name/*, req.ip*/ );
// 				return res.status(result.rows[0].companies_management.code == 'success' ? 200 : 400).json(result.rows[0].companies_management);
// 			}).catch((err) => {
// 				return res.status(500).json(err);
// 			});
			
// 			channel.ack(msg);
//         })

// 		let queueName2 = "api_company_managebin";
// 		channel.assertQueue(queueName2,{
//             durable: false
//         });
// 		channel.consume(queueName2, (msg) => {
//             console.log(`queueName: ${queueName2} received : ${msg.content.toString()}`);
// 			knex.raw('select companies_changebin(?)', [msg.content]).then(result => {
// 				helpers.log(msg.content, result.rows[0], result.fields[0].name/*, req.ip*/);
// 				return res.status(result.rows[0].companies_changebin.code == 'success' ? 200 : 400).json(result);
// 			}).catch((err) => {
// 				return res.status(500).json(err);
// 			});
			
// 			channel.ack(msg);
//         })
//     })

// })

router.get('/', (req, res) => {
	/* // 20231107 AB return company info from JWT <
	verifyToken(req);
	if ((process.env.LOG_LEVEL || 1) == 1) {
		console.log('company.js / req.userData' , req.userData);
	} */
	
	// function companyobj(name, bin, address, head, headIin, accountant, accountantIin, id, 
	// 	certificatenum, certificateseries, certificatedate, holding, holding_parent, wholesale) {
	// 	this.name = name;
	// 	this.bin = bin;
	// 	this.address = address;
	// 	this.head = head;
	// 	this.headIin = headIin;
	// 	this.accountant = accountant;
	// 	this.accountantIin = accountantIin;
	// 	this.id = id;
	// 	this.certificatenum = certificatenum;
	// 	this.certificateseries = certificateseries;
	// 	this.certificatedate = certificatedate;
	// 	this.holding = holding;
	// 	this.holding_parent = holding_parent;
	// 	this.wholesale = wholesale;
	// }
	// const companyData = new companyobj ();
	/* companyData = {};
	companyData.name =(req.userData.company_name);//already decrypted
	if ((process.env.LOG_LEVEL || 1) > 0) {
		console.log('company.js / companyData.name' , companyData.name);
	}
	companyData.bin = (req.userData.company_bin);
	companyData.address = (req.userData.company_address);
	companyData.head = (req.userData.company_head);
	companyData.headIin = (req.userData.company_head_iin);
	companyData.accountant = (req.userData.company_accountant);
	companyData.accountantIin = (req.userData.company_accountant_iin);
	companyData.id = req.userData.company_id;
	companyData.certificatenum = req.userData.company_certificatenum;
	companyData.certificateseries = req.userData.company_certificateseries;
	companyData.certificatedate = req.userData.company_certificatedate;
	companyData.holding = req.userData.company_holding;
	companyData.holding_parent = req.userData.company_holding_parent;
	companyData.wholesale = req.userData.company_wholesale;


	if ((process.env.LOG_LEVEL || 1) == 1) {
		console.log('company.js / companyData', companyData);
	}
	return res.status(200).json(companyData); */
	
	knex('companies').where({ id: req.userData.company }).first().select('*',knex.raw(`to_char(certificatedate,'DD.MM.YYYY') as certificatedateform`)).then(user => {
		let userResp = {
			name: helpers.decrypt(user.name),
			bin: helpers.decrypt(user.bin),
			address: helpers.decrypt(user.address),
			head: helpers.decrypt(user.head),
			headIin: helpers.decrypt(user.head_iin),
			accountant: helpers.decrypt(user.accountant),
			accountantIin: helpers.decrypt(user.accountant_iin),
			id: user.id,
			status: user.status,
			certificatenum: user.certificatenum,
			certificateseries: user.certificateseries,
			certificatedate: user.certificatedateform,
			wholesale: user.wholesale
			//////23.01.2026
			,avtoupdatestocktime: user.avtoupdatestocktime
			,avtoupdatestockflag:  user.avtoupdatestockflag
			//////23.01.2026
			////26.01.2026
            ,flagnkt: user.flagnkt 
			////26.01.2026
		};
		// console.log(user);
		res.status(200).json(userResp);
	}).catch((err) => {
		// console.log(err)
		return res.status(500).send(err.response);
	});
	
	// 20231107 AB return company info from JWT >
});


////26.01.2026

router.post('/flagnktchange', (req, res) => {


/////


	knex.raw(
		`UPDATE public.companies
		SET  flagnkt = '${req.body.flagnkt}'
		WHERE id =${req.userData.company}`
	)
	.then(result => {
		
		return res.status(200).json({
			success: true,
			result: result,
		  });

	})
	.catch((err) => {
		return res.status(500).json({
		  error: err.message,
		});
	  });


//////


});
////26.01.2026


//////31.08.2023
router.post('/managebin', (req, res) => {
	helpers.serverLog('/api/company/managebin', req.body, 'success');
	let userReq = {
		user: req.userData.id,
		company: {
			id: req.body.company.id,
			bin: helpers.encrypt(req.body.company.bin)
		}
	};

	knex.raw('select companies_changebin(?)', [userReq]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].companies_changebin;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});
//////31.08.2023

router.post('/manage', (req, res) => {
	helpers.serverLog('/api/company/manage', req.body, 'success');
	let userReq = {
		user: req.userData.id,
		company: {
			id: req.body.company.id,
			name: parseInt(req.body.company.id) === 2 ? helpers.encrypt("Демонстрационный стенд") : helpers.encrypt(req.body.company.name),
			address: parseInt(req.body.company.id) === 2 ? helpers.encrypt("г.Алматы") : helpers.encrypt(req.body.company.address),
			head: parseInt(req.body.company.id) === 2 ? helpers.encrypt("ТОО ISME") : helpers.encrypt(req.body.company.head),
			head_iin: helpers.encrypt(req.body.company.headIin),
			accountant: helpers.encrypt(req.body.company.accountant),
			accountant_iin: helpers.encrypt(req.body.company.accountantIin),
			certificatenum: req.body.company.certificatenum,
			certificateseries: req.body.company.certificateseries,
			certificatedate: req.body.company.certificatedate,
			wholesale: req.body.company.wholesale
			//////23.01.2026
			,avtoupdatestocktime: req.body.company.avtoupdatestocktime
			,avtoupdatestockflag:  req.body.company.avtoupdatestockflag
			//////23.01.2026		
		}
	};

	console.log(userReq);

	knex.raw('select companies_change(?)', [userReq]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].companies_change;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		console.log(err);
		return res.status(500).json(err);
	});
});

//сервси для подтягивания списка активных компаний с активными точками и кассами
router.get('/cashboxes', (req, res) => {
	knex("points")
		.innerJoin('companies', {'companies.id':'points.company','companies.status':knex.raw('?', ['ACTIVE'])})
		.innerJoin(knex.raw(`(select point from cashboxes where cashboxes.deleted=false and cashboxes.isengaged=true group by point) as pointsactive`), 'points.id', 'pointsactive.point')
		.where({'points.status':'ACTIVE'})
		.select('companies.id as company','companies.name',
			knex.raw(`
				json_agg(json_build_object('point',points.id,'name',points.name,
				'cashboxes', (
					select json_agg(json_build_object('cashbox',cashboxes.id,'name',cashboxes.name))
						from cashboxes
							INNER JOIN points p on p.id = cashboxes.point and p.status = 'ACTIVE' and p.id = points.id
							where cashboxes.deleted=false and cashboxes.isengaged=true
							group by p.id
					)
				)) as points
			`)
			)
		.groupBy('companies.id')
		.orderBy('companies.id')
    		.then(result => {
			result.forEach(company => {
				company.name = helpers.decrypt(company.name);
				company.points.forEach(point => {
					point.name = helpers.decrypt(point.name);
					point.cashboxes.forEach(cashbox => {
						cashbox.name = helpers.decrypt(cashbox.name);
					});
				});
      			});
      			// helpers.serverLog(req.originalUrl, result, "success");
      			return res.status(200).json(result);
    		})
		.catch(err => {
      			helpers.serverLog(req.originalUrl,err.stack,'error');
      			return res.status(500).json(err);
    		});
});

router.get('/companyenc', (req, res) => {
	const company = req.query.name;
	const encname = helpers.encrypt(company);

	return res.status(200).json(encname);
});

router.get('/companydec', (req, res) => {	
	try {
		const decname = helpers.decrypt(req.query.name);
		return res.status(200).json(decname);
	} catch (err) {	
		return res.status(500).send({ error: err });;
	}
});

router.post("/info", (req,res) => {
	const ids = req.body.ids;
	knex.raw(`select id, name, bin from companies where id in (${ids})`)
	.then(result => {
		result.rows.forEach(rec => {
			rec.name = helpers.decrypt(rec.name);
			rec.bin = helpers.decrypt(rec.bin);
		})
		res.status(200).json(result.rows)
	})
	.catch((err) => {
		console.log(err);
		return res.status(500).json(err);
	});
});


module.exports = router;