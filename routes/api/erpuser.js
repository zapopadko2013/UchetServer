const express = require('express');
const knex = require('../../db/knex');
const bcrypt = require('bcryptjs');
const helpers = require('../../middlewares/_helpers');
// 20231101 AB <
const verifyToken = require('../../middlewares/verifyToken');
// 20231101 AB >

const router = new express.Router(); 



router.get("/", (req, res) => {
	knex("erp_users")
	  .leftJoin(
		knex.raw(`(select r.sid, json_agg(json_build_object('id', a.id, 'code', a.reg_code,'name', a.name_rus)) as functions
		  --from (select id as sid, cast(json_array_elements(accesses)::json->>'id' as bigint) as function_id from erp_users
		  from (select id as sid, cast(json_array_elements(accessesu)::json->>'id' as bigint) as function_id from erp_users 
		  where id not in (0,-1) and status = 'ACTIVE') as r
		  --left join access_table as a
		  left join access_tableu as a
		  on a.id=r.function_id
		  group by
		   r.sid) as erpaccess`),
		"erpaccess.sid",
		"erp_users.id"
	  )
	  .where({ company: req.userData.company, status: "ACTIVE" })
	  .andWhereRaw(`id not in (0,-1)`)
	  .select(
		"erp_users.login",
		"erp_users.id",
		"erp_users.iin",
		"erp_users.name",
		"erp_users.role",
		"erp_users.status",
		"erp_users.company",
		"erpaccess.functions as accesses",
		knex.raw(
		  "array_to_string(array(select '{''name'': ''' || r.name || ''', ''id'': ''' || r.id || '''}' from user2roles u left join erp_roles r on (u.role = r.id) where u.user = erp_users.id),', ') as roles"
		)
	  )
	  .then((users) => {
		users.forEach((user) => {
		  if (user.id === req.userData.id) user.self = true;
		  user.iin = helpers.decrypt(user.iin);
		  user.name = helpers.decrypt(user.name);
		});
  
		users.sort((a, b) => (a.name > b.name ? 1 : -1));
  
		return res.status(200).json(users);
	  })
	  .catch((err) => {
		console.log(err);
		return res.status(500).json({
		  error: err.message,
		});
	  });
});

router.get("/inactive", (req, res) => {
	knex("erp_users")
	  .where({ company: req.userData.company, status: "DISMISS" })
	  .select(
		"login",
		"id",
		"iin",
		"name",
		"role",
		"status",
		"company",
		//"accesses"
		"accessesu as accesses"
	  )
	  .then((users) => {
		users.forEach((user) => {
		  if (user.id === req.userData.id) user.self = true;
		  user.iin = helpers.decrypt(user.iin);
		  user.name = helpers.decrypt(user.name);
		});
		return res.status(200).json(users);
	  })
	  .catch((err) => {
		return res.status(500).json(err);
	  });
  });

router.get("/user/roles", (req, res) => {
	knex("user2roles")
	  .join("erp_roles", "erp_roles.id", "user2roles.role")
	  .where({ "erp_roles.deleted": "f", "user2roles.user": req.userData.id })
	  .select("erp_roles.id", "erp_roles.name", "erp_roles.accesses")
	  .then((roles) => {
		return res.status(200).json(roles);
	  })
	  .catch((err) => {
		console.log(err);
		return res.status(500).json(err);
	  });
  });

router.get("/roles", (req, res) => {
	const company = req.userData.company;
	knex
	  .raw(
		`
		  select id,name,accesses::json from (
			  select id,name,accesses::text as accesses
				  from "erp_roles" r 
			  where r.deleted = false 
				  and r.company = ${company}
				  and r."id" not in (0,7)
			  UNION
			  select id,name,accesses::text as accesses
				  from "erp_roles" r1 
			  where r1.deleted = false 
				  and r1.company = 0
				  and r1."id" not in (0,7)
				  and not exists (select 1 from "erp_roles" where name = r1."name" and company = ${company})
		  )t`
	  )
	  .then((roles) => {
		return res.status(200).json(roles.rows);
	  })
	  .catch((err) => {
		return res.status(500).json(err);
	  });
  });
//20231103 AB rewrite to extract erpuser info from JWT since new login service provides it in JWT <
  router.get('/info', (req, res) => {
	if ((process.env.LOG_LEVEL || 1) > 0) {
		console.log('erpuser.js /info req.userData', req.userData);
	}
	
	verifyToken(req);
	// function usrobj(login,name, iin,companyname,id, prefix, partner_id,locales) {
	// 	this.login = login;
	// 	this.name = name;
	// 	this.iin = iin;
	// 	this.companyname = companyname;
	// 	this.id = id;
	// 	this.prefix = prefix;
	// 	this.partner_id = partner_id;
	// 	this.locales = locales;
	// }
	// const user = new usrobj ();
	user = {};
	user.id = req.userData.id;
	user.login = /*helpers.decrypt*/(req.userData.login);//already decrypted
	user.name = /*helpers.decrypt*/(req.userData.name);
	user.iin = /*helpers.decrypt*/(req.userData.iin);
	user.prefix = /*helpers.decrypt*/(req.userData.prefix);
	user.partner_id = /*helpers.decrypt*/(req.userData.partner_id);
	user.companyname = /*helpers.decrypt*/(req.userData.company_name);
	user.locales = req.userData.locales;	
	if (user.locales=="null") {
		user.locales='{"LANG":"en_US.UTF-8","LC_CTYPE":"en_US.UTF-8","LC_NUMERIC":"en_US.UTF-8","LC_TIME":"en_US.UTF-8","LC_COLLATE":"en_US.UTF-8","LC_MONETARY":"KZT","LC_MESSAGES":"en_US.UTF-8","LC_PAPER":"en_US.UTF-8","LC_NAME":"en_US.UTF-8","LC_ADDRESS":"en_US.UTF-8","LC_TELEPHONE":"en_US.UTF-8","LC_MEASUREMENT":"en_US.UTF-8","LC_IDENTIFICATION":"en_US.UTF-8","LC_ALL":"","LOCALE": "ru-KZ"}';
	}
	
	console.log('erpuser.js /info user', user);
	return res.status(200).json(user);
});

/////
router.get("/getuseraccessesun", (req, res) => {
	let sql_request = "";
	if (req.query.id) {
	  sql_request = `select category_id, category, json_agg(json_build_object('id',id, 'code',reg_code, 'name',name_rus)) as functions,
					(select accessesu from erp_users where id='${req.query.id}') as access_functions
			  from access_tableu
			  group by category, category_id;`;
	} else {
	  sql_request = `select json_agg(json_build_object('id',users.function_id, 'code',users.codes, 'category',a.category, 'name',name_rus)) as accesses
	  from (select cast(json_array_elements(accessesu)::json->>'code' as varchar) as codes, cast(json_array_elements(accessesu)::json->>'id' as bigint) as function_id from erp_users where id='${req.userData.id}') as users
	  left join access_tableu as a
	  on a.id = users.function_id`;
	}
	knex
	  .raw(sql_request)
	  .then((result) => {
		let data = result.rows.slice();
  
		return res.status(200).json(data);
	  })
	  .catch((err) => {
		return res.status(500).json({
		  error: err.message,
		});
	  });
  });

router.get("/getuseraccessun", (req, res) => {
	let sql_request = "";

	//console.log("/getuseraccessun");
	//console.log(req.query.id);
	
	if (req.query.id) {
	  sql_request = `select json_agg(json_build_object('id',users.function_id, 'code',users.codes, 'category',a.category)) as accesses
  from (select cast(json_array_elements(accessesu)::json->>'code' as varchar) as codes, cast(json_array_elements(accessesu)::json->>'id' as bigint) as function_id from erp_users where id='${req.query.id}') as users
  left join access_tableu as a
  on a.id = users.function_id`;
	} else {
	  sql_request = `select json_agg(json_build_object('id',users.function_id, 'code',users.codes, 'category',a.category)) as accesses
	  from (select cast(json_array_elements(accessesu)::json->>'code' as varchar) as codes, cast(json_array_elements(accessesu)::json->>'id' as bigint) as function_id from erp_users where id='${req.userData.id}') as users
	  left join access_tableu as a
	  on a.id = users.function_id`;
	}
	knex
	  .raw(sql_request)
	  .then((result) => {
		let data = result.rows.slice();
  
		return res.status(200).json(data);
	  })
	  .catch((err) => {
		return res.status(500).json({
		  error: err.message,
		});
	  });
  });

router.get("/getuseraccessesu", (req, res) => {
	let sql_request = "";
	if (req.query.id) {
	  sql_request = `select json_agg(json_build_object('id',users.function_id, 'code',users.codes, 'category',a.category)) as accesses
  from (select cast(json_array_elements(accesses)::json->>'code' as varchar) as codes, cast(json_array_elements(accesses)::json->>'id' as bigint) as function_id from erp_users where id='${req.query.id}') as users
  left join access_table as a
  on a.id = users.function_id`;
	} else {
	  sql_request = `select json_agg(json_build_object('id',users.function_id, 'code',users.codes, 'category',a.category)) as accesses
	  from (select cast(json_array_elements(accesses)::json->>'code' as varchar) as codes, cast(json_array_elements(accesses)::json->>'id' as bigint) as function_id from erp_users where id='${req.userData.id}') as users
	  left join access_table as a
	  on a.id = users.function_id`;
	}
	knex
	  .raw(sql_request)
	  .then((result) => {
		let data = result.rows.slice();
  
		return res.status(200).json(data);
	  })
	  .catch((err) => {
		return res.status(500).json({
		  error: err.message,
		});
	  });
  });
//////  

//20231103 AB rewrite to extract erpuser info from JWT since new login service provides it in JWT >
router.get("/getaccesses", (req, res) => {
	if (req.query.id) {
	  knex
		.raw(
		  `select category_id, category, json_agg(json_build_object('id',id, 'code',reg_code, 'name',name_rus)) as functions,
					(select accesses from erp_users where id='${req.query.id}') as access_functions
			  from access_table
			  group by category, category_id;`
		)
		.then((accesses) => {
		  let data = accesses.rows.slice();
		  data = data.map((item) => {
			item.access_functions = item.access_functions
			  .map((access) => {
				const { id } = access;
				const temp = [];
				for (let i = 0; i < item.functions.length; i++) {
				  if (id == item.functions[i].id) {
					temp.push(item.functions[i]);
				  }
				}
				return temp;
			  })
			  .filter((access) => access.length !== 0);
  
			return item;
		  });
		  return res.status(200).json(data);
		})
		.catch((err) => {
		  return res.status(500).json({
			error: err.message,
		  });
		});
	} else {
	  knex
		.raw(
		  `select category_id, category, json_agg(json_build_object('id',id, 'code',reg_code, 'name',name_rus)) as functions
		from access_table
		  group by category, category_id;`
		)
		.then((accesses) => {
		  let data = accesses.rows.slice();
		  data = data.map((item) => {
			item.access_functions = item.access_functions || [];
			return item;
		  });
		  return res.status(200).json(data);
		})
		.catch((err) => {
		  return res.status(500).json({
			error: err.message,
		  });
		});
	}
  });
  
  
  router.get("/getuseraccesses", (req, res) => {
	////20231106 AB now extract user accesses from JWT <
	if (req.query.id) {
		return res.status(500).json("getuseraccess with id should be directed to login service");
	} else {
		function accessobj() {
			this.accesses = JSON.parse(req.userData.accesses);
		  }
		const accesses = new accessobj ();
		return res.status(200).json(accesses);
	}	

////20231106 AB now extract user accesses from JWT <
  });

router.post('/manage', (req, res) => {
	const salt = bcrypt.genSaltSync();

	req.body.user = req.userData.id;
	req.body.erpusr.iin = helpers.encrypt(req.body.erpusr.iin);
	req.body.erpusr.name = helpers.encrypt(req.body.erpusr.name);

	if (req.body.erpusr.pass) req.body.erpusr.pass = bcrypt.hashSync(req.body.erpusr.pass, salt);
	
	req.body.erpusr.roles = req.body.erpusr.roles.filter((role)=>{
		return role.id!='0'
	})

	knex.raw('select erpusr_management(?)', [req.body]).then(result => {
		result = result.rows[0].erpusr_management;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});

});

router.post('/changepass', (req, res) => {
	const salt = bcrypt.genSaltSync();
	let status = 200;
	let resText = {
		code: 'success'
	};

	if (parseInt(req.userData.id) === 2) return res.status(status).json(resText);

	knex('erp_users').where({ id: req.userData.id })
		.first()
		.then((user) => {
			if (!helpers.comparePass(req.body.currentPass, user.pass)) {
				status = 500;
				resText = {
					code: 'internal_error',
					text: 'Текущий пароль не совпадает'
				};
				return res.status(status).json(resText);
			} else {
				knex('erp_users')
					.where({ id: req.userData.id })
					.update({
						pass: bcrypt.hashSync(req.body.user_password, salt)
					}).then(() => {
						return res.status(status).json(resText);
					}).catch(() => {
						return res.status(status).json(resText);
					});
			}
		}).catch((err) => {
			console.log(err)
			return res.status(500).json({ err });
		})
});

router.put("/updaterole", (req, res) => {
	req.body = req.body.role;
	req.body.company = req.userData.company;
  
	knex
	  .raw("select update_erp_role(?)", [req.body])
	  .then((result) => {
		result = result.rows[0].update_erp_role;
		return res.status(result.code == "success" ? 200 : 400).json({ succes: true });
	  })
	  .catch((err) => {
		return res.status(500).json({ err });
	  });
  });

router.put("/updateuser", (req, res) => {
	const { id, accesses, name, iin, login, pass } = req.body.erpusr;
  
	knex
	  .raw(
		`update erp_users
				--set accesses='${JSON.stringify(accesses)}',
				set accessesu='${JSON.stringify(accesses)}',
				name='${helpers.encrypt(name)}',
				login='${login}',
				iin='${helpers.encrypt(iin)}'
				where id='${id}'`
	  )
	  .then((result) => {
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

  router.post("/new-manage", (req, res) => {
	const salt = bcrypt.genSaltSync();
  
	req.body.user = req.userData.id;
	req.body.erpusr.iin = helpers.encrypt(req.body.erpusr.iin);
	req.body.erpusr.name = helpers.encrypt(req.body.erpusr.name);
  
	req.body.erpusr.pass = "Zz123456";
  
	if (req.body.erpusr.pass)
	  req.body.erpusr.pass = bcrypt.hashSync(req.body.erpusr.pass, salt);
  
	// req.body.erpusr.roles = req.body.erpusr.roles.filter((role)=>{
	// 	return role.id!='0'
	// })
  
	knex
	  .raw("select new_erpusr_management(?)", [req.body])
	  .then((result) => {
		result = result.rows[0].new_erpusr_management;
		return res.status(result.code == "success" ? 200 : 400).json(result);
	  })
	  .catch((err) => {
		return res.status(500).json({
		  error: err.message,
		});
	  });
  });  
 
module.exports = router;