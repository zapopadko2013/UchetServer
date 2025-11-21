const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const helpers = require("../middlewares/_helpers");
const knex = require("../db/knex");
const init = require("./passport");
// const jwt = require("jsonwebtoken");
//const jwt = require('jsonwebtoken');
var fs = require("fs");

const logger = require("../auth/logger").Logger;

init();

let attempts = {};

fs.readFile("./auth/error-attempts", "utf-8", (err, data) => {
  if (err) helpers.serverLog("local-passport/use", "error read file " + err, "error");
  try {
    attempts = JSON.parse(data);
  } catch (e) {
    helpers.serverLog("local-passport/use", "error parse attempts file " + e, "error");
  }
});

const writeToFile = (data) => {
  fs.writeFile("./auth/error-attempts", data, (err) => {
    if (err)
      helpers.serverLog("local-passport/use", "error saving attempts " + err, "error");
  });
};

const banAttemptsCount = 5;
const banTimeSecs = 30 * 10;

passport.use(
  "local",
  new LocalStrategy((username, password, done) => {
    fs.readFile("./auth/error-attempts", "utf-8", (err, data) => {
      if (err) helpers.serverLog("local-passport/use", "error read file " + err, "error");
      try {
        attempts = JSON.parse(data);
      } catch (e) {
        helpers.serverLog("local-passport/use", "error parse attempts file " + e, "error");
      }
    });

    if (attempts[username] && attempts[username].date > new Date().getTime())
      return done(null, { login: username, status: "BLOCKED" });

    knex("erp_users")
      .where({ login: username.toLowerCase() })
      .innerJoin("companies", "erp_users.company", "companies.id")
	  
	  ////03.10.2023
	  .leftJoin("locales", "locales.company", "companies.id")
	  ////03.10.2023
	  
      .leftJoin("user2roles", function () {
        this.on("user2roles.user", "=", "erp_users.id").onIn(
          "user2roles.role",
          ["0"]
        );
      })
      .select(
        "erp_users.id",
        "erp_users.company",
        "erp_users.pass",
        "erp_users.status as user_status",
        "companies.status",
        "companies.isactivate",
        "user2roles.role"
		////03.10.2023
		,"locales.locales"
		////03.10.2023
      )
      //.select('erp_users.id', 'erp_users.company', 'erp_users.pass', 'companies.status', 'companies.isactivate')
      //.select('id', 'company', 'pass')
      .first()
      .then((user) => {
        if (!user) {
          logger.info("user - " + username + " error - NoUserFound");
          return done(null, false);
        }

        if (!helpers.comparePass(password, user.pass)) {
          logger.info("user - " + username + " error - WrongPassword");

          if (attempts[username]) {
            if (attempts[username].attempts + 1 >= banAttemptsCount) {
              attempts[username].attempts += 1;
              attempts[username].date =
                new Date().getTime() + banTimeSecs * 1000;
            } else {
              attempts[username].attempts += 1;
            }
          } else {
            attempts[username] = { attempts: 1, date: new Date().getTime() };
            console.log("no user name", attempts);
          }

          writeToFile(JSON.stringify(attempts));

          return done(null, false);
        } else {
          if (attempts[username]) {
            attempts[username] = { attempts: 0, date: new Date().getTime() };
            writeToFile(JSON.stringify(attempts));
          }

          user.login = username;
          return done(null, user);
        }
      })
      .catch((err) => {
        logger.info("user - " + username + " error - " + err);
        return done(err);
      });
  })
);

signin = (req, res, next) => {

  ///
  //console.log(`Попал сюда`);
  ////

  passport.authenticate("local", { session: false }, function (err, user) {
    // console.log(object);
    ///
  //console.log(`1`);
  ////
    if (err) {
      helpers.handleResponse(res, "400", err);
      return;
    }
    if (!user) {
      helpers.handleResponse(res, "400", "UserNotFound");
      return;
    }

    if (user.status !== "ACTIVE" || user.user_status !== "ACTIVE") {
      if (user.status === "BLOCKED") {
        return res
          .status(400)
          .json({ status: "BLOCKED", time: attempts[user.login].date });
      }
      helpers.handleResponse(res, "400", "UserNotActive");
      return;
    }

    req.logIn(user, { session: false }, function (err) {
      if (err) {
        logger.info("user - " + user.login + " error - " + err);
        helpers.handleResponse(res, "400", err);
        return;
      }
      const accessToken = helpers.accessToken(user);
      return res
        .status(200)
        .json({ status: "success", accessToken, role: user.role ? 1 : 0 });
      //return res.status(200).json({ status: 'success', accessToken });
    });
  })(req, res, next);
};

passport.use(
  "revision",
  new LocalStrategy((username, password, done) => {
    knex("erp_users")
      .where({ login: username.toLowerCase() })
      .innerJoin("companies", "erp_users.company", "companies.id")
      .innerJoin("user2roles", "user2roles.user", "erp_users.id")
      .where({ "user2roles.role": "6" })
      .select(
        "erp_users.id",
        "erp_users.company",
        "erp_users.pass",
        "companies.status",
        "companies.isactivate"
      )
      .first()
      .then((user) => {
        if (!user) {
          return done(null, false);
        }
        if (!helpers.comparePass(password, user.pass)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      })
      .catch((err) => {
        return done(err);
      });
  })
);

//авторизация для ревизора
revsignin = (req, res, next) => {
  passport.authenticate(
    "revision",
    { session: false },
    function (err, user, info) {
      if (err) {
        helpers.handleResponse(res, "400", err);
        return;
      }

      if (!user) {
        helpers.handleResponse(res, "400", "UserNotFound");
        return;
      }

      if (user.status !== "ACTIVE") {
        helpers.handleResponse(res, "400", "UserNotActive");
        return;
      }

      req.logIn(user, { session: false }, function (err) {
        if (err) {
          helpers.handleResponse(res, "400", err);
          return;
        }
        //			const accessToken = helpers.accessRevisionToken(user)
        const accessToken = helpers.accessToken(user);
        return res.status(200).json({ status: "success", accessToken });
      });
    }
  )(req, res, next);
};

signup = (req, res) => {

  //console.log('signup');
  //console.log(req.body);
  
  helpers
    .createUser(req, res)
    .then((signupres) => {
      signupres = signupres.rows[0].first_registration;
      res.status(signupres.code == "success" ? 200 : 400).json(signupres);
      return;
    })
    .catch((err) => {
      res.status(400).json({
        status: "error",
        text: "Ошибка при регистрации!",
        error_msg: err,
      });
      return;
    });
};

module.exports = {
  signin,
  signup,
};
