const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway Healthy', services: ['court', 'booking'] });
});


const courtProxy = createProxyMiddleware({
  target: process.env.COURT_SERVICE_URL || 'http://court-service:4001',
  changeOrigin: true,
  pathRewrite: { '^/court-api': '/' }, 
  onError: (err, req, res) => res.status(500).json({ error: 'Court Service Down' })
});

const bookingProxy = createProxyMiddleware({
  target: process.env.BOOKING_SERVICE_URL || 'http://booking-service:4002',
  changeOrigin: true,
  pathRewrite: { '^/booking-api': '/' },
  onError: (err, req, res) => res.status(500).json({ error: 'Booking Service Down' })
});

app.use('/court-api', courtProxy);
app.use('/booking-api', bookingProxy);

app.listen(PORT, () => {
  console.log(`🚀 Gateway running on port ${PORT}`);
  console.log(`👉 Court Service via: http://localhost:${PORT}/court-api`);
  console.log(`👉 Booking Service via: http://localhost:${PORT}/booking-api`);
});