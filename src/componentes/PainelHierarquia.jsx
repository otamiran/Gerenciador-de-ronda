import { useEffect, useRef, useState } from 'react'
import Maquina, { calcularCompletude } from './Maquina.jsx'
import AdicionarInline from './AdicionarInline.jsx'
import LinhaColuna from './LinhaColuna.jsx'
import { STATUS } from '../constantes.js'

// Painel lateral "em árvore": abre para o lado (como antes), mas em vez de
// cada nível esconder o anterior, os níveis viram colunas lado a lado
// (setor → grupo → máquina → estações), como uma navegação em cascata.
// Em telas largas as colunas ficam visíveis simultaneamente; em telas
// estreitas rolam horizontalmente uma de cada vez, com as migalhas de pão
// no topo permitindo pular direto para qualquer nível — assim dá pra trocar
// de setor ou de máquina sem fechar o painel.
export default function PainelHierarquia({
  setores, grupos, maquinas, estacoes, gerenciar, operador, bloqueado,
  setorInicialId, aoFechar,
  aoSalvarLote, aoAddSetor, aoAddGrupo, aoAddMaquina, aoAddEstacao,
  aoExcluir, aoRenomear, aoMoverGrupo, aoMoverMaquina,
}) {
  const [setorSelId, setSetorSelId]     = useState(setorInicialId || null)
  const [grupoSelId, setGrupoSelId]     = useState(null)
  const [maquinaSelId, setMaquinaSelId] = useState(null)

  const col1Ref = useRef(null)
  const col2Ref = useRef(null)
  const col3Ref = useRef(null)
  const col4Ref = useRef(null)

  // sempre que o setor "de entrada" mudar (usuário abriu a árvore a partir
  // de outro cartão de setor na lista principal), foca nele
  useEffect(() => {
    setSetorSelId(setorInicialId || null)
    setGrupoSelId(null)
    setMaquinaSelId(null)
  }, [setorInicialId])

  // rola até a coluna mais profunda sempre que a seleção avança
  useEffect(() => {
    const alvo = maquinaSelId ? col4Ref.current : grupoSelId ? col3Ref.current : setorSelId ? col2Ref.current : col1Ref.current
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }, [setorSelId, grupoSelId, maquinaSelId])

  const irPara = ref => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })

  const setor   = setores.find(s => s.id === setorSelId) || null
  const grupo   = grupos.find(g => g.id === grupoSelId) || null
  const maquina = maquinas.find(m => m.id === maquinaSelId) || null

  const selecionarSetor = id => { setSetorSelId(id); setGrupoSelId(null); setMaquinaSelId(null) }
  const selecionarGrupo = id => { setGrupoSelId(id); setMaquinaSelId(null) }
  const selecionarMaquinaDireta = id => { setGrupoSelId(null); setMaquinaSelId(id) }
  const selecionarMaquina = id => setMaquinaSelId(id)

  const meusGrupos       = setor ? grupos.filter(g => g.setor_id === setor.id) : []
  const maquinasSemGrupo = setor ? maquinas.filter(m => m.setor_id === setor.id && !m.grupo_id) : []
  const maquinasDoGrupo  = grupo ? maquinas.filter(m => m.grupo_id === grupo.id) : []

  return (
    <div className="painel-hierarquia-fundo" onClick={aoFechar}>
      <div className="painel-hierarquia" onClick={e => e.stopPropagation()}>

        <div className="painel-hierarquia-topo">
          <div className="trilha-migalhas">
            <button className="migalha" onClick={() => irPara(col1Ref)}>🏭 Setores</button>
            {setor && (
              <>
                <span className="migalha-sep">›</span>
                <button className={`migalha ${!grupo && !maquina ? 'migalha-atual' : ''}`} onClick={() => irPara(col2Ref)}>{setor.nome}</button>
              </>
            )}
            {grupo && (
              <>
                <span className="migalha-sep">›</span>
                <button className={`migalha ${!maquina ? 'migalha-atual' : ''}`} onClick={() => irPara(col3Ref)}>{grupo.nome}</button>
              </>
            )}
            {maquina && (
              <>
                <span className="migalha-sep">›</span>
                <button className="migalha migalha-atual" onClick={() => irPara(col4Ref)}>{maquina.nome}</button>
              </>
            )}
          </div>
          <button className="fechar-modal" onClick={aoFechar}>✕</button>
        </div>

        <div className="colunas-scroll">

          {/* coluna 1 — todos os setores, sempre presente (permite trocar de setor sem fechar o painel) */}
          <div className="coluna coluna-setores" ref={col1Ref}>
            <div className="coluna-cabecalho">Setores</div>
            <div className="coluna-corpo">
              {gerenciar && <AdicionarInline rotulo="+ Adicionar setor" aoAdicionar={aoAddSetor} />}
              {setores.map(s => {
                const maqsSetor = maquinas.filter(m => m.setor_id === s.id)
                const completas = maqsSetor.filter(m => calcularCompletude(m, estacoes).completo).length
                return (
                  <LinhaColuna
                    key={s.id}
                    nome={s.nome}
                    completas={completas}
                    total={maqsSetor.length}
                    selecionada={s.id === setorSelId}
                    onClick={() => selecionarSetor(s.id)}
                    gerenciar={gerenciar}
                    onRenomear={n => aoRenomear('setores', s.id, n)}
                    onExcluir={() => aoExcluir('setores', s.id)}
                    tituloExcluir={`Excluir o setor "${s.nome}" e todos os seus grupos e máquinas?`}
                  />
                )
              })}
              {setores.length === 0 && <div className="painel-lateral-vazio">Nenhum setor cadastrado.</div>}
            </div>
          </div>

          {/* coluna 2 — grupos e máquinas sem grupo do setor selecionado */}
          {setor && (
            <div className="coluna coluna-grupos" ref={col2Ref}>
              <div className="coluna-cabecalho">{setor.nome}</div>
              <div className="coluna-corpo">
                {gerenciar && <AdicionarInline rotulo="+ grupo de máquinas" aoAdicionar={n => aoAddGrupo(setor.id, n)} />}

                {meusGrupos.map((g, idx) => {
                  const maqsGrupo = maquinas.filter(m => m.grupo_id === g.id)
                  const completas = maqsGrupo.filter(m => calcularCompletude(m, estacoes).completo).length
                  return (
                    <LinhaColuna
                      key={g.id}
                      emoji="📦"
                      nome={g.nome}
                      completas={completas}
                      total={maqsGrupo.length}
                      selecionada={g.id === grupoSelId}
                      onClick={() => selecionarGrupo(g.id)}
                      gerenciar={gerenciar}
                      onRenomear={n => aoRenomear('grupos', g.id, n)}
                      onExcluir={() => aoExcluir('grupos', g.id)}
                      tituloExcluir={`Excluir o grupo "${g.nome}" e todas as suas máquinas?`}
                      onMoverCima={() => aoMoverGrupo(g.id, -1)}
                      onMoverBaixo={() => aoMoverGrupo(g.id, 1)}
                      moverPrimeiro={idx === 0}
                      moverUltimo={idx === meusGrupos.length - 1}
                    />
                  )
                })}

                {maquinasSemGrupo.map((m, idx) => {
                  const { marcados, totalItens } = calcularCompletude(m, estacoes)
                  return (
                    <LinhaColuna
                      key={m.id}
                      nome={m.nome}
                      completas={marcados}
                      total={totalItens}
                      corAndon={m.status ? STATUS[m.status].cor : 'var(--cinza-claro)'}
                      selecionada={m.id === maquinaSelId}
                      onClick={() => selecionarMaquinaDireta(m.id)}
                      gerenciar={gerenciar}
                      onRenomear={n => aoRenomear('maquinas', m.id, n)}
                      onExcluir={() => aoExcluir('maquinas', m.id)}
                      onMoverCima={() => aoMoverMaquina(m.id, -1)}
                      onMoverBaixo={() => aoMoverMaquina(m.id, 1)}
                      moverPrimeiro={idx === 0}
                      moverUltimo={idx === maquinasSemGrupo.length - 1}
                    />
                  )
                })}

                {meusGrupos.length === 0 && maquinasSemGrupo.length === 0 && !gerenciar && (
                  <div className="painel-lateral-vazio">Nenhum grupo ou máquina. Ative ⚙ Gerenciar para adicionar.</div>
                )}
              </div>
            </div>
          )}

          {/* coluna 3 — máquinas do grupo selecionado */}
          {grupo && (
            <div className="coluna coluna-maquinas" ref={col3Ref}>
              <div className="coluna-cabecalho">📦 {grupo.nome}</div>
              <div className="coluna-corpo">
                {maquinasDoGrupo.map((m, idx) => {
                  const { marcados, totalItens } = calcularCompletude(m, estacoes)
                  return (
                    <LinhaColuna
                      key={m.id}
                      nome={m.nome}
                      completas={marcados}
                      total={totalItens}
                      corAndon={m.status ? STATUS[m.status].cor : 'var(--cinza-claro)'}
                      selecionada={m.id === maquinaSelId}
                      onClick={() => selecionarMaquina(m.id)}
                      gerenciar={gerenciar}
                      onRenomear={n => aoRenomear('maquinas', m.id, n)}
                      onExcluir={() => aoExcluir('maquinas', m.id)}
                      onMoverCima={() => aoMoverMaquina(m.id, -1)}
                      onMoverBaixo={() => aoMoverMaquina(m.id, 1)}
                      moverPrimeiro={idx === 0}
                      moverUltimo={idx === maquinasDoGrupo.length - 1}
                    />
                  )
                })}
                {gerenciar && <AdicionarInline rotulo="+ máquina" aoAdicionar={n => aoAddMaquina(grupo.id, n)} />}
                {maquinasDoGrupo.length === 0 && !gerenciar && (
                  <div className="painel-lateral-vazio">Nenhuma máquina neste grupo ainda.</div>
                )}
              </div>
            </div>
          )}

          {/* coluna 4 — detalhe da máquina selecionada (status + estações) */}
          {maquina && (
            <div className="coluna coluna-detalhe" ref={col4Ref}>
              <div className="coluna-cabecalho">Detalhe da máquina</div>
              <div className="coluna-corpo coluna-corpo-detalhe">
                <Maquina
                  comoColuna
                  maquina={maquina}
                  estacoes={estacoes}
                  gerenciar={gerenciar}
                  bloqueado={bloqueado}
                  operador={operador}
                  aoSalvarLote={aoSalvarLote}
                  aoAddEstacao={aoAddEstacao}
                  aoExcluir={aoExcluir}
                  aoRenomear={aoRenomear}
                  aoMover={() => {}}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
