const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitize } = require('./sanitizer');

function validRow(overrides = {}) {
  return {
    cnpj: '11.222.333/0001-81',
    nome_posto: 'Posto Teste',
    nome_fantasia: '',
    bandeira: 'Shell',
    logradouro: 'Rua das Flores',
    numero: '100',
    complemento: '',
    bairro: 'Centro',
    municipio: 'São Paulo',
    uf: 'SP',
    cep: '01310-100',
    cpf_responsavel: '529.982.247-25',
    nome_responsavel: 'João Silva',
    email_responsavel: '',
    cargo_responsavel: '',
    combustiveis: 'Gasolina, Etanol',
    status: 'ativo',
    data_inauguracao: '',
    numero_bicos: '',
    numero_pistas: '',
    observacoes: '',
    ...overrides,
  };
}

test('accepts CNPJ with mask', () => {
  const r = sanitize(validRow({ cnpj: '11.222.333/0001-81' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.cnpj, '11222333000181');
});

test('accepts CNPJ without mask', () => {
  const r = sanitize(validRow({ cnpj: '11222333000181' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.cnpj, '11222333000181');
});

test('rejects CNPJ with wrong check digits', () => {
  const r = sanitize(validRow({ cnpj: '11.222.333/0001-00' }));
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('CNPJ')));
});

test('rejects CNPJ with all same digits', () => {
  const r = sanitize(validRow({ cnpj: '11111111111111' }));
  assert.equal(r.valid, false);
});

test('normalizes scientific notation CNPJ from Excel', () => {
  const r = sanitize(validRow({ cnpj: '1,02346E+13' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.cnpj.length, 14);
  assert.match(r.data.cnpj, /^\d{14}$/);
});

test('same scientific notation always produces same CNPJ', () => {
  const r1 = sanitize(validRow({ cnpj: '1,02346E+13' }));
  const r2 = sanitize(validRow({ cnpj: '1,02346E+13' }));
  assert.equal(r1.data.cnpj, r2.data.cnpj);
});

test('accepts CPF with mask', () => {
  const r = sanitize(validRow({ cpf_responsavel: '529.982.247-25' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.cpf_responsavel, '52998224725');
});

test('rejects invalid CPF', () => {
  const r = sanitize(validRow({ cpf_responsavel: '111.111.111-11' }));
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('CPF')));
});

test('pads 7-digit CEP with leading zero', () => {
  const r = sanitize(validRow({ cep: '1310100' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.cep, '01310100');
});

test('accepts 8-digit CEP with mask', () => {
  const r = sanitize(validRow({ cep: '01310-100' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.cep, '01310100');
});

test('parses date in DD/MM/YYYY format', () => {
  const r = sanitize(validRow({ data_inauguracao: '15/03/2010' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.data_inauguracao, '2010-03-15');
});

test('parses date in YYYY-MM-DD format', () => {
  const r = sanitize(validRow({ data_inauguracao: '2010-03-15' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.data_inauguracao, '2010-03-15');
});

test('accepts empty date', () => {
  const r = sanitize(validRow({ data_inauguracao: '' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.data_inauguracao, null);
});

test('normalizes UF to uppercase', () => {
  const r = sanitize(validRow({ uf: 'sp' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.uf, 'SP');
});

test('rejects invalid UF', () => {
  const r = sanitize(validRow({ uf: 'XX' }));
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('UF')));
});

test('rejects invalid email when provided', () => {
  const r = sanitize(validRow({ email_responsavel: 'nao-e-um-email' }));
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('email')));
});

test('accepts empty email', () => {
  const r = sanitize(validRow({ email_responsavel: '' }));
  assert.equal(r.valid, true);
});

test('rejects missing required fields', () => {
  const r = sanitize(validRow({ nome_posto: '', bandeira: '', status: '' }));
  assert.equal(r.valid, false);
  assert.ok(r.errors.length >= 3);
});

test('trims whitespace from fields', () => {
  const r = sanitize(validRow({ nome_posto: '  Posto Teste  ', bandeira: '  Shell  ' }));
  assert.equal(r.valid, true);
  assert.equal(r.data.nome_posto, 'Posto Teste');
  assert.equal(r.data.bandeira, 'Shell');
});

test('splits combustiveis by comma', () => {
  const r = sanitize(validRow({ combustiveis: 'Gasolina, Etanol, Diesel S10' }));
  assert.equal(r.valid, true);
  assert.deepEqual(r.data.combustiveis, ['Gasolina', 'Etanol', 'Diesel S10']);
});

test('rejects empty combustiveis', () => {
  const r = sanitize(validRow({ combustiveis: '' }));
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('combustiveis')));
});
