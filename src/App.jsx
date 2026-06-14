import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { gerarTextoRelatorio } from './constantes.js'
import Setor from './componentes/Setor.jsx'
import RelatorioModal from './componentes/RelatorioModal.jsx'
import HistoricoModal from './componentes/HistoricoModal.jsx'
import AdicionarInline from './componentes/AdicionarInline.jsx'
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
  const [carregando, setCarregando]     = useState(true)
  const [erro, setErro]                 = useState('')
  const [avisouNome, setAvisouNome]     = useState(false)

  // ── carregar ──────────────────────────────────────────────
  const carregar = useCallback(async () => {
    const [s, g, m, e] = await Promise.all([
      supabase.from('setores').select('*').order('ordem').order('criado_em'),
      supabase.from('grupos').select('*').order('ordem').order('criado_em'),
      supabase.from('maquinas').select('*').order('ordem').order('criado_em'),
      supabase.from('estacoes').select('*').order('nome', { nullsFirst: false }).then(r => {
        if (r.data) r.data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }))
        return r
      }),
    ])
    const erros = [s.error, g.error, m.error, e.error].filter(Boolean)
    if (erros.length) {
      setErro(`Erro ao carregar: ${erros[0].message}`)
    } else {
      setSetores(s.data)
      setGrupos(g.data)
      setMaquinas(m.data)
      setEstacoes(e.data)
      setErro('')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
    const canal = supabase.channel('ronda-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'setores'  }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos'   }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maquinas' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estacoes' }, carregar)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [carregar])

  const salvarOperador = v => { setOperador(v); localStorage.setItem('ronda-operador', v) }

  // ── salvar lote ───────────────────────────────────────────
  const salvarLote = useCallback(async (maquinaId, draftMaq, draftEst, op) => {
    const usuario = op || '—'
    const agora   = new Date().toISOString()
    const temObs  = status => status === 'pendencia' || status === 'parada'
    const promessas = [
      supabase.from('maquinas').update({
        status: draftMaq.status,
        obs: temObs(draftMaq.status) ? (draftMaq.obs || '') : '',
        usuario, atualizado_em: agora,
      }).eq('id', maquinaId),
      ...Object.entries(draftEst).map(([estId, d]) =>
        supabase.from('estacoes').update({
          status: d.status,
          obs: temObs(d.status) ? (d.obs || '') : '',
          usuario, atualizado_em: agora,
        }).eq('id', estId)
      ),
    ]
    const resultados = await Promise.all(promessas)
    const erroEnc = resultados.find(r => r.error)
    if (erroEnc) setErro(`Erro ao salvar: ${erroEnc.error.message}`)
  }, [])

  // ── autenticação admin ────────────────────────────────────
  const clicarGerenciar = () => {
    if (gerenciar) { setGerenciar(false); return }
    if (adminAutenticado) { setGerenciar(true) } else { setMostrarLogin(true) }
  }
  const onAutenticar = () => {
    setAdmin(true); setMostrarLogin(false); setGerenciar(true)
    setTimeout(() => { setAdmin(false); setGerenciar(false) }, 30 * 60 * 1000)
  }

  // ── estrutura ─────────────────────────────────────────────
  const addSetor = async nome => {
    if (!nome.trim()) return
    const { error } = await supabase.from('setores')
      .insert({ nome: nome.trim(), ordem: setores.length })
    if (error) setErro(`Erro: ${error.message}`)
  }

  const addGrupo = async (setorId, nome) => {
    if (!nome.trim()) return
    const { error } = await supabase.from('grupos')
      .insert({ setor_id: setorId, nome: nome.trim(), ordem: grupos.filter(g => g.setor_id === setorId).length })
    if (error) setErro(`Erro: ${error.message}`)
  }

  // máquinas sempre ligadas a um grupo agora
  const addMaquina = async (grupoId, nome) => {
    if (!nome.trim()) return
    // descobre setor_id pelo grupo
    const grupo = grupos.find(g => g.id === grupoId)
    if (!grupo) return
    const { error } = await supabase.from('maquinas').insert({
      setor_id: grupo.setor_id,
      grupo_id: grupoId,
      nome: nome.trim(),
      ordem: maquinas.filter(m => m.grupo_id === grupoId).length,
    })
    if (error) setErro(`Erro: ${error.message}`)
  }

  const addEstacao = async (maquinaId, nome) => {
    if (!nome.trim()) return
    const { error } = await supabase.from('estacoes').insert({
      maquina_id: maquinaId, nome: nome.trim(),
    })
    if (error) setErro(`Erro: ${error.message}`)
  }

  const renomear = async (tabela, id, nome) => {
    const { error } = await supabase.from(tabela).update({ nome }).eq('id', id)
    if (error) setErro(`Erro: ${error.message}`)
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
    const resultados = await Promise.all(
      trocado.map((item, i) => supabase.from(tabela).update({ ordem: i }).eq('id', item.id))
    )
    const erroEnc = resultados.find(r => r.error)
    if (erroEnc) setErro(`Erro ao reordenar: ${erroEnc.error.message}`)
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
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) setErro(`Erro: ${error.message}`)
  }

  // ── encerrar ronda ────────────────────────────────────────
  const novaRonda = async () => {
    if (!window.confirm('Encerrar ronda atual e iniciar nova? O histórico será salvo.')) return
    const agora = new Date()
    const tot = { produzindo: 0, parada: 0, pendencia: 0, semCheck: 0 }
    ;[...maquinas, ...estacoes].forEach(i => i.status ? tot[i.status]++ : tot.semCheck++)
    const texto = gerarTextoRelatorio({ setores, grupos, maquinas, estacoes, operador, agora })

    const { data: ronda, error: erRonda } = await supabase
      .from('historico_rondas')
      .insert({ iniciada_por: operador || '—', encerrada_em: agora.toISOString(), texto_whatsapp: texto, resumo: tot })
      .select().single()

    if (erRonda) { setErro(`Erro ao salvar histórico: ${erRonda.message}`); return }

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
    if (itens.length > 0) await supabase.from('historico_itens').insert(itens)

    const limpo = { status: null, obs: '', usuario: '', atualizado_em: null }
    await supabase.from('maquinas').update(limpo).not('id', 'is', null)
    await supabase.from('estacoes').update(limpo).not('id', 'is', null)
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
            <div className="sub">{feitas}/{total} verificações · tempo real</div>
          </div>
        </div>
        <div className="topo-acoes">
          <input
            className={`campo-operador ${!operador ? 'campo-operador-vazio' : ''}`}
            value={operador}
            onChange={e => { salvarOperador(e.target.value); setAvisouNome(false) }}
            placeholder="⚠ Digite seu nome"
          />
          <button className="fantasma" onClick={() => setVerHistorico(true)}>📋 Histórico</button>
          <button className={`fantasma ${gerenciar ? 'ativo' : ''}`} onClick={clicarGerenciar}>
            {gerenciar ? '🔓 Sair edição' : '⚙ Gerenciar'}
          </button>
        </div>
      </header>

      <div className="trilha-progresso">
        <div className="preenchimento-progresso" style={{ width: total ? `${(feitas/total)*100}%` : 0 }} />
      </div>

      <main className="conteudo">
        {erro && (
          <div className="erro">
            {erro}
            <button className="fechar-erro" onClick={() => setErro('')}>✕</button>
          </div>
        )}

        {!operador && (
          <div className="aviso-operador">
            <span>⚠️ Digite seu nome no campo acima antes de iniciar a ronda.</span>
          </div>
        )}

        {gerenciar && <AdicionarInline rotulo="+ Adicionar setor" aoAdicionar={addSetor} grande />}

        {setores.map(setor => (
          <Setor
            key={setor.id}
            setor={setor}
            grupos={grupos}
            maquinas={maquinas.filter(m => m.setor_id === setor.id)}
            estacoes={estacoes}
            gerenciar={gerenciar}
            operador={operador}
            bloqueado={!operador}
            aoSalvarLote={salvarLote}
            aoAddGrupo={addGrupo}
            aoAddMaquina={addMaquina}
            aoAddEstacao={addEstacao}
            aoExcluir={excluir}
            aoRenomear={renomear}
            aoMoverGrupo={moverGrupo}
            aoMoverMaquina={moverMaquina}
          />
        ))}

        {setores.length === 0 && !gerenciar && (
          <div className="vazio">
            Nenhum setor cadastrado.{' '}
            <button className="link-btn" onClick={clicarGerenciar}>Clique em ⚙ Gerenciar</button> para começar.
          </div>
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
          aoFechar={() => setVerRelatorio(false)}
        />
      )}
      {verHistorico && <HistoricoModal aoFechar={() => setVerHistorico(false)} />}
    </div>
  )
}
