import { Pool } from 'mysql2/promise';

/**
 * MySQL connection pool for database operations
 */
declare const pool: Pool;

export = pool;
