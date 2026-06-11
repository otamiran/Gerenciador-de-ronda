import { useState, useEffect } from 'react'

// Campo de observação — aparece quando o item está com pendência
export default function CaixaObs({ item, aoSalvar }) {
  const [rascunho, setRascunho] = useState(item.obs || '')
  useEffect(() => setRascunho(item.obs || ''), [item.id, item.obs])

  if (item.status !== 'pendencia') return null
  const alterado = rascunho !== (item.obs || '')

  return (
    <div className="caixa-obs">
      <textarea
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        placeholder="Descreva a pendência de manutenção…"
        rows={2}
      />
      <button
        className="salvar-obs"
        disabled={!alterado}
        style={{ opacity: alterado ? 1 : 0.45 }}
        onClick={() => aoSalvar(rascunho)}
      >
        {alterado ? 'Salvar observação' : 'Observação salva'}
      </button>
    </div>
  )
}
