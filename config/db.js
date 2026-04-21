const mysql = require('mysql2/promise');
require('dotenv').config();

// Creamos el Pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: true
    }
});

// Verificación rápida de conexión
pool.getConnection()
    .then(conn => {
        console.log('✅ Conexión a la base de datos establecida (Pool).');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Error al conectar con la base de datos:', err);
    });

module.exports = pool;