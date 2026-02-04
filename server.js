/**
 * EarnKaro Affiliate Link Automation API Server
 */

require('dotenv').config();
const express = require('express');
const EarnKaroService = require('./services/earnkaroService');
const { validateUrl, sanitizeUrl } = require('./utils/validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Initialize EarnKaro service
const earnkaroService = new EarnKaroService();
let isServiceReady = false;

// Initialize service on startup
(async () => {
  try {
    console.log('Starting EarnKaro service initialization...');
    await earnkaroService.initialize();
    isServiceReady = true;
    console.log('EarnKaro service ready');
  } catch (error) {
    console.error('Failed to initialize EarnKaro service:', error.message);
    console.error('Server will start but /convert endpoint will not work until service is ready');
  }
})();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'earnkaro-affiliate-api',
    serviceReady: isServiceReady
  });
});

// Main conversion endpoint
app.post('/convert', async (req, res) => {
  try {
    // Check if service is ready
    if (!isServiceReady) {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'EarnKaro service is still initializing. Please try again in a moment.'
      });
    }

    // Extract URL from request body
    const { url } = req.body;

    // Validate URL
    const validation = validateUrl(url);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL',
        message: validation.error
      });
    }

    // Sanitize URL
    const sanitizedUrl = sanitizeUrl(url);

    console.log(`Converting URL: ${sanitizedUrl}`);

    // Convert to affiliate link
    const affiliateLink = await earnkaroService.convertLink(sanitizedUrl);

    // Return success response
    res.json({
      success: true,
      affiliateLink: affiliateLink,
      originalUrl: sanitizedUrl,
      domain: validation.domain
    });

  } catch (error) {
    console.error('Conversion error:', error.message);

    res.status(500).json({
      success: false,
      error: 'Conversion Failed',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await earnkaroService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await earnkaroService.shutdown();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Convert endpoint: POST http://localhost:${PORT}/convert`);
});
