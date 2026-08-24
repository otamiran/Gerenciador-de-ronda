import { useState } from 'react'
import { calcularCompletude } from './Maquina.jsx'

// Cartão-resumo do setor, na lista principal. Ao clicar, abre o painel em
// árvore (PainelHierarquia) já focado neste setor — a navegação entre
// grupos, máquinas e estações acontece toda dentro do painel.
export default function Setor({
  setor, maquinas, estacoes, gerenciar, aoAbrir, aoExcluir, aoRenomear,
}) {
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome]         = useState(setor.nome)

  const completas     = maquinas.filter(m => calcularCompletude(m, estacoes).completo).length
  const total         = maquinas.length
  const setorCompleto = total > 0 && completas === total

  const salvarNome = () => {
    if (novoNome.trim() && novoNome.trim() !== setor.nome) aoRenomear('setores', setor.id, novoNome.trim())
    setEditandoNome(false)
  }

  return (
    <section className={`setor ${setorCompleto ? 'setor-completo' : ''}`}>
      <div className="cabecalho-setor" onClick={() => !editandoNome && aoAbrir(setor.id)}>
        <span className="seta">›</span>

        {editandoNome ? (
          <input
            className="input-renomear input-setor"
            autoFocus value={novoNome}
            onClick={e => e.stopPropagation()}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditandoNome(false) }}
            onBlur={salvarNome}
          />
        ) : (
          <h2>
            {setorCompleto && <span className="setor-check">✓</span>}
            {setor.nome}
            {gerenciar && (
              <button className="btn-editar" onClick={e => { e.stopPropagation(); setNovoNome(setor.nome); setEditandoNome(true) }} title="Renomear setor">✏️</button>
            )}
          </h2>
        )}

        <div className="setor-progresso">
          <span className={`setor-contagem ${setorCompleto ? 'setor-contagem-ok' : ''}`}>{completas}/{total}</span>
          <div className="mini-barra">
            <div className="mini-barra-fill" style={{ width: total ? `${(completas / total) * 100}%` : 0, background: setorCompleto ? 'var(--verde)' : 'var(--azul-brilho)' }} />
          </div>
        </div>

        {gerenciar && !editandoNome && (
          <button className="excluir" onClick={e => { e.stopPropagation(); if (window.confirm(`Excluir o setor "${setor.nome}" e todos os seus grupos e máquinas?`)) aoExcluir('setores', setor.id) }}>✕</button>
        )}
      </div>
    </section>
  )
}
