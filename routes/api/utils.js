const express = require('express');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const excel = require('node-excel-export');
const router = new express.Router();

router.post('/import_nomenclature_xls', (req, res) => {
//   helpers.serverLog(req.originalUrl, req.body);

  knex.raw('select import_nomenclature_xls(?,?,?,?,?)',
  [req.body.data,req.body.companyId,req.body.stockId,req.body.taxId,req.body.counterparty])
  .then(result => {
    res.status(result.rows[0].import_nomenclature_xls? 200 : 400).json(result.rows[0].import_nomenclature_xls);
    
    js_data = result.rows[0].import_nomenclature_xls;

    const fs = require('fs');
    const scsfileName = `./public/imp_log/success_${req.body.companyId}_${req.body.stockId}.txt`;
    const errfileName = `./public/imp_log/errors_${req.body.companyId}_${req.body.stockId}.txt`;  

    if (js_data.success != null){
      fs.writeFile(scsfileName, js_data.success.text, function (err) {
        if (err) helpers.serverLog(req.originalUrl, "file write error:  "+scsfileName+', '+ err.message);
      });
    }
    if (js_data.errors != null){
      fs.writeFile(errfileName, js_data.errors.text, function (err) {
        if (err) helpers.serverLog(req.originalUrl, "file write error:  "+errfileName+', '+ err.message);
      });
    }
    return;
  }).catch((err) =>{
    helpers.serverLog(req.originalUrl, err, 'error');
    res.status(500).json(err)
    return;
  })
});

//Here you specify the export structure
const styles = {
	emptyCell: {

	}
};

const specification = {
	index: {
		displayName: '',
		headerStyle: styles.emptyCell,
		width: '6' // <- width in chars (when the number is passed as string)
	},
	name: {
		displayName: 'Наименование',
		headerStyle: styles.emptyCell,
		width: '55' // <- width in chars (when the number is passed as string)
	},
	code: {
		displayName: 'Код',
		headerStyle: styles.emptyCell,
		width: '25' // <- width in pixels
	},
	exception: {
		displayName: 'Ошибка',
		headerStyle: styles.emptyCell,
		width: '65' // <- width in pixels
	}
}

router.post("/invoice_add_xls", (req, res) => {
  const invoice = req.body.invoice;
  req.body.company = req.userData.company;
  req.body.user = req.userData.id;
  const jsn = JSON.parse(req.body.invoiceprods)
  req.body.invoiceprods = jsn
//   helpers.serverLog(req.body);
  knex
    .raw("select invoice_addprod_xls(?)", [
      req.body
    ])
    .then(result => {
			
		//helpers.log(req.body, result.rows[0], result.fields[0].name, req.ip);
		result = result.rows[0].invoice_addprod_xls;
	  	
		if (result.exception != null){
			
			result.exception.forEach((resu,idx) => {
				resu.index = idx + 1;
			});
			
			const report = excel.buildExport(
				[ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
					{
						name: 'Report', // <- Specify sheet name (optional)
						//heading: heading, // <- Raw heading array (optional)
						//merges: merges, // <- Merge cell ranges
						specification: specification, // <- Report specification
						data: result.exception // <-- Report data
					}
				]
			);

			// You can then return this straight
			res.attachment('report.xlsx'); // This is sails.js specific (in general you need to set headers)		
			return res.send(report);
		} else {
			return res.status(result.code == "success" ? 200 : 500).json(result);
		}
	  
    })
    .catch(err => {
	  //helpers.serverLog(err);	
      return res.status(500).json(err);
    });
});


module.exports = router;
