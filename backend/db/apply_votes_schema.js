const fs = require('fs');
const path = require('path');
const mariadb = require('mariadb');

async function applyVotesSchema() {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  console.log('Connecting to database with:', {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    const sqlPath = path.join(__dirname, 'votes_schema_update.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying votes schema updates...');
    const result = await conn.query(sql);
    console.log('Votes schema updated successfully!');
    return result;
  } catch (err) {
    console.error('Error updating votes schema:', err);
    throw err;
  } finally {
    if (conn) {
      conn.end();
    }
  }
}

// Run the function directly if this script is executed directly
if (require.main === module) {
  applyVotesSchema()
    .then(() => {
      console.log('Schema update completed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to update schema:', err);
      process.exit(1);
    });
}

module.exports = { applyVotesSchema };
