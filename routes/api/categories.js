const express = require("express");
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");

const router = new express.Router();

router.get("/margin", (req, res) => {
  // helpers.serverLog(req.originalUrl);

  const categoryName = req.query.category
    ? req.query.category.toLowerCase()
    : "";
  
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex.raw(
    `select c.id, c.name, (case when m.rate is null then 0 else m.rate end) as rate, (case when m.sum is null then 0 else m.sum end) as sum
    from categories c
      LEFT JOIN margin_plan m on (
        m.object = c.id
        and m.type = 1
        and m.company = c.company
        and m.active = true)
    where c.company in (${company},0)
      and lower(c.name) like '%${categoryName}%'
      and c.deleted = false
      limit 30`
  ).then((categories) => {
    return res.status(200).json(categories.rows);
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

router.get("/getcategories", (req, res) => {
  //console.log('Попал сюда 1');
  const company = req.userData.company;
  console.log(company);
  const parentid = req.query.parentid ? req.query.parentid : -1;  
  
  knex.raw(`select id,name,deleted,parentid from categories
    where company = ${company}
      and id <> 0
      and (parentid = ${parentid} or (${parentid} = -1 and parentid = 0))      
  `).then((categories) => {
      return res.status(200).json(categories.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });

});

router.get("/getcategoriesbonusrate", (req, res) => {
  const company = req.userData.company;
  const parentid = req.query.parentid ? req.query.parentid : -1;  
  
  knex.raw(`select id,name,deleted,parentid,bonusrate from categories
    where company = ${company}
      and id <> 0
      and (parentid = ${parentid} or (${parentid} = -1 and parentid = 0))      
  `).then((categories) => {
      return res.status(200).json(categories.rows);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });

});

//service for category spr with limit and search word
router.get("/search", (req, res) => {
  // helpers.serverLog(req.originalUrl);

  const categoryName = req.query.category
    ? req.query.category.toLowerCase()
    : "";
  const searchQuery = "%" + categoryName + "%";
  let company = req.userData.company;
  if (company === "0" && req.query.company) company = req.query.company;

  knex.raw(
    `select id, name from categories 
      where id <> -1 
        and company = ${company} 
        and lower(name) like '%${categoryName}%' 
        and deleted = false
        limit 30`
  ).then((categories) => {
    return res.status(200).json(categories.rows);
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

//{"user": 1, "category": {"id": 1, "name": "Колготки", "deleted": false}}
router.post("/updatecategories", (req, res) => {
  req.body.user = req.userData.id;

  knex
    .raw("select categories_management(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(
          result.rows[0].categories_management.code == "success" ? 200 : 400
        )
        .json(result.rows[0].categories_management);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

//{"user" : 1, "bind" : {"product":1,"category":2}}
router.post("/addtoproduct", (req, res) => {
  req.body.user = req.userData.id;

  knex
    .raw("select category_binding(?)", [req.body])
    .then((result) => {
      helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
      return res
        .status(result.rows[0].category_binding.code == "success" ? 200 : 400)
        .json(result.rows[0].category_binding);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

const get_childs = (array,parentid) =>{
  let res = [];
  let childs;
  array.forEach(element => {
    if (parseInt(element.parentid) === parentid){
      childs = get_childs(array,parseInt(element.id));
      if (Object.keys(childs).length > 0){
        res.push({
          "value":element.id,
          "label":element.name,
          "children":childs
        });
      }else{
        res.push({
          "value":element.id,
          "label":element.name
        });
      }
    }
  });
  return res;
}

router.get("/get_categories", (req, res) => {
  const company = req.userData.company; 
  
  knex.raw(`select id,name,deleted,parentid from categories
    where company = ${company}
      and id <> 0
      and deleted is false
  `).then((categories) => {
    let childs;
    let list = [];
    categories.rows.forEach(element => {
      childs = [];
      if (parseInt(element.parentid) === 0){
        childs = get_childs(categories.rows,parseInt(element.id));
        if (Object.keys(childs).length > 0){
          list.push({
            "value":element.id,
            "label":element.name,
            "children":childs
          });
        }else{
          list.push({
            "value":element.id,
            "label":element.name
          });
        }
      }
    });
    return res.status(200).json(list);
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

const get_children_cat_bonusrate = (array,parentid) =>{
  let res = [];
  let childs;
  array.forEach(element => {
    if (parseInt(element.parentid) === parentid){
      childs = get_children_cat_bonusrate(array,parseInt(element.id));
      if (Object.keys(childs).length > 0){
        res.push({
          "value":element.id,
          "label":element.name,
          "bonusrate":element.bonusrate,
          "children":childs
        });
      }else{
        res.push({
          "value":element.id,
          "label":element.name,
          "bonusrate":element.bonusrate
        });
      }
    }
  });
  return res;
}

router.get("/get_categories_bonusrate", (req, res) => {
  const company = req.userData.company; 
  
  knex.raw(`select id,name,deleted,parentid,bonusrate from categories
    where company = ${company}
      and id <> 0
      and deleted is false
  `).then((categories) => {
    let childs;
    let list = [];
    categories.rows.forEach(element => {
      childs = [];
      if (parseInt(element.parentid) === 0){
        childs = get_children_cat_bonusrate(categories.rows,parseInt(element.id));
        if (Object.keys(childs).length > 0){
          list.push({
            "value":element.id,
            "label":element.name,
            "bonusrate":element.bonusrate,
            "children":childs
          });
        }else{
          list.push({
            "value":element.id,
            "label":element.name,
            "bonusrate":element.bonusrate
          });
        }
      }
    });
    return res.status(200).json(list);
  }).catch((err) => {
    return res.status(500).json(err);
  });
});

const get_childs2 = (array,parentid) =>{
  let res = [];
  let childs;
  array.forEach(element => {
    if (parseInt(element.parentid) === parentid){
      childs = get_childs2(array,parseInt(element.id));
        res.push({
          "value":element.id,
          "label":element.name,
          "children":childs,
          "rate":element.rate,
          "sum":element.sum
        });
    }
  });
  return res;
}

router.get("/margin_plan", (req, res) => {
  const company = req.userData.company; 
  
  knex.raw(`select c.id,c.name,c.deleted,c.parentid,
  (case when m.rate is null then 0 else m.rate end) as rate, (case when m.sum is null then 0 else m.sum end) as sum
  from categories c
  left join margin_plan m
  on m.object = c.id and m.company = c.company and m.active and m.type = 1 
    where c.company = ${company}
      and c.id <> 0
      and c.deleted is false
  `).then((categories) => {
    let childs;
    let list = [];
    categories.rows.forEach(element => {
      childs = [];
      if (parseInt(element.parentid) === 0){
        childs = get_childs2(categories.rows,parseInt(element.id));
        list.push({
          "value":element.id,
          "label":element.name,
          "children":childs,
          "rate":element.rate,
          "sum":element.sum
        })
      }
    });
    return res.status(200).json(list);
  }).catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  });
});


module.exports = router;
