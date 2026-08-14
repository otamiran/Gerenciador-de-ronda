import { useState, useMemo } from 'react'

// Página de manutenção: cadastro de manutentores + registro de
// atendimentos (pendentes ou já em andamento) nas máquinas. Os dados
// aqui são compartilhados entre aparelhos (vêm do Supabase via
// manutencao.js), diferente do status da ronda.
export default function ManutencaoPainel({
  setores, grupos, maquinas, estacoes,
  manutentores, atendimentos,
  aoAdicionarManutentor, aoExcluirManutentor,
  aoIniciarAtendimento, aoRegistrarPendencia, aoAtribuirManutentor,
  aoEncerrarAtendimento,
  aoFechar,
}) {
  const [novoNome, setNovoNome]           = useState('')
  const [maquinaSel, setMaquinaSel]       = useState('')
  const [estacaoSel, setEstacaoSel]       = useState('')
  const [manutentorSel, setManutentorSel] = useState('')
  const [descricaoSel, setDescricaoSel]   = useState('')
  const [atribuindoId, setAtribuindoId]   = useState(null) // id do atendimento cujo <select> de atribuição está aberto
  const [manutentorAtrib, setManutentorAtrib] = useState('')
  const [processando, setProcessando]     = useState(false)
  const [erroLocal, setErroLocal]         = useState('')

  // estações da máquina selecionada, para permitir apontar o atendimento
  // para uma estação específica (não obrigatório — pode ser a máquina toda)
  const estacoesDaMaquina = useMemo(
    () => (maquinaSel ? estacoes.filter(e => e.maquina_id === maquinaSel) : []),
    [estacoes, maquinaSel]
  )

  const selecionarMaquina = id => {
    setMaquinaSel(id)
    setEstacaoSel('') // troca de máquina reseta a estação escolhida
  }

  // lista de máquinas com o caminho setor › grupo, ordenada, para o <select>
  const maquinasOrdenadas = useMemo(() => {
    return maquinas
      .map(m => {
        const grupo = grupos.find(g => g.id === m.grupo_id)
        const setor = setores.find(s => s.id === m.setor_id)
        const caminho = grupo ? `${setor?.nome ?? ''} › ${grupo.nome}` : (setor?.nome || '')
        return { ...m, caminho }
      })
      .sort((a, b) =>
        a.caminho.localeCompare(b.caminho, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })
      )
  }, [maquinas, grupos, setores])

  // pendentes = ainda sem manutentor atribuído · em andamento = já com alguém atuando
  const pendentes   = useMemo(() => atendimentos.filter(a => !a.manutentor_id), [atendimentos])
  const emAndamento = useMemo(() => atendimentos.filter(a => a.manutentor_id), [atendimentos])

  const cadastrarManutentor = async () => {
    if (!novoNome.trim()) return
    setErroLocal('')
    setProcessando(true)
    try {
      await aoAdicionarManutentor(novoNome.trim())
      setNovoNome('')
    } catch (e) {
      setErroLocal(e.message)
    }
    setProcessando(false)
  }

  // Registra o atendimento: se um manutentor foi selecionado no form, já
  // entra "em andamento"; se não, vira uma pendência aguardando alguém
  // assumir depois.
  const registrar = async () => {
    if (!maquinaSel) {
      setErroLocal('Selecione o equipamento.')
      return
    }
    setErroLocal('')
    setProcessando(true)
    try {
      if (manutentorSel) {
        await aoIniciarAtendimento(maquinaSel, manutentorSel, estacaoSel || null, descricaoSel.trim() || null)
      } else {
        await aoRegistrarPendencia(maquinaSel, estacaoSel || null, descricaoSel.trim() || null)
      }
      setMaquinaSel('')
      setEstacaoSel('')
      setManutentorSel('')
      setDescricaoSel('')
    } catch (e) {
      setErroLocal(e.message)
    }
    setProcessando(false)
  }

  const abrirAtribuicao = id => {
    setAtribuindoId(id)
    setManutentorAtrib('')
  }

  const confirmarAtribuicao = async id => {
    if (!manutentorAtrib) return
    setProcessando(true)
    try {
      await aoAtribuirManutentor(id, manutentorAtrib)
      setAtribuindoId(null)
      setManutentorAtrib('')
    } catch (e) {
      setErroLocal(e.message)
    }
    setProcessando(false)
  }

  const encerrar = async id => {
    setProcessando(true)
    try {
      await aoEncerrarAtendimento(id)
    } catch (e) {
      setErroLocal(e.message)
    }
    setProcessando(false)
  }

  const excluirManutentor = async id => {
    if (!window.confirm('Excluir este manutentor do cadastro?')) return
    setProcessando(true)
    try {
      await aoExcluirManutentor(id)
    } catch (e) {
      setErroLocal(e.message)
    }
    setProcessando(false)
  }

  const formatarHora = iso => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  // dados de exibição (máquina + caminho) para um atendimento
  const infoMaquina = a => {
    const maq = maquinas.find(m => m.id === a.maquina_id)
    const grupo = grupos.find(g => g.id === maq?.grupo_id)
    const setor = setores.find(s => s.id === maq?.setor_id)
    const caminho = grupo ? `${setor?.nome ?? ''} › ${grupo.nome}` : (setor?.nome || '')
    return { nome: maq?.nome || '(equipamento removido)', caminho }
  }

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className="modal modal-manutencao" onClick={e => e.stopPropagation()}>

        <div className="rel-cabecalho">
          <h3>🔧 Manutenção</h3>
          <button className="fechar-modal" onClick={aoFechar}>✕</button>
        </div>

        <div className="manut-corpo">
          {erroLocal && (
            <div className="erro">
              {erroLocal}
              <button className="fechar-erro" onClick={() => setErroLocal('')}>✕</button>
            </div>
          )}

          {/* ── cadastro de manutentores ─────────────────────── */}
          <section className="manut-secao">
            <h4 className="manut-secao-titulo">Manutentores cadastrados</h4>
            <div className="manut-chips-manutentores">
              {manutentores.length === 0 && (
                <span className="manut-vazio-inline">Nenhum manutentor cadastrado ainda.</span>
              )}
              {manutentores.map(m => (
                <span key={m.id} className="chip-manutentor">
                  👤 {m.nome}
                  <button
                    className="chip-manutentor-remover"
                    title="Excluir do cadastro"
                    disabled={processando}
                    onClick={() => excluirManutentor(m.id)}
                  >✕</button>
                </span>
              ))}
            </div>
            <div className="form-add" style={{ marginTop: 8 }}>
              <input
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cadastrarManutentor()}
                placeholder="Nome do manutentor…"
                disabled={processando}
              />
              <button className="primario" onClick={cadastrarManutentor} disabled={processando || !novoNome.trim()}>
                + Adicionar
              </button>
            </div>
          </section>

          {/* ── registrar atendimento (pendência ou já com manutentor) ── */}
          <section className="manut-secao">
            <h4 className="manut-secao-titulo">Registrar atendimento</h4>
            <div className="manut-form-atribuir">
              <select
                className="manut-select"
                value={maquinaSel}
                onChange={e => selecionarMaquina(e.target.value)}
                disabled={processando}
              >
                <option value="">Selecione o equipamento…</option>
                {maquinasOrdenadas.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.caminho ? `${m.caminho} — ${m.nome}` : m.nome}
                  </option>
                ))}
              </select>
              <select
                className="manut-select"
                value={estacaoSel}
                onChange={e => setEstacaoSel(e.target.value)}
                disabled={processando || !maquinaSel || estacoesDaMaquina.length === 0}
              >
                <option value="">
                  {maquinaSel && estacoesDaMaquina.length === 0
                    ? 'Sem estações cadastradas'
                    : 'Equipamento inteiro (opcional: escolher estação)'}
                </option>
                {estacoesDaMaquina.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
              <textarea
                className="manut-descricao"
                value={descricaoSel}
                onChange={e => setDescricaoSel(e.target.value)}
                placeholder="Problema relatado / o que está sendo atendido…"
                rows={2}
                disabled={processando}
              />
              <select
                className="manut-select"
                value={manutentorSel}
                onChange={e => setManutentorSel(e.target.value)}
                disabled={processando || manutentores.length === 0}
              >
                <option value="">— Deixar pendente (atribuir manutentor depois) —</option>
                {manutentores.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
              <button
                className="primario"
                onClick={registrar}
                disabled={processando || !maquinaSel}
              >
                {manutentorSel ? 'Iniciar atendimento' : '+ Registrar pendência'}
              </button>
            </div>
            <div className="manut-dica">
              {manutentores.length === 0
                ? 'Cadastre um manutentor acima se já souber quem vai atender — ou deixe pendente e atribua depois.'
                : 'Sem selecionar um manutentor, o atendimento fica pendente até alguém assumi-lo na lista abaixo.'}
            </div>
          </section>

          {/* ── pendências aguardando manutentor ─────────────── */}
          <section className="manut-secao">
            <h4 className="manut-secao-titulo">
              🕓 Pendências <span className="manut-contagem">({pendentes.length})</span>
            </h4>
            {pendentes.length === 0 ? (
              <div className="manut-vazio-inline">Nenhuma pendência aguardando manutentor.</div>
            ) : (
              <div className="manut-lista-atendimentos">
                {pendentes.map(a => {
                  const { nome, caminho } = infoMaquina(a)
                  return (
                    <div key={a.id} className="manut-item-atendimento manut-item-pendente">
                      <div className="manut-item-info">
                        <div className="manut-item-maquina">🏭 {nome}</div>
                        {caminho && <div className="manut-item-caminho">{caminho}</div>}
                        <div className="manut-item-detalhe">
                          {a.estacao_nome && <>🔩 {a.estacao_nome} · </>}
                          registrado às {formatarHora(a.criado_em)}
                        </div>
                        {a.descricao && (
                          <div className="manut-item-descricao">📝 {a.descricao}</div>
                        )}

                        {atribuindoId === a.id ? (
                          <div className="manut-atribuir-inline">
                            <select
                              className="manut-select"
                              value={manutentorAtrib}
                              onChange={e => setManutentorAtrib(e.target.value)}
                              disabled={processando}
                              autoFocus
                            >
                              <option value="">Selecione o manutentor…</option>
                              {manutentores.map(m => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                              ))}
                            </select>
                            <button
                              className="primario"
                              disabled={processando || !manutentorAtrib}
                              onClick={() => confirmarAtribuicao(a.id)}
                            >
                              ✓
                            </button>
                            <button className="secundario" disabled={processando} onClick={() => setAtribuindoId(null)}>
                              ✕
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {atribuindoId !== a.id && (
                        <div className="manut-item-acoes">
                          <button
                            className="primario manut-btn-atribuir"
                            disabled={processando || manutentores.length === 0}
                            onClick={() => abrirAtribuicao(a.id)}
                            title={manutentores.length === 0 ? 'Cadastre um manutentor primeiro' : undefined}
                          >
                            👤 Atribuir
                          </button>
                          <button
                            className="secundario manut-btn-encerrar"
                            disabled={processando}
                            onClick={() => encerrar(a.id)}
                          >
                            ✕ Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── atendimentos em andamento agora ──────────────── */}
          <section className="manut-secao">
            <h4 className="manut-secao-titulo">
              🔧 Em atendimento agora <span className="manut-contagem">({emAndamento.length})</span>
            </h4>
            {emAndamento.length === 0 ? (
              <div className="manut-vazio-inline">Nenhuma máquina em manutenção no momento.</div>
            ) : (
              <div className="manut-lista-atendimentos">
                {emAndamento.map(a => {
                  const { nome, caminho } = infoMaquina(a)
                  return (
                    <div key={a.id} className="manut-item-atendimento">
                      <div className="manut-item-info">
                        <div className="manut-item-maquina">🏭 {nome}</div>
                        {caminho && <div className="manut-item-caminho">{caminho}</div>}
                        <div className="manut-item-detalhe">
                          👤 {a.manutentor_nome}
                          {a.estacao_nome && <> · 🔩 {a.estacao_nome}</>}
                          {' '}· desde {formatarHora(a.iniciado_em)}
                        </div>
                        {a.descricao && (
                          <div className="manut-item-descricao">📝 {a.descricao}</div>
                        )}
                      </div>
                      <button
                        className="secundario manut-btn-encerrar"
                        disabled={processando}
                        onClick={() => encerrar(a.id)}
                      >
                        ✓ Concluir
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <div className="acoes-modal">
          <button className="secundario" onClick={aoFechar}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
