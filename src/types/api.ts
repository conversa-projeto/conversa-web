// === Enums e Constantes ===

export const TipoConversa = {
  Direta: 1,
  Grupo: 2,
} as const
export type TipoConversa = (typeof TipoConversa)[keyof typeof TipoConversa]

export const TipoConteudo = {
  Texto: 1,
  Imagem: 2,
  Arquivo: 3,
  Audio: 4,
} as const
export type TipoConteudo = (typeof TipoConteudo)[keyof typeof TipoConteudo]

export const TipoEventoSocket = {
  NovaMensagem: 2,
  StatusMensagem: 3,
  Digitando: 4,
  GravandoAudio: 5,
  ConversaAtualizada: 40,
  ChamadaRecebida: 51,
  ChamadaFinalizada: 52,
  UsuarioRecusou: 53,
  UsuarioEntrou: 54,
  UsuarioSaiu: 55,
  VideoAtivado: 56,
} as const
export type TipoEventoSocket = (typeof TipoEventoSocket)[keyof typeof TipoEventoSocket]

/** Tipo da chamada: 1 = somente audio, 2 = video + audio */
export const TipoChamada = {
  Audio: 1,
  Video: 2,
} as const
export type TipoChamada = (typeof TipoChamada)[keyof typeof TipoChamada]

/**
 * Status da chamada:
 * 1 = Pendente, 2 = Recusada, 3 = Em Andamento,
 * 4 = Encerrada, 5 = Desconectada, 6 = Cancelada
 */
export type StatusChamada = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Status do usuario na chamada:
 * 1 = Pendente, 2 = Recusou, 3 = Entrou, 4 = Saiu, 5 = Desconectou
 */
export const StatusUsuarioChamada = {
  Pendente: 1,
  Recusou: 2,
  Entrou: 3,
  Saiu: 4,
  Desconectou: 5,
} as const
export type StatusUsuarioChamada = (typeof StatusUsuarioChamada)[keyof typeof StatusUsuarioChamada]

// === Interfaces ===

export interface Usuario {
  id: number
  nome: string
  login: string
  email: string
  telefone?: string | null
  avatar_url?: string | null
  avatar_identificador?: string | null
}

export interface Dispositivo {
  id: number
  nome: string
  modelo: string
  versao_so: string
  plataforma: string
  ativo: boolean
}

export interface LoginResponse extends Usuario {
  token: string
  dispositivo: Dispositivo
}

export interface Contato extends Usuario { }

export interface Conversa {
  id: number
  descricao: string
  tipo: TipoConversa
  inserida: string
  nome?: string | null
  destinatario_id?: number | null
  mensagem_id?: number
  ultima_mensagem?: string | null
  ultima_mensagem_texto?: string | null
  mensagens_sem_visualizar?: number
  avatar_url?: string | null
}

export interface ConteudoMensagem {
  id?: number
  tipo: TipoConteudo
  ordem: number
  conteudo: string
  nome?: string | null
  extensao?: string | null
  localUrl?: string
}

export interface Mensagem {
  id: number
  remetente_id: number
  remetente: string
  conversa_id: number
  inserida: string
  alterada: string
  recebida: boolean
  visualizada: boolean
  reproduzida: boolean
  conteudos: ConteudoMensagem[]
  enviando?: boolean
  resposta_mensagem_id?: number | null
  resposta_mensagem?: {
    id: number
    remetente: string
    conteudo_resumo: string
  } | null
}

export interface AnexoResponse {
  id: number
  identificador: string
}

// === Chamada (Call) ===

export interface ChamadaUsuario {
  usuario_id: number
  usuario_nome: string
  status: StatusUsuarioChamada
  adicionado_por: number
  adicionado_por_nome: string
  adicionado_em: string
  entrou_em: string | null
  saiu_em: string | null
  recusou_em: string | null
}

export interface Chamada {
  id: number
  iniciada: string | null
  finalizada: string | null
  tipo: TipoChamada
  status: StatusChamada
  criado_em: string
  criado_por: number
  usuarios: ChamadaUsuario[]
}

export interface ChamadaPendente {
  id: number
  tipo: TipoChamada
  status: StatusChamada
  iniciada: string | null
  finalizada: string | null
  conversa_id: number
  criado_em: string
  criado_por: number
}

export interface EventoChamadaSocket {
  tipo: 51 | 52 | 53 | 54 | 55 | 56
  chamada_id: number
  usuario_id: number
}

export interface MensagemStatusItem {
  conversa_id: number
  mensagem_id: number
  recebida: boolean
  visualizada: boolean
  reproduzida: boolean
}

export interface EventoSocket {
  tipo?: number
  grupo?: number
  conversa_id?: number
  mensagens?: string
  chamada_id?: number
  usuario_id?: number
}
