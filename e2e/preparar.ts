import { request, type FullConfig } from '@playwright/test'
import { lerContas, type Conta } from './contas'

// Antes dos testes: as contas de teste existem e têm uma conversa direta entre
// elas. Tudo pela API, no banco de desenvolvimento.
export default async function preparar(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'https://localhost'
  const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true })
  try {
    const contas = lerContas()

    async function entrar(conta: Conta): Promise<{ id: number; token: string }> {
      let resposta = await api.post('/api/login', { data: { login: conta.login, senha: conta.senha } })
      if (resposta.status() === 401) {
        const cadastro = await api.put('/api/usuario', {
          data: { nome: conta.nome, login: conta.login, email: `${conta.login}@teste.test`, senha: conta.senha },
        })
        if (!cadastro.ok()) {
          throw new Error(`Não foi possível criar a conta ${conta.login}: ${await cadastro.text()}. ` +
            'Se ela já existe com outra senha, apague e2e/.contas.json e a conta no banco, ou ponha a senha certa no arquivo.')
        }
        resposta = await api.post('/api/login', { data: { login: conta.login, senha: conta.senha } })
      }
      if (!resposta.ok()) {
        throw new Error(`Login de ${conta.login} falhou: ${resposta.status()} ${await resposta.text()}. O Docker está no ar?`)
      }
      return resposta.json()
    }

    const ana = await entrar(contas.ana)
    const bruno = await entrar(contas.bruno)
    const comAna = { Authorization: `Bearer ${ana.token}` }

    const conversas = await (await api.get('/api/conversas', { headers: comAna })).json() as { id: number; tipo: number; destinatario_id: number | null }[]
    if (!conversas.some((c) => c.tipo === 1 && c.destinatario_id === bruno.id)) {
      const conversa = await (await api.put('/api/conversa', { headers: comAna, data: { descricao: null, tipo: 1 } })).json() as { id: number }
      await api.put('/api/conversa/usuario', { headers: comAna, data: { conversa_id: conversa.id, usuario_id: bruno.id } })
    }
  } finally {
    await api.dispose()
  }
}
