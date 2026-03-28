# CLAUDE.md — Conversa Web

## 1. MODO DE TRABALHO

- Uma tarefa por vez. Termine antes de iniciar outra.
- Confirme a abordagem antes de codar, a menos que a tarefa seja trivial.
- Mexa apenas no necessário. Nunca refatore, limpe ou "melhore" código além do pedido.
- Pergunte antes de assumir — se houver ambiguidade, clarifique com o usuário.
- Entregue arquivo completo quando solicitado, nunca trechos isolados.
- Não adicione comentários, docstrings ou type annotations em código que não foi modificado.
- Não adicione tratamento de erro, fallbacks ou validação para cenários que não podem acontecer.

## 2. STACK DO PROJETO

| Camada | Tecnologia |
|--------|-----------|
| **Framework** | Vue 3 (`<script setup lang="ts">`) |
| **Estado** | Pinia 3 |
| **Estilo** | Tailwind CSS 3 com CSS variables (tema via classe `dark`) |
| **Build** | Vite 7 + vue-tsc |
| **Linguagem** | TypeScript (strict mode) |
| **HTTP Client** | `fetch` nativo via wrapper `src/services/http.ts` |
| **Tempo real** | WebSocket nativo (reconexão automática no chat store) |
| **Push** | Firebase Cloud Messaging |
| **Upload** | MinIO via presigned URL (XHR para progress) |
| **Hash** | hash-wasm (SHA-256 para deduplicação de anexos) |
| **Code highlight** | highlight.js + CodeMirror 6 |
| **VoIP** | sip.js 0.21 (WebRTC SIP) |
| **Chamadas** | WebRTC nativo (ICE via STUN/TURN configurável) |

**Sem backend neste repositório.** Este é um cliente web SPA que consome uma API REST externa. O endereço da API é configurável via `localStorage` (`conversa.apiBase`) e fallback para `window.location.origin`.

## 3. ESTRUTURA DE ARQUIVOS

```
src/
├── main.ts                    # Entry point — monta App com Pinia
├── App.vue                    # Root — login/registro ou chat principal
├── CallWindow.vue             # Janela de chamada (inline ou popup)
├── chat-popup.ts              # Entry point do popup de chat
├── pinia.ts                   # Instância Pinia
├── components/
│   ├── MessageBubble.vue      # Dispatcher de bolhas (não tem visual próprio)
│   ├── Bolha*.vue             # Componentes visuais por tipo de mensagem
│   ├── MessageList.vue        # Lista de mensagens com scroll infinito
│   ├── MessageInput.vue       # Input de mensagem com anexos
│   ├── MessageContent.vue     # Renderizador de conteúdo individual
│   ├── MensagemStatus.vue     # Timestamp + indicadores de entrega
│   ├── MensagemAcoes.vue      # Ações no hover (responder, encaminhar, copiar, reagir)
│   ├── ChatSidebar.vue        # Lista de conversas
│   ├── ChatHeader.vue         # Cabeçalho da conversa ativa
│   ├── NavBar.vue             # Navegação principal (chat, config, SIP)
│   ├── LoginForm.vue          # Formulário de login
│   ├── RegisterForm.vue       # Formulário de cadastro
│   └── *Modal.vue             # Modais diversos
├── composables/               # Hooks reutilizáveis (useTheme, useAudioPlayer, etc.)
├── directives/                # Diretivas Vue customizadas
├── services/
│   ├── http.ts                # Wrapper fetch — auth via Bearer token, prefixo /api
│   ├── conversaApi.ts         # Todas as chamadas à API REST
│   └── firebase.ts            # FCM (push notifications)
├── stores/
│   ├── auth.ts                # Autenticação, perfil, token, dispositivo
│   ├── chat.ts                # Conversas, mensagens, WebSocket, contatos
│   ├── call.ts                # Chamadas WebRTC (estado, peers, mídia)
│   └── sip.ts                 # Telefonia SIP (registro, chamadas PSTN)
├── types/
│   └── api.ts                 # Todas as interfaces e enums da API
└── utils/
    ├── classificarMensagem.ts # Classifica mensagem → tipo de bolha
    ├── formatters.ts          # Formatação de hora, tamanho, duração, links
    ├── codeBlocks.ts          # Detecção de blocos de código markdown
    ├── messageReferences.ts   # Lógica de mensagens referenciadas
    ├── emojiNomes.ts          # Nomes de emoji em português
    ├── sound.ts               # Sons de notificação
    ├── imageResize.ts         # Redimensionamento de imagens
    └── userProfile.ts         # Utilitários de perfil
```

## 4. ARQUITETURA DE EXIBIÇÃO DE MENSAGENS

As mensagens do chat são renderizadas por um sistema de classificação + componentes dedicados. **Nunca misture lógica de layout entre os componentes de bolha.**

### Fluxo

1. `MessageList.vue` renderiza cada mensagem via `MessageBubble.vue`
2. `MessageBubble.vue` é um **dispatcher** — não contém lógica visual própria
3. `classificarMensagem()` em `src/utils/classificarMensagem.ts` determina o `TipoExibicaoMensagem`
4. O dispatcher usa `<component :is>` para delegar ao componente correto

### Tipos de exibição e seus componentes

| Tipo | Componente | Quando |
|------|-----------|--------|
| `Imagem` | `BolhaImagem.vue` | Mensagem com apenas uma imagem, sem referência |
| `Codigo` | `BolhaCodigo.vue` | Mensagem com apenas blocos de código, sem referência |
| `Emoji` | `BolhaEmoji.vue` | Mensagem com apenas emojis, sem referência |
| `ComReferencia` | `BolhaReferencia.vue` | Mensagem que responde ou encaminha outra |
| `TextoCurto` | `BolhaTextoCurto.vue` | Texto de uma linha (<=60 chars), sem referência |
| `Padrao` | `BolhaPadrao.vue` | Todos os demais casos |

### Regras das bolhas

- **Cada componente Bolha* é independente.** Alterações visuais em um tipo não devem afetar os outros.
- **Para adicionar um novo tipo de exibição:**
  1. Adicionar valor em `TipoExibicaoMensagem` no `classificarMensagem.ts`
  2. Adicionar a condição na função `classificarMensagem()` (a ordem importa — é por prioridade)
  3. Criar o componente `Bolha*.vue` correspondente
  4. Registrar no `componenteMap` em `MessageBubble.vue`
- **Componentes compartilhados:**
  - `MensagemStatus.vue` — timestamp + indicadores de entrega (prop `variante` controla posicionamento)
  - `MensagemAcoes.vue` — botões de responder/encaminhar no hover
  - `MessageContent.vue` — renderiza o conteúdo individual (texto, imagem, arquivo, áudio)
- **Não coloque lógica de classificação visual no `MessageBubble.vue`.** Ele só despacha.
- **Não coloque lógica de classificação nos componentes Bolha*.** Cada um assume que já é o tipo correto.

## 5. CONVENÇÕES DA API

### HTTP Client (`src/services/http.ts`)

- Todas as requests passam por `requestApi<T>(path, method, options)`
- URL: `{apiBase}/api{path}` (ex: `https://host/api/mensagens`)
- Auth: header `Authorization: Bearer {token}` (token vem do `localStorage`)
- Body: JSON (`Content-Type: application/json`)
- Erros: 401 limpa token e lança `ErroNaoAutenticado`; outros lançam `Error` com mensagem do servidor
- Resposta: retorna `T` parseado do JSON

### Padrão de chamadas (`src/services/conversaApi.ts`)

- Cada endpoint é uma função exportada com tipagem explícita
- GET com query params: `requestApi<T>('/path', 'GET', { query: { ... } })`
- POST/PUT/PATCH com body: `requestApi<T>('/path', 'METHOD', { body: { ... } })`
- Upload de anexos: hash SHA-256 → verificar existência → presign → PUT no MinIO

### Verbos HTTP usados

| Verbo | Uso |
|-------|-----|
| `GET` | Listar e consultar |
| `PUT` | Criar (não é POST) |
| `PATCH` | Atualizar parcialmente |
| `POST` | Ações (login, visualizar, digitando, entrar em chamada) |
| `DELETE` | Remover |

## 6. CONVENÇÕES DE CÓDIGO

- **Nomes em português** para componentes, stores, utils e tipos do domínio
- **Vue 3** com `<script setup lang="ts">` — nunca Options API
- **Tailwind CSS** para estilização — sem CSS scoped, sem classes CSS customizadas (exceto variáveis de tema)
- **Enums como `const` objects** seguindo o padrão de `src/types/api.ts`:
  ```ts
  export const NomeEnum = { Valor1: 1, Valor2: 2 } as const
  export type NomeEnum = (typeof NomeEnum)[keyof typeof NomeEnum]
  ```
- **Stores Pinia** com Composition API (`defineStore('name', () => { ... })`)
- **Composables** com prefixo `use` (ex: `useTheme`, `useAudioPlayer`)
- **Tema** via CSS variables definidas em `style.css` — cores acessadas via classes Tailwind (`bg-surface-100`, `text-primary-600`)
- **Dark mode** via classe `dark` no `<html>` — toggle em `useTheme.ts`
- **Alias `@/`** aponta para `src/` (configurado no tsconfig e vite)

## 7. O QUE NUNCA FAZER

- **Nunca criar um backend** — este repo é só o frontend
- **Nunca misturar lógica visual entre componentes Bolha*** — cada um é independente
- **Nunca colocar lógica de classificação no MessageBubble.vue** — ele só despacha
- **Nunca usar Options API** — sempre `<script setup lang="ts">`
- **Nunca usar CSS scoped ou classes CSS customizadas** — usar Tailwind
- **Nunca usar enums TypeScript nativos** (`enum X {}`) — usar `const` objects
- **Nunca criar stores com Options API** — usar Composition API do Pinia
- **Nunca alterar o wrapper HTTP** (`http.ts`) sem necessidade — todos os endpoints dependem dele
- **Nunca hardcodar URLs da API** — usar `getApiBase()` do `http.ts`
- **Nunca adicionar dependências sem justificativa** — o projeto mantém o bundle enxuto com chunks manuais no Vite

## 8. MÓDULOS IMPLEMENTADOS

- **Autenticação**: login, cadastro, logout, alteração de senha, perfil com avatar
- **Conversas**: listagem, criação (direta e grupo), sidebar com busca
- **Mensagens**: envio (texto, imagem, arquivo, áudio, gravação), recebimento em tempo real via WebSocket, paginação bidirecional
- **Referências**: responder e encaminhar mensagens
- **Reações**: emoji reactions nas mensagens
- **Anexos**: upload com deduplicação SHA-256, preview de imagem, visualizador de imagem fullscreen, player de áudio
- **Code blocks**: destaque de sintaxe com highlight.js, modal com CodeMirror
- **Chamadas WebRTC**: áudio e vídeo, multi-participante (mesh), compartilhamento de tela, janela flutuante, popup externo
- **Telefonia SIP**: registro, discador, chamadas PSTN via sip.js
- **Push notifications**: Firebase Cloud Messaging
- **Tema**: dark/light mode com CSS variables
- **Drag & drop**: arrastar arquivos para enviar
- **Chat popup**: janela popup independente para conversa

## 9. COMANDOS ÚTEIS

```bash
npm run dev       # Inicia dev server (Vite, porta 5173)
npm run build     # Type-check + build de produção
npm run preview   # Preview do build de produção
```

## 10. DOCUMENTAÇÃO DO PROJETO

- Este arquivo (`CLAUDE.md`) é a referência principal para desenvolvimento assistido
- `README.md` na raiz para informações gerais
