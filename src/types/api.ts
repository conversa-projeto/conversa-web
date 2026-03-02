export interface Usuario {
  id: number
  nome: string
  login: string
  email: string
  telefone?: string | null
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

export interface Contato extends Usuario {}

export interface Conversa {
  id: number
  descricao: string
  tipo: number
  inserida: string
  nome?: string | null
  destinatario_id?: number | null
  mensagem_id?: number
  ultima_mensagem?: string | null
  ultima_mensagem_texto?: string | null
  mensagens_sem_visualizar?: number
}

export interface ConteudoMensagem {
  id?: number
  tipo: number
  ordem: number
  conteudo: string
  nome?: string | null
  extensao?: string | null
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
}

export interface AnexoResponse {
  id: number
  identificador: string
  tipo: number
  tamanho: number
}

// === Chamada (Call) ===

/** Tipo da chamada: 1 = somente audio, 2 = video + audio */
export type TipoChamada = 1 | 2

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
export type StatusUsuarioChamada = 1 | 2 | 3 | 4 | 5

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

export interface EventoChamadaSocket {
  tipo: 51 | 52 | 53 | 54 | 55
  chamada_id: number
  usuario_id: number
}
