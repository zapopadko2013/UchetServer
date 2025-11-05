const express = require("express");
const knex = require("../db/knex");
const helpers = require("../middlewares/_helpers");
const router = new express.Router();
const moment = require("moment");
const fetch = require("node-fetch");
const verifyExternalToken = require("../middlewares/verifyExternalToken");
const customer = require('./api/customer'); 

router.post("/api/savepoint", (req, res) => {
  //20231216 AB check accessToken before issuing new integration pass to cashbox <
  if (process.env.FF1_CHECK_INT_PASS_BEFORE_ISSUE) {
    // verifyExternalToken(req);
    knex('companies')
      .where({"id": req.userData.company})
      .then((company) => {
        if (!company) {
          const respJson = {
            status: "failed",
            error: "accessTokenWrongCompany",
            cashboxUser,
            company: req.userData.company,
          };
          helpers.serverLog(
           req.originalUrl,
           {
             ...respJson,
             condition: "verifyExternalToken no company",
           },
           "error"
          );
          return res.status(403).json(respJson);
        } 
      })
      .catch((err) => {
        helpers.serverLog(req.originalUrl, err, "error");
        return res.status(500).json(err);
      });
    
  };
  //20231216 AB check accessToken before issuing new integration pass to cashbox >

  knex("cashboxtoken")
    .where({ cashbox: req.body.cashbox })
    .first()
    .then((cashboxResponse) => {
      if (cashboxResponse) {
        const respJson = { status: "success", password: cashboxResponse.token };
        //helpers.serverLog(req.originalUrl, respJson, "error");
        return res.status(200).json(respJson);
      } else {
        req.body.token = helpers.newPointPassword();
        knex
          .raw("select inserttoken(?)", [req.body])
          .then((result) => {
            helpers.log(
              req.body,
              result.rows[0],
              result.fields[0].name,
              req.ip
            );
            result = result.rows[0].inserttoken;
            if (result.code === "success") {
              const respJson = { status: "success", password: req.body.token };
              // helpers.serverLog(req.originalUrl, respJson);
              return res.status(200).json(respJson);
            } else {
              helpers.serverLog(req.originalUrl, result, result.code);
              return res.status(500).json(result);
            }
          })
          .catch((err) => {
            helpers.serverLog(req.originalUrl, err, "error");
            return res.status(500).json(err);
          });
      }
    });
});


////////30.04.2024

router.get("/api/cashboxesblock", (req, res) => {
 
  knex("cashboxes")
    .where({ "cashboxes.id": req.query.cashboxesid, "cashboxes.deleted": false })
    .select("cashboxes.id")
    .then((cashboxes) => {
      
      
      return res.status(200).json({ cashboxes });
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

////////30.04.2024

/////////28.11.2023


router.post("/kofd/login", (req, res) => {
	console.log(req.body);
  

var requestOptions = {
  method: 'POST',
  headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                      },
  body: JSON.stringify(req.body),
  redirect: 'follow'
};


fetch(req.body.ip+"/api/auth/login", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
  
});


router.post("/kofd/logout", (req, res) =>  {


var requestOptions = {
  method: 'GET',
  headers: {
                        "Authorization": req.body.autor,
                        "Content-Type": "application/json",
                      },
  
  redirect: 'follow'
};


fetch(req.body.ip+"/api/logout", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );

	
});	

router.post("/kofd/open", (req, res) => {
	
	var requestOptions = {
  method: 'POST',
  headers: {
                        "Authorization": req.body.autor,
                        "Content-Type": "application/json",
                      },
  body: JSON.stringify(req.body),
  redirect: 'follow'
};


fetch(req.body.ip+"/api/shift_open_by_fiscal_number", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
	
});

router.post("/kofd/close", (req, res) => {
	
	var requestOptions = {
  method: 'POST',
  headers: {
                        "Authorization": req.body.autor,
                        "Content-Type": "application/json",
                      },
  body: JSON.stringify(req.body),
  redirect: 'follow'
};


fetch(req.body.ip+"/api/shift_close_by_fiscal_number", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
	
});

router.post("/kofd/shiftstate", (req, res) => {
	
	var requestOptions = {
  method: 'POST',
  headers: {
                        "Authorization": req.body.autor,
                        "Content-Type": "application/json",
                      },
  body: JSON.stringify(req.body),
  redirect: 'follow'
};


fetch(req.body.ip+"/api/shift_state_by_fiscal_number", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
	
});

router.post("/kofd/cash", (req, res) => {
	
	var requestOptions = {
  method: 'POST',
  headers: {
                        "Authorization": req.body.autor,
                        "Content-Type": "application/json",
                      },
  body: JSON.stringify(req.body),
  redirect: 'follow'
};


fetch(req.body.ip+"/api/cash_operation_by_fiscal_number", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
	
});

router.post("/kofd/receipt", (req, res) => {
	
	
	
	

	
	var requestOptions = {
  method: 'POST',
  headers: {
                        "Authorization": req.body.autor,
                        "Accept": "application/json",
						"Content-Type": "application/json",
                      },
  body: JSON.stringify(req.body),
 
  
  redirect: 'follow'
};



fetch(req.body.ip+"/api/v2/receipt", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
	
	
	
	
});

router.post("/kofd/receiptdubl", (req, res) => {
	
	var requestOptions = {
  method: 'POST',
  headers: {
                        "Authorization": req.body.autor,
                        "Accept": "application/json",
						"Content-Type": "application/json",
                      },
  body: JSON.stringify(req.body),
  redirect: 'follow'
};


fetch(req.body.ip+"/api/duplicate", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
	
});

router.post("/kofd/customers", (req, res) => {
	
	var requestOptions = {
  method: 'POST',
  headers: {
                        "Authorization": req.body.autor,
                        "Content-Type": "application/json",
						"Accept":"application/json",
                      },
  body: JSON.stringify(req.body),
  redirect: 'follow'
};


fetch(req.body.ip+"/api/customers", requestOptions)
  .then(response => response.text())
  .then((result) => {
	  console.log(result);
	  return  res.status(200).json(JSON.parse(result));
  }
	  )
  .catch((error) => {
	  console.log('error', error);
	  return  res.status(500).json(error);
  }
	  );
	
});


/////////28.11.2023

// старый сервис отправки сообщений Kcell
// router.post('/api/evcalyptussms', (req, res) => {
// 	const request = require('request');
// 	const date = new Date();
// 	const shortid = require('shortid');
// 	//const accTok = req.headers.authorization.split(' ')[1];
// 	const req_body = {"client_message_id" :  date.getTime() + shortid.generate(),
// 					  "recipient" : req.body.telephone,
// 					  "message_text" : req.body.message + ", www.evcalyptus.kz",
// 					  "sender" : "Evcalyptus"}

// 	console.log("/api/evcalyptussms",req_body);
// 	request.post(
// 		{
// 			url:'https://msg.kcell.kz/api/v3/messages',
// 			json: req_body,
// 			headers: {
// 				'Content-Type': 'application/json;charset=utf-8', 'Authorization':'Basic YmFrYW5iYXlldmFfc21zZ3czX3VzZXI6TWRuUzZWWW4='
// 			}},
// 		function (error, response, body) {
// 			console.log(body);
// 			if (!error && response.statusCode == 201) {
// 				console.log("/api/evcalyptussms/201-success:",body);

// 				res.status(200).json(body);
// 			}else{
// 				console.log("/api/evcalyptussms/500-error:",error);
// 				res.status(500).json(body);
// 			}
// 		}
// 	);
// });

// новый сервис отправки сообщений Kazinfoteh
router.post("/api/evcalyptussms", (req, res) => {
  var soap = require("soap");
  const date = new Date();
  const shortid = require("shortid");
  var url = "https://isms.center/soap";
  var args = {
    login: "bakan",
    password: "cj18ntQCc",
    sms: {
      recepient: req.body.telephone,
      senderid: "TEXT_MSG",
      msg: req.body.message + ", www.evcalyptus.kz",
      msgtype: 0,
      scheduled: "",
      UserMsgID: date.getTime() + shortid.generate(),
      prioritet: 2,
    },
  };

  soap.createClient(url, function (err, client) {
    client.SendMessage(args, function (err, result) {
      const response = {
        status: result.Result.Status,
        message_id: result.Result.MsgID,
      };
      if (!err) {
        // console.log("result", result);
        res.status(200).json(response);
      } else {
        console.log("err", err);
        res.status(500).json(err);
      }
    });
  });
});

router.post("/api/invoice/check", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select check_messages(?)", [req.body])
    .then((result) => {
      result = result.rows[0].check_messages;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      // helpers.serverLog(req.originalUrl, err, 'error');
      return res.status(500).json(err);
    });
});

router.post("/api/invoice/detail", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select detailing_invoice(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].detailing_invoice;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/invoice/processing", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select invoice_processing(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].invoice_processing;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/invoice/transfertransactions", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select transfer_transactions(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].transfer_transactions;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/invoice/transfer_corr_transactions", (req, res) => {
  knex
    .raw("select transfer_corr_transactions(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].transfer_corr_transactions;
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/transactions", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select get_transactions(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].get_transactions;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//////01.04.2024

router.post("/api/transfer/voidlines", (req, res) => {
	
	knex
    .raw("INSERT INTO public.transaction_voidlines (cashbox, ticketid, productid, units, price, unitsbefore, operdate, userid) VALUES(?, ?, ?, ?, ?, ?, ?, ?)", [req.body.CASHID, req.body.TICKETID, req.body.PRODUCTID, req.body.UNITS, req.body.PRICE, req.body.UNITSBEFORE, req.body.INVOICEDATE, req.body.USERID])
    .then((result) => {
		
      console.log(result.rows);
      return res.status(200).json({
			code: "success",
			result: result,
		  });
	  
	  
	  
    })
    .catch((err) => {
		
      console.log(err);
      return res.status(500).json(err);
	  
	 
	  
    });
	
});

//////01.04.2024

router.post("/api/transfer/cashtrans", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select transfer_cashtrans(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].transfer_cashtrans;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/cashbox/engage", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select cashbox_engage(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].cashbox_engage;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/primary/information", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select get_catalog(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].get_catalog;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/api/point", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  
  /*
  //////05.10.2023
  
  let val="";
  let curr = JSON.parse(helpers.decrypt(req.userData.locales));

	 if (curr == null)
 {
	 val="KZT"; 
 }  
  else
  {    
val=curr.LC_MONETARY;
  }
 
 
  //////05.10.2023
  */
  
  knex("points")
    .innerJoin("companies", "points.company", "companies.id")
	//////21.09.2023  
	//.leftJoin(knex.raw(` partners on (companies.partner_id=partners.id and  partners.id>1)`))
	.leftJoin(knex.raw(` partners on (companies.partner_id=partners.id )`))
	//////21.09.2023
    
	//////06.10.2023
	.leftJoin("locales", "companies.id", "locales.company")
	//////06.10.2023
	
	.where({
      "companies.bin": helpers.encrypt(req.query.bin),
      "points.point_type": 2,
      "points.status": "ACTIVE",
    })
    .select(
      "points.id",
      "points.name",
      "points.address",
      "companies.name as companyname",
      "companies.id as companyid",
	  
	  //////21.09.2023
	   "partners.name as partnername"
      ,"partners.phone  as partnerphone"
      ,"partners.email  as partnermail"
      , knex.raw(`'https://tezportal.kz/public/companyLogos/partner'||partners.id||'.png'  as partnerlogo`),
	  //////21.09.2023
	  
	  //////06.10.2023
	  "locales.locales as locales",
	  //////06.10.2023
	  
      knex.raw(
        `(certificatenum||' '||certificateseries|| case when certificatedate is not null then ' от '||to_char(certificatedate,'DD.MM.YYYY') else '' end) as ndsinfo`
      )
    )
    .then((points) => {
      /*
			if(req.userData.company!=points[0].companyid){
				helpers.serverLog(req.originalUrl, 'wrong_company_bin', 'error');
				return res.status(500).json('wrong_company_bin');
			}*/
      points.forEach((point) => {
        point.name = helpers.decrypt(point.name);
        point.address = helpers.decrypt(point.address);
        point.companyname = helpers.decrypt(point.companyname);
      });

      const respJson = {
		  
		//////21.09.2023
        partnername:points[0].partnername
      , partnerphone:points[0].partnerphone
      , partnermail:points[0].partnermail
      , partnerlogo:points[0].partnerlogo,
		//////21.09.2023
		  
		//////06.10.2023
        locales: points[0].locales,
        //////06.10.2023  
		  
        company: points[0].companyname,
        ndsinfo: points[0].ndsinfo,
        points: points.map((point) => {
          return {
            name: point.name,
            address: point.address,
            id: point.id,
          };
        }),
      };

      // По просьбе Кудрата (26.12.2019)
      if (respJson.ndsinfo === null) delete respJson.ndsinfo;

      // helpers.serverLog(req.originalUrl, respJson, "success");
      return res.status(200).json(respJson);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/api/cashboxes", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  knex("cashboxes")
    .innerJoin("points", "points.id", "cashboxes.point")
    .where({ "points.id": req.query.pointid, "cashboxes.deleted": false })
    .select("cashboxes.id", "cashboxes.name", "points.address")
    .then((cashboxes) => {
      cashboxes.forEach((cashbox) => {
        cashbox.name = helpers.decrypt(cashbox.name);
        cashbox.address = helpers.decrypt(cashbox.address);
      });
      // helpers.serverLog(req.originalUrl, cashboxes, "success");
      return res.status(200).json({ cashboxes });
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/api/customers", (req, res) => {
  if (req.query.name){
		knex.raw(`
			select * from customers
			where company = '${req.userData.company}'
				and name ilike '%${req.query.name}%'
				and deleted = false
			limit 1
		`).then(customers => {
			return customers.rows[0] ? res.status(200).json(customers.rows[0]) : res.status(200).json('no_data_found');
		}).catch((err) => {
			console.log(err);
			return res.status(500).json(err);
		});
	}else{
		knex.raw(`
			select * from customers
			where company = '${req.userData.company}'
				and bin = '${req.query.bin}'
				and deleted = false
			limit 1
		`).then(customers => {
			//console.log(customers);
			return customers.rows[0] ? res.status(200).json(customers.rows[0]) : res.status(200).json('no_data_found');
		}).catch((err) => {
			return res.status(500).json(err);
		});
	}
});

////15.12.2022
router.get("/api/customers/getbonusinfoname", (req, res) => {
  //and (fc.lastname ilike '%${req.query.last}%' or fc.firstname ilike '%${req.query.first}%')
  

 // if (req.query.last) {
    knex.raw(`
      select 


 c.id::float8,
          c.telephone,
          c.cardnumber,
          coalesce(c.lastname,'') as lastname,
          c.firstname,
          c.bonuses,
          c.status,
          c.fizid::float8,
         coalesce(fc.lastname,'') as fizlastname,
          fc.firstname as fizfirstname
         
from customers_bonuscards c left join fiz_customers fc on (fc.id=c.fizid)
where c.company = '${req.userData.company}' 

        and (fc.lastname ilike '%${req.query.last}%' or fc.firstname ilike '%${req.query.first}%')
        
    `).then(customers => {
      
      return res.status(200).json(customers.rows);
    }).catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });

/*    



				
		`).then(customers => {
			
			return res.status(200).json(customers.rows);


			return customers.rows ? res.status(200).json(customers.rows) : res.status(200).json('no_data_found');


		}).catch((err) => {
			console.log(err);
			return res.status(500).json(err);
		});



		

  }
  else
  {
    knex.raw(`
      select 


 c.id::float8,
          c.telephone,
          c.cardnumber,
          coalesce(c.lastname,'') as lastname,
          c.firstname,
          c.bonuses,
          c.status,
          c.fizid::float8,
         coalesce(fc.lastname,'') as fizlastname,
          fc.firstname as fizfirstname
         ,'%${req.query.first}%' as f1
from customers_bonuscards c left join fiz_customers fc on (fc.id=c.fizid)
where c.company = '${req.userData.company}' 

        and (fc.firstname ilike '%${req.query.first}%')
        
    `).then(customers => {
      
      return res.status(200).json(customers.rows);
    }).catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });
  }  
 */ 
  





});
////15.12.2022


/*
select telephone,cardnumber,lastname,firstname
from customers_bonuscards
where id =
and company =
*/
router.get("/api/customers/getbonusinfo", (req, res) => {
  // helpers.serverLog(req.originalUrl);

  
  /////10.01.2023
  const company = req.userData.company;
   
  let selectCondition = req.query.code
        ? { "customers_bonuscards.cardnumber": req.query.code,'customers_bonuscards.company': company }
        : { "customers_bonuscards.telephone": req.query.phone,'customers_bonuscards.company': company };

      

  
  knex("customers_bonuscards")
        .leftJoin(
          "fiz_customers",
          "fiz_customers.id",
          "customers_bonuscards.fizid"
        )
        .where(selectCondition)        
        .select(
          knex.raw("customers_bonuscards.id::float8"),
          "customers_bonuscards.telephone",
          "customers_bonuscards.cardnumber",
          knex.raw("coalesce(customers_bonuscards.lastname,'') as lastname"),
          "customers_bonuscards.firstname",
          "customers_bonuscards.bonuses",
          "customers_bonuscards.status",
          knex.raw("customers_bonuscards.fizid::float8"),
          knex.raw("coalesce(fiz_customers.lastname,'') as fizlastname"),
          "fiz_customers.firstname as fizfirstname"
        )
        .first()
        .then((card) => {
      return card
            ? res.status(200).json(card)
            : res.status(200).json({ error: "no_data_found" });
    }).catch((err) => {
      console.log(err);
      return res.status(500).json(err);
    });



/*
  const company = req.userData.company; 

  knex("companies")
    .where({ id: req.userData.company })
    .select(knex.raw("coalesce(bonus_group,0) as group"))
    .then((groups) => {
      p_group = groups[0].group;

      //let selectCondition = { 'customers_bonuscards.company': company };
      //req.query.code ? selectCondition['customers_bonuscards.cardnumber'] = req.query.code : selectCondition['customers_bonuscards.telephone'] = req.query.phone;
      
    //////09.12.2022
    
    let selectCondition = req.query.code



        ? { "customers_bonuscards.cardnumber": req.query.code }
        : { "customers_bonuscards.telephone": req.query.phone };
		
		
		
		
	  //////09.12.2022	
		

    
    
    
    
    //////09.12.2022  
    


      knex("customers_bonuscards")
        .leftJoin(
          "fiz_customers",
          "fiz_customers.id",
          "customers_bonuscards.fizid"
        )
        .where(selectCondition)
        .where((pt) => {
          p_group === "0"
            ? pt.where({ "customers_bonuscards.company": company })
            : pt.whereIn("customers_bonuscards.company", function () {
                this.select("id")
                  .from("companies")
                  .where({ bonus_group: p_group });
              });
        })
        .select(
          knex.raw("customers_bonuscards.id::float8"),
          "customers_bonuscards.telephone",
          "customers_bonuscards.cardnumber",
          knex.raw("coalesce(customers_bonuscards.lastname,'') as lastname"),
          "customers_bonuscards.firstname",
          "customers_bonuscards.bonuses",
          "customers_bonuscards.status",
          knex.raw("customers_bonuscards.fizid::float8"),
          knex.raw("coalesce(fiz_customers.lastname,'') as fizlastname"),
          "fiz_customers.firstname as fizfirstname"
        )
        .first()
        .then((card) => {
          // helpers.serverLog(req.originalUrl, card, "success");
          return card
            ? res.status(200).json(card)
            : res.status(200).json({ error: "no_data_found" });
        })
        .catch((err) => {
          helpers.serverLog(req.originalUrl, err, "error");
          return res.status(500).json(err);
        });
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
  */
  /////10.01.2023
  

});

//{"company" : 1, "bonuscard" : {"id" : "1", "telephone" :, "cardnumber" :, "lastname" :, "firstname" :, "status" : "ACTIVE"}}
router.post("/api/customers/setbonusinfo", (req, res) => {
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select bonuscards_management(?)", [req.body])
    .then((result) => {
      res
        .status(result.rows[0].bonuscards_management ? 200 : 400)
        .json(result.rows[0].bonuscards_management);
      return;
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      console.log(err);
      res.status(500).json(err);
      return;
    });
});

router.get("/api/stockcurrent/units", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  knex("stockcurrent")
    .where({ id: req.query.stockcurrentid })
    .select("units")
    .first()
    .then((res) => res.units)
    .then((units) => {
      // helpers.serverLog(req.originalUrl, units, "success");
      return res.status(200).json({ units });
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/purchaseprice", (req, res) => {
  // helpers.serverLog(req.originalUrl, req.body);
  knex
    .raw("select get_purchaseprice(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      result = result.rows[0].get_purchaseprice;
      // helpers.serverLog(req.originalUrl, result, result.code);
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

// select to_char(t.date,'DD.MM.YYYY') as dat, sum(t.price) as sold, case when sum(t.price) > p.daily then round(cast(1*sum(t.price)/100 as numeric),2) else '0' end as award
// from transactions t
// left join cashbox_users u on (t.cashboxuser = u.id)
// left join salesplan p on (p.object = u.id)
// where t.cashboxuser = 83
// and t.date::date between to_date('19.12.2018','DD.MM.YYYY') and to_date('24.12.2018','DD.MM.YYYY')
// group by dat, p.daily
// order by dat desc;

router.get("/api/bonus/daily", (req, res) => {
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  // helpers.serverLog(req.originalUrl);

  knex("transactions")
    .leftJoin("cashbox_users", "transactions.cashboxuser", "cashbox_users.id")
    .leftJoin("salesplan", "salesplan.object", "cashbox_users.id")
    .where({
      "transactions.cashboxuser": req.query.cashboxuser,
      "salesplan.type ": 1,
    })
    .andWhereBetween(knex.raw("transactions.date::date"), [dateFrom, dateTo])
    .select(
      "cashbox_users.id",
      "cashbox_users.name",
      "salesplan.daily",
      knex.raw(`to_char(transactions.date,'DD.MM.YYYY') as dat`),
      knex.raw(
        `case when sum(transactions.price) > salesplan.daily then round(cast(2*sum(transactions.price)/100 as numeric),2) else '0' end as award`
      )
    )
    .sum("transactions.price as sold")
    .groupBy("dat", "salesplan.daily", "cashbox_users.id", "cashbox_users.name")
    .orderBy("dat", "desc")
    .then((dailybonus) => {
      // helpers.serverLog(req.originalUrl, dailybonus, "success");
      return res.status(200).json(dailybonus);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.post("/api/invoices", (req, res) => {
  knex
    .raw("select get_invoice_details(?)", [req.body])
    .then((result) => {
      result = result.rows[0].get_invoice_details;
      return res.status(200).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//{"company" : 1, "fiz_customers" : {"id" : "1", "telephone" :, "lastname" :, "firstname" :}}
router.post("/api/customers/fizadd", (req, res) => {
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select fiz_customers_management(?)", [req.body])
    .then((result) => {
      res
        .status(result.rows[0].fiz_customers_management ? 200 : 400)
        .json(result.rows[0].fiz_customers_management);
      return;
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      console.log(err);
      res.status(500).json(err);
      return;
    });
});

router.get("/api/customers/getfizinfo", (req, res) => {
  const telephone = req.query.telephone;
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl);
  const company = req.userData.company;

  knex("fiz_customers")
    .where({
      "fiz_customers.telephone": telephone,
      "fiz_customers.company ": company,
      "deleted": false,
    })
    .select(
      "fiz_customers.id",
      knex.raw("coalesce(fiz_customers.lastname,'') as lastname"),
      "fiz_customers.firstname",
      "fiz_customers.debt"
    )
    .first()
    .then((getfizinfo) => {
      // helpers.serverLog(req.originalUrl, getfizinfo, "success");
      return res.status(200).json(getfizinfo);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

/////24.11.2022

router.get("/api/customers/getfizinfobylastname", (req, res) => {
  
  
  //////23.10.2023
	//const name = req.query.name.toLowerCase(); 
	 const name = typeof req.query.name !== "undefined" && req.query.name !== null 
        ? ` lower(fiz_customers.lastname) like lower('%${req.query.name}%') `
		: " 1=1";
	 
 //////23.10.2023
  
  req.body.company = req.userData.company;
  helpers.serverLog(req.originalUrl);
  const company = req.userData.company;
  
  
  

  knex("fiz_customers")
    	
	 //////23.10.2023
    //.whereRaw(`lower(fiz_customers.lastname) like ?`, [`%${name}%`])
	  .whereRaw(`${name}`)
  //////23.10.2023	
	
    .where({
      "fiz_customers.company ": company,
      "deleted": false,
    })
    .select(
      "fiz_customers.id",
      knex.raw("coalesce(fiz_customers.lastname,'') as lastname"),
      "fiz_customers.firstname",
      "fiz_customers.debt",
      "fiz_customers.telephone"
    )
    .then((getfizinfo) => {
      // helpers.serverLog(req.originalUrl, getfizinfo, "success");
      return res.status(200).json(getfizinfo);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

/////24.11.2022


//////30.01.2024

router.get("/api/customers/getfizinfobyid", (req, res) => {
  
  
	 const name = typeof req.query.id !== "undefined" && req.query.id !== null 
        ? ` id=${req.query.id} `
		: " 1=1";

  req.body.company = req.userData.company;
  helpers.serverLog(req.originalUrl);
  const company = req.userData.company; 
  
  

  knex("fiz_customers")    	
	
	.whereRaw(`${name}`)
	
    .where({
      "fiz_customers.company ": company,
      "deleted": false,
    })
    .select(
      "fiz_customers.id",
      knex.raw("coalesce(fiz_customers.lastname,'') as lastname"),
      "fiz_customers.firstname",
      "fiz_customers.debt",
      "fiz_customers.telephone"
    )
    .then((getfizinfo) => {
     
      return res.status(200).json(getfizinfo);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//////30.01.2024


router.get("/api/customers/getfizinfobyname", (req, res) => {
  const name = req.query.name.toLowerCase();
  req.body.company = req.userData.company;
  helpers.serverLog(req.originalUrl);
  const company = req.userData.company;

  knex("fiz_customers")
    .whereRaw(`lower(fiz_customers.firstname) like ?`, [`%${name}%`])
    .where({
      "fiz_customers.company ": company,
      "deleted": false,
    })
    .select(
      "fiz_customers.id",
      knex.raw("coalesce(fiz_customers.lastname,'') as lastname"),
      "fiz_customers.firstname",
      "fiz_customers.debt",
      "fiz_customers.telephone"
    )
    .then((getfizinfo) => {
      // helpers.serverLog(req.originalUrl, getfizinfo, "success");
      return res.status(200).json(getfizinfo);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//{"company" : 1, "writeoff_debt_customers" : {"id" : "1", "debt" : 500}}
router.post("/api/customers/writeoff_debt", async (req, res) => {
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl, req.body);
  if ((process.env.LOG_LEVEL || 1) >= 1) {
    // helpers.serverLog(req.originalUrl, req.body, 'info');
       helpers.simpleLog("fizcustomers.js", "/writeoff_debt", "req.originalUrl " + req.body);
  }
  const company = req.userData.company;
  const id = req.body.writeoff_debt_customers.id;
  const debt = req.body.writeoff_debt_customers.debt;
  const user = req.body.writeoff_debt_customers.user;
  const system = req.body.writeoff_debt_customers.system ? req.body.writeoff_debt_customers.system : 'POS';
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

  // knex
  //   .raw("select writeoff_customers_debt(?)", [req.body])
  //   .then((result) => {
  //     res
  //       .status(result.rows[0].writeoff_customers_debt ? 200 : 400)
  //       .json(result.rows[0].writeoff_customers_debt);
  //     return;
  //   })
  //   .catch((err) => {
  //     helpers.serverLog(req.originalUrl, err, "error");
  //     console.log(err);
  //     res.status(500).json(err);
  //     return;
  //   });
});

// {"writeoff_debt_customers" : {"id" : "1", "debt" : 500, "user":5, "system": "ERP"}}
router.post("/api/customers/writeoff_debt_company", async (req, res) => {
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl, req.body);
  if ((process.env.LOG_LEVEL || 1) >= 1) {
    // helpers.serverLog(req.originalUrl, req.body, 'info');
       helpers.simpleLog("fizcustomers.js", "/writeoff_debt", "req.originalUrl " + req.body);
  }
  const company = req.userData.company;
  const id = req.body.writeoff_debt_customers.id;
  const debt = req.body.writeoff_debt_customers.debt;
  const user = req.body.writeoff_debt_customers.user;
  const system = req.body.writeoff_debt_customers.system ? req.body.writeoff_debt_customers.system : 'POS';
  const customerType = req.body.writeoff_debt_customers.clientType ? req.body.writeoff_debt_customers.clientType : 1;7

  // {"company":"112", "id" : "1", "customerType": "0", "debt" : 500, "user":5, "system": "ERP"}
  try {
       let result = await  customer.writeoffDebt(company, id, customerType, debt, user, system);
       return result.rowCount == 1 
            ? res.status(200).json({"code":"success","result":result}) 
            : res.status(500).json({"code":"error","result":result});
  } catch {
       return res.status(500).json({"code":"error","result":result});
  };

  // const company = req.userData.company;
  // const id = req.body.writeoff_debt_customers.id;
  // const debt = req.body.writeoff_debt_customers.debt;
  // const userid = req.body.writeoff_debt_customers.user;
  // const sys = req.body.writeoff_debt_customers.system;
  // // const sys1 = 'POS';
  // // const sys2 = 'ERP';
  // // helpers.serverLog(req.originalUrl, req.body);
  // // if (sys.localeCompare(sys1) == 0 | sys.localeCompare(sys2) == 0) {
  // if (sys != 'POS' & sys != 'ERP') {
  //   return res.status(500).json({"code": "error", "text": "Признак системы отправления не опознан!", "text_eng": "System is not recognised!"});
  // }
  // await knex("customers")
  //   .where({
  //     "id":id
  //   })
  //   .select("debt")
  //   .then((result) => {
  //     if (result.debt < debt) {
  //       return res.status(500).json({"code": "error", "text": "Сумма списания превосходит сумму долга!", "text_eng": "Writeoff amount exceeds debt balance!"});
  //     }
  //   })
  //   .catch((err) => {
  //     helpers.log("external.js", "writeoff_debt_company", JSON.stringify(err));
  //   });


  // knex.transaction(async (trx) => {
  //   await knex
  //   .raw(
  //     `
  //     UPDATE customers
	// 		SET debt = debt - ${debt}
	// 			WHERE id = ${id}
	// 				AND company = ${company}
  //     `
  //   )
  //   .transacting(trx)
  //   .then(async () => {
  //     await knex.raw(
  //       `
  //       INSERT INTO debtorsdiary(customer,type,debt,date,company,"user","system", customertype)
	// 	      VALUES(${id},-1,${debt}*-1,now(),${company},${userid},'${sys}',1);
  //       `
  //     )
  //     .transacting(trx)
  //     })
  //   .then(trx.commit)
  //   .catch(trx.rollback)
  //   .then((result) => {
  //       res.status(200).json({"code": "success", "result": result});
  //       // .status(result.rows[0].writeoff_customers_debt ? 200 : 400)
  //       // .json(result.rows[0].writeoff_customers_debt);
  //       return;

  //   })
  //   .catch((err) => {
  //     helpers.serverLog(req.originalUrl, err, "error");
  //     console.log(err);
  //     res.status(500).json(err);
  //     return;
  //   });
  // })



});


//{company, user, pointid, products: [{prodid,unitswas,time,attribute,units}]}
router.post("/api/revision", (req, res) => {
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select revision(?)", [req.body])
    .then((result) => {
      res
        .status(result.rows[0].revision ? 200 : 400)
        .json(result.rows[0].revision);
      return;
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      res.status(500).json(err);
      return;
    });
});

//copy of api/point service and includes central stock
router.get("/api/revision/point", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  knex("points")
    .innerJoin("companies", "points.company", "companies.id")
    .where({
      "companies.bin": helpers.encrypt(req.query.bin),
      "points.status": "ACTIVE",
    })
    .whereIn("points.point_type", [0, 2])
    .select(
      "points.id",
      "points.name",
      "points.address",
      "points.point_type",
      "companies.name as companyname",
      "companies.id as companyid"
    )
    .then((points) => {
      points.forEach((point) => {
        if (point.point_type === 2) point.name = helpers.decrypt(point.name);
        point.address = helpers.decrypt(point.address);
        point.companyname = helpers.decrypt(point.companyname);
      });

      const respJson = {
        company: points[0].companyname,
        points: points.map((point) => {
          return {
            name: point.name,
            address: point.address,
            id: point.id,
          };
        }),
      };

      // helpers.serverLog(req.originalUrl, respJson, "success");
      return res.status(200).json(respJson);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/api/productunits", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  const product = req.query.productid;
  const attributes = req.query.attributeid;
  const point = req.query.pointid;
  const company = req.userData.company;

  knex("stockcurrent")
    .innerJoin("pointset", "stockcurrent.point", "pointset.stock")
    .where({
      "stockcurrent.product": product,
      "stockcurrent.attributes": attributes,
      "pointset.point": point,
      "stockcurrent.company": company,
    })
    .select("stockcurrent.units")
    .first()
    .then((result) => {
      // helpers.serverLog(req.originalUrl, result, "success");
      return res.status(200).json(result);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/api/revisionusers", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  knex("erp_users")
    .innerJoin("user2roles", "user2roles.user", "erp_users.id")
    .innerJoin("companies", "companies.id", "erp_users.company")
    .where({
      "user2roles.role": 6,
      "erp_users.status": "ACTIVE",
      "companies.status": "ACTIVE",
      "companies.bin": helpers.encrypt(req.query.bin),
    })
    .select("erp_users.id", "erp_users.login", "erp_users.name")
    .then((result) => {
      result.forEach((user) => {
        user.name = helpers.decrypt(user.name);
      });

      const respJson = {
        revisionUsers: result,
      };

      // helpers.serverLog(req.originalUrl, respJson, "success");
      return res.status(200).json(respJson);
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//for fetching data from POS to update POS status.
//{"cashboxid":48,id:1}
router.post("/api/update/done", (req, res) => {
  const filename = req.body.filename;
  const cashboxId = req.body.cashboxid;
  const id = req.body.id;
  const company = req.userData.company;
  req.body.company = company;
  // helpers.serverLog(req.originalUrl, req.body);
  knex("cashbox_updates")
    .where({
      "cashbox_updates.cashboxid": cashboxId,
      "cashbox_updates.company": company,
      "cashbox_updates.id": id,
    })
    .update({ needupdate: 0 })
    .then((result) => {
      // helpers.serverLog(
      //   req.originalUrl,
      //   { status: "success", rowUpdated: result },
      //   "success"
      // );
      return res.status(200).json({ status: "success", rowUpdated: result });
    })
    .catch((err) => {
      helpers.serverLog(
        req.originalUrl,
        { status: "error", text: err ? err : "error" },
        "error"
      );
      return res
        .status(500)
        .json({ status: "error", text: err ? err : "error" });
    });
});

//for checking if update is exists
router.get("/api/update/check", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  const cashboxId = req.query.cashboxid;
  const company = req.userData.company;
  knex("cashbox_updates")
    .where({
      "cashbox_updates.cashboxid": cashboxId,
      "cashbox_updates.company": company,
      "cashbox_updates.needupdate": 1,
    })
    .select(
      "cashbox_updates.id",
      "cashbox_updates.needupdate",
      "cashbox_updates.filename"
    )
    .orderBy("cashbox_updates.createdate")
    .first()
    .then((result) => {
      response = result ? result : { needupdate: 0 };
      // helpers.serverLog(req.originalUrl, response, "success");
      return res.status(200).json(response);
    })
    .catch((err) => {
      helpers.serverLog(
        req.originalUrl,
        { status: "error", text: err === undefined ? err : "error" },
        "error"
      );
      return res
        .status(500)
        .json({ status: "error", text: err === undefined ? err : "error" });
    });
});

//{"company" : 1, "giftcard" : 123}
router.get("/api/giftcards/info", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  const company = req.userData.company;
  const card = req.query.giftcard;
  let result;
  var now = new Date();
  var day = ("0" + now.getDate()).slice(-2);
  var month = ("0" + (now.getMonth() + 1)).slice(-2);
  var today = now.getFullYear() + "-" + month + "-" + day;

  knex("companies")
    .where({ id: company })
    .select(knex.raw("coalesce(certificate_group,0) as group"))
    .then((groups) => {
      p_group = groups[0].group;

      knex("giftcertificates as g")
        .innerJoin("giftcertificatetypes as t", "g.type", "t.id")
        .where({ /*'g.company': company,*/ "g.code": card })
        .where((pt) => {
          p_group === "0"
            ? pt.where({ "g.company": company })
            : pt.whereIn("g.company", function () {
                this.select("id")
                  .from("companies")
                  .where({ certificate_group: p_group });
              });
        })
        /*.whereIn(knex.raw("g.company"), knex.raw(`WITH RECURSIVE nodes(id) AS (																		
														SELECT r.id
															FROM companies AS r
																WHERE r.id = ${company}
														UNION ALL
														SELECT r.holding_parent
															FROM companies AS r, nodes AS nd
																WHERE nd.id = r.id																
													)
													SELECT c.id
														FROM nodes n
															INNER JOIN companies c on (c.id = n.id)`))*/
        .select(
          "g.id",
          "g.balance",
          "g.denomination",
          "g.active",
          knex.raw(`to_char(g.expiredate,'DD.MM.YYYY') as expiredate`),
          knex.raw(`t.name as type`),
          "g.period",
          knex.raw(`to_char(g.selldate,'DD.MM.YYYY') as selldate`),
          knex.raw(`to_char(g.expiredate,'YYYY-MM-DD') as expiredate_compare`)
        ) //.toSQL().toNative()
        .then((certificates) => {
          certificates.forEach((certificate) => {
            // Свежая карта
            if (
              certificate.active === false &&
              certificate.expiredate === null
            ) {
              certificate.expiredate =
                certificate.period + " месяца со дня продажи";
              result = {
                status: "onsale",
                text: "Карта доступна для продажи",
                info: certificate,
              };
              // Была использована, но срок годности еще не вышел
            } else if (
              certificate.active === false &&
              certificate.expiredate != null &&
              certificate.selldate != null &&
              moment(certificate.expiredate_compare) <= moment(today)
            ) {
              result = {
                status: "used",
                text: "Данная карта уже была использована!",
                info: certificate,
              };
              // Была продана, но не была использована
            } else if (
              certificate.active === true &&
              certificate.expiredate != null &&
              certificate.selldate != null &&
              moment(certificate.expiredate_compare) >= moment(today)
            ) {
              result = {
                status: "soldout",
                text: "Данная карта числится проданной",
                info: certificate,
              };
              // Вышел срок годности
            } else if (
              (certificate.active === false &&
                certificate.expiredate != null) ||
              moment(certificate.expiredate_compare) < moment(today)
            ) {
              result = {
                status: "expired",
                text: "Срок действия карты истек " + certificate.expiredate,
                info: certificate,
              };
            }

            // "Мусор" нам не нужен
            delete certificate.expiredate_compare;
          });

          if (result === undefined)
            result = { status: "notfound", text: "Карта не найдена!" };

          // helpers.serverLog(req.originalUrl, result, "success");
          return res.status(200).json(result);
        })
        .catch((err) => {
          helpers.serverLog(req.originalUrl, err, "error");
          return res.status(500).json(err);
        });
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

//{"company" : 1, "customer":{"bin":"12313","name":"TOO ABC"}}
router.post("/api/customers/custadd", (req, res) => {
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl, req.body);

  knex
    .raw("select customers_management(?)", [req.body])
    .then((result) => {
      res
        .status(result.rows[0].customers_management ? 200 : 400)
        .json(result.rows[0].customers_management);
      return;
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      console.log(err);
      res.status(500).json(err);
      return;
    });
});

//{"company": 15, "date":"24.12.2019 11:20:38", "customer":1, "cashboxuser":99, "cashbox":50, "type":0, "details":[ {"stockid":19425, "price":145, "units":10}]}
router.post("/api/customers/transferconsignment", (req, res) => {
  req.body.company = req.userData.company;
  // helpers.serverLog(req.originalUrl, req.body);
 
  /////26.05.2023
  //console.log("88-transferconsignment");
  //console.log(req.body);
  /////26.05.2023
 
  knex
    .raw("select transfer_consignment(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      res
        .status(result.rows[0].transfer_consignment ? 200 : 400)
        .json(result.rows[0].transfer_consignment);
      return;
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      console.log(err);
      res.status(500).json(err);
      return;
    });
});

router.get("/api/customers/getinvoices", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  const company = req.userData.company;
  const customer = req.query.customer;
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;
  knex("consignment")
    .innerJoin("stockcurrent", {
      "stockcurrent.id": "consignment.stockid",
      "stockcurrent.company": "consignment.company",
    })
    .innerJoin("products", {
      "products.id": "stockcurrent.product",
      "products.company": "stockcurrent.company",
    })
    .where({ "consignment.company": company, "consignment.customer": customer })
    /////26.05.2023
	//.andWhereBetween("consignment.date", [dateFrom, dateTo])
	.andWhereBetween("consignment.date", [knex.raw(`to_date('${req.query.dateFrom}'::text,'DD.MM.YYYY')`), knex.raw(`to_date('${req.query.dateTo}'::text,'DD.MM.YYYY')`)])
	/////26.05.2023	
    .select(
      knex.raw(`cast(consignment.invoice as float8)`),
      knex.raw(`to_char(consignment.date,'DD.MM.YYYY') as date`),
      knex.raw(`coalesce(consignment.altinvoice,'') as altinvoice`),
      knex.raw(`json_agg(json_build_object('stockid',consignment.stockid,'name',products.name,'units',consignment.units,'unitsincome',consignment.unitsincome,'price',consignment.price,'attrid',stockcurrent.attributes,
			'attributes',array_to_string(array(select n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = stockcurrent.attributes and a.company = ${company}),', '),
			'productid',products.id,'discount',consignment.discount)) 
				as details`)
    )
    .groupBy(
      "consignment.invoice",
      "consignment.date",
      "consignment.altinvoice"
    )
    .orderBy("consignment.date")
    .then((consignmentinvoices) => {
      // helpers.serverLog(req.originalUrl, consignmentinvoices, "success");
      return res.status(200).json({ consignmentinvoices });
    })
    .catch((err) => {
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

router.get("/api/coupon/info", (req, res) => {
  // helpers.serverLog(req.originalUrl);
  const company = req.userData.company;
  const coupon = req.query.coupon;
  const type = req.query.type;
  const refid = req.query.refid;
  
  
  
 

  let result;
  
  
  //////06.02.2024
	 if  (refid ===0) { 
	 
	 knex("coupons as co")
    .leftJoin("categories as c", {
      "c.id": "co.object",
      "c.company": "co.company" /*, 'c.deleted': [false] */,
    })
    .leftJoin("products as pr", {
      "pr.category": "c.id",
      "pr.company": "co.company",
    })
    .where({
      "co.company": company,
      "co.active": true,
      "co.number": coupon,
      
      "co.objtype": 1,
      "co.type": type,
    })
	
    .select("co.discount")
    .union(function () {
      this.select("co4.discount").from("coupons as co4").where({
        "co4.company": company,
        "co4.active": true,
        "co4.number": coupon,
        "co4.objtype": 0,
        "co4.type": type,
      });
    })
    .union(function () {
      this.select("co2.discount")
        .from("coupons as co2")
        .leftJoin("brands as b", { "b.id": "co2.object" })
        .leftJoin("products as pr2", {
          "pr2.brand": "b.id",
          "pr2.company": "co2.company",
        })
        .where({
          "co2.company": company,
          "co2.active": true,
          "co2.number": coupon,
          
          "co2.objtype": 2,
          "co2.type": type,
        })
	
	;
    })
    .union(function () {
      this.select("co3.discount")
        .from("coupons as co3")
        .leftJoin("products as pr3", {
          "co3.object": "pr3.id",
          "pr3.company": "co3.company",
        })
        .where({
          "co3.company": company,
          "co3.active": true,
          "co3.number": coupon,
          
          "co3.objtype": 3,
          "co3.type": type,
        })
		
		;
    })
    .then((coupons) => {
      result = { status: "success", discount: coupons[0].discount };
      // helpers.serverLog(req.originalUrl, result, "success");
      return res.status(200).json(result);
    })
    .catch((err) => {
      if (Object.keys(err).length === 0) {
        err = { status: "notfound", text: "Купон не найден!" };
        // helpers.serverLog(req.originalUrl, err, "success");
        return res.status(200).json(err);
      }
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
	 
	 } else
 //////06.02.2024
  

  knex("coupons as co")
    .leftJoin("categories as c", {
      "c.id": "co.object",
      "c.company": "co.company" /*, 'c.deleted': [false] */,
    })
    .leftJoin("products as pr", {
      "pr.category": "c.id",
      "pr.company": "co.company",
    })
    .where({
      "co.company": company,
      "co.active": true,
      "co.number": coupon,
      "pr.id": refid,
      "co.objtype": 1,
      "co.type": type,
    })
	//////06.02.2024
	//.whereRaw(`${refid}`)
	//////06.02.2024
    .select("co.discount")
    .union(function () {
      this.select("co4.discount").from("coupons as co4").where({
        "co4.company": company,
        "co4.active": true,
        "co4.number": coupon,
        "co4.objtype": 0,
        "co4.type": type,
      });
    })
    .union(function () {
      this.select("co2.discount")
        .from("coupons as co2")
        .leftJoin("brands as b", { "b.id": "co2.object" })
        .leftJoin("products as pr2", {
          "pr2.brand": "b.id",
          "pr2.company": "co2.company",
        })
        .where({
          "co2.company": company,
          "co2.active": true,
          "co2.number": coupon,
          "pr2.id": refid,
          "co2.objtype": 2,
          "co2.type": type,
        })
		//////06.02.2024
	//.whereRaw(`${refid}`)
	//////06.02.2024
	;
    })
    .union(function () {
      this.select("co3.discount")
        .from("coupons as co3")
        .leftJoin("products as pr3", {
          "co3.object": "pr3.id",
          "pr3.company": "co3.company",
        })
        .where({
          "co3.company": company,
          "co3.active": true,
          "co3.number": coupon,
          "pr3.id": refid,
          "co3.objtype": 3,
          "co3.type": type,
        })
		//////06.02.2024
	//.whereRaw(`${refid}`)
	//////06.02.2024
		;
    })
    .then((coupons) => {
      result = { status: "success", discount: coupons[0].discount };
      // helpers.serverLog(req.originalUrl, result, "success");
      return res.status(200).json(result);
    })
    .catch((err) => {
      if (Object.keys(err).length === 0) {
        err = { status: "notfound", text: "Купон не найден!" };
        // helpers.serverLog(req.originalUrl, err, "success");
        return res.status(200).json(err);
      }
      helpers.serverLog(req.originalUrl, err, "error");
      return res.status(500).json(err);
    });
});

module.exports = router;
