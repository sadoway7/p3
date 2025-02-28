// backend/db/init_schema.js
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

async function initSchema() {
    let conn;
    try {
        console.log('Connecting to MariaDB...');
        console.log('Connection details:', {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            database: process.env.DB_NAME
        });
        
        conn = await pool.getConnection();
        console.log('Connected to MariaDB!');
        
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'schema.sql');
        console.log('Reading SQL file from:', sqlFilePath);
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Split the SQL file into individual statements
        const statements = sql.split(';').filter(statement => statement.trim() !== '');
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (const statement of statements) {
            console.log(`Executing: ${statement}`);
            try {
                const result = await conn.query(statement);
                console.log('Statement executed successfully');
            } catch (err) {
                console.error('Error executing statement:', err.message);
                // Continue with the next statement
            }
        }
        
        console.log('Schema initialization completed!');
    } catch (err) {
        console.error('Error initializing schema:', err);
    } finally {
        if (conn) {
            console.log('Closing database connection');
            conn.end();
        }
    }
}

initSchema();
