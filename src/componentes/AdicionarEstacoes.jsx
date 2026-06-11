import { useState } from 'react'

// Seletor de quantidade + adiciona N estações de uma vez
export default function AdicionarEstacoes({ maquinaNome, aoAdicionar }) {
  const [aberto, setAberto]       = useState(false)
  const [quantidade, setQtd]      = useState(1)

  if (!aberto)
    return (
      <button className="botao-add" onClick={() => setAberto(true)}>
        + Adicionar estações
      </button>
    )

  const confirmar = () => {
    for (let i = 1; i <= quantidade; i++) {
      aoAdicionar(`Estação ${i}`)
    }
    setAberto(false)
    setQtd(1)
  }

  return (
    <div className="form-estacoes">
      <span className="form-est-label">Quantas estações em <strong>{maquinaNome}</strong>?</span>
      <div className="form-est-controles">
        <button
          className="qty-btn"
          onClick={() => setQtd(q => Math.max(1, q - 1))}
          disabled={quantidade <= 1}
        >−</button>
        <span className="qty-valor">{quantidade}</span>
        <button
          className="qty-btn"
          onClick={() => setQtd(q => Math.min(20, q + 1))}
          disabled={quantidade >= 20}
        >+</button>
      </div>
      <div className="form-est-preview">
        {Array.from({ length: quantidade }, (_, i) => (
          <span key={i} className="est-chip">Estação {i + 1}</span>
        ))}
      </div>
      <div className="form-add" style={{ marginTop: 0 }}>
        <button className="primario" onClick={confirmar}>
          Adicionar {quantidade} estação{quantidade !== 1 ? 'ões' : ''}
        </button>
        <button className="secundario" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </div>
  )
}
