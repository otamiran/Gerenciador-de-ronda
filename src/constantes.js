export const STATUS = {
  produzindo: { rotulo: 'Produzindo', emoji: '✅', cor: '#16A34A', fundo: '#0D2318' },
  parada:     { rotulo: 'Parada',     emoji: '🟡', cor: '#CA8A04', fundo: '#221A05' },
  pendencia:  { rotulo: 'Pendência',  emoji: '🔴', cor: '#DC2626', fundo: '#250A0A' },
}

// linhasEstacoes — modo normal ou só pendências/paradas
function linhasEstacoes(estacoesDaMaquina, indent, apenasCriticos = false) {
  if (estacoesDaMaquina.length === 0) return []

  if (apenasCriticos) {
    const criticas = estacoesDaMaquina.filter(e => e.status === 'parada' || e.status === 'pendencia')
    return criticas.flatMap(est => {
      const linhas = [`${indent}  • ${est.nome}: ${STATUS[est.status].emoji} ${STATUS[est.status].rotulo}`]
      if ((est.status === 'pendencia' || est.status === 'parada') && est.obs) linhas.push(`${indent}     ↳ ${est.obs}`)
      return linhas
    })
  }

  // estações não confirmadas (sem status) são desconsideradas do texto
  const confirmadas = estacoesDaMaquina.filter(e => e.status)
  if (confirmadas.length === 0) return []

  const naoProduzindo = confirmadas.filter(e => e.status !== 'produzindo')
  if (naoProduzindo.length === 0)
    return [`${indent}  └ ${confirmadas.length} estações: todas produzindo ✅`]

  const linhas = []
  const produzindoCount = confirmadas.filter(e => e.status === 'produzindo').length
  if (produzindoCount > 0) linhas.push(`${indent}  └ ${produzindoCount} estação(ões) produzindo ✅`)
  for (const est of naoProduzindo) {
    linhas.push(`${indent}  • ${est.nome}: ${STATUS[est.status].emoji} ${STATUS[est.status].rotulo}`)
    if ((est.status === 'pendencia' || est.status === 'parada') && est.obs) linhas.push(`${indent}     ↳ ${est.obs}`)
  }
  return linhas
}

function linhasMaquina(maq, estacoes, indent, apenasCriticos = false) {
  const estacoesDoMaq = estacoes.filter(e => e.maquina_id === maq.id)

  if (apenasCriticos) {
    // no modo crítico, só inclui máquina se ela ou alguma estação tiver parada/pendência
    const maqCritica = maq.status === 'parada' || maq.status === 'pendencia'
    const estCriticas = estacoesDoMaq.filter(e => e.status === 'parada' || e.status === 'pendencia')
    if (!maqCritica && estCriticas.length === 0) return []

    const linhas = []
    if (maqCritica) {
      linhas.push(`${indent}${STATUS[maq.status].emoji} ${maq.nome} — ${STATUS[maq.status].rotulo}`)
      if ((maq.status === 'pendencia' || maq.status === 'parada') && maq.obs) linhas.push(`${indent}   ↳ ${maq.obs}`)
    } else {
      linhas.push(`${indent}⚠️ ${maq.nome}`) // tem estações críticas mas máquina ok
    }
    linhas.push(...linhasEstacoes(estacoesDoMaq, indent, true))
    return linhas
  }

  // máquinas não confirmadas (sem status) são desconsideradas do texto
  if (!maq.status) return []

  const linhas = [`${indent}${STATUS[maq.status].emoji} ${maq.nome} — ${STATUS[maq.status].rotulo}`]
  if ((maq.status === 'pendencia' || maq.status === 'parada') && maq.obs) linhas.push(`${indent}   ↳ ${maq.obs}`)
  linhas.push(...linhasEstacoes(estacoesDoMaq, indent, false))
  return linhas
}

// Opções de filtro: 'todos' | 'criticos' (parada + pendência)
export function gerarTextoRelatorio({
  setores, grupos = [], maquinas, estacoes, operador, agora,
  filtro = 'todos', // 'todos' | 'criticos'
}) {
  const apenasCriticos = filtro === 'criticos'
  const linhas = []

  linhas.push('*RONDA DE PRODUÇÃO* 🏭')
  if (apenasCriticos) linhas.push('⚠️ *Apenas pendências e paradas*')
  linhas.push(`📅 ${agora.toLocaleDateString('pt-BR')} ⏰ ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
  linhas.push('')

  for (const setor of setores) {
    const meusGrupos = grupos.filter(g => g.setor_id === setor.id)
    const maqDoSetor = maquinas.filter(m => m.setor_id === setor.id)

    // no modo crítico, verifica se o setor tem algo para mostrar antes de escrever o cabeçalho
    const linhasSetor = []

    for (const grupo of meusGrupos) {
      const linhasGrupo = []
      for (const maq of maqDoSetor.filter(m => m.grupo_id === grupo.id)) {
        const lm = linhasMaquina(maq, estacoes, '    ', apenasCriticos)
        linhasGrupo.push(...lm)
      }
      if (linhasGrupo.length > 0) {
        linhasSetor.push(`  📦 *${grupo.nome}*`)
        linhasSetor.push(...linhasGrupo)
      }
    }

    for (const maq of maqDoSetor.filter(m => !m.grupo_id)) {
      linhasSetor.push(...linhasMaquina(maq, estacoes, '  ', apenasCriticos))
    }

    if (linhasSetor.length > 0) {
      linhas.push(`*SETOR: ${setor.nome.toUpperCase()}*`)
      linhas.push(...linhasSetor)
      linhas.push('')
    } else if (!apenasCriticos) {
      linhas.push(`*SETOR: ${setor.nome.toUpperCase()}*`)
      linhas.push('')
    }
  }

  if (apenasCriticos && linhas.filter(l => l.startsWith('*SETOR')).length === 0) {
    linhas.push('✅ Nenhuma pendência ou parada registrada.')
    linhas.push('')
  }

  // remove linha em branco solta no final, se houver
  while (linhas.length && linhas[linhas.length - 1] === '') linhas.pop()

  return linhas.join('\n')
}

// ── texto do relatório de manutenção (máquinas atendidas/pendentes) ─
// Recebe apenas as máquinas já filtradas (selecionadas no modal) e a
// lista completa de atendimentos ativos, e monta o texto para WhatsApp
// com duas seções: o que já está em andamento (com manutentor) e o que
// ainda está pendente (aguardando alguém assumir).
export function gerarTextoManutencao({ maquinas, atendimentos, setores, grupos, agora }) {
  const linhas = []
  linhas.push('*MANUTENÇÃO* 🔧')
  // ⏰ aqui é a hora de envio/geração deste relatório — não a hora em que
  // cada atendimento começou (isso não entra no texto, só no painel).
  linhas.push(`📅 ${agora.toLocaleDateString('pt-BR')} ⏰ ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
  linhas.push('')

  const localDaMaquina = maq => {
    const grupo = grupos.find(g => g.id === maq.grupo_id)
    const setor = setores.find(s => s.id === maq.setor_id)
    return grupo ? `${setor?.nome ?? ''} › ${grupo.nome}` : (setor?.nome || '')
  }

  const emAndamento = atendimentos.filter(a => a.manutentor_id)
  const pendentes    = atendimentos.filter(a => !a.manutentor_id)

  const maquinasEmAndamento = maquinas.filter(m => emAndamento.some(a => a.maquina_id === m.id))
  const maquinasPendentes   = maquinas.filter(m => pendentes.some(a => a.maquina_id === m.id))

  if (maquinasEmAndamento.length === 0 && maquinasPendentes.length === 0) {
    linhas.push('✅ Nenhum atendimento em andamento ou pendente no momento.')
    return linhas.join('\n')
  }

  if (maquinasEmAndamento.length > 0) {
    linhas.push('*EM ANDAMENTO*')
    for (const maq of maquinasEmAndamento) {
      const local = localDaMaquina(maq)
      linhas.push(`🔧 *${maq.nome}*${local ? ` — ${local}` : ''}`)
      emAndamento
        .filter(a => a.maquina_id === maq.id)
        .forEach(a => {
          const estacaoTxt = a.estacao_nome ? ` — Estação: ${a.estacao_nome}` : ''
          linhas.push(`   • ${a.manutentor_nome}${estacaoTxt}`)
          if (a.descricao) linhas.push(`      ↳ ${a.descricao}`)
        })
      linhas.push('')
    }
  }

  if (maquinasPendentes.length > 0) {
    linhas.push('*PENDENTE (aguardando manutentor)*')
    for (const maq of maquinasPendentes) {
      const local = localDaMaquina(maq)
      linhas.push(`🕓 *${maq.nome}*${local ? ` — ${local}` : ''}`)
      pendentes
        .filter(a => a.maquina_id === maq.id)
        .forEach(a => {
          const estacaoTxt = a.estacao_nome ? `${a.estacao_nome}: ` : ''
          linhas.push(`   • ${estacaoTxt}${a.descricao || 'sem descrição informada'}`)
        })
      linhas.push('')
    }
  }

  while (linhas.length && linhas[linhas.length - 1] === '') linhas.pop()

  return linhas.join('\n')
}
