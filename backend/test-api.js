const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Database connection
const createConnection = async () => {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
};

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

// Get all communities
app.get('/api/communities', async (req, res) => {
  try {
    const conn = await createConnection();
    const [communities] = await conn.query('SELECT * FROM community');
    await conn.end();
    res.json(communities);
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Get a single community
app.get('/api/communities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await createConnection();
    const [communities] = await conn.query('SELECT * FROM community WHERE id = ?', [id]);
    await conn.end();
    
    if (communities.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    
    res.json(communities[0]);
  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({ error: 'Failed to fetch community' });
  }
});

// Get community members
app.get('/api/communities/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await createConnection();
    const [members] = await conn.query(
      `SELECT cm.*, u.username 
       FROM community_member cm
       JOIN user u ON cm.user_id = u.id
       WHERE cm.community_id = ?`, 
      [id]
    );
    await conn.end();
    res.json(members);
  } catch (error) {
    console.error('Error fetching community members:', error);
    res.status(500).json({ error: 'Failed to fetch community members' });
  }
});

// Get community rules
app.get('/api/communities/:id/rules', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await createConnection();
    const [rules] = await conn.query('SELECT * FROM community_rule WHERE community_id = ?', [id]);
    await conn.end();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching community rules:', error);
    res.status(500).json({ error: 'Failed to fetch community rules' });
  }
});

// Get community settings
app.get('/api/communities/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await createConnection();
    const [settings] = await conn.query('SELECT * FROM community_setting WHERE community_id = ?', [id]);
    await conn.end();
    
    if (settings.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json(settings[0]);
  } catch (error) {
    console.error('Error fetching community settings:', error);
    res.status(500).json({ error: 'Failed to fetch community settings' });
  }
});

// Get posts for a community
app.get('/api/posts', async (req, res) => {
  try {
    const { communityId } = req.query;
    
    if (!communityId) {
      return res.status(400).json({ error: 'Community ID required' });
    }
    
    const conn = await createConnection();
    const [posts] = await conn.query(
      `SELECT p.*, u.username 
       FROM post p
       JOIN user u ON p.user_id = u.id
       WHERE p.community_id = ?
       ORDER BY p.created_at DESC`, 
      [communityId]
    );
    await conn.end();
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Auth/me mock endpoint
app.get('/api/auth/me', (req, res) => {
  // Return a mock user for testing
  res.json({
    id: '123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  });
});

// Activity mock endpoint
app.get('/api/activity/community/:id', (req, res) => {
  // Return empty activity array 
  res.json([]);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
});