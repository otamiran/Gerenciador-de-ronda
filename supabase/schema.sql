-- ============================================================
-- Ronda de Produção — schema completo do Supabase
-- ============================================================
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- É seguro rodar mais de uma vez (em outro ambiente, depois de um
-- reset, etc.): toda tabela/índice/coluna usa "if not exists" e as
-- policies são recriadas (drop + create) em vez de dar erro de
-- "já existe". Nada aqui apaga dados que já existam nas tabelas.
-- ============================================================

-- necessário para gen_random_uuid() (normalmente já vem habilitado
-- por padrão em projetos Supabase, mas não custa garantir)
create extension if not exists pgcrypto;

-- ============================================================
-- 1) ESTRUTURA DE EQUIPAMENTOS
--    setores → grupos → máquinas → estações
--    (status/observação/histórico da ronda NÃO ficam aqui — são
--    100% locais no aparelho, ver src/db.js)
-- ============================================================

create table if not exists setores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists grupos (
  id         uuid primary key default gen_random_uuid(),
  setor_id   uuid not null references setores(id) on delete cascade,
  nome       text not null,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists maquinas (
  id         uuid primary key default gen_random_uuid(),
  setor_id   uuid not null references setores(id) on delete cascade,
  grupo_id   uuid references grupos(id) on delete cascade, -- nulo = máquina solta no setor, sem grupo
  nome       text not null,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists estacoes (
  id         uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references maquinas(id) on delete cascade,
  nome       text not null,
  criado_em  timestamptz not null default now()
);

-- índices para as buscas/joins mais comuns
create index if not exists idx_grupos_setor_id    on grupos(setor_id);
create index if not exists idx_maquinas_setor_id   on maquinas(setor_id);
create index if not exists idx_maquinas_grupo_id   on maquinas(grupo_id);
create index if not exists idx_estacoes_maquina_id on estacoes(maquina_id);

-- ============================================================
-- 2) MANUTENÇÃO
--    manutentores cadastrados + quem está atendendo qual
--    máquina/estação agora
-- ============================================================

create table if not exists manutentores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  criado_em  timestamptz not null default now()
);

create table if not exists atendimentos_manutencao (
  id               uuid primary key default gen_random_uuid(),
  maquina_id       uuid references maquinas(id) on delete cascade,
  estacao_id       uuid references estacoes(id) on delete set null,
  estacao_nome     text,
  manutentor_id    uuid references manutentores(id) on delete set null,
  manutentor_nome  text not null,
  descricao        text, -- o que está sendo atendido no momento (opcional)
  iniciado_em      timestamptz not null default now(),
  finalizado_em    timestamptz, -- nulo enquanto o atendimento está ativo
  criado_em        timestamptz not null default now()
);

-- caso a tabela já existisse de uma versão anterior sem essas colunas
alter table atendimentos_manutencao
  add column if not exists estacao_id   uuid references estacoes(id) on delete set null,
  add column if not exists estacao_nome text,
  add column if not exists descricao    text;

create index if not exists idx_atend_maquina_id    on atendimentos_manutencao(maquina_id);
create index if not exists idx_atend_manutentor_id on atendimentos_manutencao(manutentor_id);
create index if not exists idx_atend_ativos         on atendimentos_manutencao(finalizado_em) where finalizado_em is null;

-- ============================================================
-- 3) SEGURANÇA (RLS)
--    O app usa a chave anônima do Supabase no navegador, então o
--    acesso público de leitura/escrita é controlado por policies —
--    não há autenticação de usuário no app. Ajuste aqui se quiser
--    restringir mais no futuro.
-- ============================================================

alter table setores                 enable row level security;
alter table grupos                  enable row level security;
alter table maquinas                enable row level security;
alter table estacoes                enable row level security;
alter table manutentores            enable row level security;
alter table atendimentos_manutencao enable row level security;

-- "drop + create" em vez de "create policy if not exists" (o Postgres
-- não tem essa sintaxe para policies) — assim o script pode ser
-- rodado de novo sem dar erro de policy duplicada.
drop policy if exists "setores: leitura publica"  on setores;
drop policy if exists "setores: escrita publica"  on setores;
create policy "setores: leitura publica" on setores for select using (true);
create policy "setores: escrita publica" on setores for all    using (true) with check (true);

drop policy if exists "grupos: leitura publica"  on grupos;
drop policy if exists "grupos: escrita publica"  on grupos;
create policy "grupos: leitura publica" on grupos for select using (true);
create policy "grupos: escrita publica" on grupos for all    using (true) with check (true);

drop policy if exists "maquinas: leitura publica"  on maquinas;
drop policy if exists "maquinas: escrita publica"  on maquinas;
create policy "maquinas: leitura publica" on maquinas for select using (true);
create policy "maquinas: escrita publica" on maquinas for all    using (true) with check (true);

drop policy if exists "estacoes: leitura publica"  on estacoes;
drop policy if exists "estacoes: escrita publica"  on estacoes;
create policy "estacoes: leitura publica" on estacoes for select using (true);
create policy "estacoes: escrita publica" on estacoes for all    using (true) with check (true);

drop policy if exists "manutentores: leitura publica" on manutentores;
drop policy if exists "manutentores: escrita publica" on manutentores;
create policy "manutentores: leitura publica" on manutentores for select using (true);
create policy "manutentores: escrita publica" on manutentores for all    using (true) with check (true);

drop policy if exists "atendimentos: leitura publica" on atendimentos_manutencao;
drop policy if exists "atendimentos: escrita publica" on atendimentos_manutencao;
create policy "atendimentos: leitura publica" on atendimentos_manutencao for select using (true);
create policy "atendimentos: escrita publica" on atendimentos_manutencao for all    using (true) with check (true);

-- ============================================================
-- Pronto. Depois de rodar, confira em Table Editor se as 6 tabelas
-- apareceram: setores, grupos, maquinas, estacoes, manutentores,
-- atendimentos_manutencao.
-- ============================================================
