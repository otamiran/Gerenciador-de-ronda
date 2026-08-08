// ── manutenção (manutentores + atendimentos) ──────────────────
// Diferente de remoto.js (que só cuida da estrutura de equipamentos),
// este módulo fala com o Supabase para guardar:
//   - o cadastro de nomes de manutentores (tabela `manutentores`)
//   - quem está atendendo qual máquina agora (tabela `atendimentos_manutencao`)
//
// Isso é intencionalmente COMPARTILHADO entre aparelhos (ao contrário do
// status da ronda, que é só local): o manutentor registra pelo celular
// dele que está atuando numa máquina, e qualquer outro aparelho (ex.: o
// do supervisor, na hora de gerar o relatório) precisa enxergar isso.
//
// Tabelas esperadas no Supabase (ver README.md para o SQL de criação):
//   manutentores            (id, nome, criado_em)
//   atendimentos_manutencao (id, maquina_id, manutentor_id, manutentor_nome,
//                             iniciado_em, finalizado_em, criado_em)

import { supabase } from './supabase.js'

// ── manutentores (cadastro de nomes) ───────────────────────────
export async function listarManutentores() {
  const { data, error } = await supabase
    .from('manutentores')
    .select('id, nome, criado_em')
    .order('nome', { ascending: true })
  if (error) throw new Error(`manutentores: ${error.message}`)
  return data || []
}

export async function criarManutentor(nome) {
  const { data, error } = await supabase
    .from('manutentores')
    .insert({ nome: nome.trim() })
    .select()
    .single()
  if (error) throw new Error(`Não foi possível cadastrar o manutentor: ${error.message}`)
  return data
}

export async function excluirManutentor(id) {
  const { error } = await supabase.from('manutentores').delete().eq('id', id)
  if (error) throw new Error(`Não foi possível excluir o manutentor: ${error.message}`)
}

// ── atendimentos (manutentor atuando numa máquina) ─────────────
// Só busca os atendimentos ainda ativos (finalizado_em nulo) — é isso
// que alimenta o painel de manutenção e a aba de relatório.
export async function listarAtendimentosAtivos() {
  const { data, error } = await supabase
    .from('atendimentos_manutencao')
    .select('id, maquina_id, manutentor_id, manutentor_nome, estacao_id, estacao_nome, descricao, iniciado_em, finalizado_em, criado_em')
    .is('finalizado_em', null)
    .order('iniciado_em', { ascending: false })
  if (error) throw new Error(`atendimentos de manutenção: ${error.message}`)
  return data || []
}

export async function iniciarAtendimento(maquinaId, manutentorId, manutentorNome, estacaoId = null, estacaoNome = null, descricao = null) {
  const agora = new Date().toISOString()
  const { data, error } = await supabase
    .from('atendimentos_manutencao')
    .insert({
      maquina_id: maquinaId,
      manutentor_id: manutentorId,
      manutentor_nome: manutentorNome,
      estacao_id: estacaoId,
      estacao_nome: estacaoNome,
      descricao: descricao || null,
      iniciado_em: agora,
    })
    .select()
    .single()
  if (error) throw new Error(`Não foi possível registrar o atendimento: ${error.message}`)
  return data
}

export async function encerrarAtendimento(id) {
  const { error } = await supabase
    .from('atendimentos_manutencao')
    .update({ finalizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Não foi possível encerrar o atendimento: ${error.message}`)
}
