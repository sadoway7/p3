// backend/db/apply_community_updates.js
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: '192.168.0.139',
    port: 3306,
    user: 'root',
    password: 'Oswald1986!',
    database: 'rumfor1',
    connectionLimit: 15
});

async function applySchemaUpdates() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to database!');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'community_schema_updates.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        // Split the SQL file into individual statements
        const statements = sql.split(';').filter(statement => statement.trim() !== '');

        // Execute each statement
        for (const statement of statements) {
            await conn.query(statement);
        }

        console.log('Schema updates applied successfully!');
    } catch (err) {
        console.error('Error applying schema updates:', err);
    } finally {
        if (conn) {
            conn.end();
        }
    }
}

applySchemaUpdates();
