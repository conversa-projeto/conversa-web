<template>
  <div class="space-y-4">
    <section class="flex flex-col gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-4 md:flex-row md:items-center">
      <p class="min-w-0 flex-1 text-sm text-surface-600">
        Editando as cores do <strong class="text-surface-800">tema {{ tema }}</strong>.
        As alterações valem na hora e ficam salvas neste navegador.
        Para editar o outro tema, troque o tema na aba Usuário.
        No F12, o nome da variável aparece nos estilos do elemento (ex.: <code class="font-mono text-xs">--color-primary-600</code>).
      </p>
      <button
        type="button"
        class="shrink-0 rounded-xl border border-surface-300 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-200 disabled:opacity-50"
        :disabled="!temPersonalizacao"
        @click="restaurarCores(tema)"
      >
        Restaurar todas
      </button>
    </section>

    <input
      v-model.trim="busca"
      type="search"
      placeholder="Buscar pela variável ou pelo uso (ex.: primary-600, mensagens)"
      class="w-full rounded-xl border border-surface-300 bg-surface-100 px-3 py-2.5 text-sm text-surface-800 outline-none focus:border-primary-500"
    />

    <p v-if="!gruposFiltrados.length" class="text-sm text-surface-500">Nenhuma cor encontrada.</p>

    <section
      v-for="grupo in gruposFiltrados"
      :key="grupo.id"
      class="rounded-2xl border border-surface-200 bg-surface-50 p-4"
    >
      <div class="mb-3 flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <h4 class="text-sm font-semibold text-surface-800">{{ grupo.titulo }}</h4>
          <p class="mt-0.5 text-xs text-surface-500">{{ grupo.descricao }}</p>
        </div>
        <button
          v-if="grupoPersonalizado(grupo)"
          type="button"
          class="shrink-0 text-xs text-primary-600 hover:underline"
          @click="restaurarCores(tema, variaveis(grupo))"
        >
          Restaurar grupo
        </button>
      </div>

      <div class="grid gap-2 lg:grid-cols-2">
        <div
          v-for="{ tom, uso } in grupo.tons"
          :key="tom"
          class="flex items-center gap-3 rounded-xl border px-2 py-1.5"
          :class="personalizada(grupo.id, tom) ? 'border-primary-400' : 'border-surface-200'"
        >
          <input
            type="color"
            class="h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border [&::-moz-color-swatch]:border-surface-300 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-surface-300"
            :value="valorAtual(grupo.id, tom)"
            :title="nomeVariavelCor(grupo.id, tom)"
            @input="definirCor(tema, nomeVariavelCor(grupo.id, tom), ($event.target as HTMLInputElement).value)"
          />
          <div class="min-w-0 flex-1 leading-tight">
            <span class="select-all font-mono text-xs font-semibold text-surface-800">{{ nomeVariavelCor(grupo.id, tom) }}</span>
            <span class="ml-1.5 select-all font-mono text-[11px] text-surface-500">{{ valorAtual(grupo.id, tom) }}</span>
            <span class="mt-0.5 block text-xs text-surface-600">{{ uso }}</span>
          </div>
          <button
            v-if="personalizada(grupo.id, tom)"
            type="button"
            class="shrink-0 rounded-full p-1 text-surface-400 hover:bg-surface-200 hover:text-surface-700"
            title="Voltar ao padrão"
            @click="restaurarCores(tema, [nomeVariavelCor(grupo.id, tom)])"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { GRUPOS_CORES, nomeVariavelCor, useCoresPersonalizadas, type GrupoCores, type TemaCores } from '../composables/useCoresPersonalizadas'

const { isDark } = useTheme()
const { personalizacao, lerPadroes, definirCor, restaurarCores } = useCoresPersonalizadas()

const padroes = lerPadroes()

const busca = ref('')

const gruposFiltrados = computed(() => {
  const termo = busca.value.toLowerCase().replace(/^--color-/, '')
  if (!termo) return GRUPOS_CORES
  return GRUPOS_CORES
    .map((grupo) => ({
      ...grupo,
      tons: grupo.tons.filter(({ tom, uso }) => `${grupo.id}-${tom}`.includes(termo) || uso.toLowerCase().includes(termo)),
    }))
    .filter((grupo) => grupo.tons.length)
})

const tema = computed<TemaCores>(() => isDark.value ? 'escuro' : 'claro')
const temPersonalizacao = computed(() => Object.keys(personalizacao.value[tema.value]).length > 0)

function variaveis(grupo: GrupoCores) {
  return grupo.tons.map(({ tom }) => nomeVariavelCor(grupo.id, tom))
}

function personalizada(grupo: string, tom: string) {
  return nomeVariavelCor(grupo, tom) in personalizacao.value[tema.value]
}

function grupoPersonalizado(grupo: GrupoCores) {
  return grupo.tons.some(({ tom }) => personalizada(grupo.id, tom))
}

function valorAtual(grupo: string, tom: string) {
  const nome = nomeVariavelCor(grupo, tom)
  return personalizacao.value[tema.value][nome] || padroes[tema.value][nome] || '#000000'
}
</script>
