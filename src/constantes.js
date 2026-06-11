export const STATUS = {
  produzindo: { rotulo: 'Produzindo', emoji: '✅', cor: '#16A34A', fundo: '#0D2318' },
  parada:     { rotulo: 'Parada',     emoji: '🟡', cor: '#CA8A04', fundo: '#221A05' },
  pendencia:  { rotulo: 'Pendência',  emoji: '🔴', cor: '#DC2626', fundo: '#250A0A' },
}

// Gera as linhas de estações de uma máquina de forma inteligente:
// - todas produzindo → resumo em uma linha
// - qualquer parada/pendência → mostra só as que não estão produzindo individualmente
function linhasEstacoes(estacoesDaMaquina, indent) {
  if (estacoesDaMaquina.length === 0) return []

  const naoProduzindo = estacoesDaMaquina.filter(e => e.status !== 'produzindo')
  const todasProduzindo = naoProduzindo.length === 0

  if (todasProduzindo) {
    // resumo compacto — não lista cada estação
    return [`${indent}  └ ${estacoesDaMaquina.length} estações: todas produzindo ✅`]
  }

  const linhas = []
  const produzindoCount = estacoesDaMaquina.filter(e => e.status === 'produzindo').length

  // resumo das que estão ok, se houver
  if (produzindoCount > 0) {
    linhas.push(`${indent}  └ ${produzindoCount} estação(ões) produzindo ✅`)
  }

  // detalha individualmente só as que têm problema
  for (const est of naoProduzindo) {
    const ie = est.status ? STATUS[est.status].emoji : '⬜'
    const se = est.status ? STATUS[est.status].rotulo : 'Não verificada'
    linhas.push(`${indent}  • ${est.nome}: ${ie} ${se}`)
    if (est.status === 'pendencia' && est.obs) {
      linhas.push(`${indent}     ↳ ${est.obs}`)
    }
  }

  return linhas
}

function linhasMaquina(maq, estacoes, indent) {
  const linhas = []
  const ic = maq.status ? STATUS[maq.status].emoji : '⬜'
  const st = maq.status ? STATUS[maq.status].rotulo : 'Não verificada'
  linhas.push(`${indent}${ic} ${maq.nome} — ${st}`)
  if (maq.status === 'pendencia' && maq.obs) linhas.push(`${indent}   ↳ ${maq.obs}`)
  const estacoesDoMaq = estacoes.filter(e => e.maquina_id === maq.id)
  linhas.push(...linhasEstacoes(estacoesDoMaq, indent))
  return linhas
}

export function gerarTextoRelatorio({ setores, grupos = [], maquinas, estacoes, operador, agora }) {
  const linhas = []
  const tot = { produzindo: 0, parada: 0, pendencia: 0, semCheck: 0 }

  const contarTudo = (maq, ests) => {
    maq.status ? tot[maq.status]++ : tot.semCheck++
    ests.filter(e => e.maquina_id === maq.id).forEach(e => e.status ? tot[e.status]++ : tot.semCheck++)
  }

  linhas.push('*RONDA DE PRODUÇÃO* 🏭')
  linhas.push(`📅 ${agora.toLocaleDateString('pt-BR')} ⏰ ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`)
  if (operador) linhas.push(`👤 ${operador}`)
  linhas.push('')

  for (const setor of setores) {
    linhas.push(`*SETOR: ${setor.nome.toUpperCase()}*`)
    const meusGrupos  = grupos.filter(g => g.setor_id === setor.id)
    const maqDoSetor  = maquinas.filter(m => m.setor_id === setor.id)

    for (const grupo of meusGrupos) {
      linhas.push(`  📦 *${grupo.nome}*`)
      for (const maq of maqDoSetor.filter(m => m.grupo_id === grupo.id)) {
        contarTudo(maq, estacoes)
        linhas.push(...linhasMaquina(maq, estacoes, '    '))
      }
    }

    for (const maq of maqDoSetor.filter(m => !m.grupo_id)) {
      contarTudo(maq, estacoes)
      linhas.push(...linhasMaquina(maq, estacoes, '  '))
    }

    linhas.push('')
  }

  linhas.push(
    `*Resumo:* ${tot.produzindo} produzindo | ${tot.parada} parada(s) | ${tot.pendencia} pendência(s)` +
    (tot.semCheck ? ` | ${tot.semCheck} não verificada(s)` : '')
  )
  return linhas.join('\n')
}
