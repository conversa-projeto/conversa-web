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
