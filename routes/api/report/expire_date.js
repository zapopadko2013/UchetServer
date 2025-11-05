const express = require('express');
const knex = require('../../../db/knex');
const helpers = require('../../../middlewares/_helpers');
const excel = require("node-excel-export");

const router = new express.Router();


//////05.06.2023

router.get("/repexpdate", (req, res) => {
      const company = req.userData.company ? req.userData.company : 0; 
	  req.body.company = company;

      knex.raw("select functioncalls.rep_exp_date(?)", [req.body])
            .then(result => {
		                result = result.rows[0].rep_exp_date;
	
	for (x in result.text) {
   // console.log( x);
   // console.log( result.text[x]);
   
   let arr=result.text[x]; 
    if (arr == null || arr == undefined){
} else
{
arr.forEach((r) => {
        r.point=helpers.decrypt(r.point);
       // console.log(r);
      });
}
    
//	result.text[x].point="22";
}
	
/*	
	//					console.log(result.text);
	const arrayf=result.text.arrayf;
    const array0=result.text.array0;
	const array3=result.text.array3;
	const array6=result.text.array6;
	const array9=result.text.array9;
	const array12=result.text.array12;
	

if (arrayf == null || arrayf == undefined){
} else
{
arrayf.forEach((r) => {
        r.point=helpers.decrypt(r.point);
		
      });
}
if (array0 == null || array0 == undefined){
} else
{
array0.forEach((r) => {
        r.point=helpers.decrypt(r.point);
      });
}

if (array3 == null || array3 == undefined){
} else
{
array3.forEach((r) => {
        r.point=helpers.decrypt(r.point);
      });
}

if (array6 == null || array6 == undefined){
} else
{
array6.forEach((r) => {
        r.point=helpers.decrypt(r.point);
      });
}

if (array9 == null || array9 == undefined){
} else
{
array9.forEach((r) => {
        r.point=helpers.decrypt(r.point);
      });
}

if (array12 == null || array12 == undefined){
} else
{
array12.forEach((r) => {
        r.point=helpers.decrypt(r.point);
      });
}		
*/
						
		return res.status(result.code == "success" ? 200 : 500).json(result);
	}).catch((err) => {
                 console.log(err);
		return res.status(500).json(err);
	});
	
});

//////05.06.2023


router.get("/", (req, res) => {
      const company = req.userData.company;

      knex.raw("select rep_exp_date(?)", [company])
            .then(result => {
                  //helpers.serverLog(req.originalUrl, result, "success");
                  return res.status(200).json(result.rows);
            })
            .catch(err => {
                  helpers.serverLog(req.originalUrl, err.stack, 'error');
                  return res.status(500).json(err);
            });
});

router.post("/excel", (req, res) => {
      let prod0 = req.body.arr0;
      let prod3 = req.body.arr3;
      let prod6 = req.body.arr6;
      let prod9 = req.body.arr9;
      let prod12 = req.body.arr12;

      if (!prod0 || prod0 === null) {
            prod0 = [{code: "",
            dt: "",
            name: "",
            units: ""}];
      };

      if (!prod3 || prod3 === null) {
            prod3 = [{code: "",
            dt: "",
            name: "",
            units: ""}];
      };

      if (!prod6 || prod6 === null) {
            prod6 = [{code: "",
            dt: "",
            name: "",
            units: ""}];
      };

      if (!prod9 || prod9 === null) {
            prod9 = [{code: "",
            dt: "",
            name: "",
            units: ""}];
      };

      if (!prod12 || prod12 === null) {
            prod12 = [{code: "",
            dt: "",
            name: "",
            units: ""}];
      };

      const styles = {
            header: {
                  font: {
                        color: {
                              rgb: "FF000000",
                        },
                        sz: 14,
                        bold: true,
                  },
            },
            emptyCell: {},
      };

      const specification = {
            code: {
                  displayName: "Штрих-код",
                  headerStyle: styles.emptyCell,
                  width: "20", // <- width in chars (when the number is passed as string)
            },
            name: {
                  displayName: "Наименование товара",
                  headerStyle: styles.emptyCell,
                  width: "40", // <- width in chars (when the number is passed as string)
            },
            units: {
                  displayName: "Количество",
                  headerStyle: styles.emptyCell,
                  width: "10", // <- width in chars (when the number is passed as string)
            },
            dt: {
                  displayName: "Годен до",
                  headerStyle: styles.emptyCell,
                  width: "15", // <- width in chars (when the number is passed as string)
            },
      };

      const merges = [
            // { start: { row: 1, column: 1 }, end: { row: 1, column: 1 } },
            // { start: { row: 2, column: 1 }, end: { row: 2, column: 1 } },
            // { start: { row: 1, column: 2 }, end: { row: 1, column: 2 } },
            // { start: { row: 2, column: 2 }, end: { row: 2, column: 2 } }
            // { start: { row: 3, column: 1 }, end: { row: 3, column: 1 } },
      ];

      const report = excel.buildExport([
            {
                  name: "Просроченные товары", 
                  // merges: merges,
                  specification: specification, 
                  data: prod0, 
            },
            {
                  name: "0-3", 
                  // merges: merges,
                  specification: specification, 
                  data: prod3, 
            },
            {
                  name: "3-6",
                  // merges: merges, 
                  specification: specification,
                  data: prod6,
            },
            {
                  name: "6-9",
                  // merges: merges,
                  specification: specification,
                  data: prod9,
            },
            {
                  name: "9-12",
                  // merges: merges, 
                  specification: specification,
                  data: prod12,
            },
      ]);
      res.attachment("report.xlsx");
      return res.send(report);
});


module.exports = router;