const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const router = new express.Router();

router.get("/", (req, res) => {
  let company = req.userData.company;
  if(company === "0" && req.query.company) company = req.query.company;

  knex("companies")
	.where({ 'id': company })	
	.select(knex.raw('coalesce(certificate_group,0) as group'))
	.then((groups) => {
		
		p_group = groups[0].group;
		
		knex("giftcertificates as g")
			.innerJoin("giftcertificatetypes as t", "g.type", "t.id")
			//.where({ "g.company": company })
			.where((pt) => {
				p_group === '0' ? pt.where({ 'g.company': company }) : pt.whereIn('g.company', function() {this.select('id').from('companies').where({ 'certificate_group': p_group });})
			})
			.orderBy("status")
			//.orderBy(knex.raw("g.code::numeric"))
			.select(
				"g.id",
				"g.code",
				"g.denomination",
				knex.raw(`to_char(g.expiredate,'DD.MM.YYYY') as expiredate`),
				knex.raw(`t.name as type`),
				/*'g.period',*/ knex.raw(`to_char(g.selldate,'DD.MM.YYYY') as selldate`),
				knex.raw(`case 
					when g.active is false and g.expiredate is null 
						then 'Доступен для продажи' 
					when g.active is false and g.expiredate is not null and g.selldate is not null and g.balance <> g.denomination
						then 'Использован (Доступен для продажи)'
					when g.active is true and g.expiredate is not null and g.selldate is not null and g.expiredate >= current_date
						then 'Продан (Активен)'
					when g.expiredate is not null and g.selldate is not null and g.expiredate < current_date
						then 'Продан (Истек)' end as status`)
			)
		.then((certificates) => {
			return res.status(200).json(certificates);
		})
		.catch((err) => {
			helpers.serverLog(req.originalUrl,err.stack,"error");
			return res.status(500).json(err);
		});
	
  })
    .catch((err) => {
	return res.status(500).json(err);
  });
	
});

router.get("/writeofflist", (req, res) => {
  let company = req.userData.company;
  if(company === "0" && req.query.company) company = req.query.company;
  
  knex("companies")
	.where({ 'id': company })	
	.select(knex.raw('coalesce(certificate_group,0) as group'))
	.then((groups) => {
		
		p_group = groups[0].group;
  
		knex("giftcertificates_writeoff_balances as b")
		.innerJoin("giftcertificates as g", {
			"b.certid": "g.id",
			"b.company": "g.company",
		})
		.where({ "b.write_off": knex.raw("?", [false]) })
		.where((pt) => {
			p_group === '0' ? pt.where({ 'b.company': company }) : pt.whereIn('b.company', function() {this.select('id').from('companies').where({ 'certificate_group': p_group });})
		})
		.select(
			"b.id",
			"g.code",
			"g.denomination",
			"b.balance",
			knex.raw(`to_char(b.date,'DD.MM.YYYY') as date`)
		)
		.orderBy("g.code")
		.orderBy("b.date")
		.then((certificates) => {
			return res.status(200).json(certificates);
		})
		.catch((err) => {
			helpers.serverLog(req.originalUrl,err.stack,"error");
			return res.status(500).json(err);
		});
		
  })
    .catch((err) => {
	return res.status(500).json(err);
  });		
		
});

//{"user": "42", "company": "18", "writeoff": {"id": [123,345]}}
router.post('/writeoff', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select writeoff_giftbalance(?)', [req.body]).then(result => {
		//helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].writeoff_giftbalance.code == 'success' ? 200 : 400).json(result.rows[0].writeoff_giftbalance);
	}).catch((err) => {
		helpers.serverLog(req.originalUrl,err.stack,"error");
		return res.status(500).json(err);
	});
});

//{"company": 9, "user": "42", "giftcards": [{"Code":"12345", "Balance":"5000","Period":"3","Selldate":"11.11.2011"}]}
router.post("/acceptance_xls", (req, res) => {

  //console.log("acceptance_xls");	
  req.body.company = req.userData.company;
  req.body.user = req.userData.id;
  const jsn = JSON.parse(req.body.giftcards)
  req.body.giftcards = jsn;
  helpers.serverLog(req.body);
  //console.log(req.body);
  
  knex
    .raw("select giftcard_acceptance_xls(?)", [
      req.body
    ])
    .then(result => {
			
		//helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip); //
		result = result.rows[0].giftcard_acceptance_xls;
	  
		return res.status(200).json(result);
	  
    })
    .catch(err => {
		helpers.serverLog(req.originalUrl,err.stack,"error");
      return res.status(500).json(err);
    });
});

//{"company":"1","user": "1","giftcards": [{"code":"123","balance":5000,"period":3,"selldate":"12.12.2020","status":"ok"}], "allocation": [{"point":141,"balance":5000,"units":2}]}
router.post('/add', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select add_giftcertificates(?)', [req.body]).then(result => {
		//helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].add_giftcertificates.code == 'success' ? 200 : 400).json(result.rows[0].add_giftcertificates);
	}).catch((err) => {
		helpers.serverLog(req.originalUrl,err.stack,"error");
		return res.status(500).json(err);
	});
});

//{"company":"1","user": "1","point":169,"id":12}  
router.post('/activate', (req, res) => {
	req.body.user 	 = req.userData.id;
	req.body.company = req.userData.company;

	knex.raw('select activate_giftcertificates(?)', [req.body]).then(result => {
		//helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		return res.status(result.rows[0].activate_giftcertificates.code == 'success' ? 200 : 400).json(result.rows[0].activate_giftcertificates);
	}).catch((err) => {
		helpers.serverLog(req.originalUrl,err.stack,"error");
		return res.status(500).json(err);
	});
});

router.post("/update_cert_expdate",(req,res)=>{

	req.body.company = req.userData.company;
  
	knex.
	raw("select update_cert_expdate(?)",[req.body])
	.then((result) => {
		  //helpers.serverLog(req.originalUrl, result, "success");
		  return res
		  .status(result.rows[0].update_cert_expdate.code == "success" ? 200 : 400)
		  .json(result.rows[0].update_cert_expdate);
	})
	.catch(err => {
		  helpers.serverLog(req.originalUrl,err.stack,"error");
		  return res.status(500).json(err);
	});
  });

module.exports = router;