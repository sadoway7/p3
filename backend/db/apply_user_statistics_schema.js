const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function applyUserStatisticsSchema() {
  // Read the SQL file
  const sqlFilePath = path.join(__dirname, 'user_statistics_schema.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  // Split the SQL file into individual statements
  // This is a simple approach and might not work for all SQL files
  const statements = sql
    .replace(/DELIMITER \/\//g, '') // Remove DELIMITER statements
    .replace(/END \/\//g, 'END;')   // Replace END // with END;
    .replace(/DELIMITER ;/g, '')    // Remove DELIMITER ; statements
    .split(';')
    .filter(statement => statement.trim() !== '');

  // Create a connection to the database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rumfor',
    multipleStatements: true
  });

  try {
    console.log('Applying user statistics schema...');

    // Execute each statement
    for (const statement of statements) {
      try {
        await connection.query(statement);
        console.log('Executed statement successfully');
      } catch (err) {
        console.error('Error executing statement:', err);
        console.error('Statement:', statement);
      }
    }

    console.log('User statistics schema applied successfully');
  } catch (err) {
    console.error('Error applying user statistics schema:', err);
  } finally {
    await connection.end();
  }
}

// Run the function
applyUserStatisticsSchema().catch(console.error);
