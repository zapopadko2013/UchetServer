const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.get('/', (req, res) => {
	knex('customers')
		.where({ 'customers.company': req.userData.company, 'customers.deleted': 'f' })
		.orderBy('customers.name')
		.then(customers => {
			return res.status(200).json(customers);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/inactive', (req, res) => {
	knex('customers')
		.where({ 'customers.company': req.userData.company, 'customers.deleted': 't' })
		.orderBy('customers.name')
		.then(customers => {
			return res.status(200).json(customers);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});


// -- {"customers" : {"id" : "1", "name" : 50000, "bin" : "100000", "deleted" : false, "address" : "ул. Ху###ца № 5"}}
router.post('/manage', (req, res) => {
	 helpers.serverLog('/api/buyers/manage', req.body, 'success');
	if (req.body.customers.id) {
		let customer = {
			id: req.body.customers.id,
			name: req.body.customers.name,
			bin: req.body.customers.bin,
			deleted: req.body.customers.deleted,
			address: req.body.customers.address,
		};
		knex('customers')
			.where('id', '=', customer.id) 
			.update({
				"name": customer.name,
				"bin": customer.bin,
				"deleted": customer.deleted,
				"address": customer.address,
			})
			.then(result => {	
				console.log(`buyers.js /manage result: ${result}`)
				return res.status(result == 1 ? 200 : 400).json(result == 1? 'Success': result);
		}).catch((err) => {
			helpers.diagDbError(err, res)
			return; 
		});	
	} else {
		let customer = {
			// id: req.body.customers.id,
			name: req.body.customers.name,
			bin: req.body.customers.bin,
			deleted: req.body.customers.deleted,
			address: req.body.customers.address,
			company: req.userData.company,
		};
		knex('customers')
			.insert({
				"name": customer.name,
				"bin": customer.bin,
				"deleted": customer.deleted,
				"address": customer.address,
				"company": customer.company,
			})
			.returning("id")
			.then(result => {	
				console.log(`buyers.js /manage result: ${result}`)
				return res.status(200).json({
					"code": "success",
					"clientId": result,
				});
		}).catch((err) => {
			helpers.diagDbError(err, res)
			return; 
		});	
	};
	
});
	
// router.post('/manage', (req, res) => {
// 	req.body.user = req.userData.id;

// 	knex.raw('select customers_management(?)', [req.body]).then(result => {
// 		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
// 		result = result.rows[0].customers_management;
// 		return res.status(result.code == 'success' ? 200 : 400).json(result);
// 	}).catch((err) => {
// 		return res.status(500).json(err);
// 	});
// });

router.get('/fizcustomers', (req, res) => {
	knex('fiz_customers')
		.where({ 'fiz_customers.company': req.userData.company, 'fiz_customers.deleted': 'f' })
		.orderBy('fiz_customers.lastname')
		.then(customers => {
			return res.status(200).json(customers);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/fizcustomers/inactive', (req, res) => {
	knex('fiz_customers')
		.where({ 'fiz_customers.company': req.userData.company, 'fiz_customers.deleted': 't' })
		.orderBy('fiz_customers.lastname')
		.then(customers => {
			return res.status(200).json(customers);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

//{customer: [{id:1, status:false}, {id:2, status:false}]}
router.post("/toggle_customers",(req,res)=>{
	const ids = [];
	const status = req.body.customer[0].status;
	req.body.customer.forEach((customer) => {
		ids.push(customer.id);
	});
	knex.raw(
		`UPDATE public.customers
		SET  deleted = '${status}'
		WHERE id in (${ids.toString()})`
	)
	.then(result => {
		//console.log(`erpuser.js toggle_erpuser result: ${JSON.stringify(result)} `)
		// helpers.callRabbitWithCompanyType("erpuser_toggle_erpusers", req.body, req.userData.company_type);
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
});	

//{customer: [{id:1, status:false}, {id:2, status:false}]}
router.post("/fizcustomers/toggle_customers",(req,res)=>{
	const ids = [];
	const status = req.body.customer[0].status;
	req.body.customer.forEach((customer) => {
		ids.push(customer.id);
	});
	knex.raw(
		`UPDATE public.fiz_customers
		SET  deleted = '${status}'
		WHERE id in (${ids.toString()})`
	)
	.then(result => {
		//console.log(`erpuser.js toggle_erpuser result: ${JSON.stringify(result)} `)
		// helpers.callRabbitWithCompanyType("erpuser_toggle_erpusers", req.body, req.userData.company_type);
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
});	

// -- {"customers" : {"id" : "1", "firstname" : 50000, "lastname" : 50000, "telephone" : "100000", "deleted" : false}}
router.post('/fizcustomers/manage', (req, res) => {
	helpers.serverLog('/api/buyers/fizcustomers/manage', req.body, 'success');
	if (req.body.customers.id) {
		let customer = {
			id: req.body.customers.id,
			firstname: req.body.customers.firstname,
			lastname: req.body.customers.lastname,
			telephone: req.body.customers.telephone,
			deleted: req.body.customers.deleted,
		};
		knex('fiz_customers')
			.where('id', '=', customer.id) 
			.update({
				"telephone": customer.telephone,
				"lastname": customer.lastname,
				"firstname": customer.firstname,
				"deleted": customer.deleted,			
			})
			.then(result => {	
				console.log(`buyers.js /fizcustomers/manage result: ${result}`)
				return res.status(result == 1 ? 200 : 400).json(result == 1? 'Success': result);
		}).catch((err) => {
			helpers.diagDbError(err, res)
			return; 
		});
	} else {
		let customer = {
			// id: req.body.customers.id,
			firstname: req.body.customers.firstname,
			lastname: req.body.customers.lastname,
			telephone: req.body.customers.telephone,
			deleted: req.body.customers.deleted,
			company: req.userData.company,
		};
		knex('fiz_customers')
			.insert({
				"telephone": customer.telephone,
				"lastname": customer.lastname,
				"firstname": customer.firstname,
				"deleted": customer.deleted,
				"company": customer.company,
			})
			.returning("id")
			.then(result => {	
				console.log(`buyers.js /manage result: ${result}`)
				return res.status(200).json({
					"code": "success",
					"clientId": result,
				});
		}).catch((err) => {
			helpers.diagDbError(err, res)
			return; 
		});	
	};
	
});

module.exports = router;