// Script to fix the community_join_request table issue
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

// Get database connection info from environment or use defaults
const DB_HOST = process.env.DB_HOST || '192.168.0.139';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'rumfornew2';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Oswald1986!';
const DB_DATABASE = process.env.DB_DATABASE || 'rumfornew2';

const pool = mariadb.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    connectionLimit: 5
});

async function applyFix() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log(`Connected to database ${DB_DATABASE}!`);

        // Check if community_join_request exists
        console.log('Checking for community_join_request table...');
        const singularTableExists = await checkTableExists(conn, 'community_join_request');
        
        // Check if community_join_requests exists
        console.log('Checking for community_join_requests table...');
        const pluralTableExists = await checkTableExists(conn, 'community_join_requests');

        if (singularTableExists && !pluralTableExists) {
            // The singular form exists but not the plural - rename it
            console.log('Renaming community_join_request to community_join_requests...');
            await conn.query('RENAME TABLE community_join_request TO community_join_requests');
            console.log('Table renamed successfully!');
        } else if (!singularTableExists && !pluralTableExists) {
            // Neither exists - create the plural form
            console.log('Creating community_join_requests table...');
            await createJoinRequestsTable(conn);
            console.log('Table created successfully!');
        } else if (pluralTableExists) {
            console.log('community_join_requests table already exists, no changes needed.');
        }

        console.log('Fix applied successfully!');
    } catch (err) {
        console.error('Error applying fix:', err);
    } finally {
        if (conn) {
            conn.end();
        }
    }
}

async function checkTableExists(conn, tableName) {
    try {
        const rows = await conn.query(`
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name = ?
        `, [tableName]);
        
        return rows[0].count > 0;
    } catch (err) {
        console.error(`Error checking if table ${tableName} exists:`, err);
        return false;
    }
}

async function createJoinRequestsTable(conn) {
    const sql = `
    CREATE TABLE community_join_requests (
        id VARCHAR(36) PRIMARY KEY,
        community_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (community_id, user_id),
        FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    )`;
    
    await conn.query(sql);
}

// Run the fix
applyFix();