const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const offerRoutes = require('./routes/offer');
const leadsRoutes = require('./routes/leads');
const scoringRoutes = require('./routes/scoring');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', offerRoutes);
app.use('/api', leadsRoutes);
app.use('/api', scoringRoutes);

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Lead Scoring Backend API',
    version: '1.0.0',
    description: 'AI-powered lead scoring system combining rule-based logic with AI reasoning',
    endpoints: {
      'POST /api/offer': 'Accept product/offer details',
      'POST /api/leads/upload': 'Upload CSV file with lead data',
      'POST /api/score': 'Run scoring pipeline on uploaded leads',
      'GET /api/results': 'Retrieve scored leads with reasoning',
      'GET /api/results/export': 'Export results as CSV (bonus)',
      'GET /health': 'Health check endpoint'
    },
    documentation: 'See README.md for detailed usage instructions'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Please upload a file smaller than 10MB.'
    });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.originalUrl} not found`,
    availableEndpoints: {
      'POST /api/offer': 'Accept product/offer details',
      'POST /api/leads/upload': 'Upload CSV file with lead data',
      'POST /api/score': 'Run scoring pipeline on uploaded leads',
      'GET /api/results': 'Retrieve scored leads with reasoning'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Lead Scoring Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Base URL: http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;