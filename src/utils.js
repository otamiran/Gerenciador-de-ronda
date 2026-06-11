// Scroll suave compensando o header fixo + margem extra
export function scrollParaMaquina(el) {
  if (!el) return
  const OFFSET = 80 // altura do header (~56px) + barra de progresso + margem
  const top = el.getBoundingClientRect().top + window.scrollY - OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
  el.classList.add('maquina-highlight')
  setTimeout(() => el.classList.remove('maquina-highlight'), 800)
}
