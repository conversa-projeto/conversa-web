<template>
  <div class="flex gap-2">
    <div class="min-w-0 flex-1">
      <DateInput v-model="data" placeholder="Data" />
    </div>
    <input
      v-model="hora"
      type="time"
      step="60"
      aria-label="Hora"
      class="w-28 shrink-0 rounded-lg border border-surface-300 bg-surface-100 px-2 py-1.5 text-sm text-surface-700 outline-none focus:border-primary-500"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DateInput from './DateInput.vue'

// Data e hora locais num só valor: null enquanto falta uma das duas
const props = defineProps<{ modelValue: Date | null }>()
const emit = defineEmits<{ 'update:modelValue': [valor: Date | null] }>()

const doisDigitos = (n: number) => String(n).padStart(2, '0')
const data = ref('')
const hora = ref('')

watch(() => props.modelValue, (valor) => {
  if (!valor) return
  data.value = `${valor.getFullYear()}-${doisDigitos(valor.getMonth() + 1)}-${doisDigitos(valor.getDate())}`
  hora.value = `${doisDigitos(valor.getHours())}:${doisDigitos(valor.getMinutes())}`
}, { immediate: true })

watch([data, hora], () => {
  const [ano = NaN, mes = NaN, dia = NaN] = data.value.split('-').map(Number)
  const [hh = NaN, mm = NaN] = hora.value.split(':').map(Number)
  const valor = [ano, mes, dia, hh, mm].every(Number.isFinite) ? new Date(ano, mes - 1, dia, hh, mm, 0, 0) : null
  if (valor?.getTime() !== props.modelValue?.getTime()) emit('update:modelValue', valor)
})
</script>
