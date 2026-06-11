import { useState, useMemo } from 'react'
import { gerarTextoRelatorio } from '../constantes.js'

export default function RelatorioModal({ setores, grupos, maquinas, estacoes, operador, aoFechar }) {
  const [setoresSel, setSetoresSel] = useState(() => new Set(setores.map(s => s.id)))
  const [gruposSel,  setGruposSel]  = useState(() => new Set(grupos.map(g => g.id)))
  const [filtro,     setFiltro]     = useState('todos') // 'todos' | 'criticos'
  const [copiado,    setCopiado]    = useState(false)

  // ── toggle setor ─────────────────────────────────────────
  const toggleSetor = id => {
    setSetoresSel(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        const filhos = grupos.filter(g => g.setor_id === id).map(g => g.id)
        setGruposSel(pg => { const ng = new Set(pg); filhos.forEach(gid => ng.delete(gid)); return ng })
      } else {
        next.add(id)
        const filhos = grupos.filter(g => g.setor_id === id).map(g => g.id)
        setGruposSel(pg => { const ng = new Set(pg); filhos.forEach(gid => ng.add(gid)); return ng })
      }
      return next
    })
  }

  const toggleTodosSetores = () => {
    if (setoresSel.size === setores.length) {
      setSetoresSel(new Set()); setGruposSel(new Set())
    } else {
      setSetoresSel(new Set(setores.map(s => s.id)))
      setGruposSel(new Set(grupos.map(g => g.id)))
    }
  }

  // ── toggle grupo ─────────────────────────────────────────
  const toggleGrupo = (grupoId, setorId) => {
    setGruposSel(prev => {
      const next = new Set(prev)
      next.has(grupoId) ? next.delete(grupoId) : next.add(grupoId)
      const gruposDoSetor = grupos.filter(g => g.setor_id === setorId).map(g => g.id)
      const algumAtivo = gruposDoSetor.some(gid => next.has(gid))
      setSetoresSel(ps => { const ns = new Set(ps); algumAtivo ? ns.add(setorId) : ns.delete(setorId); return ns })
      return next
    })
  }

  const toggleTodosGruposDoSetor = setorId => {
    const filhos = grupos.filter(g => g.setor_id === setorId).map(g => g.id)
    const todosAtivos = filhos.every(gid => gruposSel.has(gid))
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

  // ── texto gerado ─────────────────────────────────────────
  const texto = useMemo(() => {
    const setoresFiltrados  = setores.filter(s => setoresSel.has(s.id))
    const gruposFiltrados   = grupos.filter(g => gruposSel.has(g.id))
    const maquinasFiltradas = maquinas.filter(m =>
      (m.grupo_id && gruposSel.has(m.grupo_id)) ||
      (!m.grupo_id && setoresSel.has(m.setor_id))
    )
    const estacoesFiltradas = estacoes.filter(e =>
      maquinasFiltradas.some(m => m.id === e.maquina_id)
    )
    if (setoresFiltrados.length === 0) return ''
    return gerarTextoRelatorio({
      setores: setoresFiltrados, grupos: gruposFiltrados,
      maquinas: maquinasFiltradas, estacoes: estacoesFiltradas,
      operador, agora: new Date(), filtro,
    })
  }, [setoresSel, gruposSel, filtro, setores, grupos, maquinas, estacoes, operador])

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = texto; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  const nenhumSelecionado = texto.length === 0

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className="modal modal-relatorio" onClick={e => e.stopPropagation()}>

        {/* cabeçalho */}
        <div className="rel-cabecalho">
          <h3>Relatório para WhatsApp</h3>
          <button className="fechar-modal" onClick={aoFechar}>✕</button>
        </div>

        {/* filtro de conteúdo */}
        <div className="rel-filtro-barra">
          <span className="rel-filtro-label">Conteúdo:</span>
          <button
            className={`chip-filtro ${filtro === 'todos' ? 'ativo' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            📋 Completo
          </button>
          <button
            className={`chip-filtro chip-filtro-critico ${filtro === 'criticos' ? 'ativo' : ''}`}
            onClick={() => setFiltro('criticos')}
          >
            ⚠️ Só pendências e paradas
          </button>
        </div>

        {/* seleção de setores + grupos */}
        <div className="rel-selecao">
          <div className="rel-nivel-titulo">
            <span>Setores</span>
            <button className="link-btn-sm" onClick={toggleTodosSetores}>
              {setoresSel.size === setores.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          </div>
          <div className="rel-chips-linha">
            {setores.map(s => {
              const ativo = setoresSel.has(s.id)
              const maqDoSetor = maquinas.filter(m => m.setor_id === s.id)
              const concluidas = maqDoSetor.filter(m => m.status).length
              return (
                <button key={s.id} className={`chip-setor-sel ${ativo ? 'ativo' : ''}`} onClick={() => toggleSetor(s.id)}>
                  <span className={`chip-check ${ativo ? 'visivel' : ''}`}>✓</span>
                  {s.nome}
                  <span className="chip-setor-count">{concluidas}/{maqDoSetor.length}</span>
                </button>
              )
            })}
          </div>

          {setores.filter(s => setoresSel.has(s.id)).map(s => {
            const gruposDoSetor = grupos.filter(g => g.setor_id === s.id)
            if (gruposDoSetor.length === 0) return null
            const todosAtivos = gruposDoSetor.every(g => gruposSel.has(g.id))
            return (
              <div key={s.id} className="rel-grupos-bloco">
                <div className="rel-nivel-titulo rel-nivel-sub">
                  <span className="rel-setor-label">↳ {s.nome}</span>
                  <button className="link-btn-sm" onClick={() => toggleTodosGruposDoSetor(s.id)}>
                    {todosAtivos ? 'Desmarcar grupos' : 'Selecionar grupos'}
                  </button>
                </div>
                <div className="rel-chips-linha">
                  {gruposDoSetor.map(g => {
                    const ativo = gruposSel.has(g.id)
                    const maqDoGrupo = maquinas.filter(m => m.grupo_id === g.id)
                    const concluidas = maqDoGrupo.filter(m => m.status).length
                    return (
                      <button key={g.id} className={`chip-grupo-sel ${ativo ? 'ativo' : ''}`} onClick={() => toggleGrupo(g.id, s.id)}>
                        <span className={`chip-check ${ativo ? 'visivel' : ''}`}>✓</span>
                        📦 {g.nome}
                        <span className="chip-setor-count">{concluidas}/{maqDoGrupo.length}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* preview */}
        {nenhumSelecionado
          ? <div className="rel-vazio">Selecione pelo menos um setor ou grupo.</div>
          : <textarea className="rel-preview" readOnly value={texto} rows={10} />
        }

        {/* ações */}
        <div className="acoes-modal">
          <button className="primario" onClick={copiar} disabled={nenhumSelecionado}>
            {copiado ? '✓ Copiado!' : 'Copiar texto'}
          </button>
          {!nenhumSelecionado && (
            <a className="link-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">
              Abrir no WhatsApp
            </a>
          )}
          <button className="secundario" onClick={aoFechar}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
