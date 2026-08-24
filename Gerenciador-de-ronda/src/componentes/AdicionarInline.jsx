import { useState } from 'react'

export default function AdicionarInline({ rotulo, aoAdicionar, grande }) {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')

  if (!aberto)
    return (
      <button className={`botao-add ${grande ? 'grande' : ''}`} onClick={() => setAberto(true)}>
        {rotulo}
      </button>
    )

  const enviar = () => {
    aoAdicionar(valor)
    setValor('')
    setAberto(false)
  }

  return (
    <div className="form-add">
      <input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && enviar()}
        placeholder="Nome…"
      />
      <button className="primario" onClick={enviar}>Adicionar</button>
      <button className="secundario" onClick={() => setAberto(false)}>Cancelar</button>
    </div>
  )
}
