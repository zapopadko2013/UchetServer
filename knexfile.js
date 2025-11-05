module.exports = {
    dev: {
        client: 'pg',
        connection: {
            host : 'localhost',
            port: 5432,
            user : 'postgres',
            password : 'postgres',
            database : 'postgres'
        },
        pool: {
            min: 2,
            max: 16
        },
        migrations:{
            directory: __dirname + '/db/migrations'
        },
        seeds:{
            directory: __dirname + '/db/seeds'
        }
    },
    test: {
        client: 'pg',
        connection: {
            host : '192.168.1.21',
            user : 'postgres',
            password : 'postgres1',
            database : 'erp_online'
        },
        pool: {
            min: 2,
            max: 16
        },
        migrations:{
            directory: __dirname + '/db/migrations'
        },
        seeds:{
            directory: __dirname + '/db/seeds'
        }
    },
    prod: {
        client: 'pg',
        connection: {
            host : '192.168.99.11',
            user : 'postgres',
            password : 'uhyjJNHM439768787',
            database : 'erp_online'
        },
        pool: {
            min: 2,
            max: 16
        },
        migrations:{
            directory: __dirname + '/db/migrations'
        },
        seeds:{
            directory: __dirname + '/db/seeds'
        }
    }
}
