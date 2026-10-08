import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BolhaEnquete from '@/components/BolhaEnquete.vue'
import BolhaExcluida from '@/components/BolhaExcluida.vue'
import EnqueteModal from '@/components/EnqueteModal.vue'
import AnexoPopup from '@/components/AnexoPopup.vue'
import { useEnquetesStore } from '@/stores/enquetes'
import { useChatStore } from '@/stores/chat'
import { TipoConteudo } from '@/types/api'
import { classificarMensagem, TipoExibicaoMensagem } from '@/utils/classificarMensagem'
import { aguardar, erro, pedidosDe, rota, SocketFalso } from './apiFalsa'
import { conteudo, mensagem } from './fabrica'

const EU = 7

function enqueteApi(extras: Record<string, unknown> = {}) {
  return {
    id: 3, conversa_id: 5, mensagem_id: 90, pergunta: 'Almoço?', multipla: false, criado_por: 2,
    opcoes: [
      { id: 31, texto: 'Pizza', votantes: [{ id: 2, nome: 'Ana' }] },
      { id: 32, texto: 'Sushi', votantes: [] },
    ],
    total_votantes: 1, meus_votos: [],
    encerra_em: null, encerrada_em: null, encerrada: false, pode_encerrar: false, pode_alterar_prazo: false,
    ...extras,
  }
}

const mensagemEnquete = () => mensagem({ id: 90, conversa_id: 5, conteudos: [conteudo(TipoConteudo.Enquete, '3')] })

let tela: VueWrapper | undefined
beforeEach(() => {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu', login: 'eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  tela?.unmount()
  tela = undefined
  document.body.innerHTML = ''
})

describe('classificação', () => {
  test('mensagem com a enquete vai para a bolha de votação', () => {
    expect(classificarMensagem(mensagemEnquete())).toBe(TipoExibicaoMensagem.Enquete)
  })

  test('oculta continua oculta', () => {
    expect(classificarMensagem({ ...mensagemEnquete(), excluida_em: new Date() })).toBe(TipoExibicaoMensagem.Excluida)
  })
})

describe('votação oculta', () => {
  test('clicar na mensagem oculta mostra a pergunta e os votos', async () => {
    rota('GET', '/enquete', enqueteApi())
    tela = mount(BolhaExcluida, { props: { mensagem: { ...mensagemEnquete(), excluida_em: new Date() }, isOwn: false, isGroup: true, getAnexoUrl: () => '' }, attachTo: document.body })
    expect(tela.text()).not.toContain('Almoço?')
    await tela.trigger('click')
    await aguardar(10)
    expect(tela.text()).toContain('Almoço?')
    expect(tela.text()).toContain('Pizza')
  })
})

describe('store de votações', () => {
  test('carrega uma vez; o aviso do servidor relê só as que estão na tela', async () => {
    rota('GET', '/enquete', enqueteApi())
    const enquetes = useEnquetesStore()
    await Promise.all([enquetes.carregar(3), enquetes.carregar(3)])
    expect(pedidosDe('GET', '/enquete')).toHaveLength(1)
    rota('GET', '/enquete', enqueteApi({ total_votantes: 2 }))
    enquetes.aoAtualizar(3)
    enquetes.aoAtualizar(99)
    await aguardar()
    expect(enquetes.porId[3]!.total_votantes).toBe(2)
    expect(pedidosDe('GET', '/enquete').map((p) => p.consulta.id)).toEqual(['3', '3'])
  })

  test('o aviso pelo socket (tipo 62) chega à votação aberta', async () => {
    rota('GET', '/enquete', enqueteApi())
    rota('GET', '/usuario/contatos', [])
    rota('GET', '/conversas', [])
    rota('GET', '/contatos/online', [])
    rota('GET', '/atividades/novas', { quantidade: 0 })
    const chat = useChatStore()
    await chat.inicializar()
    const socket = SocketFalso.ultimo()
    socket.abrir()
    await useEnquetesStore().carregar(3)
    rota('GET', '/enquete', enqueteApi({ total_votantes: 5 }))
    socket.receber({ tipo: 62, enquete_id: 3, conversa_id: 5 })
    await aguardar()
    expect(useEnquetesStore().porId[3]!.total_votantes).toBe(5)
    chat.desconectarWebSocket()
  })
})

describe('bolha da votação', () => {
  async function abrir(enquete = enqueteApi()) {
    rota('GET', '/enquete', enquete)
    tela = mount(BolhaEnquete, { props: { mensagem: mensagemEnquete(), isOwn: false, isGroup: true, getAnexoUrl: () => '' }, attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const opcao = (texto: string) => tela!.findAll('button').find((b) => b.text().includes(texto))!

  test('mostra a pergunta, as opções, os votos e quem votou', async () => {
    await abrir()
    expect(tela!.text()).toContain('Almoço?')
    expect(tela!.text()).toContain('Escolha uma opção')
    expect(opcao('Pizza').text()).toContain('Ana')
    expect(tela!.text()).toContain('1 pessoa votou')
    expect(opcao('Pizza').find('[style]').attributes('style')).toContain('width: 100%')
  })

  test('escolha única: clicar vota; clicar em outra troca; clicar na mesma tira', async () => {
    await abrir()
    rota('POST', '/enquete/votar', (pedido: { corpo: { opcoes: number[] } }) => enqueteApi({ meus_votos: pedido.corpo.opcoes }))
    await opcao('Sushi').trigger('click')
    await aguardar()
    await opcao('Pizza').trigger('click')
    await aguardar()
    await opcao('Pizza').trigger('click')
    await aguardar()
    expect(pedidosDe('POST', '/enquete/votar').map((p) => p.corpo.opcoes)).toEqual([[32], [31], []])
  })

  test('múltipla: marca e desmarca somando às já marcadas', async () => {
    await abrir(enqueteApi({ multipla: true, meus_votos: [31] }))
    expect(tela!.text()).toContain('Escolha uma ou mais opções')
    rota('POST', '/enquete/votar', (pedido: { corpo: { opcoes: number[] } }) => enqueteApi({ multipla: true, meus_votos: pedido.corpo.opcoes }))
    await opcao('Sushi').trigger('click')
    await aguardar()
    expect(pedidosDe('POST', '/enquete/votar')[0]!.corpo).toEqual({ enquete_id: 3, opcoes: [31, 32] })
  })

  test('erro do servidor aparece na bolha', async () => {
    await abrir()
    rota('POST', '/enquete/votar', erro(403, 'Acesso negado!'))
    await opcao('Sushi').trigger('click')
    await aguardar()
    expect(tela!.text()).toContain('Acesso negado!')
  })
})

describe('prazo e encerramento', () => {
  async function abrir(enquete = enqueteApi()) {
    rota('GET', '/enquete', enquete)
    tela = mount(BolhaEnquete, { props: { mensagem: mensagemEnquete(), isOwn: false, isGroup: true, getAnexoUrl: () => '' }, attachTo: document.body })
    await aguardar(10)
    return tela
  }
  const botaoTexto = (texto: string) => tela!.findAll('button').find((b) => b.text() === texto)
  const opcao = (texto: string) => tela!.findAll('button').find((b) => b.text().includes(texto))!

  test('aberta com data final mostra quando encerra; sem permissão não há botões', async () => {
    const amanha = new Date(Date.now() + 26 * 3600 * 1000)
    await abrir(enqueteApi({ encerra_em: amanha.toISOString() }))
    expect(tela!.text()).toContain('· encerra')
    expect(botaoTexto('Encerrar votação')).toBeUndefined()
    expect(botaoTexto('Alterar data final')).toBeUndefined()
  })

  test('encerrada: mostra o aviso, destaca a mais votada e não vota', async () => {
    await abrir(enqueteApi({ encerrada: true, encerrada_em: new Date().toISOString() }))
    expect(tela!.text()).toContain('Votação encerrada')
    expect(opcao('Pizza').text()).toContain('🏆')
    expect(opcao('Sushi').text()).not.toContain('🏆')
    expect(opcao('Sushi').attributes('disabled')).toBeDefined()
    await opcao('Sushi').trigger('click')
    expect(pedidosDe('POST', '/enquete/votar')).toHaveLength(0)
  })

  test('o prazo que passa com a bolha aberta encerra na hora', async () => {
    await abrir(enqueteApi({ encerra_em: new Date(Date.now() + 80).toISOString() }))
    expect(tela!.text()).not.toContain('Votação encerrada')
    await aguardar(150)
    expect(tela!.text()).toContain('Votação encerrada')
  })

  test('encerrar pede confirmação e manda o pedido', async () => {
    await abrir(enqueteApi({ pode_encerrar: true }))
    rota('POST', '/enquete/encerrar', enqueteApi({ encerrada: true, encerrada_em: new Date().toISOString() }))
    await botaoTexto('Encerrar votação')!.trigger('click')
    await aguardar()
    const confirmar = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Encerrar') as HTMLElement
    confirmar.click()
    await aguardar(10)
    expect(pedidosDe('POST', '/enquete/encerrar')[0]!.corpo).toEqual({ enquete_id: 3 })
    expect(tela!.text()).toContain('Votação encerrada')
  })

  test('quem criou define e tira a data final', async () => {
    await abrir(enqueteApi({ pode_encerrar: true, pode_alterar_prazo: true }))
    rota('PATCH', '/enquete', (pedido: { corpo: { encerra_em: string | null } }) => enqueteApi({ pode_alterar_prazo: true, encerra_em: pedido.corpo.encerra_em }))
    await botaoTexto('Definir data final')!.trigger('click')
    expect(tela!.find('input[type="time"]').exists()).toBe(true)
    await botaoTexto('Salvar')!.trigger('click')
    await aguardar(10)
    const enviado = pedidosDe('PATCH', '/enquete')[0]!.corpo as { enquete_id: number; encerra_em: string }
    expect(enviado.enquete_id).toBe(3)
    expect(new Date(enviado.encerra_em).getTime()).toBeGreaterThan(Date.now())
    expect(botaoTexto('Alterar data final')).toBeDefined()
    await botaoTexto('Alterar data final')!.trigger('click')
    await botaoTexto('Tirar data')!.trigger('click')
    await aguardar(10)
    expect(pedidosDe('PATCH', '/enquete')[1]!.corpo).toEqual({ enquete_id: 3, encerra_em: null })
    expect(botaoTexto('Definir data final')).toBeDefined()
  })
})

describe('criar votação', () => {
  test('o "+" só oferece Votação em grupo', () => {
    tela = mount(AnexoPopup, { attachTo: document.body })
    expect(tela.text()).not.toContain('Votação')
    tela.unmount()
    tela = mount(AnexoPopup, { props: { comVotacao: true }, attachTo: document.body })
    expect(tela.text()).toContain('Votação')
  })

  test('precisa de pergunta e duas opções; cria e recarrega a conversa', async () => {
    rota('PUT', '/enquete', { id: 90, conversa_id: 5, usuario_id: EU, enquete_id: 3 })
    rota('GET', '/mensagens', [])
    rota('GET', '/conversas', [])
    useChatStore().conversaAtivaId = 5
    tela = mount(EnqueteModal, { attachTo: document.body })
    const criar = () => tela!.findAll('button').find((b) => b.text() === 'Criar votação')!
    const [pergunta, primeira, segunda] = tela.findAll('input[type="text"]')
    await pergunta!.setValue('Almoço?')
    await primeira!.setValue('Pizza')
    expect(criar().attributes('disabled')).toBeDefined()
    await segunda!.setValue('Sushi')
    await tela.find('button[type="button"].text-primary-600').trigger('click')
    await tela.find('input[type="checkbox"]').setValue(true)
    await tela.find('form').trigger('submit')
    await aguardar(10)
    // A terceira opção ficou vazia e não vai
    expect(pedidosDe('PUT', '/enquete')[0]!.corpo).toEqual({ conversa_id: 5, pergunta: 'Almoço?', opcoes: ['Pizza', 'Sushi'], multipla: true, encerra_em: null })
    expect(pedidosDe('GET', '/mensagens')).toHaveLength(1)
    expect(tela.emitted('criada')).toHaveLength(1)
  })

  test('com data final, ela vai junto; data no passado não deixa criar', async () => {
    rota('PUT', '/enquete', { id: 90, conversa_id: 5, usuario_id: EU, enquete_id: 3 })
    rota('GET', '/mensagens', [])
    rota('GET', '/conversas', [])
    useChatStore().conversaAtivaId = 5
    tela = mount(EnqueteModal, { attachTo: document.body })
    const criar = () => tela!.findAll('button').find((b) => b.text() === 'Criar votação')!
    const [pergunta, primeira, segunda] = tela.findAll('input[type="text"]')
    await pergunta!.setValue('Almoço?')
    await primeira!.setValue('Pizza')
    await segunda!.setValue('Sushi')
    const [, prazo] = tela.findAll('input[type="checkbox"]')
    await prazo!.setValue(true)
    // A sugestão (amanhã) vale; uma hora que já passou hoje, não
    expect(criar().attributes('disabled')).toBeUndefined()
    tela.findComponent({ name: 'CampoDataHora' }).vm.$emit('update:modelValue', new Date(Date.now() - 3600 * 1000))
    await aguardar()
    expect(tela.text()).toContain('A data final precisa estar no futuro')
    expect(criar().attributes('disabled')).toBeDefined()
    tela.findComponent({ name: 'CampoDataHora' }).vm.$emit('update:modelValue', new Date(Date.now() + 26 * 3600 * 1000))
    await aguardar()
    await tela.find('form').trigger('submit')
    await aguardar(10)
    const corpo = pedidosDe('PUT', '/enquete')[0]!.corpo as { encerra_em: string }
    expect(new Date(corpo.encerra_em).getTime()).toBeGreaterThan(Date.now() + 25 * 3600 * 1000)
  })

  test('recusa do servidor aparece no formulário', async () => {
    rota('PUT', '/enquete', erro(400, 'Votação só pode ser criada em grupos.'))
    useChatStore().conversaAtivaId = 5
    tela = mount(EnqueteModal, { attachTo: document.body })
    const [pergunta, primeira, segunda] = tela.findAll('input[type="text"]')
    await pergunta!.setValue('X?')
    await primeira!.setValue('A')
    await segunda!.setValue('B')
    await tela.find('form').trigger('submit')
    await aguardar(10)
    expect(tela.text()).toContain('Votação só pode ser criada em grupos.')
  })
})
