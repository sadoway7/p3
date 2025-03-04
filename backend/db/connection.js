const mariadb = require('mariadb');
require('dotenv').config();

// Create a connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rumfornew2',
  connectionLimit: 10
});

// Test the connection
pool.getConnection()
  .then(conn => {
    console.log(`Connected to MariaDB database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    conn.release();
  })
  .catch(err => {
    console.error('Error connecting to database:', err.message);
    console.error('Please check your database connection settings in the .env file.');
    
    if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Make sure the database server is running and accessible.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied. Check your database username and password.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error(`Database '${process.env.DB_NAME}' does not exist. Run the database setup scripts first.`);
    }
  });

// Export the connection pool
module.exports = pool;
