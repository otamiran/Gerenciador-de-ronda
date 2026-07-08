import { useState } from 'react'
import Maquina, { calcularCompletude, proximoStatus } from './Maquina.jsx'
import AdicionarInline from './AdicionarInline.jsx'
import { STATUS } from '../constantes.js'

const temObsStatus = status => status === 'pendencia' || status === 'parada'

export default function Grupo({
  grupo, maquinas, estacoes, gerenciar, operador, bloqueado,
  aoSalvarLote, aoAddMaquina, aoAddEstacao, aoExcluir, aoRenomear,
  aoMoverMaquina, aoMover, primeiro, ultimo,
}) {
  const [recolhido, setRecolhido]       = useState(true)
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome]         = useState(grupo.nome)

  const completas     = maquinas.filter(m => calcularCompletude(m, estacoes).completo).length
  const total         = maquinas.length
  const grupoCompleto = total > 0 && completas === total

  const salvarNome = () => {
    if (novoNome.trim() && novoNome.trim() !== grupo.nome)
      aoRenomear('grupos', grupo.id, novoNome.trim())
    setEditandoNome(false)
  }

  // Clique no chip do equipamento (visão recolhida) cicla o status da
  // máquina, do mesmo jeito que o clique nas estações dentro dela.
  const ciclarMaquina = (maq, e) => {
    e.stopPropagation()
    if (bloqueado) return
    const novoStatus = proximoStatus(maq.status)

    // Ao marcar "produzindo", propaga para as estações que ainda não foram
    // explicitamente marcadas como parada/pendência — mesmo comportamento
    // da visão expandida da máquina.
    const draftEst = {}
    if (novoStatus === 'produzindo') {
      estacoes
        .filter(e2 => e2.maquina_id === maq.id && e2.status !== 'parada' && e2.status !== 'pendencia')
        .forEach(e2 => { draftEst[e2.id] = { status: 'produzindo', obs: '' } })
    }

    aoSalvarLote(
      maq.id,
      { status: novoStatus, obs: temObsStatus(novoStatus) ? (maq.obs || '') : '' },
      draftEst,
      operador,
    )
  }

  return (
    <div className={`grupo ${grupoCompleto ? 'grupo-completo' : ''}`}>

      <div className="cabecalho-grupo" onClick={() => !editandoNome && setRecolhido(r => !r)}>
        <span className="seta-grupo">{recolhido ? '▸' : '▾'}</span>

        {editandoNome ? (
          <input
            className="input-renomear input-grupo"
            autoFocus value={novoNome}
            onClick={e => e.stopPropagation()}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditandoNome(false) }}
            onBlur={salvarNome}
          />
        ) : (
          <span className="nome-grupo">
            {grupoCompleto && <span className="grupo-check">✓</span>}
            {grupo.nome}
            {gerenciar && (
              <button className="btn-editar" onClick={e => { e.stopPropagation(); setNovoNome(grupo.nome); setEditandoNome(true) }} title="Renomear grupo">✏️</button>
            )}
          </span>
        )}

        <div className="grupo-progresso">
          <span className={`grupo-contagem ${grupoCompleto ? 'grupo-contagem-ok' : ''}`}>{completas}/{total}</span>
          <div className="mini-barra mini-barra-grupo">
            <div className="mini-barra-fill" style={{ width: total ? `${(completas/total)*100}%` : 0, background: grupoCompleto ? 'var(--verde)' : 'var(--azul-brilho)' }} />
          </div>
        </div>

        {gerenciar && !editandoNome && (
          <div className="acoes-reordenar" onClick={e => e.stopPropagation()}>
            <button className="btn-mover" disabled={primeiro} onClick={() => aoMover(-1)} title="Mover grupo para cima">▲</button>
            <button className="btn-mover" disabled={ultimo} onClick={() => aoMover(1)} title="Mover grupo para baixo">▼</button>
          </div>
        )}

        {gerenciar && !editandoNome && (
          <button className="excluir" onClick={e => { e.stopPropagation(); if (window.confirm(`Excluir o grupo "${grupo.nome}" e todas as suas máquinas?`)) aoExcluir('grupos', grupo.id) }}>✕</button>
        )}
      </div>

      {!recolhido && (
        <div className="corpo-grupo">
          {maquinas.map((maq, maqIdx) => (
            <Maquina
              key={maq.id}
              maquina={maq}
              estacoes={estacoes}
              gerenciar={gerenciar}
              operador={operador}
              bloqueado={bloqueado}
              aoSalvarLote={aoSalvarLote}
              aoAddEstacao={aoAddEstacao}
              aoExcluir={aoExcluir}
              aoRenomear={aoRenomear}
              aoMover={dir => aoMoverMaquina(maq.id, dir)}
              primeiro={maqIdx === 0}
              ultimo={maqIdx === maquinas.length - 1}
            />
          ))}
          {gerenciar && <AdicionarInline rotulo="+ máquina" aoAdicionar={n => aoAddMaquina(grupo.id, n)} />}
        </div>
      )}

      {recolhido && total > 0 && (
        <div className="resumo-grupo-recolhido">
          {maquinas.map(m => {
            const { completo } = calcularCompletude(m, estacoes)
            const cor   = m.status ? STATUS[m.status].cor : 'var(--cinza-claro)'
            const emoji = m.status ? STATUS[m.status].emoji : (completo ? '✓' : '·')
            return (
              <button
                key={m.id}
                type="button"
                className={`chip-maquina-mini chip-estacao-clicavel ${completo ? 'chip-ok' : ''}`}
                style={{
                  borderColor: cor,
                  color: m.status ? cor : 'var(--cinza-texto)',
                  background: m.status === 'produzindo'
                    ? 'var(--verde-bg)'
                    : m.status === 'parada'
                    ? 'var(--amarelo-bg)'
                    : m.status === 'pendencia'
                    ? 'var(--vermelho-bg)'
                    : 'transparent',
                }}
                onClick={e => ciclarMaquina(m, e)}
                disabled={bloqueado}
                title={bloqueado ? undefined : `${m.nome}: clique para alternar status`}
              >
                {emoji} {m.nome}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
