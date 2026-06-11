import { STATUS } from '../constantes.js'

// Torre de sinalização (andon): vermelho / amarelo / verde
export default function Andon({ status }) {
  return (
    <div className="andon" aria-hidden="true">
      {['pendencia', 'parada', 'produzindo'].map((s) => (
        <span
          key={s}
          className="andon-luz"
          style={{
            background: status === s ? STATUS[s].cor : '#D8DCDB',
            boxShadow: status === s ? `0 0 6px ${STATUS[s].cor}` : 'none',
          }}
        />
      ))}
    </div>
  )
}
