import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useAtividadesStore } from '@/stores/atividades'
import { TipoConteudo, TipoMensagemReferencia } from '@/types/api'
import { aguardar, erro, pedidos, pedidosDe, rota, SocketFalso } from './apiFalsa'
import { mensagem, texto } from './fabrica'
import { relogioFalso } from './relogioFalso'

const EU = 7

// Cópia sem os proxies reativos do Vue, que o toMatchObject do Bun não compara bem
const simples = (valor: unknown) => JSON.parse(JSON.stringify(valor))

// Conversa como a API devolve (datas em texto, convertidas pelo cliente)
function conversaApi(id: number, extras: Record<string, unknown> = {}) {
  return { id, descricao: `Conversa ${id}`, tipo: 1, inserida: '2026-09-01T12:00:00.000Z', mensagens_sem_visualizar: 0, fixada_ordem: null, arquivada_em: null, ...extras }
}

function mensagemApi(id: number, conteudo: string, extras: Record<string, unknown> = {}) {
  return {
    id, remetente_id: 2, remetente: 'Bruno', conversa_id: 1, inserida: new Date(Date.UTC(2026, 8, 1, 12, 0, id)).toISOString(),
    alterada: null, visivel_em: null, recebida: false, visualizada: false, reproduzida: false,
    conteudos: [{ ordem: 1, tipo: 1, conteudo }], ...extras,
  }
}

function novaStore() {
  localStorage.setItem('conversa.token', 'token')
  localStorage.setItem('conversa.user', JSON.stringify({ id: EU, nome: 'Eu', login: 'eu' }))
  setActivePinia(createPinia())
  return useChatStore()
}

beforeEach(() => localStorage.clear())

describe('conversas e mensagens', () => {
  test('selecionar conversa carrega as mensagens dela', async () => {
    rota('GET', '/conversas', [conversaApi(1)])
    rota('GET', '/mensagens', [mensagemApi(10, 'oi'), mensagemApi(11, 'tudo bem?')])
    const chat = novaStore()
    await chat.carregarConversas()
    await chat.selecionarConversa(1)
    expect(chat.conversaAtiva?.id).toBe(1)
    expect(chat.mensagensAtivas.map((m) => m.conteudos[0]!.conteudo)).toEqual(['oi', 'tudo bem?'])
    expect(chat.mensagensAtivas[0]!.inserida).toBeInstanceOf(Date)
    expect(pedidosDe('GET', '/mensagens')[0]!.consulta).toMatchObject({ conversa: '1', mensagensprevias: '80' })
  })

  test('recarregar preserva mensagens ainda sendo enviadas', async () => {
    rota('GET', '/mensagens', [mensagemApi(10, 'oi')])
    const chat = novaStore()
    chat.definirMensagens(1, [mensagem({ id: -5, enviando: true, conteudos: [texto('enviando')] })])
    await chat.recarregarMensagensRecentes(1)
    chat.conversaAtivaId = 1
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([10, -5])
  })

  test('carregar anteriores junta sem repetir e conta as novas', async () => {
    const chat = novaStore()
    chat.definirMensagens(1, [mensagem({ id: 20, inserida: new Date('2026-09-01T12:00:20Z') }), mensagem({ id: 21, inserida: new Date('2026-09-01T12:00:21Z') })])
    rota('GET', '/mensagens', [mensagemApi(18, 'a'), mensagemApi(19, 'b'), mensagemApi(20, 'repetida')])
    expect(await chat.carregarMensagensAnteriores(1)).toBe(2)
    chat.conversaAtivaId = 1
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([18, 19, 20, 21])
    expect(pedidos.at(-1)!.consulta).toMatchObject({ mensagemreferencia: '20', mensagensprevias: '60' })
    rota('GET', '/mensagens', [])
    expect(await chat.carregarMensagensAnteriores(1)).toBe(0)
  })

  test('carregar anteriores sem nada carregado faz a carga normal', async () => {
    rota('GET', '/mensagens', [mensagemApi(1, 'x')])
    const chat = novaStore()
    expect(await chat.carregarMensagensAnteriores(1)).toBe(0)
    chat.conversaAtivaId = 1
    expect(chat.mensagensAtivas).toHaveLength(1)
  })

  test('contexto de uma mensagem substitui a lista; se não vier, tenta janela maior', async () => {
    let vez = 0
    rota('GET', '/mensagens', () => (++vez === 1 ? [mensagemApi(50, 'perto')] : [mensagemApi(40, 'alvo'), mensagemApi(50, 'perto')]))
    const chat = novaStore()
    expect(await chat.carregarContextoMensagem(1, 40)).toBe(true)
    expect(pedidos.map((p) => p.consulta.mensagensprevias)).toEqual(['30', '120'])
    rota('GET', '/mensagens', [])
    expect(await chat.carregarContextoMensagem(1, 99)).toBe(false)
  })

  test('excluir marca a mensagem em qualquer conversa em memória e atualiza a prévia', async () => {
    rota('DELETE', '/mensagem', { id: 5, conversa_id: 1, excluida_em: '2026-10-02T10:00:00.000Z' })
    rota('GET', '/conversas', [])
    const chat = novaStore()
    chat.definirMensagens(1, [mensagem({ id: 5 }), mensagem({ id: 6 })])
    await chat.excluirMensagem(5)
    chat.conversaAtivaId = 1
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([5, 6])
    expect(chat.mensagensAtivas[0]!.excluida_em).toEqual(new Date('2026-10-02T10:00:00.000Z'))
    expect(pedidosDe('GET', '/conversas')).toHaveLength(1)
  })

  test('agendada que não saiu (resposta sem excluida_em) some de qualquer conversa em memória', async () => {
    rota('DELETE', '/mensagem', {})
    const chat = novaStore()
    chat.definirMensagens(1, [mensagem({ id: 5 }), mensagem({ id: 6 })])
    chat.definirMensagens(2, [mensagem({ id: 7 })])
    await chat.excluirMensagem(5)
    chat.conversaAtivaId = 1
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([6])
    expect(pedidos[0]!.consulta).toEqual({ id: '5' })
  })
})

describe('enviar', () => {
  test('mostra a mensagem na hora e troca pelo id do servidor', async () => {
    let liberar!: () => void
    rota('PUT', '/mensagem', () => new Promise((resolver) => (liberar = () => resolver({ id: 99 }))))
    rota('GET', '/conversas', [conversaApi(1)])
    const chat = novaStore()
    chat.conversaAtivaId = 1
    const envio = chat.enviarTexto('  olá  ')
    await aguardar()
    expect(chat.mensagensAtivas).toHaveLength(1)
    expect(simples(chat.mensagensAtivas[0])).toMatchObject({ enviando: true, remetente_id: EU, conteudos: [{ conteudo: 'olá' }] })
    expect(chat.mensagensAtivas[0]!.id).toBeLessThan(0)
    liberar()
    await envio
    expect(simples(chat.mensagensAtivas[0])).toMatchObject({ id: 99, enviando: false })
    expect(pedidos.find((p) => p.metodo === 'PUT')!.corpo).toEqual({ conversa_id: 1, conteudos: [{ ordem: 1, tipo: 1, conteudo: 'olá' }] })
  })

  test('pedido de confirmação vai só na próxima mensagem; trocar de conversa desfaz', async () => {
    rota('PUT', '/mensagem', { id: 97 })
    rota('GET', '/conversas', [conversaApi(1)])
    const chat = novaStore()
    chat.conversaAtivaId = 1
    chat.pedirConfirmacao = true
    await chat.enviarTexto('leiam')
    expect(pedidos.filter((p) => p.metodo === 'PUT')[0]!.corpo).toEqual({ conversa_id: 1, conteudos: [{ ordem: 1, tipo: 1, conteudo: 'leiam' }], pede_confirmacao: true })
    expect(simples(chat.mensagensAtivas[0]!.confirmacao)).toEqual({ total: 0, confirmou: false, usuarios: [] })
    expect(chat.pedirConfirmacao).toBe(false)
    await chat.enviarTexto('outra')
    expect(pedidos.filter((p) => p.metodo === 'PUT')[1]!.corpo).not.toHaveProperty('pede_confirmacao')

    chat.pedirConfirmacao = true
    chat.conversaAtivaId = 2
    await aguardar()
    expect(chat.pedirConfirmacao).toBe(false)
  })

  test('confirmar a leitura marca a mensagem com quem confirmou', async () => {
    rota('POST', '/mensagem/confirmar', { mensagem_id: 30 })
    const chat = novaStore()
    chat.definirMensagens(1, [mensagem({ id: 30, confirmacao: { total: 2, confirmou: false, usuarios: [] } })])
    chat.conversaAtivaId = 1
    await chat.confirmarLeitura(chat.mensagensAtivas[0]!)
    expect(pedidos.find((p) => p.metodo === 'POST')!.corpo).toEqual({ mensagem_id: 30 })
    expect(simples(chat.mensagensAtivas[0]!.confirmacao)).toMatchObject({ confirmou: true, usuarios: [{ usuario_id: EU, nome: 'Eu' }] })
  })

  test('figurinha vai sozinha, com o identificador, e aparece na hora', async () => {
    rota('PUT', '/mensagem', { id: 98 })
    rota('GET', '/conversas', [conversaApi(1)])
    const chat = novaStore()
    chat.conversaAtivaId = 1
    const envio = chat.enviarFigurinha('basico/festa')
    expect(simples(chat.mensagensAtivas[0])).toMatchObject({ enviando: true, conteudos: [{ tipo: 7, conteudo: 'basico/festa' }] })
    await envio
    expect(pedidos.find((p) => p.metodo === 'PUT')!.corpo).toEqual({ conversa_id: 1, conteudos: [{ ordem: 1, tipo: 7, conteudo: 'basico/festa' }] })
    expect(simples(chat.mensagensAtivas[0])).toMatchObject({ id: 98, enviando: false, conteudos: [{ tipo: 7, conteudo: 'basico/festa' }] })
  })

  test('falha no envio tira a mensagem otimista e repassa o erro', async () => {
    rota('PUT', '/mensagem', erro(403, 'Acesso negado!'))
    const chat = novaStore()
    chat.conversaAtivaId = 1
    await expect(chat.enviarTexto('oi')).rejects.toThrow('Acesso negado!')
    expect(chat.mensagensAtivas).toEqual([])
  })

  test('texto vazio não envia; sem conversa ativa é erro', async () => {
    const chat = novaStore()
    await expect(chat.enviarTexto('x')).rejects.toThrow('Nenhuma conversa ativa')
    chat.conversaAtivaId = 1
    await chat.enviarTexto('   ')
    expect(pedidos).toHaveLength(0)
  })

  test('resposta leva a referência e limpa a resposta pendente', async () => {
    rota('PUT', '/mensagem', { id: 100 })
    rota('GET', '/conversas', [])
    const chat = novaStore()
    chat.conversaAtivaId = 1
    chat.responderMensagem(mensagem({ id: 50, conteudos: [texto('pergunta')] }))
    await chat.enviarTexto('resposta')
    expect(pedidosDe('PUT', '/mensagem')[0]!.corpo.mensagem_referencia).toEqual({ tipo: 1, origem_mensagem_id: 50 })
    expect(chat.mensagensAtivas[0]!.mensagem_referencia?.mensagem?.id).toBe(50)
    expect(chat.mensagemRespondendo).toBeNull()
  })

  test('agendada manda visivel_em', async () => {
    rota('PUT', '/mensagem', { id: 1 })
    rota('GET', '/conversas', [])
    const chat = novaStore()
    chat.conversaAtivaId = 1
    await chat.enviarTexto('depois', new Date('2027-01-01T10:00:00Z'))
    expect(pedidosDe('PUT', '/mensagem')[0]!.corpo.visivel_em).toBe('2027-01-01T10:00:00.000Z')
  })

  test('arquivo: envia ao armazenamento e manda o identificador', async () => {
    rota('GET', '/anexo/existe', { existe: false })
    rota('PUT', '/anexo', { id: 3, upload_url: 'https://localhost/storage/upload', existe: false })
    rota('PUT', '/mensagem', { id: 101 })
    rota('GET', '/conversas', [])
    // O upload vai por XMLHttpRequest para mostrar o progresso
    const enviados: string[] = []
    class XhrFalso {
      status = 200
      upload = { onprogress: null as ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      open(_metodo: string, url: string) { enviados.push(url) }
      send() {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 5 })
        this.onload?.()
      }
    }
    const original = globalThis.XMLHttpRequest
    globalThis.XMLHttpRequest = XhrFalso as never
    try {
      const chat = novaStore()
      chat.conversaAtivaId = 1
      await chat.enviarArquivo(new Blob(['conteudo']), 'nota.txt', 'text/plain')
      const [conteudo] = pedidosDe('PUT', '/mensagem')[0]!.corpo.conteudos
      expect(conteudo).toMatchObject({ ordem: 1, tipo: TipoConteudo.Arquivo })
      expect(conteudo.conteudo).toMatch(/^[0-9a-f]{64}$/)
      expect(enviados).toEqual(['https://localhost/storage/upload'])
      expect(simples(chat.mensagensAtivas[0])).toMatchObject({ id: 101, conteudos: [{ nome: 'nota.txt', extensao: 'txt' }] })
    } finally {
      globalThis.XMLHttpRequest = original
    }
  })

  test('editor avançado: texto e imagens vão na ordem dos blocos', async () => {
    rota('GET', '/anexo/existe', { existe: false })
    rota('PUT', '/anexo', { id: 3, upload_url: 'https://localhost/storage/upload', existe: false })
    rota('PUT', '/mensagem', { id: 102 })
    rota('GET', '/conversas', [])
    class XhrFalso {
      status = 200
      upload = { onprogress: null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      open() {}
      send() { this.onload?.() }
    }
    const original = globalThis.XMLHttpRequest
    globalThis.XMLHttpRequest = XhrFalso as never
    try {
      const chat = novaStore()
      chat.conversaAtivaId = 1
      await chat.enviarBlocos([
        { texto: 'Olha o erro:' },
        { arquivo: { blob: new Blob(['png'], { type: 'image/png' }), nomeArquivo: 'imagem-1.png', mimeType: 'image/png' } },
        { texto: 'e depois disso' },
      ])
      const conteudos = (pedidosDe('PUT', '/mensagem')[0]!.corpo.conteudos as { ordem: number; tipo: number; conteudo: string }[])
        .slice().sort((a, b) => a.ordem - b.ordem)
      expect(conteudos.map((c) => [c.ordem, c.tipo])).toEqual([[1, TipoConteudo.Texto], [2, TipoConteudo.Imagem], [3, TipoConteudo.Texto]])
      expect(conteudos[0]!.conteudo).toBe('Olha o erro:')
      expect(conteudos[2]!.conteudo).toBe('e depois disso')
      expect(simples(chat.mensagensAtivas[0])!.conteudos.map((c: { tipo: number }) => c.tipo)).toEqual([TipoConteudo.Texto, TipoConteudo.Imagem, TipoConteudo.Texto])
    } finally {
      globalThis.XMLHttpRequest = original
    }
  })

  test('responder no privado abre a conversa direta e envia como encaminhada, com os conteúdos antes do texto', async () => {
    rota('GET', '/conversas', [conversaApi(8, { destinatario_id: 2 })])
    rota('GET', '/mensagens', [])
    rota('PUT', '/mensagem', { id: 102 })
    const chat = novaStore()
    await chat.carregarConversas()
    const doGrupo = mensagem({ id: 60, remetente_id: 2, remetente: 'Bruno', conversa_id: 3, conteudos: [texto('no grupo')] })
    await chat.responderNoPrivado(doGrupo)
    expect(chat.conversaAtivaId).toBe(8)
    expect(chat.tipoReferenciaPendente).toBe(TipoMensagemReferencia.Encaminhada)
    await chat.enviarTexto('sobre isso')
    expect(pedidosDe('PUT', '/mensagem')[0]!.corpo).toMatchObject({
      conversa_id: 8,
      conteudos: [{ ordem: 1, tipo: 1, conteudo: 'no grupo' }, { ordem: 2, tipo: 1, conteudo: 'sobre isso' }],
      mensagem_referencia: { tipo: 2, origem_mensagem_id: 60 },
    })
    chat.responderMensagem(doGrupo)
    chat.cancelarResposta()
    expect(chat.mensagemRespondendo).toBeNull()
    expect(chat.tipoReferenciaPendente).toBe(TipoMensagemReferencia.Resposta)
  })
})

describe('conversa direta, grupo e encaminhar', () => {
  test('conversa direta existente é reaproveitada', async () => {
    rota('GET', '/conversas', [conversaApi(4, { destinatario_id: 2 })])
    rota('GET', '/mensagens', [])
    const chat = novaStore()
    await chat.carregarConversas()
    await chat.iniciarConversaDireta({ id: 2, nome: 'Bruno' } as never)
    expect(chat.conversaAtivaId).toBe(4)
    expect(pedidosDe('PUT', '/conversa')).toHaveLength(0)
  })

  test('sem conversa direta, cria com os dois membros', async () => {
    let criada = false
    rota('GET', '/conversas', () => (criada ? [conversaApi(9, { destinatario_id: 2 })] : []))
    rota('PUT', '/conversa', () => ((criada = true), { id: 9, tipo: 1 }))
    rota('PUT', '/conversa/usuario', {})
    rota('GET', '/mensagens', [])
    const chat = novaStore()
    await chat.iniciarConversaDireta({ id: 2, nome: 'Bruno' } as never)
    expect(pedidosDe('PUT', '/conversa/usuario').map((p) => p.corpo)).toEqual([
      { conversa_id: 9, usuario_id: EU },
      { conversa_id: 9, usuario_id: 2 },
    ])
    expect(chat.conversaAtivaId).toBe(9)
  })

  test('grupo inclui quem cria uma vez só e abre a conversa', async () => {
    rota('PUT', '/conversa', { id: 12, tipo: 2 })
    rota('PUT', '/conversa/usuario', {})
    rota('GET', '/conversas', [conversaApi(12, { tipo: 2 })])
    rota('GET', '/mensagens', [])
    const chat = novaStore()
    await chat.criarGrupo('Time', [2, EU, 3])
    expect(pedidosDe('PUT', '/conversa')[0]!.corpo).toEqual({ descricao: 'Time', tipo: 2 })
    expect(pedidosDe('PUT', '/conversa/usuario').map((p) => p.corpo.usuario_id).sort()).toEqual([2, 3, EU])
    expect(chat.conversaAtivaId).toBe(12)
  })

  test('encaminhar copia os conteúdos em ordem, com a referência', async () => {
    rota('PUT', '/mensagem', { id: 200 })
    rota('GET', '/conversas', [])
    rota('GET', '/mensagens', [])
    const chat = novaStore()
    const origem = mensagem({ id: 70, conteudos: [{ ...texto('b'), ordem: 5 }, { ...texto('a'), ordem: 2 }] })
    await chat.encaminharMensagemParaConversa(origem, 3)
    expect(pedidosDe('PUT', '/mensagem')[0]!.corpo).toEqual({
      conversa_id: 3,
      conteudos: [{ ordem: 1, tipo: 1, conteudo: 'a' }, { ordem: 2, tipo: 1, conteudo: 'b' }],
      mensagem_referencia: { tipo: 2, origem_mensagem_id: 70 },
    })
    expect(chat.conversaAtivaId).toBe(3)
  })

  test('renomear grupo e gerenciar membros', async () => {
    rota('PATCH', '/conversa', {})
    rota('GET', '/conversas', [])
    rota('PUT', '/conversa/usuario', {})
    rota('DELETE', '/conversa/usuario', {})
    rota('GET', '/conversa/usuarios', [{ id: 1, usuario_id: 2, nome: 'Bruno' }])
    const chat = novaStore()
    await chat.renomearGrupo(5, 'Novo nome')
    await chat.adicionarMembroGrupo(5, 2)
    await chat.removerMembroGrupo(5, 1)
    expect(pedidosDe('PATCH', '/conversa')[0]!.corpo).toEqual({ id: 5, descricao: 'Novo nome' })
    expect(pedidosDe('GET', '/conversa/usuarios')).toHaveLength(2)
    chat.conversaAtivaId = 5
    expect(chat.usuariosConversaAtiva).toEqual([{ id: 1, usuario_id: 2, nome: 'Bruno' }])
  })

  test('sem usuário logado, criar conversa é erro', async () => {
    setActivePinia(createPinia())
    const chat = useChatStore()
    await expect(chat.criarGrupo('x', [])).rejects.toThrow('Usuário não autenticado')
    await expect(chat.iniciarConversaDireta({ id: 2, nome: 'B' } as never)).rejects.toThrow('Usuário não autenticado')
  })
})

describe('fixar e arquivar', () => {
  test('fixar entra no fim; desafixar sai', async () => {
    rota('GET', '/conversas', [conversaApi(1, { fixada_ordem: 1 }), conversaApi(2), conversaApi(3)])
    rota('PATCH', '/conversa/fixadas', {})
    const chat = novaStore()
    await chat.carregarConversas()
    await chat.fixarConversa(3, true)
    expect(pedidos.at(-1)!.corpo).toEqual({ conversas: [1, 3] })
    expect(chat.conversasFixadas.map((c) => c.id)).toEqual([1, 3])
    await chat.fixarConversa(1, false)
    expect(chat.conversasFixadas.map((c) => c.id)).toEqual([3])
  })

  test('mover fixada antes ou depois de outra; sem mudança não chama a API', async () => {
    rota('GET', '/conversas', [conversaApi(1, { fixada_ordem: 1 }), conversaApi(2, { fixada_ordem: 2 }), conversaApi(3, { fixada_ordem: 3 })])
    rota('PATCH', '/conversa/fixadas', {})
    const chat = novaStore()
    await chat.carregarConversas()
    await chat.moverFixada(3, 1, false)
    expect(chat.conversasFixadas.map((c) => c.id)).toEqual([3, 1, 2])
    await chat.moverFixada(3, 1, false)
    await chat.moverFixada(3, 99, true)
    expect(pedidosDe('PATCH', '/conversa/fixadas')).toHaveLength(1)
  })

  test('erro ao salvar fixadas recarrega a lista do servidor', async () => {
    rota('GET', '/conversas', [conversaApi(1)])
    rota('PATCH', '/conversa/fixadas', erro(500, 'falhou'))
    const chat = novaStore()
    await chat.carregarConversas()
    await expect(chat.fixarConversa(1, true)).rejects.toThrow('falhou')
    expect(chat.conversas[0]!.fixada_ordem).toBeNull()
  })

  test('arquivar tira das fixadas; erro volta ao estado do servidor', async () => {
    rota('GET', '/conversas', [conversaApi(1, { fixada_ordem: 1 })])
    rota('PATCH', '/conversa/arquivada', {})
    const chat = novaStore()
    await chat.carregarConversas()
    await chat.arquivarConversa(1, true)
    expect(chat.conversaArquivada(1)).toBe(true)
    expect(chat.conversasFixadas).toEqual([])
    expect(pedidos.at(-1)!.corpo).toEqual({ conversa: 1, arquivada: true })
    rota('PATCH', '/conversa/arquivada', erro(403, 'negado'))
    await expect(chat.arquivarConversa(1, false)).rejects.toThrow('negado')
    expect(chat.conversas[0]!.fixada_ordem).toBe(1)
  })
})

describe('visualização', () => {
  test('marca só as de outros, ainda não vistas, e desconta do contador', async () => {
    rota('GET', '/conversas', [conversaApi(1, { mensagens_sem_visualizar: 3 })])
    rota('POST', '/mensagem/visualizar', { sucesso: true })
    const chat = novaStore()
    await chat.carregarConversas()
    chat.definirMensagens(1, [
      mensagem({ id: 1, remetente_id: 2 }),
      mensagem({ id: 2, remetente_id: EU }),
      mensagem({ id: 3, remetente_id: 2, visualizada: true }),
      mensagem({ id: -4, remetente_id: 2 }),
    ])
    expect(await chat.marcarMensagensComoVisualizadas(1, [1, 2, 3, -4])).toBe(true)
    expect(pedidosDe('POST', '/mensagem/visualizar').map((p) => p.corpo)).toEqual([{ conversa: 1, mensagem: 1 }])
    expect(chat.conversas[0]!.mensagens_sem_visualizar).toBe(2)
    expect(await chat.marcarMensagensComoVisualizadas(1, [])).toBe(false)
  })

  test('falha ao marcar não desconta', async () => {
    rota('GET', '/conversas', [conversaApi(1, { mensagens_sem_visualizar: 1 })])
    rota('POST', '/mensagem/visualizar', erro(500, 'x'))
    const chat = novaStore()
    await chat.carregarConversas()
    chat.definirMensagens(1, [mensagem({ id: 1, remetente_id: 2 })])
    expect(await chat.marcarMensagensComoVisualizadas(1, [1])).toBe(false)
    expect(chat.conversas[0]!.mensagens_sem_visualizar).toBe(1)
  })
})

describe('pesquisa', () => {
  test('na conversa ativa, filtrando por ela', async () => {
    rota('GET', '/pesquisar', [mensagemApi(1, 'a', { conversa_id: 1 }), mensagemApi(2, 'b', { conversa_id: 2 })])
    const chat = novaStore()
    await chat.buscarNaConversa('a')
    expect(pedidos).toHaveLength(0)
    chat.conversaAtivaId = 1
    await chat.buscarNaConversa('  a  ')
    expect(chat.resultadosBuscaConversa.map((m) => m.id)).toEqual([1])
    await chat.buscarNaConversa(' ')
    expect(chat.resultadosBuscaConversa).toEqual([])
  })

  test('em todos os chats, com indicador de carregamento', async () => {
    rota('GET', '/pesquisar', [mensagemApi(1, 'a'), mensagemApi(2, 'b', { conversa_id: 2 })])
    const chat = novaStore()
    const busca = chat.buscarEmTodosChats('a')
    expect(chat.buscandoGlobal).toBe(true)
    await busca
    expect(chat.buscandoGlobal).toBe(false)
    expect(chat.resultadosBuscaGlobal).toHaveLength(2)
    await chat.buscarEmTodosChats('')
    expect(chat.resultadosBuscaGlobal).toEqual([])
  })
})

describe('tempo real (WebSocket)', () => {
  let relogio: ReturnType<typeof relogioFalso>
  beforeEach(() => (relogio = relogioFalso()))
  afterEach(() => relogio.restaurar())

  async function conectado() {
    rota('GET', '/usuario/contatos', [{ id: 2, nome: 'Bruno' }])
    rota('GET', '/conversas', [conversaApi(1, { destinatario_id: 2 })])
    rota('GET', '/contatos/presenca', [{ usuario_id: 2, estado: 'ativo', visto_em: null }])
    rota('GET', '/conversa/presentes', [])
    const chat = novaStore()
    await chat.inicializar()
    const socket = SocketFalso.ultimo()
    socket.abrir()
    await aguardar()
    return { chat, socket }
  }

  test('conecta, faz login pelo socket e carrega quem está online', async () => {
    const { chat, socket } = await conectado()
    expect(socket.url).toBe('wss://localhost/ws/')
    expect(socket.enviados).toEqual([{ tipo: 1, token: 'token' }, { tipo: 63, ativo: true, conversa_id: null }])
    expect(chat.conectadoTempoReal).toBe(true)
    expect(chat.estaOnline(2)).toBe(true)
  })

  test('avisa a presença da aba: conversa aberta, aba escondida e 5 minutos parado', async () => {
    const { chat, socket } = await conectado()
    rota('GET', '/conversa/presentes', [2])
    chat.conversaAtivaId = 1
    await aguardar()
    expect(socket.enviados.at(-1)).toEqual({ tipo: 63, ativo: true, conversa_id: 1 })
    expect(pedidosDe('GET', '/conversa/presentes').at(-1)!.consulta).toEqual({ conversa: '1' })
    expect(chat.estaNaConversa(2, 1)).toBe(true)

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(socket.enviados.at(-1)).toEqual({ tipo: 63, ativo: false, conversa_id: null })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(socket.enviados.at(-1)).toEqual({ tipo: 63, ativo: true, conversa_id: 1 })

    const quantos = socket.enviados.length
    relogio.avancar(5 * 60 * 1000)
    expect(socket.enviados.at(-1)).toEqual({ tipo: 63, ativo: false, conversa_id: null })
    window.dispatchEvent(new Event('keydown'))
    expect(socket.enviados.at(-1)).toEqual({ tipo: 63, ativo: true, conversa_id: 1 })
    expect(socket.enviados).toHaveLength(quantos + 2)
  })

  test('estado, visto por último e quem está na conversa pelos eventos', async () => {
    const { chat, socket } = await conectado()
    socket.receber({ tipo: 60, usuario_id: 2, online: true, estado: 'ausente', visto_em: '2026-10-09T12:00:00.000Z' })
    expect(chat.presencaDe(2)).toEqual({ estado: 'ausente', visto_em: new Date('2026-10-09T12:00:00.000Z') })
    socket.receber({ tipo: 60, usuario_id: 2, online: false, estado: 'offline', visto_em: null })
    expect(chat.presencaDe(2)).toEqual({ estado: 'offline', visto_em: new Date('2026-10-09T12:00:00.000Z') })
    socket.receber({ tipo: 63, conversa_id: 1, usuario_id: 2, aberta: true })
    expect(chat.estaNaConversa(2, 1)).toBe(true)
    socket.receber({ tipo: 63, conversa_id: 1, usuario_id: 2, aberta: false })
    expect(chat.estaNaConversa(2, 1)).toBe(false)
  })

  test('aviso de atividade nova atualiza o contador; ao conectar também lê', async () => {
    rota('GET', '/atividades/novas', { quantidade: 1 })
    const { socket } = await conectado()
    const atividades = useAtividadesStore()
    expect(atividades.novas).toBe(1)
    rota('GET', '/atividades/novas', { quantidade: 3 })
    socket.receber({ tipo: 61 })
    await aguardar()
    expect(atividades.novas).toBe(3)
  })

  test('online e offline pelos eventos', async () => {
    const { chat, socket } = await conectado()
    socket.receber({ tipo: 60, usuario_id: 5, online: true })
    expect(chat.estaOnline(5)).toBe(true)
    socket.receber({ tipo: 60, usuario_id: 5, online: false })
    expect(chat.estaOnline(5)).toBe(false)
  })

  test('ao reconectar, recarrega quem está online (quem saiu durante a queda não fica "online")', async () => {
    const { chat, socket } = await conectado()
    socket.cair()
    expect(chat.conectadoTempoReal).toBe(false)
    rota('GET', '/contatos/presenca', [{ usuario_id: 2, estado: 'offline', visto_em: null }])
    relogio.avancar(1000)
    SocketFalso.ultimo().abrir()
    await aguardar()
    expect(chat.estaOnline(2)).toBe(false)
  })

  test('a espera para reconectar dobra a cada queda, até 30 segundos', async () => {
    const { socket } = await conectado()
    socket.cair()
    relogio.avancar(999)
    expect(SocketFalso.instancias).toHaveLength(1)
    relogio.avancar(1)
    expect(SocketFalso.instancias).toHaveLength(2)
    SocketFalso.ultimo().cair()
    relogio.avancar(1999)
    expect(SocketFalso.instancias).toHaveLength(2)
    relogio.avancar(1)
    expect(SocketFalso.instancias).toHaveLength(3)
  })

  test('digitando some depois de 4 segundos sem novo aviso', async () => {
    const { chat, socket } = await conectado()
    chat.conversaAtivaId = 1
    socket.receber({ tipo: 4, conversa_id: 1, usuario_id: 2 })
    socket.receber({ tipo: 4, conversa_id: 1, usuario_id: EU })
    expect(chat.digitandoNaConversaAtiva).toEqual(['Bruno'])
    relogio.avancar(3000)
    socket.receber({ tipo: 4, conversa_id: 1, usuario_id: 2 })
    relogio.avancar(3999)
    expect(chat.digitandoNaConversaAtiva).toEqual(['Bruno'])
    relogio.avancar(1)
    expect(chat.digitandoNaConversaAtiva).toEqual([])
  })

  test('gravando, com nome de quem não é contato', async () => {
    const { chat, socket } = await conectado()
    chat.conversaAtivaId = 1
    socket.receber({ tipo: 5, conversa_id: 1, usuario_id: 42 })
    expect(chat.gravandoNaConversaAtiva).toEqual(['Usuário #42'])
    relogio.avancar(4000)
    expect(chat.gravandoNaConversaAtiva).toEqual([])
  })

  test('reação de outra pessoa entra e sai da mensagem', async () => {
    const { chat, socket } = await conectado()
    chat.definirMensagens(1, [mensagem({ id: 30 })])
    chat.conversaAtivaId = 1
    socket.receber({ tipo: 7, conversa_id: 1, mensagem_id: 30, usuario_id: 2, emoji: '👍', acao: 'add' })
    expect(simples(chat.mensagensAtivas[0]!.reacoes)).toMatchObject([{ emoji: '👍', quantidade: 1, reagiu: false, usuarios: [{ nome: 'Bruno' }] }])
    socket.receber({ tipo: 7, conversa_id: 1, mensagem_id: 30, usuario_id: 2, emoji: '👍', acao: 'remove' })
    expect(chat.mensagensAtivas[0]!.reacoes).toEqual([])
  })

  test('confirmação de leitura de outra pessoa entra na mensagem uma vez', async () => {
    const { chat, socket } = await conectado()
    chat.definirMensagens(1, [mensagem({ id: 30, confirmacao: { total: 2, confirmou: false, usuarios: [] } })])
    chat.conversaAtivaId = 1
    const evento = { tipo: 8, conversa_id: 1, mensagem_id: 30, usuario_id: 2, nome: 'Bruno Silva', confirmada_em: '2026-10-09T12:00:00.000Z' }
    socket.receber(evento)
    socket.receber(evento)
    expect(simples(chat.mensagensAtivas[0]!.confirmacao)).toMatchObject({ confirmou: false, usuarios: [{ usuario_id: 2, nome: 'Bruno Silva' }] })
    expect(chat.mensagensAtivas[0]!.confirmacao!.usuarios).toHaveLength(1)
  })

  test('status de mensagens atualiza as que estão na tela', async () => {
    const { chat, socket } = await conectado()
    chat.definirMensagens(1, [mensagem({ id: 30, remetente_id: EU })])
    chat.conversaAtivaId = 1
    rota('GET', '/mensagem/status', [{ conversa_id: 1, mensagem_id: 30, recebida: true, visualizada: true, reproduzida: false, excluida_em: null }])
    socket.receber({ tipo: 3, grupo: 1, mensagens: '30' })
    await aguardar()
    expect(simples(chat.mensagensAtivas[0])).toMatchObject({ recebida: true, visualizada: true })
  })

  test('exclusão feita pelo autor chega como status: a mensagem passa a excluída', async () => {
    const { chat, socket } = await conectado()
    chat.definirMensagens(1, [mensagem({ id: 31, remetente_id: 2 })])
    chat.conversaAtivaId = 1
    rota('GET', '/mensagem/status', [{ conversa_id: 1, mensagem_id: 31, recebida: true, visualizada: false, reproduzida: false, excluida_em: '2026-10-02T09:00:00.000Z' }])
    socket.receber({ tipo: 3, grupo: 1, mensagens: '31' })
    await aguardar()
    expect(chat.mensagensAtivas[0]!.excluida_em).toEqual(new Date('2026-10-02T09:00:00.000Z'))
  })

  test('evento de chamada vai para quem a tela registrou', async () => {
    const { chat, socket } = await conectado()
    const recebidos: unknown[] = []
    chat.registrarHandlerChamada((evento) => recebidos.push(evento))
    socket.receber({ tipo: 51, chamada_id: 3, usuario_id: 2 })
    chat.removerHandlerChamada()
    socket.receber({ tipo: 52, chamada_id: 3, usuario_id: 2 })
    expect(recebidos).toEqual([{ tipo: 51, chamada_id: 3, usuario_id: 2 }])
  })

  test('evento inválido é ignorado; conversa atualizada recarrega a lista', async () => {
    const { socket } = await conectado()
    socket.onmessage?.({ data: 'não é json' })
    socket.receber({ semTipo: true })
    const antes = pedidosDe('GET', '/conversas').length
    socket.receber({ tipo: 40 })
    await aguardar()
    expect(pedidosDe('GET', '/conversas').length).toBe(antes + 1)
  })

  test('encerrar desconecta e não reconecta', async () => {
    const { chat, socket } = await conectado()
    chat.encerrarTempoReal()
    expect(socket.readyState).toBe(SocketFalso.CLOSED)
    relogio.avancar(60_000)
    expect(SocketFalso.instancias).toHaveLength(1)
  })

  test('sem token não conecta', () => {
    setActivePinia(createPinia())
    useChatStore().conectarWebSocket()
    expect(SocketFalso.instancias).toHaveLength(0)
  })
})

describe('nova mensagem', () => {
  let relogio: ReturnType<typeof relogioFalso>
  beforeEach(() => (relogio = relogioFalso()))
  afterEach(() => relogio.restaurar())

  test('recarrega a conversa aberta e para o "digitando" de quem enviou', async () => {
    rota('GET', '/usuario/contatos', [{ id: 2, nome: 'Bruno' }])
    rota('GET', '/conversas', [conversaApi(1)])
    rota('GET', '/contatos/presenca', [])
    const chat = novaStore()
    await chat.inicializar()
    const socket = SocketFalso.ultimo()
    socket.abrir()
    chat.conversaAtivaId = 1
    socket.receber({ tipo: 4, conversa_id: 1, usuario_id: 2 })
    rota('GET', '/mensagens/novas', [{ conversa_id: 1, mensagem_id: 5, ate: new Date().toISOString() }])
    rota('GET', '/mensagens', [mensagemApi(5, 'nova', { remetente_id: 2 })])
    socket.receber({ tipo: 2 })
    await aguardar(10)
    expect(chat.mensagensAtivas.map((m) => m.id)).toEqual([5])
    expect(chat.digitandoNaConversaAtiva).toEqual([])
  })

  test('sem socket, o polling de 8 segundos busca as novas', async () => {
    rota('GET', '/usuario/contatos', [])
    rota('GET', '/conversas', [])
    rota('GET', '/mensagens/novas', [])
    const chat = novaStore()
    await chat.inicializar()
    relogio.avancar(8000)
    await aguardar()
    expect(pedidosDe('GET', '/mensagens/novas')).toHaveLength(1)
    SocketFalso.ultimo().abrir()
    relogio.avancar(8000)
    await aguardar()
    expect(pedidosDe('GET', '/mensagens/novas')).toHaveLength(1)
    chat.pararPolling()
  })
})

describe('avisos de digitando e gravando enviados', () => {
  let relogio: ReturnType<typeof relogioFalso>
  beforeEach(() => (relogio = relogioFalso()))
  afterEach(() => relogio.restaurar())

  test('no máximo um aviso de digitando a cada 2,5 segundos, com o último adiado', async () => {
    rota('POST', '/conversa/digitando', {})
    const chat = novaStore()
    chat.enviarDigitando()
    expect(pedidos).toHaveLength(0)
    chat.conversaAtivaId = 1
    chat.enviarDigitando()
    chat.enviarDigitando()
    chat.enviarDigitando()
    await aguardar()
    expect(pedidosDe('POST', '/conversa/digitando')).toHaveLength(1)
    relogio.avancar(2500)
    await aguardar()
    expect(pedidosDe('POST', '/conversa/digitando')).toHaveLength(2)
    chat.limparDigitandoConversaAtiva()
    chat.enviarDigitando()
    await aguardar()
    expect(pedidosDe('POST', '/conversa/digitando')).toHaveLength(3)
  })

  test('gravando segue a mesma regra', async () => {
    rota('POST', '/conversa/gravando', {})
    const chat = novaStore()
    chat.conversaAtivaId = 1
    chat.enviarGravando()
    chat.enviarGravando()
    await aguardar()
    expect(pedidosDe('POST', '/conversa/gravando')).toHaveLength(1)
    chat.limparGravandoConversaAtiva()
    relogio.avancar(10_000)
    await aguardar()
    expect(pedidosDe('POST', '/conversa/gravando')).toHaveLength(1)
  })
})

describe('reações próprias', () => {
  test('reagir marca na hora; reagir de novo desfaz', async () => {
    rota('PUT', '/mensagem/reacao', {})
    const chat = novaStore()
    chat.definirMensagens(1, [mensagem({ id: 9 })])
    chat.conversaAtivaId = 1
    await chat.reagirMensagem(9, '🎉')
    expect(simples(chat.mensagensAtivas[0]!.reacoes)).toMatchObject([{ emoji: '🎉', quantidade: 1, reagiu: true, usuarios: [{ usuario_id: EU, nome: 'Eu' }] }])
    await chat.reagirMensagem(9, '🎉')
    expect(chat.mensagensAtivas[0]!.reacoes).toEqual([])
  })

  test('erro ao reagir recarrega a conversa', async () => {
    rota('PUT', '/mensagem/reacao', erro(500, 'x'))
    rota('GET', '/mensagens', [mensagemApi(9, 'do servidor')])
    const chat = novaStore()
    chat.definirMensagens(1, [mensagem({ id: 9 })])
    chat.conversaAtivaId = 1
    await expect(chat.reagirMensagem(9, '🎉')).rejects.toThrow('x')
    expect(chat.mensagensAtivas[0]!.reacoes).toBeUndefined()
  })

  test('com 5 emojis meus na mensagem, o sexto é recusado sem ir ao servidor; trocar um dos meus pode', async () => {
    rota('PUT', '/mensagem/reacao', {})
    const chat = novaStore()
    const minhas = ['👍', '❤️', '😂', '😮', '😢'].map((emoji) => ({ emoji, quantidade: 1, reagiu: true }))
    chat.definirMensagens(1, [mensagem({ id: 9, reacoes: [...minhas, { emoji: '🙏', quantidade: 1, reagiu: false }] })])
    chat.conversaAtivaId = 1
    await expect(chat.reagirMensagem(9, '🙏')).rejects.toThrow('Você já reagiu com 5 emojis nesta mensagem.')
    expect(pedidosDe('PUT', '/mensagem/reacao')).toHaveLength(0)
    await chat.reagirMensagem(9, '👍')
    expect(pedidosDe('PUT', '/mensagem/reacao')).toHaveLength(1)
  })
})
