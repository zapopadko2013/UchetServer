const knex = require('../../db/knex');
const fetch = require('node-fetch');

async function setData(params) {
    return fetch("https://awp.kz/import-products?p=W79FDOT7AK", {
        method: 'POST',
        headers: {
            Accept: 'application/json','Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    }).then(json => json.json())
    .then(json => console.log("[Fetch Json]:", json))
    .catch(err => console.error("[Fetch Error]:", err));
}

var d = new Date();	

console.log('ИП Арон - выгрузка ('+d+')');

knex.raw(`
    select json_agg(json_build_object(
        'name',name, 'sku', code, 'stock', units, 'price', price 
        )
    ) as data 
    from stockcurrent s
    LEFT JOIN storeprices sp on (sp.stock = s.id)
    LEFT JOIN products p on (p.id = s.product)
    where s.company = 546 and s.point = 1892
`).then((result) => {

    setTimeout(function(){}, 1000);

    let res = setData(result.rows[0].data);
    console.log(res);

}).catch(err => {
    console.log('Возникла ошибка : '+err);
}).finally(function() {
    knex.destroy();
});
