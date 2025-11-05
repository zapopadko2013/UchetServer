const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = new express.Router();

router.get("/", (req, res) => {
  let active =
    typeof req.query.active !== "undefined" && req.query.active !== null
      ? req.query.active
      : "1";
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  const query = knex("promotions")
    .modify(function(params) {
      if (active == 1) {
        this.where({ company: company, isactive: true }).where("edate",">=",knex.raw(`current_date`));
      } else {
        this.where({ company: company, isactive: false }).orWhere("edate","<",knex.raw(`current_date`)).where({ company: company });
      }
    })
    .select("id", "name", "point", "bdate", "edate", "priority", "company","isactive")
    .orderBy("priority")
    .as("pr");

  /*
	knex('promotions as pr')
		.leftJoin('points as p', {'p.id': 'pr.point', 'p.company': 'pr.company', 'p.status': knex.raw('?', ['ACTIVE'])})
		.modify(function (params) {
			if (active == 1) {
				this.where( { 'pr.company': company, 'pr.isactive': true} ).where('pr.edate','>=', knex.raw(`current_date`))
			} else { 	
				this.where( { 'pr.company': company, 'pr.isactive': false} ).orWhere('pr.edate','<', knex.raw(`current_date`))
			}
		})
		.orderBy('pr.priority','pr.id')
		.select('pr.id','pr.name','pr.point',knex.raw(`p.name as pointname`),'pr.bdate','pr.edate','pr.priority')*/
  knex(query)
    .leftJoin("points as p", {
      "p.id": "pr.point",
      "p.company": "pr.company",
      "p.status": knex.raw("?", ["ACTIVE"])
    })
    .groupBy("pr.point", "p.name")
    .select(
      "pr.point",
      "p.name as pointname",
      knex.raw(
        `json_agg(json_build_object('id',pr.id,'name',pr.name,'bdate',pr.bdate,'edate',pr.edate,'priority',pr.priority,'isactive',pr.isactive) order by pr.priority) as points`
      )
    )
    .then(promotions => {
      promotions.forEach(promotion => {
        if (promotion.pointname !== null)
          promotion.pointname = helpers.decrypt(promotion.pointname);
      });
      return res.status(200).json(promotions);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

router.get("/details", (req, res) => {
  const id = req.query.id;
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex("promotions as pr")
    .select(
      knex.raw(`(select json_build_object('id', c.type, 'values', json_agg(json_build_object('id',c.object,'name',p.name,'value',c.amount)))   
									from promconditions c
										left join products p on (c.object = p.id and c.company = p.company) 
											where c.listcode = pr.condlist
												and c.company = pr.company
													group by c.type) as if`),
      knex.raw(`(select json_build_object('id', d.type, 'values', json_agg(json_build_object('id',d.object,'name',p.name,'value',d.rate)))   
									from promdiscounts d
										left join products p on (d.object = p.id and d.company = p.company) 
											where d.listcode = pr.disclist
												and d.company = pr.company
													group by d.type) as then`)
    )
    .where({ "pr.company": company, "pr.id": id })
    .first()
    .then(promdet => {
      return res.status(200).json(promdet);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

router.get("/getspr", (req, res) => {
  const name = req.query.name;

  if (name == "conditions") {
    knex("promconditionstype")
      .select("promconditionstype.id", "promconditionstype.name")
      .where({ deleted: false })
      .orderBy("promconditionstype.id")
      .then(promconditionstype => {
        return res.status(200).json(promconditionstype);
      })
      .catch(err => {
        return res.status(500).json(err);
      });
  } else if (name == "discounts") {
    knex("promdiscountstype")
      .select("promdiscountstype.id", "promdiscountstype.name")
      .where({ deleted: false })
      .orderBy("promdiscountstype.id")
      .then(promdiscountstype => {
        return res.status(200).json(promdiscountstype);
      })
      .catch(err => {
        return res.status(500).json(err);
      });
  } else {
    return res
      .status(200)
      .json({ error: "Некорректное наименование справочника!" });
  }
});

router.post("/add", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;

  knex
    .raw("select add_promotion(?)", [req.body])
    .then(result => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].add_promotion.code == "success" ? 200 : 400)
        .json(result.rows[0].add_promotion);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

router.post("/del", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  //req.body.id 	 = req.query.id;

  knex
    .raw("select del_promotion(?)", [req.body])
    .then(result => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].del_promotion.code == "success" ? 200 : 400)
        .json(result.rows[0].del_promotion);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

// {"company":1, "user": 1, "priority" : [{"priority" : 1, "id" : 1}]}
router.post("/change_priority", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.userData.company;
  //req.body.id 	 = req.query.id;

  knex
    .raw("select change_priority_promotion(?)", [req.body])
    .then(result => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(
          result.rows[0].change_priority_promotion.code == "success" ? 200 : 400
        )
        .json(result.rows[0].change_priority_promotion);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

router.get("/dates", (req, res) => {
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;
  knex("promotions")
    .select("promotions.bdate", "promotions.edate", "promotions.point")
    .leftJoin(
      "promconditions",
      "promotions.condlist",
      "promconditions.listcode"
    )
    .leftJoin("promdiscounts", "promotions.disclist", "promdiscounts.listcode")
    .where({
      "promotions.company": company,
      "promconditions.type": 2,
      "promdiscounts.type": 2,
      "promotions.isactive": true
    })
    .then(promdet => {
      return res.status(200).json(promdet);
    })
    .catch(err => {
      console.log(err.stack);
      return res.status(500).json(err);
    });
});

module.exports = router;
