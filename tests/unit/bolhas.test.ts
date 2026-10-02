import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageBubble from '@/components/MessageBubble.vue'
import BolhaImagem from '@/components/BolhaImagem.vue'
import BolhaCodigo from '@/components/BolhaCodigo.vue'
import BolhaEmoji from '@/components/BolhaEmoji.vue'
import BolhaReferencia from '@/components/BolhaReferencia.vue'
import BolhaTextoCurto from '@/components/BolhaTextoCurto.vue'
import BolhaPadrao from '@/components/BolhaPadrao.vue'
import BolhaChamada from '@/components/BolhaChamada.vue'
import BolhaExcluida from '@/components/BolhaExcluida.vue'
import MensagemAcoes from '@/components/MensagemAcoes.vue'
import { TipoConteudo, TipoMensagemReferencia, type Mensagem } from '@/types/api'
import { comReferencia, conteudo, mensagem, texto } from './fabrica'

const montados: VueWrapper[] = []
function bolha(m: Mensagem, extras: { isOwn?: boolean; isGroup?: boolean } = {}) {
  const w = mount(MessageBubble, {
    props: { mensagem: m, isOwn: false, isGroup: false, mudouRemetente: false, getAnexoUrl: (id: string) => `https://localhost/storage/${id}`, ...extras },
    attachTo: document.body,
  })
  montados.push(w)
  return w
}

beforeEach(() => {
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => montados.splice(0).forEach((w) => w.unmount()))

describe('despachante de bolhas', () => {
  const casos: [string, Mensagem, object][] = [
    ['uma imagem', mensagem({ conteudos: [conteudo(TipoConteudo.Imagem, 'img-1', { nome: 'foto.png' })] }), BolhaImagem],
    ['só código', mensagem({ conteudos: [texto('```ts\nconst a = 1\n```')] }), BolhaCodigo],
    ['só emoji', mensagem({ conteudos: [texto('🎉🎉')] }), BolhaEmoji],
    ['resposta', mensagem({ conteudos: [texto('sim')], ...comReferencia([texto('vamos?')]) }), BolhaReferencia],
    ['texto curto', mensagem({ conteudos: [texto('oi')] }), BolhaTextoCurto],
    ['texto longo', mensagem({ conteudos: [texto('uma linha\noutra linha')] }), BolhaPadrao],
    ['chamada', mensagem({ conteudos: [conteudo(TipoConteudo.Chamada, JSON.stringify({ chamada_id: 1, tipo: 1, status: 4, duracao: 65, participantes: [] }))] }), BolhaChamada],
  ]

  test.each(casos)('%s usa a bolha certa, e só ela', (_nome, m, esperado) => {
    const tela = bolha(m)
    for (const [, , componente] of casos) {
      expect(tela.findComponent(componente as never).exists()).toBe(componente === esperado)
    }
  })

  test('cada mensagem fica num elemento com o id dela (a pesquisa rola até ele)', () => {
    expect(bolha(mensagem({ id: 42, conteudos: [texto('oi')] })).attributes('id')).toBe('msg-42')
  })
})

describe('conteúdo das bolhas', () => {
  test('texto curto em grupo mostra quem enviou; a própria mensagem, não', () => {
    const doOutro = bolha(mensagem({ remetente: 'Bruno', conteudos: [texto('oi')] }), { isGroup: true })
    expect(doOutro.text()).toContain('Bruno')
    const minha = bolha(mensagem({ remetente: 'Eu', conteudos: [texto('oi')] }), { isGroup: true, isOwn: true })
    expect(minha.text()).not.toContain('Eu')
  })

  test('links no texto viram links que abrem em outra aba', () => {
    const tela = bolha(mensagem({ conteudos: [texto('veja www.exemplo.com.br')] }))
    const link = tela.find('a[href="https://www.exemplo.com.br"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('target')).toBe('_blank')
  })

  test('resposta mostra quem e o que foi respondido', () => {
    const tela = bolha(mensagem({ conteudos: [texto('concordo')], ...comReferencia([texto('Vamos amanhã?')]) }))
    expect(tela.text()).toContain('Bruno')
    expect(tela.text()).toContain('Vamos amanhã?')
    expect(tela.text()).toContain('concordo')
  })

  test('encaminhada diz de quem veio', () => {
    const tela = bolha(mensagem({ conteudos: [texto('olha')], ...comReferencia([texto('original')], TipoMensagemReferencia.Encaminhada) }))
    expect(tela.text()).toContain('Encaminhado de Bruno')
  })

  test('código mostra o trecho e a linguagem', () => {
    const tela = bolha(mensagem({ conteudos: [texto('```sql\nselect 1\n```')] }))
    expect(tela.text()).toContain('select 1')
    expect(tela.text().toLowerCase()).toContain('sql')
  })

  test('chamada mostra o tipo e a duração', () => {
    const tela = bolha(mensagem({ conteudos: [conteudo(TipoConteudo.Chamada, JSON.stringify({ chamada_id: 1, tipo: 2, status: 4, duracao: 65, participantes: [] }))] }))
    expect(tela.text()).toMatch(/v[ií]deo/i)
    expect(tela.text()).toContain('01:05')
  })
})

describe('status, agendamento e reações', () => {
  test('minha mensagem enviando mostra o relógio; visualizada, os dois tiques em destaque', () => {
    const enviando = bolha(mensagem({ id: 5, enviando: true, conteudos: [texto('x')] }), { isOwn: true })
    expect(enviando.find('path[d^="M12 6v6h4.5"]').exists()).toBe(true)
    const vista = bolha(mensagem({ id: 6, visualizada: true, conteudos: [texto('x')] }), { isOwn: true })
    expect(vista.find('svg.text-primary-500').exists()).toBe(true)
  })

  test('mensagem de outra pessoa não mostra status', () => {
    expect(bolha(mensagem({ id: 5, conteudos: [texto('x')] })).find('svg.text-primary-500').exists()).toBe(false)
  })

  test('agendada para o futuro mostra o aviso só para o autor', () => {
    const futuro = new Date(Date.now() + 3600_000)
    expect(bolha(mensagem({ visivel_em: futuro, conteudos: [texto('x')] }), { isOwn: true }).text()).toContain('Agendada para')
    expect(bolha(mensagem({ visivel_em: new Date(Date.now() - 1000), conteudos: [texto('x')] }), { isOwn: true }).text()).not.toContain('Agendada para')
  })

  test('reações aparecem com a quantidade; clicar reage com o mesmo emoji', async () => {
    const tela = bolha(mensagem({ id: 9, conteudos: [texto('x')], reacoes: [{ emoji: '👍', quantidade: 2, reagiu: true, usuarios: [{ usuario_id: 2, nome: 'Bruno', reagido_em: new Date() }] }] }))
    const botao = tela.find('button.reacao-btn')
    expect(botao.text()).toBe('👍2')
    expect(botao.classes()).toContain('reacao-reagiu')
    expect(tela.text()).toContain('Bruno')
    await botao.trigger('click')
    expect(tela.emitted('reagir')).toEqual([[9, '👍']])
  })
})

describe('mensagem excluída', () => {
  const excluida = (extras: Partial<Mensagem> = {}) => mensagem({ id: 40, remetente: 'Bruno', excluida_em: new Date(), conteudos: [texto('conteúdo secreto')], ...extras })

  test('usa a bolha de excluída: sem o conteúdo, sem ações e sem reações', () => {
    const tela = bolha(excluida({ reacoes: [{ emoji: '👍', quantidade: 1, reagiu: false, usuarios: [] }] }))
    expect(tela.findComponent(BolhaExcluida).exists()).toBe(true)
    expect(tela.text()).toContain('Mensagem excluída')
    expect(tela.text()).not.toContain('conteúdo secreto')
    expect(tela.findComponent(MensagemAcoes).exists()).toBe(false)
    expect(tela.find('button.reacao-btn').exists()).toBe(false)
  })

  test('clique mostra o conteúdo e outro clique oculta; teclado também', async () => {
    const tela = bolha(excluida())
    const corpo = tela.findComponent(BolhaExcluida)
    expect(corpo.attributes('title')).toBe('Clique para ver o conteúdo')
    await corpo.trigger('click')
    expect(tela.text()).toContain('conteúdo secreto')
    expect(tela.text()).toContain('Mensagem excluída')
    expect(corpo.attributes('title')).toBe('Clique para ocultar o conteúdo')
    expect(corpo.attributes('aria-expanded')).toBe('true')
    await corpo.trigger('click')
    expect(tela.text()).not.toContain('conteúdo secreto')
    await corpo.trigger('keydown', { key: 'Enter' })
    expect(tela.text()).toContain('conteúdo secreto')
    await corpo.trigger('keydown', { key: ' ' })
    expect(tela.text()).not.toContain('conteúdo secreto')
  })

  test('com o conteúdo à mostra, clicar nos controles dele (ex.: baixar arquivo) não oculta', async () => {
    const tela = bolha(excluida({ conteudos: [conteudo(TipoConteudo.Arquivo, 'arq-1', { nome: 'contrato.xlsx' })] }))
    const corpo = tela.findComponent(BolhaExcluida)
    await corpo.trigger('click')
    const download = tela.findAll('button').find((b) => b.text() === 'Download')!
    await download.trigger('click')
    expect(tela.text()).toContain('contrato.xlsx')
    expect(tela.emitted('download')).toEqual([['arq-1', 'contrato.xlsx']])
  })

  test('em grupo mostra quem enviou; a minha continua com os tiques de entrega', () => {
    expect(bolha(excluida(), { isGroup: true }).text()).toContain('Bruno')
    const minha = bolha(excluida({ remetente: 'Eu', visualizada: true }), { isOwn: true })
    expect(minha.find('svg.text-primary-500').exists()).toBe(true)
  })

  test('a resposta a uma mensagem excluída não mostra o conteúdo citado', () => {
    const resposta = mensagem({ conteudos: [texto('concordo')], mensagem_referencia: { tipo: TipoMensagemReferencia.Resposta, mensagem: { id: 99, remetente: 'Bruno', excluida_em: new Date(), conteudos: [texto('o que foi dito')] } } })
    const tela = bolha(resposta)
    expect(tela.text()).toContain('Mensagem excluída')
    expect(tela.text()).not.toContain('o que foi dito')
    expect(tela.text()).toContain('concordo')
  })
})
