# LeadJá local

Aplicativo pessoal para buscar negócios no Google Maps, priorizar oportunidades com regras transparentes e acompanhar contatos em um CRM local. Não usa IA, não exige login e mantém os dados no computador.

## Requisitos

- Node.js 22.5 ou mais recente
- Docker Desktop ativo para executar novas buscas

## Executar

```bash
npm start
```

Abra `http://127.0.0.1:4173`. Na primeira busca, o Docker pode levar alguns minutos para baixar a imagem `gosom/google-maps-scraper`.

## Testes

```bash
npm test
```

## Dados locais

- Banco SQLite: `.leadja/leadja.sqlite`
- Arquivos de cada busca: `.leadja/jobs/`
- Nenhum dado é enviado para um backend próprio ou serviço de IA.

## Fluxo

1. Informe o tipo de negócio e a cidade em **Buscar**.
2. O coletor salva os estabelecimentos encontrados no SQLite.
3. O score usa regras configuráveis como ausência de site próprio, poucas avaliações, nota baixa e presença de telefone.
4. Abra um lead para ver o recibo do score, gerar a mensagem e atualizar a etapa.
5. Acompanhe o andamento no quadro **CRM**.

Também é possível importar um CSV pelas telas de leads. Colunas comuns em português e inglês são reconhecidas automaticamente.
