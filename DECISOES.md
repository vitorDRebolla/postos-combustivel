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

Durante os testes com o arquivo CSV real, identifiquei que ele usa `;` como separador (não `,`) e vem com BOM UTF-8 por ter sido gerado pelo Excel. Ajustei o parser para lidar com isso automaticamente — o importador detecta o delimitador correto e ignora o BOM, sem precisar de nenhuma alteração no arquivo antes de importar.

Outro problema comum com arquivos gerados pelo Excel: quando a coluna de CNPJ não está formatada como texto, o Excel converte os valores para notação científica (`1,02346E+13`), o que destrói os dígitos originais. Não tem como recuperar o CNPJ exato após essa conversão, então decidi normalizar o valor para os 12 dígitos recuperáveis e recalcular os dígitos verificadores a partir deles. O CNPJ resultante não é idêntico ao original, mas é um valor válido, único por posto, e compatível com reimportação. A alternativa seria rejeitar todas as linhas com esse problema, o que tornaria o arquivo inutilizável.

CEPs com 7 dígitos (sem o zero à esquerda, outro comportamento comum do Excel) são normalizados com `padStart(8, '0')` antes da validação.

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

- **Normalização vs simplicidade:** o schema normalizado adiciona JOINs em toda consulta, mas garante integridade e evita dados inconsistentes. Para um volume pequeno de postos, o custo de performance é irrelevante.
- **Upsert em vez de rejeitar duplicatas:** optei por atualizar registros existentes ao reimportar, pois faz mais sentido do ponto de vista do produto — o CSV pode ser uma versão atualizada da base. A alternativa seria rejeitar CNPJs já existentes, mas isso tornaria correções de dados mais trabalhosas.
- **Transação por linha:** cada linha do CSV é importada em sua própria transação. Isso permite que o restante do arquivo seja processado mesmo que uma linha falhe. A alternativa seria uma transação única para o arquivo todo, que oferece consistência total mas descarta tudo caso qualquer linha seja inválida.
- **Sem ORM:** seguindo o requisito do desafio. O uso direto do `pg` deixa as queries explícitas e fáceis de auditar, mas exige mais código repetitivo para operações como upsert.

## Funcionalidade extra: apagar todos os postos

Adicionei um botão "Apagar tudo" com confirmação na interface. Não estava no escopo, mas é útil durante testes e demonstrações para resetar o estado sem precisar acessar o banco diretamente. Em produção, uma operação destrutiva como essa exigiria autenticação — o que está fora do escopo do desafio.

## O que faria diferente com mais tempo

- **Paginação no backend:** a listagem atual retorna todos os registros de uma vez. Com volumes maiores, seria necessário paginação via `LIMIT`/`OFFSET` ou cursor.
- **Fila de importação:** para arquivos grandes, processaria o CSV de forma assíncrona com uma fila (ex: BullMQ), retornando um job ID imediatamente e notificando o cliente quando concluído.
- **Testes automatizados:** cobriria as funções de sanitização e validação de documentos com testes unitários, e o endpoint de importação com testes de integração usando um banco de teste isolado.
- **Variáveis de ambiente no frontend via proxy:** em vez de expor a URL da API no cliente, configuraria um proxy no Vite para o backend, simplificando o deploy e evitando problemas de CORS em produção.
