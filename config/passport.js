const passport = require('passport');
const knex = require('../db/knex');

module.exports = () => {

	passport.serializeUser((user, done) => {
		done(null, user.id);
	});

	passport.deserializeUser((id, done) => {
		knex('erp_users').where({ id }).select('id', 'company').first()
		.then((user) => { done(null, user); })
		.catch((err) => { done(err,null); });
	});
}