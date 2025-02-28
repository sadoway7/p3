const express = require('express');
const cors = require('cors');
const pool = require('./dist/db/connection');

const app = express();
const port = 3001;

// Middlewares
app.use(express.json());
app.use(cors());

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 as test');
    connection.release();
    res.json({ message: 'Database connection successful', data: rows });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// API routes
app.get('/api/communities', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    // Try both singular and plural table names
    let rows;
    try {
      [rows] = await connection.query('SELECT * FROM community');
    } catch (err) {
      // If singular name fails, try plural
      [rows] = await connection.query('SELECT * FROM communities');
    }
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ error: 'Failed to fetch communities', details: error.message });
  }
});

// Auth test endpoint
app.get('/api/auth/me', (req, res) => {
  // A simple mocked response for testing
  res.json({
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Backend test server is running on http://localhost:${port}`);
});