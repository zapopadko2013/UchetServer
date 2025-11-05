const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.get("/info", (req,res) =>{
  const company = req.query.company ? req.query.company : req.userData.company;
  const point = req.query.point ? req.query.point : 0;
  let cond = point == 0 ? '': `and id = ${point}`;
  
  knex.raw(`select id, name, case
	when point_type = 0 then 'Центральный склад'
	when point_type = 1 then 'Склад точки'
	else 'Торговая точка' end as point_type, 
  address, status
from points
where company = ${company}
${cond}
order by id;`)
  .then((point) =>{
    point.rows.forEach(elem => {
      elem.address = helpers.decrypt(elem.address, 'secret').toString();
      elem.name = helpers.decrypt(elem.name, 'secret').toString();
    })
    return res.status(200).json(point.rows)
  })
  .catch((err) => {
    console.log(err);
    return  res.status(500).json(err);
  })
});


  
router.get('/', (req, res) => {
	let company = req.userData.company
	if(company === "0" && req.query.company)
		company = req.query.company

	let where = { 'points.company': company, 'points.status': 'ACTIVE' };

	if (req.query.id) where['points.id'] = req.query.id;

	knex('points').join('point_types', { 'points.point_type': 'point_types.id' })
		.select('points.id', 'points.name', 'points.address',
			'point_types.id as point_type', 'point_types.name as point_type_name',
			'points.is_minus', 'points.status')
		.where(where)
		.whereIn('points.point_type', [0,2])
		.orderBy('point_types.id', 'asc')
		.orderBy('points.id', 'asc')
		.then(points => {
			points.forEach(point => {
				point.name = helpers.decrypt(point.name);
				point.address = helpers.decrypt(point.address);
				if(point.name == '') point.name = 'Центральный склад';
			});

			return res.status(200).json(points);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.get('/types', (req, res) => {
	knex('point_types').whereNot({ id: 0 }).then(pointtypes => {
		return res.status(200).json(pointtypes);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.get('/inactive', (req, res) => {
	let where = { 'points.company': req.userData.company, 'points.status': 'CLOSE', 'points.point_type': 2 };

	knex('points').join('point_types', { 'points.point_type': 'point_types.id' })
		.select('points.id', 'points.name', 'points.address',
			'point_types.id as point_type', 'point_types.name as point_type_name',
			'points.is_minus', 'points.status')
		.where(where)
		.orderBy('point_types.id')
		.then(points => {
			points.forEach(point => {
				point.name = helpers.decrypt(point.name);
				point.address = helpers.decrypt(point.address);
			});
			return res.status(200).json(points);
		}).catch((err) => {
			return res.status(500).json(err);
		});
});

router.post('/manage', (req, res) => {
// {
//   "name": "20240130test3",
//   "address": "asdfasdfasdf",
//   "is_minus": "0",
//   "point_type": "2"
// }

	//req.body.company = req.userData.company_id;
	req.body.company = req.userData.company;
	
	req.body.name = req.body.point.name;
	req.body.address = req.body.point.address;
	req.body.is_minus = req.body.point.is_minus;
	req.body.point_type = req.body.point.point_type;

	helpers.createPoint(req, res);
	//20240131 AB unify all creation of trading points in helpers.createPoint <
	// req.body.user = req.userData.id;

	// req.body.point.address = helpers.encrypt(req.body.point.address);
	// req.body.point.name = helpers.encrypt(req.body.point.name);

	// knex.raw('select points_add(?)', [req.body]).then(result => {
	// 	helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
	// 	result = result.rows[0].points_add;
	// 	return res.status(result.code == 'success' ? 200 : 400).json(result);
	// }).catch((err) => {
	// 	return res.status(500).json(err);
	// });
	//20240131 AB unify all creation of trading points in helpers.createPoint >
});

router.post('/manage/attachstock', (req, res) => {
	req.body.user = req.userData.id;
	knex.raw('select stock_attach(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].stock_attach;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/manage/attachstockdel', (req, res) => {
	req.body.user = req.userData.id;
	knex.raw('select stock_attach_del(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].stock_attach_del;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.post('/change', (req, res) => {
	req.body.user = req.userData.id;

	req.body.point.address = helpers.encrypt(req.body.point.address);
	req.body.point.name = helpers.encrypt(req.body.point.name);

	knex.raw('select points_change(?)', [req.body]).then(result => {
		helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].points_change;
		return res.status(result.code == 'success' ? 200 : 400).json(result);
	}).catch((err) => {
		return res.status(500).json(err);
	});
});

router.get("/revision", (req, res) => {
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  let where = {
    "points.company": company,
    "points.status": "ACTIVE"
  };

  if (req.query.id) where["points.id"] = req.query.id;

  knex("points")
    .join("point_types", { "points.point_type": "point_types.id" })
    .select(
      "points.id",
      "points.name",
      "points.address",
      "point_types.id as point_type",
      "point_types.name as point_type_name",
      "points.is_minus",
      "points.status"
    )
    .where(where)
    .whereIn("points.point_type", [0, 2])
    .orderBy("point_types.id", "asc")
    .orderBy("points.id", "asc")
    .then(points => {
      points.forEach(point => {
        if (point.point_type === 2) point.name = helpers.decrypt(point.name);
        point.address = helpers.decrypt(point.address);
      });

      return res.status(200).json(points);
    })
    .catch(err => {
      return res.status(500).json(err);
    });
});


module.exports = router;