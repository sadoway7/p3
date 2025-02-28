// Script to apply the new database schema to rumfornew2
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const dbConfig = {
  host: '192.168.0.139',
  port: 3306,
  user: 'rumfornew2',
  password: 'Oswald1986!',
  multipleStatements: true // Required for executing multiple SQL statements
};

async function createDatabase() {
  // First connect to MySQL without specifying a database
  const rootConnection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: 'root', // Need root privileges to create database and user
    password: 'Oswald1986!' // Root password
  });

  try {
    console.log('Creating database and user...');
    
    // Drop the database if it exists
    await rootConnection.query(`DROP DATABASE IF EXISTS rumfornew2`);
    
    // Create the database
    await rootConnection.query(`CREATE DATABASE rumfornew2`);
    
    // Check if user exists and create if not
    try {
      await rootConnection.query(`
        CREATE USER 'rumfornew2'@'%' IDENTIFIED BY 'Oswald1986!';
      `);
      
      // Grant privileges
      await rootConnection.query(`GRANT ALL PRIVILEGES ON rumfornew2.* TO 'rumfornew2'@'%'`);
      await rootConnection.query(`FLUSH PRIVILEGES`);
      
      console.log('User created and privileges granted.');
    } catch (error) {
      // User might already exist
      console.log('User already exists or error creating user:', error.message);
      
      // Make sure privileges are granted
      await rootConnection.query(`GRANT ALL PRIVILEGES ON rumfornew2.* TO 'rumfornew2'@'%'`);
      await rootConnection.query(`FLUSH PRIVILEGES`);
      
      console.log('Privileges granted.');
    }
  } finally {
    await rootConnection.end();
  }
}

async function applySchema() {
  // Read the schema file
  const schemaPath = path.join(__dirname, 'simple_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Connect to the new database
  const connection = await mysql.createConnection({
    ...dbConfig,
    database: 'rumfornew2',
    multipleStatements: true
  });
  
  try {
    console.log('Applying schema...');
    
    // Execute the entire schema as a single statement
    await connection.query(schema);
    
    console.log('Schema applied successfully!');
  } catch (error) {
    console.error('Error applying schema:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  try {
    await createDatabase();
    await applySchema();
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

main();
