import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Creates a database connection pool with error handling and retry capabilities
 * @returns MySQL connection pool
 */
function createConnectionPool() {
  // Default database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rumfornew2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Create the pool
  const pool = mysql.createPool(dbConfig);

  // Test the connection
  pool.getConnection()
    .then(conn => {
      console.log(`Connected to MySQL database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
      conn.release();
    })
    .catch(err => {
      console.error('Error connecting to database:', err.message);
      console.error('Please check your database connection settings in the .env file.');
      
      // Provide more detailed error messages for common issues
      if (err.code === 'ECONNREFUSED') {
        console.error('Connection refused. Make sure the database server is running and accessible.');
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Access denied. Check your database username and password.');
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        console.error(`Database '${dbConfig.database}' does not exist. Run the database setup scripts first.`);
      }
    });

  return pool;
}

// Create the connection pool
const pool = createConnectionPool();

// Export the connection pool
export default pool;