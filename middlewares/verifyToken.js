const jwt = require("jsonwebtoken");
const helpers = require("./_helpers");
const revlist = require("../data/revlist");

module.exports = function (req, res, next) {
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
    //20231101 AB <
    //console.log('verifyToken.js accessToken', accessToken)
    //20231101 AB >
    let user = jwt.verify(accessToken, process.env.JWT_KEY);
    user.id = helpers.decrypt(user.id);
    user.company = helpers.decrypt(user.company);

    //console.log('1');

    /////11.04.2023
    /////18.11.2025
    //user.accesses= helpers.decrypt(user.accesses);
    /////18.11.2025
   //20231101 AB <
    user.locales= helpers.decrypt(user.locales);
    /////18.11.2025
    /*
    user.iin = helpers.decrypt(`${user.iin}`);
    user.name = helpers.decrypt(user.name);
    user.login = helpers.decrypt(user.login);
    user.role = helpers.decrypt(user.role);
	  user.prefix = helpers.decrypt(user.prefix);
	  user.partner_id = helpers.decrypt(user.partner_id);
    */
    /////18.11.2025

    //console.log('2');

    //20231101 AB > 
    //user.roletables= helpers.decrypt(user.roletables);
    //user.role= helpers.decrypt(user.role);
    //20231012 AB signin_new add company info to JWT <

    /////18.11.2025
    /*
    user.company_name = helpers.decrypt(`${user.company_name}`);
    user.company_bin = helpers.decrypt(user.company_bin);
    user.company_address = helpers.decrypt(user.company_address);
    user.company_head = helpers.decrypt(user.company_head);
    user.company_head_iin = helpers.decrypt(user.company_head_iin);
    user.company_accountant = helpers.decrypt(user.company_accountant);
    user.company_accountant_iin = helpers.decrypt(user.company_accountant_iin);
    user.company_id = helpers.decrypt(user.company_id);
    user.company_certificatenum = new Number(helpers.decrypt(user.company_certificatenum));
    user.company_certificateseries = new Number(helpers.decrypt(user.company_certificateseries));
    user.company_certificatedate = new Date(helpers.decrypt(user.company_certificatedate));
    user.company_holding = (helpers.decrypt(user.company_holding) === 'true');
    user.company_holding_parent = helpers.decrypt(user.company_holding_parent);
    user.company_wholesale = (helpers.decrypt(user.company_wholesale) === 'true');
    */
    /////18.11.2025 

    //console.log('3');
    
    // user.company_prefix = helpers.decrypt(user.company_prefix);
    // user.company_partner_id = helpers.decrypt(user.company_partner_id);
    //20231012 AB signin_new add company info to JWT >
    /////27.04.2023
    user.accessToken =accessToken ;

    //console.log('4');
    /////27.04.2023
   //logger.info("user.role- " + user.role);
    /////11.04.2023

    //console.log(user);
    req.userData = user;
    //console.log('verifyToken req', req);
    res.setHeader("x-refresh-token", "");
    next();
  } catch (err) {
    //console.log('Ошибка-', err)
    // console.log('first', err.name)
    try {
      const accessToken = req.headers.authorization.split(" ")[1];
      const { refreshToken } = jwt.decode(accessToken);
      const decryptedRefreshToken = helpers.decrypt(refreshToken);
      const { id } = jwt.verify(decryptedRefreshToken, process.env.JWT_KEY);

      helpers
        .getUserByID(id)
        .then((dbUser) => {
          const accessToken = helpers.accessToken(dbUser);
          // dbUser.id = helpers.decrypt(dbUser.id);
          // dbUser.company = helpers.decrypt(dbUser.company);
          req.userData = dbUser;
          res.setHeader("x-refresh-token", accessToken);
          next();
        })
        .catch((error) => {
          // helpers.serverLog(req.path + '/verifyToken',error,'error')
        });
    } catch (err) {
      if (revlist[req.path]) {
        try {
          let accessToken = req.headers.authorization.split(" ")[1];
          const { refreshToken } = jwt.decode(accessToken);
          const decryptedRefreshToken = helpers.decrypt(refreshToken);
          const refToken = jwt.decode(decryptedRefreshToken);

          const expDate = new Date(refToken.exp * 1000);
          expDate.setMinutes(expDate.getMinutes() + 30);
          if (expDate > new Date()) {
            helpers
              .getUserByID(refToken.id)
              .then((dbUser) => {
                accessToken = helpers.accessToken(dbUser);
                req.userData = dbUser;
                res.setHeader("x-refresh-token", accessToken);
                helpers.serverLog(
                  req.path + " refresh",
                  expDate + " " + dbUser,
                  "success"
                );
                next();
              })
              .catch((error) => {
                 helpers.serverLog(req.path + '/verifyToken1',error,'error')
              });
          } else {
            res.status(401).json({
              message: "UNAUTHORIZED",
            });
          }
        } catch (err) {
           helpers.serverLog(req.path + '/verifyToken2',err,'error')
          res.status(401).json({
            message: "UNAUTHORIZED",
          });
        }
      } else {
         helpers.serverLog(req.path + '/verifyToken3',err,'error')
        res.status(401).json({
          message: "UNAUTHORIZED",
        });
      }
    }
  }
};
