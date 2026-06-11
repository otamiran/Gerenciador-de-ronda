-- ============================================================
-- RONDA DE PRODUÇÃO — Schema completo (v2 com histórico)
-- Execute no SQL Editor do Supabase (seleciona tudo e Run)
-- ============================================================

-- ---- LIMPAR versão anterior (se existir) ----
drop table if exists historico_itens cascade;
drop table if exists historico_rondas cascade;
drop table if exists estacoes cascade;
drop table if exists maquinas cascade;
drop table if exists setores cascade;

-- ---- ESTRUTURA ----

create table setores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table maquinas (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references setores(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  status text check (status in ('produzindo','parada','pendencia')),
  obs text not null default '',
  usuario text not null default '',
  atualizado_em timestamptz,
  criado_em timestamptz not null default now()
);

create table estacoes (
  id uuid primary key default gen_random_uuid(),
  maquina_id uuid not null references maquinas(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  status text check (status in ('produzindo','parada','pendencia')),
  obs text not null default '',
  usuario text not null default '',
  atualizado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- ---- HISTÓRICO ----

create table historico_rondas (
  id uuid primary key default gen_random_uuid(),
  iniciada_por text not null default '',
  iniciada_em timestamptz not null default now(),
  encerrada_em timestamptz,
  texto_whatsapp text not null default '',
  resumo jsonb not null default '{}'
);

create table historico_itens (
  id uuid primary key default gen_random_uuid(),
  ronda_id uuid not null references historico_rondas(id) on delete cascade,
  tipo text not null check (tipo in ('maquina','estacao')),
  item_id uuid not null,
  nome_item text not null,
  nome_pai text not null default '',  -- nome da máquina (para estação) ou setor (para máquina)
  status text check (status in ('produzindo','parada','pendencia')),
  obs text not null default '',
  usuario text not null default '',
  atualizado_em timestamptz
);

-- ---- ÍNDICES ----
create index idx_maquinas_setor on maquinas(setor_id);
create index idx_estacoes_maquina on estacoes(maquina_id);
create index idx_hist_itens_ronda on historico_itens(ronda_id);
create index idx_hist_rondas_data on historico_rondas(iniciada_em desc);

-- ---- RLS ----
alter table setores enable row level security;
alter table maquinas enable row level security;
alter table estacoes enable row level security;
alter table historico_rondas enable row level security;
alter table historico_itens enable row level security;

-- Políticas abertas (app interno de equipe — sem autenticação)
create policy "acesso_setores"          on setores          for all using (true) with check (true);
create policy "acesso_maquinas"         on maquinas         for all using (true) with check (true);
create policy "acesso_estacoes"         on estacoes         for all using (true) with check (true);
create policy "acesso_hist_rondas"      on historico_rondas for all using (true) with check (true);
create policy "acesso_hist_itens"       on historico_itens  for all using (true) with check (true);

-- ---- REALTIME ----
alter publication supabase_realtime add table setores;
alter publication supabase_realtime add table maquinas;
alter publication supabase_realtime add table estacoes;

-- ---- DADOS DE EXEMPLO ----
insert into setores (nome, ordem) values ('Usinagem', 0), ('Montagem', 1);
