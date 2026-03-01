import type {
  AnexoResponse,
  Contato,
  Conversa,
  LoginResponse,
  Mensagem
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

export function getContatos() {
  return requestApi<Contato[]>('/usuario/contatos')
}

export function getConversas() {
  return requestApi<Conversa[]>('/conversas')
}

export function createConversa(descricao: string, tipo: number) {
  return requestApi<Conversa>('/conversa', 'PUT', {
    body: {
      descricao,
      tipo
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

export function enviarMensagem(conversaId: number, conteudos: Array<{ ordem: number; tipo: number; conteudo: string }>) {
  return requestApi<{ id: number; conversa_id: number; usuario_id: number }>('/mensagem', 'PUT', {
    body: {
      conversa_id: conversaId,
      conteudos
    }
  })
}

export function uploadAnexo(tipo: number, nome: string, extensao: string, data: Blob) {
  return requestApi<AnexoResponse>('/anexo', 'PUT', {
    query: {
      tipo,
      nome,
      extensao
    },
    body: data,
    isBinary: true
  })
}

export function pesquisarMensagens(usuarioId: number, texto: string) {
  return requestApi<Mensagem[]>('/pesquisar', 'GET', {
    query: {
      usuario: usuarioId,
      texto
    }
  })
}

export function getMensagensNovas(ultimaMensagemId: number) {
  return requestApi<Array<{ conversa_id: number; mensagem_id: number }>>('/mensagens/novas', 'GET', {
    query: {
      ultima: ultimaMensagemId
    }
  })
}

export function mensagemVisualizar(conversaId: number, mensagemId: number) {
  return requestApi<{ sucesso: boolean }>('/mensagem/visualizar', 'GET', {
    query: {
      conversa: conversaId,
      mensagem: mensagemId
    }
  })
}

export interface MensagemStatusItem {
  conversa_id: number
  mensagem_id: number
  recebida: boolean
  visualizada: boolean
  reproduzida: boolean
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
