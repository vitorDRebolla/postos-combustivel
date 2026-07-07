const VALID_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

function stripMask(value) {
  return (value || '').replace(/\D/g, '');
}

function trimStr(value) {
  return (value || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cnpjDigit(digits, weights) {
  const sum = weights.reduce((acc, w, i) => acc + parseInt(digits[i]) * w, 0);
  const rem = sum % 11;
  return rem < 2 ? 0 : 11 - rem;
}

function validateCNPJ(cnpj) {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  return (
    cnpjDigit(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(cnpj[12]) &&
    cnpjDigit(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === parseInt(cnpj[13])
  );
}

function normalizeScientificCNPJ(raw) {
  const num = parseFloat(raw.replace(',', '.'));
  if (isNaN(num) || !isFinite(num)) return null;
  const base = String(Math.round(num)).substring(0, 12).padEnd(12, '0');
  if (base.length !== 12 || /\D/.test(base)) return null;
  const d1 = cnpjDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = cnpjDigit(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base + d1 + d2;
}

function validateCPF(cpf) {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calc = (cpf, length) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += parseInt(cpf[i]) * (length + 1 - i);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  return (
    calc(cpf, 9) === parseInt(cpf[9]) &&
    calc(cpf, 10) === parseInt(cpf[10])
  );
}

function parseDate(value) {
  const str = trimStr(value);
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return isNaN(new Date(str)) ? null : str;
  }

  const dmySlash = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmySlash) {
    const iso = `${dmySlash[3]}-${dmySlash[2]}-${dmySlash[1]}`;
    return isNaN(new Date(iso)) ? null : iso;
  }

  const dmyDash = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyDash) {
    const iso = `${dmyDash[3]}-${dmyDash[2]}-${dmyDash[1]}`;
    return isNaN(new Date(iso)) ? null : iso;
  }

  return null;
}

function sanitize(row) {
  const errors = [];

  const cnpjRaw = trimStr(row.cnpj);
  let cnpj;
  if (/[eE]/i.test(cnpjRaw)) {
    cnpj = normalizeScientificCNPJ(cnpjRaw) || '';
    if (!cnpj) errors.push('CNPJ inválido');
  } else {
    cnpj = stripMask(cnpjRaw);
    if (!validateCNPJ(cnpj)) errors.push('CNPJ inválido');
  }
  const cpf = stripMask(row.cpf_responsavel);
  const cep = stripMask(row.cep);
  if (!validateCPF(cpf)) errors.push('CPF inválido');
  const cepNorm = cep.padStart(8, '0');
  if (cepNorm.length !== 8) errors.push('CEP inválido');

  const nome_posto = trimStr(row.nome_posto);
  const bandeira = trimStr(row.bandeira);
  const logradouro = trimStr(row.logradouro);
  const bairro = trimStr(row.bairro);
  const municipio = trimStr(row.municipio);
  const uf = trimStr(row.uf).toUpperCase();
  const status = trimStr(row.status);
  const nome_responsavel = trimStr(row.nome_responsavel);
  const combustiveisRaw = trimStr(row.combustiveis);

  if (!nome_posto) errors.push('nome_posto é obrigatório');
  if (!bandeira) errors.push('bandeira é obrigatória');
  if (!logradouro) errors.push('logradouro é obrigatório');
  if (!bairro) errors.push('bairro é obrigatório');
  if (!municipio) errors.push('municipio é obrigatório');
  if (!status) errors.push('status é obrigatório');
  if (!nome_responsavel) errors.push('nome_responsavel é obrigatório');
  if (!VALID_UFS.has(uf)) errors.push('UF inválida');

  const email = trimStr(row.email_responsavel) || null;
  if (email && !isValidEmail(email)) errors.push('email_responsavel inválido');

  const combustiveis = combustiveisRaw
    ? combustiveisRaw.split(',').map(c => c.trim()).filter(Boolean)
    : [];

  if (combustiveis.length === 0) errors.push('combustiveis é obrigatório');

  const numero_bicos = row.numero_bicos ? parseInt(row.numero_bicos, 10) : null;
  const numero_pistas = row.numero_pistas ? parseInt(row.numero_pistas, 10) : null;

  if (row.numero_bicos && isNaN(numero_bicos)) errors.push('numero_bicos deve ser inteiro');
  if (row.numero_pistas && isNaN(numero_pistas)) errors.push('numero_pistas deve ser inteiro');

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    data: {
      cnpj,
      nome_posto,
      nome_fantasia: trimStr(row.nome_fantasia) || null,
      bandeira,
      logradouro,
      numero: trimStr(row.numero) || null,
      complemento: trimStr(row.complemento) || null,
      bairro,
      municipio,
      uf,
      cep: cepNorm,
      cpf_responsavel: cpf,
      nome_responsavel,
      email_responsavel: email,
      cargo_responsavel: trimStr(row.cargo_responsavel) || null,
      combustiveis,
      status,
      data_inauguracao: parseDate(row.data_inauguracao),
      numero_bicos: isNaN(numero_bicos) ? null : numero_bicos,
      numero_pistas: isNaN(numero_pistas) ? null : numero_pistas,
      observacoes: trimStr(row.observacoes) || null,
    },
  };
}

module.exports = { sanitize };
