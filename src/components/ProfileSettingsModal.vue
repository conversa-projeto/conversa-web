<template>
  <div v-if="aberta" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3" >
    <div class="w-full max-w-md rounded-xl bg-white p-4 shadow-2xl">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-800">Configuracoes</h2>
        <button class="rounded px-2 py-1 text-slate-500 hover:bg-slate-100" @click="fechar">&times;</button>
      </div>

      <div class="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
        <p class="mb-2 text-sm font-medium text-slate-700">Foto de perfil</p>
        <div class="flex items-center gap-3">
          <div class="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-xl font-semibold text-blue-700">
            <img v-if="avatarPreview || avatarAtual" :src="avatarPreview || avatarAtual" alt="Avatar" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).style.display = 'none'" />
            <span v-if="!avatarPreview && !avatarAtual">{{ inicialUsuario }}</span>
            <div
              v-if="uploadProgresso > 0 && uploadProgresso < 100"
              class="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white"
            >
              {{ uploadProgresso }}%
            </div>
          </div>
          <div>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                :disabled="enviandoAvatar"
                @click="inputAvatar?.click()"
              >
                {{ enviandoAvatar ? 'Enviando...' : 'Alterar foto' }}
              </button>
              <button
                v-if="avatarAtual"
                type="button"
                class="rounded border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                :disabled="enviandoAvatar"
                @click="removerAvatar"
              >
                Remover
              </button>
            </div>
            <input
              ref="inputAvatar"
              type="file"
              class="hidden"
              accept="image/*"
              @change="selecionarAvatar"
            />
            <p v-if="erroAvatar" class="mt-1 text-xs text-rose-600">{{ erroAvatar }}</p>
          </div>
        </div>
      </div>

      <form class="space-y-3" @submit.prevent="salvarSenha">
        <div>
          <label class="mb-1 block text-sm text-slate-700">Senha atual</label>
          <input v-model="senhaAtual" type="password" class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div>
          <label class="mb-1 block text-sm text-slate-700">Nova senha</label>
          <input v-model="senhaNova" type="password" class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <div>
          <label class="mb-1 block text-sm text-slate-700">Confirmar nova senha</label>
          <input v-model="confirmacaoSenha" type="password" class="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>

        <p v-if="erro" class="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{{ erro }}</p>
        <p v-if="sucesso" class="rounded bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{{ sucesso }}</p>

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" class="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" @click="fechar">Cancelar</button>
          <button type="submit" class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" :disabled="salvando">
            {{ salvando ? 'Salvando...' : 'Salvar senha' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as api from '../services/conversaApi'
import { useAuthStore } from '../stores/auth'
import { TipoConteudo } from '../types/api'
import { redimensionarImagem } from '../utils/imageResize'

const props = defineProps<{
  aberta: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()

const senhaAtual = ref('')
const senhaNova = ref('')
const confirmacaoSenha = ref('')
const erro = ref('')
const sucesso = ref('')
const salvando = ref(false)

const inputAvatar = ref<HTMLInputElement | null>(null)
const avatarPreview = ref('')
const erroAvatar = ref('')
const enviandoAvatar = ref(false)
const uploadProgresso = ref(0)

const avatarAtual = computed(() => auth.avatarUrl || '')
const inicialUsuario = computed(() => {
  const nome = auth.user?.nome?.trim() || auth.user?.login?.trim() || 'U'
  return nome.charAt(0).toUpperCase()
})

watch(() => props.aberta, (aberta) => {
  if (!aberta) return
  senhaAtual.value = ''
  senhaNova.value = ''
  confirmacaoSenha.value = ''
  erro.value = ''
  sucesso.value = ''
  erroAvatar.value = ''
  avatarPreview.value = ''
  uploadProgresso.value = 0
})

function fechar() {
  emit('close')
}

async function selecionarAvatar(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file || !auth.user) return

  erroAvatar.value = ''
  enviandoAvatar.value = true
  uploadProgresso.value = 0

  try {
    const redimensionada = await redimensionarImagem(file)
    avatarPreview.value = URL.createObjectURL(redimensionada)

    const anexo = await api.uploadAnexo(
      TipoConteudo.Imagem,
      'avatar.jpg',
      'jpg',
      redimensionada,
      (p) => { uploadProgresso.value = p }
    )

    await api.atualizarUsuario(auth.user.id, { avatar_anexo_id: anexo.id })

    const url = await api.getAnexoUrl(anexo.identificador)
    auth.atualizarAvatar(anexo.identificador, url)

    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = ''
    uploadProgresso.value = 100
  } catch (e) {
    erroAvatar.value = e instanceof Error ? e.message : 'Erro ao enviar avatar'
    if (avatarPreview.value) {
      URL.revokeObjectURL(avatarPreview.value)
      avatarPreview.value = ''
    }
  } finally {
    enviandoAvatar.value = false
  }
}

async function removerAvatar() {
  if (!auth.user) return
  erroAvatar.value = ''
  enviandoAvatar.value = true
  try {
    await api.atualizarUsuario(auth.user.id, { avatar_anexo_id: null })
    auth.removerAvatar()
  } catch (e) {
    erroAvatar.value = e instanceof Error ? e.message : 'Erro ao remover avatar'
  } finally {
    enviandoAvatar.value = false
  }
}

async function salvarSenha() {
  erro.value = ''
  sucesso.value = ''

  if (!senhaAtual.value || !senhaNova.value || !confirmacaoSenha.value) {
    erro.value = 'Preencha todos os campos de senha.'
    return
  }

  if (senhaNova.value.length < 6) {
    erro.value = 'A nova senha deve ter pelo menos 6 caracteres.'
    return
  }

  if (senhaNova.value !== confirmacaoSenha.value) {
    erro.value = 'A confirmacao da senha nao confere.'
    return
  }

  salvando.value = true
  try {
    await api.alterarSenha(senhaAtual.value, senhaNova.value)
    sucesso.value = 'Senha alterada com sucesso.'
    senhaAtual.value = ''
    senhaNova.value = ''
    confirmacaoSenha.value = ''
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Nao foi possivel alterar a senha.'
  } finally {
    salvando.value = false
  }
}
</script>
