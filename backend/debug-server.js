const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Enable detailed CORS logging
const corsOptions = {
  origin: function (origin, callback) {
    console.log('Request origin:', origin);
    callback(null, true);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ 
    message: 'Backend API is working', 
    environment: process.env.NODE_ENV,
    host: req.headers.host,
    origin: req.headers.origin
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Debug backend server running');
});

// Start server on all interfaces (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
  console.log(`Debug server listening at http://0.0.0.0:${port}`);
  console.log('Environment variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('HOST:', process.env.HOST);
  console.log('PORT:', process.env.PORT);
  console.log('BACKEND_URL:', process.env.BACKEND_URL);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
});