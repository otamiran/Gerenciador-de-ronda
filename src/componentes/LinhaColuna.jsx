import { useState } from 'react'

// Linha clicável reutilizada em todas as colunas da árvore (setor, grupo,
// máquina). Mostra nome + progresso (ou um "andon" de status quando
// informado) e, no modo gerenciar, ações de renomear/mover/excluir.
export default function LinhaColuna({
  nome, emoji, completas, total, corAndon, selecionada, temFilhos = true,
  onClick, gerenciar, onRenomear, onExcluir, tituloExcluir,
  onMoverCima, onMoverBaixo, moverPrimeiro, moverUltimo,
}) {
  const [editando, setEditando] = useState(false)
  const [novoNome, setNovoNome] = useState(nome)

  const completo = total > 0 && completas === total

  const salvar = () => {
    if (novoNome.trim() && novoNome.trim() !== nome) onRenomear(novoNome.trim())
    setEditando(false)
  }

  return (
    <div className={`linha-coluna ${selecionada ? 'linha-coluna-selecionada' : ''} ${completo ? 'linha-coluna-completa' : ''}`}>
      <button
        type="button"
        className="linha-coluna-clicavel"
        onClick={() => !editando && onClick && onClick()}
      >
        {corAndon && (
          <span className="linha-coluna-ponto" style={{ background: corAndon }} />
        )}

        <span className="linha-coluna-corpo">
          {editando ? (
            <input
              className="input-renomear"
              autoFocus value={novoNome}
              onClick={e => e.stopPropagation()}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditando(false) }}
              onBlur={salvar}
            />
          ) : (
            <span className="linha-coluna-nome">
              {completo && <span className="linha-coluna-check">✓</span>}
              {emoji ? `${emoji} ` : ''}{nome}
            </span>
          )}

          {total > 0 && !editando && (
            <span className="linha-coluna-progresso">
              <span className={`linha-coluna-contagem ${completo ? 'linha-coluna-contagem-ok' : ''}`}>{completas}/{total}</span>
              <span className="mini-barra">
                <span className="mini-barra-fill" style={{ width: `${(completas / total) * 100}%`, background: completo ? 'var(--verde)' : 'var(--azul-brilho)' }} />
              </span>
            </span>
          )}
        </span>

        {temFilhos && !editando && <span className="linha-coluna-seta">›</span>}
      </button>

      {gerenciar && !editando && (
        <div className="linha-coluna-acoes" onClick={e => e.stopPropagation()}>
          {(onMoverCima || onMoverBaixo) && (
            <>
              <button className="btn-mover" disabled={moverPrimeiro} onClick={onMoverCima} title="Mover para cima">▲</button>
              <button className="btn-mover" disabled={moverUltimo} onClick={onMoverBaixo} title="Mover para baixo">▼</button>
            </>
          )}
          {onRenomear && (
            <button className="btn-editar" onClick={() => { setNovoNome(nome); setEditando(true) }} title="Renomear">✏️</button>
          )}
          {onExcluir && (
            <button className="excluir" onClick={() => { if (window.confirm(tituloExcluir || `Excluir "${nome}"?`)) onExcluir() }}>✕</button>
          )}
        </div>
      )}
    </div>
  )
}
