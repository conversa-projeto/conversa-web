<template>
  <div class="space-y-4">
    <section class="flex flex-col gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-4 md:flex-row md:items-center">
      <p class="min-w-0 flex-1 text-sm text-surface-600">
        Estas opções valem para o que você <strong class="text-surface-800">envia</strong> nas chamadas e ficam salvas neste navegador.
        Durante uma chamada, as mudanças valem na hora.
      </p>
      <button
        type="button"
        class="shrink-0 rounded-xl border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-200"
        @click="restaurarPadrao"
      >
        Restaurar padrão
      </button>
    </section>

    <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
      <h4 class="text-sm font-semibold text-surface-800">Áudio</h4>
      <div class="mt-3 space-y-3">
        <label v-for="opcao in OPCOES_PROCESSAMENTO" :key="opcao.chave" class="flex cursor-pointer items-start gap-3">
          <input v-model="config[opcao.chave]" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary-600" />
          <span class="min-w-0">
            <span class="block text-sm text-surface-800">{{ opcao.titulo }}</span>
            <span class="block text-xs text-surface-500">{{ opcao.descricao }}</span>
          </span>
        </label>

        <div>
          <p class="text-sm text-surface-800">Qualidade do áudio</p>
          <SeletorOpcoes v-model="config.qualidadeAudio" :opcoes="OPCOES_QUALIDADE_AUDIO" />
          <p class="mt-1 text-xs text-surface-500">{{ descricaoAtual(OPCOES_QUALIDADE_AUDIO, config.qualidadeAudio) }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
      <h4 class="text-sm font-semibold text-surface-800">Vídeo da câmera</h4>
      <div class="mt-3 space-y-3">
        <div>
          <p class="text-sm text-surface-800">Resolução</p>
          <SeletorOpcoes v-model="config.resolucao" :opcoes="OPCOES_RESOLUCAO" />
        </div>
        <div>
          <p class="text-sm text-surface-800">Quadros por segundo</p>
          <SeletorOpcoes v-model="config.fps" :opcoes="OPCOES_FPS" />
        </div>
        <div>
          <p class="text-sm text-surface-800">Limite de banda</p>
          <SeletorOpcoes v-model="config.bandaVideo" :opcoes="OPCOES_BANDA" />
          <p class="mt-1 text-xs text-surface-500">{{ descricaoAtual(OPCOES_BANDA, config.bandaVideo) }}</p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
      <h4 class="text-sm font-semibold text-surface-800">Compartilhamento de tela</h4>
      <div class="mt-3">
        <p class="text-sm text-surface-800">Prioridade</p>
        <SeletorOpcoes v-model="config.prioridadeTela" :opcoes="OPCOES_TELA" />
        <p class="mt-1 text-xs text-surface-500">{{ descricaoAtual(OPCOES_TELA, config.prioridadeTela) }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useConfigChamada, type ConfigChamada } from '../composables/useConfigChamada'
import SeletorOpcoes from './SeletorOpcoes.vue'

interface Opcao<T> {
  valor: T
  titulo: string
  descricao?: string
}

const { config, restaurarPadrao } = useConfigChamada()

const OPCOES_PROCESSAMENTO: { chave: 'reducaoRuido' | 'cancelamentoEco' | 'ganhoAutomatico'; titulo: string; descricao: string }[] = [
  { chave: 'reducaoRuido', titulo: 'Redução de ruído', descricao: 'Tira barulho de fundo, como ventilador e teclado.' },
  { chave: 'cancelamentoEco', titulo: 'Cancelamento de eco', descricao: 'Evita que os outros ouçam a própria voz saindo do seu alto-falante. Desligue só usando fone.' },
  { chave: 'ganhoAutomatico', titulo: 'Ganho automático do microfone', descricao: 'Ajusta o volume da sua voz sozinho.' },
]

const OPCOES_QUALIDADE_AUDIO: Opcao<ConfigChamada['qualidadeAudio']>[] = [
  { valor: 'normal', titulo: 'Normal', descricao: 'Voz clara usando pouca banda (32 kbps).' },
  { valor: 'alta', titulo: 'Alta', descricao: 'Voz com mais detalhe (64 kbps).' },
  { valor: 'musica', titulo: 'Música', descricao: 'Estéreo a 128 kbps, para música ou som do computador. O estéreo vale a partir da próxima chamada.' },
]

const OPCOES_RESOLUCAO: Opcao<ConfigChamada['resolucao']>[] = [
  { valor: '360', titulo: '360p' },
  { valor: '720', titulo: '720p' },
  { valor: '1080', titulo: '1080p' },
]

const OPCOES_FPS: Opcao<number>[] = [
  { valor: 15, titulo: '15' },
  { valor: 24, titulo: '24' },
  { valor: 30, titulo: '30' },
]

const OPCOES_BANDA: Opcao<ConfigChamada['bandaVideo']>[] = [
  { valor: 'auto', titulo: 'Automático', descricao: 'O navegador ajusta conforme a conexão.' },
  { valor: 'economico', titulo: 'Econômico', descricao: 'Até 0,5 Mbps: para conexões fracas ou dados móveis.' },
  { valor: 'alto', titulo: 'Alto', descricao: 'Até 3 Mbps: imagem mais nítida em conexões boas.' },
]

const OPCOES_TELA: Opcao<ConfigChamada['prioridadeTela']>[] = [
  { valor: 'nitidez', titulo: 'Nitidez', descricao: 'Texto e código legíveis; até 15 quadros por segundo.' },
  { valor: 'fluidez', titulo: 'Fluidez', descricao: 'Vídeos e animações suaves; até 30 quadros por segundo, com menos nitidez.' },
]

function descricaoAtual<T>(opcoes: Opcao<T>[], valor: T) {
  return opcoes.find((opcao) => opcao.valor === valor)?.descricao || ''
}
</script>
