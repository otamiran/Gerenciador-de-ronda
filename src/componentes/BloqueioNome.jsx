import { useState } from 'react'

// Overlay que bloqueia toda a tela até o operador digitar o nome
export default function BloqueioNome({ aoConfirmar }) {
  const [nome, setNome] = useState('')

  const confirmar = () => {
    const n = nome.trim()
    if (!n) return
    aoConfirmar(n)
  }

  return (
    <div className="bloqueio-fundo">
      <div className="bloqueio-card">
        <div className="bloqueio-andon">
          <span className="bm vermelho" />
          <span className="bm amarelo" />
          <span className="bm verde" />
        </div>
        <h2 className="bloqueio-titulo">Ronda de Produção</h2>
        <p className="bloqueio-desc">
          Identifique-se para iniciar o preenchimento da ronda.
        </p>
        <input
          className="bloqueio-input"
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirmar()}
          placeholder="Digite seu nome completo"
          maxLength={60}
        />
        <button
          className="bloqueio-btn"
          onClick={confirmar}
          disabled={!nome.trim()}
        >
          Iniciar ronda →
        </button>
      </div>
    </div>
  )
}
