import { STATUS } from '../constantes.js'

export default function BotoesStatus({ status, aoMarcar, compacto, bloqueado }) {
  return (
    <div className={`linha-status ${compacto ? 'compacto' : ''} ${bloqueado ? 'bloqueada' : ''}`}>
      {Object.entries(STATUS).map(([chave, cfg]) => {
        const ativo = status === chave
        return (
          <button
            key={chave}
            className="botao-status"
            disabled={bloqueado}
            onClick={() => !bloqueado && aoMarcar(ativo ? undefined : chave)}
            title={bloqueado ? 'Digite seu nome para começar a ronda' : (ativo ? `${cfg.rotulo} (clique para desmarcar)` : cfg.rotulo)}
            style={{
              background:   ativo && !bloqueado ? cfg.cor : 'transparent',
              color:        bloqueado ? 'var(--cinza-claro)' : ativo ? '#fff' : cfg.cor,
              borderColor:  bloqueado ? 'var(--borda)' : ativo ? cfg.cor : 'var(--cinza-claro)',
              cursor:       bloqueado ? 'not-allowed' : 'pointer',
              opacity:      bloqueado ? 0.45 : 1,
            }}
          >
            {cfg.rotulo}
          </button>
        )
      })}
    </div>
  )
}
