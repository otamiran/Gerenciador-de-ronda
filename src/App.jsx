import { useState, useEffect, useCallback } from 'react'
import {
  CHAVE_DB, listar, inserir, inserirVarios, atualizar,
  atualizarTodos, excluir as excluirLinha, definirEstrutura,
} from './db.js'
import {
  buscarEstruturaRemota, criarRemoto, atualizarRemoto, excluirRemoto,
} from './remoto.js'
import {
  listarManutentores, criarManutentor, excluirManutentor,
  listarAtendimentosAtivos, iniciarAtendimento, encerrarAtendimento,
} from './manutencao.js'
import { gerarTextoRelatorio } from './constantes.js'
import PainelHierarquia from './componentes/PainelHierarquia.jsx'
import RelatorioModal from './componentes/RelatorioModal.jsx'
import HistoricoModal from './componentes/HistoricoModal.jsx'
import ManutencaoPainel from './componentes/ManutencaoPainel.jsx'
import LoginAdmin from './componentes/LoginAdmin.jsx'
import logo from './assets/logo.png'

export default function App() {
  const [setores, setSetores]   = useState([])
  const [grupos, setGrupos]     = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [estacoes, setEstacoes] = useState([])
  const [operador, setOperador] = useState(() => localStorage.getItem('ronda-operador') || '')
  const [gerenciar, setGerenciar]       = useState(false)
  const [adminAutenticado, setAdmin]    = useState(false)
  const [mostrarLogin, setMostrarLogin] = useState(false)
  const [verRelatorio, setVerRelatorio] = useState(false)
  const [verHistorico, setVerHistorico] = useState(false)
  const [verManutencao, setVerManutencao] = useState(false)
  const [manutentores, setManutentores] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [erro, setErro]                 = useState('')

  // ── carregar (local) ──────────────────────────────────────
  // Relê apenas o que já está salvo neste aparelho (sem rede) —
  // usado depois de alterar status/observação, que é 100% local.
  const carregarLocal = useCallback(() => {
    try {
      setSetores(listar('setores',   { ordenarPor: ['ordem', 'criado_em'] }))
      setGrupos(listar('grupos',     { ordenarPor: ['ordem', 'criado_em'] }))
      setMaquinas(listar('maquinas', { ordenarPor: ['ordem', 'criado_em'] }))
      const estacoesOrdenadas = listar('estacoes').sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' })
      )
      setEstacoes(estacoesOrdenadas)
    } catch (e) {
      setErro(`Erro ao carregar dados salvos no aparelho: ${e.message}`)
    }
  }, [])

  // ── carregar (remoto) ─────────────────────────────────────
  // Sempre que o app abre — e depois de qualquer alteração
  // estrutural — busca a lista/hierarquia de equipamentos no
  // Supabase e mescla com o status local (que nunca vai pro banco).
  const carregar = useCallback(async () => {
    try {
      const remoto = await buscarEstruturaRemota()
      definirEstrutura('setores', remoto.setores)
      definirEstrutura('grupos', remoto.grupos)
      definirEstrutura('maquinas', remoto.maquinas)
      definirEstrutura('estacoes', remoto.estacoes)
      setErro('')
    } catch (e) {
      setErro(`Não foi possível buscar a lista de equipamentos no banco (${e.message}). Mostrando a última lista salva neste aparelho.`)
    }
    carregarLocal()
    setCarregando(false)
  }, [carregarLocal])

  // ── manutenção (manutentores + atendimentos, compartilhados) ─
  const carregarManutencao = useCallback(async () => {
    try {
      const [mans, atds] = await Promise.all([listarManutentores(), listarAtendimentosAtivos()])
      setManutentores(mans)
      setAtendimentos(atds)
    } catch (e) {
      setErro(`Não foi possível carregar os dados de manutenção (${e.message}).`)
    }
  }, [])

  useEffect(() => {
    carregar()
    carregarManutencao()
    // se o app estiver aberto em mais de uma aba deste mesmo aparelho,
    // mantém as abas em sincronia quando o localStorage muda
    const aoMudarStorage = e => { if (e.key === CHAVE_DB) carregarLocal() }
    window.addEventListener('storage', aoMudarStorage)
    return () => window.removeEventListener('storage', aoMudarStorage)
  }, [carregar, carregarLocal, carregarManutencao])

  const addManutentor = async nome => {
    await criarManutentor(nome)
    await carregarManutencao()
  }

  const removerManutentor = async id => {
    await excluirManutentor(id)
    await carregarManutencao()
  }

  const iniciarAtendimentoMaquina = async (maquinaId, manutentorId, estacaoId, descricao) => {
    const manutentor = manutentores.find(m => m.id === manutentorId)
    if (!manutentor) throw new Error('Manutentor não encontrado.')
    const estacao = estacaoId ? estacoes.find(e => e.id === estacaoId) : null
    await iniciarAtendimento(maquinaId, manutentorId, manutentor.nome, estacaoId || null, estacao?.nome || null, descricao || null)
    await carregarManutencao()
  }

  const encerrarAtendimentoMaquina = async id => {
    await encerrarAtendimento(id)
    await carregarManutencao()
  }

  const salvarOperador = v => { setOperador(v); localStorage.setItem('ronda-operador', v) }

  // ── salvar lote ───────────────────────────────────────────
  const salvarLote = useCallback((maquinaId, draftMaq, draftEst, op) => {
    const usuario = op || '—'
    const agora   = new Date().toISOString()
    const temObs  = status => status === 'pendencia' || status === 'parada'
    try {
      atualizar('maquinas', maquinaId, {
        status: draftMaq.status,
        obs: temObs(draftMaq.status) ? (draftMaq.obs || '') : '',
        usuario, atualizado_em: agora,
      })
      Object.entries(draftEst).forEach(([estId, d]) => {
        atualizar('estacoes', estId, {
          status: d.status,
          obs: temObs(d.status) ? (d.obs || '') : '',
          usuario, atualizado_em: agora,
        })
      })
      carregarLocal()
    } catch (e) {
      setErro(`Erro ao salvar: ${e.message}`)
    }
  }, [carregarLocal])

  // ── autenticação admin ────────────────────────────────────
  const clicarGerenciar = () => {
    if (gerenciar) { setGerenciar(false); return }
    if (adminAutenticado) { setGerenciar(true) } else { setMostrarLogin(true) }
  }
  const onAutenticar = () => {
    setAdmin(true); setMostrarLogin(false); setGerenciar(true)
    setTimeout(() => { setAdmin(false); setGerenciar(false) }, 30 * 60 * 1000)
  }

  // ── estrutura (sempre enviada e buscada do banco) ─────────
  const addSetor = async nome => {
    if (!nome.trim()) return
    try {
      await criarRemoto('setores', { nome: nome.trim(), ordem: setores.length })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const addGrupo = async (setorId, nome) => {
    if (!nome.trim()) return
    try {
      await criarRemoto('grupos', { setor_id: setorId, nome: nome.trim(), ordem: grupos.filter(g => g.setor_id === setorId).length })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  // máquinas sempre ligadas a um grupo agora
  const addMaquina = async (grupoId, nome) => {
    if (!nome.trim()) return
    // descobre setor_id pelo grupo
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    try {
      await criarRemoto('maquinas', {
        setor_id: grupo.setor_id,
        grupo_id: grupoId,
        nome: nome.trim(),
        ordem: maquinas.filter(m => m.grupo_id === grupoId).length,
      })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const addEstacao = async (maquinaId, nome) => {
    if (!nome.trim()) return
    try {
      await criarRemoto('estacoes', { maquina_id: maquinaId, nome: nome.trim() })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  const renomear = async (tabela, id, nome) => {
    try {
      await atualizarRemoto(tabela, id, { nome })
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  // ── reordenar ─────────────────────────────────────────────
  const reordenarLista = async (tabela, lista, id, direcao) => {
    const ordenados = lista.slice().sort((a, b) =>
      (a.ordem ?? 0) - (b.ordem ?? 0) || (a.criado_em || '').localeCompare(b.criado_em || '')
    )
    const idx = ordenados.findIndex(i => i.id === id)
    const novoIdx = idx + direcao
    if (idx === -1 || novoIdx < 0 || novoIdx >= ordenados.length) return
    const trocado = ordenados.slice()
    ;[trocado[idx], trocado[novoIdx]] = [trocado[novoIdx], trocado[idx]]
    try {
      await Promise.all(trocado.map((item, i) => atualizarRemoto(tabela, item.id, { ordem: i })))
      await carregar()
    } catch (e) { setErro(`Erro ao reordenar: ${e.message}`) }
  }

  const moverGrupo = (grupoId, direcao) => {
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    const irmaos = grupos.filter(g => g.setor_id === grupo.setor_id)
    reordenarLista('grupos', irmaos, grupoId, direcao)
  }

  const moverMaquina = (maquinaId, direcao) => {
    const maquina = maquinas.find(m => m.id === maquinaId)
    if (!maquina) return
    const irmas = maquina.grupo_id
      ? maquinas.filter(m => m.grupo_id === maquina.grupo_id)
      : maquinas.filter(m => !m.grupo_id && m.setor_id === maquina.setor_id)
    reordenarLista('maquinas', irmas, maquinaId, direcao)
  }

  const excluir = async (tabela, id) => {
    try {
      await excluirRemoto(tabela, id)
      await carregar()
    } catch (e) { setErro(`Erro: ${e.message}`) }
  }

  // ── encerrar ronda ────────────────────────────────────────
  const novaRonda = () => {
    if (!window.confirm('Encerrar ronda atual e iniciar nova? O histórico será salvo neste aparelho.')) return
    const agora = new Date()
    const tot = { produzindo: 0, parada: 0, pendencia: 0, semCheck: 0 }
    ;[...maquinas, ...estacoes].forEach(i => i.status ? tot[i.status]++ : tot.semCheck++)
    const texto = gerarTextoRelatorio({ setores, grupos, maquinas, estacoes, operador, agora })

    try {
      const ronda = inserir('historico_rondas', {
        iniciada_por: operador || '—', iniciada_em: agora.toISOString(), encerrada_em: agora.toISOString(), texto_whatsapp: texto, resumo: tot,
      })

      const itens = [
        ...maquinas.map(m => {
          const grupo = grupos.find(g => g.id === m.grupo_id)
          const setor = setores.find(s => s.id === m.setor_id)
          return { ronda_id: ronda.id, tipo: 'maquina', item_id: m.id, nome_item: m.nome, nome_pai: grupo ? `${setor?.nome} › ${grupo.nome}` : (setor?.nome || ''), status: m.status, obs: m.obs, usuario: m.usuario, atualizado_em: m.atualizado_em }
        }),
        ...estacoes.map(e => {
          const maq = maquinas.find(m => m.id === e.maquina_id)
          return { ronda_id: ronda.id, tipo: 'estacao', item_id: e.id, nome_item: e.nome, nome_pai: maq?.nome || '', status: e.status, obs: e.obs, usuario: e.usuario, atualizado_em: e.atualizado_em }
        }),
      ]
      if (itens.length > 0) inserirVarios('historico_itens', itens)

      const limpo = { status: null, obs: '', usuario: '', atualizado_em: null }
      atualizarTodos('maquinas', limpo)
      atualizarTodos('estacoes', limpo)
      carregarLocal()
    } catch (e) {
      setErro(`Erro ao salvar histórico: ${e.message}`)
      return
    }
    setVerRelatorio(false)
  }

  const gerarRelatorio = () => setVerRelatorio(true)

  const total  = maquinas.length + estacoes.length
  const feitas = maquinas.filter(m => m.status).length + estacoes.filter(e => e.status).length

  if (carregando) return <div className="carregando">Carregando…</div>

  return (
    <div className="app">
      <header className="topo">
        <div className="marca">
          <span className="logo-marca-wrap">
            <img src={logo} alt="Ronda Manutenção" className="logo-marca" />
          </span>
          <div>
            <h1>Ronda de Produção</h1>
            <div className="sub">{feitas}/{total} verificações · salvo neste aparelho</div>
          </div>
        </div>
        <div className="topo-acoes">
          <input
            className="campo-operador"
            value={operador}
            onChange={e => salvarOperador(e.target.value)}
            placeholder="Seu nome (opcional)"
          />
          <button className="fantasma" onClick={() => setVerHistorico(true)}>📋 Histórico</button>
          <button className={`fantasma ${verManutencao ? 'ativo' : ''}`} onClick={() => setVerManutencao(true)}>
            🔧 Manutenção{atendimentos.length > 0 ? ` (${atendimentos.length})` : ''}
          </button>
          <button className={`fantasma ${gerenciar ? 'ativo' : ''}`} onClick={clicarGerenciar}>
            {gerenciar ? '🔓 Sair edição' : '⚙ Gerenciar'}
          </button>
        </div>
      </header>

      <div className="trilha-progresso">
        <div className="preenchimento-progresso" style={{ width: total ? `${(feitas/total)*100}%` : 0 }} />
      </div>

      <main className="main-arvore">
        {erro && (
          <div className="erro">
            {erro}
            <button className="fechar-erro" onClick={() => setErro('')}>✕</button>
          </div>
        )}

        {setores.length === 0 && !gerenciar ? (
          <div className="vazio" style={{ margin: 'auto' }}>
            Nenhum setor cadastrado.{' '}
            <button className="link-btn" onClick={clicarGerenciar}>Clique em ⚙ Gerenciar</button> para começar.
          </div>
        ) : (
          <PainelHierarquia
            setores={setores}
            grupos={grupos}
            maquinas={maquinas}
            estacoes={estacoes}
            gerenciar={gerenciar}
            operador={operador}
            bloqueado={false}
            aoSalvarLote={salvarLote}
            aoAddSetor={addSetor}
            aoAddGrupo={addGrupo}
            aoAddMaquina={addMaquina}
            aoAddEstacao={addEstacao}
            aoExcluir={excluir}
            aoRenomear={renomear}
            aoMoverGrupo={moverGrupo}
            aoMoverMaquina={moverMaquina}
          />
        )}
      </main>

      <footer className="rodape">
        <button className="secundario" onClick={novaRonda}>Encerrar ronda</button>
        <button className="primario" onClick={gerarRelatorio}>📲 WhatsApp</button>
      </footer>

      {mostrarLogin && <LoginAdmin aoAutenticar={onAutenticar} aoFechar={() => setMostrarLogin(false)} />}
      {verRelatorio && (
        <RelatorioModal
          setores={setores}
          grupos={grupos}
          maquinas={maquinas}
          estacoes={estacoes}
          operador={operador}
          atendimentos={atendimentos}
          aoFechar={() => setVerRelatorio(false)}
        />
      )}
      {verHistorico && <HistoricoModal aoFechar={() => setVerHistorico(false)} />}
      {verManutencao && (
        <ManutencaoPainel
          setores={setores}
          grupos={grupos}
          maquinas={maquinas}
          estacoes={estacoes}
          manutentores={manutentores}
          atendimentos={atendimentos}
          aoAdicionarManutentor={addManutentor}
          aoExcluirManutentor={removerManutentor}
          aoIniciarAtendimento={iniciarAtendimentoMaquina}
          aoEncerrarAtendimento={encerrarAtendimentoMaquina}
          aoFechar={() => setVerManutencao(false)}
        />
      )}
    </div>
  )
}
