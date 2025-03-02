// Apply the community table fix to add missing columns
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

async function applyCommunityTableFix() {
  let conn;
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'community_table_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolons to get individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
    
    conn = await pool.getConnection();
    console.log('Connected to the database');
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing: ${statement}`);
      await conn.query(statement);
    }
    
    console.log('Community table fix applied successfully');
    
    // Check if the columns were added
    const result = await conn.query('DESCRIBE community');
    console.log('Current community table structure:');
    result.forEach(column => {
      console.log(`${column.Field}: ${column.Type} ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Default ? `DEFAULT ${column.Default}` : ''}`);
    });
    
    console.log('Community table fix completed');
  } catch (err) {
    console.error('Error applying community table fix:', err);
  } finally {
    if (conn) conn.end();
  }
}

applyCommunityTableFix()
  .catch(err => {
    console.error('Failed to apply community table fix:', err);
    process.exit(1);
  })
  .then(() => {
    console.log('Script completed');
  });