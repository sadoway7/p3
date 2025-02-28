// apply_moderator_schema.js
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10, // Increased connection limit
    connectTimeout: 30000 // Added connection timeout (30 seconds)
});

async function applySchemaUpdates() {
    let conn;
    console.log(`Attempting to connect to database: ${process.env.DB_NAME}`); // Log the database name
    try {
        conn = await pool.getConnection();
        console.log('Connected to database. Applying moderator schema updates...');

        const schemaFilePath = path.join(__dirname, 'moderator_schema_updates.sql');
        const schemaSQL = fs.readFileSync(schemaFilePath, 'utf8');

        // Split by semicolon to execute each statement separately
        const statements = schemaSQL.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await conn.query(statement);
                console.log('Executed SQL statement.');
            }
        }

        console.log('Moderator schema updates applied successfully!');
    } catch (error) {
        console.error('Error applying moderator schema updates:', error);
    } finally {
        if (conn) conn.end();
    }
}

applySchemaUpdates();
