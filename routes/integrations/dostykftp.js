const beautify = require('xml-beautifier');
const moment = require('moment');
const folder = './public/dostyk_files/';
const fs = require('fs');
const knex = require('/var/www/ismeerp/db/knex'); 
const client = require('ftp');

// Пока что ТОЛЬКО для LetiqueCosmetics
function createxml() {
	var d          = new Date();
	d.setDate(d.getDate() - 1); 
	var year       = d.getFullYear().toString();
	var date_file  = ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + year.substr(2,2);
	var date_req   = "'"+('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + year+"'";
	let fd;
	let object 	   = 277458513; // - идентификатор LetiqueCosmetics (ТОО "Union Productions" - 31) - перерегистрировали компанию (ТОО "Magnolia Group (Магнолия Гроуп)" - 86)
	
	const fileName = object+"_"+date_file+"_"+date_file+".xml";

	knex.raw(`select entity2char(( xmlelement(name "ALLDATA",xmlconcat('<OBJECT>${object}</OBJECT>',xmlelement(name "SALES",xmlagg(xmlelement(name "SALE", xmlconcat(xmlforest(t.cashbox as "PosNum",t.ticketid as "ChequeNum", to_char(t.date,'DD-MM-YYYY HH24:MI:SS') as "ChequeDate"),d.xml_task_group)))))) )::text)::xml
FROM transactions t
INNER JOIN (
 SELECT tabl1.company, tabl1.id, xmlagg(tabl1.attr) as xml_task_group
	FROM (
	SELECT t2.company, t2.id, xmlelement(name "LINE", xmlattributes(
		row_number() over (PARTITION BY t2.id ORDER BY t2.id) as "LineNum",
		to_char(t2.date,'DD-MM-YYYY HH24:MI:SS') as "OperationDate", 
		case when t2.tickettype = 0 then 1 else 0 end as "OperationType", 
		case when t2.paymenttype = 'cash' then 'Наличный' else 'Безналичный' end as "PaymentType", 
		d2.product as "GoodsCode", 	
		p.name||array_to_string(array(select ' '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = d2.attributes),', ') as "GoodsName", 
		cast('ШТ.' as varchar) as "GoodsUnit", 
		d2.price as "GoodsPrice", 
		d2.units as "GoodsQty", 
		d2.totalprice-d2.discount-d2.ticketdiscount as "GoodsTotal")) as attr
    FROM transactions t2
      INNER JOIN transaction_details d2 on (t2.id = d2.transactionid and t2.company = d2.company)
      INNER JOIN products p on (d2.company = p.company and d2.product = p.id)) tabl1			
       GROUP BY tabl1.company, tabl1.id
) d on (d.company = t.company and d.id = t.id)
where t.company = 86
and t.point = 355
and t.date::date = to_date(${date_req},'DD.MM.YYYY');`).then(result => {
		
	    fs.writeFileSync(folder+fileName, beautify('<?xml version="1.0" encoding="utf-8"?>' + result.rows[0].entity2char));
		
		console.log('START');
		console.log(d);
		console.log('Date_Request: '+date_req);
		console.log('CONNECTING...');
		const c = new client();
		
		// connect to ftp server
		c.connect({
			host: "salesflow.tsd.kz",
			port: 3021,
			user: "LetiqueCosmetics",
			password: "UNcuEr87"//,
			//debug: console.log
		});
				
		c.on('ready', function () {
			console.log('READY');
			c.put(folder+fileName,fileName,function (err) {
				if (err) { console.log('PUT err : ' + err); };
				c.end();
			});
			c.end();
			console.log('Result: OK');
			console.log('END');
			console.log('');
		});
		
		console.log(c);
		
	 }).catch(err => {
		console.log('ERROR: '+err);
	 }).finally(function() {
		knex.destroy();
	 })
}

module.exports = {
  createxml
};
