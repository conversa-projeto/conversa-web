import { ref } from 'vue'

// Cores do sistema escolhidas pelo usuario, por cima das definidas em style.css.
// Ficam no localStorage, separadas por tema, porque as superficies do tema
// claro e do escuro sao diferentes.

export type TemaCores = 'claro' | 'escuro'
type CoresTema = Record<string, string>
type Personalizacao = Record<TemaCores, CoresTema>

export interface TomCor {
  tom: string
  // Onde a cor aparece no app, para ajudar a escolher
  uso: string
}

export interface GrupoCores {
  id: string
  titulo: string
  descricao: string
  tons: TomCor[]
}

// So entram os tons que alguma tela usa: mudar os outros nao teria efeito.
function escala(usos: Record<string, string>): TomCor[] {
  return Object.entries(usos).map(([tom, uso]) => ({ tom, uso }))
}

export const GRUPOS_CORES: GrupoCores[] = [
  {
    id: 'primary',
    titulo: 'Principal',
    descricao: 'Suas mensagens, botões, links e destaques',
    tons: escala({
      '50': 'Menção a alguém numa mensagem recebida; fundo de botões de ícone ao passar o mouse (Anexos, Chamadas)',
      '100': 'Fundo dos avatares sem foto; links, menções e botões dentro das suas mensagens',
      '200': 'Contorno do avatar ao passar o mouse; horário e nome do arquivo nos áudios que você enviou',
      '300': 'Fundo da reação que você fez (tema claro); texto das etiquetas no tema escuro',
      '400': 'Borda da reação que você fez; contorno do campo de busca em foco',
      '500': 'Links, borda dos campos em foco, "digitando...", barra da citação ao responder e carregamentos',
      '600': 'Fundo das suas mensagens, dos botões principais e da aba ou filtro selecionado',
      '700': 'Botões principais ao passar o mouse; iniciais nos avatares; texto das etiquetas',
      '800': 'Fundo da reação que você fez (tema escuro)',
      '900': 'Fundo das etiquetas e das menções no tema escuro',
    }),
  },
  {
    id: 'surface',
    titulo: 'Superfícies',
    descricao: 'Fundos, bordas e textos. No tema escuro a escala é invertida: os tons baixos são escuros',
    tons: [
      { tom: 'base', uso: 'Fundo de janelas, menus, cabeçalho da conversa e campo de mensagem' },
      ...escala({
        '50': 'Conversa selecionada na lista, cartões das configurações e campos de busca',
        '100': 'Fundo da área de mensagens e dos campos de texto; itens de menu ao passar o mouse',
        '200': 'Barra de navegação, lista de conversas e botões ao passar o mouse; mensagens recebidas (tema escuro)',
        '300': 'Bordas de campos e cartões; mensagens recebidas (tema claro)',
        '400': 'Ícones de fechar, bordas fortes e avatares sem foto nas listas',
        '500': 'Textos secundários: horários, legendas e dicas dos campos',
        '600': 'Ícones dos botões (cabeçalho, anexar, emoji) e rótulos dos formulários',
        '700': 'Textos de menus e de botões secundários',
        '800': 'Texto principal das mensagens e das telas',
        '900': 'Títulos das janelas; véu atrás das janelas abertas',
      }),
      { tom: '950', uso: 'Véu atrás da janela de agendar mensagem e da lista de anexos' },
    ],
  },
  {
    id: 'success',
    titulo: 'Sucesso',
    descricao: 'Confirmações, atender chamada e estados positivos',
    tons: escala({
      '50': 'Fundo das mensagens de sucesso (perfil salvo, membro adicionado)',
      '100': 'Fundo do ícone "Código" no menu de anexos, da chamada atendida e das etiquetas "Ativo" e "Permitido"',
      '300': 'Ícone de chamada atendida na sua mensagem de chamada; ícone "Código" no menu de anexos (tema escuro)',
      '400': 'Indicador de chamada ativa; texto de sucesso no tema escuro',
      '500': 'Bolinha de contato online, botão de atender, ramal conectado, chamadas recebidas no histórico e áudio ainda não ouvido',
      '600': 'Botões de adicionar na chamada; atender ao passar o mouse; ícone "Código"',
      '700': 'Botões verdes ao passar o mouse; texto das mensagens de sucesso',
      '900': 'Fundo das mensagens de sucesso no tema escuro',
    }),
  },
  {
    id: 'danger',
    titulo: 'Perigo',
    descricao: 'Erros, exclusões e encerrar chamada',
    tons: escala({
      '50': 'Fundo das mensagens de erro; fundo das ações de excluir ao passar o mouse',
      '100': 'Fundo da chamada perdida ou recusada e das etiquetas "Bloqueado"',
      '200': 'Texto da chamada perdida na sua mensagem de chamada',
      '300': 'Ícone de chamada perdida na sua mensagem de chamada; borda do botão de cancelar gravação e dos avisos de erro',
      '400': 'Texto de erro no tema escuro',
      '500': 'Botão de desligar, gravação de áudio em andamento (com o brilho acima do campo) e chamadas perdidas no histórico',
      '600': 'Botões de desligar e de excluir, aviso de erro no topo da tela e filtro "Perdidas"',
      '700': 'Texto das mensagens de erro; botão de desligar ao passar o mouse',
      '800': 'Fundo dos botões de perigo ao passar o mouse (tema escuro)',
      '900': 'Fundo das mensagens de erro no tema escuro',
    }),
  },
  {
    id: 'info',
    titulo: 'Informação',
    descricao: 'Confirmação de leitura e ícone de arquivo',
    tons: escala({
      '100': 'Fundo do ícone "Arquivo" no menu de anexos',
      '300': 'Confirmação de leitura (✓✓) nas suas mensagens; ícone "Arquivo" no tema escuro',
      '600': 'Ícone "Arquivo" no menu de anexos',
      '900': 'Fundo do ícone "Arquivo" no tema escuro',
    }),
  },
  {
    id: 'warning',
    titulo: 'Alerta',
    descricao: 'Mensagens agendadas, busca e chamada tocando',
    tons: escala({
      '50': 'Fundo dos resultados da busca na conversa e dos avisos de atenção',
      '100': 'Etiqueta "Agendada" nas mensagens; permissão pendente; microfone mudo no discador',
      '200': 'Destaque do termo encontrado na pesquisa; borda dos resultados da busca',
      '300': 'Ícone de chamada não atendida na sua mensagem de chamada; texto da etiqueta "Agendada" e da busca no tema escuro',
      '400': 'Indicador de chamada tocando e de ramal conectando; contorno da mensagem ao ir até ela (resposta, busca)',
      '500': 'Ícone de chamada não atendida na mensagem de chamada',
      '600': 'Ícone de microfone mudo no discador',
      '700': 'Texto da etiqueta "Agendada" e dos avisos de atenção',
      '800': 'Texto dos resultados da busca; destaque da pesquisa no tema escuro',
      '900': 'Fundo da etiqueta "Agendada" e dos avisos no tema escuro',
    }),
  },
  {
    id: 'chamada',
    titulo: 'Chamada',
    descricao: 'Janela e barra da chamada, que são escuras nos dois temas',
    tons: escala({
      '300': 'Textos secundários da chamada: duração, iniciais dos participantes e modos de exibição',
      '500': 'Modo de exibição selecionado (Grade, Destaque, Tela única)',
      '600': 'Botões da chamada ao passar o mouse',
      '700': 'Botões, etiquetas, bordas e fundo de quem está sem vídeo',
      '800': 'Cabeçalho, barra de controles, barra de chamada e fundo dos vídeos',
      '900': 'Fundo da janela de chamada',
    }),
  },
]

const CHAVE = 'conversa.cores'
const ID_ESTILO = 'conversa-cores-personalizadas'

export function nomeVariavelCor(grupo: string, tom: string) {
  return `--color-${grupo}-${tom}`
}

function ler(): Personalizacao {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || '{}')
    return { claro: salvo.claro || {}, escuro: salvo.escuro || {} }
  } catch {
    return { claro: {}, escuro: {} }
  }
}

const personalizacao = ref<Personalizacao>(ler())

function blocoCss(seletor: string, cores: CoresTema) {
  const linhas = Object.entries(cores).map(([nome, valor]) => `${nome}:${valor};`)
  return linhas.length ? `${seletor}{${linhas.join('')}}` : ''
}

// Seletores com html na frente vencem o :root e o .dark do style.css.
function aplicar() {
  let estilo = document.getElementById(ID_ESTILO)
  if (!estilo) {
    estilo = document.createElement('style')
    estilo.id = ID_ESTILO
    document.head.appendChild(estilo)
  }
  estilo.textContent = blocoCss('html:not(.dark)', personalizacao.value.claro)
    + blocoCss('html.dark', personalizacao.value.escuro)
}

function salvar() {
  localStorage.setItem(CHAVE, JSON.stringify(personalizacao.value))
  aplicar()
}

// Cores padrao de cada tema, lidas das regras :root e .dark do style.css.
function lerPadroes(): Personalizacao {
  const claro: CoresTema = {}
  const escuro: CoresTema = {}
  for (const folha of Array.from(document.styleSheets)) {
    let regras: CSSRuleList
    try {
      regras = folha.cssRules
    } catch {
      continue
    }
    for (const regra of Array.from(regras)) {
      if (!(regra instanceof CSSStyleRule)) continue
      const destino = regra.selectorText === ':root' ? claro : regra.selectorText === '.dark' ? escuro : null
      if (!destino) continue
      for (const nome of Array.from(regra.style)) {
        if (nome.startsWith('--color-')) destino[nome] = regra.style.getPropertyValue(nome).trim().toLowerCase()
      }
    }
  }
  return { claro, escuro: { ...claro, ...escuro } }
}

// Outra janela do app (popup de conversa) alterou as cores.
window.addEventListener('storage', (evento) => {
  if (evento.key !== CHAVE) return
  personalizacao.value = ler()
  aplicar()
})

aplicar()

export function useCoresPersonalizadas() {
  function definirCor(tema: TemaCores, nome: string, valor: string) {
    personalizacao.value[tema][nome] = valor
    salvar()
  }

  function restaurarCores(tema: TemaCores, nomes?: string[]) {
    if (nomes) {
      for (const nome of nomes) delete personalizacao.value[tema][nome]
    } else {
      personalizacao.value[tema] = {}
    }
    salvar()
  }

  return { personalizacao, lerPadroes, definirCor, restaurarCores }
}
