// Apply comments schema updates to the database
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

async function applyCommentsSchema() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Connected to the database');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'comments_schema_updates.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Split the SQL file into individual statements
    const statements = sql
      .split(';')
      .filter(statement => statement.trim() !== '');

    // Execute each statement
    for (const statement of statements) {
      try {
        await conn.query(statement);
        console.log('Executed statement:', statement.trim().substring(0, 50) + '...');
      } catch (err) {
        console.error('Error executing statement:', statement.trim());
        console.error('Error details:', err);
      }
    }

    console.log('Comments schema updates applied successfully');
  } catch (err) {
    console.error('Error applying comments schema updates:', err);
  } finally {
    if (conn) {
      conn.end();
    }
    process.exit(0);
  }
}

// Run the function
applyCommentsSchema();
