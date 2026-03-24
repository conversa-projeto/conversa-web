import type {
  AnexoResponse,
  Chamada,
  ChamadaPendente,
  Contato,
  Conversa,
  LoginResponse,
  SipConfig,
  Mensagem,
  MensagemStatusItem,
  TipoChamada,
  TipoConteudo,
  TipoConversa,
} from '../types/api'
import { requestApi } from './http'

export function login(loginValue: string, senha: string, dispositivoId?: number) {
  return requestApi<LoginResponse>('/login', 'POST', {
    body: {
      login: loginValue,
      senha,
      ...(dispositivoId ? { dispositivo_id: dispositivoId } : {})
    }
  })
}

export function cadastrar(nome: string, loginValue: string, email: string, senha: string) {
  return requestApi<{ id: number; nome: string; login: string; email: string }>('/usuario', 'PUT', {
    body: { nome, login: loginValue, email, senha }
  })
}

export function dispositivoAlterar(dispositivo: { id: number; nome?: string; modelo?: string; versao_so?: string; plataforma?: string; token_fcm?: string }) {
  return requestApi<Record<string, unknown>>('/dispositivo', 'PATCH', { body: dispositivo })
}

export function alterarSenha(senhaNova: string) {
  return requestApi<{ sucesso: boolean }>('/alterar-senha', 'POST', {
    body: {
      senha: senhaNova
    }
  })
}

export function atualizarUsuario(id: number, dados: Record<string, unknown>) {
  return requestApi<{ sucesso: boolean }>('/usuario', 'PATCH', {
    body: { id, ...dados }
  })
}

export function getContatos() {
  return requestApi<Contato[]>('/usuario/contatos')
}

export function getConversas() {
  return requestApi<Conversa[]>('/conversas')
}

export function getUsuariosConversa(conversaId: number) {
  return requestApi<Array<{ id: number; usuario_id: number; nome: string; avatar_url?: string | null }>>('/conversa/usuarios', 'GET', {
    query: { conversa: conversaId }
  })
}

export function removeUsuarioConversa(conversaUsuarioId: number) {
  return requestApi<{ id: number }>('/conversa/usuario', 'DELETE', {
    query: { id: conversaUsuarioId }
  })
}

export function createConversa(descricao: string, tipo: TipoConversa) {
  return requestApi<Conversa>('/conversa', 'PUT', {
    body: {
      descricao,
      tipo
    }
  })
}

export function atualizarConversa(conversaId: number, dados: Partial<Pick<Conversa, 'descricao'>>) {
  return requestApi<Conversa>('/conversa', 'PATCH', {
    body: {
      id: conversaId,
      ...dados
    }
  })
}

export function addUsuarioConversa(conversaId: number, usuarioId: number) {
  return requestApi<{ id: number; conversa_id: number; usuario_id: number }>('/conversa/usuario', 'PUT', {
    body: {
      conversa_id: conversaId,
      usuario_id: usuarioId
    }
  })
}

export function getMensagens(conversaId: number, mensagemReferencia = 0, mensagensPrevias = 80, mensagensSeguintes = 0) {
  return requestApi<Mensagem[]>('/mensagens', 'GET', {
    query: {
      conversa: conversaId,
      mensagemreferencia: mensagemReferencia,
      mensagensprevias: mensagensPrevias,
      mensagensseguintes: mensagensSeguintes
    }
  })
}

export function enviarMensagem(
  conversaId: number,
  conteudos: Array<{ ordem: number; tipo: TipoConteudo; conteudo: string }>,
  mensagemReferencia?: { tipo: number; origem_mensagem_id: number },
) {
  const body: Record<string, unknown> = { conversa_id: conversaId, conteudos }
  if (mensagemReferencia) body.mensagem_referencia = mensagemReferencia
  return requestApi<{ id: number; conversa_id: number; usuario_id: number }>('/mensagem', 'PUT', { body })
}

export async function sha256File(file: Blob): Promise<string> {
  const { createSHA256 } = await import('hash-wasm')
  const hasher = await createSHA256()
  const chunkSize = 2 * 1024 * 1024 // 2MB
  let offset = 0
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize)
    const buffer = await chunk.arrayBuffer()
    hasher.update(new Uint8Array(buffer))
    offset += chunkSize
  }
  return hasher.digest('hex')
}

export async function uploadMinio(url: string, file: Blob, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress(percent)
        }
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error('Upload falhou'))
    }
    xhr.onerror = () => reject(new Error('Upload falhou (Erro de rede)'))
    xhr.send(file)
  })
}

export async function uploadAnexo(tipo: TipoConteudo, nome: string, extensao: string, data: Blob, onProgress?: (percent: number) => void): Promise<AnexoResponse> {
  const identificador = await sha256File(data)

  const existe = await requestApi<{ existe: boolean; id?: number }>('/anexo/existe', 'GET', {
    query: { identificador }
  })

  if (existe.existe && existe.id) {
    if (onProgress) onProgress(100)
    return { id: existe.id, identificador }
  }

  const presign = await requestApi<{ id: number; identificador: string; upload_url: string }>('/anexo', 'PUT', {
    body: {
      identificador,
      tipo,
      nome,
      extensao,
      tamanho: data.size
    }
  })

  await uploadMinio(presign.upload_url, data, onProgress)
  return { id: presign.id, identificador }
}

export function getAnexoUrl(identificador: string) {
  return requestApi<{ url: string }>('/anexo', 'GET', {
    query: { identificador }
  }).then(res => res.url)
}

export function reagirMensagem(mensagemId: number, emoji: string) {
  return requestApi<{ mensagem_id: number; emoji: string; acao: string }>('/mensagem/reacao', 'PUT', {
    body: { mensagem_id: mensagemId, emoji }
  })
}

export function pesquisarMensagens(usuarioId: number, texto: string, conversaId?: number) {
  const query: Record<string, string | number> = { usuario: usuarioId, texto }
  if (conversaId) query.conversa = conversaId
  return requestApi<Mensagem[]>('/pesquisar', 'GET', { query })
}

export function getMensagensNovas(ultimaMensagemId: number) {
  return requestApi<Array<{ conversa_id: number; mensagem_id: number }>>('/mensagens/novas', 'GET', {
    query: {
      ultima: ultimaMensagemId
    }
  })
}

export function mensagemVisualizar(conversaId: number, mensagemId: number) {
  return requestApi<{ sucesso: boolean }>('/mensagem/visualizar', 'POST', {
    body: {
      conversa: conversaId,
      mensagem: mensagemId
    }
  })
}

export function mensagemReproduzir(conversaId: number, mensagemId: number) {
  return requestApi<{ sucesso: boolean }>('/mensagem/reproduzir', 'POST', {
    body: {
      conversa: conversaId,
      mensagem: mensagemId
    }
  })
}

export function mensagemStatus(conversaId: number, mensagemIds: number[]) {
  if (mensagemIds.length === 0) {
    return Promise.resolve([] as MensagemStatusItem[])
  }

  return requestApi<MensagemStatusItem[]>('/mensagem/status', 'GET', {
    query: {
      conversa: conversaId,
      mensagem: mensagemIds.join(',')
    }
  })
}

// === Chamada (Call) ===

export function chamadaIniciar(tipo: TipoChamada, usuarios: Array<{ id: number }>) {
  return requestApi<Chamada>('/chamada/iniciar', 'PUT', {
    body: { tipo, usuarios }
  })
}

export function chamadaCancelar(chamadaId: number) {
  return requestApi<{ id: number }>('/chamada/cancelar', 'POST', {
    body: { id: chamadaId }
  })
}

export function chamadaEntrar(chamadaId: number) {
  return requestApi<{ id: number }>('/chamada/entrar', 'POST', {
    body: { id: chamadaId }
  })
}

export function chamadaRecusar(chamadaId: number) {
  return requestApi<{ id: number }>('/chamada/recusar', 'POST', {
    body: { id: chamadaId }
  })
}

export function chamadaSair(chamadaId: number) {
  return requestApi<{ id: number }>('/chamada/sair', 'POST', {
    body: { id: chamadaId }
  })
}

export function chamadaFinalizar(chamadaId: number) {
  return requestApi<{ id: number }>('/chamada/finalizar', 'POST', {
    body: { id: chamadaId }
  })
}

export function chamadaDados(chamadaId: number) {
  return requestApi<Chamada>('/chamada/dados', 'GET', {
    query: { id: chamadaId }
  })
}

export function chamadaAdicionarUsuario(chamadaId: number, usuarioId: number) {
  return requestApi<{ id: number }>('/chamada/usuario', 'PUT', {
    body: { chamada_id: chamadaId, usuario_id: usuarioId }
  })
}

export function chamadaVideo(chamadaId: number) {
  return requestApi<{ id: number }>('/chamada/video', 'POST', {
    body: { id: chamadaId }
  })
}

export function getChamadasPendentes() {
  return requestApi<ChamadaPendente[]>('/chamadas/pendentes')
}

export function digitando(conversaId: number) {
  return requestApi<{ sucesso: boolean }>('/conversa/digitando', 'POST', {
    body: { id: conversaId }
  })
}

export function gravandoAudio(conversaId: number) {
  return requestApi<{ sucesso: boolean }>('/conversa/gravando', 'POST', {
    body: { id: conversaId }
  })
}

export function getSip() {
  return requestApi<SipConfig>('/sip')
}

export function criarSip(dados: Omit<SipConfig, 'id' | 'usuario_id' | 'criado_em' | 'criado_por'>) {
  return requestApi<SipConfig>('/sip', 'PUT', {
    body: dados
  })
}

export function atualizarSip(dados: Partial<SipConfig> & { id: number }) {
  return requestApi<{ sucesso: boolean }>('/sip', 'PATCH', {
    body: dados
  })
}
