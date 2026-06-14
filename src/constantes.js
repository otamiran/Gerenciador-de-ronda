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
  const tot = { produzindo: 0, parada: 0, pendencia: 0, semCheck: 0 }

  const contarTudo = (maq, ests) => {
    maq.status ? tot[maq.status]++ : tot.semCheck++
    ests.filter(e => e.maquina_id === maq.id).forEach(e => e.status ? tot[e.status]++ : tot.semCheck++)
  }

  linhas.push('*RONDA DE PRODUÇÃO* 🏭')
  if (apenasCriticos) linhas.push('⚠️ *Apenas pendências e paradas*')
  linhas.push(`📅 ${agora.toLocaleDateString('pt-BR')} ⏰ ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
  if (operador) linhas.push(`👤 ${operador}`)
  linhas.push('')

  for (const setor of setores) {
    const meusGrupos = grupos.filter(g => g.setor_id === setor.id)
    const maqDoSetor = maquinas.filter(m => m.setor_id === setor.id)

    // no modo crítico, verifica se o setor tem algo para mostrar antes de escrever o cabeçalho
    const linhasSetor = []

    for (const grupo of meusGrupos) {
      const linhasGrupo = []
      for (const maq of maqDoSetor.filter(m => m.grupo_id === grupo.id)) {
        contarTudo(maq, estacoes)
        const lm = linhasMaquina(maq, estacoes, '    ', apenasCriticos)
        linhasGrupo.push(...lm)
      }
      if (linhasGrupo.length > 0) {
        linhasSetor.push(`  📦 *${grupo.nome}*`)
        linhasSetor.push(...linhasGrupo)
      }
    }

    for (const maq of maqDoSetor.filter(m => !m.grupo_id)) {
      contarTudo(maq, estacoes)
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

  linhas.push(
    `*Resumo:* ${tot.produzindo} produzindo | ${tot.parada} parada(s) | ${tot.pendencia} pendência(s)` +
    (tot.semCheck ? ` | ${tot.semCheck} não verificada(s)` : '')
  )
  return linhas.join('\n')
}
