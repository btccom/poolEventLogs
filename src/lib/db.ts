import knex = require('knex');

export default knex({
    client: 'mysql',
    connection: {
        host: process.env.MYSQL_HOST,
        port: +process.env.MYSQL_PORT,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DBNAME,
    },
    debug: process.env.APP_DEBUG == 'true',
    pool: {
        min: 0,
        max: 20
    },
});