const knex = require("../../db/knex");

// {"company":"112", "id" : "1", "customerType": "0", "debt" : 500, "user":5, "system": "ERP"}
writeoffDebt = async (company, id, customerType, debt, user, system) => {
    // const company = req.userData.company;
    // const id = req.body.writeoff_debt_customers.id;
    // const debt = req.body.writeoff_debt_customers.debt;
    // const userid = req.body.writeoff_debt_customers.user;
    // const sys = req.body.writeoff_debt_customers.system;
    // const customerType = 
    // // const sys1 = 'POS';
    // // const sys2 = 'ERP';
    // // helpers.serverLog(req.originalUrl, req.body);
    // // if (sys.localeCompare(sys1) == 0 | sys.localeCompare(sys2) == 0) {
    if (system != 'POS' & system != 'ERP') {
        return json({"code": "error", "text": "Признак системы отправления не опознан!", "text_eng": "System is not recognised!"});
    }
    if (customerType == 0) {
        await knex("fiz_customers")
            .where({
                "id":id
            })
            .select("debt")
            .then((result) => {
                if (result.debt < debt) {
                    return json({"code": "error", "text": "Сумма списания превосходит сумму долга!", "text_eng": "Writeoff amount exceeds debt balance!"});
                }
            })
            .catch((err) => {
                helpers.simpleLog("external.js", "writeoff_debt", JSON.stringify(err));
            });
        return await knex.transaction(async (trx) => {
            await knex
            .raw(
                `
                UPDATE fiz_customers
                        SET debt = debt - ${debt}
                            WHERE id = ${id}
                                AND company = ${company}
                `
            )
            .transacting(trx)
            .then(async () => {
                return await knex.raw(
                    `
                    INSERT INTO debtorsdiary(customer,type,debt,date,company,"user","system", customertype)
                        VALUES(${id},-1,${debt}*-1,now(),${company},${user},'${system}',0);
                    `
                )
            .transacting(trx)
            })
            .then(trx.commit)
            .catch(trx.rollback)
            .then((result) => {
                // let jsonresult = {"code": "success", "result": result};
                return result ;
            })
            .catch((err) => {
                helpers.serverLog(req.originalUrl, err, "error");
                console.log(err);
                return err;
            });
        });    

    } else if (customerType == 1) {
        await knex("customers")
            .where({
                "id":id
            })
            .select("debt")
            .then((result) => {
                if (result.debt < debt) {
                    return json({"code": "error", "text": "Сумма списания превосходит сумму долга!", "text_eng": "Writeoff amount exceeds debt balance!"});
                }
            })
            .catch((err) => {
                helpers.simpleLog("external.js", "writeoff_debt", JSON.stringify(err));
            });
        return await knex.transaction(async (trx) => {
            await knex
            .raw(
                `
                UPDATE customers
                        SET debt = debt - ${debt}
                            WHERE id = ${id}
                                AND company = ${company}
                `
            )
            .transacting(trx)
            .then(async () => {
                return await knex.raw(
                    `
                    INSERT INTO debtorsdiary(customer,type,debt,date,company,"user","system", customertype)
                        VALUES(${id},-1,${debt}*-1,now(),${company},${user},'${system}',1);
                    `
                )
            .transacting(trx)
            })
            .then(trx.commit)
            .catch(trx.rollback)
            .then((result) => {
                // let jsonresult = {"code": "success", "result": result};
                return result ;

            })
            .catch((err) => {
                helpers.serverLog(req.originalUrl, err, "error");
                console.log(err);
                return err;
            });
        });
    } else {
        return json({"code": "error", "text_eng": "Need to provide clientType (0 for individuals or 1 for companies"});
    };
};
    

module.exports = {
    writeoffDebt,
};