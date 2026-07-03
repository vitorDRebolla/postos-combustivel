const express = require('express');
const cors = require('cors');
const postosRoutes = require('./routes/postos');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/postos', postosRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

module.exports = app;
