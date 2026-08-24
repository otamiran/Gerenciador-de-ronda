// Scroll a máquina para logo abaixo do header fixo
export function scrollParaMaquina(el) {
  if (!el) return

  // mede a borda inferior do header no momento do clique
  const header = document.querySelector('.topo')
  const barraProgresso = document.querySelector('.trilha-progresso')
  const alturaHeader = (header?.getBoundingClientRect().bottom ?? 0) +
                       (barraProgresso?.getBoundingClientRect().height ?? 4)

  const topoEl   = el.getBoundingClientRect().top   // posição do elemento na viewport agora
  const scrollAtual = window.scrollY
  const destino = scrollAtual + topoEl - alturaHeader // borda do elemento = borda inferior do header

  window.scrollTo({ top: destino, behavior: 'smooth' })
  el.classList.add('maquina-highlight')
  setTimeout(() => el.classList.remove('maquina-highlight'), 800)
}
