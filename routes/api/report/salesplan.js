const express = require('express');
const knex = require('../../../db/knex');
const helpers = require('../../../middlewares/_helpers');
const moment = require('moment');

const router = new express.Router();

//DAY - расчет суммы бонуса для заданного пользователя по дневному плану продаж
router.get("/daily", (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);  
	knex.raw(`
	  select name, dat, sold, daily, drate, case when award is null then 0 else award end from (
		select u.name, to_char(t.date,'DD.MM.YYYY') as dat, p.daily, p.drate, sum(t.price) as sold, 
		  case when sum(t.price) > p.daily then round(cast(p.drate*sum(t.price)/100 as numeric),2) else '0' end as award
		from transactions t, salesplan p, cashbox_users u
		where t.cashboxuser = ${req.query.cashboxuser}
		  and t.company = ${req.userData.company}
		  and u.id = t.cashboxuser
		  and p.object = t.cashboxuser
		  and p.type = 1
		  and t.date::date between '${dateFrom.format()}' and '${dateTo.format()}'
		group by u.name, dat, p.daily, p.drate
		order by dat desc) t
	`).then((dailybonus) => {
	  return res.status(200).json(dailybonus.rows);
	})
	.catch((err) => {
	  console.log(err);
	  return res.status(500).json(err);
	});
  });
  
  //DAY - расчет общей суммы бонуса за заданный период по всем пользователям по дневному плану продаж 
  router.get("/daily/all", (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	knex.raw(`
	  select name, daily, case when drate is null then 0 else drate end, sold, case when award is null then 0 else award end from(
		select ord.name as name, daily, drate, sum(ord.sold) as sold, sum(ord.award) as award from (
		  select u.name, to_char(t.date,'DD.MM.YYYY') as dat, p.daily, p.drate, sum(t.price) as sold, 
			case when sum(t.price) > p.daily then round(cast(p.drate*sum(t.price)/100 as numeric),2) else '0' end as award
		  from transactions t, cashbox_users u, salesplan p
		  where 
			t.date::date between '${dateFrom.format()}' and '${dateTo.format()}'
			and t.cashboxuser = u.id
			and t.company = ${req.userData.company}
			and p.object = u.id and p.type = 1
		  group by u.name, dat, p.daily, p.drate
		) ord
		group by ord.name, daily, drate
		order by ord.name
	  ) t
	`).then((dailybonus) => {
	  return res.status(200).json(dailybonus.rows);
	})
	.catch((err) => {
	  console.log(err);
	  return res.status(500).json(err);
	});
  });
  
  //MONTH - расчет суммы бонуса для заданного пользователя по месячному плану продаж
  router.get("/monthly", (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);  
	knex.raw(`
	  select dat, sold, monthly, mrate, case when award is null then 0 else award end from (
	  select to_char(t.date,'MM.YYYY') as dat, p.monthly, p.mrate, sum(t.price) as sold, 
		case when sum(t.price) > p.monthly then round(cast(p.mrate*sum(t.price)/100 as numeric),2) else '0' end as award
	  from transactions t, salesplan p
	  where t.cashboxuser = ${req.query.cashboxuser}
		and t.company = ${req.userData.company}
		and p.object = t.cashboxuser
		and p.type = 1
		and t.date::date between '${dateFrom.format()}' and '${dateTo.format()}'
	  group by dat, p.monthly, p.mrate
	  order by dat desc) t   
	`).then((dailybonus) => {
	  return res.status(200).json(dailybonus.rows);
	})
	.catch((err) => {
	  console.log(err);
	  return res.status(500).json(err);
	});
  });
  
  //MONTH - расчет общей суммы бонуса за заданный период по всем пользователям по месячному плану продаж 
  router.get("/monthly/all", (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	knex.raw(`
	  select name, monthly, case when mrate is null then 0 else mrate end, sold, case when award is null then 0 else award end from(
		select ord.name as name, monthly, mrate, sum(ord.sold) as sold, sum(ord.award) as award from (
		  select u.name, to_char(t.date,'MM.YYYY') as dat, p.monthly, p.mrate, sum(t.price) as sold, 
			case when sum(t.price) > p.monthly then round(cast(p.mrate*sum(t.price)/100 as numeric),2) else '0' end as award
		  from transactions t, cashbox_users u, salesplan p
		  where 
			t.date::date between '${dateFrom.format()}' and '${dateTo.format()}'
			and t.cashboxuser = u.id
			and t.company = ${req.userData.company}
			and p.object = u.id and p.type = 1
		  group by u.name, dat, p.monthly, p.mrate
		) ord
		group by ord.name, monthly, mrate
		order by ord.name
	  ) t
	`).then((dailybonus) => {
	  return res.status(200).json(dailybonus.rows);
	})
	.catch((err) => {
	  console.log(err);
	  return res.status(500).json(err);
	});
  });
  
  //QUARTER - расчет суммы бонуса для заданного пользователя по квартальному плану продаж
  router.get("/quarterly", (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);  
	knex.raw(`
	  select dat, sold, quarterly, qrate, case when award is null then 0 else award end from (
	  select to_char(t.date,'MM.YYYY') as dat, p.quarterly, p.qrate, sum(t.price) as sold, 
		case when sum(t.price) > p.quarterly then round(cast(p.qrate*sum(t.price)/100 as numeric),2) else '0' end as award
	  from transactions t, salesplan p
	  where t.cashboxuser = ${req.query.cashboxuser}
		and t.company = ${req.userData.company}
		and p.object = t.cashboxuser
		and p.type = 1
		and t.date::date between '${dateFrom.format()}' and '${dateTo.format()}'
	  group by dat, p.quarterly, p.qrate
	  order by dat desc) t   
	`).then((dailybonus) => {
	  return res.status(200).json(dailybonus.rows);
	})
	.catch((err) => {
	  console.log(err);
	  return res.status(500).json(err);
	});
  });
  
  //QUARTER - расчет общей суммы бонуса за заданный период по всем пользователям по квартальному плану продаж 
  router.get("/quarterly/all", (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	knex.raw(`
	  select name, quarterly, case when qrate is null then 0 else qrate end, sold, case when award is null then 0 else award end from(
		select ord.name as name, quarterly, qrate, sum(ord.sold) as sold, sum(ord.award) as award from (
		  select u.name, to_char(t.date,'MM.YYYY') as dat, p.quarterly, p.qrate, sum(t.price) as sold, 
			case when sum(t.price) > p.quarterly then round(cast(p.qrate*sum(t.price)/100 as numeric),2) else '0' end as award
		  from transactions t, cashbox_users u, salesplan p
		  where 
			t.date::date between '${dateFrom.format()}' and '${dateTo.format()}'
			and t.cashboxuser = u.id
			and t.company = ${req.userData.company}
			and p.object = u.id and p.type = 1
		  group by u.name, dat, p.quarterly, p.qrate
		) ord
		group by ord.name, quarterly, qrate
		order by ord.name
	  ) t
	`).then((dailybonus) => {
	  return res.status(200).json(dailybonus.rows);
	})
	.catch((err) => {
	  console.log(err);
	  return res.status(500).json(err);
	});
  });
  
  //DAY - расчет общей суммы КОМАНДНОГО бонуса за заданный период по ежедневному плану продаж
  //выборка осуществляется из view
  router.get('/team/daily', (req, res) => {
	  const dateFrom = moment(req.query.dateFrom);
	  const dateTo = moment(req.query.dateTo);
	  const point  = req.query.point;
	knex.raw(`
	  select * from team_daily d where
		d.id = ${point}
		and d.dat::date between '${dateFrom.format()}' and '${dateTo.format()}'
		order by d.dat desc
	`).then(team_daily => {
			  return res.status(200).json(team_daily.rows);
		  }).catch((err) => {
			  console.log(err)
			  return res.status(500).json(err);
		  });
  });
  
  //MONTH - расчет общей суммы КОМАНДНОГО бонуса за заданный период по месячному плану продаж
  //выборка осуществляется из view, важно dateFrom - необходимо передавать первое число месяца.
  router.get('/team/monthly', (req, res) => {
	  const dateFrom = moment(req.query.dateFrom);
	  const dateTo = moment(req.query.dateTo);
	  const point  = req.query.point;
	  knex.raw(`
	  select * from team_monthly m where
		m.id = ${point}
		and m.dat::date between '${dateFrom.format()}' and '${dateTo.format()}'
		order by m.dat desc
	`).then(team_monthly => {
			  return res.status(200).json(team_monthly.rows);
		  }).catch((err) => {
			  console.log(err)
			  return res.status(500).json(err);
		  });
  });
  
  //QUARTER - расчет общей суммы КОМАНДНОГО бонуса за заданный период по квартальному плану продаж
  //выборка осуществляется из view, важно dateFrom - необходимо передавать первое число месяца.
  router.get('/team/quarterly', (req, res) => {
	  const dateFrom = moment(req.query.dateFrom);
	  const dateTo = moment(req.query.dateTo);
	  const point  = req.query.point;
	  knex.raw(`
	  select * from team_quarterly q where
		q.id = ${point}
		and q.dat::date between '${dateFrom.format()}' and '${dateTo.format()}'
		order by q.dat desc
	`).then(team_monthly => {
			  return res.status(200).json(team_monthly.rows);
		  }).catch((err) => {
			  console.log(err)
			  return res.status(500).json(err);
		  });
  });
// select to_char(t.date,'DD.MM.YYYY') as dat, sum(t.price) as sold, case when sum(t.price) > p.daily then round(cast(2*sum(t.price)/100 as numeric),2) else '0' end as award
// from transactions t
// left join cashbox_users u on (t.cashboxuser = u.id)
// left join salesplan p on (p.object = u.id and p.type = 1)
// where t.cashboxuser = 83
// and t.date::date between to_date('19.12.2018','DD.MM.YYYY') and to_date('24.12.2018','DD.MM.YYYY')
// group by dat, p.daily
// order by dat desc;

/*router.get('/daily', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	
	// Для ИП "Сандалова" сделали 3% (в качестве акта доброй воли)
	knex('transactions')
		.leftJoin('cashbox_users', 'transactions.cashboxuser', 'cashbox_users.id')
		.leftJoin('salesplan', 'salesplan.object', 'cashbox_users.id')
		.where({ 'transactions.cashboxuser': req.query.cashboxuser, 'salesplan.type ': 1, 'transactions.company': req.userData.company })
		.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
		.select('cashbox_users.id', 'cashbox_users.name', 'salesplan.daily',
			knex.raw(`to_char(transactions.date,'DD.MM.YYYY') as dat`),
			knex.raw(`case transactions.company when 147 then
						case when sum(transactions.price) > salesplan.daily then round(cast(3*sum(transactions.price)/100 as numeric),2) else '0' end
					  else
						case when sum(transactions.price) > salesplan.daily then round(cast(2*sum(transactions.price)/100 as numeric),2) else '0' end 
					  end as award`))
		.sum('transactions.price as sold')
		.groupBy('dat', 'salesplan.daily', 'cashbox_users.id', 'cashbox_users.name', 'transactions.company')
		.orderBy('dat', 'desc')
		.then(dailybonus => {
			return res.status(200).json(dailybonus);
		}).catch((err) => {
			console.log(err)
			return res.status(500).json(err);
		});
});

// select ord.name, sum(ord.sold), sum(ord.award)
// from (
// select to_char(t.date,'DD.MM.YYYY') as dat, u.name, 
// sum(t.price) as sold, case when sum(t.price) > p.daily then round(cast(1*sum(t.price)/100 as numeric),2) else '0' end as award
// from transactions t
// left join cashbox_users u on (t.cashboxuser = u.id)
// left join salesplan p on (p.object = u.id and p.type = 1)
// where t.date::date between to_date('19.12.2018','DD.MM.YYYY') and to_date('24.12.2018','DD.MM.YYYY')
// group by dat, u.name, p.daily
// ) ord
// group by ord.name
// order by ord.name

router.get('/daily/all', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	
	// Для ИП "Сандалова" сделали 3% (в качестве акта доброй воли)
	knex.select('ord.name', 'ord.daily')
		.sum('ord.sold as sold')
		.sum('ord.award as award')
		.from(function () {
			this.select('cashbox_users.id', 'cashbox_users.name', 'salesplan.daily',
				knex.raw(`to_char(transactions.date,'DD.MM.YYYY') as dat`),
				knex.raw(`case transactions.company when 147 then
							case when sum(transactions.price) > salesplan.daily then round(cast(3*sum(transactions.price)/100 as numeric),2) else '0' end
						  else 
							case when sum(transactions.price) > salesplan.daily then round(cast(2*sum(transactions.price)/100 as numeric),2) else '0' end 
						  end as award`))
				.sum('transactions.price as sold')
				.from('transactions')
				.leftJoin('cashbox_users', 'transactions.cashboxuser', 'cashbox_users.id')
				.leftJoin('points', {'points.id': 'cashbox_users.point', 'points.company': 'transactions.company'})
				.leftJoin('salesplan', 'salesplan.object', 'cashbox_users.id')
				.where({ 'salesplan.type ': 1, 'transactions.company': req.userData.company })
				.andWhereBetween(knex.raw('transactions.date::date'), [dateFrom.format(), dateTo.format()])
				.groupBy('dat', 'salesplan.daily', 'cashbox_users.id', 'cashbox_users.name', 'transactions.company')
				.orderBy('cashbox_users.name')
				.as('ord')
		})
		.groupBy('ord.name', 'ord.daily')
		.orderBy('ord.name')
		.then(dailybonus => {
			return res.status(200).json(dailybonus);
		}).catch((err) => {
			console.log(err)
			return res.status(500).json(err);
		});
});

// view group_bonus
router.get('/team/daily', (req, res) => {
	const dateFrom = moment(req.query.dateFrom);
	const dateTo = moment(req.query.dateTo);
	const point  = req.query.point;

	knex('group_bonus')
		.where({ 'group_bonus.id': point })
		.andWhereBetween(knex.raw('group_bonus.dat::date'), [dateFrom.format(), dateTo.format()])
		.select()
		.then(dailybonus => {
			return res.status(200).json(dailybonus);
		}).catch((err) => {
			console.log(err)
			return res.status(500).json(err);
		});
});*/


module.exports = router;