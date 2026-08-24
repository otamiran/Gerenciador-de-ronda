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
//   atendimentos_manutencao (id, maquina_id, estacao_id, estacao_nome,
//                             manutentor_id, manutentor_nome, descricao,
//                             iniciado_em, finalizado_em, criado_em)
//   manutentor_id/manutentor_nome/iniciado_em nulos = pendência ainda
//   sem manutentor atribuído.

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
// Só busca os atendimentos ainda ativos (finalizado_em nulo) — isso
// inclui tanto os "pendentes" (sem manutentor_id ainda) quanto os "em
// andamento" (com manutentor_id). É isso que alimenta o painel de
// manutenção e a aba de relatório.
export async function listarAtendimentosAtivos() {
  const { data, error } = await supabase
    .from('atendimentos_manutencao')
    .select('id, maquina_id, manutentor_id, manutentor_nome, estacao_id, estacao_nome, descricao, iniciado_em, finalizado_em, criado_em')
    .is('finalizado_em', null)
    .order('criado_em', { ascending: false })
  if (error) throw new Error(`atendimentos de manutenção: ${error.message}`)
  return data || []
}

// Registra uma pendência: máquina (+ opcionalmente estação) e o problema
// relatado, ainda SEM manutentor atribuído. Fica na lista de pendências
// até alguém usar atribuirManutentor() para assumir o atendimento.
export async function criarPendencia(maquinaId, estacaoId = null, estacaoNome = null, descricao = null) {
  const { data, error } = await supabase
    .from('atendimentos_manutencao')
    .insert({
      maquina_id: maquinaId,
      estacao_id: estacaoId,
      estacao_nome: estacaoNome,
      descricao: descricao || null,
      manutentor_id: null,
      manutentor_nome: null,
      iniciado_em: null,
    })
    .select()
    .single()
  if (error) throw new Error(`Não foi possível registrar a pendência: ${error.message}`)
  return data
}

// Atribui um manutentor a um atendimento já existente (seja para assumir
// uma pendência, seja para começar direto "em andamento"). Marca
// iniciado_em como agora — é a partir daqui que passa a contar o tempo
// "em atendimento".
export async function atribuirManutentor(id, manutentorId, manutentorNome) {
  const { data, error } = await supabase
    .from('atendimentos_manutencao')
    .update({
      manutentor_id: manutentorId,
      manutentor_nome: manutentorNome,
      iniciado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Não foi possível atribuir o manutentor: ${error.message}`)
  return data
}

// Atalho para já criar o atendimento direto "em andamento" (máquina +
// manutentor conhecidos de antemão, sem passar pela etapa de pendência).
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
