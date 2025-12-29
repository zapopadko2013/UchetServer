const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const emailRoutes = require('./routes/api/email');
const externalRoutes = require('./routes/external');
const outsideRoutes = require('./routes/outside');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const verifyToken = require('./middlewares/verifyToken');
const verifyExternalToken = require('./middlewares/verifyExternalToken');
//20221212 change server from https to http
//const https = require('https');
const http = require ('http');
const fs = require('fs');
// const helpers = require('./middlewares/_helpers');
const rateLimit = require("express-rate-limit");

/////23.12.2025
//import chatRouter from './routes/chat.route.js'; // Импорт вашего файла
const chatRouter = require('./routes/chat.route.js');
/////23.12.2025

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100// 100 Requests,
  //message: "Too many accounts created from this IP, please try again after an hour"
});

//24.12.2025
//require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();
//24.12.2025

const app = express();
const port = process.env.PORT;




app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(compression());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

//////04.09.2025
const cors = require('cors');
// Настраиваем CORS, чтобы разрешить запросы с вашего фронтенда
// app.use(cors({
//   origin: 'http://localhost:5173', // Замените на реальный URL вашего фронтенда
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization'], // Добавляем разрешенные заголовки
// }));

// Или, для быстрой разработки, можно временно разрешить всё:
app.use(cors()); 
/* const corsOptions = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));  */
//////04.09.2025

/////22.12.2025
app.use('/public', express.static(__dirname + '/public'));


/* const path = require('path');

const appDir = path.dirname(process.execPath);
app.use(
  '/public',
  express.static(path.join(appDir, 'public'))
); */
/////22.12.2025

//////04.09.2025
// app.all('/*', function (req, res, next) {
// 	res.header("Access-Control-Allow-Origin", "*");
// 	res.header("Access-Control-Allow-Headers", "X-Requested-With");
// 	next();
// });
//////04.09.2025

app.use('/auth', authRoutes);
app.use('/outside', apiLimiter, outsideRoutes);
app.use('/external', verifyExternalToken, externalRoutes);

app.use('/api', verifyToken, apiRoutes);
app.use('/mail', emailRoutes);

/////23.12.2025
app.use('/apichat', chatRouter);
/////23.12.2025

//https.createServer({
//	key: fs.readFileSync('./cert/server.key'),
//	cert: fs.readFileSync('./cert/server.cert')
//}, app).listen(port, function () {
//	console.log('Server started on port', port)
//});

http.createServer(app).listen(port, function () {
      console.log('Server started on port', port)
});
