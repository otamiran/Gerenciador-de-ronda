import { useState, useCallback } from 'react'
import { scrollParaMaquina } from '../utils.js'
import Grupo from './Grupo.jsx'
import Maquina, { calcularCompletude } from './Maquina.jsx'
import AdicionarInline from './AdicionarInline.jsx'

export default function Setor({
  setor, grupos, maquinas, estacoes, gerenciar, operador, bloqueado,
  aoSalvarLote, aoAddGrupo, aoAddMaquina, aoAddEstacao, aoExcluir, aoRenomear,
}) {
  const [recolhido, setRecolhido]       = useState(false)
  const [editandoNome, setEditandoNome] = useState(false)
  const [novoNome, setNovoNome]         = useState(setor.nome)

  const meusGrupos       = grupos.filter(g => g.setor_id === setor.id)
  const maquinasSemGrupo = maquinas.filter(m => !m.grupo_id)
  const todasMaquinas    = maquinas
  const completas        = todasMaquinas.filter(m => calcularCompletude(m, estacoes).completo).length
  const total            = todasMaquinas.length
  const setorCompleto    = total > 0 && completas === total

  const salvarNome = () => {
    if (novoNome.trim() && novoNome.trim() !== setor.nome) aoRenomear('setores', setor.id, novoNome.trim())
    setEditandoNome(false)
  }

  // Quando um grupo esgota suas máquinas, avança para o próximo grupo com pendentes
  const fazerAvancarGrupo = useCallback((grupoIdx) => {
    return () => {
      const proxGrupos = meusGrupos.slice(grupoIdx + 1)
      for (const g of proxGrupos) {
        const maqsDoGrupo = maquinas.filter(m => m.grupo_id === g.id)
        const pendente = maqsDoGrupo.find(m => !calcularCompletude(m, estacoes).completo)
        if (pendente) {
          const el = document.querySelector(`[data-maquina-id="${pendente.id}"]`)
          if (el) {
            scrollParaMaquina(el)
          }
          return
        }
      }
      // sem próxima nos grupos — tenta máquinas soltas
      const pendenteSolta = maquinasSemGrupo.find(m => !calcularCompletude(m, estacoes).completo)
      if (pendenteSolta) {
        const el = document.querySelector(`[data-maquina-id="${pendenteSolta.id}"]`)
        if (el) {
          scrollParaMaquina(el)
        }
      }
    }
  }, [meusGrupos, maquinas, maquinasSemGrupo, estacoes])

  // Para máquinas soltas (sem grupo) no setor
  const fazerAvancarSolta = useCallback((idx) => {
    return () => {
      const proximas = maquinasSemGrupo.slice(idx + 1)
      const pendente = proximas.find(m => !calcularCompletude(m, estacoes).completo)
      if (pendente) {
        const el = document.querySelector(`[data-maquina-id="${pendente.id}"]`)
        if (el) {
          scrollParaMaquina(el)
        }
      }
    }
  }, [maquinasSemGrupo, estacoes])

  return (
    <section className={`setor ${setorCompleto ? 'setor-completo' : ''}`}>

      <div className="cabecalho-setor" onClick={() => !editandoNome && setRecolhido(!recolhido)}>
        <span className="seta">{recolhido ? '▸' : '▾'}</span>

        {editandoNome ? (
          <input
            className="input-renomear input-setor"
            autoFocus value={novoNome}
            onClick={e => e.stopPropagation()}
            onChange={e => setNovoNome(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setEditandoNome(false) }}
            onBlur={salvarNome}
          />
        ) : (
          <h2>
            {setorCompleto && <span className="setor-check">✓</span>}
            {setor.nome}
            {gerenciar && (
              <button className="btn-editar" onClick={e => { e.stopPropagation(); setNovoNome(setor.nome); setEditandoNome(true) }} title="Renomear setor">✏️</button>
            )}
          </h2>
        )}

        <div className="setor-progresso">
          <span className={`setor-contagem ${setorCompleto ? 'setor-contagem-ok' : ''}`}>{completas}/{total}</span>
          <div className="mini-barra">
            <div className="mini-barra-fill" style={{ width: total ? `${(completas/total)*100}%` : 0, background: setorCompleto ? 'var(--verde)' : 'var(--azul-brilho)' }} />
          </div>
        </div>

        {gerenciar && !editandoNome && (
          <button className="excluir" onClick={e => { e.stopPropagation(); if (window.confirm(`Excluir o setor "${setor.nome}" e todos os seus grupos e máquinas?`)) aoExcluir('setores', setor.id) }}>✕</button>
        )}
      </div>

      {!recolhido && (
        <div className="corpo-setor">
          {gerenciar && <AdicionarInline rotulo="+ grupo de máquinas" aoAdicionar={n => aoAddGrupo(setor.id, n)} />}

          {meusGrupos.map((grupo, grupoIdx) => (
            <Grupo
              key={grupo.id}
              grupo={grupo}
              maquinas={maquinas.filter(m => m.grupo_id === grupo.id)}
              estacoes={estacoes}
              gerenciar={gerenciar}
              operador={operador}
              bloqueado={bloqueado}
              aoSalvarLote={aoSalvarLote}
              aoAddMaquina={aoAddMaquina}
              aoAddEstacao={aoAddEstacao}
              aoExcluir={aoExcluir}
              aoRenomear={aoRenomear}
              aoAvancarGrupo={fazerAvancarGrupo(grupoIdx)}
            />
          ))}

          {maquinasSemGrupo.length > 0 && (
            <div className="maquinas-sem-grupo">
              {maquinasSemGrupo.map((maq, idx) => (
                <Maquina
                  key={maq.id}
                  maquina={maq}
                  estacoes={estacoes}
                  gerenciar={gerenciar}
                  operador={operador}
                  bloqueado={bloqueado}
                  aoSalvarLote={aoSalvarLote}
                  aoAddEstacao={aoAddEstacao}
                  aoExcluir={aoExcluir}
                  aoRenomear={aoRenomear}
                  aoAvancar={fazerAvancarSolta(idx)}
                />
              ))}
            </div>
          )}

          {meusGrupos.length === 0 && maquinasSemGrupo.length === 0 && !gerenciar && (
            <div className="setor-vazio">Nenhum grupo ou máquina. Ative ⚙ Gerenciar para adicionar.</div>
          )}
        </div>
      )}
    </section>
  )
}
