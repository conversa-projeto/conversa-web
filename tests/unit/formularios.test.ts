import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginForm from '@/components/LoginForm.vue'
import RegisterForm from '@/components/RegisterForm.vue'
import AgendarMensagemModal from '@/components/AgendarMensagemModal.vue'
import DateInput from '@/components/DateInput.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'
import { relogioFalso } from './relogioFalso'

const montados: VueWrapper[] = []
function montar<T>(componente: T, opcoes: object = {}) {
  const w = mount(componente as never, { attachTo: document.body, ...opcoes }) as unknown as VueWrapper
  montados.push(w)
  return w
}
const botao = (tela: VueWrapper, texto: string) => tela.findAll('button').find((b) => b.text() === texto)!

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

describe('login', () => {
  let relogio: ReturnType<typeof relogioFalso>
  beforeEach(() => (relogio = relogioFalso()))
  afterEach(() => {
    useChatStore().desconectarWebSocket()
    relogio.restaurar()
  })

  test('entra com o usuário sem espaços, carrega o chat e avisa quem montou', async () => {
    rota('POST', '/login', { id: 7, nome: 'Ana', email: 'a@t', telefone: null, token: 't', avatar_identificador: null, dispositivo: { id: 3 } })
    rota('PATCH', '/dispositivo', {})
    rota('GET', '/usuario/contatos', [])
    rota('GET', '/conversas', [])
    rota('GET', '/chamadas/pendentes', [])
    const tela = montar(LoginForm)
    expect(document.activeElement).toBe(tela.find('input[type="text"]').element)
    await tela.find('input[type="text"]').setValue('  ana  ')
    await tela.find('input[type="password"]').setValue('segredo')
    await tela.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('POST', '/login')[0]!.corpo).toMatchObject({ login: 'ana', senha: 'segredo' })
    expect(pedidosDe('GET', '/conversas')).toHaveLength(1)
    expect(tela.emitted('login-success')).toHaveLength(1)
    expect(useAuthStore().isAuthenticated).toBe(true)
  })

  test('senha errada mostra o erro do servidor e libera o botão', async () => {
    rota('POST', '/login', erro(401, 'Senha incorreta!'))
    const tela = montar(LoginForm)
    await tela.find('input[type="text"]').setValue('ana')
    await tela.find('input[type="password"]').setValue('x')
    await tela.find('form').trigger('submit')
    expect(botao(tela, 'Entrando...').attributes('disabled')).toBeDefined()
    await aguardar(10)
    expect(tela.text()).toContain('Senha incorreta!')
    expect(botao(tela, 'Entrar').attributes('disabled')).toBeUndefined()
    expect(tela.emitted('login-success')).toBeUndefined()
  })

  test('Criar conta leva ao cadastro', async () => {
    const tela = montar(LoginForm)
    await botao(tela, 'Criar conta').trigger('click')
    expect(tela.emitted('go-register')).toHaveLength(1)
  })
})

describe('cadastro', () => {
  async function preencher(tela: VueWrapper) {
    const campos = tela.findAll('input')
    await campos[0]!.setValue(' Ana Souza ')
    await campos[1]!.setValue(' ana ')
    await campos[2]!.setValue(' ana@teste.test ')
    await campos[3]!.setValue('senha')
    await tela.find('form').trigger('submit')
    await aguardar(10)
  }

  test('cria a conta com os campos sem espaços e volta ao login', async () => {
    const relogio = relogioFalso()
    try {
      rota('PUT', '/usuario', { id: 9 })
      const tela = montar(RegisterForm)
      await preencher(tela)
      expect(pedidosDe('PUT', '/usuario')[0]!.corpo).toEqual({ nome: 'Ana Souza', login: 'ana', email: 'ana@teste.test', senha: 'senha' })
      expect(tela.text()).toContain('Conta criada com sucesso!')
      expect(tela.emitted('go-login')).toBeUndefined()
      relogio.avancar(1500)
      expect(tela.emitted('go-login')).toHaveLength(1)
    } finally {
      relogio.restaurar()
    }
  })

  test('login repetido mostra o erro', async () => {
    rota('PUT', '/usuario', erro(400, 'Login já cadastrado!'))
    const tela = montar(RegisterForm)
    await preencher(tela)
    expect(tela.text()).toContain('Login já cadastrado!')
    expect(tela.text()).not.toContain('Conta criada')
  })

  test('Entrar volta ao login', async () => {
    const tela = montar(RegisterForm)
    await botao(tela, 'Entrar').trigger('click')
    expect(tela.emitted('go-login')).toHaveLength(1)
  })
})

describe('agendar mensagem', () => {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  async function aberto() {
    const tela = montar(AgendarMensagemModal, { props: { aberta: false } })
    await tela.setProps({ aberta: true })
    return tela
  }

  test('abre sugerindo amanhã às 08:00, e Agendar emite essa data', async () => {
    const tela = await aberto()
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    expect(tela.text()).toContain(iso(amanha).split('-').reverse().join('/'))
    expect((tela.find('input[type="time"]').element as HTMLInputElement).value).toBe('08:00')
    await botao(tela, 'Agendar').trigger('click')
    const [[quando]] = tela.emitted('confirmar') as [[Date]]
    expect(iso(quando)).toBe(iso(amanha))
    expect([quando.getHours(), quando.getMinutes()]).toEqual([8, 0])
  })

  test('menos de 5 minutos no futuro não agenda', async () => {
    const tela = await aberto()
    const daqui2min = new Date(Date.now() + 2 * 60_000)
    tela.findComponent(DateInput).vm.$emit('update:modelValue', iso(daqui2min))
    await tela.find('input[type="time"]').setValue(`${String(daqui2min.getHours()).padStart(2, '0')}:${String(daqui2min.getMinutes()).padStart(2, '0')}`)
    expect(tela.text()).toContain('O envio deve ser no mínimo 5 minutos no futuro')
    expect(botao(tela, 'Agendar').attributes('disabled')).toBeDefined()
  })

  test('mais de 1 ano no futuro não agenda', async () => {
    const tela = await aberto()
    const longe = new Date()
    longe.setFullYear(longe.getFullYear() + 2)
    tela.findComponent(DateInput).vm.$emit('update:modelValue', iso(longe))
    await tela.vm.$nextTick()
    expect(tela.text()).toContain('O envio não pode ser mais de 1 ano no futuro')
  })

  test('sem hora, o botão fica desabilitado sem mensagem de erro', async () => {
    const tela = await aberto()
    await tela.find('input[type="time"]').setValue('')
    expect(botao(tela, 'Agendar').attributes('disabled')).toBeDefined()
    expect(tela.find('p.text-danger-600').exists()).toBe(false)
  })

  test('fechar pelo X, pelo Cancelar e clicando fora', async () => {
    const tela = await aberto()
    await tela.find('button[title="Fechar"]').trigger('click')
    await botao(tela, 'Cancelar').trigger('click')
    await tela.find('div.fixed').trigger('click')
    expect(tela.emitted('close')).toHaveLength(3)
  })

  test('fechada, não mostra nada', () => {
    expect(montar(AgendarMensagemModal, { props: { aberta: false } }).text()).toBe('')
  })
})

describe('campo de data', () => {
  function campo(modelValue = '') {
    return montar(DateInput, { props: { modelValue, placeholder: 'Escolher', 'onUpdate:modelValue': () => {} } })
  }

  test('sem valor mostra o texto de ajuda; com valor, a data em dd/mm/aaaa', () => {
    expect(campo().text()).toContain('Escolher')
    expect(campo('2026-03-05').text()).toContain('05/03/2026')
  })

  test('abre no mês do valor, com 42 dias e o escolhido em destaque', async () => {
    const tela = campo('2026-03-05')
    await tela.find('div.cursor-pointer').trigger('click')
    expect(tela.text()).toContain('Março 2026')
    const dias = tela.findAll('.grid-cols-7.mt-0\\.5 button')
    expect(dias).toHaveLength(42)
    // 1º de março de 2026 é domingo: não há dias de fevereiro antes
    expect(dias[0]!.text()).toBe('1')
    expect(dias.find((d) => d.classes().includes('bg-primary-600'))!.text()).toBe('5')
    expect(dias.at(-1)!.attributes('disabled')).toBeDefined()
  })

  test('escolher um dia emite a data e fecha; dia de outro mês não faz nada', async () => {
    const tela = campo('2026-03-05')
    await tela.find('div.cursor-pointer').trigger('click')
    const dias = tela.findAll('.grid-cols-7.mt-0\\.5 button')
    await dias.at(-1)!.trigger('click')
    expect(tela.emitted('update:modelValue')).toBeUndefined()
    await dias.find((d) => d.text() === '20')!.trigger('click')
    expect(tela.emitted('update:modelValue')).toEqual([['2026-03-20']])
    expect(tela.text()).not.toContain('Março 2026')
  })

  test('navega entre meses, virando o ano nas pontas', async () => {
    const tela = campo('2026-01-10')
    await tela.find('div.cursor-pointer').trigger('click')
    const [anterior, seguinte] = tela.findAll('.mb-1 button')
    await anterior!.trigger('click')
    expect(tela.text()).toContain('Dezembro 2025')
    // Dezembro de 2025 começa numa segunda: um dia de novembro antes
    expect(tela.findAll('.grid-cols-7.mt-0\\.5 button')[0]!.text()).toBe('30')
    await seguinte!.trigger('click')
    await seguinte!.trigger('click')
    expect(tela.text()).toContain('Fevereiro 2026')
    for (let i = 0; i < 11; i++) await seguinte!.trigger('click')
    expect(tela.text()).toContain('Janeiro 2027')
  })

  test('limpar emite vazio sem abrir o calendário', async () => {
    const tela = campo('2026-03-05')
    await tela.find('div.cursor-pointer button').trigger('click')
    expect(tela.emitted('update:modelValue')).toEqual([['']])
    expect(tela.text()).not.toContain('Março')
  })

  test('clicar fora fecha o calendário', async () => {
    const tela = campo('2026-03-05')
    await tela.find('div.cursor-pointer').trigger('click')
    document.body.click()
    await tela.vm.$nextTick()
    expect(tela.text()).not.toContain('Março 2026')
  })

  test('hoje fica marcado com um anel', async () => {
    const tela = campo()
    await tela.find('div.cursor-pointer').trigger('click')
    const hoje = tela.findAll('.grid-cols-7.mt-0\\.5 button').find((d) => d.classes().includes('ring-1'))!
    expect(hoje.text()).toBe(String(new Date().getDate()))
  })
})
