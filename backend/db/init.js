import mariadb from 'mariadb';
import fs from 'fs';
import path from 'path';

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

async function initializeDatabase() {
    let conn;
    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Get connection from pool
        conn = await pool.getConnection();
        
        // Execute schema
        await conn.query(schema);
        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        if (conn) conn.end();
    }
}

initializeDatabase();
