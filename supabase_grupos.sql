-- ============================================================
-- MIGRAÇÃO: adiciona tabela grupos entre setores e máquinas
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Criar tabela grupos
create table if not exists grupos (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references setores(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists idx_grupos_setor on grupos(setor_id);

-- 2. Adicionar coluna grupo_id em maquinas (nullable — máquinas antigas ficam sem grupo)
alter table maquinas add column if not exists grupo_id uuid references grupos(id) on delete set null;
create index if not exists idx_maquinas_grupo on maquinas(grupo_id);

-- 3. RLS
alter table grupos enable row level security;
create policy "acesso_grupos" on grupos for all using (true) with check (true);

-- 4. Realtime
alter publication supabase_realtime add table grupos;

-- Pronto! Máquinas existentes ficam com grupo_id = null e continuam funcionando.
