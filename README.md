# Ronda de Produção 🏭

Checklist compartilhado em tempo real para rondas de chão de fábrica.

Arquitetura e stack no mesmo padrão do projeto **FCA** (otamiran/FCA):
**Vite + React 18 + Supabase**, deploy na **Vercel**.

## Funcionalidades

- **Setores → Máquinas → Estações de trabalho** (estações são um subconjunto opcional de cada máquina)
- Três status por item: **Produzindo** ✅ / **Parada** 🟡 / **Pendência** 🔴
- Ao marcar **pendência**, abre campo de **observação** de manutenção
- **Compartilhado em tempo real**: todos os usuários veem as marcações instantaneamente (Supabase Realtime)
- Registra **quem marcou e o horário** de cada checagem
- Modo **⚙ Gerenciar** para criar/excluir setores, máquinas e estações
- **Relatório formatado para WhatsApp** ao final da ronda, com botão de copiar e link direto `wa.me`
- **Nova ronda** limpa todas as marcações mantendo a estrutura

## Estrutura do projeto

```
ronda/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json            # rewrite SPA (padrão FCA)
├── supabase.sql           # schema do banco — rodar no Supabase
├── .env.exemplo           # modelo das variáveis de ambiente
└── src/
    ├── principal.jsx      # ponto de entrada (convenção do FCA)
    ├── App.jsx            # estado global, realtime, relatório
    ├── supabase.js        # cliente Supabase
    ├── constantes.js      # definição dos status
    ├── estilos.css
    └── componentes/
        ├── Setor.jsx
        ├── Maquina.jsx
        ├── Estacao.jsx
        ├── BotoesStatus.jsx
        ├── CaixaObs.jsx
        ├── Andon.jsx
        ├── AdicionarInline.jsx
        └── RelatorioModal.jsx
```

## Como rodar

### 1. Configurar o Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com)
2. Abra **SQL Editor** e execute todo o conteúdo de `supabase.sql`
3. Em **Project Settings → API**, copie a **URL** e a **anon key**

### 2. Rodar localmente

```bash
npm install
cp .env.exemplo .env   # e preencha com URL e anon key
npm run dev
```

### 3. Deploy na Vercel

1. Suba o projeto para um repositório no GitHub
2. Importe o repositório na [Vercel](https://vercel.com)
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — o `vercel.json` já cuida do roteamento da SPA

Compartilhe o link com a equipe: todos preenchem a mesma ronda em tempo real.

## Observação sobre segurança

O `supabase.sql` libera leitura/escrita pela chave anon (app interno de equipe).
Se o link puder vazar para fora da equipe, considere adicionar autenticação
(Supabase Auth) e restringir as políticas de RLS.
