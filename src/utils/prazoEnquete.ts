// Data final da votação: as mesmas regras do servidor (no futuro, até 1 ano)
export function erroPrazo(data: Date | null): string {
  if (!data || Number.isNaN(data.getTime())) return 'Informe a data e a hora'
  if (data.getTime() < Date.now() + 60 * 1000) return 'A data final precisa estar no futuro'
  const limite = new Date()
  limite.setFullYear(limite.getFullYear() + 1)
  if (data > limite) return 'A data final não pode passar de 1 ano'
  return ''
}

// "hoje 18:00", "amanhã 08:30" ou "12/10 18:00" (com o ano, se for outro)
export function formatarPrazo(data: Date): string {
  const hoje = new Date()
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (data.toDateString() === hoje.toDateString()) return `hoje ${hora}`
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  if (data.toDateString() === amanha.toDateString()) return `amanhã ${hora}`
  const dia = data.toLocaleDateString('pt-BR', data.getFullYear() === hoje.getFullYear()
    ? { day: '2-digit', month: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${dia} ${hora}`
}
