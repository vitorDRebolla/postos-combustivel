CREATE TABLE IF NOT EXISTS bandeiras (
  id   SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS combustiveis (
  id   SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS responsaveis (
  id    SERIAL PRIMARY KEY,
  cpf   CHAR(11)     NOT NULL UNIQUE,
  nome  VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  cargo VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS postos (
  id               SERIAL PRIMARY KEY,
  cnpj             CHAR(14)     NOT NULL UNIQUE,
  nome_posto       VARCHAR(200) NOT NULL,
  nome_fantasia    VARCHAR(200),
  bandeira_id      INTEGER      NOT NULL REFERENCES bandeiras(id),
  logradouro       VARCHAR(300) NOT NULL,
  numero           VARCHAR(20),
  complemento      VARCHAR(200),
  bairro           VARCHAR(200) NOT NULL,
  municipio        VARCHAR(200) NOT NULL,
  uf               CHAR(2)      NOT NULL,
  cep              CHAR(8)      NOT NULL,
  responsavel_id   INTEGER      NOT NULL REFERENCES responsaveis(id),
  status           VARCHAR(50)  NOT NULL,
  data_inauguracao DATE,
  numero_bicos     INTEGER,
  numero_pistas    INTEGER,
  observacoes      TEXT,
  criado_em        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posto_combustiveis (
  posto_id      INTEGER NOT NULL REFERENCES postos(id) ON DELETE CASCADE,
  combustivel_id INTEGER NOT NULL REFERENCES combustiveis(id),
  PRIMARY KEY (posto_id, combustivel_id)
);
