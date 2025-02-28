const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  try {
    // Create the connection directly using the .env variables
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log(`Connected to database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in the database:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(tableName);
    });
    
    // Check example data from a community table
    try {
      // Try both singular and plural forms
      let communities;
      try {
        [communities] = await connection.query('SELECT id, name FROM community LIMIT 5');
        console.log("\nUsing singular 'community' table name");
      } catch (err) {
        [communities] = await connection.query('SELECT id, name FROM communities LIMIT 5');
        console.log("\nUsing plural 'communities' table name");
      }
      
      console.log('Sample community data:');
      communities.forEach(community => {
        console.log(`ID: ${community.id}, Name: ${community.name}`);
      });
    } catch (err) {
      console.error('Error accessing community data:', err.message);
    }

    await connection.end();
  } catch (err) {
    console.error('Database error:', err);
  }
}

run();