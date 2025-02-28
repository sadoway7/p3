// Simple activity endpoint handler that works with singular table names
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5
});

/**
 * @route GET /api/activity/community/:communityId
 * @desc Get activities for a specific community
 */
router.get('/community/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    
    // Extract query parameters
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    
    // Just return minimum data for now
    res.json([]);
  } catch (error) {
    console.error('Error fetching community activities:', error);
    res.status(500).json({ error: 'Failed to fetch community activities' });
  }
});

module.exports = router;