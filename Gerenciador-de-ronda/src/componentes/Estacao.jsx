import { useState } from 'react'
import { STATUS } from '../constantes.js'
import BotoesStatus from './BotoesStatus.jsx'
import CaixaObs from './CaixaObs.jsx'

export default function Estacao({ estacao, gerenciar, aoMarcar, aoSalvarObs, aoExcluir, aoRenomear }) {
  const [editando, setEditando] = useState(false)
  const [novoNome, setNovoNome] = useState(estacao.nome)

  const salvarNome = () => {
    if (novoNome.trim() && novoNome.trim() !== estacao.nome) {
      aoRenomear('estacoes', estacao.id, novoNome.trim())
    }
    setEditando(false)
  }

  return (
    <div className="estacao">
      <div className="linha-estacao">
        <span
          className="ponto-estacao"
          style={{ background: estacao.status ? STATUS[estacao.status].cor : '#3A4755' }}
        />
        <span className="nome-estacao">
          {editando ? (
            <input
              className="input-renomear"
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditando(false) }}
              onBlur={salvarNome}
            />
          ) : (
            <>
              {estacao.nome}
              {gerenciar && (
                <button className="btn-editar" onClick={() => { setNovoNome(estacao.nome); setEditando(true) }} title="Renomear">✏️</button>
              )}
            </>
          )}
          {gerenciar && !editando && (
            <button className="excluir" onClick={() => aoExcluir('estacoes', estacao.id)}>✕</button>
          )}
        </span>
        <BotoesStatus
          compacto
          status={estacao.status}
          aoMarcar={s => aoMarcar('estacoes', estacao.id, s)}
        />
      </div>
      <CaixaObs item={estacao} aoSalvar={o => aoSalvarObs('estacoes', estacao.id, o)} />
    </div>
  )
}
