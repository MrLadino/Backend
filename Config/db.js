const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config(); // Cargar las variables de entorno

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TicProyect',
    port: process.env.DB_PORT || 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probar la conexión
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("✅ Conectado a la base de datos MySQL");
        connection.release();
    } catch (error) {
        console.error("❌ Error al conectar a la base de datos:", error.message);
        process.exit(1);
    }
})();

module.exports = pool;
