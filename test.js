const express = require('express');
const app = express();
app.use(express.json());
app.post('/test', (req, res) => res.json({ok: true}));
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});
