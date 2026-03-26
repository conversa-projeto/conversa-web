import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useCallSession, useSipClient, type SipClientConfig } from 'vuesip'
import * as api from '../services/conversaApi'
import { useAuthStore } from './auth'
import type { SipConfig } from '../types/api'
import { sipAtivo } from '../utils/sip'

export const useSipStore = defineStore('sip', () => {
  const auth = useAuthStore()
  const sipConfig = ref<SipConfig | null>(null)
  const carregandoConfig = ref(false)
  const erro = ref('')
  const processandoConexao = ref(false)

  const {
    connect,
    disconnect,
    isConnected,
    isRegistered,
    isConnecting,
    error: sipError,
    updateConfig,
    getClient,
  } = useSipClient(undefined, {
    autoCleanup: false,
    connectionTimeout: 10000,
  })

  const sipClientRef = computed(() => getClient())
  const chamada = useCallSession(sipClientRef)

  const sipDisponivel = computed(() => sipAtivo(sipConfig.value?.ativo))
  const chamadaEmAndamento = computed(() => !['idle', 'terminated', 'failed'].includes(String(chamada.state.value)))

  watch(sipError, (valor) => {
    if (!valor) return
    if (valor instanceof Error) {
      erro.value = valor.message
    } else if (typeof valor === 'string' && valor !== 'true') {
      erro.value = valor
    } else {
      erro.value = 'Falha na conexao do ramal SIP.'
    }
  })

  function limparErro() {
    erro.value = ''
  }

  function montarConfiguracao(): SipClientConfig {
    const config = sipConfig.value
    if (!config) {
      throw new Error('Configuracao SIP indisponivel.')
    }

    return {
      uri: config.ws_server,
      sipUri: `sip:${config.sip_user}@${config.domain}`,
      password: config.sip_password,
      displayName: config.display_name || config.sip_user,
      ...(config.auth_user ? { authorizationUsername: config.auth_user } : {}),
      ...(config.domain ? { realm: config.domain } : {}),
      wsOptions: {
        connectionTimeout: 10000,
        reconnectionDelay: 2000,
        maxReconnectionAttempts: 3,
      },
      registrationOptions: {
        autoRegister: true,
        expires: 600,
      },
      mediaConfiguration: {
        audio: true,
        video: false,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }
  }

  async function solicitarPermissaoAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      // Mantem o fluxo mesmo se a permissao nao for concedida neste momento.
    }
  }

  async function aguardarRegistro(timeoutMs = 10000) {
    if (isRegistered.value) return

    const inicio = Date.now()
    while (Date.now() - inicio < timeoutMs) {
      if (isRegistered.value) return
      await new Promise((resolve) => window.setTimeout(resolve, 200))
    }

    throw new Error('O ramal SIP nao concluiu o registro a tempo.')
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
    if (!sipDisponivel.value) return
    if (processandoConexao.value) return
    if (!forcarReconexao && (isRegistered.value || isConnecting.value)) return

    processandoConexao.value = true
    erro.value = ''

    try {
      await solicitarPermissaoAudio()

      const resultado = updateConfig(montarConfiguracao())
      if (!resultado.valid) {
        throw new Error(resultado.errors?.join(', ') || 'Configuracao SIP invalida.')
      }

      if (forcarReconexao && isConnected.value) {
        await disconnect()
      }

      if (!isConnected.value) {
        await connect()
      }

      await aguardarRegistro()
    } catch (e) {
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
    if (!sipDisponivel.value) {
      throw new Error('Ramal SIP inativo.')
    }

    await garantirConexao(false)
    if (!isRegistered.value) {
      throw new Error('O ramal SIP ainda nao esta registrado.')
    }

    await chamada.makeCall(`sip:${numero}@${sipConfig.value!.domain}`, {
      audio: true,
      video: false,
    })
  }

  async function encerrarChamada() {
    await chamada.hangup()
  }

  async function enviarDtmf(valor: string) {
    await chamada.sendDTMF(valor)
  }

  async function encerrar() {
    try {
      if (chamadaEmAndamento.value) {
        await chamada.hangup()
      }
    } catch {
      // ignora erro ao finalizar chamada pendente
    }

    try {
      if (isConnected.value) {
        await disconnect()
      }
    } catch {
      // ignora erro ao desconectar
    }
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
    chamada,
    chamadaEmAndamento,
    limparErro,
    carregarConfiguracao,
    inicializarSessao,
    garantirConexao,
    discar,
    encerrarChamada,
    enviarDtmf,
    encerrar,
  }
})
