import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProfileSettingsModal from '@/components/ProfileSettingsModal.vue'
import ConfiguracaoSistema from '@/components/ConfiguracaoSistema.vue'
import ConfiguracaoAcessos from '@/components/ConfiguracaoAcessos.vue'
import ConfiguracaoPrivacidade from '@/components/ConfiguracaoPrivacidade.vue'
import ConfiguracaoBots from '@/components/ConfiguracaoBots.vue'
import ConfiguracaoUsuarios from '@/components/ConfiguracaoUsuarios.vue'
import ConfiguracaoFerramentas from '@/components/ConfiguracaoFerramentas.vue'
import ConfiguracaoConhecimento from '@/components/ConfiguracaoConhecimento.vue'
import EspacoUsado from '@/components/EspacoUsado.vue'
import { useRecursos } from '@/composables/useRecursos'
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
  ia_url: '', ia_modelo: '', ia_token_configurado: false, cadastro_aberto: true, ia_modelo_embeddings: '',
  ia_embeddings_url: '', ia_embeddings_token_configurado: false,
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
  async function abrir(permissoes: string[], abaAtiva: 'usuario' | 'sistema' | 'chamadas' | 'acessos' | 'usuarios' = 'usuario') {
    rota('GET', '/usuario/permissoes', permissoes)
    rota('GET', '/sip', {})
    rota('GET', '/parametros', parametrosApi())
    rota('GET', '/permissoes', { permissoes: [], usuarios: [] })
    await useAuthStore().carregarPermissoes()
    tela = mount(ProfileSettingsModal, { props: { aberta: true, inline: true, abaAtiva }, attachTo: document.body })
    await flushPromises()
    return tela.findAll('aside button').map((b) => b.find('span').text())
  }
  const subabas = () => tela!.findAll('[data-subaba]').map((b) => b.text())

  test('sem permissão, só os menus pessoais, sem a seção Administração', async () => {
    const menus = await abrir([])
    expect(menus).toEqual(['Conta', 'Dispositivos'])
    expect(tela!.text()).not.toContain('Administração')
    expect(subabas()).toEqual(['Perfil', 'Privacidade'])
  })

  test('cada menu aparece com a sua permissão', async () => {
    expect(await abrir(['parametros'])).toEqual(['Conta', 'Dispositivos', 'Sistema', 'IA'])
    expect(tela!.text()).toContain('Administração')
    tela!.unmount()
    expect(await abrir(['permissoes'])).toEqual(['Conta', 'Dispositivos', 'Pessoas', 'IA'])
  })

  test('Pessoas é uma tela só, Usuários, com a permissão Pessoas; o endereço antigo de Acessos leva para ela', async () => {
    await abrir(['permissoes'], 'acessos')
    expect(tela!.emitted('update:abaAtiva')).toEqual([['usuarios']])
    tela!.unmount()
    await abrir(['permissoes'], 'usuarios')
    // Uma aba só: sem a barra de sub-abas, direto na tela
    expect(subabas()).toEqual([])
    expect(tela!.text()).toContain('Novo usuário')
  })

  test('Chamadas junta Qualidade e Voip; os dois somem sem as permissões de uso', async () => {
    expect(await abrir(['permissoes', 'cores'])).toEqual(['Conta', 'Aparência', 'Dispositivos', 'Pessoas', 'IA'])
    tela!.unmount()
    await abrir(['config_chamadas', 'telefonia'], 'chamadas')
    expect(subabas()).toEqual(['Qualidade', 'Voip'])
  })

  test('clicar num menu abre a primeira sub-aba dele', async () => {
    await abrir(['parametros', 'bots'])
    await tela!.findAll('aside button').find((b) => b.text().startsWith('IA'))!.trigger('click')
    expect(tela!.emitted('update:abaAtiva')).toEqual([['bots']])
  })

  test('aba Usuário: sem nome e avatar, trava o nome e some a foto; salvar manda só o e-mail; sem senha, some a troca', async () => {
    rota('PATCH', '/usuario', {})
    await abrir(['email'])
    const [nome, email] = tela!.findAll('form input:not([type="password"])')
    expect(nome!.attributes('disabled')).toBeDefined()
    expect(email!.attributes('disabled')).toBeUndefined()
    expect(tela!.text()).toContain('Você não tem permissão para mudar o avatar.')
    expect(tela!.text()).not.toContain('Salvar senha')
    await email!.setValue('novo@teste.test')
    await tela!.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('PATCH', '/usuario')[0]!.corpo).toEqual({ id: EU, email: 'novo@teste.test' })
  })

  test('link direto para uma aba sem permissão volta para Usuário', async () => {
    await abrir([], 'sistema')
    expect(tela!.emitted('update:abaAtiva')).toEqual([['usuario']])
  })
})

describe('tela Sistema', () => {
  async function abrir(parametros = parametrosApi(), parte: 'geral' | 'ia' = 'geral') {
    rota('GET', '/parametros', parametros)
    tela = mount(ConfiguracaoSistema, { props: { parte }, attachTo: document.body })
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

  const campo = (rotulo: string) => tela!.findAll('label').find((l) => l.text().startsWith(rotulo))!.find('input')
  const botao = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)!

  test('servidor de embeddings próprio: o token só aparece com o endereço e vai junto ao salvar', async () => {
    rota('PATCH', '/parametros', (pedido: { corpo: Record<string, unknown> }) => parametrosApi({ ...pedido.corpo, ia_embeddings_token_configurado: true }))
    await abrir(parametrosApi({ ia_url: 'http://ia.test:1234', ia_modelo: 'gemma', ia_modelo_embeddings: 'nomic-embed-text' }), 'ia')
    expect(tela!.text()).not.toContain('Token do servidor de embeddings')
    await campo('Endereço do servidor de embeddings').setValue('http://embeddings.test:8081')
    await campo('Token do servidor de embeddings').setValue('segredo')
    await salvar()
    await aguardar(10)
    expect(pedidosDe('PATCH', '/parametros')[0]!.corpo).toEqual({ ia_embeddings_url: 'http://embeddings.test:8081', ia_embeddings_token: 'segredo' })
    expect(tela!.text()).toContain('(configurado)')
  })

  test('Testar embeddings: no servidor próprio com o token dele; sem endereço, no da IA com o token da IA', async () => {
    rota('POST', '/parametros/ia/testar-embeddings', { ok: true, dimensoes: 768, erro: '', milissegundos: 120 })
    await abrir(parametrosApi({ ia_url: 'http://ia.test:1234', ia_modelo: 'gemma', ia_modelo_embeddings: 'nomic-embed-text' }), 'ia')
    await campo('Token').setValue('token-da-ia')
    await botao('Testar embeddings').trigger('click')
    await aguardar(10)
    expect(pedidosDe('POST', '/parametros/ia/testar-embeddings')[0]!.corpo).toEqual({ url: '', url_ia: 'http://ia.test:1234', modelo: 'nomic-embed-text', token: 'token-da-ia' })
    expect(tela!.text()).toContain('vetores de 768 dimensões')

    await campo('Endereço do servidor de embeddings').setValue('http://embeddings.test:8081')
    await campo('Token do servidor de embeddings').setValue('token-dos-embeddings')
    rota('POST', '/parametros/ia/testar-embeddings', { ok: false, dimensoes: 0, erro: 'Não foi possível falar com o servidor de IA', milissegundos: 5 })
    await botao('Testar embeddings').trigger('click')
    await aguardar(10)
    expect(pedidosDe('POST', '/parametros/ia/testar-embeddings')[1]!.corpo).toEqual({ url: 'http://embeddings.test:8081', url_ia: 'http://ia.test:1234', modelo: 'nomic-embed-text', token: 'token-dos-embeddings' })
    expect(tela!.text()).toContain('Não foi possível falar com o servidor de IA')
  })

  test('salva só o que mudou; a chave vai só se for digitada', async () => {
    rota('PATCH', '/parametros', (pedido: { corpo: Record<string, unknown> }) => parametrosApi(pedido.corpo))
    await abrir()
    await tela!.find('input[type="number"]').setValue('30')
    const caixa = (texto: string) => tela!.findAll('label').find((l) => l.text().includes(texto))!.find('input[type="checkbox"]')
    await caixa('Forçar relay pelo TURN').setValue(true)
    await caixa('Permitir que as pessoas se cadastrem').setValue(false)
    await salvar()
    await aguardar(10)
    expect(pedidosDe('PATCH', '/parametros')[0]!.corpo).toEqual({ gravacao_dias: 30, turn_forcar_relay: true, cadastro_aberto: false })
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
    await abrir(parametrosApi(), 'ia')
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
    await abrir(parametrosApi({ ia_url: 'http://ollama:11434', ia_modelo: 'llama3.1' }), 'ia')
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

  test('cada parte mostra só as suas seções', async () => {
    await abrir()
    expect(tela!.text()).toContain('Transcrição de áudio')
    expect(tela!.text()).not.toContain('Inteligência artificial')
    tela!.unmount()
    await abrir(parametrosApi(), 'ia')
    expect(tela!.text()).toContain('Inteligência artificial')
    expect(tela!.text()).not.toContain('Transcrição de áudio')
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
    permissoes: [
      { codigo: 'parametros', descricao: 'Ver e alterar as configurações do sistema', uso: false },
      { codigo: 'permissoes', descricao: 'Conceder e retirar permissões dos usuários', uso: false },
      { codigo: 'emoji', descricao: 'Enviar emojis no texto das mensagens', uso: true },
      { codigo: 'chamada_video', descricao: 'Fazer chamadas de vídeo e ligar o vídeo na chamada', uso: true },
    ],
    usuarios: [
      { id: 2, nome: 'Ana', login: 'ana', permissoes: ['emoji'] },
      { id: EU, nome: 'Eu Mesmo', login: 'eu', permissoes: ['parametros', 'permissoes', 'emoji'] },
    ],
  })
  async function abrir(extras: Record<string, unknown> = {}) {
    rota('GET', '/permissoes', { ...permissoesApi(), ...extras })
    rota('GET', '/usuario/permissoes', ['parametros', 'permissoes'])
    tela = mount(ConfiguracaoAcessos, { attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const pessoa = (nome: string) => tela!.findAll('button[aria-expanded]').find((b) => b.text().includes(nome))!
  // "Sistema para Ana": abre o painel da Ana (um aberto por vez) e acha a caixa
  async function caixa(rotulo: string) {
    const botao = pessoa(rotulo.split(' para ')[1]!)
    if (botao.attributes('aria-expanded') !== 'true') await botao.trigger('click')
    return tela!.find(`input[aria-label="${rotulo}"]`)
  }

  test('lista quem tem cada permissão; a busca filtra', async () => {
    await abrir()
    expect(((await caixa('Sistema para Eu Mesmo')).element as HTMLInputElement).checked).toBe(true)
    expect(((await caixa('Sistema para Ana')).element as HTMLInputElement).checked).toBe(false)
    expect(tela!.text()).toContain('(você)')
    await tela!.find('input[type="text"]').setValue('ana')
    expect(tela!.findAll('button[aria-expanded]')).toHaveLength(1)
  })

  test('marcar concede e desmarcar retira', async () => {
    rota('PUT', '/permissao/usuario', { usuario_id: 2, codigo: 'parametros' })
    rota('DELETE', '/permissao/usuario', { usuario_id: 2, codigo: 'parametros' })
    await abrir()
    await (await caixa('Sistema para Ana')).setValue(true)
    await aguardar(10)
    expect(pedidosDe('PUT', '/permissao/usuario')[0]!.corpo).toEqual({ usuario_id: 2, codigo: 'parametros' })
    await (await caixa('Sistema para Ana')).setValue(false)
    await aguardar(10)
    expect(pedidosDe('DELETE', '/permissao/usuario')[0]!.consulta).toEqual({ usuario_id: '2', codigo: 'parametros' })
  })

  test('recusa do servidor mostra o motivo e a caixa volta', async () => {
    rota('PUT', '/permissao/usuario', erro(403, 'Acesso negado!'))
    await abrir()
    await (await caixa('Pessoas para Ana')).setValue(true)
    await aguardar(10)
    expect(tela!.text()).toContain('Acesso negado!')
    expect(((await caixa('Pessoas para Ana')).element as HTMLInputElement).checked).toBe(false)
  })

  test('as próprias permissões marcadas ficam travadas; as dos outros não', async () => {
    await abrir()
    expect((await caixa('Pessoas para Eu Mesmo')).attributes('disabled')).toBeDefined()
    expect((await caixa('Sistema para Eu Mesmo')).attributes('disabled')).toBeDefined()
    expect((await caixa('Sistema para Ana')).attributes('disabled')).toBeUndefined()
  })

  test('cada pessoa abre com a administração em cima e o uso embaixo; conta todas', async () => {
    rota('PUT', '/permissao/usuario', { usuario_id: 2, codigo: 'chamada_video' })
    await abrir()
    expect(tela!.find('table').exists()).toBe(false)
    expect(pessoa('Ana').text()).toContain('1 de 4')
    expect(pessoa('Ana').text()).not.toContain('Administração')
    expect(pessoa('Eu Mesmo').text()).toContain('Administração')
    await pessoa('Ana').trigger('click')
    expect(tela!.findAll('fieldset legend').map((l) => l.text())).toEqual(['Administração', 'Enviar', 'Chamadas'])
    const opcao = (texto: string) => tela!.findAll('fieldset label').find((l) => l.text().includes(texto))!.find('input')
    expect((opcao('Emojis no texto').element as HTMLInputElement).checked).toBe(true)
    await opcao('Chamadas de vídeo').setValue(true)
    await aguardar(10)
    expect(pedidosDe('PUT', '/permissao/usuario')[0]!.corpo).toEqual({ usuario_id: 2, codigo: 'chamada_video' })
    expect(pessoa('Ana').text()).toContain('2 de 4')
    // As próprias de uso também ficam travadas
    await pessoa('Eu Mesmo').trigger('click')
    expect(opcao('Emojis no texto').attributes('disabled')).toBeDefined()
    expect(opcao('Chamadas de vídeo').attributes('disabled')).toBeUndefined()
  })

  test('modo aberto: avisa; marcar Acessos para alguém encerra e atualiza o que você vê', async () => {
    rota('PUT', '/permissao/usuario', { usuario_id: 2, codigo: 'permissoes' })
    await abrir({ modo_aberto: true })
    expect(tela!.text()).toContain('Ninguém tem a permissão Pessoas ainda')
    rota('GET', '/usuario/permissoes', [])
    await (await caixa('Pessoas para Ana')).setValue(true)
    await aguardar(10)
    expect(tela!.text()).not.toContain('Ninguém tem a permissão Pessoas ainda')
    expect(useAuthStore().permissoes).toEqual([])
  })

  test('mexer nas próprias permissões atualiza o que você vê', async () => {
    rota('PUT', '/permissao/usuario', { usuario_id: 2, codigo: 'parametros' })
    await abrir({
      usuarios: [
        { id: 2, nome: 'Ana', login: 'ana', permissoes: [] },
        { id: EU, nome: 'Eu Mesmo', login: 'eu', permissoes: ['permissoes'] },
      ],
    })
    rota('GET', '/usuario/permissoes', ['parametros', 'permissoes'])
    await (await caixa('Sistema para Eu Mesmo')).setValue(true)
    await aguardar(10)
    expect(useAuthStore().permissoes).toEqual(['parametros', 'permissoes'])
  })
})

describe('tela Bots', () => {
  const bot = (extras: Record<string, unknown> = {}) => ({
    id: 3, usuario_id: 40, nome: 'Compras', login: 'bot-compras-a1b2c3', instrucoes: 'Ajuda com compras.', ativo: true,
    criado_por: EU, criado_por_nome: 'Eu Mesmo', permissoes: ['emoji', 'responder', 'reagir'], ferramentas: [], bases: [], ...extras,
  })
  async function abrir(ia: boolean, minhas: string[], bots: unknown[] = [bot()]) {
    rota('GET', '/recursos', { transcricao: false, ia })
    await useRecursos().recarregar()
    const auth = useAuthStore()
    auth.permissoes = minhas
    auth.permissoesCarregadas = true
    rota('GET', '/bots', bots)
    tela = mount(ConfiguracaoBots, { attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const botao = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)!
  const opcao = (texto: string) => tela!.findAll('fieldset label').find((l) => l.text() === texto)!.find('input')

  test('lista os bots; Novo bot cria com nome e instruções e ele entra na lista', async () => {
    rota('PUT', '/bot', bot({ id: 4, usuario_id: 41, nome: 'Suporte', login: 'bot-suporte-x' }))
    await abrir(true, ['bots', 'emoji'])
    expect(tela!.text()).toContain('Compras')
    expect(tela!.text()).toContain('Ligado')
    await botao('Novo bot').trigger('click')
    await tela!.find('input[type="text"]').setValue('Suporte')
    await tela!.find('textarea').setValue('Você ajuda com dúvidas de TI.')
    await tela!.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('PUT', '/bot')[0]!.corpo).toEqual({ nome: 'Suporte', instrucoes: 'Você ajuda com dúvidas de TI.' })
    expect(tela!.find('form').exists()).toBe(false)
    expect(tela!.text()).toContain('bot-suporte-x')
  })

  test('editar: só libera o que você tem; marcar manda a lista nova; salvar manda só o que mudou', async () => {
    rota('PUT', '/bot/permissoes', bot({ permissoes: ['emoji', 'responder', 'reagir', 'figurinha'] }))
    rota('PATCH', '/bot', bot({ ativo: false }))
    await abrir(true, ['bots', 'emoji', 'figurinha'])
    await botao('Editar').trigger('click')
    expect(opcao('Vídeos').attributes('disabled')).toBeDefined()
    // Já liberada, pode tirar mesmo sem ter
    expect(opcao('Responder').attributes('disabled')).toBeUndefined()
    await opcao('Figurinhas').setValue(true)
    await aguardar(10)
    expect(pedidosDe('PUT', '/bot/permissoes')[0]!.corpo).toEqual({ id: 3, permissoes: ['emoji', 'responder', 'reagir', 'figurinha'] })
    await tela!.findAll('form input[type="checkbox"]')[0]!.setValue(false)
    await tela!.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('PATCH', '/bot')[0]!.corpo).toEqual({ id: 3, ativo: false })
    expect(tela!.text()).toContain('Desligado')
  })

  test('Excluir bot pede confirmação; confirmado, some da lista', async () => {
    rota('DELETE', '/bot', { id: 3, apagado: false })
    await abrir(true, ['bots'])
    await botao('Editar').trigger('click')
    const noCorpo = (texto: string) => [...document.body.querySelectorAll('[role="alertdialog"] button')].find((b) => b.textContent?.trim() === texto) as HTMLButtonElement
    await botao('Excluir bot').trigger('click')
    await aguardar(5)
    expect(document.body.textContent).toContain('Excluir Compras?')
    noCorpo('Cancelar').click()
    await aguardar(10)
    expect(pedidosDe('DELETE', '/bot')).toHaveLength(0)
    await botao('Excluir bot').trigger('click')
    await aguardar(5)
    noCorpo('Excluir').click()
    await aguardar(10)
    expect(pedidosDe('DELETE', '/bot')[0]!.consulta).toEqual({ id: '3' })
    expect(tela!.text()).toContain('Nenhum bot ainda.')
    expect(tela!.find('form').exists()).toBe(false)
  })

  test('ferramentas externas: lista as disponíveis e marcar manda a lista nova', async () => {
    rota('GET', '/ferramentas/disponiveis', [{ id: 9, nome: 'consultar_conhecimento', descricao: 'Busca na base' }])
    rota('PUT', '/bot/ferramentas', bot({ ferramentas: [9] }))
    await abrir(true, ['bots'])
    await botao('Editar').trigger('click')
    const caixa = tela!.findAll('label').find((l) => l.text().includes('consultar_conhecimento'))!.find('input')
    expect((caixa.element as HTMLInputElement).checked).toBe(false)
    await caixa.setValue(true)
    await aguardar(10)
    expect(pedidosDe('PUT', '/bot/ferramentas')[0]!.corpo).toEqual({ id: 3, ferramentas: [9] })
    expect((caixa.element as HTMLInputElement).checked).toBe(true)
  })

  test('bases de conhecimento: lista as disponíveis e marcar manda a lista nova', async () => {
    rota('GET', '/conhecimento/disponiveis', [{ id: 4, nome: 'RH', descricao: 'Políticas' }])
    rota('PUT', '/bot/conhecimento', bot({ bases: [4] }))
    await abrir(true, ['bots'])
    await botao('Editar').trigger('click')
    const caixa = tela!.findAll('label').find((l) => l.text().startsWith('RH'))!.find('input')
    await caixa.setValue(true)
    await aguardar(10)
    expect(pedidosDe('PUT', '/bot/conhecimento')[0]!.corpo).toEqual({ id: 3, bases: [4] })
  })

  test('IA desligada: avisa e não deixa criar', async () => {
    await abrir(false, ['bots'], [])
    expect(tela!.text()).toContain('A IA está desligada')
    expect(botao('Novo bot').attributes('disabled')).toBeDefined()
    expect(tela!.text()).toContain('Nenhum bot ainda.')
  })
})

describe('tela Ferramentas', () => {
  const ferramenta = (extras: Record<string, unknown> = {}) => ({
    id: 9, nome: 'consultar_conhecimento', descricao: 'Busca na base', metodo: 'GET', url: 'https://base.test/buscar',
    cabecalhos: ['Authorization'], parametros: [{ nome: 'pergunta', tipo: 'string', descricao: 'O que procurar', obrigatorio: true }], ativo: true, ...extras,
  })
  async function abrir(lista: unknown[] = []) {
    rota('GET', '/ferramentas', lista)
    tela = mount(ConfiguracaoFerramentas, { attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const botao = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)!
  const campo = (rotulo: string) => tela!.findAll('label').find((l) => l.text().startsWith(rotulo))!.find('input, textarea, select')

  test('a embutida da base de conhecimento aparece primeiro e abre só para leitura, com a definição', async () => {
    rota('GET', '/ferramentas/embutidas', [{
      nome: 'consultar_conhecimento',
      descricao: 'Procura na base de conhecimento (RH: Políticas) os trechos de documentos que respondem à pergunta.',
      origem: 'Interna: busca no Qdrant. Não chama endereço externo e não tem cabeçalhos.',
      parametros: [
        { nome: 'pergunta', tipo: 'string', descricao: 'O que procurar, em poucas palavras', obrigatorio: true },
        { nome: 'base', tipo: 'string', descricao: 'Em qual base procurar', obrigatorio: false },
      ],
      definicao: { type: 'function', function: { name: 'consultar_conhecimento', parameters: { required: ['pergunta'] } } },
    }])
    await abrir([ferramenta({ id: 9, nome: 'buscar_pedidos' })])
    const linhas = tela!.findAll('section.overflow-hidden > div').map((l) => l.text())
    expect(linhas[0]).toContain('consultar_conhecimento')
    expect(linhas[0]).toContain('Embutida')
    expect(linhas[1]).toContain('buscar_pedidos')
    await botao('Ver').trigger('click')
    // O mesmo formulário das cadastradas, com os mesmos campos, todos travados
    const painel = tela!.find('form[aria-label="Ferramenta embutida"]')
    const valor = (rotulo: string) => (painel.findAll('label').find((l) => l.text().startsWith(rotulo))!.find('input, textarea').element as HTMLInputElement).value
    expect(valor('Nome')).toBe('consultar_conhecimento')
    expect(valor('Descrição')).toContain('RH: Políticas')
    expect(valor('Método')).toBe('Interna')
    expect(painel.text()).toContain('Não chama endereço externo')
    expect(painel.text()).toContain('Nenhum: ela não chama endereço externo.')
    expect(painel.findAll('input[aria-label="Nome do parâmetro"]').map((i) => (i.element as HTMLInputElement).value)).toEqual(['pergunta', 'base'])
    expect(painel.find('fieldset').attributes('disabled')).toBeDefined()
    expect(painel.find('pre').text()).toContain('"required": [')
    // Sem editar: nada de remover, acrescentar, salvar, excluir nem testar
    expect(painel.findAll('button').map((b) => b.text())).toEqual(['Fechar'])
    await botao('Fechar').trigger('click')
    expect(tela!.find('form').exists()).toBe(false)
    expect(botao('Nova ferramenta').exists()).toBe(true)
  })

  test('cria com cabeçalho e parâmetro; fica aberta para testar', async () => {
    rota('PUT', '/ferramenta', ferramenta())
    await abrir()
    expect(tela!.text()).toContain('Nenhuma API externa cadastrada ainda: use Nova ferramenta para cadastrar a primeira.')
    await botao('Nova ferramenta').trigger('click')
    await campo('Nome').setValue('consultar_conhecimento')
    await campo('Descrição').setValue('Busca na base')
    await campo('Endereço').setValue('https://base.test/buscar')
    await botao('+ Cabeçalho').trigger('click')
    await tela!.find('input[aria-label="Nome do cabeçalho"]').setValue('Authorization')
    await tela!.find('input[aria-label="Valor do cabeçalho"]').setValue('Bearer x')
    await tela!.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('PUT', '/ferramenta')[0]!.corpo).toEqual({
      nome: 'consultar_conhecimento', descricao: 'Busca na base', metodo: 'GET', url: 'https://base.test/buscar',
      cabecalhos: [{ nome: 'Authorization', valor: 'Bearer x' }],
      parametros: [{ nome: 'pergunta', tipo: 'string', descricao: '', obrigatorio: true }],
      ativo: true,
    })
    expect(tela!.text()).toContain('Testar')
    expect(tela!.find('input[aria-label="Valor do cabeçalho"]').attributes('placeholder')).toBe('Salvo: deixe vazio para manter')
  })

  test('editar manda o cabeçalho salvo sem valor; Testar mostra a resposta', async () => {
    rota('PATCH', '/ferramenta', ferramenta({ descricao: 'Outra' }))
    rota('POST', '/ferramenta/testar', { ok: true, status: 200, resposta: '{"trechos":["5 dias"]}', erro: '', milissegundos: 42 })
    await abrir([ferramenta()])
    await botao('Editar').trigger('click')
    await campo('Descrição').setValue('Outra')
    await tela!.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('PATCH', '/ferramenta')[0]!.corpo).toMatchObject({ id: 9, descricao: 'Outra', cabecalhos: [{ nome: 'Authorization', valor: null }] })
    await campo('pergunta').setValue('prazo')
    await botao('Testar').trigger('click')
    await aguardar(10)
    expect(pedidosDe('POST', '/ferramenta/testar')[0]!.corpo).toEqual({ id: 9, argumentos: { pergunta: 'prazo' } })
    expect(tela!.text()).toContain('Respondeu 200 · 42 ms')
    expect(tela!.text()).toContain('{"trechos":["5 dias"]}')
  })
})

describe('tela Conhecimento', () => {
  const base = (extras: Record<string, unknown> = {}) => ({ id: 4, nome: 'RH', descricao: 'Políticas', documentos: 1, trechos: 3, ...extras })
  const documento = (extras: Record<string, unknown> = {}) => ({
    id: 10, base_id: 4, nome: 'ferias.pdf', caracteres: 2500, trechos: 3, status: 2, erro: null, criado_em: '2026-10-15T10:00:00.000Z', ...extras,
  })
  async function abrir(ligada = true, bases: unknown[] = [base()], documentos: unknown[] = [documento()]) {
    rota('GET', '/recursos', { transcricao: false, ia: true, conhecimento: ligada })
    await useRecursos().recarregar()
    rota('GET', '/conhecimento/bases', bases)
    rota('GET', '/conhecimento/documentos', documentos)
    tela = mount(ConfiguracaoConhecimento, { attachTo: document.body })
    await aguardar(20)
    return tela
  }
  const botao = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)!

  test('abre a primeira base com os documentos e o status; documento com erro mostra o motivo', async () => {
    await abrir(true, [base()], [documento(), documento({ id: 11, nome: 'escaneado.pdf', status: 3, erro: 'O servidor de IA respondeu 404', trechos: 0 })])
    expect(pedidosDe('GET', '/conhecimento/documentos')[0]!.consulta).toEqual({ base: '4' })
    expect(tela!.text()).toContain('ferias.pdf')
    expect(tela!.text()).toContain('2.500 caracteres · 3 trechos')
    expect(tela!.text()).toContain('Pronto')
    expect(tela!.text()).toContain('O servidor de IA respondeu 404')
  })

  test('enviar um .txt manda o texto para a base', async () => {
    rota('PUT', '/conhecimento/documento', documento({ id: 12, nome: 'faq.txt', status: 1 }))
    await abrir()
    const input = tela!.find('input[type="file"]')
    const texto = 'Pergunta: horário?\n\nResposta: 8h às 17h.'
    Object.defineProperty(input.element, 'files', { value: [new File([texto], 'faq.txt', { type: 'text/plain' })] })
    await input.trigger('change')
    await aguardar(20)
    expect(pedidosDe('PUT', '/conhecimento/documento')[0]!.corpo).toEqual({ base_id: 4, nome: 'faq.txt', texto })
  })

  test('formato não aceito avisa e não envia', async () => {
    await abrir()
    const input = tela!.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'planilha.xlsx')] })
    await input.trigger('change')
    await aguardar(20)
    expect(pedidosDe('PUT', '/conhecimento/documento')).toHaveLength(0)
    expect(tela!.text()).toContain('planilha.xlsx: Formato não aceito')
  })

  test('Testar busca mostra os trechos com o documento e a semelhança', async () => {
    rota('POST', '/conhecimento/buscar', [{ documento: 'ferias.pdf', texto: 'Peça com 45 dias de antecedência.', nota: 0.87 }])
    await abrir()
    await tela!.find('input[aria-label="Pergunta de teste"]').setValue('antecedência das férias')
    await botao('Buscar').trigger('submit')
    await tela!.findAll('form').find((f) => f.text().includes('Testar busca'))!.trigger('submit')
    await aguardar(10)
    expect(pedidosDe('POST', '/conhecimento/buscar')[0]!.corpo).toEqual({ bases: [4], pergunta: 'antecedência das férias' })
    expect(tela!.text()).toContain('ferias.pdf · semelhança 0.87')
    expect(tela!.text()).toContain('Peça com 45 dias de antecedência.')
    // As palavras da pergunta aparecem destacadas no trecho
    expect(tela!.findAll('mark').map((m) => m.text())).toEqual(['antecedência'])
  })

  test('nova base é criada e já fica aberta; desligada, avisa e não deixa enviar', async () => {
    rota('PUT', '/conhecimento/base', base({ id: 5, nome: 'Suporte', documentos: 0, trechos: 0 }))
    await abrir(false, [], [])
    expect(tela!.text()).toContain('A base de conhecimento está desligada')
    await botao('Nova base').trigger('click')
    await tela!.find('input[placeholder="Ex.: RH"]').setValue('Suporte')
    rota('GET', '/conhecimento/bases', [base({ id: 5, nome: 'Suporte', documentos: 0, trechos: 0 })])
    await tela!.find('form').trigger('submit')
    await aguardar(20)
    expect(pedidosDe('PUT', '/conhecimento/base')[0]!.corpo).toEqual({ nome: 'Suporte', descricao: '' })
    expect(botao('Enviar documentos').attributes('disabled')).toBeDefined()
  })
})

describe('tela Usuários', () => {
  const permissoesApi = () => ({
    permissoes: [
      { codigo: 'parametros', descricao: 'Ver e alterar as configurações do sistema', uso: false },
      { codigo: 'permissoes', descricao: 'Cadastrar pessoas e bots e conceder e retirar permissões', uso: false },
      { codigo: 'emoji', descricao: 'Enviar emojis', uso: true },
      { codigo: 'figurinha', descricao: 'Enviar figurinhas', uso: true },
      { codigo: 'responder', descricao: 'Responder', uso: true },
      { codigo: 'reagir', descricao: 'Reagir', uso: true },
    ],
    usuarios: [
      { id: 2, nome: 'Ana', login: 'ana', criado_em: new Date(2026, 2, 9), bot: false, permissoes: ['emoji'], espaco: 1572864 },
      { id: 40, nome: 'Compras', login: 'bot-compras', criado_em: null, bot: true, permissoes: ['emoji', 'responder', 'reagir'], espaco: 0 },
    ],
    modo_aberto: false,
  })
  async function abrir(ia = true) {
    rota('GET', '/recursos', { transcricao: false, ia })
    await useRecursos().recarregar()
    rota('GET', '/permissoes', permissoesApi())
    rota('GET', '/usuario/permissoes', ['permissoes'])
    tela = mount(ConfiguracaoUsuarios, { attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const botao = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)!
  const campo = (rotulo: string) => tela!.findAll('label').find((l) => l.text().startsWith(rotulo))!.find('input, textarea')
  const acesso = (nome: string) => tela!.find('form').findAll('fieldset label').find((l) => l.text() === nome)!.find('input')
  const marcado = (nome: string) => (acesso(nome).element as HTMLInputElement).checked

  test('uma lista só, com os acessos de cada um e a marca de bot; cria uma pessoa já com os acessos escolhidos', async () => {
    rota('PUT', '/usuario/novo', { id: 50, nome: 'Bruno', login: 'bruno', bot: false })
    await abrir()
    const compras = tela!.findAll('button[aria-expanded]').find((b) => b.text().includes('Compras'))!
    expect(compras.text()).toContain('Bot')
    expect(compras.text()).toContain('3 de 6')
    // Espaço dos arquivos que cada um enviou
    expect(tela!.findAll('button[aria-expanded]').find((b) => b.text().includes('Ana'))!.text()).toContain('1.5 MB')
    expect(compras.text()).toContain('0 B')
    // Data do cadastro; conta sem data não mostra nada
    expect(tela!.findAll('button[aria-expanded]').find((b) => b.text().includes('Ana'))!.text()).toContain('09/03/2026')
    expect(compras.text()).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)

    await botao('Novo usuário').trigger('click')
    await aguardar(10)
    // Padrão de pessoa: todas as de uso, nenhuma de administração
    expect(tela!.find('form').findAll('fieldset legend').map((l) => l.text())).toEqual(['Administração', 'Enviar', 'Mensagens'])
    expect(['Emojis no texto', 'Figurinhas', 'Responder', 'Reagir'].every(marcado)).toBe(true)
    expect(marcado('Sistema')).toBe(false)
    await acesso('Figurinhas').setValue(false)
    await acesso('Sistema').setValue(true)

    await campo('Nome').setValue('Bruno')
    await campo('Login').setValue('bruno')
    await campo('E-mail').setValue('bruno@teste.test')
    expect(botao('Criar').attributes('disabled')).toBeDefined()
    await campo('Senha').setValue('segredo')
    const listas = pedidosDe('GET', '/permissoes').length
    await tela!.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('PUT', '/usuario/novo')[0]!.corpo).toEqual({
      nome: 'Bruno', login: 'bruno', email: 'bruno@teste.test', senha: 'segredo', permissoes: ['emoji', 'responder', 'reagir', 'parametros'],
    })
    expect(tela!.text()).toContain('Conta de Bruno criada (login bruno).')
    expect(tela!.find('form').exists()).toBe(false)
    // A lista volta a carregar, com a conta nova
    expect(pedidosDe('GET', '/permissoes').length).toBeGreaterThan(listas)
  })

  test('bot: instruções no lugar de login e senha, só as de uso com o básico marcado; com a IA desligada não cria', async () => {
    rota('PUT', '/usuario/novo', { id: 51, nome: 'Suporte', login: 'bot-suporte-x', bot: true })
    await abrir()
    await botao('Novo usuário').trigger('click')
    await aguardar(10)
    await campo('É um bot').setValue(true)
    expect(tela!.findAll('input[type="password"]')).toHaveLength(0)
    expect(tela!.find('form').findAll('fieldset legend').map((l) => l.text())).toEqual(['Enviar', 'Mensagens'])
    expect(marcado('Figurinhas')).toBe(false)
    expect(['Emojis no texto', 'Responder', 'Reagir'].every(marcado)).toBe(true)
    await campo('Nome').setValue('Suporte')
    await campo('Instruções').setValue('Ajuda com TI.')
    await tela!.find('form').trigger('submit')
    await aguardar(10)
    expect(pedidosDe('PUT', '/usuario/novo')[0]!.corpo).toEqual({ nome: 'Suporte', bot: true, instrucoes: 'Ajuda com TI.', permissoes: ['emoji', 'responder', 'reagir'] })
    expect(tela!.text()).toContain('Bot Suporte criado.')

    tela!.unmount()
    await abrir(false)
    await botao('Novo usuário').trigger('click')
    await aguardar(10)
    await campo('É um bot').setValue(true)
    await campo('Nome').setValue('Outro')
    await campo('Instruções').setValue('x')
    expect(tela!.text()).toContain('A IA está desligada')
    expect(botao('Criar').attributes('disabled')).toBeDefined()
  })
})

describe('armazenamento na conta', () => {
  test('mostra o espaço dos arquivos que a pessoa enviou', async () => {
    rota('GET', '/usuario/espaco', { bytes: 2048 })
    tela = mount(EspacoUsado, { attachTo: document.body })
    await aguardar(10)
    expect(tela.text()).toContain('2.0 KB')
    expect(tela.text()).toContain('usados pelos arquivos que você enviou')
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

  test('sem a permissão, avisa e as opções ficam travadas', async () => {
    rota('GET', '/usuario/privacidade', { mostrar_visto_em: true, mostrar_na_conversa: true, aparecer_offline: false })
    const auth = useAuthStore()
    auth.permissoes = []
    auth.permissoesCarregadas = true
    tela = mount(ConfiguracaoPrivacidade, { attachTo: document.body })
    await flushPromises()
    expect(tela.text()).toContain('Você não tem permissão para mudar a privacidade.')
    expect(caixa('Aparecer offline').attributes('disabled')).toBeDefined()
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
