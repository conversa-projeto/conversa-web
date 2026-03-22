let notificationAudio: HTMLAudioElement | null = null
let fallbackAudioCtx: AudioContext | null = null

export function playNotificationSound() {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/notification.mp3')
    }

    notificationAudio.currentTime = 0
    void notificationAudio.play().catch(() => {
      playFallbackBeep()
    })
  } catch {
    // ignore
  }
}

async function playFallbackBeep() {
  try {
    if (!fallbackAudioCtx) {
      fallbackAudioCtx = new AudioContext()
    }

    if (fallbackAudioCtx.state === 'suspended') {
      await fallbackAudioCtx.resume()
    }

    const ctx = fallbackAudioCtx
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, ctx.currentTime)

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch {
    // Web Audio API indisponivel
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission()
  }

  return Notification.permission
}

// =====================================================================
// NOTIFICAÇÕES DO WINDOWS (Browser Notification API)
//
// === REGRAS FUNDAMENTAIS (NÃO QUEBRAR) ===
//
// 1. NOTIFICAÇÃO PERSISTENTE:
//    Toda notificação é criada com requireInteraction: true, ou seja,
//    ela NÃO desaparece sozinha após alguns segundos. Fica aberta até:
//    - O usuário clicar nela (onclick → foca janela + fecha)
//    - O usuário fechar manualmente (X)
//    - O código fechar via fecharNotificacao() ao visualizar as mensagens
//
// 2. UMA NOTIFICAÇÃO POR CONVERSA:
//    Cada conversa mantém no máximo UMA notificação ativa no Windows.
//    Novas mensagens da mesma conversa SUBSTITUEM a notificação existente
//    com o conteúdo atualizado (título = nome do remetente, body = última
//    mensagem). Isso é feito fechando a anterior e criando uma nova com
//    a mesma tag.
//
// 3. ATUALIZAÇÃO DE CONTEÚDO:
//    Ao receber nova mensagem de uma conversa que já tem notificação:
//    a) A notificação anterior é fechada (close + onclose = null)
//    b) Uma nova é criada com tag igual (conversa-{id}) + renotify: true
//    c) renotify: true força o browser a exibir novamente (sem isso,
//       mesma tag = silenciosamente ignorada em alguns browsers)
//
// 4. FECHAMENTO AUTOMÁTICO AO VISUALIZAR:
//    Quando mensagens_sem_visualizar chega a 0 no chat store
//    (em marcarMensagensComoVisualizadas), fecharNotificacao(conversaId)
//    é chamada, fechando a notificação do Windows programaticamente.
//
// 5. ONCLICK FOCA A JANELA:
//    Ao clicar na notificação, window.focus() traz o navegador para
//    frente e a notificação é fechada.
//
// === ARMADILHA DO onclose ASSÍNCRONO ===
//
// O evento onclose da Notification API dispara ASSINCRONAMENTE após
// close(). Se fizermos:
//   anterior.close()           // dispara onclose async
//   nova = new Notification()  // cria a nova
//   mapa.set(id, nova)         // armazena a nova
//   // ...depois: onclose da anterior dispara e apaga a nova do mapa!
//
// Solução implementada:
// - Antes de fechar a anterior: remover do mapa + anular onclose
//   (anterior.onclose = null) para que o evento não dispare
// - No onclose da nova: verificar se ela ainda é a ativa no mapa
//   antes de deletar (evita que uma antiga apague uma nova)
//
// === FLUXO COMPLETO ===
//
// 1. WebSocket notifica novas mensagens → chat.ts agrupa por conversa
// 2. Para cada conversa: showNotification(conversaId, nomeRemetente, { body })
// 3. showNotification fecha anterior (se houver) e cria nova
// 4. Notificação fica aberta no Windows até:
//    a) Usuário clica → foca janela + fecha notificação
//    b) Usuário visualiza mensagens no chat → fecharNotificacao()
//    c) Nova mensagem da mesma conversa → substituída por showNotification()
//
// === INTEGRAÇÃO COM chat.ts ===
//
// - showNotification() é chamada em processarNotificacoes() quando
//   !document.hasFocus() e há mensagens de outros remetentes
// - fecharNotificacao() é chamada em marcarMensagensComoVisualizadas()
//   quando mensagens_sem_visualizar chega a 0
// =====================================================================

/**
 * Mapa de notificações ativas por conversa (conversaId → Notification).
 *
 * Cada conversa pode ter no máximo uma notificação ativa. A instância
 * é armazenada aqui para permitir:
 * - Fechar programaticamente ao visualizar (fecharNotificacao)
 * - Fechar a anterior antes de criar uma atualizada (showNotification)
 * - Verificar no onclose se a notificação ainda é a ativa
 */
const notificacoesAtivas = new Map<number, Notification>()

/**
 * Exibe ou atualiza a notificação do Windows para uma conversa.
 *
 * Se já existe uma notificação para esta conversa, ela é substituída:
 * a anterior é fechada e uma nova é criada com o conteúdo atualizado.
 *
 * @param conversaId - ID da conversa (usado como tag e chave do mapa)
 * @param title - Título da notificação (nome do remetente da última mensagem)
 * @param options - Opções adicionais do Notification API (body com texto da mensagem)
 * @param onClick - Callback executado ao clicar na notificação (após focar a janela)
 */
export function showNotification(conversaId: number, title: string, options?: NotificationOptions, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  try {
    // --- Fechar notificação anterior da mesma conversa ---
    // ORDEM CRÍTICA: remover do mapa e anular onclose ANTES de close().
    // O close() dispara onclose assincronamente — se a referência ainda
    // estiver no mapa quando onclose disparar, ele apagaria a nova
    // notificação que será criada logo abaixo.
    const anterior = notificacoesAtivas.get(conversaId)
    if (anterior) {
      notificacoesAtivas.delete(conversaId)
      anterior.onclose = null
      anterior.close()
    }

    // --- Criar nova notificação ---
    // tag: agrupa por conversa (conversa-123). Junto com renotify: true,
    //   garante que o browser exiba a notificação mesmo com tag repetida.
    // renotify: true — sem isso, alguns browsers ignoram silenciosamente
    //   uma nova Notification com a mesma tag da anterior.
    // requireInteraction: true — mantém a notificação aberta até interação
    //   do usuário ou fechamento programático via fecharNotificacao().
    // silent: true — sem som do sistema (o app já toca playNotificationSound).
    // Cast para NotificationOptions porque renotify não existe nos tipos TS padrão.
    const notification = new Notification(title, {
      icon: '/logo.png',
      silent: true,
      tag: `conversa-${conversaId}`,
      renotify: true,
      requireInteraction: true,
      ...options
    } as NotificationOptions)

    // Ao clicar: trazer o navegador para frente, fechar a notificação
    // e executar o callback (ex: abrir a conversa no chat)
    notification.onclick = () => {
      window.focus()
      notification.close()
      notificacoesAtivas.delete(conversaId)
      if (onClick) onClick()
    }

    // Ao fechar (pelo sistema, pelo usuário ou programaticamente):
    // só remover do mapa se ESTA notificação ainda é a ativa da conversa.
    // Protege contra cenário onde onclose de uma notificação antiga
    // (que escapou do anterior.onclose = null) apagaria a referência da nova.
    notification.onclose = () => {
      if (notificacoesAtivas.get(conversaId) === notification) {
        notificacoesAtivas.delete(conversaId)
      }
    }

    notificacoesAtivas.set(conversaId, notification)
  } catch {
    // ignore — pode falhar em ambientes sem suporte (ex: SSR, iframe)
  }
}

/**
 * Fecha programaticamente a notificação de uma conversa específica.
 *
 * Chamado por chat.ts → marcarMensagensComoVisualizadas() quando
 * mensagens_sem_visualizar chega a 0 para aquela conversa.
 * Isso garante que a notificação do Windows desapareça assim que
 * o usuário visualizar todas as mensagens pendentes no chat.
 */
export function fecharNotificacao(conversaId: number) {
  const notificacao = notificacoesAtivas.get(conversaId)
  if (notificacao) {
    notificacao.close()
    notificacoesAtivas.delete(conversaId)
  }
}
