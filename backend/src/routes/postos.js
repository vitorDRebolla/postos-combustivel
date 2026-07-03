const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const { importRows } = require('../services/importer');
const pool = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const LIST_QUERY = `
  SELECT
    p.cnpj,
    p.nome_posto,
    p.nome_fantasia,
    b.nome         AS bandeira,
    p.logradouro,
    p.numero,
    p.complemento,
    p.bairro,
    p.municipio,
    p.uf,
    p.cep,
    r.cpf          AS cpf_responsavel,
    r.nome         AS nome_responsavel,
    r.email        AS email_responsavel,
    r.cargo        AS cargo_responsavel,
    STRING_AGG(c.nome, ', ' ORDER BY c.nome) AS combustiveis,
    p.status,
    p.data_inauguracao,
    p.numero_bicos,
    p.numero_pistas,
    p.observacoes,
    p.criado_em
  FROM postos p
  JOIN bandeiras b    ON b.id = p.bandeira_id
  JOIN responsaveis r ON r.id = p.responsavel_id
  LEFT JOIN posto_combustiveis pc ON pc.posto_id = p.id
  LEFT JOIN combustiveis c        ON c.id = pc.combustivel_id
  GROUP BY p.id, b.nome, r.cpf, r.nome, r.email, r.cargo
  ORDER BY p.criado_em DESC
`;

const CSV_COLUMNS = [
  'cnpj', 'nome_posto', 'nome_fantasia', 'bandeira', 'logradouro', 'numero',
  'complemento', 'bairro', 'municipio', 'uf', 'cep', 'cpf_responsavel',
  'nome_responsavel', 'email_responsavel', 'cargo_responsavel', 'combustiveis',
  'status', 'data_inauguracao', 'numero_bicos', 'numero_pistas', 'observacoes',
];

function maskCNPJ(v) {
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function maskCPF(v) {
  return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function maskCEP(v) {
  return v.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

function formatDate(v) {
  if (!v) return '';
  const d = new Date(v);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(row) {
  const values = {
    cnpj: maskCNPJ(row.cnpj),
    nome_posto: row.nome_posto,
    nome_fantasia: row.nome_fantasia,
    bandeira: row.bandeira,
    logradouro: row.logradouro,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
    municipio: row.municipio,
    uf: row.uf,
    cep: maskCEP(row.cep),
    cpf_responsavel: maskCPF(row.cpf_responsavel),
    nome_responsavel: row.nome_responsavel,
    email_responsavel: row.email_responsavel,
    cargo_responsavel: row.cargo_responsavel,
    combustiveis: row.combustiveis,
    status: row.status,
    data_inauguracao: formatDate(row.data_inauguracao),
    numero_bicos: row.numero_bicos,
    numero_pistas: row.numero_pistas,
    observacoes: row.observacoes,
  };
  return CSV_COLUMNS.map(col => escapeCSV(values[col])).join(',');
}

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

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(LIST_QUERY);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar postos', detail: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const { rows } = await pool.query(LIST_QUERY);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="postos.csv"');

    res.write(CSV_COLUMNS.join(',') + '\n');
    for (const row of rows) {
      res.write(rowToCSV(row) + '\n');
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao exportar postos', detail: err.message });
  }
});

module.exports = router;
