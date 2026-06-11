import { useState, useEffect, useRef, useCallback } from 'react'
import { STATUS } from '../constantes.js'
import Andon from './Andon.jsx'
import BotoesStatus from './BotoesStatus.jsx'
import AdicionarEstacoes from './AdicionarEstacoes.jsx'

// ── helpers ───────────────────────────────────────────────

export function calcularCompletude(maquina, estacoes) {
  const minhasEstacoes = estacoes.filter(e => e.maquina_id === maquina.id)
  const totalItens = 1 + minhasEstacoes.length
  const marcados   = (maquina.status ? 1 : 0) + minhasEstacoes.filter(e => e.status).length
  return {
    totalItens, marcados,
    completo: marcados === totalItens,
    parcial:  marcados > 0 && marcados < totalItens,
  }
}

function buildRascunho(maquina, estacoes) {
  const draft = { maquina: { status: maquina.status, obs: maquina.obs || '' }, estacoes: {} }
  estacoes.filter(e => e.maquina_id === maquina.id).forEach(e => {
    draft.estacoes[e.id] = { status: e.status, obs: e.obs || '' }
  })
  return draft
}

// ── componente ────────────────────────────────────────────

export default function Maquina({
  maquina, estacoes, gerenciar, bloqueado,
  aoSalvarLote, aoAddEstacao, aoExcluir, aoRenomear, operador,
  aoAvancar, // callback: () => void — scroll para a próxima máquina
}) {
  const minhasEstacoes = estacoes.filter(e => e.maquina_id === maquina.id)
  const meuRef = useRef(null) // ref do div raiz desta máquina

  const [draft, setDraft]         = useState(() => buildRascunho(maquina, minhasEstacoes))
  const [salvando, setSalvando]   = useState(false)
  const [salvoOk, setSalvoOk]     = useState(false)
  const [recolhido, setRecolhido] = useState(false)
  const [editandoNome, setEditing]= useState(false)
  const [novoNome, setNovoNome]   = useState(maquina.nome)
  const [obsAberta, setObsAberta] = useState(() => {
    const m = {}
    if (maquina.status === 'pendencia') m['maquina'] = true
    minhasEstacoes.forEach(e => { if (e.status === 'pendencia') m[e.id] = true })
    return m
  })

  useEffect(() => {
    const remoto = buildRascunho(maquina, minhasEstacoes)
    setDraft(prev => {
      const maqIgual = prev.maquina.status === remoto.maquina.status && prev.maquina.obs === remoto.maquina.obs
      const estIguais = minhasEstacoes.every(e => {
        const lc = prev.estacoes[e.id]
        return lc && lc.status === e.status && lc.obs === (e.obs || '')
      })
      return (maqIgual && estIguais) ? prev : remoto
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maquina.status, maquina.obs, maquina.atualizado_em, estacoes])

  const draftMaqObj = { ...maquina, status: draft.maquina.status, obs: draft.maquina.obs }
  const draftEstObj = minhasEstacoes.map(e => ({ ...e, ...(draft.estacoes[e.id] || {}) }))
  const { totalItens, marcados, completo, parcial } = calcularCompletude(draftMaqObj, draftEstObj)
  const temEstacoes = minhasEstacoes.length > 0

  const temPendente = !salvando && (
    draft.maquina.status !== maquina.status ||
    draft.maquina.obs    !== (maquina.obs || '') ||
    minhasEstacoes.some(e => {
      const lc = draft.estacoes[e.id] || {}
      return lc.status !== e.status || lc.obs !== (e.obs || '')
    })
  )

  // ── salvar ────────────────────────────────────────────────
  const salvar = useCallback(async () => {
    if (salvando) return
    setSalvando(true)
    await aoSalvarLote(maquina.id, draft.maquina, draft.estacoes, operador)
    setSalvando(false)
    setSalvoOk(true)
    setTimeout(() => setSalvoOk(false), 1800)
  }, [salvando, aoSalvarLote, maquina.id, draft, operador])

  // auto-salva quando completo
  const prevCompleto = useRef(completo)
  useEffect(() => {
    if (completo && !prevCompleto.current && temPendente) salvar()
    prevCompleto.current = completo
  }, [completo, temPendente, salvar])

  // ── avançar para próxima após colapso ─────────────────────
  // Chamado quando o usuário marca "Produzindo" sem estações (ou tudo ok)
  const triggerAvancar = useCallback(() => {
    // pequeno delay para o colapso acontecer visualmente antes do scroll
    setTimeout(() => aoAvancar?.(), 220)
  }, [aoAvancar])

  // ── handlers ──────────────────────────────────────────────
  const marcarMaquina = status => {
    setDraft(d => {
      const novasEstacoes = { ...d.estacoes }
      if (status === 'produzindo' && temEstacoes) {
        minhasEstacoes.forEach(e => {
          novasEstacoes[e.id] = { ...(novasEstacoes[e.id] || {}), status: 'produzindo', obs: '' }
        })
      }
      return { ...d, maquina: { ...d.maquina, status }, estacoes: novasEstacoes }
    })
    setObsAberta(o => ({ ...o, maquina: status === 'pendencia' }))
    if (status === 'produzindo') {
      setObsAberta({ maquina: false })
      // colapsa se tem estações (ficam marcadas)
      if (temEstacoes) setRecolhido(true)
      // avança para a próxima
      triggerAvancar()
    }
    if ((status === 'parada' || status === 'pendencia') && temEstacoes) {
      setRecolhido(false)
    }
  }

  const marcarEstacao = (estId, status) => {
    setDraft(d => ({
      ...d,
      estacoes: { ...d.estacoes, [estId]: { ...(d.estacoes[estId] || {}), status } },
    }))
    setObsAberta(o => ({ ...o, [estId]: status === 'pendencia' }))
  }

  const setObs = (key, obs) => {
    if (key === 'maquina') {
      setDraft(d => ({ ...d, maquina: { ...d.maquina, obs } }))
    } else {
      setDraft(d => ({
        ...d,
        estacoes: { ...d.estacoes, [key]: { ...(d.estacoes[key] || {}), obs } },
      }))
    }
  }

  const salvarNome = () => {
    if (novoNome.trim() && novoNome.trim() !== maquina.nome) aoRenomear('maquinas', maquina.id, novoNome.trim())
    setEditing(false)
  }

  const badgeClass = completo ? 'badge-completo' : parcial ? 'badge-parcial' : 'badge-pendente'
  const badgeLabel = completo
    ? (salvoOk ? '✓ Salvo!' : '✓ Concluída')
    : parcial ? `${marcados}/${totalItens}` : 'Pendente'

  const draftMaqStatus = draft.maquina.status
  const todasProduzindo = temEstacoes &&
    draftEstObj.every(e => e.status === 'produzindo') &&
    draftMaqStatus === 'produzindo'

  return (
    <div ref={meuRef} data-maquina-id={maquina.id} className={`maquina ${completo ? 'maquina-completa' : ''}`}>

      <div
        className="linha-maquina"
        onClick={() => temEstacoes && !editandoNome && setRecolhido(r => !r)}
        style={{ cursor: temEstacoes ? 'pointer' : 'default' }}
      >
        {temEstacoes && <span className="seta-maquina">{recolhido ? '▸' : '▾'}</span>}

        <Andon status={draftMaqStatus} />

        <div className="info-maquina">
          <div className="nome-maquina">
            {editandoNome ? (
              <input
                className="input-renomear"
                autoFocus value={novoNome}
                onClick={e => e.stopPropagation()}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditing(false) }}
                onBlur={salvarNome}
              />
            ) : (
              <>
                {maquina.nome}
                {gerenciar && (
                  <button className="btn-editar" onClick={e => { e.stopPropagation(); setNovoNome(maquina.nome); setEditing(true) }} title="Renomear">✏️</button>
                )}
              </>
            )}
            {gerenciar && !editandoNome && (
              <button className="excluir" onClick={e => { e.stopPropagation(); if (window.confirm(`Excluir "${maquina.nome}"?`)) aoExcluir('maquinas', maquina.id) }}>✕</button>
            )}
          </div>

          <div className="maquina-meta-row">
            <span className={`badge-completude ${badgeClass}`}>{badgeLabel}</span>
            {draftMaqStatus && (
              <span className="meta-maquina">
                {STATUS[draftMaqStatus].emoji} {STATUS[draftMaqStatus].rotulo}
                {maquina.usuario ? ` · ${maquina.usuario}` : ''}
              </span>
            )}
            {temEstacoes && !draftMaqStatus && (
              <span className="dica-marcar-tudo">▸ "Produzindo" marca todas as estações</span>
            )}
          </div>
        </div>

        <div className="maquina-acoes" onClick={e => e.stopPropagation()}>
          <BotoesStatus status={draftMaqStatus} aoMarcar={marcarMaquina} bloqueado={bloqueado} />
        </div>
      </div>

      {obsAberta['maquina'] && (
        <div className="caixa-obs">
          <textarea
            value={draft.maquina.obs}
            onChange={e => setObs('maquina', e.target.value)}
            placeholder="Descreva a pendência de manutenção…"
            rows={2}
          />
        </div>
      )}

      {(temEstacoes || gerenciar) && !recolhido && (
        <div className="estacoes">
          {todasProduzindo && !gerenciar && (
            <div className="faixa-todas-ok">
              ✅ Todas as {minhasEstacoes.length} estações produzindo
            </div>
          )}

          {draftEstObj.map(est => {
            const estaOk = est.status === 'produzindo'
            const mostrarCompacto = todasProduzindo && !gerenciar
            return (
              <div key={est.id} className={`estacao ${mostrarCompacto ? 'estacao-compacta' : ''} ${estaOk && !mostrarCompacto ? 'estacao-ok' : ''}`}>
                <div className="linha-estacao">
                  <span className="ponto-estacao" style={{ background: est.status ? STATUS[est.status].cor : 'var(--cinza-claro)' }} />
                  <span className="nome-estacao">
                    {gerenciar ? (
                      <RenomearEstacao est={est} aoRenomear={aoRenomear} aoExcluir={aoExcluir} />
                    ) : est.nome}
                  </span>
                  {mostrarCompacto ? (
                    <span className="estacao-status-icon" onClick={e => { e.stopPropagation(); setRecolhido(false) }}>
                      {STATUS[est.status].emoji}
                    </span>
                  ) : (
                    <BotoesStatus compacto status={est.status} aoMarcar={s => marcarEstacao(est.id, s)} bloqueado={bloqueado} />
                  )}
                </div>
                {obsAberta[est.id] && (
                  <div className="caixa-obs">
                    <textarea
                      value={draft.estacoes[est.id]?.obs || ''}
                      onChange={e => setObs(est.id, e.target.value)}
                      placeholder="Descreva a pendência…"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {gerenciar && (
            <AdicionarEstacoes maquinaNome={maquina.nome} aoAdicionar={nome => aoAddEstacao(maquina.id, nome)} />
          )}
        </div>
      )}

      {temEstacoes && recolhido && (
        <div className="resumo-recolhido">
          {todasProduzindo ? (
            <span className="chip-tudo-ok">✅ Todas as {minhasEstacoes.length} estações produzindo</span>
          ) : (
            draftEstObj.map(est => (
              <span key={est.id} className="chip-estacao-mini"
                style={{
                  borderColor: est.status ? STATUS[est.status].cor : 'var(--cinza-claro)',
                  color:       est.status ? STATUS[est.status].cor : 'var(--cinza-texto)',
                }}
              >
                {est.status ? STATUS[est.status].emoji : '⬜'} {est.nome}
              </span>
            ))
          )}
        </div>
      )}

      {temPendente && (
        <div className="maquina-rodape">
          <span className="maquina-rodape-hint">Alterações não salvas</span>
          <button className="btn-salvar-maquina" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      )}
      {salvando && <div className="barra-salvando" />}
    </div>
  )
}

function RenomearEstacao({ est, aoRenomear, aoExcluir }) {
  const [editando, setEditando] = useState(false)
  const [nome, setNome]         = useState(est.nome)
  const salvar = () => {
    if (nome.trim() && nome.trim() !== est.nome) aoRenomear('estacoes', est.id, nome.trim())
    setEditando(false)
  }
  if (editando)
    return (
      <input className="input-renomear" autoFocus value={nome}
        onChange={e => setNome(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditando(false) }}
        onBlur={salvar}
      />
    )
  return (
    <>
      {est.nome}
      <button className="btn-editar" onClick={() => { setNome(est.nome); setEditando(true) }} title="Renomear">✏️</button>
      <button className="excluir" onClick={() => aoExcluir('estacoes', est.id)}>✕</button>
    </>
  )
}
