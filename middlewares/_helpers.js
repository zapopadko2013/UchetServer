const bcrypt = require("bcryptjs");
const knex = require("../db/knex");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const moment = require("moment");

encrypt = (str) => {
  const key = CryptoJS.lib.WordArray.create(process.env.SECRET);
  // console.log(key)

  const iv = CryptoJS.lib.WordArray.create(process.env.IV);
  // console.log(iv)
  return CryptoJS.AES.encrypt(str, key, { iv }).toString();
};

decrypt = (str) => {
  const key = CryptoJS.lib.WordArray.create(process.env.SECRET);
  const iv = CryptoJS.lib.WordArray.create(process.env.IV);
  try{
    // let bytes = CryptoJS.AES.decrypt(str, key, { iv });
    let bytes = CryptoJS.AES.decrypt({ciphertext: CryptoJS.enc.Base64.parse(str)}, key, { iv });
    if ((process.env.LOG_LEVEL || 1) >= 3) {
      console.log("\n \n_helpers.js decrypt ===========================");
      console.log('_helpers.js decrypt str' , str);
      console.log('_helpers.js decrypt key' , key);
      console.log('_helpers.js decrypt iv' , iv);
      console.log('_helpers.js decrypt typeof(str)' , typeof(str));
      console.log('_helpers.js decrypt str.valueOf()' , str.valueOf());
      console.log('_helpers.js decrypt bytes.toString()' , bytes.toString());
		  console.log('_helpers.js decrypt bytes.toString(CryptoJS.enc.Utf8)' , bytes.toString(CryptoJS.enc.Utf8));
	  }
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.log ('_helpers.js decrypt err', err)
  }

};

strBetween = (str, from, to) => {
  return str.substring(str.lastIndexOf(from) + 1, str.lastIndexOf(to));
};

strBefore = (str, chr) => {
  return str.substring(0, str.lastIndexOf(chr));
};

strAfter = (str, chr) => {
  return str.substring(str.lastIndexOf(chr) + 1);
};

accessToken = (user) => {
	
  let accessTokenUser = {};
  accessTokenUser.id = encrypt(user.id);
  accessTokenUser.company = encrypt(user.company);
  
  ////03.10.2023 
   accessTokenUser.locales = encrypt( JSON.stringify(user.locales));	
  ////03.10.2023
  
  ////16.01.2026
  /*
  accessTokenUser.refreshToken = encrypt(
    jwt.sign({ id: user.id }, process.env.JWT_KEY, { expiresIn: "2h" })
  );
  return jwt.sign(accessTokenUser, process.env.JWT_KEY, {
    expiresIn: "2h",
  });
  */

  accessTokenUser.refreshToken = encrypt(
    jwt.sign({ id: user.id }, process.env.JWT_KEY, { expiresIn: "14h" })
  );
  return jwt.sign(accessTokenUser, process.env.JWT_KEY, {
    expiresIn: "14h",
  });

  ////16.01.2026
};
/*
accessRevisionToken = user => {
  let accessTokenUser = {};
  accessTokenUser.id = encrypt(user.id);
  accessTokenUser.company = encrypt(user.company);
  accessTokenUser.refreshToken = encrypt(
    jwt.sign({ id: user.id }, process.env.JWT_KEY, { expiresIn: 60 * 60 * 24 })
  );
  return jwt.sign(accessTokenUser, process.env.JWT_KEY, { expiresIn: 60 * 5 });
};
*/
accessExternalToken = (user) => {
  let accessTokenUserExternal = {};
  //console.log("generate new access token:", user.company);
  accessTokenUserExternal.company = encrypt(user.company);
  return jwt.sign(accessTokenUserExternal, process.env.JWT_KEY, {
    expiresIn: "72h",
  });
};
//expiresIn: 60 * 60 * 30,
getUserByID = (id) => {
  return knex("erp_users")
    .where({ id, status: "ACTIVE" })
    .select("id", "company")
    .first();
};

handleResponse = (res, code, statusMsg) => {
  res.status(code).json({ status: statusMsg });
};

comparePass = (userPassword, databasePassword) => {
  return bcrypt.compareSync(userPassword, databasePassword);
};

createUser = (req) => {
  const salt = bcrypt.genSaltSync();

//  console.log(req.body);

  let request = {
    login: req.body.user_login,
    name: encrypt(req.body.user_fullname),
    pass: bcrypt.hashSync(req.body.user_password, salt),
    iin: encrypt(req.body.user_iin),
    company: {
      name: encrypt(req.body.company_fullname),
      bin: encrypt(req.body.company_bin),
      address: encrypt(req.body.company_juraddress),
      head: encrypt(req.body.company_head),
      head_iin: encrypt(req.body.company_head_iin),
      accountant: encrypt(req.body.company_accountant),
      accountant_iin: encrypt(req.body.company_accountant_iin),
      certificatenum: req.body.company_register_number,
      certificateseries: req.body.company_has_nds,
      certificatedate: req.body.company_nds_date,
	  ////06.02.2023
	  partner_id: req.body.partner_id,
	  ////06.02.2023
	  
	  ////09.10.2023
	  country: typeof req.body.country !== "undefined" && req.body.country !== null ? req.body.country : "-1",
	  ////09.10.2023
	  
    },
  };
  
  //console.log(request);

  return knex.raw("select first_registration(?)", [request]);
};

externalPasswordExpired = (password) => {
  try {
    const passwordDateSeconds = decrypt(password);
    let passwordDate = new Date(+passwordDateSeconds);
    let today = new Date();    
    return passwordDate.getTime() < today.getTime();
  } catch (err) {
    console.log('_helpers.js externalPasswordExpired', err);
    return false;
  }
};

//20231215 AB verify external pass <
verifyExternalPassword = (password) => {
  try {
    const passwordDateSeconds = decrypt(password);
    let passwordDate = new Date(+passwordDateSeconds);
    let today = new Date();
    let dayLater = new Date(today.setDate(today.getDate() + 1));
    let startdate = new Date("2023-01-01");
    return ((passwordDate.getTime() > startdate) && (passwordDate.getTime() <= dayLater.getTime()));
  } catch (err) {
    console.log('_helpers.js verifyExternalPassword', err);
    return false;
  }
};
//20231215 AB verify external pass >


newPointPassword = () => {
  let today = new Date();
  //20231215 AB fix error in date setting <
  // let monthLater = today.setMinutes(today.getDay() + 1);
  let dayLater = today.setDate(today.getDate() + 1);
  //20231215 AB fix error in date setting >
  // let monthLater = today.setMonth(today.getMonth() + 1);
  return encrypt(dayLater.toString());
};

telegramSend = (text) => {
  axios
    .get(
      "https://api.telegram.org/bot1098314849:AAHgqEZDmXNjI_b3W9jkIgmLOxItR5E-KUA/sendMessage",
      {
        params: {
          chat_id: "-1001285644054",
          text,
        },
      }
    )
    .then()
    .catch();
};

simpleLog = (file, method, content) => {
  const date = moment().format("DD.MM.YYYY HH:mm:ss");
  console.log(
    date,
    file,
    method,
    content ? JSON.stringify(content) : "",
    "\x1b[0m"
  );
};


log = (req, res, func, ip) => {
  if (req === null || res === null || func === null) return;
  /*knex.raw("select logging(?, ?, ?, ?)", [req, res, func, ip])
    .then()
    .catch((err) => console.log(err));*/
  if (JSON.stringify(res).includes("error"))
    ////30.09.2025
    /* telegramSend(
      JSON.stringify(req) + "\n" + JSON.stringify(res) + "\n" + func
    ); */
    ////30.09.2025
  return;
};

serverLog = (method, content, type, revisionInfo) => {
  const date = moment().format("DD.MM.YYYY HH:mm:ss");
  const color =
    type && type.includes("error")
      ? "\x1b[31m"
      : type && type.includes("success")
      ? "\x1b[32m"
      : "\x1b[34m";
  console.log(
    color,
    date,
    method,
    content ? JSON.stringify(content) : "",
    "\x1b[0m"
  );
  if ((type && type.includes("error")) || type === "revision") {
    let text = date + "\n" + method;
    if (content)
      text +=
        "\n" +
        JSON.stringify(content) +
        (revisionInfo ? JSON.stringify(revisionInfo) : "");
        ////30.09.2025
   // telegramSend(text);
   ////30.09.2025
  }
};

number_to_string = (_number, type) => {
  var _arr_numbers = new Array();
  _arr_numbers[1] = new Array(
    "",
    "один",
    "два",
    "три",
    "четыре",
    "пять",
    "шесть",
    "семь",
    "восемь",
    "девять",
    "десять",
    "одиннадцать",
    "двенадцать",
    "тринадцать",
    "четырнадцать",
    "пятнадцать",
    "шестнадцать",
    "семнадцать",
    "восемнадцать",
    "девятнадцать"
  );
  _arr_numbers[2] = new Array(
    "",
    "",
    "двадцать",
    "тридцать",
    "сорок",
    "пятьдесят",
    "шестьдесят",
    "семьдесят",
    "восемьдесят",
    "девяносто"
  );
  _arr_numbers[3] = new Array(
    "",
    "сто",
    "двести",
    "триста",
    "четыреста",
    "пятьсот",
    "шестьсот",
    "семьсот",
    "восемьсот",
    "девятьсот"
  );
  function number_parser(_num, _desc) {
    var _string = "";
    var _num_hundred = "";
    if (_num.length == 3) {
      _num_hundred = _num.substr(0, 1);
      _num = _num.substr(1, 3);
      _string = _arr_numbers[3][_num_hundred] + " ";
    }
    if (_num < 20) _string += _arr_numbers[1][parseFloat(_num)] + " ";
    else {
      var _first_num = _num.substr(0, 1);
      var _second_num = _num.substr(1, 2);
      _string +=
        _arr_numbers[2][_first_num] + " " + _arr_numbers[1][_second_num] + " ";
    }
    switch (_desc) {
      case 0:
        if (type === "money") _string += "тенге";
        break;
      case 1:
        var _last_num = parseFloat(_num.substr(-1));
        if (_last_num == 1) _string += "тысяча ";
        else if (_last_num > 1 && _last_num < 5) _string += "тысячи ";
        else _string += "тысяч ";
        _string = _string.replace("один ", "одна ");
        _string = _string.replace("два ", "две ");
        break;
      case 2:
        var _last_num = parseFloat(_num.substr(-1));
        if (_last_num == 1) _string += "миллион ";
        else if (_last_num > 1 && _last_num < 5) _string += "миллиона ";
        else _string += "миллионов ";
        break;
      case 3:
        var _last_num = parseFloat(_num.substr(-1));
        if (_last_num == 1) _string += "миллиард ";
        else if (_last_num > 1 && _last_num < 5) _string += "миллиарда ";
        else _string += "миллиардов ";
        break;
    }
    _string = _string.replace("  ", " ");
    return _string;
  }
  function decimals_parser(_num) {
    var _first_num = _num.substr(0, 1);
    var _second_num = parseFloat(_num.substr(1, 2));
    var _string = " " + _first_num + _second_num;
    _string += " тиын";
    return _string;
  }
  if (!_number || _number == 0) return false;
  if (typeof _number !== "number") {
    _number = _number.replace(",", ".");
    _number = parseFloat(_number);
    if (isNaN(_number)) return false;
  }
  _number = _number.toFixed(2);
  if (_number.indexOf(".") != -1) {
    var _number_arr = _number.split(".");
    var _number = _number_arr[0];
    var _number_decimals = _number_arr[1];
  }
  var _number_length = _number.length;
  var _string = "";
  var _num_parser = "";
  var _count = 0;
  for (var _p = _number_length - 1; _p >= 0; _p--) {
    var _num_digit = _number.substr(_p, 1);
    _num_parser = _num_digit + _num_parser;
    if (
      (_num_parser.length == 3 || _p == 0) &&
      !isNaN(parseFloat(_num_parser))
    ) {
      _string = number_parser(_num_parser, _count) + _string;
      _num_parser = "";
      _count++;
    }
  }
  if (_number_decimals && type === "money")
    _string += decimals_parser(_number_decimals);
  return _string;
};

createPoint = async (req, res) => {
  if ((process.env.LOG_LEVEL || 1) >= 1) {
    console.log("\n \n_helpers.js createPoint ===========================");
    console.log('_helpers.js createPoint req.body' , JSON.stringify(req.body));
  };
  req.body.point_type = (req.body.point_type || 2);
  let encname = encrypt(req.body.name).trim();
  let encaddr = encrypt(req.body.address).trim();

  await knex.raw(`
    select count(id) from public.points where company=${req.body.company} and name='${encname}';
  `)
  .then(async (result) => {
    if(result.rows[0].count > 0) {
      return res.status(400).json({"code":"error","text":"Точка с таким названием уже существует в рамках вашей компании!"});
    } else {
      await knex
      .raw(
        `insert into points(name, address, company, is_minus, point_type, status, consignment, ftptransfer)
        values('${encname}', '${encaddr}', '${req.body.company || req.userData.company}', ${
        req.body.is_minus === "1" ? true : false
        },  ${req.body.point_type}, 'ACTIVE', false, false) returning id;`
      )
      // .returning('id')
      .then(async (result) => {
      //create point type 1
      if(req.body.point_type == 2) {
        await knex
          .raw(
            `insert into points(name, address, company, is_minus, point_type, status, consignment, ftptransfer)
            values(
              'Склад точки "${encname}"', 
              '${encaddr}', 
              '${req.body.company || req.userData.company}', 
              ${req.body.is_minus === "1" ? true : false},  
              1, 
              'ACTIVE', 
              false, 
              false
            ) returning id;`
          )
          // .returning('id')
          .then((stock) => {
            knex("pointset")
              .insert({
                "point": result.rows[0].id,
                "stock": stock.rows[0].id,
              })
              .then(() =>{
                return res.status(200).json({
                  "success": true,
                  "text": ""
                })
              })
          })
          .catch((err) => {
            res.status(500).json({"code": "error", "text": err})
          })
      }

  })
  .catch((err) => {
    error: err.message;
  });
  };
});
};

diagDbError = ((err, res) => {
  console.log(`_helpers.js diagDbError: ${err}`);
  switch (err.constraint) {
    case 'debtors_tel_idx':
      return res.status(400).json({ 'code': 'error', 'text': 'Клиент с таким телефоном уже зарегистрирован в системе!' });
      break;
    case 'customers_bin_idx':
      return res.status(400).json({ 'code': 'error', 'text': 'Клиент с таким БИН уже зарегистрирован в системе!' });
      break;
    case 'customers_name_idx':
      return res.status(400).json({ 'code': 'error', 'text': 'Клиент с таким названием уже зарегистрирован в системе!' });
      break;
    case 'company_bin_idx':
      return res.status(400).json({ 'code': 'error', 'text': 'Компания с таким БИН уже зарегистрирована в системе!' });
      break;
    case 'erpusr_iin_idx':
      return res.status(400).json({ 'code': 'error', 'text': 'Пользователь с таким ИИН уже существует в системе!' });
      break;
    case 'erpusr_log_idx':
      return res.status(400).json({ 'code': 'error', 'text': 'Пользователь с таким логином уже существует в системе!' });
      break;
    case 'erpusr_comp_idx':
      return res.status(400).json({ 'code': 'error', 'text': 'Пользователь с таким логином уже существует в в компании!', 'detail': err.detail });
      break;
    default:
      return res.status(500).json({ 'code': "error", 'text': "Ошибка !", 'error_msg': err });
  }
  return err;
});

module.exports = {
  encrypt,
  decrypt,
  strBetween,
  strBefore,
  strAfter,
  accessToken,
  accessExternalToken,
  //accessRevisionToken,
  getUserByID,
  handleResponse,
  comparePass,
  createUser,
  externalPasswordExpired,
  newPointPassword,
  log,
  simpleLog,
  serverLog,
  number_to_string,
  //20231215 AB verify external pass <
  verifyExternalPassword,
  createPoint,
  //20231215 AB verify external pass >
  diagDbError,
};
