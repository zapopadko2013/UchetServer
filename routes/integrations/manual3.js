const beautify = require('xml-beautifier');
const moment = require('moment');
const fs = require('fs');
const knex = require('../../db/knex');
const client = require('ftp');

var d = new Date();
d.setDate(d.getDate() - 3);
var year       = d.getFullYear().toString();
var date_file  = ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + year.substr(2,2);
var date_req   = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + year;
var folder = './public/ftp_files/mega_files/';

let object;
//let fileName;
let res;
let exists = Boolean(false);

// Параметры сервера Mega (id=3)
var serverport = 3021;
//var serverhost = 'mgkz.sales-flow.ru'; 37.18.34.78
var serverhost = 'asspmca.mega.kz'; //Новый адрес сервера АССП: 2.78.60.189, DNS: asspmca.mega.kz


console.log(d + ' Mega');

knex.raw(`select d.ftpobject, d.ftplogin, d.ftppassword, t.company, t.point, entity2char(( xmlelement(name "Data",xmlattributes('http://www.w3.org/2001/XMLSchema' as "xmlns:xsd",
'http://www.w3.org/2001/XMLSchema-instance' as "xmlns:xsi", d.ftpobject as "Object"),
xmlconcat(xmlelement(name "Sales",xmlagg(xmlelement(name "Sale", xmlattributes(t.cashbox as "PosNum",t.ticketid as "ChequeNum",to_char(t.date,'YYYY-MM-DD HH24:MI:SS') as "ChequeDate"),
xmlelement(name "Lines",xmlconcat(d.xml_task_group))))))) )::text)::xml
	FROM transactions t
	INNER JOIN (
	 SELECT tabl1.ftpobject, tabl1.ftplogin, tabl1.ftppassword, tabl1.company, tabl1.point, tabl1.id, xmlagg(tabl1.attr) as xml_task_group
		FROM (
		SELECT po.ftpobject, po.ftplogin, po.ftppassword, t2.company, t2.id, t2.point, xmlelement(name "Line", xmlattributes(
			row_number() over (PARTITION BY t2.id ORDER BY t2.id) as "LineNum",
			to_char(t2.date,'YYYY-MM-DD HH24:MI:SS') as "OperationDate", 
			case when t2.tickettype = 0 then 'Продажа' else 'Возврат' end as "OperationType", 
			case when t2.paymenttype = 'cash' then 'Наличный' else 'Безналичный' end as "PaymentType", 
			d2.product as "GoodsCode", 	
			p.name||array_to_string(array(select ' '||n.values||': '||a.value from attrlist a left join attributenames n on (n.id = a.attribute) where a.listcode = d2.attributes),', ') as "GoodsName", 
			cast('шт.' as varchar) as "GoodsUnit", 
			d2.price as "GoodsPrice", 
			d2.units as "GoodsQty", 
			d2.totalprice-d2.discount-d2.ticketdiscount as "GoodsTotal",
			d2.nds/d2.units as "GoodNds",
			d2.nds as "NDStotal")) as attr
		FROM transactions t2
		  INNER JOIN transaction_details d2 on (t2.id = d2.transactionid and t2.company = d2.company)
		  INNER JOIN products p on (d2.company = p.company and d2.product = p.id)
			INNER JOIN points po on (po.id = t2.point and po.company = t2.company)
					where po.ftptransfer is true
						and po.ftpserver = 3
							and po.status = 'ACTIVE'
							and t2.date::date = to_date('${date_req}','DD.MM.YYYY')
		) tabl1			
		   GROUP BY tabl1.ftpobject, tabl1.ftplogin, tabl1.ftppassword, tabl1.company, tabl1.point, tabl1.id
	) d on (d.company = t.company and d.id = t.id)
	group by d.ftpobject, d.ftplogin, d.ftppassword, t.company, t.point;`).then((result) => {

    result.rows.forEach((point) => {
        
        exists = Boolean(true);
        
        //object   = point.ftpobject;	
        let fileName;			
        fileName = point.ftpobject+"_"+date_file+"_"+date_file+".xml";
        
        try {
            // Сохранение XML файла на сервере
            fs.writeFileSync(folder+point.point+'('+point.company+')'+'/'+fileName, beautify('<?xml version="1.0"?>' + point.entity2char));
        } catch (err) {
            // Если нет папки - создаем ее и снова пытаемся записать
            fs.mkdirSync(folder+point.point+'('+point.company+')'+'/');
            fs.writeFileSync(folder+point.point+'('+point.company+')'+'/'+fileName, beautify('<?xml version="1.0"?>' + point.entity2char));
        }	

        const c = new client();
        
        // connect to ftp server		
        c.connect({
            host: serverhost,
            port: serverport,
            user: point.ftplogin,
            password: point.ftppassword,
            //debug: console.log
        });
                
        c.on('ready', function () {
            console.log('READY Mega('+ point.point + ')');
            c.put(folder+point.point+'('+point.company+')'+'/'+fileName,fileName,function (err) {
                //if (err) { console.log('PUT err : ' + err); };
                if (err) { console.log('PUT ERROR Mega('+ point.point + '): ' + err); };
                //c.end();
            });
            c.end();
            console.log('RESULT Mega(' + point.point + '): OK');
            //console.log('');
        });
        
        c.on('error', function (err) {
            console.log('RESULT Mega('+ point.point +'): ' + err + ' ' + '(' + point.ftplogin + ':' + point.ftppassword + ')');
            c.end();
            return;
        });
        
        //console.log(c);
        
    });
    
    if (!exists) { console.log('RESULT Manual3(Нет чеков за день): OK'); }
    
}).catch(err => {
    console.log('RESULT: Error: '+err);
}).finally(function() {
    knex.destroy();
})
