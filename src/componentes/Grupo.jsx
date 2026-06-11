import { useState } from 'react'
import Maquina, { calcularCompletude } from './Maquina.jsx'
import AdicionarInline from './AdicionarInline.jsx'

export default function Grupo({
  grupo, maquinas, estacoes, gerenciar, operador,
  aoSalvarLote, aoAddMaquina, aoAddEstacao, aoExcluir, aoRenomear,
}) {
  const [recolhido, setRecolhido]       = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome]         = useState(grupo.nome)

  // progresso interno do grupo
  const completas     = maquinas.filter(m => calcularCompletude(m, estacoes).completo).length
  const total         = maquinas.length
  const grupoCompleto = total > 0 && completas === total

  const salvarNome = () => {
    if (novoNome.trim() && novoNome.trim() !== grupo.nome)
      aoRenomear('grupos', grupo.id, novoNome.trim())
    setEditandoNome(false)
  }

  return (
    <div className={`grupo ${grupoCompleto ? 'grupo-completo' : ''}`}>

      {/* ── cabeçalho do grupo ── */}
      <div
        className="cabecalho-grupo"
        onClick={() => !editandoNome && setRecolhido(r => !r)}
      >
        <span className="seta-grupo">{recolhido ? '▸' : '▾'}</span>

        {editandoNome ? (
          <input
            className="input-renomear input-grupo"
            autoFocus
            value={novoNome}
            onClick={e => e.stopPropagation()}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  salvarNome()
              if (e.key === 'Escape') setEditandoNome(false)
            }}
            onBlur={salvarNome}
          />
        ) : (
          <span className="nome-grupo">
            {grupoCompleto && <span className="grupo-check">✓</span>}
            {grupo.nome}
            {gerenciar && (
              <button
                className="btn-editar"
                onClick={e => { e.stopPropagation(); setNovoNome(grupo.nome); setEditandoNome(true) }}
                title="Renomear grupo"
              >✏️</button>
            )}
          </span>
        )}

        {/* mini progresso */}
        <div className="grupo-progresso">
          <span className={`grupo-contagem ${grupoCompleto ? 'grupo-contagem-ok' : ''}`}>
            {completas}/{total}
          </span>
          <div className="mini-barra mini-barra-grupo">
            <div
              className="mini-barra-fill"
              style={{
                width: total ? `${(completas / total) * 100}%` : 0,
                background: grupoCompleto ? 'var(--verde)' : 'var(--azul-brilho)',
              }}
            />
          </div>
        </div>

        {gerenciar && !editandoNome && (
          <button
            className="excluir"
            onClick={e => {
              e.stopPropagation()
              if (window.confirm(`Excluir o grupo "${grupo.nome}" e todas as suas máquinas?`))
                aoExcluir('grupos', grupo.id)
            }}
          >✕</button>
        )}
      </div>

      {/* ── máquinas do grupo ── */}
      {!recolhido && (
        <div className="corpo-grupo">
          {maquinas.map(maq => (
            <Maquina
              key={maq.id}
              maquina={maq}
              estacoes={estacoes}
              gerenciar={gerenciar}
              operador={operador}
              aoSalvarLote={aoSalvarLote}
              aoAddEstacao={aoAddEstacao}
              aoExcluir={aoExcluir}
              aoRenomear={aoRenomear}
            />
          ))}
          {gerenciar && (
            <AdicionarInline
              rotulo="+ máquina"
              aoAdicionar={n => aoAddMaquina(grupo.id, n)}
            />
          )}
        </div>
      )}

      {/* resumo quando recolhido */}
      {recolhido && total > 0 && (
        <div className="resumo-grupo-recolhido">
          {maquinas.map(m => {
            const { completo } = calcularCompletude(m, estacoes)
            return (
              <span
                key={m.id}
                className={`chip-maquina-mini ${completo ? 'chip-ok' : ''}`}
                title={completo ? 'Concluída' : 'Pendente'}
              >
                {completo ? '✓' : '·'} {m.nome}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
