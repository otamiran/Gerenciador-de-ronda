import { STATUS } from '../constantes.js'

export default function BotoesStatus({ status, aoMarcar, compacto }) {
  return (
    <div className={`linha-status ${compacto ? 'compacto' : ''}`}>
      {Object.entries(STATUS).map(([chave, cfg]) => {
        const ativo = status === chave
        return (
          <button
            key={chave}
            className="botao-status"
            onClick={() => aoMarcar(chave)}
            style={{
              background: ativo ? cfg.cor : 'transparent',
              color: ativo ? '#fff' : cfg.cor,
              borderColor: ativo ? cfg.cor : 'var(--cinza-claro)',
            }}
          >
            {cfg.rotulo}
          </button>
        )
      })}
    </div>
  )
}
