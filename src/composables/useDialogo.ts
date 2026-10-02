import { ref } from 'vue'

export interface OpcoesDialogo {
  titulo: string
  mensagem: string
  /** Texto do botão principal (padrão "OK") */
  textoConfirmar?: string
  /** Texto do botão que desiste (padrão "Cancelar") */
  textoCancelar?: string
  /** Botão principal em vermelho, para ação destrutiva */
  perigo?: boolean
}

interface DialogoAberto extends OpcoesDialogo {
  /** Só o botão principal: um aviso, sem escolha */
  somenteAviso: boolean
}

// Confirmação e aviso no lugar de window.confirm e window.alert, com a janela
// do app (DialogoConfirmacao.vue). Cada componente que usa tem o seu diálogo.
export function useDialogo() {
  const aberto = ref<DialogoAberto | null>(null)
  let responder: ((confirmado: boolean) => void) | null = null

  function abrir(opcoes: DialogoAberto) {
    // Um novo diálogo responde "não" ao que estiver aberto
    responder?.(false)
    aberto.value = opcoes
    return new Promise<boolean>((resolver) => {
      responder = resolver
    })
  }

  function confirmar(opcoes: OpcoesDialogo) {
    return abrir({ ...opcoes, somenteAviso: false })
  }

  async function avisar(opcoes: OpcoesDialogo) {
    await abrir({ ...opcoes, somenteAviso: true })
  }

  function responderDialogo(confirmado: boolean) {
    const resolver = responder
    responder = null
    aberto.value = null
    resolver?.(confirmado)
  }

  return { aberto, confirmar, avisar, responderDialogo }
}
