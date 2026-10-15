// Temas prontos: a cor principal e os fundos inspirados em outros apps de
// conversa (e os balões das mensagens, quando diferem: --bolha-* e
// --gradiente-enviada). Ficam por baixo das cores ajustadas à mão (useCoresPersonalizadas);
// o padrão é o do style.css, sem nada por cima.

export interface TemaPredefinido {
  id: string
  nome: string
  claro: Record<string, string>
  escuro: Record<string, string>
}

function principal(tons: [string, string, string, string, string, string, string, string, string, string]) {
  const nomes = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  return Object.fromEntries(nomes.map((tom, i) => [`--color-primary-${tom}`, tons[i]!]))
}

// Fundos e bordas (os textos ficam os do Conversa)
function fundos(base: string, f50: string, f100: string, f200: string, f300: string, f400: string) {
  return {
    '--color-surface-base': base,
    '--color-surface-50': f50,
    '--color-surface-100': f100,
    '--color-surface-200': f200,
    '--color-surface-300': f300,
    '--color-surface-400': f400,
  }
}

export const TEMA_PADRAO = 'padrao'

// Os balões enviados do Messenger: um degradê preso à tela, que muda de cor
// conforme a mensagem sobe (as bolhas usam --gradiente-enviada quando existe)
const GRADIENTE_MESSENGER = 'linear-gradient(#811bfd, #4840fa, #2657f8)'

export const TEMAS_PREDEFINIDOS: TemaPredefinido[] = [
  { id: TEMA_PADRAO, nome: 'Padrão', claro: {}, escuro: {} },
  {
    id: 'teams',
    nome: 'Teams',
    claro: principal(['#f5f5fc', '#e8ebfa', '#c5cbfa', '#aab1fa', '#9299f7', '#7f85f5', '#5b5fc7', '#4f52b2', '#444791', '#383966']),
    escuro: {
      ...principal(['#f7f0ff', '#e8dcfe', '#9981c5', '#8474d2', '#6c62b7', '#7f85f5', '#2b2b40', '#2b2b40', '#2b2b40', '#2b2b40']),
      ...fundos('#1f1f1f', '#333333', '#141414', '#1f1f1f', '#2b2b2b', '#3d3d3d'),
      '--bolha-recebida': '#292929',
    },
  },
  {
    id: 'whatsapp',
    nome: 'WhatsApp',
    claro: {
      ...principal(['#f0faf6', '#d9fdd3', '#b3f0dc', '#7ae3c3', '#25d366', '#00a884', '#008069', '#017561', '#025144', '#063d35']),
      ...fundos('#ffffff', '#f6f5f4', '#f5f2ea', '#ffffff', '#e9edef', '#d1d7db'),
      // Enviada verde-clara com texto escuro e recebida branca
      '--bolha-enviada': '#d9fdd3',
      '--bolha-enviada-texto': '#111b21',
      '--bolha-enviada-suave': '#54656f',
      '--bolha-enviada-destaque': '#027eb5',
      '--bolha-enviada-sucesso': '#008069',
      '--bolha-enviada-perigo': '#e11d48',
      '--bolha-recebida': '#ffffff',
    },
    escuro: {
      ...principal(['#effcf7', '#d9fdd3', '#8fe3c5', '#4fd1a5', '#21c063', '#00a884', '#144d37', '#103f2d', '#0d3324', '#0a291d']),
      ...fundos('#161717', '#2f2f2f', '#171717', '#242626', '#2e2f2f', '#3b3d3c'),
    },
  },
  {
    id: 'messenger',
    nome: 'Messenger',
    claro: {
      ...principal(['#f2f0ff', '#e3e0ff', '#c4bdfd', '#a39afc', '#7d70fb', '#5b54fb', '#4840fa', '#3a33d6', '#2d28a8', '#211d7a']),
      '--gradiente-enviada': GRADIENTE_MESSENGER,
    },
    escuro: {
      ...principal(['#f2f0ff', '#e3e0ff', '#c4bdfd', '#a39afc', '#7d70fb', '#5b54fb', '#4840fa', '#3a33d6', '#2d28a8', '#211d7a']),
      ...fundos('#1f1f1f', '#2a2b2c', '#1f1f1f', '#191919', '#3a3b3c', '#4e4f50'),
      '--bolha-recebida': '#3e4042',
      '--gradiente-enviada': GRADIENTE_MESSENGER,
    },
  },
]
