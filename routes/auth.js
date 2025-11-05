const express = require("express");
const router = new express.Router();
const knex = require("../db/knex");
const helpers = require("../middlewares/_helpers");
//20231216 AB FeatureFlag2 for old cashbox compatibility check new login service for erp_user <
const fetch = require("node-fetch");
//20231216 AB FeatureFlag2 for old cashbox compatibility check new login service for erp_user >

require("../config/local-passport");

router.post("/signin", signin);
router.post("/revsignin", revsignin);
router.post("/signup", signup);

/////11.01.2023

router.post("/pos/sigconfig", (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  req.body.ip = ip;

  // helpers.serverLog(req.originalUrl, req.body);

  knex("erp_users")
    .innerJoin("user2roles", { "erp_users.id": "user2roles.user" })
    .where({ login: req.body.username.toLowerCase(), "user2roles.role": "4" }) // 4 = администратор
    .select("company", "pass")
    .first()
    .then((user) => {
      if (user) {
        if (!helpers.comparePass(req.body.password, user.pass)) {
          const respJson = {
            status: "failed",
            error: "wrongPassword",
            user,
            password: req.body.password,
          };
          helpers.serverLog(req.originalUrl, respJson, "error");
          return res.status(403).json(respJson);
        } else {
          const accessToken = helpers.accessExternalToken(user);
          const respJson = {
            status: "success",
            block: false,
            accessToken,
            password: null,
          };
          // helpers.serverLog(req.originalUrl, respJson);
          return res.status(200).json(respJson);
        }
      } 
    })
    .catch((error) => {
      const respJson = {
        status: "failed",
        error: error,
        user: "cashboxUser4",
      };
      helpers.serverLog(req.originalUrl, respJson, "error");
      return res.status(403).json({ status: "failed", error });
    });
});

/////11.01.2023



router.post("/pos/signin", (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  req.body.ip = ip;

  

  // helpers.serverLog(req.originalUrl, req.body);

  // knex("erp_users")
  //   .innerJoin("user2roles", { "erp_users.id": "user2roles.user" })
  //   .where({ login: req.body.username.toLowerCase(), "user2roles.role": "4" }) // 4 = администратор
  //   .select("company", "pass")
  //   .first()
  //   .then((user) => {
  //     if (user) {
  //       if (!helpers.comparePass(req.body.password, user.pass)) {
  //         const respJson = {
  //           status: "failed",
  //           error: "wrongPassword",
  //           user,
  //           password: req.body.password,
  //         };
  //         helpers.serverLog(req.originalUrl, respJson, "error");
  //         return res.status(403).json(respJson);
  //       } else {
  //         const accessToken = helpers.accessExternalToken(user);
  //         const respJson = {
  //           status: "success",
  //           block: false,
  //           accessToken,
  //           password: null,
  //         };
  //         // helpers.serverLog(req.originalUrl, respJson);
  //         return res.status(200).json(respJson);
  //       }
  //     } 
            
		  // else {
     
        knex("cashboxtoken")
          .join("cashboxes", { "cashboxes.id": "cashboxtoken.cashbox" })
          .join("points", { "points.id": "cashboxes.point" })
          .join("companies", { "companies.id": "points.company" })
          .where({ "cashboxes.id": req.body.username })
          .select("cashboxtoken.*", "points.company", "companies.status")
          .first()
          .then((cashboxUser) => {
             //20231214 AB FeatureFlag check integration pass before reissuing new <
            if (process.env.FF1_CHECK_INT_PASS_BEFORE_ISSUE){
              if (req.body.password != cashboxUser.token) {
                      const respJson = {
                         status: "failed",
                         error: "wrongPassword",
                         cashboxUser,
                         password: req.body.password,
                      };
                      helpers.serverLog(
                        req.originalUrl,
                        {
                          ...respJson,
                          condition: "req.body.password !== cashboxUser.token",
                        },
                        "error"
                      );
                      return res.status(403).json(respJson);
              };
            };  
            //20231214 AB FeatureFlag check integration pass before reissuing new >
            if (cashboxUser.status === "CLOSE"){
                const respJson = {
                  status: "success",
                  block: true,
                };
              
                return res.status(200).json(respJson);
            };
            if (helpers.externalPasswordExpired(req.body.password)) {
              //20231216 AB check old integration pass sanity before reissuing new <
              
              if (process.env.FF1_CHECK_INT_PASS_BEFORE_ISSUE && !helpers.verifyExternalPassword(req.body.password)) {
                const respJson = {
                  status: "failed",
                  error: "wrongPassword",
                  cashboxUser,
                  password: req.body.password,
                };
                helpers.serverLog(
                 req.originalUrl,
                 {
                   ...respJson,
                   condition: "!helpers.verifyExternalPassword(req.body.password)",
                 },
                 "error"
                );
                return res.status(403).json(respJson);
              } else {
               //20231216 AB check old integration pass sanity before reissuing new >
                const newPassword = helpers.newPointPassword();
                const updateToken = {
                  cashbox: req.body.username,
                  token: newPassword, // это не токен, это пароль для кассы (дата), чтобы
                  // сгенерить новый токен.
                  };
                knex
                  .raw("select inserttoken(?)", [updateToken])
                  .then((result) => {
                    let instoken = result.rows[0].inserttoken;
                    if (instoken.code === "success") {
                      const accessToken = helpers.accessExternalToken(cashboxUser);
                      const respJson = {
                        status: "success",
                        block: false,
                        accessToken,
                        password: newPassword,
                      };
                      return res.status(200).json(respJson);
                    } else {
                      const respJson = {
                        status: "failed",
                        error: "inserttoken",
                        user: "cashboxUser1",
                      };
                      helpers.serverLog(req.originalUrl, respJson, "error");
                      return res.status(500).json(instoken);
                    }
                  }).catch((error) => {
                    const respJson = {
                      status: "failed",
                      error: `inserttoken: ${error}`,
                      user: "cashboxUser2",
                    };
                    helpers.serverLog(req.originalUrl, respJson, "error");
                    return res.status(500).json(respJson);
                  });
              };
              //20231214 AB FeatureFlag check integration pass before reissuing new <
              // discovered a code bug - due to errors in _helpers.js newPointPassword
              // password was almost always expired, therefore new newPassword was issued every time
              // so the whole check of password vs token always was skipped.  Pass vs token 
              // check always has to come first.

              // }else if (req.body.password !== cashboxUser.token) {
              //     const respJson = {
              //       status: "failed",
              //       error: "wrongPassword",
              //       user: cashboxUser,
              //       password: req.body.password,
              //     };
              //     helpers.serverLog(
              //       req.originalUrl,
              //       {
              //         ...respJson,
              //         condition: "req.body.password !== cashboxUser.token",
              //       },
              //       "error"
              //     );
              //     return res.status(403).json(respJson);
              //20231214 AB FeatureFlag check integration pass before reissuing new >
              }else{
                const accessToken = helpers.accessExternalToken(cashboxUser);
                const respJson = {
                  status: "success",
                  block: false,
                  accessToken,
                  password: req.body.password,
                };
                return res.status(200).json(respJson);
              }
            }
          ).catch((error) => {
            //20231216 AB FeatureFlag2 for old cashbox compatibility check new login service for erp_user <
            console.log(`auth.js /pos/signin returned error: ${error}`);
            switch(error.code){
              case '22P02':
                if(process.env.FF2_POS_SIGNIN_CHECK_LOGIN_SRV){
                  var requestOptions = {
                    method: 'POST',
                    headers: {
                        "Authorization": req.headers.Authorization,
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(req.body),
                    redirect: 'follow'
                  };
    
                  fetch(process.env.DOCKER_LOGIN_SRV+"/auth/pos/sigconfig", requestOptions)
                    .then(response => response.text())
                    .then((result) => {
                      console.log(result);
                      return  res.status(200).json(JSON.parse(result));
                    })
                    .catch((err) => {
                      console.log('error', err);
                      return  res.status(500).json(err);
                    });
              break;  
                };
            default:
            //20231216 AB FeatureFlag2 for old cashbox compatibility check new login service for erp_user > 
              const respJson = {
                status: "query failed",
                error: error,
                userName: req.body.username,
                ip: ip,
                user: "user",
                userData: req.userData,
              };
              helpers.serverLog(req.originalUrl, respJson, "error");
              return res.status(500).json({ status: "failed", error });
            };
          });
      // }

	  

 
    // })
    // .catch((error) => {
    //   const respJson = {
    //     status: "failed",
    //     error: error,
    //     user: "cashboxUser4",
    //   };
    //   helpers.serverLog(req.originalUrl, respJson, "error");
    //   return res.status(403).json({ status: "failed", error });
    // });
});

router.post("/revision/signin", (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  req.body.ip = ip;

  // helpers.serverLog(req.originalUrl, req.body);

  knex("erp_users")
    .innerJoin("user2roles", { "erp_users.id": "user2roles.user" })
    .where({ login: req.body.username.toLowerCase(), "user2roles.role": "6" }) // 6 = ревизор
    .select("company", "pass")
    .first()
    .then((user) => {
      if (!helpers.comparePass(req.body.password, user.pass)) {
        const respJson = { status: "failed", error: "wrongPassword" };
        helpers.serverLog(req.originalUrl, respJson, "error");
        return res.status(403).json(respJson);
      } else {
        const accessToken = helpers.accessExternalToken(user);
        const respJson = { status: "success", accessToken, password: null };
        // helpers.serverLog(req.originalUrl, respJson);
        return res.status(200).json(respJson);
      }
    })
    .catch((error) => {
      helpers.serverLog(req.originalUrl, error, "error");
      return res.status(403).json({ status: "failed", error });
    });
});

module.exports = router;
