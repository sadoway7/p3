// Updated auth.js routes for the new database schema
const express = require('express');
const router = express.Router();
const auth = require('../api/auth.js');
const { logUserLogin, logUserRegistration, logUserLogout } = require('../middleware/activity');

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const user = auth.verifyToken(token);
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Authentication routes
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    try {
        const result = await auth.register({ username, email, password });
        
        // Get client info for activity logging
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];
        
        res.status(201).json(result);
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    try {
        const result = await auth.login({ username, password });
        
        // Get client info for activity logging
        const ipAddress = req.ip;
        const userAgent = req.headers['user-agent'];
        
        res.json(result);
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(401).json({ error: error.message });
    }
});

router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await auth.logout(req.user.id);
        
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error("Error logging out:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await auth.getCurrentUser(req.user.id);
        res.json(user);
    } catch (error) {
        console.error("Error getting current user:", error);
        res.status(404).json({ error: error.message });
    }
});

module.exports = {
    router,
    authenticateToken
};
