import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Rascunho } from '@/services/rascunhos'
import { TipoConversa } from '@/types/api'
import { aguardar } from './apiFalsa'
import { mensagem, texto } from './fabrica'

// IndexedDB de mentira, num Map. O mock do módulo vale para o processo todo:
// fora deste arquivo ele responde como um navegador sem IndexedDB.
const guardados = new Map<string, Rascunho>()
let ativo = false
const semBanco = () => Promise.reject(new Error('sem IndexedDB'))
mock.module('@/services/rascunhos', () => ({
  chaveRascunho: (usuarioId: number, conversaId: number) => `${usuarioId}:${conversaId}`,
  lerRascunho: async (chave: string) => (ativo ? guardados.get(chave) ?? null : semBanco()),
  salvarRascunho: async (chave: string, rascunho: Rascunho) => { if (!ativo) return semBanco(); guardados.set(chave, rascunho) },
  apagarRascunho: async (chave: string) => { if (!ativo) return semBanco(); guardados.delete(chave) },
}))

const { default: MessageInput } = await import('@/components/MessageInput.vue')
const { useChatStore } = await import('@/stores/chat')

let campo: VueWrapper | undefined
beforeEach(() => {
  ativo = true
  guardados.clear()
  localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Eu' }))
  setActivePinia(createPinia())
})
afterEach(() => {
  campo?.unmount()
  campo = undefined
  ativo = false
})

function montar() {
  const chat = useChatStore()
  chat.conversas = [1, 2].map((id) => ({ id, descricao: `Conversa ${id}`, tipo: TipoConversa.Grupo, inserida: new Date() }))
  chat.conversaAtivaId = 1
  campo = mount(MessageInput, { props: { chatNoFim: true }, attachTo: document.body })
  return chat
}
const editavel = () => campo!.find('[contenteditable="true"]').element as HTMLElement

// "Digitar": o texto entra no ponto do cursor, como o que se cola
function digitar(textoDigitado: string) {
  const el = editavel()
  el.focus()
  const evento = new Event('paste', { cancelable: true }) as ClipboardEvent
  Object.defineProperty(evento, 'clipboardData', { value: { files: [], getData: (tipo: string) => (tipo === 'text/plain' ? textoDigitado : '') } })
  el.dispatchEvent(evento)
}

// O documento salvo, em texto, para procurar o que foi escrito
const salvo = (chave: string) => JSON.stringify(guardados.get(chave)?.documento ?? null)

function colarImagem() {
  const el = editavel()
  el.focus()
  const evento = new Event('paste', { cancelable: true }) as ClipboardEvent
  Object.defineProperty(evento, 'clipboardData', { value: { files: [new File(['png'], 'tela.png', { type: 'image/png' })], getData: () => '' } })
  el.dispatchEvent(evento)
}

async function trocarPara(chat: ReturnType<typeof useChatStore>, conversaId: number) {
  chat.conversaAtivaId = conversaId
  await aguardar(10)
}

describe('rascunho por conversa', () => {
  test('o que se escreve fica salvo; trocar de conversa esvazia o campo e voltar o traz de volta', async () => {
    const chat = montar()
    await aguardar(10)
    digitar('meio escrito')
    await aguardar(700)
    expect(salvo('7:1')).toContain('meio escrito')

    await trocarPara(chat, 2)
    expect(editavel().textContent).toBe('')
    await trocarPara(chat, 1)
    expect(editavel().textContent).toBe('meio escrito')
    expect(campo!.find('button[title="Enviar"]').exists()).toBe(true)
  })

  test('troca rápida, antes de o rascunho ser gravado, não perde o que foi escrito', async () => {
    const chat = montar()
    await aguardar(10)
    digitar('rápido')
    await trocarPara(chat, 2)
    expect(salvo('7:1')).toContain('rápido')
    // O da conversa 2 não recebe o da 1
    expect(guardados.has('7:2')).toBe(false)
  })

  test('imagem do rascunho volta com o arquivo, e vai no envio', async () => {
    const chat = montar()
    const chamadas: unknown[][] = []
    chat.enviarMensagemComConteudos = (async (...args: unknown[]) => { chamadas.push(args) }) as never
    await aguardar(10)
    digitar('olha')
    colarImagem()
    await trocarPara(chat, 2)
    expect(guardados.get('7:1')!.anexos.map((a) => a.nomeArquivo)).toEqual(['tela.png'])
    await trocarPara(chat, 1)
    expect(editavel().querySelector('[data-anexo] img')).not.toBeNull()

    await campo!.find('button[title="Enviar"]').trigger('click')
    await aguardar(10)
    const blocos = chamadas[0]![4] as { texto?: string; arquivo?: { nomeArquivo: string; blob: Blob } }[]
    expect(blocos.map((b) => b.texto ?? b.arquivo!.nomeArquivo)).toEqual(['olha', 'tela.png'])
    // Enviada, o rascunho acaba
    expect(guardados.has('7:1')).toBe(false)
  })

  test('o "respondendo a..." fica com a conversa: sai ao trocar e volta junto', async () => {
    const chat = montar()
    await aguardar(10)
    chat.responderMensagem(mensagem({ id: 50, conversa_id: 1, remetente: 'Ana', conteudos: [texto('pergunta?')] }))
    await aguardar(700)
    expect(guardados.get('7:1')!.respondendo!.id).toBe(50)

    await trocarPara(chat, 2)
    expect(chat.mensagemRespondendo).toBeNull()
    await trocarPara(chat, 1)
    expect(chat.mensagemRespondendo!.id).toBe(50)
  })

  test('campo esvaziado apaga o rascunho; sem IndexedDB o campo funciona igual', async () => {
    const chat = montar()
    await aguardar(10)
    digitar('x')
    await aguardar(700)
    expect(guardados.has('7:1')).toBe(true)
    // Apagar letra a letra é do próprio navegador (o editor lê o que mudou na
    // página); aqui o texto some direto da página
    editavel().querySelector('p')!.textContent = ''
    editavel().dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }))
    await aguardar(700)
    expect(guardados.has('7:1')).toBe(false)

    ativo = false
    digitar('sem banco')
    await trocarPara(chat, 2)
    await trocarPara(chat, 1)
    expect(editavel().textContent).toBe('')
  })
})
