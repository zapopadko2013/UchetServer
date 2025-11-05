let environment = process.env.NODE_ENV || 'dev';
let config = require('../knexfile.js')[environment];
module.exports	= require('knex')(config);