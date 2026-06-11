import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { STATUS } from '../constantes.js'

export default function HistoricoModal({ aoFechar }) {
  const [rondas, setRondas]           = useState([])
  const [selecionada, setSelecionada] = useState(null)
  const [itens, setItens]             = useState([])
  const [carregando, setCarregando]   = useState(true)
  const [copiado, setCopiado]         = useState(false)
  const [excluindo, setExcluindo]     = useState(null)   // id sendo excluído
  const [confirmLimpar, setConfirmLimpar] = useState(false)

  const buscarRondas = async () => {
    const { data, error } = await supabase
      .from('historico_rondas')
      .select('*')
      .order('iniciada_em', { ascending: false })
      .limit(100)
    if (!error) setRondas(data || [])
    setCarregando(false)
  }

  useEffect(() => { buscarRondas() }, [])

  const abrirRonda = async ronda => {
    setSelecionada(ronda)
    const { data } = await supabase
      .from('historico_itens')
      .select('*')
      .eq('ronda_id', ronda.id)
      .order('tipo')
      .order('nome_pai')
    setItens(data || [])
  }

  const voltar = () => { setSelecionada(null); setItens([]) }

  // ── exclusão individual ───────────────────────────────────
  const excluirRonda = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Excluir esta ronda do histórico?')) return
    setExcluindo(id)
    await supabase.from('historico_rondas').delete().eq('id', id)
    setRondas(prev => prev.filter(r => r.id !== id))
    if (selecionada?.id === id) voltar()
    setExcluindo(null)
  }

  // ── limpar tudo ───────────────────────────────────────────
  const limparTudo = async () => {
    setCarregando(true)
    setConfirmLimpar(false)
    // historico_itens é excluído em cascata pelo banco
    await supabase.from('historico_rondas').delete().not('id', 'is', null)
    setRondas([])
    voltar()
    setCarregando(false)
  }

  const copiarTexto = async () => {
    try { await navigator.clipboard.writeText(selecionada.texto_whatsapp) }
    catch {
      const t = document.createElement('textarea')
      t.value = selecionada.texto_whatsapp
      document.body.appendChild(t); t.select()
      document.execCommand('copy')
      document.body.removeChild(t)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const fmt = iso => {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }

  const resumoRonda = r => {
    const res = r.resumo || {}
    const parts = []
    if (res.produzindo) parts.push(`✅ ${res.produzindo}`)
    if (res.parada)     parts.push(`🟡 ${res.parada}`)
    if (res.pendencia)  parts.push(`🔴 ${res.pendencia}`)
    if (res.semCheck)   parts.push(`⬜ ${res.semCheck}`)
    return parts.join(' · ') || 'Sem dados'
  }

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className="modal modal-historico" onClick={e => e.stopPropagation()}>

        {/* cabeçalho */}
        <div className="hist-cabecalho">
          {selecionada ? (
            <button className="fantasma-escuro" onClick={voltar}>← Voltar</button>
          ) : (
            <h3>Histórico de rondas</h3>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* botão limpar tudo — só na lista */}
            {!selecionada && rondas.length > 0 && (
              confirmLimpar ? (
                <>
                  <span style={{ fontSize: 12, color: 'var(--cinza-texto)' }}>Confirmar?</span>
                  <button className="btn-excluir-hist" onClick={limparTudo}>Sim, limpar</button>
                  <button className="fantasma-escuro" onClick={() => setConfirmLimpar(false)}>Não</button>
                </>
              ) : (
                <button className="btn-limpar-hist" onClick={() => setConfirmLimpar(true)}>
                  🗑 Limpar tudo
                </button>
              )
            )}
            <button className="fechar-modal" onClick={aoFechar}>✕</button>
          </div>
        </div>

        {/* lista de rondas */}
        {!selecionada && (
          <div className="hist-lista">
            {carregando && <div className="hist-vazio">Carregando…</div>}
            {!carregando && rondas.length === 0 && (
              <div className="hist-vazio">Nenhuma ronda no histórico.</div>
            )}
            {rondas.map(r => (
              <div
                key={r.id}
                className={`hist-item ${excluindo === r.id ? 'hist-item-excluindo' : ''}`}
                onClick={() => abrirRonda(r)}
              >
                <div className="hist-item-data">{fmt(r.encerrada_em || r.iniciada_em)}</div>
                <div className="hist-item-op">{r.iniciada_por !== '—' ? `👤 ${r.iniciada_por}` : ''}</div>
                <div className="hist-item-resumo">{resumoRonda(r)}</div>
                <button
                  className="btn-excluir-item"
                  title="Excluir esta ronda"
                  onClick={e => excluirRonda(r.id, e)}
                  disabled={excluindo === r.id}
                >
                  {excluindo === r.id ? '…' : '🗑'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* detalhe de uma ronda */}
        {selecionada && (
          <div className="hist-detalhe">
            <div className="hist-detalhe-info">
              <strong>{fmt(selecionada.encerrada_em)}</strong>
              {selecionada.iniciada_por !== '—' && <span> · 👤 {selecionada.iniciada_por}</span>}
              <span className="hist-resumo-badge">{resumoRonda(selecionada)}</span>
              <button
                className="btn-excluir-hist"
                style={{ marginLeft: 'auto' }}
                onClick={e => excluirRonda(selecionada.id, e)}
              >
                🗑 Excluir ronda
              </button>
            </div>

            <div className="hist-itens">
              {itens.map(item => (
                <div key={item.id} className={`hist-linha ${item.tipo}`}>
                  <span className="hist-emoji">{item.status ? STATUS[item.status].emoji : '⬜'}</span>
                  <div className="hist-linha-info">
                    <span className="hist-nome-pai">{item.nome_pai}</span>
                    <span className="hist-nome-item">{item.tipo === 'estacao' ? `• ${item.nome_item}` : item.nome_item}</span>
                    <span className="hist-status" style={{ color: item.status ? STATUS[item.status].cor : '#9FB0AC' }}>
                      {item.status ? STATUS[item.status].rotulo : 'Não verificada'}
                    </span>
                    {item.obs && <span className="hist-obs">↳ {item.obs}</span>}
                  </div>
                  {item.usuario && item.usuario !== '—' && (
                    <span className="hist-usuario">{item.usuario}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="acoes-modal">
              <button className="primario" onClick={copiarTexto}>
                {copiado ? '✓ Copiado!' : 'Copiar texto'}
              </button>
              <a
                className="link-whatsapp"
                href={`https://wa.me/?text=${encodeURIComponent(selecionada.texto_whatsapp)}`}
                target="_blank" rel="noreferrer"
              >
                Abrir no WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
