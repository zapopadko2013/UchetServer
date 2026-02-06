const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.get('/', (req, res) => {
	
	const company = req.userData.company;
	
    knex('points')
		//.leftJoin('cashboxes', 'cashboxes.point', 'points.id')
		//.leftJoin('transactions', 'transactions.cashbox', 'cashboxes.id')
		.leftJoin('salesplan', {'salesplan.object': 'points.id', 'salesplan.type': 3})
		.select('points.name', 
			knex.raw(`array(select json_build_object(to_char(t.date,'MM-YYYY'),sum(t.price)::text)   
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = points.company) 
							where t.date between DATE_TRUNC('month',current_date - interval '13 month') and current_date+1
								and c.point = points.id 
									group by c.point, to_char(t.date,'MM-YYYY') order by to_date(to_char(t.date,'MM-YYYY'),'MM-YYYY')) as trans`),
									//order by to_char(t.date,'MM-YYYY')) as trans`),
			knex.raw(`coalesce(salesplan.monthly,0) as plan`),
			knex.raw(`array(select to_char(generate_series(current_date - interval '13 month' - interval '1 day', current_date - interval '1 day', '1 month'::interval)::date,'MM-YYYY')) as mlist`))
		.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
		//.andWhereBetween(knex.raw('transactions.date::date'), [knex.raw("current_date - interval '2 month'"), knex.raw("current_date")])
		//.groupBy('points.name',knex.raw("to_char(transactions.date,'MM')"),'salesplan.monthly')
		//.orderBy(knex.raw("to_char(transactions.date,'MM')"))
		.then(graph => {
			graph.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

router.get('/avgticket', (req, res) => {
	
	const company = req.userData.company;
	
    knex('points')
		.select('points.name', 
			knex.raw(`array(select json_build_object(to_char(t.date,'DD.MM'),sum(t.price)::text,'count',count(t.price)::text)   
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = points.company) 
							where t.date between current_date - interval '11 month' and current_date+1
								and c.point = points.id 
									group by c.point, to_char(t.date,'DD.MM') order by to_date(to_char(t.date,'DD.MM'),'DD.MM')) as trans`),
			knex.raw(`array(select to_char(generate_series(current_date - interval '11 month', current_date - 1, '1 day'::interval)::date,'DD.MM')) as mlist`))
		.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
		.then(graph => {
			graph.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

router.get('/countticket', (req, res) => {
	
	const company = req.userData.company;
	
    knex('points')
		.select('points.name', 
			knex.raw(`array(select json_build_object(to_char(t.date,'DD.MM'),count(t.price)::text)   
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = points.company) 
							where t.date between current_date - interval '11 month' and current_date+1
								and c.point = points.id 
									group by c.point, to_char(t.date,'DD.MM') order by to_date(to_char(t.date,'DD.MM'),'DD.MM')) as trans`),
			knex.raw(`array(select to_char(generate_series(current_date - interval '11 month', current_date - 1, '1 day'::interval)::date,'DD.MM')) as mlist`))
		.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
		.then(graph => {
			graph.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

router.get('/avgsumweek', (req, res) => {
	
	const company = req.userData.company;
	
    //knex('points')
	//	.select('points.name', 
	//		knex.raw(`array(select json_build_object(to_char(date_trunc('day', date::date),'DD.MM'), sum(t.price))  
	//							from cashboxes c
	//								left join transactions t on (c.id = t.cashbox) 
	//									where t.date between date_trunc('week', current_date - interval '2 month') and date_trunc('week',current_date)
	//										and c.point = points.id 
	//											group by c.point, date_trunc('day', date::date) order by date_trunc('day', date::date)) as trans`),
	//		knex.raw(`array(select to_char(generate_series(date_trunc('week',current_date - interval '2 month'), date_trunc('week',current_date) - interval '1 day', '1 day'::interval)::date,'DD.MM')) as mlist`))
	//	.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
	//	.then(graph => {
	//		graph.forEach(graphey => {
	//			graphey.name = helpers.decrypt(graphey.name);
	//		});
	//		return res.status(200).json(graph);
	//	}).catch((err) => {
	//		return res.status(500).json(err.stack);
	//	});
	
	knex('points')
		.leftJoin('salesplan', {'salesplan.object': 'points.id', 'salesplan.type': 3})
		.select('points.name', 
			knex.raw(`array(select json_build_object(to_char(t.date,'MM-YYYY'),sum(t.price)::text)   
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = points.company) 
							where t.date between DATE_TRUNC('month',current_date - interval '13 month') and current_date+1 
								and c.point = points.id 
									group by c.point, to_char(t.date,'MM-YYYY') order by to_date(to_char(t.date,'MM-YYYY'),'MM-YYYY')) as trans`),
									//order by to_char(t.date,'MM-YYYY')) as trans`),
			knex.raw(`coalesce(salesplan.monthly,0) as plan`),
			knex.raw(`array(select to_char(generate_series(current_date - interval '13 month' - interval '1 day', current_date - interval '1 day', '1 month'::interval)::date,'MM-YYYY')) as mlist`))
		.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
		.then(graph => {
			graph.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

router.get('/avgticketmonth', (req, res) => {
	
	const company = req.userData.company;
	
    knex('points')
		.select('points.name', 
			knex.raw(`array(select json_build_object(to_char(t.date,'MM-YYYY'),avg(t.price)::text)   
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = points.company) 
							where t.date between current_date - interval '13 month' and current_date+1
								and c.point = points.id 
									group by c.point, to_char(t.date,'MM-YYYY') order by to_date(to_char(t.date,'MM-YYYY'),'MM-YYYY')) as trans`),
			knex.raw(`array(select to_char(generate_series(current_date - interval '13 month' - interval '1 day', current_date - interval '1 day', '1 month'::interval)::date,'MM-YYYY')) as mlist`))
		.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
		.then(graph => {
			graph.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

router.get('/countticketmonth', (req, res) => {
	
	const company = req.userData.company;
	
    knex('points')
		.select('points.name', 
			knex.raw(`array(select json_build_object(to_char(t.date,'MM-YYYY'),count(t.price)::text)   
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = points.company) 
							where t.date between current_date - interval '13 month' and current_date+1
								and c.point = points.id 
									group by c.point, to_char(t.date,'MM-YYYY') order by to_date(to_char(t.date,'MM-YYYY'),'MM-YYYY')) as trans`),
			knex.raw(`array(select to_char(generate_series(current_date - interval '13 month' - interval '1 day', current_date - interval '1 day', '1 month'::interval)::date,'MM-YYYY')) as mlist`))
		.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
		.then(graph => {
			graph.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

router.get('/dailysales', (req, res) => {
	
	const company = req.userData.company;
	
    knex('points')
		.select('points.name', 
			knex.raw(`array(select json_build_object(to_char(t.date,'DD.MM'),sum(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = points.company) 
							where t.date >= current_date - interval '14 day'
								and c.point = points.id 
									group by c.point, to_char(t.date,'DD.MM') order by to_date(to_char(t.date,'DD.MM'),'DD.MM')) as trans`),
			knex.raw(`array(select to_char(generate_series(current_date - interval '14 day', current_date /*- 1*/, '1 day'::interval)::date,'DD.MM')) as mlist`))		
		.where({ 'points.status': 'ACTIVE', 'points.company': company, 'points.point_type': '2' })
		.then(graph => {
			graph.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph);
		}).catch((err) => {
			console.log(err);
			return res.status(500).json(err.stack);
		});
});

// Сумма продаж по точкам за 14 недель
router.get('/weeks', (req, res) => { 
	
	const company = req.userData.company;
	
	knex.raw(`select 
	po.name 
	,coalesce(s.monthly,0) as plan,
	array(select json_build_object(to_char(t.date,'IYYY-IW'),sum(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date between current_date - 91 and current_date+1
								and c.point = po.id 
									group by c.point, to_char(t.date,'IYYY-IW') order by to_date(to_char(t.date,'IYYY-IW'),'IYYY-IW')) as trans,
									
array(select to_char(generate_series(current_date - interval '91 day', current_date, '7 day'::interval)::date,'IYYY-IW')) as mlist
 
from points po
left join salesplan s on po.id  = s.object and s.type = 3
where po.status = upper('active') and po.company = ${company} and po.point_type = 2`)
    	.then(graph => {
			graph.rows.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph.rows);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});



//avgsumweek - Среднедневная сумма продаж за 14 недель
router.get('/avgsumweek/weeks', (req, res) => {
	
	const company = req.userData.company;
	knex.raw(
		`select po.name,
	array(select json_build_object(to_char(t.date,'IYYY-IW'),sum(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date between current_date - interval '91 day' and current_date+1
								and c.point = po.id 
									group by c.point, to_char(t.date,'IYYY-IW') order by to_date(to_char(t.date,'IYYY-IW'),'IYYY-IW')) as trans,
 coalesce(s.monthly,0) as plan,
array(select to_char(generate_series(current_date - interval '91 day', current_date, '7 day'::interval)::date,'IYYY-IW')) as mlist
from points po
left join salesplan s 
on s.object = po.id and s.type = 3
where po.status = upper('active') and po.company = ${company} and po.point_type = 2`
	)
    .then(graph => {
		graph.rows.forEach(graphey => {
			graphey.name = helpers.decrypt(graphey.name);
		});
			return res.status(200).json(graph.rows);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

// avgticketmonth -- Cредний чек за 14 недель
router.get('/avgticketmonth/weeks', (req, res) => {
	
	const company = req.userData.company;
	
	knex.raw(
	`select po.name,
array(select json_build_object(to_char(t.date,'IYYY-IW'),sum(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date between current_date - interval '91 day' and current_date+1
								and c.point = po.id 
									group by c.point, to_char(t.date,'IYYY-IW') order by to_date(to_char(t.date,'IYYY-IW'),'IYYY-IW')) as trans,
array(select to_char(generate_series(current_date - interval '91 day', current_date, '7 day'::interval)::date,'IYYY-IW')) as mlist
from 
	points po
where 
	po.status = 'ACTIVE' and po.company = ${company} and po.point_type = 2`
	)
	.then(graph => {
		graph.rows.forEach(graphey => {
			graphey.name = helpers.decrypt(graphey.name);
	});
		return res.status(200).json(graph.rows);
	}).catch((err) => {
		return res.status(500).json(err.stack);
	});
});




// countticketmonth - Среднедневное количество чеков 14 week
router.get('/countticketmonth/weeks', (req, res) => {
	
	const company = req.userData.company;
	
   	knex.raw(
	`select po.name,
array(select json_build_object(to_char(t.date,'IYYY-IW'),count(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date between current_date - interval '13 week' and current_date+1
								and c.point = po.id 
									group by c.point, to_char(t.date,'IYYY-IW') order by to_date(to_char(t.date,'IYYY-IW'),'IYYY-IW')) as trans,
array(select to_char(generate_series(current_date - interval '13 week', current_date, '7 day'::interval)::date,'IYYY-IW')) as mlist
from points po
where po.status = upper('active') and po.company = ${company} and po.point_type = 2
;`
	)
	.then(graph => {
		graph.rows.forEach(graphey => {
			graphey.name = helpers.decrypt(graphey.name);
		});
	return res.status(200).json(graph.rows);
		}).catch((err) => {
			return res.status(500).json(err.stack);
	});
});

// Сумма продаж по точкам за 14 дней
router.get('/days', (req, res) => { 
	
	const company = req.userData.company;
	
	knex.raw(`select 
	po.name 
	,coalesce(s.monthly,0) as plan,
	array(select json_build_object(to_char(t.date,'DD.MM'),sum(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date between current_date - interval '14 day' and current_date+1
								and c.point = po.id 
									group by c.point, to_char(t.date,'DD.MM') order by to_date(to_char(t.date,'DD.MM'),'DD.MM')) as trans,
									
array(select to_char(generate_series(current_date - interval '14 day', current_date - 1, '1 day'::interval)::date,'DD.MM')) as mlist
 
from points po
left join salesplan s on po.id  = s.object and s.type = 3
where po.status = upper('active') and po.company = ${company} and po.point_type = 2`)
    	.then(graph => {
			graph.rows.forEach(graphey => {
				graphey.name = helpers.decrypt(graphey.name);
			});
			return res.status(200).json(graph.rows);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

//avgsumweek - Среднедневная сумма продаж за 14 дней
router.get('/avgsumweek/days', (req, res) => {
	
	const company = req.userData.company;
	knex.raw(
		`select po.name,
	array(select json_build_object(to_char(t.date,'DD.MM'),sum(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date >= current_date - interval '14 day' 
								and c.point = po.id 
									group by c.point, to_char(t.date,'DD.MM') order by to_date(to_char(t.date,'DD.MM'),'DD.MM')) as trans,
 coalesce(s.monthly,0) as plan,
array(select to_char(generate_series(current_date - interval '14 day', current_date /*- 1*/, '1 day'::interval)::date,'DD.MM')) as mlist
from points po
left join salesplan s 
on s.object = po.id and s.type = 3
where po.status = upper('active') and po.company = ${company} and po.point_type = 2`
	)
    .then(graph => {
		graph.rows.forEach(graphey => {
			graphey.name = helpers.decrypt(graphey.name);
		});
			return res.status(200).json(graph.rows);
		}).catch((err) => {
			return res.status(500).json(err.stack);
		});
});

// avgticketmonth -- Cредний чек за 14 дней
router.get('/avgticketmonth/days', (req, res) => {
	
	const company = req.userData.company;
	
	knex.raw(
	`select po.name,
array(select json_build_object(to_char(t.date,'DD.MM'),sum(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date >= current_date - interval '14 day'
								and c.point = po.id 
									group by c.point, to_char(t.date,'DD.MM') order by to_date(to_char(t.date,'DD.MM'),'DD.MM')) as trans,
array(select to_char(generate_series(current_date - interval '14 day', current_date /*- 1*/, '1 day'::interval)::date,'DD.MM')) as mlist
from 
	points po
where 
	po.status = 'ACTIVE' and po.company = ${company} and po.point_type = 2`
	)
	.then(graph => {
		graph.rows.forEach(graphey => {
			graphey.name = helpers.decrypt(graphey.name);
	})
		return res.status(200).json(graph.rows);
	}).catch((err) => {
		return res.status(500).json(err.stack);
	});
});


// countticketmonth - Среднедневное количество чеков 14 week
router.get('/countticketmonth/days', (req, res) => {
	
	const company = req.userData.company;
	
   	knex.raw(
	`select po.name,
array(select json_build_object(to_char(t.date,'DD.MM'),count(t.price)::text)
						from cashboxes c
							left join transactions t on (c.id = t.cashbox and t.company = po.company) 
							where t.date >= current_date - interval '14 day'
								and c.point = po.id 
									group by c.point, to_char(t.date,'DD.MM') order by to_date(to_char(t.date,'DD.MM'),'DD.MM')) as trans,
array(select to_char(generate_series(current_date - interval '14 day', current_date /*- 1*/, '1 day'::interval)::date,'DD.MM')) as mlist
from points po
where po.status = upper('active') and po.company = ${company} and po.point_type = 2
;`
	)
	.then(graph => {
		graph.rows.forEach(graphey => {
			graphey.name = helpers.decrypt(graphey.name);
		});
		return res.status(200).json(graph.rows);
		}).catch((err) => {
			return res.status(500).json(err.stack);
	});
});

module.exports = router;
