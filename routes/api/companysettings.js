const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');

const router = new express.Router();

router.get("/storepoint", (req, res) => {
  const company = req.query.company || req.userData.company;

  knex
    .raw(
      `select p.id, p.name, p.address, p.is_minus, p.status from points p
    where p.company=${company} and status='ACTIVE'
    and p.point_type=2`
    )
    .then((result) => {
      let data = result.rows.slice();

      data = data.map(({ id, name, address, is_minus, status }) => {
        return {
          id,
          name: helpers.decrypt(name),
          address: helpers.decrypt(address),
          is_minus: is_minus,
          status: status,
        };
      });

      return res.status(200).json(data);
    })
    .catch((err) => {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    });
});

router.get("/storepoint/inactive", (req, res) => {
  const company = req.query.company || req.userData.company;

  knex
    .raw(
      `select p.id, p.name, p.address, p.is_minus, p.status from points p
    where p.company=${company} and status='CLOSE'
    and p.point_type=2`
    )
    .then((result) => {
      let data = result.rows.slice();

      data = data.map(({ id, name, address, is_minus, status }) => {
        return {
          id,
          name: helpers.decrypt(name),
          address: helpers.decrypt(address),
          is_minus: is_minus,
          status: status,
        };
      });

      return res.status(200).json(data);
    })
    .catch((err) => {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    });
});

router.get("/stocks", (req, res) => {
  const company = req.query.company || req.userData.company;

  knex
    .raw(
      `select p.id, p.name, p.address, p.is_minus from points p
    where p.company=${company} and status='ACTIVE'  
    and p.point_type in (0, 1)`
    )
    .then((result) => {
      let data = result.rows.slice();

      data = data.map(({ id, name, address, is_minus }) => {
        if (name.toUpperCase() !== "ЦЕНТРАЛЬНЫЙ СКЛАД") {
          //Склад точки
          if (name.substring(0, 12).toUpperCase().trim() === "СКЛАД ТОЧКИ") {
            name = `Склад точки ${helpers.decrypt(name.substring(13))}`;
          } else {
            name = helpers.decrypt(name);
          }
        }
        return {
          id,
          name: name,
          address: helpers.decrypt(address),
          is_minus: is_minus,
        };
      });

      return res.status(200).json(data);
    })
    .catch((err) => {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    });
});

router.get("/stocks/inactive", (req, res) => {
  const company = req.query.company || req.userData.company;

  knex
    .raw(
      `select p.id, p.name, p.address, p.is_minus from points p
    where p.company=${company} and status<>'ACTIVE'  
    and p.point_type in (0, 1)`
    )
    .then((result) => {
      let data = result.rows.slice();

      data = data.map(({ id, name, address, is_minus }) => {
        if (name.toUpperCase() !== "ЦЕНТРАЛЬНЫЙ СКЛАД") {
          //Склад точки
          if (name.substring(0, 12).toUpperCase().trim() === "СКЛАД ТОЧКИ") {
            name = `Склад точки ${helpers.decrypt(name.substring(13))}`;
          } else {
            name = helpers.decrypt(name);
          }
        }
        return {
          id,
          name: name,
          address: helpers.decrypt(address),
          is_minus: is_minus,
        };
      });

      return res.status(200).json(data);
    })
    .catch((err) => {
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    });
});

router.get("/cashbox", (req, res) => {
  const company = req.query.company || req.userData.company;

  knex
    .raw(
      `select cb.id, cb.name, p.name as point_name, cb.deleted from cashboxes cb
  inner join points p
  on cb.point=p.id
  where p.company=${company} and  cb.deleted=false`
    )
    .then((result) => {
      let data = result.rows.slice();
      data = data.map(({ id, name, point_name, deleted }) => {
        return {
          id,
          name: helpers.decrypt(name),
          point_name: helpers.decrypt(point_name),
          deleted: deleted,
        };
      });
      return res.status(200).json(data);
    });
});

router.get("/cashbox/inactive", (req, res) => {
  const company = req.query.company || req.userData.company;

  knex
    .raw(
      `select cb.id, cb.name, p.name as point_name, cb.deleted from cashboxes cb
  inner join points p
  on cb.point=p.id
  where p.company=${company} and  cb.deleted=true`
    )
    .then((result) => {
      let data = result.rows.slice();
      data = data.map(({ id, name, point_name, deleted }) => {
        return {
          id,
          name: helpers.decrypt(name),
          point_name: helpers.decrypt(point_name),
          deleted: deleted,
        };
      });
      return res.status(200).json(data);
    });
});

router.get("/prefix", (req, res) => {
  const company = req.query.company || req.userData.company;

  knex
    .raw(
      `select id, name, productsweight_prefix, status from companies
  where id=${company} and status='ACTIVE'`
    )
    .then((result) => {
      return res.status(200).json(result.rows);
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.post("/create_prefix", (req, res) => {
  req.body.user = req.userData.id;
  req.body.company = req.query.company || req.userData.company;

  knex
    .raw("select create_prefix(?)", [req.body])
    .then((result) => {
      result = result.rows[0].create_prefix;
      return res.status(result.code == "success" ? 200 : 500).json(result);
    })
    .catch((err) => {
      return res.status(500).json(err);
    });
});

router.post("/storepoint/create", async (req, res) => {
//   {
//   address: "asdfasdfasdf",
//   is_minus: "0",
//   name: "20240130test3",
//   company: "112",
//   }
helpers.createPoint(req, res);
//20240131 AB unify all creation of trading points in helpers.createPoint <
// // check if point with such name already exists
//   req.body.point_type = (req.body.point_type || 2);
//   let encname = helpers.encrypt(req.body.name).trim();
//   let encaddr = helpers.encrypt(req.body.address).trim();

//   await knex.raw(`
//     select count(id) from public.points where company=${req.body.company} and name='${encname}';
//   `)
//   .then(async (result) => {
//     if(result.rows[0].count > 0) {
//       return res.status(400).json({"code":"error","text":"Точка с таким названием уже существует в рамках вашей компании!"});
//     } else {
//       await knex
//       .raw(
//         `insert into points(name, address, company, is_minus, point_type, status, consignment, ftptransfer)
//         values('${encname}', '${encaddr}', '${req.body.company || req.userData.company}', ${
//         req.body.is_minus === "1" ? true : false
//         },  ${req.body.point_type}, 'ACTIVE', false, false) returning id;`
//     )
//     // .returning('id')
//     .then(async (result) => {
//       //create point type 1
//       if(req.body.point_type == 2) {
//         await knex
//           .raw(
//             `insert into points(name, address, company, is_minus, point_type, status, consignment, ftptransfer)
//             values(
//                 'Склад точки ${encname}', 
//                 '${encaddr}', 
//                 '${req.body.company || req.userData.company}', 
//                 ${req.body.is_minus === "1" ? true : false},  
//                 1, 
//                 'ACTIVE', 
//                 false, 
//                 false
//             ) returning id;`
//           )
//           // .returning('id')
//           .then((stock) => {
//             knex("pointset")
//               .insert({
//                 "point": result.rows[0].id,
//                 "stock": stock.rows[0].id,
//               })
//               .then(() =>{
//                 return res.status(200).json({
//                   "success": true,
//                   "text": ""
//                 })
//               })
//           })
//           .catch((err) => {
//             res.status(500).json({"code": "error", "text": err})
//           })
//       }

//     })
//     .catch((err) => {
//       error: err.message;
//     });
//     };
//   });
//20240131 AB unify all creation of trading points in helpers.createPoint >  
 });

router.put("/storepoint/edit", (req, res) => {
  knex
    .raw(
      `
    update points set name='${helpers.encrypt(
      req.body.name
    )}', address='${helpers.encrypt(req.body.address)}', is_minus=${
        req.body.is_minus === "1" ? true : false
      }
    where id=${req.body.id} 
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.put("/storepoint/active", (req, res) => {
  knex
    .raw(
      `
    update points set status='ACTIVE' where id=${req.query.id};
    update points p set status='ACTIVE' where id in (select stock from pointset where point = ${req.query.id}); 
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.delete("/storepoint/delete", (req, res) => {
  knex
    .raw(
      `
    update points set status='CLOSE' where id=${req.query.id};
    update points p set status='CLOSE' where id in (select stock from pointset where point = ${req.query.id});
    update cashboxes set deleted=true where point=${req.query.id}
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.post("/stocks/create", (req, res) => {
  knex
    .raw(
      `insert into points(name, address, company, point_type, status, consignment, ftptransfer)
  values('${helpers.encrypt(req.body.name)}', '${helpers.encrypt(
        req.body.address
      )}', '${
        req.body.company || req.userData.company
      }', 2, 'ACTIVE', false, false)`
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      error: err.message;
    });
});

router.put("/stocks/edit", (req, res) => {
  knex
    .raw(
      `
    update points set name='${helpers.encrypt(
      req.body.name
    )}', address='${helpers.encrypt(req.body.address)}' 
    where id=${req.body.id} 
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.put("/stocks/active", (req, res) => {
  knex
    .raw(
      `
    update points set status='ACTIVE'
    where id=${req.query.id} 
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.delete("/stocks/delete", (req, res) => {
  knex
    .raw(
      `
      update points set status='CLOSE' where id=${req.query.id};
      update cashboxes set deleted=true where point=${req.query.id}
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.post("/cashbox/create", (req, res) => {
  knex
    .raw(
      `insert into cashboxes(name, point, deleted, isengaged, checkuotside)
  values('${helpers.encrypt(req.body.name)}', '${
        req.body.point
      }', false, false, false)`
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      error: err.message;
    });
});

router.put("/cashbox/edit", (req, res) => {
  knex
    .raw(
      `
    update cashboxes set name='${helpers.encrypt(req.body.name)}' ${
        req.body.point ? `, point='${req.body.point}'` : ""
      }   
    where id=${req.body.id};
    ${
      req.body.point
        ? `update points set name='${helpers.encrypt(req.body.point_name)}'
    where id=${req.body.point}`
        : ""
    }
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.put("/cashbox/active", (req, res) => {
  knex
    .raw(
      `
    update cashboxes set deleted=false where id=${req.query.id} 
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

router.delete("/cashbox/delete", (req, res) => {
  knex
    .raw(
      `
    update cashboxes set deleted=true where id=${req.query.id}
  `
    )
    .then((result) => {
      return res.status(200).json({
        success: true,
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err.message,
      });
    });
});

module.exports = router;
