// Visualizacao de blocos ```md / ```markdown nas mensagens.
// marked e DOMPurify sao carregados so quando aparece o primeiro bloco.
// O HTML sempre passa pelo DOMPurify: o Markdown vem de mensagens de outras
// pessoas e poderia trazer script ou HTML malicioso.

type Renderizador = (markdown: string) => string

let carregando: Promise<Renderizador> | null = null

export function ehLinguagemMarkdown(linguagem?: string) {
  const valor = (linguagem || '').toLowerCase()
  return valor === 'md' || valor === 'markdown'
}

export function carregarMarkdown(): Promise<Renderizador> {
  carregando ??= Promise.all([import('marked'), import('dompurify')]).then(([{ marked }, { default: DOMPurify }]) => {
    // Links abrem em outra aba, sem acesso a esta pagina
    DOMPurify.addHook('afterSanitizeAttributes', (no) => {
      if (no.tagName === 'A') {
        no.setAttribute('target', '_blank')
        no.setAttribute('rel', 'noopener noreferrer')
      }
    })
    return (markdown: string) => DOMPurify.sanitize(marked.parse(markdown, { async: false, gfm: true, breaks: true }))
  })
  return carregando
}
