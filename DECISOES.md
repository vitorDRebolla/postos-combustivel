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

_(a preencher)_

## Exportação

_(a preencher)_

## Trade-offs

_(a preencher)_

## O que faria diferente com mais tempo

_(a preencher)_
