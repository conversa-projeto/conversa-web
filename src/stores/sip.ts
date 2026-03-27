import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { Inviter, Registerer, RegistererState, SessionState, TransportState, UserAgent, UserAgentState } from 'sip.js'
import type { Invitation, Session } from 'sip.js'
import * as api from '../services/conversaApi'
import { useAuthStore } from './auth'
import type { SipConfig } from '../types/api'

const rtcConfiguration: RTCConfiguration = {
  iceTransportPolicy: 'all',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:voip.igerp.com:19302', username: 'webrtc', credential: '123456' },
  ],
  iceCandidatePoolSize: 10,
}

export const useSipStore = defineStore('sip', () => {
  const auth = useAuthStore()
  const sipConfig = ref<SipConfig | null>(null)
  const carregandoConfig = ref(false)
  const erro = ref('')
  const processandoConexao = ref(false)

  const isConnected = ref(false)
  const isRegistered = ref(false)
  const isConnecting = ref(false)
  const chamadaEmAndamento = ref(false)
  const mutado = ref(false)
  const chamadaDestinoUri = ref('')
  const chamadaRecebida = shallowRef<Invitation | null>(null)

  const sipDisponivel = computed(() => sipConfig.value?.ativo === true)

  let userAgent: UserAgent | null = null
  let registerer: Registerer | null = null
  let session: Session | null = null
  let audioElement: HTMLAudioElement | null = null

  function getAudioElement(): HTMLAudioElement {
    if (!audioElement) {
      audioElement = document.createElement('audio')
      audioElement.autoplay = true
      audioElement.style.display = 'none'
      document.body.appendChild(audioElement)
    }
    return audioElement
  }

  function setupAudio(sess: Session) {
    const sdh = sess.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection } | undefined
    const pc = sdh?.peerConnection
    if (!pc) return

    const audio = getAudioElement()

    pc.ontrack = (event) => {
      audio.srcObject = event.streams[0]
      audio.play().catch(() => {})
    }

    // Caso o track já tenha chegado antes do ontrack
    const receivers = pc.getReceivers()
    receivers.forEach((receiver) => {
      if (receiver.track && receiver.track.kind === 'audio') {
        const stream = new MediaStream([receiver.track])
        if (!audio.srcObject) {
          audio.srcObject = stream
          audio.play().catch(() => {})
        }
      }
    })
  }

  function limparSessao() {
    chamadaEmAndamento.value = false
    chamadaDestinoUri.value = ''
    mutado.value = false
    chamadaRecebida.value = null
    session = null
    const audio = getAudioElement()
    audio.srcObject = null
  }

  function atualizarEstadoChamadaSaida(sess: Session) {
    sess.stateChange.addListener((state) => {
      if (state === SessionState.Establishing || state === SessionState.Established) {
        chamadaEmAndamento.value = true
        setupAudio(sess)
      }
      if (state === SessionState.Terminated) {
        if (session === sess) limparSessao()
      }
    })
  }

  function limparErro() {
    erro.value = ''
  }

  async function carregarConfiguracao() {
    if (!auth.user) {
      sipConfig.value = null
      return null
    }

    carregandoConfig.value = true
    try {
      sipConfig.value = await api.getSip()
      return sipConfig.value
    } catch {
      sipConfig.value = null
      return null
    } finally {
      carregandoConfig.value = false
    }
  }

  async function garantirConexao(forcarReconexao = false) {
    if (!sipDisponivel.value || !sipConfig.value) return
    if (processandoConexao.value) return
    if (!forcarReconexao && (isRegistered.value || isConnecting.value)) return

    processandoConexao.value = true
    erro.value = ''

    try {
      // Solicitar permissão de áudio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
      } catch {
        // Mantém o fluxo mesmo se permissão não for concedida
      }

      // Se forçar reconexão, encerrar agente anterior
      if (forcarReconexao && userAgent) {
        await encerrar()
      }

      if (!userAgent || forcarReconexao) {
        const config = sipConfig.value
        const useIce = config.ws_server.startsWith('wss:')

        const uri = UserAgent.makeURI(`sip:${config.sip_user}@${config.domain}`)
        if (!uri) throw new Error('URI SIP inválida.')

        isConnecting.value = true

        userAgent = new UserAgent({
          uri,
          transportOptions: {
            server: config.ws_server,
          },
          authorizationUsername: config.auth_user || config.sip_user,
          authorizationPassword: config.sip_password,
          displayName: config.display_name || config.sip_user,
          sessionDescriptionHandlerFactoryOptions: useIce
            ? { peerConnectionOptions: { rtcConfiguration } }
            : {},
          delegate: {
            onInvite(invitation: Invitation) {
              session = invitation
              chamadaRecebida.value = invitation

              invitation.stateChange.addListener((state) => {
                if (state === SessionState.Established) {
                  chamadaEmAndamento.value = true
                  setupAudio(invitation)
                }
                if (state === SessionState.Terminated) {
                  if (session === invitation) limparSessao()
                }
              })

              invitation.accept({
                sessionDescriptionHandlerOptions: {
                  constraints: { audio: true, video: false },
                },
              })

              // Aguardar peerConnection existir
              const interval = setInterval(() => {
                if (invitation.sessionDescriptionHandler) {
                  clearInterval(interval)
                  setupAudio(invitation)
                }
              }, 50)
            },
          },
        })

        userAgent.stateChange.addListener((state) => {
          if (state === UserAgentState.Stopped) {
            isConnected.value = false
            isRegistered.value = false
            isConnecting.value = false
          }
        })

        // Monitorar estado do transporte WebSocket
        userAgent.transport.stateChange.addListener((state) => {
          if (state === TransportState.Connected) {
            isConnected.value = true
          } else if (state === TransportState.Disconnected) {
            isConnected.value = false
            isRegistered.value = false
            if (!processandoConexao.value && sipDisponivel.value) {
              erro.value = 'Conexao WebSocket perdida.'
            }
          } else if (state === TransportState.Connecting) {
            isConnecting.value = true
          }
        })

        // Capturar erros de transporte (ex: WS close code 1006)
        userAgent.transport.onDisconnect = (transportError) => {
          if (transportError) {
            erro.value = `Falha na conexao WebSocket: ${transportError.message || 'conexao recusada'}`
          }
        }

        await userAgent.start()

        registerer = new Registerer(userAgent)

        registerer.stateChange.addListener((state) => {
          isRegistered.value = state === RegistererState.Registered
          if (state === RegistererState.Registered) {
            isConnecting.value = false
          }
        })

        await registerer.register()
      }

      // Aguardar registro
      const inicio = Date.now()
      while (Date.now() - inicio < 10000) {
        if (isRegistered.value) break
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      if (!isRegistered.value) {
        throw new Error('O ramal SIP nao concluiu o registro a tempo.')
      }
    } catch (e) {
      isConnecting.value = false
      erro.value = e instanceof Error ? e.message : 'Nao foi possivel conectar o ramal SIP.'
    } finally {
      processandoConexao.value = false
    }
  }

  async function inicializarSessao(forcarReconexao = false) {
    if (!auth.user) {
      sipConfig.value = null
      await encerrar()
      return
    }

    await carregarConfiguracao()

    if (sipDisponivel.value) {
      await garantirConexao(forcarReconexao)
    } else if (isConnected.value) {
      await encerrar()
    }
  }

  async function discar(numero: string) {
    if (!sipDisponivel.value || !sipConfig.value) {
      throw new Error('Ramal SIP inativo.')
    }

    await garantirConexao(false)
    if (!isRegistered.value || !userAgent) {
      throw new Error('O ramal SIP ainda nao esta registrado.')
    }

    const target = UserAgent.makeURI(`sip:${numero}@${sipConfig.value.domain}`)
    if (!target) throw new Error('Numero de destino invalido.')

    const inviter = new Inviter(userAgent, target, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    })

    session = inviter
    chamadaDestinoUri.value = `sip:${numero}@${sipConfig.value.domain}`

    atualizarEstadoChamadaSaida(inviter)

    await inviter.invite()
  }

  async function encerrarChamada() {
    if (!session) return

    try {
      if (session.state === SessionState.Established) {
        await session.bye()
      } else if (session.state === SessionState.Establishing || session.state === SessionState.Initial) {
        await (session as Inviter).cancel()
      }
    } finally {
      chamadaEmAndamento.value = false
      chamadaDestinoUri.value = ''
      mutado.value = false
      session = null
    }
  }

  function enviarDtmf(valor: string) {
    if (!session || session.state !== SessionState.Established) return

    const sdh = session.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection } | undefined
    const pc = sdh?.peerConnection
    if (!pc) return

    const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio')
    if (sender && 'dtmf' in sender && sender.dtmf) {
      sender.dtmf.insertDTMF(valor, 100, 70)
    }
  }

  function mutar() {
    if (!session) return
    const sdh = session.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection } | undefined
    const pc = sdh?.peerConnection
    if (!pc) return

    pc.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === 'audio') {
        sender.track.enabled = false
      }
    })
    mutado.value = true
  }

  function desmutar() {
    if (!session) return
    const sdh = session.sessionDescriptionHandler as { peerConnection?: RTCPeerConnection } | undefined
    const pc = sdh?.peerConnection
    if (!pc) return

    pc.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === 'audio') {
        sender.track.enabled = true
      }
    })
    mutado.value = false
  }

  async function encerrar() {
    try {
      if (session && chamadaEmAndamento.value) {
        await encerrarChamada()
      }
    } catch {
      // ignora
    }

    try {
      if (registerer) {
        await registerer.unregister()
        registerer = null
      }
    } catch {
      // ignora
    }

    try {
      if (userAgent) {
        await userAgent.stop()
        userAgent = null
      }
    } catch {
      // ignora
    }

    isConnected.value = false
    isRegistered.value = false
    isConnecting.value = false
    chamadaEmAndamento.value = false
    chamadaRecebida.value = null
  }

  return {
    sipConfig,
    carregandoConfig,
    erro,
    processandoConexao,
    isConnected,
    isRegistered,
    isConnecting,
    sipDisponivel,
    chamadaEmAndamento,
    chamadaDestinoUri,
    chamadaRecebida,
    mutado,
    limparErro,
    carregarConfiguracao,
    inicializarSessao,
    garantirConexao,
    discar,
    encerrarChamada,
    enviarDtmf,
    mutar,
    desmutar,
    encerrar,
  }
})
