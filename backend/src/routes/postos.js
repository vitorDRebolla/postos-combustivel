const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const { importRows } = require('../services/importer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    const rows = await new Promise((resolve, reject) => {
      parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Arquivo CSV vazio ou sem registros' });
    }

    const result = await importRows(rows);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao processar o arquivo CSV', detail: err.message });
  }
});

module.exports = router;
