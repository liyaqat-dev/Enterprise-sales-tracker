import express from 'express';
const app = express();
const PORT = 5000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'Enterprise System Operational', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`[Backend]: Monitoring on port ${PORT}`);
});

