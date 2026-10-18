import { CodigoPermissao } from '../types/api'

// Nome curto de cada permissão nas telas Acessos e Bots
export const NOMES_PERMISSAO: Record<string, string> = {
  [CodigoPermissao.Parametros]: 'Sistema',
  [CodigoPermissao.Permissoes]: 'Pessoas',
  [CodigoPermissao.Bots]: 'Bots',
  [CodigoPermissao.Ferramentas]: 'Ferramentas',
  [CodigoPermissao.Conhecimento]: 'Conhecimento',
  [CodigoPermissao.Sip]: 'Configurar o SIP',
  [CodigoPermissao.Emoji]: 'Emojis no texto',
  [CodigoPermissao.Figurinha]: 'Figurinhas',
  [CodigoPermissao.Imagem]: 'Imagens',
  [CodigoPermissao.Video]: 'Vídeos',
  [CodigoPermissao.Audio]: 'Áudios e gravações',
  [CodigoPermissao.Arquivo]: 'Arquivos',
  [CodigoPermissao.Localizacao]: 'Localização e trajeto',
  [CodigoPermissao.Responder]: 'Responder',
  [CodigoPermissao.Encaminhar]: 'Encaminhar',
  [CodigoPermissao.Reagir]: 'Reagir',
  [CodigoPermissao.Agendar]: 'Agendar mensagens',
  [CodigoPermissao.Confirmacao]: 'Pedir confirmação de leitura',
  [CodigoPermissao.Grupo]: 'Criar grupos',
  [CodigoPermissao.Postagem]: 'Postagens',
  [CodigoPermissao.Votacao]: 'Votações',
  [CodigoPermissao.ChamadaAudio]: 'Chamadas de áudio',
  [CodigoPermissao.ChamadaVideo]: 'Chamadas de vídeo',
  [CodigoPermissao.CompartilharTela]: 'Compartilhar a tela',
  [CodigoPermissao.Telefonia]: 'Telefonia (SIP)',
  [CodigoPermissao.Ocultar]: 'Ocultar mensagens',
  [CodigoPermissao.Nome]: 'Mudar o nome',
  [CodigoPermissao.Email]: 'Mudar o e-mail e telefone',
  [CodigoPermissao.Avatar]: 'Mudar o avatar',
  [CodigoPermissao.Senha]: 'Trocar a senha',
  [CodigoPermissao.Privacidade]: 'Mudar a privacidade',
  [CodigoPermissao.Cores]: 'Mudar as cores',
  [CodigoPermissao.ConfigChamadas]: 'Configurações de chamada',
}

// As permissões de uso, na ordem e nos grupos em que aparecem
export const GRUPOS_USO: { titulo: string; codigos: string[] }[] = [
  { titulo: 'Enviar', codigos: [CodigoPermissao.Emoji, CodigoPermissao.Figurinha, CodigoPermissao.Imagem, CodigoPermissao.Video, CodigoPermissao.Audio, CodigoPermissao.Arquivo, CodigoPermissao.Localizacao] },
  { titulo: 'Mensagens', codigos: [CodigoPermissao.Responder, CodigoPermissao.Encaminhar, CodigoPermissao.Reagir, CodigoPermissao.Agendar, CodigoPermissao.Confirmacao, CodigoPermissao.Ocultar] },
  { titulo: 'Grupos', codigos: [CodigoPermissao.Grupo, CodigoPermissao.Postagem, CodigoPermissao.Votacao] },
  { titulo: 'Chamadas', codigos: [CodigoPermissao.ChamadaAudio, CodigoPermissao.ChamadaVideo, CodigoPermissao.CompartilharTela, CodigoPermissao.Telefonia] },
  { titulo: 'Configurações', codigos: [CodigoPermissao.Nome, CodigoPermissao.Email, CodigoPermissao.Avatar, CodigoPermissao.Senha, CodigoPermissao.Privacidade, CodigoPermissao.Cores, CodigoPermissao.ConfigChamadas] },
]
