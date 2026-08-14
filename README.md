# Ronda de Produção 🏭

Checklist de rondas de chão de fábrica. Arquitetura **híbrida**:

- A **lista/hierarquia de equipamentos** (setores → grupos → máquinas →
  estações) vive no **Supabase** — é buscada sempre que o app carrega, e
  qualquer criação/renomeação/reordenação/exclusão feita no modo
  **⚙ Gerenciar** é enviada para lá na hora. Assim, todos os aparelhos
  enxergam a mesma lista de equipamentos.
- **Status de cada checagem (produzindo/parada/pendência), observação,
  quem marcou e o histórico de rondas encerradas** continuam **100% no
  aparelho** (`localStorage`) e nunca são enviados ao banco — cada
  aparelho tem sua própria ronda em andamento e seu próprio histórico.

Stack: **Vite + React 18** + **Supabase** (só para a estrutura), deploy estático (Vercel ou qualquer host de arquivos).

## Funcionalidades

- **Setores → Grupos → Máquinas → Estações de trabalho** (estações são um subconjunto opcional de cada máquina)
- Três status por item: **Produzindo** ✅ / **Parada** 🟡 / **Pendência** 🔴
- Clicar de novo no status ativo desmarca o item
- Ao marcar **pendência** ou **parada**, abre campo de **observação** de manutenção
- **Salvamento automático** no aparelho a cada alteração de status (sem precisar clicar em "Salvar")
- Registra **quem marcou e o horário** de cada checagem (campo opcional)
- Modo **⚙ Gerenciar** para criar/renomear/reordenar/excluir setores, grupos, máquinas e estações — sincronizado com o banco
- **Relatório formatado para WhatsApp** ao final da ronda, com botão de copiar e link direto `wa.me`
- **Nova ronda** limpa todas as marcações mantendo a estrutura, e guarda um histórico local
- **Histórico de rondas** consultável a qualquer momento, salvo no mesmo aparelho
- Cada **máquina** agora abre suas estações em um **painel lateral** (em vez de expandir para baixo na lista), facilitando a visualização de listas longas
- **Navegação em árvore (cascata)**: setor → grupo → máquina → estações vira colunas lado a lado (estilo Finder), é a própria tela principal do app, e as migalhas de pão no topo permitem pular direto entre níveis sem perder o contexto
- **Painel de Manutenção** (🔧): cadastro de manutentores, registro de **pendências** (máquina + problema relatado, sem manutentor ainda) e atribuição posterior de um manutentor — dado compartilhado entre aparelhos (Supabase)
- **Relatório de manutenção**: aba própria no relatório para WhatsApp, com seções separadas para atendimentos *em andamento* e *pendentes*

## Onde os dados ficam salvos

| Dado | Onde | Compartilhado entre aparelhos? |
|---|---|---|
| Setores, grupos, máquinas, estações (nomes, ordem, relações) | Supabase | ✅ Sim |
| Manutentores cadastrados e atendimentos de manutenção em andamento | Supabase | ✅ Sim |
| Status, observação, quem marcou | `localStorage` (`ronda-db-v1`) | ❌ Não |
| Histórico de rondas encerradas | `localStorage` (`ronda-db-v1`) | ❌ Não |

Isso significa:

- Adicionar/renomear/mover/excluir um equipamento em um aparelho aparece
  para todo mundo assim que o app recarregar (ele busca a estrutura do
  banco sempre que é aberto).
- As marcações de status de uma ronda em andamento e o histórico **não**
  aparecem em outro aparelho — cada um preenche a sua própria ronda.
- Se o Supabase estiver fora do ar ou sem internet, o app continua
  funcionando com a **última lista de equipamentos salva em cache** no
  aparelho, e mostra um aviso na tela.
- Se o usuário limpar os dados de navegação/cache do navegador para este
  site, o status/observação/histórico local são apagados (a lista de
  equipamentos volta a ser buscada do banco normalmente).

`src/db.js` também expõe `exportarJson()` e `importarJson()`, úteis caso
queira implementar um botão de backup/restauração manual do status local
no futuro.

## Estrutura do projeto

```
ronda/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json            # rewrite SPA
├── .env                   # credenciais do Supabase (URL + chave anônima)
├── supabase/
│   └── schema.sql         # script SQL completo e idempotente (todas as tabelas + policies)
└── src/
    ├── principal.jsx      # ponto de entrada
    ├── App.jsx            # estado global, ações de estrutura e status
    ├── supabase.js         # cliente Supabase
    ├── remoto.js           # módulo que fala com o Supabase (estrutura de equipamentos)
    ├── manutencao.js       # módulo que fala com o Supabase (manutentores + atendimentos)
    ├── db.js               # armazenamento local (status, obs, histórico) + cache da estrutura
    ├── constantes.js       # definição dos status e texto do WhatsApp / manutenção
    ├── estilos.css
    └── componentes/
        ├── PainelHierarquia.jsx
        ├── LinhaColuna.jsx
        ├── Maquina.jsx
        ├── BotoesStatus.jsx
        ├── CaixaObs.jsx
        ├── Andon.jsx
        ├── AdicionarInline.jsx
        ├── AdicionarEstacoes.jsx
        ├── RelatorioModal.jsx
        ├── ManutencaoPainel.jsx
        └── HistoricoModal.jsx
```

## Como rodar

```bash
npm install
npm run dev
```

O arquivo `.env` já vem preenchido com `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`. Se quiser apontar para outro projeto Supabase,
basta trocar esses dois valores.

### Tabelas esperadas no Supabase

Somente os campos de estrutura são lidos/gravados por este app (o app
nunca lê nem grava status/observação/usuário no banco):

- `setores` (`id`, `nome`, `ordem`, `criado_em`)
- `grupos` (`id`, `setor_id`, `nome`, `ordem`, `criado_em`)
- `maquinas` (`id`, `setor_id`, `grupo_id`, `nome`, `ordem`, `criado_em`)
- `estacoes` (`id`, `maquina_id`, `nome`, `criado_em`)

O painel de Manutenção (🔧) usa mais duas tabelas próprias, lidas/gravadas
por `src/manutencao.js`:

- `manutentores` (`id`, `nome`, `criado_em`)
- `atendimentos_manutencao` (`id`, `maquina_id`, `estacao_id`, `estacao_nome`,
  `manutentor_id`, `manutentor_nome`, `descricao`, `iniciado_em`, `finalizado_em`, `criado_em`) —
  `manutentor_id`/`manutentor_nome`/`iniciado_em` ficam `null` enquanto o
  atendimento está **pendente** (sem manutentor atribuído ainda)

Se as tabelas tiverem colunas extras (como um antigo `status`), elas
simplesmente não são tocadas pelo app.

#### Criando (ou atualizando) tudo de uma vez

O arquivo [`supabase/schema.sql`](./supabase/schema.sql) cria as 6 tabelas
acima, os índices e as policies de acesso público (leitura/escrita para a
chave anônima) de uma vez só. Basta colar o conteúdo dele no **SQL
Editor** do Supabase e rodar.

Ele é **idempotente**: pode ser rodado de novo em um projeto que já tem
as tabelas (todo `create table`/`create index` usa `if not exists`, e as
`policies` são recriadas com `drop policy if exists` antes do `create`),
então não dá erro de "já existe" nem apaga dados — é seguro rodar
sempre que este arquivo for atualizado.

### Deploy (opcional)

Por ser um app estático, pode ser hospedado em qualquer serviço de
arquivos (Vercel, Netlify, GitHub Pages). Lembre-se de configurar as
variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de
build do host, já que o `.env` normalmente não é versionado em produção.

## Observação sobre segurança

A senha de acesso ao modo **⚙ Gerenciar** continua definida em
`src/componentes/LoginAdmin.jsx` (ou pela variável `VITE_ADMIN_SENHA`),
apenas para evitar edições acidentais na estrutura — não é uma proteção
de segurança forte, já que roda inteiramente no navegador. A chave do
Supabase usada é a chave **anônima/pública** (segura para uso no
cliente), então as regras de acesso (RLS) do projeto Supabase são o que
efetivamente protege a tabela de equipamentos contra escrita indevida.
