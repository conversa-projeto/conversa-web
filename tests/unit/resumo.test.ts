import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { ResumoSalvo } from '@/services/resumosSalvos'
import type { ResumoConversa } from '@/types/api'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { relogioFalso } from './relogioFalso'

// IndexedDB de mentira, num Map (o happy-dom não tem IndexedDB)
const guardados = new Map<string, ResumoSalvo>()
mock.module('@/services/resumosSalvos', () => ({
  chaveResumo: (usuarioId: number, conversaId: number) => `${usuarioId}:${conversaId}`,
  lerResumoSalvo: async (chave: string) => guardados.get(chave) ?? null,
  salvarResumo: async (chave: string, salvo: ResumoSalvo) => { guardados.set(chave, salvo) },
}))

const { default: ResumoConversaModal } = await import('@/components/ResumoConversaModal.vue')

let tela: VueWrapper | undefined
let relogio: ReturnType<typeof relogioFalso>

beforeEach(() => {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu', login: 'eu' }))
  guardados.clear()
  setActivePinia(createPinia())
  relogio = relogioFalso()
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  relogio.restaurar()
})

const resumo = (extras: Partial<ResumoConversa> = {}): ResumoConversa => ({
  id: 'r1', conversa_id: 5, periodo: '7d', status: 'processando', mensagens: 12, assuntos: [], erro: '', ...extras,
})
const botao = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)!

describe('resumo da conversa', () => {
  test('pede no período escolhido, mostra o andamento e os assuntos; "Ver na conversa" leva à primeira mensagem', async () => {
    rota('POST', '/conversa/resumo', resumo())
    tela = mount(ResumoConversaModal, { props: { conversaId: 5 }, attachTo: document.body })
    await botao('7 dias').trigger('click')
    await botao('Resumir').trigger('click')
    await aguardar(5)
    expect(pedidosDe('POST', '/conversa/resumo')[0]!.corpo).toEqual({ conversa_id: 5, periodo: '7d' })
    expect(tela.find('[role="status"]').text()).toContain('Resumindo 12 mensagens...')

    rota('GET', '/conversa/resumo', resumo({
      status: 'concluido',
      assuntos: [{ titulo: 'Orçamento', resumo: 'Bruno fecha até quinta.', pendencias: ['Fechar orçamento'], mensagens: [40, 42] }],
    }))
    relogio.avancar(2000)
    await aguardar(5)
    expect(pedidosDe('GET', '/conversa/resumo')[0]!.consulta).toEqual({ id: 'r1' })
    expect(tela.text()).toContain('Orçamento')
    expect(tela.text()).toContain('Bruno fecha até quinta.')
    expect(tela.text()).toContain('Fechar orçamento')
    await botao('Ver na conversa (2 mensagens)').trigger('click')
    expect(tela.emitted('go-to-message')).toEqual([[40]])
    relogio.avancar(10_000)
    await aguardar(5)
    expect(pedidosDe('GET', '/conversa/resumo')).toHaveLength(1)
  })

  test('erro da IA e período sem mensagens aparecem', async () => {
    rota('POST', '/conversa/resumo', resumo({ status: 'erro', erro: 'O servidor de IA respondeu 404' }))
    tela = mount(ResumoConversaModal, { props: { conversaId: 5 }, attachTo: document.body })
    await botao('Resumir').trigger('click')
    await aguardar(5)
    expect(tela.text()).toContain('O servidor de IA respondeu 404')
    rota('POST', '/conversa/resumo', resumo({ status: 'concluido', mensagens: 0 }))
    await botao('Resumir de novo').trigger('click')
    await aguardar(5)
    expect(tela.text()).toContain('Nenhuma mensagem nesse período.')
    rota('POST', '/conversa/resumo', erro(400, 'IA não configurada'))
    await botao('Resumir de novo').trigger('click')
    await aguardar(5)
    expect(tela.text()).toContain('IA não configurada')
  })

  test('o resumo pronto fica guardado: fechar, ir à mensagem e abrir de novo o traz de volta', async () => {
    const pronto = resumo({ status: 'concluido', periodo: '30d', assuntos: [{ titulo: 'Orçamento', resumo: 'Fecha quinta.', pendencias: [], mensagens: [40] }] })
    rota('POST', '/conversa/resumo', pronto)
    tela = mount(ResumoConversaModal, { props: { conversaId: 5 }, attachTo: document.body })
    await botao('30 dias').trigger('click')
    await botao('Resumir').trigger('click')
    await aguardar(5)
    expect(guardados.get('7:5')!.resumo).toEqual(pronto)
    tela.unmount()

    tela = mount(ResumoConversaModal, { props: { conversaId: 5 }, attachTo: document.body })
    await aguardar(5)
    expect(tela.text()).toContain('Orçamento')
    expect(tela.text()).toMatch(/Resumo de \d{2}\/\d{2} às \d{2}:\d{2} · 30 dias · 12 mensagens/)
    expect(botao('30 dias').classes()).toContain('border-primary-500')
    expect(pedidosDe('POST', '/conversa/resumo')).toHaveLength(1)

    tela.unmount()
    tela = mount(ResumoConversaModal, { props: { conversaId: 6 }, attachTo: document.body })
    await aguardar(5)
    expect(tela.text()).not.toContain('Orçamento')
  })

  test('em andamento ao fechar, volta a acompanhar ao abrir; se o servidor o perdeu, avisa', async () => {
    guardados.set('7:5', { resumo: resumo(), geradoEm: Date.now() })
    rota('GET', '/conversa/resumo', resumo({ status: 'concluido', assuntos: [{ titulo: 'Entrega', resumo: 'Atrasou.', pendencias: [], mensagens: [] }] }))
    tela = mount(ResumoConversaModal, { props: { conversaId: 5 }, attachTo: document.body })
    await aguardar(5)
    expect(tela.find('[role="status"]').exists()).toBe(true)
    relogio.avancar(2000)
    await aguardar(5)
    expect(tela.text()).toContain('Entrega')
    expect(guardados.get('7:5')!.resumo.status).toBe('concluido')
    tela.unmount()

    guardados.set('7:5', { resumo: resumo(), geradoEm: Date.now() })
    rota('GET', '/conversa/resumo', erro(404, 'Resumo não encontrado (pode ter expirado). Peça de novo.'))
    tela = mount(ResumoConversaModal, { props: { conversaId: 5 }, attachTo: document.body })
    await aguardar(5)
    relogio.avancar(2000)
    await aguardar(5)
    expect(tela.text()).toContain('Resumo não encontrado')
    expect(guardados.get('7:5')!.resumo.status).toBe('erro')
  })

  test('fechar para de consultar', async () => {
    rota('POST', '/conversa/resumo', resumo())
    tela = mount(ResumoConversaModal, { props: { conversaId: 5 }, attachTo: document.body })
    await botao('Resumir').trigger('click')
    await aguardar(5)
    tela.unmount()
    tela = undefined
    relogio.avancar(10_000)
    await aguardar(5)
    expect(pedidosDe('GET', '/conversa/resumo')).toHaveLength(0)
  })
})
