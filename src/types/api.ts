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
  GravacaoAudio: 5,
  Chamada: 6,
  // O conteúdo é o identificador pacote/nome (utils/figurinhas.ts)
  Figurinha: 7,
  // O conteúdo é o id da enquete (votação em grupo)
  Enquete: 8,
} as const
export type TipoConteudo = (typeof TipoConteudo)[keyof typeof TipoConteudo]

export const TipoMensagemReferencia = {
  Resposta: 1,
  Encaminhada: 2,
} as const
export type TipoMensagemReferencia = (typeof TipoMensagemReferencia)[keyof typeof TipoMensagemReferencia]

export const TipoEventoSocket = {
  NovaMensagem: 2,
  StatusMensagem: 3,
  Digitando: 4,
  GravandoAudio: 5,
  ReacaoMensagem: 7,
  ConversaAtualizada: 40,
  ChamadaRecebida: 51,
  ChamadaFinalizada: 52,
  UsuarioRecusou: 53,
  UsuarioEntrou: 54,
  UsuarioSaiu: 55,
  VideoAtivado: 56,
  SinalChamada: 57,
  StatusUsuario: 60,
  NovaAtividade: 61,
  EnqueteAtualizada: 62,
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

// O login devolve o usuario sem o campo login (a pagina ja o tem)
export interface LoginResponse extends Omit<Usuario, 'login'> {
  token: string
  dispositivo: Dispositivo
}

export interface Contato extends Usuario { }

export interface Conversa {
  id: number
  descricao: string | null
  tipo: TipoConversa
  inserida: Date
  nome?: string | null
  destinatario_id?: number | null
  mensagem_id?: number
  ultima_mensagem?: Date | null
  ultima_mensagem_texto?: string | null
  mensagens_sem_visualizar?: number
  avatar_url?: string | null
  // Posição entre as fixadas (nula quando não fixada) e quando foi arquivada
  fixada_ordem?: number | null
  arquivada_em?: Date | null
}

export interface ConteudoMensagem {
  id?: number
  tipo: TipoConteudo
  ordem: number
  conteudo: string
  nome?: string | null
  extensao?: string | null
  localUrl?: string
  /** Audio: situacao da transcricao (StatusTranscricao) e o texto, quando pronto. */
  transcricao_status?: number
  transcricao?: string
}

export const StatusTranscricao = {
  Nenhuma: 0,
  Processando: 1,
  Concluida: 2,
  Erro: 3
} as const
export type StatusTranscricao = (typeof StatusTranscricao)[keyof typeof StatusTranscricao]

/** Resposta de GET e PUT /anexo/transcricao. */
export interface TranscricaoAudio {
  status: StatusTranscricao
  texto: string
  erro: string
}

export interface MensagemReferencia {
  id?: number
  tipo: TipoMensagemReferencia | number
  origem_mensagem_id?: number
  mensagem?: {
    id: number
    conversa_id?: number
    remetente?: string
    inserida?: Date
    /** Excluída pelo autor: o conteúdo continua, mas aparece como excluída */
    excluida_em?: Date | null
    conteudos: ConteudoMensagem[]
    mensagem_referencia?: MensagemReferencia | null
  } | null
}

export interface ReacaoUsuario {
  usuario_id: number
  nome: string
  avatar_url?: string | null
  reagido_em: Date
}

export interface Reacao {
  emoji: string
  quantidade: number
  reagiu: boolean
  usuarios?: ReacaoUsuario[]
}

export interface Mensagem {
  id: number
  remetente_id: number
  remetente: string
  conversa_id: number
  inserida: Date
  alterada: Date | null
  /**
   * Data para mensagens agendadas (autor ve imediatamente; destinatarios so
   * depois que visivel_em <= now). Null = mensagem normal.
   */
  visivel_em: Date | null
  /**
   * Quando o autor excluiu. A mensagem continua na conversa, marcada como
   * excluída; o conteúdo aparece enquanto alguém segura sobre ela.
   */
  excluida_em?: Date | null
  recebida: boolean
  visualizada: boolean
  reproduzida: boolean
  conteudos: ConteudoMensagem[]
  mensagem_referencia?: MensagemReferencia | null
  reacoes?: Reacao[]
  enviando?: boolean
}

export interface AnexoResponse {
  id: number
  identificador: string
}

export interface SipConfig {
  id: number
  usuario_id: number
  sip_user: string
  auth_user: string | null
  sip_password: string
  display_name: string | null
  domain: string
  ws_server: string
  ativo: boolean
  criado_em?: Date | null
  criado_por?: number | null
}

/** Resposta de GET /ice: servidores ICE com credencial TURN temporaria. */
export interface IceConfig {
  iceServers: RTCIceServer[]
  iceTransportPolicy: RTCIceTransportPolicy
}

// === Chamada (Call) ===

export interface ChamadaUsuario {
  usuario_id: number
  usuario_nome: string
  status: StatusUsuarioChamada
  adicionado_por: number
  adicionado_por_nome: string
  adicionado_em: Date | null
  entrou_em: Date | null
  saiu_em: Date | null
  recusou_em: Date | null
}

export interface Chamada {
  id: number
  iniciada: Date | null
  finalizada: Date | null
  tipo: TipoChamada
  status: StatusChamada
  criado_em: Date
  criado_por: number
  // Grupo do chat da chamada, criado na primeira mensagem enviada por ele
  conversa_chat_id: number | null
  usuarios: ChamadaUsuario[]
}

export interface ChamadaPendente {
  id: number
  tipo: TipoChamada
  status: StatusChamada
  iniciada: Date | null
  finalizada: Date | null
  conversa_id: number
  criado_em: Date
  criado_por: number
}

export interface ChamadaConteudo {
  chamada_id: number
  tipo: number
  status: number
  iniciada: string | null
  finalizada: string | null
  duracao: number | null
  participantes: Array<{
    usuario_id: number
    nome: string
    status: number
    duracao: number | null
  }>
}

export interface ChamadaHistoricoItem {
  id: number
  tipo: number
  status: number
  criado_em: Date
  criado_por: number
  conversa_id: number | null
  iniciada: Date | null
  finalizada: Date | null
  duracao: number | null
  participantes: Array<{
    usuario_id: number
    nome: string
    status: number
    duracao: number | null
    avatar_url: string | null
  }>
}

export interface EventoChamadaSocket {
  tipo: 51 | 52 | 53 | 54 | 55 | 56 | 57
  chamada_id: number
  usuario_id: number
  dados?: SinalChamada
}

/** Votação em grupo: opções com quem votou em cada uma */
export interface Enquete {
  id: number
  conversa_id: number
  mensagem_id: number | null
  pergunta: string
  multipla: boolean
  criado_por: number | null
  opcoes: { id: number; texto: string; votantes: { id: number; nome: string }[] }[]
  /** Pessoas que votaram (na múltipla escolha, cada uma conta uma vez) */
  total_votantes: number
  meus_votos: number[]
  /** Data final (opcional); passou dela, a votação está encerrada */
  encerra_em: Date | null
  /** Encerrada à mão antes do prazo */
  encerrada_em: Date | null
  encerrada: boolean
  /** Quem criou a votação ou quem criou o grupo, com a votação aberta */
  pode_encerrar: boolean
  /** Só quem criou, com a votação aberta */
  pode_alterar_prazo: boolean
}

/** Permissões do sistema (tabela permissao no servidor) */
export const CodigoPermissao = {
  Parametros: 'parametros',
  Permissoes: 'permissoes',
} as const
export type CodigoPermissao = (typeof CodigoPermissao)[keyof typeof CodigoPermissao]

export interface PermissoesSistema {
  permissoes: { codigo: string; descricao: string }[]
  usuarios: { id: number; nome: string; login: string; permissoes: string[] }[]
  /** Ninguém tem a permissão de Acessos: todos têm todas, até alguém receber */
  modo_aberto: boolean
}

/** Parâmetros do sistema como a tela mostra: os segredos não vêm */
export interface ParametrosSistema {
  fcm_project_id: string
  fcm_client_email: string
  fcm_private_key_configurada: boolean
  turn_forcar_relay: boolean
  transcritor_url: string
  transcritor_idioma: string
  gravacao_dias: number
  s3_bucket: string
}

export interface AlteracaoParametros {
  fcm_project_id?: string
  fcm_client_email?: string
  fcm_private_key?: string
  turn_forcar_relay?: boolean
  transcritor_url?: string
  transcritor_idioma?: string
  gravacao_dias?: number
}

/** O que aconteceu com o usuário: reagiram, responderam, mencionaram, chamada perdida */
export const TipoAtividade = {
  Reacao: 1,
  Resposta: 2,
  Mencao: 3,
  ChamadaPerdida: 4,
} as const
export type TipoAtividade = (typeof TipoAtividade)[keyof typeof TipoAtividade]

export interface Atividade {
  id: number
  tipo: TipoAtividade
  criado_em: Date
  /** Chegou depois da última vez que o usuário abriu as atividades */
  nova: boolean
  autor_id: number
  autor_nome: string
  autor_avatar_url: string | null
  conversa_id: number | null
  conversa_tipo: number | null
  conversa_descricao: string | null
  /** Reação: a mensagem do usuário; resposta e menção: a mensagem de quem fez */
  mensagem_id: number | null
  conteudo_tipo: number | null
  /** Prévia de uma linha do texto da mensagem */
  texto: string | null
  chamada_id: number | null
  chamada_tipo: number | null
  emoji: string | null
}

/**
 * Sinal entre os participantes de uma chamada, repassado pelo servidor sem
 * gravar: quem está compartilhando a tela e o ponteiro sobre ela (x e y de 0 a
 * 1 sobre a imagem; null quando o ponteiro sai). O servidor avisa quando o
 * chat da chamada é criado.
 */
export type SinalChamada =
  | { acao: 'tela'; ativa: boolean }
  | { acao: 'ponteiro'; alvo: number; x: number | null; y: number | null }
  | { acao: 'chat'; conversa_id: number }

// Status de uma mensagem para cada destinatário (horários ou null)
export interface StatusDestinatario {
  usuario_id: number
  nome: string
  recebida: Date | null
  visualizada: Date | null
  reproduzida: Date | null
}

export interface MensagemStatusItem {
  conversa_id: number
  mensagem_id: number
  recebida: boolean
  visualizada: boolean
  reproduzida: boolean
  excluida_em: Date | null
}

export interface EventoSocket {
  tipo?: number
  grupo?: number
  conversa_id?: number
  mensagens?: string
  chamada_id?: number
  usuario_id?: number
  mensagem_id?: number
  emoji?: string
  acao?: string
}

/**
 * Item da resposta de GET /api/anexos.
 * O campo `url` e um presigned URL do MinIO com TTL de 600s.
 */
export interface AnexoItem {
  anexo_id: number
  identificador: string
  nome: string | null
  extensao: string | null
  tamanho: number
  criado_em: Date | null
  tipo: number
  mensagem_id: number
  conversa_id: number
  conversa_descricao: string | null
  autor_id: number
  autor_nome: string
  url: string | null
}
