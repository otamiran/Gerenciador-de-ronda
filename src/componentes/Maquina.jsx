import { useState, useEffect, useCallback } from 'react'
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

function placeholderObs(status) {
  return status === 'parada'
    ? 'Descreva o motivo da parada (opcional)…'
    : 'Descreva a pendência de manutenção…'
}

// Ciclo de status: sem status → produzindo → parada → pendencia → produzindo → …
const CICLO = [undefined, 'produzindo', 'parada', 'pendencia']
export function proximoStatus(atual) {
  const idx = CICLO.indexOf(atual ?? undefined)
  return CICLO[(idx + 1) % CICLO.length]
}

// ── componente ────────────────────────────────────────────

export default function Maquina({
  maquina, estacoes, gerenciar, bloqueado,
  aoSalvarLote, aoAddEstacao, aoExcluir, aoRenomear, operador,
  aoMover, primeiro, ultimo,
  // comoColuna: usado dentro do PainelHierarquia (última coluna da árvore).
  // Nesse modo a máquina não abre o próprio painel lateral — o detalhe
  // (estações, obs, status) já é exibido direto como conteúdo da coluna.
  comoColuna = false,
  // aoMudarEstadoSalvar: reporta { pendente, salvando, salvar } (ou null) pro
  // componente pai, para que um botão "Salvar" fixo no rodapé da tela possa
  // salvar a máquina aberta no momento sem precisar rolar até o fim dela.
  aoMudarEstadoSalvar,
}) {
  const minhasEstacoes = estacoes.filter(e => e.maquina_id === maquina.id)
  const [draft, setDraft]           = useState(() => buildRascunho(maquina, minhasEstacoes))
  const [salvando, setSalvando]     = useState(false)
  const [salvoOk, setSalvoOk]       = useState(false)
  // painel lateral (em vez de expandir pra baixo) mostra as estações da máquina
  const [painelAberto, setPainelAberto] = useState(false)
  const [editandoNome, setEditing]= useState(false)
  const [novoNome, setNovoNome]   = useState(maquina.nome)
  const [obsAberta, setObsAberta] = useState(() => {
    const m = {}
    if (maquina.status === 'pendencia' || maquina.status === 'parada') m['maquina'] = true
    minhasEstacoes.forEach(e => { if (e.status === 'pendencia' || e.status === 'parada') m[e.id] = true })
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

  // reporta o estado de "tem pendência / está salvando / função salvar" pro
  // pai, pra alimentar o botão "Salvar" fixo no rodapé
  useEffect(() => {
    if (!aoMudarEstadoSalvar) return
    aoMudarEstadoSalvar({ pendente: temPendente, salvando, salvar })
  }, [aoMudarEstadoSalvar, temPendente, salvando, salvar])

  useEffect(() => {
    if (!aoMudarEstadoSalvar) return
    return () => aoMudarEstadoSalvar(null)
  }, [aoMudarEstadoSalvar])

  // auto-salva qualquer alteração pendente (não só quando 100% completo).
  // Debounce curto quando a máquina fica completa (feedback rápido) e um
  // pouco maior enquanto o operador ainda está digitando/alternando status,
  // para não disparar uma gravação a cada tecla.
//  useEffect(() => {
   // if (!temPendente) return
   // const atraso = completo ? 10000 : 10000
   // const id = setTimeout(() => { salvar() }, atraso)
   // return () => clearTimeout(id)
  // }, [draft, temPendente, completo, salvar])

  // ── handlers ──────────────────────────────────────────────

  // Marcar máquina: ao escolher "produzindo", só marca estações que ainda NÃO foram
  // explicitamente definidas como "parada" ou "pendencia" (respeita intenção do operador)
  const marcarMaquina = status => {
    setDraft(d => {
      const novasEstacoes = { ...d.estacoes }
      if (status === 'produzindo' && temEstacoes) {
        minhasEstacoes.forEach(e => {
          const estAtual = novasEstacoes[e.id]?.status
          // só muda para "produzindo" se a estação NÃO estiver marcada como parada/pendência
          if (estAtual !== 'parada' && estAtual !== 'pendencia') {
            novasEstacoes[e.id] = { ...(novasEstacoes[e.id] || {}), status: 'produzindo', obs: '' }
          }
        })
      }
      return { ...d, maquina: { ...d.maquina, status }, estacoes: novasEstacoes }
    })
    setObsAberta(o => ({ ...o, maquina: status === 'pendencia' || status === 'parada' }))
    if (status === 'produzindo') {
      setObsAberta(o => ({ ...o, maquina: false }))
      if (temEstacoes) setPainelAberto(true) // abre painel lateral para mostrar estações paradas
    }
    if ((status === 'parada' || status === 'pendencia') && temEstacoes) {
      setPainelAberto(true)
    }
  }

  // Click no andon/nome da máquina cicla o status
  const ciclarMaquina = e => {
    e.stopPropagation()
    if (bloqueado || gerenciar || editandoNome) return
    marcarMaquina(proximoStatus(draft.maquina.status))
  }

  const marcarEstacao = (estId, status) => {
    setDraft(d => ({
      ...d,
      estacoes: { ...d.estacoes, [estId]: { ...(d.estacoes[estId] || {}), status } },
    }))
    setObsAberta(o => ({ ...o, [estId]: status === 'pendencia' || status === 'parada' }))
  }

  // Click no ponto colorido da estação cicla o status
  const ciclarEstacao = (estId, statusAtual, e) => {
    e.stopPropagation()
    if (bloqueado || gerenciar) return
    marcarEstacao(estId, proximoStatus(statusAtual))
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

  const corpoEstacoes = (
    <>
      {todasProduzindo && (
        <div className="faixa-todas-ok">
          ✅ Todas as {minhasEstacoes.length} estações produzindo
        </div>
      )}

      {draftEstObj.length === 0 && !gerenciar && (
        <div className="painel-lateral-vazio">Esta máquina não tem estações cadastradas.</div>
      )}

      {draftEstObj.map(est => {
        const estaOk = est.status === 'produzindo'
        return (
          <div key={est.id} className={`estacao ${estaOk ? 'estacao-ok' : ''}`}>
            <div className="linha-estacao">
              {/* Ponto colorido clicável para ciclar status */}
              <span
                className="ponto-estacao"
                style={{
                  background: est.status ? STATUS[est.status].cor : 'var(--cinza-claro)',
                  cursor: bloqueado || gerenciar ? 'default' : 'pointer',
                  transition: 'transform .12s',
                }}
                onClick={e => ciclarEstacao(est.id, est.status, e)}
                title={bloqueado || gerenciar ? undefined : `Clique para alternar: ${est.nome}`}
              />
              <span className="nome-estacao">
                {gerenciar ? (
                  <RenomearEstacao est={est} aoRenomear={aoRenomear} aoExcluir={aoExcluir} />
                ) : (
                  // Nome da estação também clicável
                  <span
                    onClick={e => ciclarEstacao(est.id, est.status, e)}
                    style={{ cursor: bloqueado ? 'default' : 'pointer' }}
                    title={bloqueado ? undefined : `Clique para alternar: ${est.nome}`}
                    className={!bloqueado ? 'nome-estacao-clicavel' : ''}
                  >
                    {est.nome}
                  </span>
                )}
              </span>
              <BotoesStatus compacto status={est.status} aoMarcar={s => marcarEstacao(est.id, s)} bloqueado={bloqueado} />
            </div>
            {obsAberta[est.id] && (
              <div className="caixa-obs">
                <textarea
                  value={draft.estacoes[est.id]?.obs || ''}
                  onChange={e => setObs(est.id, e.target.value)}
                  placeholder={placeholderObs(est.status)}
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
    </>
  )

  return (
    <div data-maquina-id={maquina.id} className={`maquina ${completo ? 'maquina-completa' : ''} ${comoColuna ? 'maquina-coluna' : ''}`}>

      <div
        className="linha-maquina"
        onClick={() => !comoColuna && (temEstacoes || gerenciar) && !editandoNome && setPainelAberto(true)}
        style={{ cursor: (!comoColuna && (temEstacoes || gerenciar)) ? 'pointer' : 'default' }}
      >
        {!comoColuna && (temEstacoes || gerenciar) && <span className="seta-maquina seta-maquina-lateral">›</span>}

        {/* Andon clicável para ciclar status */}
        <span
          onClick={ciclarMaquina}
          title={bloqueado || gerenciar ? undefined : `Clique para alternar status: ${draftMaqStatus ? STATUS[draftMaqStatus].rotulo : 'sem status'}`}
          style={{ cursor: bloqueado || gerenciar ? 'default' : 'pointer' }}
        >
          <Andon status={draftMaqStatus} />
        </span>

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
                {/* Nome clicável para ciclar status */}
                <span
                  onClick={ciclarMaquina}
                  title={bloqueado || gerenciar ? undefined : 'Clique para alternar status'}
                  style={{ cursor: bloqueado || gerenciar ? 'inherit' : 'pointer' }}
                  className={!bloqueado && !gerenciar ? 'nome-maquina-clicavel' : ''}
                >
                  {maquina.nome}
                </span>
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
              <span className="dica-marcar-tudo">Toque no nome ou andon para alternar status</span>
            )}
          </div>
        </div>

        <div className="maquina-acoes" onClick={e => e.stopPropagation()}>
          {gerenciar && (
            <div className="acoes-reordenar">
              <button className="btn-mover" disabled={primeiro} onClick={() => aoMover(-1)} title="Mover máquina para cima">▲</button>
              <button className="btn-mover" disabled={ultimo} onClick={() => aoMover(1)} title="Mover máquina para baixo">▼</button>
            </div>
          )}
          <BotoesStatus status={draftMaqStatus} aoMarcar={marcarMaquina} bloqueado={bloqueado} />
        </div>
      </div>

      {obsAberta['maquina'] && (
        <div className="caixa-obs">
          <textarea
            value={draft.maquina.obs}
            onChange={e => setObs('maquina', e.target.value)}
            placeholder={placeholderObs(draft.maquina.status)}
            rows={2}
          />
        </div>
      )}

      {/* resumo compacto sempre visível — não empurra o restante da lista para baixo */}
      {!comoColuna && temEstacoes && (
        <div className="resumo-recolhido">
          {draftEstObj.map(est => {
            const cor   = est.status ? STATUS[est.status].cor : 'var(--cinza-claro)'
            const emoji = est.status ? STATUS[est.status].emoji : '⬜'

            return (
              <button
                key={est.id}
                className="chip-estacao-clicavel"
                style={{
                  borderColor: cor,
                  color: est.status ? cor : 'var(--cinza-texto)',
                  background: est.status === 'produzindo'
                    ? 'var(--verde-bg)'
                    : est.status === 'parada'
                    ? 'var(--amarelo-bg)'
                    : est.status === 'pendencia'
                    ? 'var(--vermelho-bg)'
                    : 'transparent',
                }}
                onClick={e => {
                  e.stopPropagation()
                  if (!bloqueado) marcarEstacao(est.id, proximoStatus(est.status))
                }}
                disabled={bloqueado}
                title={`${est.nome}: clique para alternar status`}
              >
                {emoji} {est.nome}
              </button>
            )
          })}
          {todasProduzindo && (
            <span className="chip-tudo-ok-label">✓ todas ok</span>
          )}
        </div>
      )}

      {/* Detalhe das estações: em modo coluna aparece direto no corpo da
          coluna; fora dele, abre como painel lateral sobreposto */}
      {(comoColuna || (painelAberto && (temEstacoes || gerenciar))) && (
        comoColuna ? (
          <div className="detalhe-estacoes-coluna">
            {corpoEstacoes}
          </div>
        ) : (
          <div className="painel-lateral-fundo nivel-3" onClick={() => setPainelAberto(false)}>
            <div className="painel-lateral" onClick={e => e.stopPropagation()}>
              <div className="painel-lateral-cabecalho">
                <div className="painel-lateral-titulo">
                  <Andon status={draftMaqStatus} />
                  <span className="painel-lateral-nome">{maquina.nome}</span>
                </div>
                <button className="fechar-modal" onClick={() => setPainelAberto(false)}>✕</button>
              </div>

              <div className="painel-lateral-corpo">
                {corpoEstacoes}
              </div>
            </div>
          </div>
        )
      )}

      {/* {temPendente && (
        <div className="maquina-rodape">
          <span className="maquina-rodape-hint">Salvando automaticamente…</span>
          <button className="btn-salvar-maquina" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar agora'}
          </button>
        </div> }
      {salvando && <div className="barra-salvando" />})
      */}
      
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
