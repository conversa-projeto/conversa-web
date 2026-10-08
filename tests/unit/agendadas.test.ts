import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageInput from '@/components/MessageInput.vue'
import { useChatStore } from '@/stores/chat'
import { TipoConversa } from '@/types/api'
import { aguardar, pedidosDe, rota } from './apiFalsa'
import { mensagem, texto } from './fabrica'

const EU = 7
let campo: VueWrapper | undefined
beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  campo?.unmount()
  campo = undefined
  document.body.innerHTML = ''
})

const daqui = (ms: number) => new Date(Date.now() + ms)

function montar(mensagens: ReturnType<typeof mensagem>[]) {
  const chat = useChatStore()
  chat.conversas = [{ id: 1, descricao: 'Bruno', tipo: TipoConversa.Direta, inserida: new Date() }]
  chat.conversaAtivaId = 1
  chat.definirMensagens(1, mensagens)
  campo = mount(MessageInput, { props: { chatNoFim: true }, attachTo: document.body })
  return chat
}
const relogio = () => campo!.find('button[title$="agendada"], button[title$="agendadas"]')

describe('mensagens agendadas', () => {
  test('o relógio aparece com o campo vazio e diz quantas; com texto no campo, some', async () => {
    montar([
      mensagem({ id: 1, remetente_id: EU, conteudos: [texto('já saiu')] }),
      mensagem({ id: 2, remetente_id: EU, visivel_em: daqui(3600_000), conteudos: [texto('lembrete')] }),
      mensagem({ id: 3, remetente_id: EU, visivel_em: daqui(7200_000), conteudos: [texto('outro')] }),
    ])
    await aguardar()
    expect(relogio().exists()).toBe(true)
    expect(relogio().attributes('title')).toBe('2 mensagens agendadas')
    expect(relogio().text()).toBe('2')
    const el = campo!.find('[contenteditable="true"]').element as HTMLElement
    el.append('oi')
    el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }))
    await aguardar()
    expect(relogio().exists()).toBe(false)
  })

  test('sem agendadas, não há relógio', async () => {
    montar([mensagem({ id: 1, remetente_id: EU, conteudos: [texto('já saiu')] })])
    await aguardar()
    expect(relogio().exists()).toBe(false)
  })

  test('a lista mostra horário e conteúdo, só da conversa aberta; cancelar confirma e apaga', async () => {
    const chat = montar([
      mensagem({ id: 2, remetente_id: EU, visivel_em: daqui(3600_000), conteudos: [texto('lembrete da reunião')] }),
    ])
    chat.definirMensagens(5, [mensagem({ id: 9, conversa_id: 5, remetente_id: EU, visivel_em: daqui(3600_000), conteudos: [texto('de outra conversa')] })])
    await aguardar()
    await relogio().trigger('click')
    await aguardar(20)
    expect(document.body.textContent).toContain('Mensagens agendadas')
    expect(document.body.textContent).toContain('lembrete da reunião')
    expect(document.body.textContent).not.toContain('de outra conversa')

    rota('DELETE', '/mensagem', { id: 2, conteudo: {} })
    ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Cancelar')!.click()
    await aguardar(5)
    ;[...document.querySelectorAll('[role="alertdialog"] button')].find((b) => b.textContent?.trim() === 'Cancelar envio')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await aguardar(20)
    expect(pedidosDe('DELETE', '/mensagem')[0]!.consulta).toEqual({ id: '2' })
    expect(chat.agendadasAtivas).toHaveLength(0)
    // Sem mais agendadas, a lista fecha e o relógio some
    expect(document.body.textContent).not.toContain('Mensagens agendadas')
    expect(relogio().exists()).toBe(false)
  })

  test('na hora marcada, a agendada sai da lista (e entra no chat)', async () => {
    const chat = montar([mensagem({ id: 2, remetente_id: EU, visivel_em: daqui(80), conteudos: [texto('já já')] })])
    expect(chat.agendadasAtivas.map((m) => m.id)).toEqual([2])
    expect(chat.idsAgendadasAtivas.has(2)).toBe(true)
    await aguardar(150)
    expect(chat.agendadasAtivas).toHaveLength(0)
    expect(chat.idsAgendadasAtivas.has(2)).toBe(false)
  })
})
