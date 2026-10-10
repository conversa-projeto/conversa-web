import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProfileSettingsModal from '@/components/ProfileSettingsModal.vue'
import ConfiguracaoSistema from '@/components/ConfiguracaoSistema.vue'
import ConfiguracaoAcessos from '@/components/ConfiguracaoAcessos.vue'
import ConfiguracaoPrivacidade from '@/components/ConfiguracaoPrivacidade.vue'
import { useAuthStore } from '@/stores/auth'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'

const EU = 7
let tela: VueWrapper | undefined

beforeEach(() => {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu Mesmo', login: 'eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  document.body.innerHTML = ''
})

const parametrosApi = (extras: Record<string, unknown> = {}) => ({
  fcm_project_id: 'projeto', fcm_client_email: 'conta@projeto.iam', fcm_private_key_configurada: true,
  turn_forcar_relay: false, transcritor_url: '', transcritor_idioma: 'pt', gravacao_dias: 90, s3_bucket: 'chat',
  ia_url: '', ia_modelo: '', ia_token_configurado: false,
  ...extras,
})

describe('permissões do usuário', () => {
  test('carrega as próprias permissões; sair limpa', async () => {
    rota('GET', '/usuario/permissoes', ['parametros'])
    const auth = useAuthStore()
    expect(auth.temPermissao('parametros')).toBe(false)
    await auth.carregarPermissoes()
    expect(auth.temPermissao('parametros')).toBe(true)
    expect(auth.temPermissao('permissoes')).toBe(false)
    auth.logout()
    expect(auth.permissoes).toEqual([])
    expect(auth.permissoesCarregadas).toBe(false)
  })
})

describe('abas restritas nas configurações', () => {
  async function abrir(permissoes: string[], abaAtiva: 'usuario' | 'sistema' = 'usuario') {
    rota('GET', '/usuario/permissoes', permissoes)
    rota('GET', '/sip', {})
    rota('GET', '/parametros', parametrosApi())
    rota('GET', '/permissoes', { permissoes: [], usuarios: [] })
    await useAuthStore().carregarPermissoes()
    tela = mount(ProfileSettingsModal, { props: { aberta: true, inline: true, abaAtiva }, attachTo: document.body })
    await flushPromises()
    return tela.findAll('aside button').map((b) => b.find('span').text())
  }

  test('sem permissão, Sistema e Acessos não aparecem', async () => {
    const abas = await abrir([])
    expect(abas).not.toContain('Sistema')
    expect(abas).not.toContain('Acessos')
  })

  test('cada aba aparece com a sua permissão', async () => {
    expect(await abrir(['parametros'])).toContain('Sistema')
    tela!.unmount()
    const abas = await abrir(['permissoes'])
    expect(abas).toContain('Acessos')
    expect(abas).not.toContain('Sistema')
  })

  test('link direto para uma aba sem permissão volta para Usuário', async () => {
    await abrir([], 'sistema')
    expect(tela!.emitted('update:abaAtiva')).toEqual([['usuario']])
  })
})

describe('tela Sistema', () => {
  async function abrir(parametros = parametrosApi()) {
    rota('GET', '/parametros', parametros)
    tela = mount(ConfiguracaoSistema, { attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const salvar = () => tela!.find('form').trigger('submit')

  test('mostra os parâmetros; a chave aparece só como configurada', async () => {
    await abrir()
    expect((tela!.find('input[type="number"]').element as HTMLInputElement).value).toBe('90')
    expect(tela!.text()).toContain('(configurada)')
    expect(tela!.text()).toContain('chat')
    expect(tela!.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  test('salva só o que mudou; a chave vai só se for digitada', async () => {
    rota('PATCH', '/parametros', (pedido: { corpo: Record<string, unknown> }) => parametrosApi(pedido.corpo))
    await abrir()
    await tela!.find('input[type="number"]').setValue('30')
    await tela!.find('input[type="checkbox"]').setValue(true)
    await salvar()
    await aguardar(10)
    expect(pedidosDe('PATCH', '/parametros')[0]!.corpo).toEqual({ gravacao_dias: 30, turn_forcar_relay: true })
    expect(tela!.text()).toContain('Configurações salvas.')

    await tela!.find('textarea').setValue('-----BEGIN PRIVATE KEY-----nova')
    await salvar()
    await aguardar(10)
    expect(pedidosDe('PATCH', '/parametros')[1]!.corpo).toEqual({ fcm_private_key: '-----BEGIN PRIVATE KEY-----nova' })
    expect((tela!.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  test('erro do servidor aparece e nada é dado como salvo', async () => {
    rota('PATCH', '/parametros', erro(400, 'Endereço do transcritor inválido (use http:// ou https://).'))
    await abrir()
    const [, , url] = tela!.findAll('input[type="text"]')
    await url!.setValue('ftp://x')
    await salvar()
    await aguardar(10)
    expect(tela!.text()).toContain('Endereço do transcritor inválido')
    expect(tela!.text()).not.toContain('Configurações salvas.')
  })

  test('IA: endereço e modelo salvam; o token só vai se digitado, ou vazio para remover', async () => {
    rota('PATCH', '/parametros', (pedido: { corpo: Record<string, unknown> }) => parametrosApi({ ...pedido.corpo, ia_token_configurado: true }))
    await abrir()
    const campo = (placeholder: string) => tela!.find(`input[placeholder^="${placeholder}"]`)
    await campo('http://ollama').setValue('http://ollama:11434/v1')
    await campo('llama3.1').setValue('llama3.1')
    await tela!.find('input[type="password"]').setValue('segredo')
    await salvar()
    await aguardar(10)
    expect(pedidosDe('PATCH', '/parametros')[0]!.corpo).toEqual({ ia_url: 'http://ollama:11434/v1', ia_modelo: 'llama3.1', ia_token: 'segredo' })
    expect((tela!.find('input[type="password"]').element as HTMLInputElement).value).toBe('')
    expect(tela!.text()).toContain('(configurado)')

    await tela!.findAll('button').find((b) => b.text() === 'Remover o token')!.trigger('click')
    expect(tela!.text()).toContain('(será removido)')
    await salvar()
    await aguardar(10)
    expect(pedidosDe('PATCH', '/parametros')[1]!.corpo).toEqual({ ia_token: '' })
  })

  test('IA: testar usa o que está na tela, antes de salvar, e mostra o resultado', async () => {
    rota('POST', '/parametros/ia/testar', { ok: true, resposta: 'ok', erro: '', milissegundos: 1234 })
    await abrir(parametrosApi({ ia_url: 'http://ollama:11434', ia_modelo: 'llama3.1' }))
    const testar = () => tela!.findAll('button').find((b) => b.text().startsWith('Testar'))!
    await testar().trigger('click')
    await aguardar(10)
    expect(pedidosDe('POST', '/parametros/ia/testar')[0]!.corpo).toEqual({ url: 'http://ollama:11434', modelo: 'llama3.1' })
    expect(tela!.text()).toContain('Funcionando (1.2 s): "ok"')
    rota('POST', '/parametros/ia/testar', { ok: false, resposta: '', erro: 'O servidor de IA respondeu 401', milissegundos: 10 })
    await testar().trigger('click')
    await aguardar(10)
    expect(tela!.text()).toContain('O servidor de IA respondeu 401')
  })

  test('sem permissão, mostra o motivo', async () => {
    rota('GET', '/parametros', erro(403, 'Acesso negado!'))
    tela = mount(ConfiguracaoSistema, { attachTo: document.body })
    await aguardar(10)
    expect(tela.text()).toContain('Acesso negado!')
  })
})

describe('tela Acessos', () => {
  const permissoesApi = () => ({
    permissoes: [{ codigo: 'parametros', descricao: 'Ver e alterar as configurações do sistema' }, { codigo: 'permissoes', descricao: 'Conceder e retirar permissões dos usuários' }],
    usuarios: [
      { id: 2, nome: 'Ana', login: 'ana', permissoes: [] },
      { id: EU, nome: 'Eu Mesmo', login: 'eu', permissoes: ['parametros', 'permissoes'] },
    ],
  })
  async function abrir(extras: Record<string, unknown> = {}) {
    rota('GET', '/permissoes', { ...permissoesApi(), ...extras })
    rota('GET', '/usuario/permissoes', ['parametros', 'permissoes'])
    tela = mount(ConfiguracaoAcessos, { attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const caixa = (nome: string) => tela!.find(`input[aria-label="${nome}"]`)

  test('lista quem tem cada permissão; a busca filtra', async () => {
    await abrir()
    expect((caixa('Sistema para Eu Mesmo').element as HTMLInputElement).checked).toBe(true)
    expect((caixa('Sistema para Ana').element as HTMLInputElement).checked).toBe(false)
    expect(tela!.text()).toContain('(você)')
    await tela!.find('input[type="text"]').setValue('ana')
    expect(tela!.findAll('tbody tr')).toHaveLength(1)
  })

  test('marcar concede e desmarcar retira', async () => {
    rota('PUT', '/permissao/usuario', { usuario_id: 2, codigo: 'parametros' })
    rota('DELETE', '/permissao/usuario', { usuario_id: 2, codigo: 'parametros' })
    await abrir()
    await caixa('Sistema para Ana').setValue(true)
    await aguardar(10)
    expect(pedidosDe('PUT', '/permissao/usuario')[0]!.corpo).toEqual({ usuario_id: 2, codigo: 'parametros' })
    await caixa('Sistema para Ana').setValue(false)
    await aguardar(10)
    expect(pedidosDe('DELETE', '/permissao/usuario')[0]!.consulta).toEqual({ usuario_id: '2', codigo: 'parametros' })
  })

  test('recusa do servidor mostra o motivo e a caixa volta', async () => {
    rota('DELETE', '/permissao/usuario', erro(400, 'Ao menos uma pessoa precisa poder gerenciar as permissões.'))
    await abrir()
    await caixa('Acessos para Eu Mesmo').setValue(false)
    await aguardar(10)
    expect(tela!.text()).toContain('Ao menos uma pessoa precisa poder gerenciar as permissões.')
    expect((caixa('Acessos para Eu Mesmo').element as HTMLInputElement).checked).toBe(true)
  })

  test('modo aberto: avisa; marcar Acessos para alguém encerra e atualiza o que você vê', async () => {
    rota('PUT', '/permissao/usuario', { usuario_id: 2, codigo: 'permissoes' })
    await abrir({ modo_aberto: true })
    expect(tela!.text()).toContain('Ninguém tem a permissão Acessos ainda')
    rota('GET', '/usuario/permissoes', [])
    await caixa('Acessos para Ana').setValue(true)
    await aguardar(10)
    expect(tela!.text()).not.toContain('Ninguém tem a permissão Acessos ainda')
    expect(useAuthStore().permissoes).toEqual([])
  })

  test('mexer nas próprias permissões atualiza o que você vê', async () => {
    rota('DELETE', '/permissao/usuario', { usuario_id: EU, codigo: 'parametros' })
    await abrir()
    rota('GET', '/usuario/permissoes', ['permissoes'])
    await caixa('Sistema para Eu Mesmo').setValue(false)
    await aguardar(10)
    expect(useAuthStore().permissoes).toEqual(['permissoes'])
  })
})

describe('privacidade', () => {
  const caixa = (titulo: string) => tela!.findAll('label').find((l) => l.text().includes(titulo))!.find('input')

  test('carrega, salva cada opção na hora; aparecendo offline as outras ficam travadas', async () => {
    rota('GET', '/usuario/privacidade', { mostrar_visto_em: true, mostrar_na_conversa: false, aparecer_offline: false })
    rota('PATCH', '/usuario', {})
    tela = mount(ConfiguracaoPrivacidade, { attachTo: document.body })
    await flushPromises()
    expect((caixa('Mostrar quando estou na conversa').element as HTMLInputElement).checked).toBe(false)
    await caixa('Aparecer offline').setValue(true)
    await aguardar(5)
    expect(pedidosDe('PATCH', '/usuario')[0]!.corpo).toEqual({ id: EU, aparecer_offline: true })
    expect(caixa('Mostrar o visto por último').attributes('disabled')).toBeDefined()
  })

  test('erro ao salvar volta a opção e avisa', async () => {
    rota('GET', '/usuario/privacidade', { mostrar_visto_em: true, mostrar_na_conversa: true, aparecer_offline: false })
    rota('PATCH', '/usuario', erro(500, 'Falhou'))
    tela = mount(ConfiguracaoPrivacidade, { attachTo: document.body })
    await flushPromises()
    await caixa('Mostrar o visto por último').setValue(false)
    await aguardar(5)
    expect(tela.text()).toContain('Falhou')
    expect((caixa('Mostrar o visto por último').element as HTMLInputElement).checked).toBe(true)
  })
})
