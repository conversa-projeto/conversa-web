import type { AlteracaoParametros, AnexoItem, ConfirmacaoLeitura, AnexoResponse, Atividade, BaseConhecimento, Bot, DocumentoConhecimento, TrechoConhecimento, DadosFerramenta, FerramentaEmbutida, FerramentaExterna, TesteFerramenta, Enquete, ParametrosSistema, PermissoesSistema, Chamada, ChamadaHistoricoItem, ChamadaPendente, Contato, Conversa, IceConfig, LoginResponse, SalvarSipUsuario, SipConfig, SipUsuario, Mensagem, MensagemStatusItem, PastaMensagens, StatusDestinatario, TipoChamada, TipoConteudo, TipoConversa, TranscricaoAudio, PresencaContato, Privacidade, PeriodoResumo, ResumoConversa, TesteEmbeddings, TesteIa } from '../types/api'
import { api, dados } from './eden'
import type { DadosAudio } from '../utils/dadosAudio'

// Chamadas da API pelo cliente Eden: caminho, corpo, consulta e resposta sao
// conferidos contra as rotas da API (conversa/src/rotas.ts) na compilacao.

export function login(loginValue: string, senha: string, dispositivoId?: number): Promise<LoginResponse> {
  return dados(api().login.post({
    login: loginValue,
    senha,
    ...(dispositivoId ? { dispositivo_id: dispositivoId } : {})
  }))
}

export function cadastrar(nome: string, loginValue: string, email: string, senha: string): Promise<{ id: number; nome: string; login: string; email: string }> {
  return dados(api().usuario.put({ nome, login: loginValue, email, senha }))
}

export function dispositivoAlterar(dispositivo: { id: number; nome?: string; modelo?: string; versao_so?: string; plataforma?: string; token_fcm?: string }) {
  return dados(api().dispositivo.patch(dispositivo))
}

// A API confere a senha atual antes de trocar
export function alterarSenha(senhaAtual: string, senhaNova: string) {
  return dados(api()['alterar-senha'].post({ senha_atual: senhaAtual, senha: senhaNova }))
}

export function atualizarUsuario(id: number, alteracoes: { nome?: string; email?: string; telefone?: string | null; avatar_anexo_id?: number | null } & Partial<Privacidade>) {
  return dados(api().usuario.patch({ id, ...alteracoes }))
}

export function getContatos(): Promise<Contato[]> {
  return dados(api().usuario.contatos.get())
}

export function getContatosPresenca(): Promise<Array<{ usuario_id: number } & PresencaContato>> {
  return dados(api().contatos.presenca.get())
}

// Membros com a conversa aberta agora
export function getPresentesConversa(conversaId: number): Promise<number[]> {
  return dados(api().conversa.presentes.get({ query: { conversa: conversaId } }))
}

// Sem endereço próprio (url vazio), testa no servidor da IA (url_ia)
export function testarEmbeddings(servidor: { url: string; url_ia: string; modelo: string; token?: string }): Promise<TesteEmbeddings> {
  return dados(api().parametros.ia['testar-embeddings'].post(servidor))
}

export function testarIa(servidor: { url: string; modelo: string; token?: string }): Promise<TesteIa> {
  return dados(api().parametros.ia.testar.post(servidor))
}

// Continuação do que está sendo digitado; cancelada quando a pessoa volta a digitar
export function sugerirTexto(conversaId: number, texto: string, sinal: AbortSignal): Promise<{ sugestao: string }> {
  return dados(api().ia.sugestao.post({ conversa_id: conversaId, texto }, { fetch: { signal: sinal } }))
}

export function pedirResumo(conversaId: number, periodo: PeriodoResumo): Promise<ResumoConversa> {
  return dados(api().conversa.resumo.post({ conversa_id: conversaId, periodo }))
}

export function consultarResumo(id: string): Promise<ResumoConversa> {
  return dados(api().conversa.resumo.get({ query: { id } }))
}

// Bytes dos arquivos que a própria pessoa enviou (cada arquivo uma vez)
export function getEspacoUsado(): Promise<{ bytes: number }> {
  return dados(api().usuario.espaco.get())
}

export function getPrivacidade(): Promise<Privacidade> {
  return dados(api().usuario.privacidade.get())
}

export function getConversas(): Promise<Conversa[]> {
  return dados(api().conversas.get())
}

export function getUsuariosConversa(conversaId: number): Promise<Array<{ id: number; usuario_id: number; nome: string; avatar_url?: string | null }>> {
  return dados(api().conversa.usuarios.get({ query: { conversa: conversaId } }))
}

export function removeUsuarioConversa(conversaUsuarioId: number) {
  return dados(api().conversa.usuario.delete(undefined, { query: { id: conversaUsuarioId } }))
}

// Fixadas na ordem em que aparecem; as que ficam de fora deixam de ser fixadas
export function ordenarConversasFixadas(conversas: number[]): Promise<{ conversas: number[] }> {
  return dados(api().conversa.fixadas.patch({ conversas }))
}

export function arquivarConversa(conversa: number, arquivada: boolean): Promise<{ id: number; arquivada: boolean }> {
  return dados(api().conversa.arquivada.patch({ conversa, arquivada }))
}

export function createConversa(descricao: string, tipo: TipoConversa) {
  return dados(api().conversa.put({ descricao, tipo }))
}

export function atualizarConversa(conversaId: number, alteracoes: { descricao?: string; avatar_anexo_id?: number | null; emoji?: string | null }) {
  return dados(api().conversa.patch({ id: conversaId, ...alteracoes }))
}

export function addUsuarioConversa(conversaId: number, usuarioId: number): Promise<{ id: number; conversa_id: number; usuario_id: number }> {
  return dados(api().conversa.usuario.put({ conversa_id: conversaId, usuario_id: usuarioId }))
}

export function getMensagens(conversaId: number, mensagemReferencia = 0, mensagensPrevias = 80, mensagensSeguintes = 0): Promise<Mensagem[]> {
  return dados(api().mensagens.get({
    query: {
      conversa: conversaId,
      mensagemreferencia: mensagemReferencia,
      mensagensprevias: mensagensPrevias,
      mensagensseguintes: mensagensSeguintes
    }
  }))
}

export function enviarMensagem(
  conversaId: number,
  conteudos: Array<{ ordem: number; tipo: TipoConteudo; conteudo: string }>,
  mensagemReferencia?: { tipo: number; origem_mensagem_id: number },
  visivelEm?: Date | null,
  // Pede confirmação de leitura: de todos (true) ou só de quem está na lista
  pedeConfirmacao: boolean | number[] = false,
  // Postagem (com título opcional) ou resposta a uma postagem
  postagem?: { titulo: string | null } | { respondendo: number },
): Promise<{ id: number; conversa_id: number; usuario_id: number }> {
  return dados(api().mensagem.put({
    conversa_id: conversaId,
    conteudos,
    ...(mensagemReferencia ? { mensagem_referencia: mensagemReferencia } : {}),
    ...(visivelEm ? { visivel_em: visivelEm.toISOString() } : {}),
    ...(pedeConfirmacao ? { pede_confirmacao: true } : {}),
    ...(Array.isArray(pedeConfirmacao) ? { confirmacao_usuarios: pedeConfirmacao } : {}),
    ...(postagem && 'titulo' in postagem ? { postagem: { titulo: postagem.titulo } } : {}),
    ...(postagem && 'respondendo' in postagem ? { postagem_id: postagem.respondendo } : {})
  }))
}

export function getRespostasPostagem(postagemId: number): Promise<Mensagem[]> {
  return dados(api().postagem.respostas.get({ query: { id: postagemId } }))
}

export function visualizarPostagem(postagemId: number) {
  return dados(api().postagem.visualizar.post({ postagem_id: postagemId }))
}

export function confirmarLeitura(mensagemId: number) {
  return dados(api().mensagem.confirmar.post({ mensagem_id: mensagemId }))
}

// Quem enviou passa a pedir confirmação numa mensagem já enviada (até 24 horas depois)
export function pedirConfirmacao(mensagemId: number, usuarios: number[] | null): Promise<ConfirmacaoLeitura> {
  return dados(api().mensagem['pedir-confirmacao'].post({ mensagem_id: mensagemId, ...(usuarios ? { usuarios } : {}) }))
}

export function deletarMensagem(id: number) {
  return dados(api().mensagem.delete(undefined, { query: { id } }))
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

export async function uploadAnexo(tipo: TipoConteudo, nome: string, extensao: string, data: Blob, onProgress?: (percent: number) => void, audio?: DadosAudio | null): Promise<AnexoResponse> {
  const identificador = await sha256File(data)

  const existe = await dados(api().anexo.existe.get({ query: { identificador } }))

  if ('id' in existe) {
    if (onProgress) onProgress(100)
    return { id: existe.id, identificador }
  }

  const presign = await dados(api().anexo.put({
    identificador,
    tipo,
    nome,
    extensao,
    tamanho: data.size,
    ...(audio ? { duracao: audio.duracao, intensidade: audio.intensidade } : {})
  }))

  await uploadMinio(presign.upload_url, data, onProgress)
  return { id: Number(presign.id), identificador }
}

export function getAnexoUrl(identificador: string): Promise<string> {
  return dados(api().anexo.get({ query: { identificador } })).then(res => res.url)
}

export function getTranscricao(identificador: string): Promise<TranscricaoAudio> {
  return dados(api().anexo.transcricao.get({ query: { identificador } }))
}

export function transcreverAudio(identificador: string): Promise<TranscricaoAudio> {
  return dados(api().anexo.transcricao.put({ identificador }))
}

export function reagirMensagem(mensagemId: number, emoji: string): Promise<{ mensagem_id: number; emoji: string; acao: string }> {
  return dados(api().mensagem.reacao.put({ mensagem_id: mensagemId, emoji }))
}

// A API pesquisa sempre como o usuario do token
export function pesquisarMensagens(texto: string, conversaId?: number): Promise<Mensagem[]> {
  return dados(api().pesquisar.get({ query: { texto, conversa: conversaId ?? 0 } }))
}

export function getMensagensNovas(desde: Date | null): Promise<Array<{ conversa_id: number; mensagem_id: number; ate: Date }>> {
  return dados(api().mensagens.novas.get({ query: { desde: desde ? desde.toISOString() : '' } }))
}

export function mensagemVisualizar(conversaId: number, mensagemId: number): Promise<{ sucesso: boolean }> {
  return dados(api().mensagem.visualizar.post({ conversa: conversaId, mensagem: mensagemId }))
}

export function mensagemReproduzir(conversaId: number, mensagemId: number): Promise<{ sucesso: boolean }> {
  return dados(api().mensagem.reproduzir.post({ conversa: conversaId, mensagem: mensagemId }))
}

export function mensagemStatus(conversaId: number, mensagemIds: number[]): Promise<MensagemStatusItem[]> {
  if (mensagemIds.length === 0) {
    return Promise.resolve([])
  }
  return dados(api().mensagem.status.get({ query: { conversa: conversaId, mensagem: mensagemIds.join(',') } }))
}

export function getDetalheStatusMensagem(mensagemId: number): Promise<StatusDestinatario[]> {
  return dados(api().mensagem.status.detalhe.get({ query: { id: mensagemId } }))
}

// === Chamada (Call) ===

export function chamadaIniciar(tipo: TipoChamada, usuarios: Array<{ id: number }>, conversaId?: number | null): Promise<Chamada> {
  return dados(api().chamada.iniciar.put({ tipo, usuarios, ...(conversaId ? { conversa_id: conversaId } : {}) }))
}

export function chamadaCancelar(chamadaId: number): Promise<{ id: number }> {
  return dados(api().chamada.cancelar.post({ id: chamadaId }))
}

export function chamadaEntrar(chamadaId: number): Promise<{ id: number }> {
  return dados(api().chamada.entrar.post({ id: chamadaId }))
}

// naoAtendeu: o app recusou sozinho a chamada que tocou sem resposta (vira
// chamada perdida nas atividades)
export function chamadaRecusar(chamadaId: number, naoAtendeu = false): Promise<{ id: number }> {
  return dados(api().chamada.recusar.post({ id: chamadaId, ...(naoAtendeu ? { nao_atendeu: true } : {}) }))
}

// --- Votação (enquete) em grupo ---

export function criarEnquete(conversaId: number, pergunta: string, opcoes: string[], multipla: boolean, encerraEm: Date | null = null) {
  return dados(api().enquete.put({ conversa_id: conversaId, pergunta, opcoes, multipla, encerra_em: encerraEm?.toISOString() ?? null }))
}

export function getEnquete(id: number): Promise<Enquete> {
  return dados(api().enquete.get({ query: { id } }))
}

// O voto do usuário passa a ser exatamente estas opções (vazio tira o voto)
export function votarEnquete(id: number, opcoes: number[]): Promise<Enquete> {
  return dados(api().enquete.votar.post({ enquete_id: id, opcoes }))
}

// Encerra antes do prazo (quem criou a votação ou o grupo)
export function encerrarEnquete(id: number): Promise<Enquete> {
  return dados(api().enquete.encerrar.post({ enquete_id: id }))
}

// Define, adia ou tira (null) a data final (quem criou a votação)
export function alterarPrazoEnquete(id: number, encerraEm: Date | null): Promise<Enquete> {
  return dados(api().enquete.patch({ enquete_id: id, encerra_em: encerraEm?.toISOString() ?? null }))
}

// --- Permissões e parâmetros do sistema ---

export function getMinhasPermissoes(): Promise<string[]> {
  return dados(api().usuario.permissoes.get())
}

// Público: se a tela de login oferece o cadastro
export function getCadastro(): Promise<{ aberto: boolean }> {
  return dados(api().cadastro.get())
}

export function cadastrarUsuario(campos: {
  nome: string
  login?: string
  email?: string
  senha?: string
  avatar_anexo_id?: number | null
  bot?: boolean
  instrucoes?: string
  /** Sem a lista, o padrão do servidor (pessoa com todas as de uso, bot com o básico) */
  permissoes?: string[]
}): Promise<{ id: number; nome: string; login: string; bot: boolean }> {
  return dados(api().usuario.novo.put(campos))
}

export function getRecursos(): Promise<{ transcricao: boolean; ia: boolean; conhecimento: boolean }> {
  return dados(api().recursos.get())
}

export function getPermissoes(): Promise<PermissoesSistema> {
  return dados(api().permissoes.get())
}

export function getBots(): Promise<Bot[]> {
  return dados(api().bots.get())
}

export function criarBot(nome: string, instrucoes: string): Promise<Bot> {
  return dados(api().bot.put({ nome, instrucoes }))
}

export function alterarBot(id: number, campos: { nome?: string; instrucoes?: string; ativo?: boolean }): Promise<Bot> {
  return dados(api().bot.patch({ id, ...campos }))
}

export function excluirBot(id: number): Promise<{ id: number; apagado: boolean }> {
  return dados(api().bot.delete(undefined, { query: { id } }))
}

export function definirConhecimentoBot(id: number, bases: number[]): Promise<Bot> {
  return dados(api().bot.conhecimento.put({ id, bases }))
}

export function getBasesConhecimento(): Promise<BaseConhecimento[]> {
  return dados(api().conhecimento.bases.get())
}

// Para a tela do bot
export function getBasesDisponiveis(): Promise<Pick<BaseConhecimento, 'id' | 'nome' | 'descricao'>[]> {
  return dados(api().conhecimento.disponiveis.get())
}

export function incluirBaseConhecimento(nome: string, descricao: string): Promise<BaseConhecimento> {
  return dados(api().conhecimento.base.put({ nome, descricao }))
}

export function alterarBaseConhecimento(id: number, nome: string, descricao: string): Promise<BaseConhecimento> {
  return dados(api().conhecimento.base.patch({ id, nome, descricao }))
}

export function excluirBaseConhecimento(id: number): Promise<{ id: number }> {
  return dados(api().conhecimento.base.delete(undefined, { query: { id } }))
}

export function getDocumentosConhecimento(base: number): Promise<DocumentoConhecimento[]> {
  return dados(api().conhecimento.documentos.get({ query: { base } }))
}

export function incluirDocumentoConhecimento(base: number, nome: string, texto: string): Promise<DocumentoConhecimento> {
  return dados(api().conhecimento.documento.put({ base_id: base, nome, texto }))
}

export function excluirDocumentoConhecimento(id: number): Promise<{ id: number }> {
  return dados(api().conhecimento.documento.delete(undefined, { query: { id } }))
}

export function buscarConhecimento(bases: number[], pergunta: string): Promise<TrechoConhecimento[]> {
  return dados(api().conhecimento.buscar.post({ bases, pergunta }))
}

export function reindexarConhecimento(): Promise<{ documentos: number }> {
  return dados(api().conhecimento.reindexar.post())
}

export function definirFerramentasBot(id: number, ferramentas: number[]): Promise<Bot> {
  return dados(api().bot.ferramentas.put({ id, ferramentas }))
}

export function getFerramentas(): Promise<FerramentaExterna[]> {
  return dados(api().ferramentas.get())
}

// Para a tela do bot: só nome e descrição
export function getFerramentasDisponiveis(): Promise<Pick<FerramentaExterna, 'id' | 'nome' | 'descricao'>[]> {
  return dados(api().ferramentas.disponiveis.get())
}

// As embutidas (base de conhecimento), só para ver
export function getFerramentasEmbutidas(): Promise<FerramentaEmbutida[]> {
  return dados(api().ferramentas.embutidas.get())
}

export function incluirFerramenta(campos: DadosFerramenta): Promise<FerramentaExterna> {
  return dados(api().ferramenta.put(campos))
}

export function alterarFerramenta(id: number, campos: DadosFerramenta): Promise<FerramentaExterna> {
  return dados(api().ferramenta.patch({ id, ...campos }))
}

export function excluirFerramenta(id: number): Promise<{ id: number }> {
  return dados(api().ferramenta.delete(undefined, { query: { id } }))
}

export function testarFerramenta(id: number, argumentos: Record<string, unknown>): Promise<TesteFerramenta> {
  return dados(api().ferramenta.testar.post({ id, argumentos }))
}

export function definirPermissoesBot(id: number, permissoes: string[]): Promise<Bot> {
  return dados(api().bot.permissoes.put({ id, permissoes }))
}

export function concederPermissao(usuarioId: number, codigo: string): Promise<{ usuario_id: number; codigo: string }> {
  return dados(api().permissao.usuario.put({ usuario_id: usuarioId, codigo }))
}

export function retirarPermissao(usuarioId: number, codigo: string): Promise<{ usuario_id: number; codigo: string }> {
  return dados(api().permissao.usuario.delete(undefined, { query: { usuario_id: usuarioId, codigo } }))
}

export function getParametros(): Promise<ParametrosSistema> {
  return dados(api().parametros.get())
}

export function alterarParametros(alteracao: AlteracaoParametros): Promise<ParametrosSistema> {
  return dados(api().parametros.patch(alteracao))
}

// --- Atividades ---

// Mais recentes primeiro; antes é o id da última atividade já carregada
export function getAtividades(antes = 0, limite = 30): Promise<Atividade[]> {
  return dados(api().atividades.get({ query: { antes, limite } }))
}

export function getAtividadesNovas(): Promise<{ quantidade: number }> {
  return dados(api().atividades.novas.get())
}

export function concluirAtividade(id: number): Promise<{ sucesso: boolean }> {
  return dados(api().atividade.concluir.post({ id }))
}

// As próprias mensagens que receberam reação apareceram na tela
export function concluirReacoesVistas(mensagens: number[]): Promise<{ concluidas: number }> {
  return dados(api().atividades['reacoes-vistas'].post({ mensagens }))
}

export function chamadaSair(chamadaId: number): Promise<{ id: number }> {
  return dados(api().chamada.sair.post({ id: chamadaId }))
}

export function chamadaFinalizar(chamadaId: number): Promise<{ id: number }> {
  return dados(api().chamada.finalizar.post({ id: chamadaId }))
}

export function chamadaDados(chamadaId: number): Promise<Chamada> {
  return dados(api().chamada.dados.get({ query: { id: chamadaId } }))
}

// Grupo do chat da chamada; criado na primeira vez que alguém pede
export function chamadaChat(chamadaId: number): Promise<{ conversa_id: number }> {
  return dados(api().chamada.chat.put({ id: chamadaId }))
}

export function chamadaAdicionarUsuario(chamadaId: number, usuarioId: number): Promise<{ id: number }> {
  return dados(api().chamada.usuario.put({ chamada_id: chamadaId, usuario_id: usuarioId }))
}

// Quem recusou ou não atendeu volta a tocar
export function chamadaChamarNovamente(chamadaId: number, usuarioId: number): Promise<Chamada> {
  return dados(api().chamada['chamar-novamente'].post({ chamada_id: chamadaId, usuario_id: usuarioId }))
}

export function chamadaVideo(chamadaId: number) {
  return dados(api().chamada.video.post({ id: chamadaId }))
}

export function getChamadasPendentes(): Promise<ChamadaPendente[]> {
  return dados(api().chamadas.pendentes.get())
}

export function getChamadas(filtros?: { participante?: number; de?: string; ate?: string }): Promise<ChamadaHistoricoItem[]> {
  return dados(api().chamadas.get({
    query: {
      participante: filtros?.participante ?? 0,
      de: filtros?.de ?? '',
      ate: filtros?.ate ?? ''
    }
  }))
}

export function getAnexos(filtros?: {
  conversa?: number
  autor?: number
  direcao?: 'enviados' | 'recebidos'
  tipos?: number[]
  antes?: number
  limite?: number
}): Promise<AnexoItem[]> {
  return dados(api().anexos.get({
    query: {
      conversa: filtros?.conversa ?? 0,
      autor: filtros?.autor ?? 0,
      direcao: filtros?.direcao ?? '',
      tipos: filtros?.tipos?.join(',') ?? '',
      antes: filtros?.antes ?? 0,
      limite: filtros?.limite ?? 0
    }
  }))
}

export function digitando(conversaId: number) {
  return dados(api().conversa.digitando.post({ id: conversaId }))
}

export function gravandoAudio(conversaId: number) {
  return dados(api().conversa.gravando.post({ id: conversaId }))
}

function temRamal<T extends { id: number }>(sip: T | Record<string, never>): sip is T {
  return 'id' in sip
}

// Sem ramal cadastrado a API devolve {}; aqui vira null
export async function getSip(): Promise<SipConfig | null> {
  const sip = await dados(api().sip.get())
  return temRamal(sip) ? sip : null
}

// Ramal de outra pessoa, pelo administrador (permissão "sip"). Sem ramal, null
export async function getSipUsuario(usuarioId: number): Promise<SipUsuario | null> {
  const sip = await dados(api().sip.usuario.get({ query: { usuario_id: usuarioId } }))
  return temRamal(sip) ? sip : null
}

export async function salvarSipUsuario(sip: SalvarSipUsuario): Promise<SipUsuario> {
  const salvo = await dados(api().sip.usuario.put(sip))
  if (!temRamal(salvo)) throw new Error('O ramal não foi salvo.')
  return salvo
}

export async function excluirSipUsuario(usuarioId: number) {
  await dados(api().sip.usuario.delete(undefined, { query: { usuario_id: usuarioId } }))
}

export function getIceServers(): Promise<IceConfig> {
  return dados(api().ice.get())
}

// --- Pastas de mensagens (conversa direta) ---

export function getPastas(conversaId: number): Promise<PastaMensagens[]> {
  return dados(api().pastas.get({ query: { conversa: conversaId } }))
}

export function criarPasta(conversaId: number, nome: string, cor: string, compartilhada: boolean): Promise<PastaMensagens> {
  return dados(api().pasta.put({ conversa_id: conversaId, nome, cor, compartilhada }))
}

// Só quem criou a pasta muda o nome, a cor e se é compartilhada
export function alterarPasta(id: number, alteracoes: { nome?: string; cor?: string; compartilhada?: boolean }): Promise<PastaMensagens> {
  return dados(api().pasta.patch({ id, ...alteracoes }))
}

export function excluirPasta(id: number) {
  return dados(api().pasta.delete(undefined, { query: { id } }))
}

// Da mais antiga à mais nova, de 50 em 50; antes = id da mais antiga já carregada
export function getMensagensDaPasta(id: number, antes = 0): Promise<Mensagem[]> {
  return dados(api().pasta.mensagens.get({ query: { id, antes } }))
}

export function porMensagensNaPasta(pastaId: number, mensagens: number[]) {
  return dados(api().pasta.mensagens.put({ pasta_id: pastaId, mensagens }))
}

export function tirarMensagensDaPasta(pastaId: number, mensagens: number[]) {
  return dados(api().pasta.mensagens.delete({ pasta_id: pastaId, mensagens }))
}
