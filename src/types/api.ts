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
  // O conteúdo é o JSON de um local ou trajeto (utils/localizacao.ts)
  Localizacao: 9,
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
  ConfirmacaoLeitura: 8,
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
  Presenca: 63,
  PostagemAtualizada: 64,
  ConfirmacaoPedida: 65,
  /** Conta criada, renomeada ou excluída: recarrega os contatos (busca e @) */
  ContatosAtualizados: 66,
  /** Pasta de mensagens criada, mudada ou excluída, ou mensagens postas/tiradas dela */
  PastasAtualizadas: 67,
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

export interface Contato extends Usuario {
  /** Usuário que é um bot de IA */
  bot?: boolean
  /** Data do cadastro ("Usuário desde") */
  criado_em?: Date | null
}

/** Bot de IA: um usuário comum com as instruções de personalidade e do que faz */
export interface Bot {
  id: number
  usuario_id: number
  nome: string
  login: string
  instrucoes: string
  ativo: boolean
  criado_por: number | null
  criado_por_nome: string | null
  /** Permissões de uso do bot */
  permissoes: string[]
  /** Ferramentas externas ligadas no bot (ids) */
  ferramentas: number[]
  /** Bases de conhecimento que ele consulta (ids) */
  bases: number[]
}

/** Base de conhecimento dos bots (RAG) */
export interface BaseConhecimento {
  id: number
  nome: string
  descricao: string
  documentos: number
  trechos: number
}

export const StatusDocumento = { Processando: 1, Pronto: 2, Erro: 3 } as const
export type StatusDocumento = (typeof StatusDocumento)[keyof typeof StatusDocumento]

export interface DocumentoConhecimento {
  id: number
  base_id: number
  nome: string
  caracteres: number
  trechos: number
  status: StatusDocumento
  erro: string | null
  criado_em: Date
}

/** Trecho achado na busca, com o documento de origem e a semelhança (0 a 1) */
export interface TrechoConhecimento {
  documento: string
  texto: string
  nota: number
}

export type TipoParametroFerramenta = 'string' | 'number' | 'boolean'

export interface ParametroFerramenta {
  nome: string
  tipo: TipoParametroFerramenta
  descricao: string
  obrigatorio: boolean
}

/** Ferramenta externa dos bots (API HTTP com JSON). Dos cabeçalhos só vêm os nomes: o valor nunca sai do servidor */
export interface FerramentaExterna {
  id: number
  nome: string
  descricao: string
  metodo: 'GET' | 'POST'
  url: string
  cabecalhos: string[]
  parametros: ParametroFerramenta[]
  ativo: boolean
}

/** Ferramenta embutida do bot (a da base de conhecimento), só para ver como é uma configuração de verdade */
export interface FerramentaEmbutida {
  nome: string
  descricao: string
  /** De onde vem a resposta (interna, sem endereço externo) */
  origem: string
  parametros: ParametroFerramenta[]
  /** A definição exata que o modelo recebe (function calling) */
  definicao: unknown
}

/** Para salvar: cabeçalho sem valor mantém o que está salvo */
export interface DadosFerramenta {
  nome: string
  descricao: string
  metodo: 'GET' | 'POST'
  url: string
  cabecalhos: { nome: string; valor: string | null }[]
  parametros: ParametroFerramenta[]
  ativo: boolean
}

/** Resposta de POST /ferramenta/testar */
export interface TesteFerramenta {
  ok: boolean
  status: number
  resposta: string
  erro: string
  milissegundos: number
}

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
  // Chat criado pelo painel de uma chamada
  chamada?: boolean
  // Grupo: emoji no lugar da primeira letra (a imagem vem em avatar_url)
  emoji?: string | null
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
  /** Audio: duração em segundos e picos de 0 a 100 para a onda, gravados no envio */
  duracao?: number | null
  intensidade?: number[] | null
  /** Mensagem de chamada: o chat criado na ligação, para quem é membro dele */
  chat_chamada_id?: number
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

export interface ConfirmacaoUsuario {
  usuario_id: number
  nome: string
  avatar_url?: string | null
  confirmada_em: Date
}

// Mensagem que pede confirmação de leitura: quem precisa confirmar (só eles
// confirmam) e quem já confirmou
export interface ConfirmacaoLeitura {
  total: number
  confirmou: boolean
  pode_confirmar: boolean
  destinatarios: Array<{ usuario_id: number; nome: string }>
  usuarios: ConfirmacaoUsuario[]
}

// Postagem de grupo: título, quantas respostas (e quantas não vi) e as últimas
export interface Postagem {
  titulo: string | null
  respostas: number
  nao_lidas: number
  ultimas: Mensagem[]
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
  confirmacao?: ConfirmacaoLeitura
  postagem?: Postagem
  /** Pastas (da conversa direta) em que a mensagem está e que o usuário enxerga */
  pastas?: number[]
  enviando?: boolean
}

/** Pasta de mensagens numa conversa direta: do usuário ou compartilhada pela outra pessoa */
export interface PastaMensagens {
  id: number
  conversa_id: number
  dono_id: number
  nome: string
  cor: string
  compartilhada: boolean
  mensagens: number
}

/** Pasta sugerida pela IA para uma mensagem que ainda não está em pasta (prévia do texto para o painel) */
export interface SugestaoPasta {
  mensagem_id: number
  pasta_id: number
  autor: string
  texto: string
}

/** Análise das mensagens sem pasta pela IA, feita em segundo plano (consulta até sair de "processando") */
export interface SugestoesPastas {
  id: string
  conversa_id: number
  status: 'processando' | 'concluido' | 'erro'
  analisadas: number
  sugestoes: SugestaoPasta[]
  erro: string
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
  /** TURN do próprio PABX (opcional): turn: ou turns: */
  turn_server?: string | null
  turn_user?: string | null
  turn_password?: string | null
  ativo: boolean
  criado_em?: Date | null
  criado_por?: number | null
}

/** Ramal de uma pessoa visto pelo administrador (GET /sip/usuario): as senhas não vêm, só se estão salvas */
export type SipUsuario = Omit<SipConfig, 'sip_password' | 'turn_password'> & { tem_senha: boolean; tem_senha_turn: boolean }

/** O que o administrador manda ao salvar o ramal (PUT /sip/usuario). Senha vazia mantém a salva */
export interface SalvarSipUsuario {
  usuario_id: number
  sip_user: string
  auth_user: string | null
  sip_password: string | null
  display_name: string | null
  domain: string
  ws_server: string
  turn_server: string | null
  turn_user: string | null
  turn_password: string | null
  ativo: boolean
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
  // Chat criado na ligação (só para quem é membro dele)
  conversa_chat_id: number | null
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

/** Permissões do sistema (tabela permissao no servidor): as de administração e as de uso do app */
export const CodigoPermissao = {
  Parametros: 'parametros',
  Permissoes: 'permissoes',
  Bots: 'bots',
  Ferramentas: 'ferramentas',
  Conhecimento: 'conhecimento',
  Sip: 'sip',
  Emoji: 'emoji',
  Figurinha: 'figurinha',
  Imagem: 'imagem',
  Video: 'video',
  Audio: 'audio',
  Arquivo: 'arquivo',
  Responder: 'responder',
  Encaminhar: 'encaminhar',
  Reagir: 'reagir',
  Postagem: 'postagem',
  Votacao: 'votacao',
  Confirmacao: 'confirmacao',
  Agendar: 'agendar',
  Grupo: 'grupo',
  ChamadaAudio: 'chamada_audio',
  ChamadaVideo: 'chamada_video',
  CompartilharTela: 'compartilhar_tela',
  Telefonia: 'telefonia',
  Ocultar: 'ocultar',
  Nome: 'nome',
  Email: 'email',
  Avatar: 'avatar',
  Senha: 'senha',
  Privacidade: 'privacidade',
  Cores: 'cores',
  ConfigChamadas: 'config_chamadas',
  Localizacao: 'localizacao',
} as const
export type CodigoPermissao = (typeof CodigoPermissao)[keyof typeof CodigoPermissao]

export interface PermissoesSistema {
  /** uso: permissão de uso do app (enviar, chamar...); as outras são de administração */
  permissoes: { codigo: string; descricao: string; uso: boolean }[]
  /** espaco: bytes dos arquivos que a pessoa enviou (cada arquivo uma vez) */
  usuarios: { id: number; nome: string; login: string; criado_em: Date | null; bot: boolean; permissoes: string[]; espaco: number }[]
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
  ia_url: string
  ia_modelo: string
  // O token nunca volta: só se está preenchido
  ia_token_configurado: boolean
  /** Cadastro pela tela de login; fechado, só quem tem a permissão Usuários cadastra */
  cadastro_aberto: boolean
  /** Modelo de embeddings da base de conhecimento (vazio desliga) */
  ia_modelo_embeddings: string
  /** Servidor de embeddings próprio (vazio: o da IA); do token só se diz se existe */
  ia_embeddings_url: string
  ia_embeddings_token_configurado: boolean
}

export interface AlteracaoParametros {
  fcm_project_id?: string
  fcm_client_email?: string
  fcm_private_key?: string
  turn_forcar_relay?: boolean
  transcritor_url?: string
  transcritor_idioma?: string
  gravacao_dias?: number
  ia_url?: string
  ia_token?: string
  ia_modelo?: string
  cadastro_aberto?: boolean
  ia_modelo_embeddings?: string
  ia_embeddings_url?: string
  ia_embeddings_token?: string
}

/** Resposta de POST /parametros/ia/testar */
/** Resposta de POST /parametros/ia/testar-embeddings */
export interface TesteEmbeddings {
  ok: boolean
  dimensoes: number
  erro: string
  milissegundos: number
}

export interface TesteIa {
  ok: boolean
  resposta: string
  erro: string
  milissegundos: number
}

export type PeriodoResumo = '24h' | '7d' | '30d' | 'recentes'

/** Assunto do resumo da conversa, com as mensagens de onde saiu */
export interface AssuntoResumo {
  titulo: string
  resumo: string
  pendencias: string[]
  mensagens: number[]
}

/** Resumo da conversa pela IA, feito em segundo plano (consulta até sair de "processando") */
export interface ResumoConversa {
  id: string
  conversa_id: number
  periodo: PeriodoResumo
  status: 'processando' | 'concluido' | 'erro'
  mensagens: number
  assuntos: AssuntoResumo[]
  erro: string
}

/** O que aconteceu com o usuário: reagiram, responderam, mencionaram, chamada perdida, pediram confirmação de leitura */
export const TipoAtividade = {
  Reacao: 1,
  Resposta: 2,
  Mencao: 3,
  ChamadaPerdida: 4,
  Confirmacao: 5,
} as const
export type TipoAtividade = (typeof TipoAtividade)[keyof typeof TipoAtividade]

export interface Atividade {
  id: number
  tipo: TipoAtividade
  criado_em: Date
  /** Ainda não concluída: confirmar a leitura pedida, ver a reação na mensagem, ler a resposta ou menção, abrir a chamada perdida ou concluir à mão */
  pendente: boolean
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
 * 1 sobre a imagem; null quando o ponteiro sai), quem está escolhendo a tela e
 * quem já está vendo a tela de alvo. O servidor avisa quando o chat da chamada
 * é criado e quando alguém que não atendeu é chamado de novo.
 */
export type SinalChamada =
  | { acao: 'tela'; ativa: boolean }
  | { acao: 'escolhendo'; ativa: boolean }
  | { acao: 'vendo'; alvo: number }
  | { acao: 'ponteiro'; alvo: number; x: number | null; y: number | null }
  | { acao: 'chat'; conversa_id: number }
  | { acao: 'participantes' }

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
  // Confirmação de leitura: quem confirmou e quando
  nome?: string
  confirmada_em?: string
  // Confirmação pedida depois do envio: como fica para quem recebe o aviso
  confirmacao?: ConfirmacaoLeitura
  // Presença: estado do contato, quando esteve ativo e se abriu a conversa
  online?: boolean
  postagem_id?: number
  estado?: EstadoPresenca
  visto_em?: string | null
  aberta?: boolean
}

// Ativo: com o Conversa visível e em uso; ausente: conectado, mas escondido ou parado
export type EstadoPresenca = 'ativo' | 'ausente' | 'offline'

export interface PresencaContato {
  estado: EstadoPresenca
  visto_em: Date | null
}

// O que o usuário mostra aos outros (Configurações > Privacidade)
export interface Privacidade {
  mostrar_visto_em: boolean
  mostrar_na_conversa: boolean
  aparecer_offline: boolean
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
