// backend/db/apply_user_auth_schema.js
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5
});

async function applyUserAuthSchema() {
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
        const sqlFilePath = path.join(__dirname, 'user_auth_schema.sql');
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
        
        // Create admin user if it doesn't exist
        const adminId = uuidv4();
        const adminUsername = 'admin';
        const adminEmail = 'admin@example.com';
        const adminPassword = 'Admin123!'; // This should be changed after first login
        
        // Check if admin user already exists
        const [existingAdmin] = await conn.query(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            [adminUsername, adminEmail]
        );
        
        if (!existingAdmin) {
            console.log('Creating admin user...');
            // Hash the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
            
            // Insert admin user
            await conn.query(
                "INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                [adminId, adminUsername, adminEmail, hashedPassword, 'admin']
            );
            
            console.log('Admin user created successfully!');
            console.log('Admin credentials:');
            console.log('Username:', adminUsername);
            console.log('Password:', adminPassword);
            console.log('Please change this password after first login!');
        } else {
            console.log('Admin user already exists, skipping creation.');
        }
        
        console.log('User authentication schema updates applied successfully!');
    } catch (err) {
        console.error('Error applying user authentication schema:', err);
    } finally {
        if (conn) {
            console.log('Closing database connection');
            conn.end();
        }
    }
}

applyUserAuthSchema();
