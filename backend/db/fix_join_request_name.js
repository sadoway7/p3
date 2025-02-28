// Script to fix the community_join_request table issue
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

// Database connection configuration (adjust as needed)
const pool = mariadb.createPool({
    host: process.env.DB_HOST || '192.168.0.139',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'rumfornew2',
    password: process.env.DB_PASSWORD || 'Oswald1986!',
    database: process.env.DB_NAME || 'rumfornew2',
    connectionLimit: 5
});

async function fixJoinRequestTable() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('Connected to database!');

        // Check if the table exists
        const [tableExists] = await conn.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'community_join_request'
        `);

        if (tableExists.count === 0) {
            console.log('Table community_join_request does not exist, creating it...');
            
            // Create the table with the correct name
            await conn.query(`
                CREATE TABLE community_join_request (
                    id VARCHAR(36) PRIMARY KEY,
                    community_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending', 
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY (community_id, user_id),
                    FOREIGN KEY (community_id) REFERENCES community(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
                )
            `);
            
            console.log('Table created successfully!');
        } else {
            console.log('Table community_join_request already exists.');
        }

        console.log('Database fix completed successfully!');
    } catch (error) {
        console.error('Error fixing join request table:', error);
    } finally {
        if (conn) {
            await conn.end();
        }
    }
}

// Run the fix
fixJoinRequestTable();