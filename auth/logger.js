const fs = require("fs");
const moment = require("moment");

const Logger = (exports.Logger = {});

const date = moment().format("DD.MM.YYYY HH:mm:ss");
const stream = fs.createWriteStream("./auth/auth-error.log",{
        flags: 'a'
});

Logger.info = function(msg) {
  const date = moment().format("DD.MM.YYYY HH:mm:ss");
  const message = date + " : " + msg + "\n";
  stream.write(message);
};
