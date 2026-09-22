// Diagramas Mermaid nas mensagens: blocos ```mermaid e os que vêm dentro de
// um bloco Markdown. A biblioteca é carregada só no primeiro diagrama.
// securityLevel 'strict': o texto vem de mensagens de outras pessoas, então o
// diagrama não roda script nem cria link clicável.

type Mermaid = typeof import('mermaid').default

let carregando: Promise<Mermaid> | null = null
let contador = 0

export function ehLinguagemMermaid(linguagem?: string) {
  return (linguagem || '').toLowerCase() === 'mermaid'
}

// SVG do diagrama, ou null se o texto não for um diagrama válido.
export async function renderizarMermaid(codigo: string, escuro: boolean): Promise<string | null> {
  carregando ??= import('mermaid').then((modulo) => modulo.default)
  const mermaid = await carregando
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: escuro ? 'dark' : 'default' })
  const id = `mermaid-${++contador}`
  try {
    if (!(await mermaid.parse(codigo, { suppressErrors: true }))) return null
    const { svg } = await mermaid.render(id, codigo)
    return svg
  } catch {
    // Em erro o Mermaid pode deixar o elemento temporário no body
    document.getElementById(id)?.remove()
    document.getElementById(`d${id}`)?.remove()
    return null
  }
}

// Troca os blocos de código mermaid de um HTML de Markdown (já limpo) pelos
// diagramas. Os que não forem válidos ficam como código.
export async function substituirMermaidNoHtml(html: string, escuro: boolean): Promise<string> {
  if (!html.includes('language-mermaid')) return html
  const modelo = document.createElement('template')
  modelo.innerHTML = html
  for (const codigo of Array.from(modelo.content.querySelectorAll('pre > code.language-mermaid'))) {
    const svg = await renderizarMermaid(codigo.textContent || '', escuro)
    if (!svg) continue
    const diagrama = document.createElement('div')
    diagrama.innerHTML = svg
    codigo.parentElement!.replaceWith(diagrama)
  }
  return modelo.innerHTML
}
