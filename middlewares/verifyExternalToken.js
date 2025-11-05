const jwt = require("jsonwebtoken");
const helpers = require("./_helpers");

module.exports = function (req, res, next) {
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
      //console.log("verifyExternal token accessToken:", accessToken);
    let user = jwt.verify(accessToken, process.env.JWT_KEY);
      //console.log("verifyExternal token user:", user);
    user.company = helpers.decrypt(user.company);
      //console.log("verifyExternal token user.company:", user.company);
    req.userData = user;
    next();
  } catch (err) {
    helpers.serverLog(
      "verifyExternalToken error:",
      {
        reqOriginalURL: req.originalUrl,
        Bearer: req.headers.authorization.split(" ")[1]
          ? req.headers.authorization.split(" ")[1]
          : "null",
        body: JSON.stringify(req.body).substr(0,255),
      },
      "error"
    );
    res.status(401).json({
      message: "UNAUTHORIZED",
    });
  }
};
