const mysql = require('mysql2/promise'); 
const dotenv = require('dotenv');

dotenv.config(); // Cargar las variables de entorno

// Crear un pool de conexiones con promesas
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'TicProyect',
    port: process.env.DB_PORT || 3307,
    waitForConnections: true,
    connectionLimit: 10, // Máximo de conexiones simultáneas
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
        process.exit(1); // Salir del proceso si no hay conexión
    }
})();
    
// Exportar el pool para usarlo en otras partes del proyecto
module.exports = pool;
