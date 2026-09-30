import { beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { aguardar, erro, pedidosDe, rota } from './apiFalsa'

const respostaLogin = {
  id: 7, nome: 'Ana', email: 'ana@teste.test', telefone: null, token: 'token-novo',
  avatar_identificador: 'avatar-1', dispositivo: { id: 3 },
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('sessão salva', () => {
  test('recupera token, usuário e dispositivo do navegador', () => {
    localStorage.setItem('conversa.token', 'salvo')
    localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Ana', login: 'ana', email: 'a@t', avatar_identificador: 'av' }))
    localStorage.setItem('conversa.deviceId', '3')
    const auth = useAuthStore()
    expect(auth.token).toBe('salvo')
    expect(auth.user).toMatchObject({ id: 7, nome: 'Ana', telefone: null, avatar_identificador: 'av' })
    expect(auth.dispositivoId).toBe(3)
    expect(auth.isAuthenticated).toBe(true)
  })

  test.each([['não é json'], [JSON.stringify({ id: 0 })], [JSON.stringify({ nome: 'sem id' })]])('usuário salvo inválido é ignorado (%#)', (salvo) => {
    localStorage.setItem('conversa.user', salvo)
    localStorage.setItem('conversa.deviceId', 'x')
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    expect(auth.dispositivoId).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })
})

describe('login', () => {
  test('guarda a sessão, informa o navegador ao dispositivo e busca o avatar', async () => {
    rota('POST', '/login', respostaLogin)
    rota('PATCH', '/dispositivo', {})
    rota('GET', '/anexo', { url: 'https://localhost/storage/avatar' })
    const auth = useAuthStore()
    await auth.login('ana', 'senha')
    await aguardar()
    expect(auth.token).toBe('token-novo')
    expect(auth.user).toMatchObject({ id: 7, login: 'ana', avatar_identificador: 'avatar-1' })
    expect(localStorage.getItem('conversa.token')).toBe('token-novo')
    expect(localStorage.getItem('conversa.deviceId')).toBe('3')
    expect(JSON.parse(localStorage.getItem('conversa.user')!)).toMatchObject({ id: 7 })
    const [infoNavegador] = pedidosDe('PATCH', '/dispositivo')
    expect(infoNavegador!.corpo).toMatchObject({ id: 3, plataforma: 'Web' })
    expect(auth.avatarUrl).toBe('https://localhost/storage/avatar')
  })

  test('manda o dispositivo já conhecido', async () => {
    localStorage.setItem('conversa.deviceId', '3')
    rota('POST', '/login', respostaLogin)
    rota('PATCH', '/dispositivo', {})
    rota('GET', '/anexo', { url: 'u' })
    await useAuthStore().login('ana', 'senha')
    expect(pedidosDe('POST', '/login')[0]!.corpo.dispositivo_id).toBe(3)
  })

  test('resposta sem token é erro', async () => {
    rota('POST', '/login', { ...respostaLogin, token: '' })
    await expect(useAuthStore().login('ana', 'senha')).rejects.toThrow('token ausente')
  })

  test('senha errada repassa a mensagem do servidor', async () => {
    rota('POST', '/login', erro(401, 'Senha incorreta!'))
    await expect(useAuthStore().login('ana', 'x')).rejects.toThrow('Senha incorreta!')
  })
})

describe('logout e perfil', () => {
  test('logout limpa a sessão, mas mantém o dispositivo', async () => {
    rota('POST', '/login', { ...respostaLogin, avatar_identificador: null })
    rota('PATCH', '/dispositivo', {})
    const auth = useAuthStore()
    await auth.login('ana', 'senha')
    auth.logout()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.avatarUrl).toBe('')
    expect(localStorage.getItem('conversa.token')).toBeNull()
    expect(localStorage.getItem('conversa.user')).toBeNull()
    expect(localStorage.getItem('conversa.deviceId')).toBe('3')
  })

  test('atualizar perfil, trocar e remover avatar persistem', () => {
    localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Ana' }))
    const auth = useAuthStore()
    auth.atualizarPerfil({ nome: 'Ana Maria' })
    auth.atualizarAvatar('novo', 'https://u')
    expect(auth.avatarUrl).toBe('https://u')
    expect(JSON.parse(localStorage.getItem('conversa.user')!)).toMatchObject({ nome: 'Ana Maria', avatar_identificador: 'novo' })
    auth.removerAvatar()
    expect(auth.avatarUrl).toBe('')
    expect(auth.user!.avatar_identificador).toBeNull()
  })

  test('sem usuário, perfil e avatar não fazem nada', () => {
    const auth = useAuthStore()
    auth.atualizarPerfil({ nome: 'x' })
    auth.atualizarAvatar('a', 'u')
    auth.removerAvatar()
    expect(auth.user).toBeNull()
  })

  test('trocar o endereço da API', () => {
    const auth = useAuthStore()
    auth.setApiBase(' https://outro.test/ ')
    expect(auth.apiBase).toBe('https://outro.test')
    expect(localStorage.getItem('conversa.apiBase')).toBe('https://outro.test')
  })
})

describe('avatar com endereço vencido', () => {
  function logado() {
    localStorage.setItem('conversa.user', JSON.stringify({ id: 7, nome: 'Ana', avatar_identificador: 'av', avatar_url: 'antiga' }))
    return useAuthStore()
  }

  test('falha do endereço atual pede um novo', async () => {
    let n = 0
    rota('GET', '/anexo', () => ({ url: `https://localhost/storage/${++n}` }))
    const auth = logado()
    await auth.resolverAvatarUrl()
    expect(auth.avatarUrl).toBe('https://localhost/storage/1')
    auth.renovarAvatarExpirado('https://localhost/storage/1')
    await aguardar()
    expect(auth.avatarUrl).toBe('https://localhost/storage/2')
  })

  test('falha de um endereço antigo (já trocado) não pede outro', async () => {
    rota('GET', '/anexo', { url: 'nova' })
    const auth = logado()
    await auth.resolverAvatarUrl()
    auth.renovarAvatarExpirado('um-endereco-antigo')
    await aguardar()
    expect(pedidosDe('GET', '/anexo')).toHaveLength(1)
  })

  test('a url salva no login também conta como atual', async () => {
    rota('GET', '/anexo', { url: 'nova' })
    const auth = logado()
    auth.renovarAvatarExpirado('antiga')
    await aguardar()
    expect(auth.avatarUrl).toBe('nova')
  })

  test('não renova duas vezes em 30 segundos (arquivo realmente indisponível)', async () => {
    rota('GET', '/anexo', { url: 'sempre-a-mesma' })
    const auth = logado()
    await auth.resolverAvatarUrl()
    auth.renovarAvatarExpirado('sempre-a-mesma')
    await aguardar()
    auth.renovarAvatarExpirado('sempre-a-mesma')
    await aguardar()
    expect(pedidosDe('GET', '/anexo')).toHaveLength(2)
  })

  test('erro ao buscar o avatar deixa sem endereço; sem avatar não busca', async () => {
    rota('GET', '/anexo', erro(404, 'Anexo não encontrado'))
    const auth = logado()
    await auth.resolverAvatarUrl()
    expect(auth.avatarUrl).toBe('')
    localStorage.clear()
    setActivePinia(createPinia())
    await useAuthStore().resolverAvatarUrl()
    expect(pedidosDe('GET', '/anexo')).toHaveLength(1)
  })
})

describe('nome do navegador no dispositivo', () => {
  const casos: [string, Record<string, string>][] = [
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.1.2 Safari/537.36 Edg/140.0.1.2', { nome: 'Edge 140.0.1.2', versao_so: 'Windows 10/11', modelo: 'Desktop' }],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0', { nome: 'Firefox 130.0', versao_so: 'Linux' }],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', { nome: 'Safari 17.5', versao_so: 'macOS 14.5' }],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36', { nome: 'Chrome 140.0', versao_so: 'Android 14', modelo: 'Mobile' }],
    ['Mozilla/5.0 (Windows NT 6.1) Algo', { nome: 'Navegador', versao_so: 'Windows' }],
  ]

  async function informado(agente: string) {
    Object.defineProperty(navigator, 'userAgent', { value: agente, configurable: true })
    rota('POST', '/login', { ...respostaLogin, avatar_identificador: null })
    rota('PATCH', '/dispositivo', {})
    await useAuthStore().login('ana', 'senha')
    await aguardar()
    return pedidosDe('PATCH', '/dispositivo')[0]!.corpo
  }

  test.each(casos)('%s', async (agente, esperado) => {
    expect(await informado(agente)).toMatchObject(esperado)
  })

  // O iPhone se anuncia "like Mac OS X"
  test('iPhone é registrado como iOS', async () => {
    const agente = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    expect(await informado(agente)).toMatchObject({ versao_so: 'iOS 17.4', modelo: 'Mobile' })
  })
})
