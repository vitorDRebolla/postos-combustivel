# Postos de Combustível

Ferramenta interna para importação, visualização e exportação de postos de combustível via CSV.

## Pré-requisitos

- [Node.js 22+](https://nodejs.org/)
- [Docker](https://www.docker.com/) e Docker Compose

## Setup

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

O arquivo `.env` já vem com valores prontos para desenvolvimento local. Ajuste se necessário.

### 2. Banco de dados

```bash
docker compose up -d
```

O PostgreSQL sobe na porta `5432` e executa o schema automaticamente na primeira inicialização.

### 3. Backend

```bash
cd backend
npm install
npm run dev
```

O servidor inicia em `http://localhost:3000`. Você pode confirmar com:

```bash
curl http://localhost:3000/health
```

### 4. Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`.

## Como usar

1. **Importar:** clique em "Importar CSV" e selecione o arquivo. A resposta indica quantos postos foram importados e quais linhas foram ignoradas e por quê.
2. **Visualizar:** os postos importados aparecem na tabela automaticamente após a importação.
3. **Exportar:** clique em "Exportar CSV" para baixar todos os postos no mesmo formato do arquivo de importação.
4. **Apagar tudo:** clique em "Apagar tudo" para remover todos os postos cadastrados. Uma confirmação é exigida antes da exclusão.

> O arquivo CSV deve usar `;` como separador de colunas. Arquivos exportados pelo Excel com BOM UTF-8 são suportados.

## Testes

```bash
cd backend
npm test
```

## Endpoints da API

| Método | Rota             | Descrição                        |
|--------|------------------|----------------------------------|
| GET    | /health          | Verifica se o servidor está ativo |
| POST   | /postos/import   | Importa postos via CSV (multipart/form-data, campo `file`) |
| GET    | /postos          | Lista todos os postos            |
| GET    | /postos/export   | Exporta postos em CSV            |
| DELETE | /postos          | Remove todos os postos           |

## Estrutura do projeto

```
.
├── db/
│   └── schema.sql         # Schema completo do banco
├── backend/
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── db.js
│       ├── routes/
│       │   └── postos.js  # Import, list, export
│       └── services/
│           ├── importer.js
│           └── sanitizer.js
├── frontend/
│   └── src/
│       ├── App.vue
│       ├── main.js
│       ├── plugins/vuetify.js
│       └── components/
│           └── PostosPage.vue
├── docker-compose.yml
├── .env.example
├── README.md
└── DECISOES.md
```
