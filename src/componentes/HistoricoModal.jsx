import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase.js'
import { STATUS, gerarTextoRelatorio } from '../constantes.js'

export default function HistoricoModal({ aoFechar }) {
  const [rondas, setRondas]             = useState([])
  const [selecionada, setSelecionada]   = useState(null)
  const [itens, setItens]               = useState([])
  const [carregando, setCarregando]     = useState(true)
  const [excluindo, setExcluindo]       = useState(null)
  const [confirmLimpar, setConfirmLimpar] = useState(false)

  // seleção de setores/grupos para o texto
  const [setoresSel, setSetoresSel]   = useState(null) // null = ainda não inicializado
  const [gruposSel,  setGruposSel]    = useState(null)
  const [filtro,     setFiltro]       = useState('todos')
  const [copiado,    setCopiado]      = useState(false)

  // ── estrutura derivada dos itens da ronda ─────────────────
  // reconstrói setores/grupos/maquinas/estacoes a partir dos itens salvos
  const estrutura = useMemo(() => {
    if (!itens.length) return { setores: [], grupos: [], maquinas: [], estacoes: [] }

    // pares únicos setor › grupo a partir de nome_pai das máquinas
    const setoresMap = {}
    const gruposMap  = {}
    const maquinas   = []
    const estacoes   = []

    for (const item of itens) {
      if (item.tipo === 'maquina') {
        // nome_pai = "Setor › Grupo" ou só "Setor"
        const partes = item.nome_pai.split(' › ')
        const nomeSetor = partes[0] || 'Sem setor'
        const nomeGrupo = partes[1] || null

        if (!setoresMap[nomeSetor]) setoresMap[nomeSetor] = { id: nomeSetor, nome: nomeSetor }

        let grupoId = null
        if (nomeGrupo) {
          const chave = `${nomeSetor}__${nomeGrupo}`
          if (!gruposMap[chave]) gruposMap[chave] = { id: chave, setor_id: nomeSetor, nome: nomeGrupo }
          grupoId = chave
        }

        maquinas.push({
          id: item.item_id,
          setor_id: nomeSetor,
          grupo_id: grupoId,
          nome: item.nome_item,
          status: item.status,
          obs: item.obs,
          usuario: item.usuario,
        })
      } else {
        estacoes.push({
          id: item.item_id,
          maquina_id: item.nome_pai, // nome_pai da estação é o nome da máquina — mas usamos item_id
          // precisamos do id da máquina — vamos usar nome_pai como chave de busca
          _nomeMaq: item.nome_pai,
          nome: item.nome_item,
          status: item.status,
          obs: item.obs,
        })
      }
    }

    // corrige maquina_id das estações pelo nome da máquina
    for (const est of estacoes) {
      const maq = maquinas.find(m => m.nome === est._nomeMaq)
      est.maquina_id = maq ? maq.id : est._nomeMaq
    }

    return {
      setores: Object.values(setoresMap),
      grupos:  Object.values(gruposMap),
      maquinas,
      estacoes,
    }
  }, [itens])

  // inicializa seleção ao carregar estrutura
  useEffect(() => {
    if (estrutura.setores.length > 0) {
      setSetoresSel(new Set(estrutura.setores.map(s => s.id)))
      setGruposSel(new Set(estrutura.grupos.map(g => g.id)))
    }
  }, [estrutura])

  // ── texto gerado ─────────────────────────────────────────
  const textoGerado = useMemo(() => {
    if (!selecionada || !setoresSel || !gruposSel) return selecionada?.texto_whatsapp || ''

    const setoresFiltrados  = estrutura.setores.filter(s => setoresSel.has(s.id))
    const gruposFiltrados   = estrutura.grupos.filter(g => gruposSel.has(g.id))
    const maquinasFiltradas = estrutura.maquinas.filter(m =>
      (m.grupo_id && gruposSel.has(m.grupo_id)) ||
      (!m.grupo_id && setoresSel.has(m.setor_id))
    )
    const estacoesFiltradas = estrutura.estacoes.filter(e =>
      maquinasFiltradas.some(m => m.id === e.maquina_id)
    )
    if (setoresFiltrados.length === 0) return ''

    return gerarTextoRelatorio({
      setores: setoresFiltrados, grupos: gruposFiltrados,
      maquinas: maquinasFiltradas, estacoes: estacoesFiltradas,
      operador: selecionada.iniciada_por,
      agora: new Date(selecionada.encerrada_em || selecionada.iniciada_em),
      filtro,
    })
  }, [setoresSel, gruposSel, filtro, estrutura, selecionada])

  // ── toggle setores/grupos ─────────────────────────────────
  const toggleSetor = id => {
    setSetoresSel(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        const filhos = estrutura.grupos.filter(g => g.setor_id === id).map(g => g.id)
        setGruposSel(pg => { const ng = new Set(pg); filhos.forEach(gid => ng.delete(gid)); return ng })
      } else {
        next.add(id)
        const filhos = estrutura.grupos.filter(g => g.setor_id === id).map(g => g.id)
        setGruposSel(pg => { const ng = new Set(pg); filhos.forEach(gid => ng.add(gid)); return ng })
      }
      return next
    })
  }

  const toggleGrupo = (grupoId, setorId) => {
    setGruposSel(prev => {
      const next = new Set(prev)
      next.has(grupoId) ? next.delete(grupoId) : next.add(grupoId)
      const gruposDoSetor = estrutura.grupos.filter(g => g.setor_id === setorId).map(g => g.id)
      const algumAtivo = gruposDoSetor.some(gid => next.has(gid))
      setSetoresSel(ps => { const ns = new Set(ps); algumAtivo ? ns.add(setorId) : ns.delete(setorId); return ns })
      return next
    })
  }

  const toggleTodosSetores = () => {
    if (setoresSel?.size === estrutura.setores.length) {
      setSetoresSel(new Set()); setGruposSel(new Set())
    } else {
      setSetoresSel(new Set(estrutura.setores.map(s => s.id)))
      setGruposSel(new Set(estrutura.grupos.map(g => g.id)))
    }
  }

  const toggleTodosGruposDoSetor = setorId => {
    const filhos = estrutura.grupos.filter(g => g.setor_id === setorId).map(g => g.id)
    const todosAtivos = filhos.every(gid => gruposSel?.has(gid))
    setGruposSel(prev => {
      const next = new Set(prev)
      if (todosAtivos) {
        filhos.forEach(gid => next.delete(gid))
        setSetoresSel(ps => { const ns = new Set(ps); ns.delete(setorId); return ns })
      } else {
        filhos.forEach(gid => next.add(gid))
        setSetoresSel(ps => new Set([...ps, setorId]))
      }
      return next
    })
  }

  // ── buscar rondas ─────────────────────────────────────────
  const buscarRondas = async () => {
    const { data, error } = await supabase
      .from('historico_rondas').select('*')
      .order('iniciada_em', { ascending: false }).limit(100)
    if (!error) setRondas(data || [])
    setCarregando(false)
  }
  useEffect(() => { buscarRondas() }, [])

  const abrirRonda = async ronda => {
    setSelecionada(ronda)
    setSetoresSel(null); setGruposSel(null)
    setFiltro('todos'); setCopiado(false)
    const { data } = await supabase
      .from('historico_itens').select('*')
      .eq('ronda_id', ronda.id).order('tipo').order('nome_pai')
    setItens(data || [])
  }

  const voltar = () => { setSelecionada(null); setItens([]); setSetoresSel(null); setGruposSel(null) }

  // ── exclusão ──────────────────────────────────────────────
  const excluirRonda = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Excluir esta ronda do histórico?')) return
    setExcluindo(id)
    await supabase.from('historico_rondas').delete().eq('id', id)
    setRondas(prev => prev.filter(r => r.id !== id))
    if (selecionada?.id === id) voltar()
    setExcluindo(null)
  }

  const limparTudo = async () => {
    setCarregando(true); setConfirmLimpar(false)
    await supabase.from('historico_rondas').delete().not('id', 'is', null)
    setRondas([]); voltar(); setCarregando(false)
  }

  const copiar = async () => {
    try { await navigator.clipboard.writeText(textoGerado) }
    catch {
      const t = document.createElement('textarea')
      t.value = textoGerado; document.body.appendChild(t); t.select()
      document.execCommand('copy'); document.body.removeChild(t)
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  const fmt = iso => {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }

  const resumoRonda = r => {
    const res = r.resumo || {}
    const parts = []
    if (res.produzindo) parts.push(`✅ ${res.produzindo}`)
    if (res.parada)     parts.push(`🟡 ${res.parada}`)
    if (res.pendencia)  parts.push(`🔴 ${res.pendencia}`)
    if (res.semCheck)   parts.push(`⬜ ${res.semCheck}`)
    return parts.join(' · ') || 'Sem dados'
  }

  const nenhumSelecionado = !textoGerado

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className="modal modal-historico" onClick={e => e.stopPropagation()}>

        {/* cabeçalho */}
        <div className="hist-cabecalho">
          {selecionada
            ? <button className="fantasma-escuro" onClick={voltar}>← Voltar</button>
            : <h3>Histórico de rondas</h3>
          }
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!selecionada && rondas.length > 0 && (
              confirmLimpar ? (
                <>
                  <span style={{ fontSize: 12, color: 'var(--cinza-texto)' }}>Confirmar?</span>
                  <button className="btn-excluir-hist" onClick={limparTudo}>Sim, limpar</button>
                  <button className="fantasma-escuro" onClick={() => setConfirmLimpar(false)}>Não</button>
                </>
              ) : (
                <button className="btn-limpar-hist" onClick={() => setConfirmLimpar(true)}>🗑 Limpar tudo</button>
              )
            )}
            <button className="fechar-modal" onClick={aoFechar}>✕</button>
          </div>
        </div>

        {/* lista */}
        {!selecionada && (
          <div className="hist-lista">
            {carregando && <div className="hist-vazio">Carregando…</div>}
            {!carregando && rondas.length === 0 && <div className="hist-vazio">Nenhuma ronda no histórico.</div>}
            {rondas.map(r => (
              <div key={r.id} className={`hist-item ${excluindo === r.id ? 'hist-item-excluindo' : ''}`} onClick={() => abrirRonda(r)}>
                <div className="hist-item-data">{fmt(r.encerrada_em || r.iniciada_em)}</div>
                <div className="hist-item-op">{r.iniciada_por && r.iniciada_por !== '—' ? `👤 ${r.iniciada_por}` : ''}</div>
                <div className="hist-item-resumo">{resumoRonda(r)}</div>
                <button className="btn-excluir-item" title="Excluir" onClick={e => excluirRonda(r.id, e)} disabled={excluindo === r.id}>
                  {excluindo === r.id ? '…' : '🗑'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* detalhe */}
        {selecionada && (
          <div className="hist-detalhe">
            {/* info da ronda */}
            <div className="hist-detalhe-info">
              <strong>{fmt(selecionada.encerrada_em)}</strong>
              {selecionada.iniciada_por && selecionada.iniciada_por !== '—' && (
                <span className="hist-badge-op">👤 {selecionada.iniciada_por}</span>
              )}
              <span className="hist-resumo-badge">{resumoRonda(selecionada)}</span>
              <button className="btn-excluir-hist" style={{ marginLeft: 'auto' }} onClick={e => excluirRonda(selecionada.id, e)}>
                🗑 Excluir
              </button>
            </div>

            {/* itens */}
            <div className="hist-itens">
              {itens.map(item => (
                <div key={item.id} className={`hist-linha ${item.tipo}`}>
                  <span className="hist-emoji">{item.status ? STATUS[item.status].emoji : '⬜'}</span>
                  <div className="hist-linha-info">
                    <span className="hist-nome-pai">{item.nome_pai}</span>
                    <span className="hist-nome-item">{item.tipo === 'estacao' ? `• ${item.nome_item}` : item.nome_item}</span>
                    <span className="hist-status" style={{ color: item.status ? STATUS[item.status].cor : '#9FB0AC' }}>
                      {item.status ? STATUS[item.status].rotulo : 'Não verificada'}
                    </span>
                    {item.obs && <span className="hist-obs">↳ {item.obs}</span>}
                  </div>
                  {item.usuario && item.usuario !== '—' && <span className="hist-usuario">{item.usuario}</span>}
                </div>
              ))}
            </div>

            {/* seleção para exportar */}
            <div className="hist-exportar">
              <div className="hist-exp-titulo">Exportar para WhatsApp</div>

              {/* filtro crítico */}
              <div className="rel-filtro-barra">
                <span className="rel-filtro-label">Conteúdo:</span>
                <button className={`chip-filtro ${filtro === 'todos' ? 'ativo' : ''}`} onClick={() => setFiltro('todos')}>
                  📋 Completo
                </button>
                <button className={`chip-filtro chip-filtro-critico ${filtro === 'criticos' ? 'ativo' : ''}`} onClick={() => setFiltro('criticos')}>
                  ⚠️ Só pendências e paradas
                </button>
              </div>

              {/* setores */}
              {estrutura.setores.length > 1 && (
                <div className="rel-selecao rel-selecao-hist">
                  <div className="rel-nivel-titulo">
                    <span>Setores</span>
                    <button className="link-btn-sm" onClick={toggleTodosSetores}>
                      {setoresSel?.size === estrutura.setores.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="rel-chips-linha">
                    {estrutura.setores.map(s => (
                      <button key={s.id} className={`chip-setor-sel ${setoresSel?.has(s.id) ? 'ativo' : ''}`} onClick={() => toggleSetor(s.id)}>
                        <span className={`chip-check ${setoresSel?.has(s.id) ? 'visivel' : ''}`}>✓</span>
                        {s.nome}
                      </button>
                    ))}
                  </div>

                  {estrutura.setores.filter(s => setoresSel?.has(s.id)).map(s => {
                    const gruposDoSetor = estrutura.grupos.filter(g => g.setor_id === s.id)
                    if (gruposDoSetor.length === 0) return null
                    return (
                      <div key={s.id} className="rel-grupos-bloco">
                        <div className="rel-nivel-titulo rel-nivel-sub">
                          <span className="rel-setor-label">↳ {s.nome}</span>
                          <button className="link-btn-sm" onClick={() => toggleTodosGruposDoSetor(s.id)}>
                            {gruposDoSetor.every(g => gruposSel?.has(g.id)) ? 'Desmarcar grupos' : 'Selecionar grupos'}
                          </button>
                        </div>
                        <div className="rel-chips-linha">
                          {gruposDoSetor.map(g => (
                            <button key={g.id} className={`chip-grupo-sel ${gruposSel?.has(g.id) ? 'ativo' : ''}`} onClick={() => toggleGrupo(g.id, s.id)}>
                              <span className={`chip-check ${gruposSel?.has(g.id) ? 'visivel' : ''}`}>✓</span>
                              📦 {g.nome}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="acoes-modal" style={{ marginTop: 8 }}>
                <button className="primario" onClick={copiar} disabled={nenhumSelecionado}>
                  {copiado ? '✓ Copiado!' : 'Copiar texto'}
                </button>
                {!nenhumSelecionado && (
                  <a className="link-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(textoGerado)}`} target="_blank" rel="noreferrer">
                    Abrir no WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
