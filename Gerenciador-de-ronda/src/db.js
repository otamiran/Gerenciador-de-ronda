// ── armazenamento local ─────────────────────────────────────
// A lista/hierarquia de equipamentos (setores, grupos, máquinas,
// estações) agora vive no Supabase — veja remoto.js — e é buscada
// sempre que o app carrega. Este arquivo guarda, no localStorage
// do próprio aparelho, uma cópia dessa estrutura (cache para uso
// offline) MESCLADA com o que é sempre local: status, observação,
// usuário e o histórico de rondas encerradas.

export const CHAVE_DB = 'ronda-db-v1'

const VAZIO = {
  setores: [],
  grupos: [],
  maquinas: [],
  estacoes: [],
  historico_rondas: [],
  historico_itens: [],
}

function gerarId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function lerTudo() {
  try {
    const bruto = localStorage.getItem(CHAVE_DB)
    if (!bruto) return { ...VAZIO }
    const dados = JSON.parse(bruto)
    return { ...VAZIO, ...dados }
  } catch {
    return { ...VAZIO }
  }
}

function gravarTudo(dados) {
  localStorage.setItem(CHAVE_DB, JSON.stringify(dados))
}

function ordenar(linhas, ordenarPor) {
  if (!ordenarPor || ordenarPor.length === 0) return linhas.slice()
  return linhas.slice().sort((a, b) => {
    for (const campo of ordenarPor) {
      const av = a[campo] ?? 0
      const bv = b[campo] ?? 0
      if (av < bv) return -1
      if (av > bv) return 1
    }
    return 0
  })
}

// ── leitura ──────────────────────────────────────────────────
export function listar(tabela, { ordenarPor } = {}) {
  const dados = lerTudo()
  return ordenar(dados[tabela] || [], ordenarPor)
}

export function buscarPorId(tabela, id) {
  const dados = lerTudo()
  return (dados[tabela] || []).find(l => l.id === id) || null
}

export function buscar(tabela, filtroFn) {
  const dados = lerTudo()
  return (dados[tabela] || []).filter(filtroFn)
}

// ── escrita ──────────────────────────────────────────────────
export function inserir(tabela, obj) {
  const dados = lerTudo()
  const linha = { id: gerarId(), criado_em: new Date().toISOString(), ...obj }
  dados[tabela] = [...(dados[tabela] || []), linha]
  gravarTudo(dados)
  return linha
}

export function inserirVarios(tabela, objs) {
  const dados = lerTudo()
  const agora = new Date().toISOString()
  const linhas = objs.map(obj => ({ id: gerarId(), criado_em: agora, ...obj }))
  dados[tabela] = [...(dados[tabela] || []), ...linhas]
  gravarTudo(dados)
  return linhas
}

export function atualizar(tabela, id, patch) {
  const dados = lerTudo()
  dados[tabela] = (dados[tabela] || []).map(l => (l.id === id ? { ...l, ...patch } : l))
  gravarTudo(dados)
}

export function atualizarTodos(tabela, patch) {
  const dados = lerTudo()
  dados[tabela] = (dados[tabela] || []).map(l => ({ ...l, ...patch }))
  gravarTudo(dados)
}

export function excluir(tabela, id) {
  const dados = lerTudo()
  dados[tabela] = (dados[tabela] || []).filter(l => l.id !== id)
  gravarTudo(dados)
}

export function excluirTodos(tabela) {
  const dados = lerTudo()
  dados[tabela] = []
  gravarTudo(dados)
}

// ── mesclar estrutura vinda do banco ──────────────────────────
// Recebe as linhas de estrutura (nome, ordem, relações) buscadas
// no Supabase e substitui a tabela local por elas — preservando,
// linha a linha, os campos que só existem/mudam localmente
// (status, obs, usuario, atualizado_em), quando o item já existia.
const CAMPOS_STATUS = ['status', 'obs', 'usuario', 'atualizado_em']

export function definirEstrutura(tabela, linhasRemotas) {
  const dados = lerTudo()
  const antigasPorId = Object.fromEntries((dados[tabela] || []).map(l => [l.id, l]))
  dados[tabela] = (linhasRemotas || []).map(remota => {
    const antiga = antigasPorId[remota.id]
    const statusPreservado = {}
    if (antiga) CAMPOS_STATUS.forEach(c => { if (antiga[c] !== undefined) statusPreservado[c] = antiga[c] })
    return { ...statusPreservado, ...remota }
  })
  gravarTudo(dados)
}

// ── exportar / importar (útil para backup manual do aparelho) ─
export function exportarJson() {
  return JSON.stringify(lerTudo(), null, 2)
}

export function importarJson(texto) {
  const dados = JSON.parse(texto)
  gravarTudo({ ...VAZIO, ...dados })
}
