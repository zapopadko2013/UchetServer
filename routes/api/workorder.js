const express = require('express');
const { template } = require('lodash');
const knex = require('../../db/knex');
const helpers = require('../../middlewares/_helpers');
const excel = require("node-excel-export");
//const rubles = require('rubles').rubles;
const router = new express.Router();

router.get('/cpsinworkorder', (req, res) => {
    const condition = req.query.workorderId ? ` AND w."id" = ${req.query.workorderId}` : " AND w.status = 'INPROCESS'";
    knex.raw(`
    SELECT DISTINCT
	wd.counterparty,
	cp."name",
    wd.status 
FROM
	workorder w
	INNER JOIN "workorder_details" wd ON wd.workorder_id = w."id"
	INNER JOIN counterparties cp ON cp."id" = wd.counterparty 
WHERE
    w.company = ${req.userData.company}
    ${condition}
    `)
        .then((result) => {
            helpers.serverLog(result.rows);
            return res.status(200).json(result.rows)
        })
        .catch((err) => { return res.status(500).json(err) })
});

router.get('/ids', (req, res) => {
    knex.raw(`
    SELECT DISTINCT
	w."id" 
FROM
	workorder w 
WHERE
	w.company = ${req.userData.company}
	AND w.status = 'INPROCESS'
    `)
        .then((result) => {
            helpers.serverLog(result.rows);
            return res.status(200).json(result.rows)
        })
        .catch((err) => { return res.status(500).json(err) })
});

/////06.01.2026

router.post('/send-whatsapp', async (req, res) => {
    const { workorderId } = req.body;
    const companyId = req.userData.company;

   
   
    const ID_INSTANCE = process.env.GREEN_API_ID_INSTANCE;
    const API_TOKEN = process.env.GREEN_API_TOKEN;

    try {
        // 1. Получаем товары и телефоны поставщиков
        const result = await knex.raw(
            `   SELECT 
                p.name,              
                wd.units, 
                wd.purchaseprice,
                c.sendwhatsapp,
                c1.name as companyname,
                c1.address,
                w.workorder_number
            FROM workorder_details wd
            JOIN workorder w ON wd.workorder_id = w.id
            JOIN counterparties c ON wd.counterparty = c.id
            JOIN products p ON wd.product = p.id 
            JOIN companies c1 ON w.company =c1.id 
            WHERE w.id = ? AND w.company = ?`,
             [workorderId, companyId]);

        const details = result.rows;

        if (details.length === 0) {
            return res.status(400).json({ text: "Нет данных для отправки" });
        }

        // 2. Группируем товары по номеру телефона
        const groups = details.reduce((acc, item) => {
            if (item.sendwhatsapp) {
                if (!acc[item.sendwhatsapp]) acc[item.sendwhatsapp] = [];
                acc[item.sendwhatsapp].push(item);
            }
            return acc;
        }, {});

        // 3. Рассылка через Green-API
        /* const sendPromises = Object.keys(groups).map(async (phone) => {
            const itemsText = groups[phone]
                .map(i => `${i.name} (${i.units} шт., Цена - ${i.purchaseprice})`)
                .join(', '); */

                const sendPromises = Object.keys(groups).map(async (phone) => {
    // Заголовок сообщения
    let message = `*ЗАКАЗ №${details[0].workorder_number}*\n`;
    message += `_Компания: ${ helpers.decrypt(details[0].companyname)} (${ helpers.decrypt(details[0].address)})_\n\n`;
    message += `_Дата: ${new Date().toLocaleDateString()}_\n\n`;
    
    // Шапка "таблицы"
    message += "```" + "------------------------------\n";
    message += "Товар          |Кол |Цена \n";
    message += "------------------------------\n";

    let totalSum = 0;

    groups[phone].forEach(i => {
        // Обрезаем название до 14 символов для ровности колонок
        const name = i.name.substring(0, 14).padEnd(15, ' ');
        const qty = i.units.toString().padEnd(4, ' ');
        const price = (i.purchaseprice || 0).toString().padEnd(6, ' ');
        
        message += `${name}|${qty}|${price}\n`;
        totalSum += (i.units * (i.purchaseprice || 0));
    });

    message += "------------------------------\n";
    message += `ИТОГО: ${totalSum.toLocaleString()} \n`;
    message += "------------------------------" + "```\n\n";
    
    //message += "Просьба подтвердить получение заказа.";
            
       //     const message = `Заказ №${details[0].workorder_number}. Товары: ${itemsText}`;
            
            // Формируем корректный chatId для Green-API (номер@c.us)
            const chatId = `${phone.replace(/\D/g, '')}@c.us`;

            return fetch(`https://api.green-api.com/waInstance${ID_INSTANCE}/sendMessage/${API_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, message })
            });
        });

        await Promise.all(sendPromises);

        // 4. Обновляем статус заказа в БД
        await knex('workorder')
            .where({ id: workorderId, company: companyId })
            .update({ status: 'inprocess' });

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка сервера при отправке" });
    }
});

/////06.01.2026


router.get('/list', (req, res) => {
    helpers.serverLog("rec", req.query.rec)
    knex.raw(`
    SELECT
	w."id",
	w.company,
	w.counterparty,
    w.date,
	w.accept_date,
	w.accept_user,
    w.approve_date,
	w.point,
	w.status,
	w.userid,
	w.workorder_number,
	pt."name" AS point_name,
	eu."name" AS username
FROM
	"workorder" w
	INNER JOIN pointset ps ON ps.stock = w.point 
	INNER JOIN points pt ON pt."id" = ps.point
	INNER JOIN erp_users eu ON eu."id" = w.userid
WHERE
    w.company = ${req.userData.company}
    --${req.query.rec === 'true' ? " " : ` AND w.userid = ${req.userData.id}`}
    --${req.query.rec === 'true' ? " AND w.status IN ('APPROVED', 'PART', 'ACCEPTED')" : " "}
    ORDER BY w.date DESC
    `)
        .then((result) => {
            helpers.serverLog(result.rows);
            result.rows.forEach((el) => {
                el.point_name = helpers.decrypt(el.point_name) === "" ? "Центральный склад" : helpers.decrypt(el.point_name);
                el.username = helpers.decrypt(el.username);
            });
            return res.status(200).json(result.rows)
        })
        .catch((err) => { return res.status(500).json(err) })
});

router.post("/createdtoexcel", (req, res) => {
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
            displayName: "Наименование",
            headerStyle: styles.emptyCell,
            width: "50", // <- width in chars (when the number is passed as string)
        },
        units: {
            displayName: "Количество",
            headerStyle: styles.emptyCell,
            width: "15", // <- width in chars (when the number is passed as string)
        },
    };

    const report = excel.buildExport([
        {
            name: "Заказ-наряд",
            specification: specification,
            data: req.body.workorderProducts,
        }
    ]);
    res.attachment("report.xlsx");
    return res.send(report);
});

router.post("/receivingtoexcel", (req, res) => {
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
            displayName: "Наименование",
            headerStyle: styles.emptyCell,
            width: "50", // <- width in chars (when the number is passed as string)
        },
        w_units: {
            displayName: "Количество в заказ-наряде",
            headerStyle: styles.emptyCell,
            width: "15", // <- width in chars (when the number is passed as string)
        },

        units: {
            displayName: "Принятре количество",
            headerStyle: styles.emptyCell,
            width: "15", // <- width in chars (when the number is passed as string)
        },
    };

    const report = excel.buildExport([
        {
            name: "Заказ-наряд",
            specification: specification,
            data: req.body.workorderProducts,
        }
    ]);
    res.attachment("report.xlsx");
    return res.send(report);
});

router.get('/info', (req, res) => {
    knex.raw(`
    SELECT
    wd."id",
	wd.workorder_number,
    wd.date,
    wd.accept_date,
	wd.accept_user,
	pt."name" AS point,
	eu."name" AS username,
	cp."name" AS counterparty,
	cp.bin 
FROM
	"workorder" wd
	INNER JOIN pointset ps ON wd.point = ps.stock
	INNER JOIN points pt ON pt."id" = ps.point
	INNER JOIN erp_users eu ON eu."id" = wd.userid
	INNER JOIN counterparties cp ON cp."id" = wd.counterparty 
WHERE
	wd."id" = ${req.query.workorderId}
    `)
        .then(result => {
            result.rows.forEach((el) => {
                el.point = helpers.decrypt(el.point);
                el.username = helpers.decrypt(el.username);
                if (el.point == "") el.point = "Центральный склад";
            });

            return res.status(200).json(result.rows)
        })
        .catch((err) => { return res.status(500).json(err) })
});

// Used services
router.post('/manage', (req, res) => {
    req.body.user = req.userData.id;
    req.body.company = req.userData.company;
    knex.raw(`select workorder_management(?)`, [req.body])
        .then(result => { //result = result.rows[0].create_invoice_workorder;
            return res.status(200).json(result.rows)
        })
        .catch((err) => { return res.status(500).json(err) })
})

router.get('/checkactive', (req, res) => {
    knex.raw(`
        SELECT
	        * 
        FROM
	        "workorder" 
        WHERE
	        company = ${req.userData.company} 
	        AND point = ${req.query.point} 
	        AND userid = ${req.userData.id}
            AND counterparty = ${req.query.counterparty}
	        AND status = 'FORMATION'
    `)
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { return res.status(500).json(err) })
});

// Used services
router.post('/manage', (req, res) => {
    req.body.user = req.userData.id;
    req.body.company = req.userData.company;
    knex.raw(`select workorder_management(?)`, [req.body])
        .then(result => { result = result.rows[0].create_invoice_workorder; return res.status(200).json(result) })
        .catch((err) => { return res.status(500).json(err) })
})


router.post('/details/insert', (req, res) => {
    req.body.user = req.userData.id;
    req.body.company = req.userData.company;

    knex.raw('select workorder_insert(?)', [req.body])
        .then(result => { result = result.rows[0].workorder_insert; return res.status(200).json(result) })
        .catch((err) => { return res.status(500).json(err) })
});

router.post('/details/update', (req, res) => {
    const attributes = req.body.attributes === null || req.body.attributes === undefined ? 0 : req.body.attributes;

    if (req.body.accept === true) {
        knex.raw(`update workorder_details
        set accepted_units = ?
        where product = ? and workorder_id = ? and attributes = ?`, [req.body.units, req.body.product, req.body.workorder_id, attributes])
            .then(result => { return res.status(200).json(result.rows) })
            .catch((err) => { return res.status(500).json(err) })
    }
    else {

        knex.raw(`update workorder_details
        set units = ?
        where product = ? and workorder_id = ? and attributes = ?`, [req.body.units, req.body.product, req.body.workorder_id, attributes])
            .then(result => { return res.status(200).json(result.rows) })
            .catch((err) => { return res.status(500).json(err) })
    }
});


router.post('/details/delete', (req, res) => {
    const attributes = req.body.attributes === null || req.body.attributes === undefined ? 0 : req.body.attributes;
    knex.raw(`delete from workorder_details
    where product = ? 
    and workorder_id = ? and attributes = ?`, [req.body.product, req.body.workorder_id, attributes])
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { helpers.log(err); return res.status(500).json(err) })
});


router.post('/details/update/attributes', (req, res) => {

   
    knex.raw(`update workorder_details
    set attributes = ?
    where product = ? and workorder_id = ?`,
        [req.body.attributes, req.body.product, req.body.workorderId])
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { return res.status(500).json(err) })
});

router.get('/item', (req, res) => {
    const workorder_number = req.query.workorder_number.toString();
    knex.raw(`select id, workorder_number, date, company, counterparty, point, status from workorder where workorder_number = ${workorder_number}::varchar`)
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { return res.status(500).json(err) })
});

router.get('/details', (req, res) => {
    knex.raw(`
    WITH cte AS (
        SELECT
            jsonb_agg (
                jsonb_build_object (
                    'id',
                    al."attribute",
                    'name',
                    an."values",
                    'value',
                    al."value",
                    'listcode',
                    al.listcode,
                    'format',
                    an.format 
                ) 
            ) AS attr_json,
            al.listcode,
            al.company 
        FROM
            attrlist al
            INNER JOIN attributenames an ON an."id" = al."attribute" 
        GROUP BY
            al.listcode,
            al.company 
        HAVING
            al.company = ${req.userData.company}
        ORDER BY
            al.listcode DESC 
        ) SELECT
        wd.product,
        pr.code,
        pr."name",
        wd.purchaseprice,
        wd.price,
        wd.wholesale_price,
        wd.counterparty,
        wd.workorder_id,
        wd.units,
        wd.accepted_units,
        wd."attributes",
        wd."status",
        ----06.01.2026
        c.name as counterpartiesname,
        c.sendwhatsapp,
        ----06.01.2026
        cte.attr_json 
    FROM
        "workorder" w
        INNER JOIN workorder_details wd ON wd.workorder_id = w."id"
        INNER JOIN products pr ON pr."id" = wd.product 
        ----06.01.2026
        LEFT JOIN counterparties c on (wd.counterparty=c.id) 
        ----06.01.2026
        AND w.company = pr.company
        LEFT JOIN cte ON cte.listcode = wd."attributes" 
    WHERE
	w.company = ${req.userData.company} 
	AND w."id" = ${req.query.workorderId}
    `)
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { helpers.log(err); return res.status(500).json(err) })
});

router.get('/details/grouped', (req, res) => {
    knex.raw(`
    SELECT
	wd.product,
	pr.code,
	pr."name",
	wd.purchaseprice,
	wd.price,
	wd.wholesale_price,
	wd.counterparty,
	SUM ( wd.units ) AS units,
    SUM ( wd.accepted_units ) AS accepted_units,
    w.workorder_number,
    w.date
FROM
	"workorder" w
	INNER JOIN workorder_details wd ON wd.workorder_id = w."id"
	INNER JOIN products pr ON pr."id" = wd.product 
	AND w.company = pr.company 
WHERE
	w.company = ${req.userData.company} 
	AND w.status = 'INPROCESS' 
GROUP BY
	wd.counterparty,
	wd.product,
	pr."name",
	pr.code,
	wd.purchaseprice,
	wd.price,
    wd.wholesale_price,
    w.workorder_number,
    w.date
    `)
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { helpers.log(err); return res.status(500).json(err) })
});

router.get('/details/product', (req, res) => {
    knex.raw(`
    SELECT
	w."id" AS workorder_id,
	wd.product,
	pr.code,
	pr."name",
	wd.counterparty,
	wd.units,
    wd.accepted_units,
	w.point,
	pt."name" AS point_name
FROM
	"workorder" w
	INNER JOIN workorder_details wd ON wd.workorder_id = w."id"
	INNER JOIN products pr ON pr."id" = wd.product
	INNER JOIN pointset pts ON pts.stock = w.point
	INNER JOIN points pt ON pt."id" = pts.point 
	AND w.company = pr.company 
WHERE
	w.status = 'INPROCESS' 
	AND w.company = ${req.userData.company}
	AND wd.product = ${req.query.product}
    `)
        .then(result => {
            result.rows.forEach((el) => {
                el.point_name = helpers.decrypt(el.point_name) === "" ? "Центральный склад" : helpers.decrypt(el.point_name);
            });
            return res.status(200).json(result.rows)
        })
        .catch((err) => {
            helpers.log(err); return res.status(500).json(err)
        })
});


router.post('/details/update/units', (req, res) => {
    knex.raw(`select workorder_details_update(?)`, [req.body])
        .then(result => { //result = result.rows[0].workorder_details_update; 
            return res.status(200).json(result)
        })
        .catch((err) => { helpers.log(err); return res.status(500).json(err) })
});

router.post('/details/attributes/update', (req, res) => {
    req.body.company = req.userData.company;
    knex.raw(`select workorder_details_attributes(?)`, [req.body])
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { return res.status(500).json(err) })
});


router.post("/invoice", (req, res) => {
    req.body.user = req.userData.id;
    req.body.company = req.userData.company;
    knex.raw('select create_invoice_workorder(?)', [req.body])
        .then(result => {
            result = result.rows[0].create_invoice_workorder;
            return res.status(200).json(result)
        }).catch((err) => {
            return res.status(500).json(err);
        });
});

router.post('/update/status', (req, res) => {
    const ids = req.body.workorder_id;
    req.body.company = req.userData.company;
    knex.raw('select workorder_update_status(?)', [req.body])
        .then(result => {
            return res.status(200).json(result.rows)
        }).catch((err) => {
            helpers.log(err);
            return res.status(500).json(err);
        });
})

router.post("/excel/report", (req, res) => {

    const body = req.body;
    
    const id = body.workorderProducts[0].workorder_id; 
    
    
    const workorder_number = body.workorderProducts[0].workorder_number;
    const date = body.workorderProducts[0].date;
    
    
    
    const styles = {
        headerDark: {
            font: {
              color: {
                rgb: 'FF000000'
              },
              sz: 12,
              bold: true,
              underline: true
            }
        },
        headerInTable: {
            font: {
                color: {
                    rgb: "FF000000",
                },
                sz: 10,
                bold: true,
            },
            alignment: {
                horizontal: "center",
            },
            border: {
                top: {
                    style: 'thin', 
                    color: { rgb: "FF000000" } 
                },
                bottom: {
                    style:'thin', 
                    color: { rgb: "FF000000" } 
                },
                left: {
                    style: 'thin',  
                    color: { rgb: "FF000000" } 
                },
                right: {
                    style: 'thin',  
                    color: { rgb: "FF000000" } 
                },
            }
        },
        bodyInTable: {
            
            font: {
                color: {
                    rgb: "FF000000",
                },
                sz: 10,
                bold: false,
            }, 
            border: {
                top: {
                    style: 'thin', 
                    color: { rgb: "FF000000" } 
                },
                bottom: {
                    style:'thin', 
                    color: { rgb: "FF000000" } 
                },
                left: {
                    style: 'thin',  
                    color: { rgb: "FF000000" } 
                },
                right: {
                    style: 'thin',  
                    color: { rgb: "FF000000" } 
                },
            }
        },
        headerCompanyCounterparty: {
            font: {
                color: {
                    rgb: "FF000000",
                },
                sz: 12,
                bold: false
            }
        },
        bodyCompanyCounterparty: {
            font: {
                color: {
                    rgb: "FF000000",
                },
                sz: 12,
                bold: true,
                width: 20
            }
        },
        headerResponsible : {
            font: {
                color: {
                    rgb: "FF000000",
                },
                sz: 10,
                bold: false,
                underline: true
            }
        },
        nds : {
            font: {
                color: {
                    rgb: "FF000000",
                },
                sz: 12,
                bold: true,
                outline: true
            }
        },
        emptyCell: {}
    };
    
   
    // Добавление и вычисление полей "сумма", "номер", "шт"
    
    let j = 1;
    for (f of body.workorderProducts) {
        f.number = j;
        f.items = "шт";
        j++;
    }
    
    
    const specification = {
            number: {
                displayName: '№',
                headerStyle: styles.headerInTable,
                width: "3",
                cellStyle: styles.bodyInTable,
    
            },
            barcode: {
                displayName: "Штрих-код",
                headerStyle: styles.headerInTable,
                width: "12", // <- width in chars (when the number is passed as string)
                cellStyle: styles.bodyInTable,
            },
            name: {
                displayName: "Наименование",
                headerStyle: styles.headerInTable,
                width: "20", // <- width in chars (when the number is passed as string)
                cellStyle: styles.bodyInTable,
            },
            units: {
                displayName: "Количество проданных, шт.",
                headerStyle: styles.headerInTable,
                width: "12", // <- width in chars (when the number is passed as string)
                cellStyle: styles.bodyInTable,
            },
        
            total_price: {
                displayName:"Полная стоимость",
                headerStyle: styles.headerInTable,
                width: "6",
                cellStyle: styles.bodyInTable,
            }
        };
    
        // Вычисление суммы, НДС и количества 
        let total = 0;
        let i = 0;
        let nds = 0;
        for(f of body.workorderProducts) {
            total += f.total_price;
            i++;
        }
        
        nds += total* 30/100;
    
        // Для отображения суммы словами
        let price_text = total.toString();
    
        
        let tenge = null;
        let tiin = null;
        
        /*    
        if (price_text.indexOf('.') === -1) 
        {
            tenge = price_text.substring(0);
            tiin = 'ноль тиын';
        }
        else
        {
            tenge = price_text.substring(0,price_text.indexOf('.'));
            tiin = price_text.substring(price_text.indexOf('.')+1);
            
            tiin = rubles(tiin);
            tiin = tiin.replace('00 копеек','');
            tiin = tiin.replace('рубль','тиын');
            tiin = tiin.replace('рубля','тиын');
            tiin = tiin.replace('рублей','тиын');
            tiin = tiin.replace('рубль','тиын');
        
        }	
        
        
        tenge = rubles(tenge);ge = rubles(tenge);
        
        tenge = tenge.replace('00 копеек','');
        tenge = tenge.replace('рубль','тенге');
        tenge = tenge.replace('рубля','тенге');
        tenge = tenge.replace('рублей','тенге');
        tenge = tenge.replace('рубль','тенге');
        
        tenge = tenge[0].toUpperCase() + tenge.substring(1);
        */
    
	
	//////05.10.2023
  
  let val="";
//   let curr = JSON.parse(helpers.decrypt(req.userData.locales));
  let curr = JSON.parse(req.userData.locales);

	 if (curr == null)
 {
	 val="KZT"; 
 }  
  else
  {    
val=curr.LC_MONETARY;
  }
 
 
  //////05.10.2023
    
        const heading = [
            [],
            [{value:`Заказ поставщику № ${workorder_number.toString()} от ${date.toString().slice(0,10)} г.`, style: styles.headerDark}],
            [],
     
            
            [{value:'Поставщик:',style: styles.headerCompanyCounterparty},'',{value: `${body.counterparty}`,style: styles.bodyCompanyCounterparty},'',
       
		//////05.10.2023	
        //{value:'Итого:',style: styles.bodyCompanyCounterparty},{value:`${total} тг.`,style: styles.bodyCompanyCounterparty}],
		{value:'Итого:',style: styles.bodyCompanyCounterparty},{value:`${total} `+val,style: styles.bodyCompanyCounterparty}],		
		//////05.10.2023
            [{value:'Компания:',style: styles.headerCompanyCounterparty},'',{value: body.company,style: styles.bodyCompanyCounterparty},'',
		//////05.10.2023	
        //{value:'В том числе НДС:',style: styles.bodyCompanyCounterparty},{value:`${nds} тг.`,style: styles.bodyCompanyCounterparty}],
		{value:'В том числе НДС:',style: styles.bodyCompanyCounterparty},{value:`${nds} `+val,style: styles.bodyCompanyCounterparty}],
        //////05.10.2023
            
            [],
            
			//////05.10.2023
            //[{value:`Всего наименований ${i} на сумму ${total} тг`,style: styles.headerCompanyCounterparty}],
			[{value:`Всего наименований ${i} на сумму ${total} `+val,style: styles.headerCompanyCounterparty}],
			//////05.10.2023
			
            //[{value:`${tenge}${tiin}`,style: styles.headerDark}],
            [{value:``,style: styles.headerDark}],
            [],
            [{value:'Ответственный:',style: styles.bodyCompanyCounterparty},'',{value: body.user_name,style: styles.headerResponsible}],
            []
         
            
          ];
    
          const footer = [
            
			
			//////05.10.2023
            //[`Итого: ${total} тг.`],
            //[`Всего наименований ${i} на сумму ${total} тг.`]
			[`Итого: ${total} `+val],
            [`Всего наименований ${i} на сумму ${total} `+val]		
          //////05.10.2023	
			
          ];
          
         
           
    const merges = [
        { start: { row: 2, column: 1}, end: { row: 2, column: 5} },
        { start: { row: 4, column: 1 }, end: { row: 4, column: 2 } },
        { start: { row: 4, column: 3 }, end: { row: 4, column: 4 } },
        { start: { row: 5, column: 1 }, end: { row: 5, column: 2} },
        { start: { row: 5, column: 3 }, end: { row: 5, column: 4} },
        { start: { row: 10, column: 1 }, end: { row:10, column: 2} },
        { start: { row: 10, column: 4 }, end: { row: 10, column: 5} }
    
    ];
        
    
        const report = excel.buildExport([
            {
                name: "Заказ-наряд",
                heading: heading,
                merges:merges,
                specification: specification,
                footing: footer,
                data: body.workorderProducts, 
                
            },
        ]);
            
            res.attachment("report.xlsx");
            
            return res.send(report);
        });
    
// 

// Unused services
router.post('/insert', (req, res) => {

    const product = req.body.product;
    const company = req.body.company;
    const attributes = req.body.attributes === null || req.body.attributes === undefined ? 0 : req.body.attributes;

    const point = knex('pointset')
        .where('stock', '=', req.body.point)
        .select('point');

    const price = knex("prices")
        .where("product", '=', product)
        .andWhere('point', '=', point)
        .andWhere('company', '=', company)
        .andWhere('type', '=', 1)
        .select("price")
        ;

    const purchaseprice = knex("prices")
        .where("product", '=', product)
        .andWhere('point', '=', point)
        .andWhere('company', '=', company)
        .andWhere('type', '=', 0)
        .select("price")
        ;

    knex.raw(`insert into workorder_details
        (product, price, units, workorder_id, attributes,purchaseprice)
        values  
        (?,?,?,?,?,?)`, [product, price, req.body.units, req.body.workorder_id, attributes, purchaseprice])
        .then(result => {
            return res.status(200).json(result)
        }).catch((err) => {
            helpers.log(err);
            return res.status(500).json(err)
        })
});
router.post('details/manage', (req, res) => {
    req.body.user = req.userData.id;
    req.body.company = req.userData.company;
    knex.raw(`select workorderdetails_management(?)`, [req.body])
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { return res.status(500).json(err) })
})

router.post('/update', (req, res) => {
    if (req.body.status === 'ACCEPTED') {
        req.body.user = req.userData.id;
        knex.raw(`update workorder
        set status = upper(?), accept_user = ?, accept_date = current_timestamp 
        where workorder_number = ?`, [req.body.status, req.body.user, req.body.workorderNumber])
            .then(result => { return res.status(200).json(result.rows) })
            .catch((err) => { return res.status(500).json(err) })
    }
    else {
        knex.raw(`update workorder 
        set status = upper(?)
        where workorder_number = ?`, [req.body.status, req.body.workorderNumber])
            .then(result => { return res.status(200).json(result.rows) })
            .catch((err) => { return res.status(500).json(err) })
    }

})

router.post('/delete', (req, res) => {
    req.body.user = req.userData.id;
    req.body.company = req.userData.company;
    knex.raw('delete from workorder where id = ?', [req.body.workorderId])
        .then(result => { return result.rowCount > 0 ? res.status(200).json(result.rows) : res.status(200).json('{"result": "The deleted element was not found"}') })
        .catch((err) => { return res.status(500).json(err) })
});

router.get('/searchproduct', (req, res) => {
    const company = req.userData.company;
    const barcode = req.query.barcode === undefined || req.query.barcode === null ? '' : req.query.barcode;
    const productName = req.query.productName === undefined || req.query.productName === null ? '' : req.query.productName;
    knex.raw(`SELECT
	pr."id",
	pr.code,
	pr."name",
	pc.price,
    pc.counterparty 
FROM
	products pr
	LEFT JOIN prices pc ON pr."id" = pc.product AND pc."type" = 0 
WHERE
	pr.company = ${company} 
	AND pr."name" ILIKE'%${productName}%'
	AND pr.code = '${barcode}'
    AND pr.deleted = false`)
        .then(result => { return res.status(200).json(result.rows) })
        .catch((err) => { helpers.log(err); return res.status(500).json(err) })
});
//
module.exports = router;