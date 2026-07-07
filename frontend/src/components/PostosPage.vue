<template>
  <v-container fluid class="pa-6">
    <v-row class="mb-4" align="center">
      <v-col>
        <h2 class="text-h6">Postos cadastrados</h2>
      </v-col>
      <v-col cols="auto" class="d-flex gap-3">
        <v-btn color="primary" prepend-icon="mdi-upload" @click="triggerFileInput" :loading="importing">
          Importar CSV
        </v-btn>
        <v-btn color="secondary" prepend-icon="mdi-download" @click="exportCSV" :disabled="postos.length === 0">
          Exportar CSV
        </v-btn>
        <v-btn color="error" prepend-icon="mdi-delete" @click="confirmDelete = true" :disabled="postos.length === 0">
          Apagar tudo
        </v-btn>
        <input ref="fileInput" type="file" accept=".csv" class="d-none" @change="handleFileChange" />
      </v-col>
    </v-row>

    <v-dialog v-model="confirmDelete" max-width="400">
      <v-card>
        <v-card-title>Apagar todos os postos?</v-card-title>
        <v-card-text>Essa ação não pode ser desfeita.</v-card-text>
        <v-card-actions class="justify-end">
          <v-btn @click="confirmDelete = false">Cancelar</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteAll">Apagar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-alert v-if="importResult" :type="importResult.skipped > 0 ? 'warning' : 'success'" closable class="mb-4" @click:close="importResult = null">
      <div>
        <strong>Importação concluída:</strong>
        {{ importResult.imported }} importado(s), {{ importResult.skipped }} ignorado(s).
      </div>
      <div v-if="importResult.details.skipped.length > 0" class="mt-2">
        <div v-for="item in importResult.details.skipped" :key="item.line" class="text-body-2">
          Linha {{ item.line }} ({{ item.cnpj || 'sem CNPJ' }}): {{ item.errors.join(', ') }}
        </div>
      </div>
    </v-alert>

    <v-alert v-if="error" type="error" closable class="mb-4" @click:close="error = null">
      {{ error }}
    </v-alert>

    <v-data-table
      :headers="headers"
      :items="postos"
      :loading="loading"
      loading-text="Carregando postos..."
      no-data-text="Nenhum posto cadastrado. Importe um arquivo CSV para começar."
      density="compact"
      class="elevation-1"
    >
      <template #item.data_inauguracao="{ item }">
        {{ formatDate(item.data_inauguracao) }}
      </template>
    </v-data-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const postos = ref([])
const loading = ref(false)
const importing = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const importResult = ref(null)
const error = ref(null)
const fileInput = ref(null)

const headers = [
  { title: 'CNPJ', key: 'cnpj' },
  { title: 'Razão Social', key: 'nome_posto' },
  { title: 'Nome Fantasia', key: 'nome_fantasia' },
  { title: 'Bandeira', key: 'bandeira' },
  { title: 'Município', key: 'municipio' },
  { title: 'UF', key: 'uf' },
  { title: 'Status', key: 'status' },
  { title: 'Combustíveis', key: 'combustiveis' },
  { title: 'Responsável', key: 'nome_responsavel' },
  { title: 'Inauguração', key: 'data_inauguracao' },
]

async function fetchPostos() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API}/postos`)
    if (!res.ok) throw new Error(`Erro ${res.status}`)
    postos.value = await res.json()
  } catch (err) {
    error.value = 'Não foi possível carregar os postos. Verifique se o servidor está rodando.'
  } finally {
    loading.value = false
  }
}

function triggerFileInput() {
  fileInput.value.value = ''
  fileInput.value.click()
}

async function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file) return

  importing.value = true
  importResult.value = null
  error.value = null

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await fetch(`${API}/postos/import`, { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      error.value = data.error || 'Erro ao importar o arquivo.'
      return
    }

    importResult.value = data
    await fetchPostos()
  } catch (err) {
    error.value = 'Não foi possível conectar ao servidor.'
  } finally {
    importing.value = false
  }
}

async function deleteAll() {
  deleting.value = true
  try {
    const res = await fetch(`${API}/postos`, { method: 'DELETE' })
    if (!res.ok) throw new Error()
    confirmDelete.value = false
    importResult.value = null
    await fetchPostos()
  } catch {
    error.value = 'Não foi possível apagar os postos.'
  } finally {
    deleting.value = false
  }
}

function exportCSV() {
  window.location.href = `${API}/postos/export`
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

onMounted(fetchPostos)
</script>
