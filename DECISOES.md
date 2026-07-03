# Decisões Técnicas

## Modelagem do banco

Optei por normalizar o schema em vez de replicar diretamente as colunas do CSV em uma única tabela. As razões:

- **`bandeiras`**: bandeiras de combustível (Shell, Ipiranga etc.) são entidades reutilizáveis. Centralizar evita inconsistências de grafia entre registros.
- **`combustiveis`**: cada tipo de combustível é uma entidade própria. A relação com postos é muitos-para-muitos, modelada via `posto_combustiveis`.
- **`responsaveis`**: uma pessoa (identificada pelo CPF) pode ser responsável por mais de um posto. Separar em tabela própria evita duplicação de dados e facilita correções.
- **`postos`**: tabela principal, com chaves estrangeiras para `bandeiras` e `responsaveis`.

CNPJ e CPF são armazenados sem máscara (apenas dígitos), assim como o CEP. Isso padroniza a busca e evita variações de formato vindas do CSV. A exportação aplica a máscara novamente se necessário.

`status` foi definido como `VARCHAR` em vez de `ENUM` porque os valores possíveis não estão especificados no desafio, e um ENUM exigiria migration para cada novo valor.

## Importação, validação e duplicidades

A importação processa o CSV linha a linha. Cada linha passa pela sanitização antes de qualquer operação no banco:

- CNPJ, CPF e CEP são armazenados sem máscara (apenas dígitos). A validação inclui o algoritmo de dígitos verificadores, não apenas o formato.
- Datas são aceitas nos formatos `DD/MM/YYYY`, `DD-MM-YYYY` e `YYYY-MM-DD`.
- Campos com espaços extras são normalizados via `trim`. UF é convertida para maiúsculo.
- Linhas com campos obrigatórios ausentes ou documentos inválidos são ignoradas e reportadas na resposta da API com o número da linha e o motivo.

**Duplicidades:** postos são identificados pelo CNPJ. Se um posto com o mesmo CNPJ já existe, seus dados são atualizados (upsert). A mesma lógica se aplica ao responsável (identificado pelo CPF) e à bandeira (identificada pelo nome). Combustíveis do posto são sempre substituídos pelos do CSV na reimportação.

Cada linha é processada em uma transação individual, então uma falha em uma linha não compromete as demais.

## Exportação

O CSV exportado segue exatamente as mesmas colunas e ordem do arquivo de importação, garantindo compatibilidade para reimportação sem ajustes manuais.

CNPJ, CPF e CEP são exportados com máscara para legibilidade, mas o importador aceita ambos os formatos. Datas são exportadas no formato `DD/MM/YYYY`. Valores que contêm vírgulas são envolvidos em aspas duplas conforme o padrão CSV (RFC 4180).

A exportação escreve o arquivo diretamente na resposta HTTP linha a linha (`res.write`), sem acumular todos os registros em um array em memória. Isso mantém o consumo de memória constante independente do volume. Para volumes maiores que alguns milhões de registros, a abordagem ideal seria usar um cursor de banco (`pg-query-stream`), mas para a escala esperada neste desafio a abordagem atual é suficiente.

## Trade-offs

_(a preencher)_

## O que faria diferente com mais tempo

_(a preencher)_
