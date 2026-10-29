# LeadJá local

Aplicativo pessoal para macOS que busca negócios no Google Maps, prioriza oportunidades com regras transparentes e acompanha contatos em um CRM local. Não usa IA, não exige login, não depende de Docker na versão desktop e mantém os dados no computador.

## Requisitos

- Node.js 24 ou mais recente para desenvolvimento
- macOS Apple Silicon para o aplicativo empacotado

## Executar

```bash
npm start
```

Abra `http://127.0.0.1:4173`. Este comando mantém o modo navegador e usa Docker nas buscas, quando disponível.

## Aplicativo macOS

O GitHub Actions compila o coletor nativo ARM64 e gera o DMG sem depender do Docker. Execute o workflow **Build macOS ARM64** manualmente na aba Actions ou crie uma tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Execuções manuais disponibilizam o DMG em **Artifacts**. Tags `v*` também criam uma GitHub Release com o instalador anexado.

Para executar o desktop em desenvolvimento, primeiro disponibilize o coletor em `resources/bin/google-maps-scraper` e rode:

```bash
npm run desktop
```

O script `npm run build:scraper` compila o coletor, mas requer Go 1.27.1 instalado.

## Testes

```bash
npm test
```

## Dados locais

- No modo navegador: `.leadja/`
- No aplicativo: `~/Library/Application Support/LeadJá/data/`
- Nenhum dado é enviado para um backend próprio ou serviço de IA.

## Fluxo

1. Informe o tipo de negócio e a cidade em **Buscar**.
2. O coletor salva os estabelecimentos encontrados no SQLite.
3. O score usa regras configuráveis como ausência de site próprio, poucas avaliações, nota baixa e presença de telefone.
4. Abra um lead para ver o recibo do score, gerar a mensagem e atualizar a etapa.
5. Acompanhe o andamento no quadro **CRM**.

Também é possível importar um CSV pelas telas de leads. Colunas comuns em português e inglês são reconhecidas automaticamente.
