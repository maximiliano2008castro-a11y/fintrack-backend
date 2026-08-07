const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Pool de conexiones a TiDB, preparado para servir tanto en un servidor normal
 * (Render, local) como en funciones serverless (Vercel).
 *
 * Dos cosas importantes para serverless:
 *
 * 1) connectionLimit bajo. En Vercel cada instancia de la funcion tiene su propio
 *    pool. Si dejamos el limite por defecto (10) y hay varias instancias vivas a la
 *    vez, se acaban las conexiones que permite TiDB. Con 2 por instancia alcanza,
 *    porque cada peticion usa una y la suelta enseguida.
 *
 * 2) El pool se guarda en globalThis. Vercel reutiliza el proceso entre peticiones
 *    (invocaciones "tibias"), pero si el modulo se reevaluara crearia otro pool y
 *    dejaria el anterior colgando. Guardarlo aqui garantiza que solo exista uno.
 */
const crearPool = () =>
    mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 4000,

        // TiDB exige TLS
        ssl: {
            rejectUnauthorized: true
        },

        connectionLimit: Number(process.env.DB_POOL_SIZE || 2),
        waitForConnections: true,
        queueLimit: 0,

        // Mantiene viva la conexion TCP para que las peticiones seguidas
        // no paguen el saludo TLS cada vez.
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
    });

if (!globalThis.__fintrackPool) {
    globalThis.__fintrackPool = crearPool();
}

module.exports = globalThis.__fintrackPool;
