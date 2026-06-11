import { useState } from 'react'

// Senha padrão — troque aqui ou use variável de ambiente VITE_ADMIN_SENHA
const SENHA_ADMIN = import.meta.env.VITE_ADMIN_SENHA || 'admin123'

export default function LoginAdmin({ aoAutenticar, aoFechar }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro]   = useState(false)
  const [shake, setShake] = useState(false)

  const tentar = () => {
    if (senha === SENHA_ADMIN) {
      aoAutenticar()
    } else {
      setErro(true)
      setSenha('')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className={`modal modal-login ${shake ? 'shake' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="login-icone">🔒</div>
        <h3>Acesso Administrador</h3>
        <p className="login-desc">Digite a senha para entrar no modo de edição da estrutura.</p>
        <input
          type="password"
          className="login-input"
          value={senha}
          autoFocus
          placeholder="Senha"
          onChange={e => { setSenha(e.target.value); setErro(false) }}
          onKeyDown={e => e.key === 'Enter' && tentar()}
        />
        {erro && <div className="login-erro">Senha incorreta</div>}
        <div className="login-acoes">
          <button className="primario" onClick={tentar}>Entrar</button>
          <button className="secundario" onClick={aoFechar}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
