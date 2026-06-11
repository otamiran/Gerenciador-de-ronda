import { useState, useRef, useCallback } from 'react'
import Maquina, { calcularCompletude } from './Maquina.jsx'
import AdicionarInline from './AdicionarInline.jsx'

export default function Grupo({
  grupo, maquinas, estacoes, gerenciar, operador, bloqueado,
  aoSalvarLote, aoAddMaquina, aoAddEstacao, aoExcluir, aoRenomear,
  aoAvancarGrupo, // callback quando última máquina do grupo for concluída
}) {
  const [recolhido, setRecolhido]       = useState(false)
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

  // Gera callback de "avançar" para cada máquina:
  // procura a próxima máquina PENDENTE no DOM a partir do elemento atual,
  // e faz scroll suave para ela. Se não encontrar dentro do grupo, chama aoAvancarGrupo.
  const fazerAvancar = useCallback((idx) => {
    return () => {
      // próximas máquinas do grupo (após a atual)
      const proximas = maquinas.slice(idx + 1)
      const pendente = proximas.find(m => !calcularCompletude(m, estacoes).completo)

      if (pendente) {
        // acha o elemento DOM da próxima máquina pendente
        const el = document.querySelector(`[data-maquina-id="${pendente.id}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // destaque visual rápido
          el.classList.add('maquina-highlight')
          setTimeout(() => el.classList.remove('maquina-highlight'), 800)
        }
      } else {
        // sem próxima pendente no grupo — sobe para o nível acima
        aoAvancarGrupo?.()
      }
    }
  }, [maquinas, estacoes, aoAvancarGrupo])

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
          <button className="excluir" onClick={e => { e.stopPropagation(); if (window.confirm(`Excluir o grupo "${grupo.nome}" e todas as suas máquinas?`)) aoExcluir('grupos', grupo.id) }}>✕</button>
        )}
      </div>

      {!recolhido && (
        <div className="corpo-grupo">
          {maquinas.map((maq, idx) => (
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
              aoAvancar={fazerAvancar(idx)}
            />
          ))}
          {gerenciar && <AdicionarInline rotulo="+ máquina" aoAdicionar={n => aoAddMaquina(grupo.id, n)} />}
        </div>
      )}

      {recolhido && total > 0 && (
        <div className="resumo-grupo-recolhido">
          {maquinas.map(m => {
            const { completo } = calcularCompletude(m, estacoes)
            return (
              <span key={m.id} className={`chip-maquina-mini ${completo ? 'chip-ok' : ''}`} title={completo ? 'Concluída' : 'Pendente'}>
                {completo ? '✓' : '·'} {m.nome}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
