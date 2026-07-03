const pool = require('../db');
const { sanitize } = require('./sanitizer');

async function upsertBandeira(client, nome) {
  await client.query(
    'INSERT INTO bandeiras (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING',
    [nome]
  );
  const { rows } = await client.query('SELECT id FROM bandeiras WHERE nome = $1', [nome]);
  return rows[0].id;
}

async function upsertResponsavel(client, data) {
  await client.query(
    `INSERT INTO responsaveis (cpf, nome, email, cargo)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cpf) DO UPDATE SET nome = $2, email = $3, cargo = $4`,
    [data.cpf_responsavel, data.nome_responsavel, data.email_responsavel, data.cargo_responsavel]
  );
  const { rows } = await client.query('SELECT id FROM responsaveis WHERE cpf = $1', [data.cpf_responsavel]);
  return rows[0].id;
}

async function upsertPosto(client, data, bandeira_id, responsavel_id) {
  const { rows } = await client.query(
    `INSERT INTO postos (
      cnpj, nome_posto, nome_fantasia, bandeira_id, logradouro, numero, complemento,
      bairro, municipio, uf, cep, responsavel_id, status, data_inauguracao,
      numero_bicos, numero_pistas, observacoes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    ON CONFLICT (cnpj) DO UPDATE SET
      nome_posto = $2, nome_fantasia = $3, bandeira_id = $4, logradouro = $5,
      numero = $6, complemento = $7, bairro = $8, municipio = $9, uf = $10,
      cep = $11, responsavel_id = $12, status = $13, data_inauguracao = $14,
      numero_bicos = $15, numero_pistas = $16, observacoes = $17
    RETURNING id`,
    [
      data.cnpj, data.nome_posto, data.nome_fantasia, bandeira_id,
      data.logradouro, data.numero, data.complemento, data.bairro,
      data.municipio, data.uf, data.cep, responsavel_id, data.status,
      data.data_inauguracao, data.numero_bicos, data.numero_pistas, data.observacoes,
    ]
  );
  return rows[0].id;
}

async function syncCombustiveis(client, postoId, combustiveis) {
  await client.query('DELETE FROM posto_combustiveis WHERE posto_id = $1', [postoId]);

  for (const nome of combustiveis) {
    await client.query(
      'INSERT INTO combustiveis (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING',
      [nome]
    );
    const { rows } = await client.query('SELECT id FROM combustiveis WHERE nome = $1', [nome]);
    await client.query(
      'INSERT INTO posto_combustiveis (posto_id, combustivel_id) VALUES ($1, $2)',
      [postoId, rows[0].id]
    );
  }
}

async function importRows(rows) {
  const imported = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const result = sanitize(rows[i]);

    if (!result.valid) {
      skipped.push({ line, cnpj: rows[i].cnpj || '', errors: result.errors });
      continue;
    }

    const data = result.data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const bandeira_id = await upsertBandeira(client, data.bandeira);
      const responsavel_id = await upsertResponsavel(client, data);
      const postoId = await upsertPosto(client, data, bandeira_id, responsavel_id);
      await syncCombustiveis(client, postoId, data.combustiveis);

      await client.query('COMMIT');
      imported.push({ line, cnpj: data.cnpj });
    } catch (err) {
      await client.query('ROLLBACK');
      skipped.push({ line, cnpj: data.cnpj, errors: [err.message] });
    } finally {
      client.release();
    }
  }

  return {
    imported: imported.length,
    skipped: skipped.length,
    details: { imported, skipped },
  };
}

module.exports = { importRows };
