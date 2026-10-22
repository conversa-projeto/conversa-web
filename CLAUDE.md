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
| **Runtime / pacotes** | Bun (instalação, scripts, Vite e checagem de tipos) |
| **Build** | Vite 7 + vue-tsc (via `scripts/vue-tsc.ts`) |
| **Linguagem** | TypeScript (strict mode) |
| **HTTP Client** | Eden (`@elysiajs/eden`), tipado pelas rotas da API (`src/services/eden.ts`) |
| **Tempo real** | WebSocket nativo (reconexão automática no chat store) |
| **Push** | Firebase Cloud Messaging |
| **Upload** | MinIO via presigned URL (XHR para progress) |
| **Hash** | hash-wasm (SHA-256 para deduplicação de anexos) |
| **Code highlight** | highlight.js + CodeMirror 6 |
| **Arquivos do Office** | @silurus/ooxml (versão fixa; leitor em Rust/WASM, desenho em canvas) |
| **Mapas** | Leaflet 1.9 (chunk `leaflet`, só carrega quando aparece uma localização), mapa do OpenStreetMap |
| **Campo de mensagem** | Tiptap 3 (ProseMirror), licença MIT; chunk `editor` no Vite |
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
│   ├── MessageInput.vue       # Campo de mensagem rico (texto com anexos, figurinhas e menções no meio)
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
├── editor/                    # Campo de mensagem no Tiptap: peças (pecas.ts) e suas views em Vue
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
| `Postagem` | `BolhaPostagem.vue` | Postagem de grupo (`mensagem.postagem`): cartão da largura do chat com título, conteúdo e as respostas embaixo |
| `Imagem` | `BolhaImagem.vue` | Mensagem com apenas uma imagem, sem referência |
| `Figurinha` | `BolhaFigurinha.vue` | Mensagem com apenas uma figurinha (Lottie), sem referência |
| `Localizacao` | `BolhaLocalizacao.vue` | Mensagem com apenas uma localização (local ou trajeto), sem referência |
| `Enquete` | `BolhaEnquete.vue` | Votação de grupo (conteúdo tipo 8 com o id da enquete) |
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

### Cliente da API (`src/services/eden.ts`)

- As chamadas usam o cliente Eden, tipado pelo `App` da API (`../conversa/src/app.ts`). O `tsconfig.json` referencia `../conversa/tsconfig.tipos.json`, que gera as declarações da API: caminho, corpo, consulta e resposta de cada rota são conferidos na compilação
- `api()` devolve o cliente das rotas `/api` no endereço atual (`getApiBase()`); `dados(chamada)` devolve os dados ou lança o erro
- Auth: header `Authorization: Bearer {token}` (token vem do `localStorage`, em `http.ts`)
- Erros: 401 limpa token e lança `ErroNaoAutenticado`; outros lançam `Error` com a mensagem do servidor (`{ error }`)
- **Datas chegam como `Date`**: só os campos de data da lista `CAMPOS_DATA` são convertidos (o texto das mensagens nunca). Campo de data novo na API precisa entrar nessa lista

### Padrão de chamadas (`src/services/conversaApi.ts`)

- Cada endpoint é uma função exportada com o tipo de retorno do front (`types/api.ts`); se a API mudar e o tipo não bater, a compilação acusa
- GET com consulta: `dados(api().mensagens.get({ query: { ... } }))`
- POST/PUT/PATCH com corpo: `dados(api().mensagem.put({ ... }))`
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
- **Nunca chamar a API com `fetch` direto** — usar o cliente Eden (`api()` e `dados()` de `eden.ts`), que confere os tipos
- **Nunca hardcodar URLs da API** — usar `getApiBase()` do `http.ts`
- **Nunca adicionar dependências sem justificativa** — o projeto mantém o bundle enxuto com chunks manuais no Vite

## 8. MÓDULOS IMPLEMENTADOS

- **Autenticação**: login, cadastro, logout, alteração de senha, perfil com avatar
- **Conversas**: listagem, criação (direta e grupo; o grupo já pode nascer com imagem ou emoji, escolhidos no `CreateGroupModal`; a imagem só sobe ao criar), sidebar com busca (grupo com um ícone ao lado do nome; a busca e o @ procuram em `chat.contatos`, que recarrega quando uma conta é criada, renomeada ou excluída, pelo aviso do WebSocket tipo 66, e ao reconectar); chats de chamada e arquivadas em seções recolhíveis no fim da lista
- **Mensagens**: envio (texto, imagem, arquivo, áudio, gravação), recebimento em tempo real via WebSocket, paginação bidirecional
- **Referências**: responder e encaminhar mensagens
- **Reações**: emoji reactions nas mensagens; até 5 emojis diferentes por pessoa na mesma mensagem (o servidor confere); na bolha, 5 à mostra e o resto num "+N". Ctrl + clique direito na mensagem abre só os emojis, junto do clique; o clique direito abre o menu completo, e no celular o toque longo também
- **Mensagens agendadas**: as que ainda não saíram ficam fora do chat (`chat.agendadasAtivas`); com o campo vazio, um relógio ao lado do microfone abre a lista da conversa, com cancelar (`MensagensAgendadasModal`)
- **Painel do grupo**: o avatar (ou o botão de participantes) do grupo abre à direita o `PainelGrupo`: imagem ou emoji do grupo (no lugar da primeira letra), nome, participantes (adicionar/remover) e anexos da conversa com filtro por tipo
- **Confirmação de leitura**: "+" > Confirmar leitura marca a próxima mensagem (`chat.pedirConfirmacao`); em grupo, antes escolhe quem precisa confirmar (`ConfirmacaoLeituraModal`, `chat.confirmacaoUsuarios`; padrão: todos). Quem enviou também pode pedir depois, pelo menu da mensagem, até 24 horas depois do envio (`POST /mensagem/pedir-confirmacao`, aviso pelo WebSocket tipo 65). Na bolha, junto das reações, só quem está na lista tem a caixa de confirmar (`confirmacao.pode_confirmar`); os outros veem quantos confirmaram e, ao passar o mouse, quem confirmou e quem falta (aviso pelo WebSocket tipo 8)
- **Anexos**: a aba Anexos abre com os anexos mais recentes de todas as conversas (cada um com o nome da conversa; na direta, o da outra pessoa), e a busca escolhe uma conversa. Espaço usado: os arquivos que a pessoa enviou, cada um uma vez (`GET /usuario/espaco` na seção Armazenamento do Perfil, `EspacoUsado`; `espaco` de cada um na lista de Pessoas). Upload com deduplicação SHA-256, preview de imagem, visualizador de imagem fullscreen, player de áudio. No envio de áudio, o navegador mede a duração e a onda (`utils/dadosAudio.ts`: 48 picos de 0 a 100) e manda junto no `PUT /anexo`; o servidor grava na `anexo_audio` (uma linha por arquivo, com a transcrição) e devolve `duracao` e `intensidade` no conteúdo, e o player mostra a duração e desenha a onda (`OndaAudio`) sem baixar o áudio; à direita da barra, o botão de velocidade (1x, 1,5x, 2x e 3x a cada clique, a mesma para todos os áudios, guardada no navegador em `conversa.velocidadeAudio`). Áudio antigo, sem esses dados, fica com a barra simples e busca só a duração quando o player aparece na tela (`useAudioPlayer`, sem tocar); "Transcrever" só aparece com o transcritor configurado (`useRecursos`, `GET /recursos`)
- **Câmera**: "+" > Câmera (com permissão de imagem ou de vídeo). No celular (ou só toque) abre a câmera do sistema (`<input capture>`); no computador, só aparece com webcam (`useCamera`, pela lista de dispositivos e o `devicechange`) e abre o `CameraModal` com a webcam ao vivo: clique tira a foto, segurar grava o vídeo (arrastar para fora do botão trava a gravação, e o próximo clique para; MediaRecorder, webm; sem permissão de foto, o clique liga e desliga a gravação), com troca de câmera. Nos dois, a prévia tem legenda, Refazer e Enviar, que manda na hora (a foto ou o vídeo e a legenda na mesma mensagem)
- **Arquivos do Office**: `.docx`, `.xlsx` e `.pptx` têm "Abrir" no chat e abrem pela tela de Anexos no `VisualizadorOffice` (@silurus/ooxml: Word e PowerPoint rolando página a página, Excel com as abas). Cada formato é um chunk com o seu `.wasm`, que o Vite põe no build: nada vem de CDN (no `vite.config`, `optimizeDeps.exclude` para o servidor de desenvolvimento achar o `.wasm`). Sem Google Fonts: as substitutas (Carlito no lugar da Calibri, Caladea no da Cambria e as do Google que a biblioteca conhece) ficam em `public/fontes/office`, baixadas por `scripts/baixar-fontes-office.ts` (lista em `utils/fontesOffice.ts`); antes de desenhar, `carregarFontesOffice` lê no ZIP as fontes que o documento usa e carrega só essas. Formatos antigos (`.doc`, `.xls`, `.ppt`) continuam só com Download
- **Code blocks**: destaque de sintaxe com highlight.js, modal com CodeMirror. Pelo "+" > Código (ou texto longo colado), a janela oferece "Enviar" (vai na hora, sozinho) ou "Inserir na mensagem": vira a peça `codigo` no campo (`PecaCodigo`: linguagem, as primeiras linhas, editar na janela e remover; não se edita dentro do campo), que vai como um bloco ``` próprio
- **Tabelas CSV/TSV**: blocos ```csv e ```tsv aparecem como tabela (`utils/tabelaCsv.ts` monta a tabela em Markdown, com as aspas do CSV, o separador `;` ou `,` detectado e números à direita, e o `carregarMarkdown` desenha), com "Visualizar"/"Código"; "Copiar" copia os dados originais. Tabela colada no campo (linhas com tab do Excel/Sheets, ou CSV sem espaço depois do separador, todas com as mesmas colunas, `pareceTabela`) entra direto como a peça `codigo` com a linguagem `tsv`/`csv`; também na lista da janela de código
- **Chamadas WebRTC**: áudio e vídeo, multi-participante (mesh), compartilhamento de tela; quem não atendeu aparece na grade com "Chamar de novo". Enquanto toca, a conexão já fica de pé (`preConexoes` no store `call`): quem recebe abre microfone e câmera e publica com as trilhas desligadas e já assina quem está na chamada; quem está na chamada assina quem não atendeu, tentando até a transmissão aparecer. Atender só liga as trilhas e passa a tocar/mostrar; se o primeiro áudio do outro lado ainda não chegou, toca `public/aguardando.mp3` (`aguardandoConexao`, até 10 s). No computador, a chamada de vídeo abre numa janela popup própria (`chamada.html`, desenhada pela aba do app com o mesmo Vue e pinia, `useAbaChamada`): a conexão fica na aba do app, que mostra só a barra do topo ("Abrir chamada" traz a janela de volta; fechar a janela não desliga). Chamada de áudio que ganha vídeo passa a ser de vídeo na API (mensagem e histórico). Navegador que bloqueia a janela: a chamada fica dentro do app, como antes. No celular (tela estreita ou só toque) fica dentro do app, sem compartilhar tela; "Voltar ao chat" deixa a barra no topo do app, em qualquer seção
- **Ponteiro remoto**: quem assiste aponta na tela compartilhada; posição repassada pelo WebSocket (sinal da chamada, tipo 57)
- **Chat da chamada**: na primeira mensagem enviada pelo painel da chamada (`PUT /chamada/chat`) é criado um grupo novo com o nome dos participantes; só a ligação feita dentro do chat de outra ligação (com todos dela) reaproveita esse chat. A mensagem da ligação (`BolhaChamada`) e o histórico de chamadas expandem esse chat só para leitura, com os conteúdos como no chat (`ChatDaChamada`, com `MessageContent`), e "Abrir o chat completo" (o servidor manda `chat_chamada_id` / `conversa_chat_id` só para quem é membro). A pesquisa da conversa acha também nos chats das ligações feitas nela (para quem é membro), marcados "no chat da ligação"
- **Emojis**: o `EmojiPicker` tem todos os emojis do Unicode por categoria, com pesquisa em português sem acento (nome e palavras-chave) e Recentes (no navegador). O catálogo `public/emojis/pt.json` é gerado por `scripts/gerar-emojis.ts` a partir do `emojibase-data` (só na geração) e baixado quando o seletor abre (`useEmojis`); sem tons de pele e sem bandeiras; `utils/suporteEmoji.ts` esconde as versões do Unicode que o navegador não desenha
- **Figurinhas**: só o pacote "Noto" (emojis animados do Google em Lottie, CC BY 4.0, crédito no seletor), em `public/figurinhas/noto`, baixado por `scripts/baixar-figurinhas-noto.ts`, que também gera o catálogo dele (`utils/figurinhasNoto.ts`); a mensagem leva só `pacote/nome` (conteúdo tipo 7). Figurinha que não existe mais (os pacotes antigos foram apagados) aparece como o texto "Figurinha"
- **Localização e trajeto**: "+" > Localização (permissão de uso `localizacao`, migração 055) abre o `LocalizacaoModal`: Local (um ponto) ou Trajeto (origem e destino), pela posição do aparelho (tenta ao abrir), pela busca de endereço (Nominatim), por coordenadas digitadas ou clicando no mapa (marcadores arrastáveis); sem GPS, as outras formas bastam. O trajeto calcula a rota de carro pelas ruas no OSRM público (`services/mapas.ts`), uma vez, e guarda a linha (polyline), a distância e o tempo; sem resposta, vai a distância em linha reta. Como o código, "Enviar" vai na hora, sozinha, e "Inserir na mensagem" vira a peça `localizacao` no campo (`PecaLocalizacao`: resumo, editar na janela, remover). Vai como conteúdo tipo 9, com o JSON de `utils/localizacao.ts` (o servidor confere o formato). No chat, `ConteudoLocalizacao` desenha o mapa com o `MapaLeaflet` (na bolha só imagem; o clique amplia no `VisualizadorLocalizacao`, com arrastar e zoom; interativo, tem o botão Satélite/Mapa, com as imagens da Esri World Imagery e as ruas e os nomes dos lugares por cima, estes só até o nível 16 e ampliados daí em diante, porque os níveis maiores da Esri vêm deslocados da imagem) e "Abrir no Google Maps" (o ponto ou o trajeto de carro; no celular, o app); no escuro, o mapa vai com filtro invertido. Bots e resumo veem "[localização: nome (lat, lng)]" ou "[trajeto: ...]"
- **Postagens em grupo**: "+" > Postagem (só em grupos) marca a próxima mensagem como postagem, com título opcional (`chat.postagemPendente`). As respostas ficam só embaixo dela (`BolhaPostagem`: as 2 últimas e "Ver todas"), fora do fluxo e da pesquisa (`postagem_id` na API). "Responder à postagem" leva a resposta para o campo de mensagem (`chat.postagemRespondendo`), com qualquer conteúdo. Resposta conta como mensagem nova e vira atividade para quem postou e quem já respondeu (apontando para a postagem); aviso pelo WebSocket tipo 64. A postagem na tela marca as respostas como vistas (`POST /postagem/visualizar`)
- **Pastas de mensagens (conversa direta)**: o botão de pasta no `ChatHeader` abre à direita o `PainelPastas` (estreito, `w-52`): criar, renomear, cor, compartilhar com a outra pessoa ou não, excluir (só quem criou; migração 056, tabelas `pasta` e `pasta_mensagem`, rotas `/pastas`, `/pasta` e `/pasta/mensagens`). A pasta só marca: a mensagem continua no chat, pode estar em várias, e a API manda `pastas` (ids) em cada mensagem, só das que a pessoa enxerga; no chat (prop `pastas` do `MessageBubble`) elas viram bolinhas coloridas atrás do ✓ da enviada, sem mudar a altura, e ao lado da recebida (clique abre a pasta). Na compartilhada os dois põem e tiram mensagens; aviso pelo WebSocket tipo 67. Seleção no `MessageList` (`useSelecaoMensagens`): arrastar na área vazia ao lado das bolhas desenha um retângulo (Ctrl soma), Ctrl + clique soma/tira uma, Esc limpa; o clique direito no vazio da linha selecionada abre o menu da mensagem, e na selecionada sem menu (chamada, oculta) abre o da selecionada mais próxima que tenha (`repassarCliqueDireito`, pelo `data-tem-menu` do `MessageBubble`; também na pasta aberta); selecionar abre o painel, e as selecionadas (ou a barra "N selecionadas") são arrastadas até a pasta (`utils/pastas.ts`, tipo próprio no arraste) ou vão por "Pôr na pasta". Abrir a pasta mostra o `ChatDaPasta` por cima do chat, sem campo de mensagem (escondido com `v-show`, o rascunho fica): só as mensagens dela; "Ver na conversa" e "Tirar da pasta" ficam no menu do clique direito (`na-pasta` no `MessageBubble`/`MensagemAcoes`, que ali esconde Ocultar e Pedir confirmação), e a mesma seleção (arrastar ao lado, Ctrl + clique) tira várias de uma vez; "Voltar ao chat" (ou Esc, que antes limpa a seleção) volta ao chat como estava. Store `pastas`. Sugestões da IA (com a IA ligada e alguma pasta): no pé do painel, "Sugerir pastas" pede à API (`POST /pastas/sugerir`, `sugestoesPastas.ts` no servidor) que olhe as 80 mensagens mais recentes que não estão em pasta nenhuma e diga a pasta de cada uma pelo assunto; a IA conhece a pasta pelo nome e pelas últimas 5 mensagens dela. Roda em segundo plano, como o resumo (`GET /pastas/sugestao` até sair de "processando"). Nada entra na pasta sozinho: cada sugestão (autor, prévia do texto e a pasta) tem ✓ (põe, pelo `PUT /pasta/mensagens`) e ✕ (ignora), e "Aceitar todas"; as ignoradas ficam no navegador (`conversa.sugestoesIgnoradas.<usuário>.<conversa>`) e vão em `ignorar` na próxima análise
- **Votação em grupo**: opção Votação no "+" (só em grupos), escolha única ou múltipla, data final opcional (quem criou muda; quem criou a votação ou o grupo encerra antes); votos ficam nas tabelas `enquete*` do backend e chegam em tempo real (store `enquetes`, aviso pelo WebSocket tipo 62)
- **Campo de mensagem rico**: o `MessageInput` é um editor Tiptap (`editor/pecas.ts`): imagem, vídeo, áudio, arquivo, figurinha e código são blocos (views em Vue: `PecaAnexo`, `PecaFigurinha`, `PecaCodigo`) e a menção fica no texto, com a lista de sugestões (`MencaoDropdown`). O editor cuida de apagar a peça como um caractere, selecionar (peça na seleção fica azul), desfazer/refazer, pôr o cursor entre peças (gapcursor) e mudar a ordem arrastando. Enter envia, Shift+Enter quebra a linha, Tab põe espaços; atalhos de emoji viram emoji com o espaço. No envio, `blocosDoDocumento` monta os conteúdos na ordem do campo (`chat.enviarBlocos`); só texto vai como antes. Figurinha e gravação com o campo vazio são enviadas na hora. Rascunho por usuário e conversa no IndexedDB (`services/rascunhos.ts`): o documento do editor (com os arquivos) e o "respondendo a..." ficam salvos; trocar de conversa esvazia o campo e voltar restaura, inclusive depois de fechar o navegador; enviar apaga o rascunho
- **Chat da chamada completo**: na janela principal, o painel da chamada usa o `MessageList` e o `MessageInput` do chat (a conversa do grupo vira a ativa enquanto o painel está aberto)
- **Atividades**: reações, respostas, menções, pedidos de confirmação de leitura e chamadas perdidas do usuário; tabela `atividade` no backend, gravada quando o evento acontece (store `atividades`, aviso pelo WebSocket tipo 61). Cada uma fica pendente (destacada, e o número na barra conta as pendentes) até concluir: o pedido de confirmação ao confirmar a leitura, a reação ao ver a própria mensagem na tela (`useScrollManager` avisa `POST /atividades/reacoes-vistas`), a resposta e a menção ao ler a mensagem, a chamada perdida ao abri-la; ou à mão pelo ✓ (`POST /atividade/concluir`; no pedido de confirmação, a leitura continua sem confirmar)
- **Menu das Configurações** (`ProfileSettingsModal`, lista `GRUPOS`): menus com sub-abas no topo do conteúdo, em duas seções. Pessoal: Conta (Perfil, Privacidade), Aparência (Tema), Dispositivos (Sessão e periféricos, Permissões do navegador), Chamadas (Qualidade, Voip). Administração (só aparece com alguma permissão): Sistema, Pessoas (uma tela só, Usuários; `/config/acessos` leva para ela), IA (Bots, Conhecimento, Ferramentas, Servidor). Cada sub-aba some sem a permissão, e o menu, sem nenhuma; o endereço continua o da sub-aba (`/config/voip`, `/config/ia`...), e o clique no menu abre a primeira dela
- **Permissões e configurações do sistema**: Sistema (parâmetros do servidor) e Pessoas (usuários e quem tem cada permissão) nas Configurações, visíveis só com a permissão (`auth.temPermissao`); o servidor confere em cada rota. Ninguém retira as próprias permissões (o servidor recusa e a caixa fica travada)
- **Permissões de uso**: por pessoa, no painel de cada uma na lista de Pessoas › Usuários, junto das de administração (`permissao.uso` no servidor, migração 046): emojis no texto, figurinha, imagem, vídeo, áudio, arquivo, responder, encaminhar, reagir, postagem, votação, pedir confirmação, agendar, criar grupo, chamada de áudio, chamada de vídeo (e ligar o vídeo), compartilhar a tela, telefonia, ocultar mensagem, mudar o nome, o e-mail (com o telefone) e o avatar (cada um a sua), trocar a senha, mudar a privacidade, as cores (e o tema claro/escuro) e as configurações de chamada (migrações 048 e 049). Conta nova começa com todas; sem a permissão, o campo fica travado ou a aba (Tema, Chamadas, Voip) some. O servidor confere cada uma (`validarPermissoes`; vídeo pela extensão do anexo; encaminhar só pede "encaminhar"); o front esconde o que não pode com `auth.pode(codigo)` (verdadeiro até a lista chegar) e não deixa entrar no campo o anexo sem permissão. Compartilhar a tela, cores e configurações de chamada só o front confere (não passam pela API)
- **Cadastro de usuários**: em Sistema, "Permitir que as pessoas se cadastrem" (`cadastro_aberto`; fechado, o login não oferece Criar conta, pelo público `GET /cadastro`, e o `PUT /usuario` recusa). Pessoas › Usuários (permissão de administração `permissoes`, "Pessoas" na tela; a antiga `usuarios` foi juntada a ela na migração 054) é uma tela só: a lista com o painel de acessos de cada um (`ConfiguracaoAcessos`, com a marca de bot) e "Novo usuário", que cria pessoa (login, e-mail, senha) ou bot (instruções), com avatar e já com os acessos escolhidos (`PUT /usuario/novo` com `permissoes`; vem marcado o padrão: pessoa com todas as de uso, bot só com emoji, responder e reagir e só as de uso; a foto sobe só ao criar). "Usuário desde dd/mm/aaaa" (`usuarioDesde`, do `criado_em` que vem em `GET /permissoes` e nos contatos) aparece em Conta › Perfil e no perfil ao clicar na pessoa (`UserInfoModal`); na lista de Pessoas, só a data, numa coluna à direita (espaço, data e acessos com largura fixa); conta sem a data não mostra nada
- **Presença**: cada aba avisa pelo WebSocket (tipo 63) se está visível e em uso (30 s sem mexer = parada) e qual conversa está aberta; a API junta as abas: ativo (verde), ausente (amarelo) ou offline, com "visto por último" e "nesta conversa" no cabeçalho (`IndicadorPresenca`, `chat.presencaDe`). O próprio avatar na barra mostra como os outros te veem. Configurações > Privacidade: aparecer offline, mostrar visto por último, mostrar quando está na conversa
- **IA e resumo da conversa**: em IA › Servidor (a parte `ia` do `ConfiguracaoSistema`, permissão `parametros`) o administrador põe endereço, modelo e token de um servidor no padrão da OpenAI (vLLM, Ollama ou OpenAI), com "Testar conexão"; com a IA ligada (`useRecursos().recursos.ia`), o cabeçalho tem "Resumir conversa" (`ResumoConversaModal`): por período, a API resume em segundo plano separando por assunto, com pendências e "Ver na conversa"
- **Bots de IA**: IA › Bots (com a permissão `bots`, de administração; quem tem `permissoes` vê e edita todos): nome, instruções (personalidade e o que faz), ligado/desligado e as permissões de uso do bot (quem criou só libera o que ele mesmo tem; o bot nasce com emoji, responder e reagir). O bot é um usuário comum (tabela `bot` no servidor, migração 047), sem login, marcado `bot` nos contatos (marca "Bot" no `ChatHeader`). Responde na conversa direta, quando mencionado num grupo e quando respondem a ele; nunca a outro bot. No servidor (`bots.ts`), o modelo recebe as instruções e as 30 mensagens recentes, aparece "digitando", e usa ferramentas (function calling: reagir, responder citando, figurinha Noto, encaminhar, votação, buscar mensagens), cada uma só com a permissão e conferida pelas mesmas rotinas de uma pessoa; o texto final vira a mensagem dele. Servidor de IA que não aceita ferramentas: responde só em texto. Quando falha, avisa na conversa ("Não consegui responder a esta mensagem: …"), citando a mensagem. "Excluir bot" (com confirmação) tira o bot dos grupos, dos contatos e das telas (nas conversas diretas ele fica, para elas manterem o nome dele, mas não responde mais); o que ele escreveu fica (com histórico, o usuário fica e o bot é marcado `excluido_em`, migração 050; sem histórico, é apagado de vez)
- **Ferramentas externas dos bots**: IA › Ferramentas (permissão de administração `ferramentas`, migração 051): APIs HTTP com JSON que os bots podem chamar (ex.: a busca de uma base de conhecimento, RAG). Nome (o que a IA chama), descrição (quando usar), GET ou POST, endereço (`{parametro}` vira valor; o resto vai na consulta ou no corpo JSON), cabeçalhos (o valor fica só no servidor; vazio mantém o salvo), parâmetros (tipo e obrigatório), ligada, e "Testar" com valores de exemplo. Cada bot escolhe as suas na edição (`PUT /bot/ferramentas`; quem cria bots vê só nome e descrição, `GET /ferramentas/disponiveis`). No servidor (`ferramentas.ts`), 20 s por chamada e resposta cortada em 8 mil caracteres. No topo da lista fica a embutida `consultar_conhecimento` ("Embutida", só leitura, sem editar nem excluir), de exemplo de configuração: `GET /ferramentas/embutidas` devolve a descrição, os parâmetros e a definição exata que o modelo recebe, montada pela mesma `ferramentaConhecimento` do `bots.ts` com as bases cadastradas
- **Base de conhecimento (RAG)**: IA › Conhecimento (permissão de administração `conhecimento`, migração 052): bases e documentos (.txt, .md, .csv, .pdf, .docx). O texto sai no navegador (`utils/textoDocumento.ts`: pdf.js e o XML do Word pelo leitor de ZIP de `fontesOffice.ts`) e o servidor (`conhecimento.ts`) quebra em trechos (~1000 caracteres, com sobra), gera os embeddings no servidor de IA (modelo de embeddings em Sistema; nomic e e5 recebem o prefixo de pergunta/documento; opcionalmente num servidor de embeddings próprio, com endereço e token em Sistema e "Testar embeddings": vazio usa o da IA, e o token da IA nunca vai para o outro host) e guarda os trechos no **Qdrant** (container `qdrant` no Docker, uma coleção com a base e o documento no payload); o Postgres guarda os documentos com o texto inteiro, para "Reindexar tudo" quando o modelo muda. Indexação em segundo plano, um documento por vez, com status (indexando/pronto/erro); "Testar busca" mostra os trechos com a semelhança. Cada bot escolhe as bases (`PUT /bot/conhecimento`) e ganha a ferramenta `consultar_conhecimento`, que devolve os 5 trechos mais parecidos com o documento de origem
- **Sugestão da IA ao digitar**: depois de 0,6 s parado com o cursor no fim, `useSugestaoIa` pede a continuação (`POST /ia/sugestao`) e `editor/sugestao.ts` a mostra em cinza depois do cursor: Tab aceita, Esc descarta; pedido velho é cancelado. Ligada/desligada por navegador em Configurações > Privacidade
- **Telefonia SIP**: registro, discador, chamadas PSTN via sip.js. Só o administrador configura o ramal de cada pessoa (permissão de administração `sip`, migração 057; quem tinha `permissoes` ganhou): em Pessoas › Usuários, o painel da pessoa tem as abas Acessos e Telefonia (SIP) (`ConfiguracaoSipUsuario`; `GET/PUT/DELETE /sip/usuario`; as senhas não voltam para a tela, vazio mantém a salva). Conferência dos campos em `utils/sip.ts` (`problemaRamal`, a mesma do servidor). Cada um vê o próprio em Chamadas › Voip, só leitura, com o estado e Reconectar (`ConfiguracaoVoip`); usar continua pedindo a permissão de uso `telefonia`. A mídia vai pelo STUN do Google e, se o ramal tiver, pelo TURN do próprio PABX (`turn_server`, `turn_user`, `turn_password`; `iceDoRamal`), nunca pelo TURN do Conversa (ele só repassa até o MediaMTX e pode estar em relay). O áudio de quem atende toca pelo `remoteMediaStream` do sip.js. O destino aceita o número (`*43`) ou o endereço completo (`sip:*43@voip.empresa.com`), em `destinoSip`
- **Push notifications**: Firebase Cloud Messaging
- **Tema**: dark/light mode com CSS variables. Configurações > Tema tem o claro/escuro e temas prontos (Padrão, Teams, WhatsApp, Messenger, em `utils/temasPredefinidos.ts`: cor principal e, no escuro, os fundos), por baixo das cores ajustadas à mão (`useCoresPersonalizadas`); escolher um tema apaga os ajustes. Os balões têm variáveis próprias em `style.css` (`--bolha-enviada`, `-texto`, `-suave` (ícones e controles), `-destaque` (links e progresso), `-sucesso`, `-perigo` e `--bolha-recebida`; no Tailwind, `bg-enviada`, `text-enviada-texto/70`, `bg-recebida`...), com padrão igual à cor principal e às superfícies: dentro do balão enviado, use essas cores em vez de branco ou `primary-100/200` (o WhatsApp claro tem a enviada verde-clara com texto escuro). O Messenger define `--gradiente-enviada`, que os balões enviados (`Bolha*` e `MensagemStatus`) usam como fundo fixo na tela; nos outros temas a variável não existe e fica a cor `primary-600`. Texto e borda com `primary-600/700` levam `dark:` com um tom claro (ex.: `dark:text-primary-400`), porque um tema pode deixar esses tons escuros no escuro
- **Drag & drop**: arrastar arquivos para enviar
- **Chat popup**: janela popup independente para conversa
- **Barra de navegação oculta**: no computador, o botão no pé da `NavBar` oculta a barra de ícones; oculta, uma aba no pé da borda esquerda (perto de onde ficava o botão) a mostra de novo (com um ponto se há atividades novas). A escolha fica no navegador (`conversa.menuOculto`); no celular a barra do rodapé não muda

## 9. COMANDOS ÚTEIS

```bash
bun run dev        # Inicia o Vite (porta 5173, acessado pelo nginx do backend em HTTPS na 443)
bun run typecheck  # Checagem de tipos (strict + noUncheckedIndexedAccess), inclusive dos testes
bun run test       # Testes (bun test + happy-dom) de utils, services, stores, composables e componentes, em tests/unit
bun run e2e        # Ponta a ponta (Playwright, pelo Node) contra o ambiente local do Docker: duas pessoas, ligação, tela, chat, presença
bun run e2e:ver    # O mesmo, com as janelas à vista e mais devagar
bun run build      # Type-check + build de produção
bun run preview    # Preview do build de produção
```

### Testes de ponta a ponta (`e2e/`)

- Playwright rodando pelo **Node** (o Bun no Windows não abre o navegador dele), com o **Edge** do Windows: o Chromium baixado pelo Playwright não abre com janela nesta máquina
- Precisam do Docker no ar (`https://localhost`). Usam as contas "Teste Ana E2E" e "Teste Bruno E2E" no banco de desenvolvimento, criadas na primeira execução (senhas em `e2e/.contas.json`, fora do Git) por `e2e/preparar.ts`
- Cada pessoa num navegador próprio (`abrirComo`, em `e2e/apoio.ts`): no mesmo processo a câmera falsa de uma encerra a da outra. A câmera é um vídeo de teste gerado (`e2e/camera.ts`), porque a falsa padrão do Edge se encerra sozinha; a tela compartilhada é escolhida sozinha
- Mídia conferida pelas estatísticas do WebRTC (`esperarMidiaChegando`). Falhou: vídeo de cada janela e trace em `e2e/resultados`, relatório em `e2e/relatorio`

## 10. DOCUMENTAÇÃO DO PROJETO

- Este arquivo (`CLAUDE.md`) é a referência principal para desenvolvimento assistido
- `README.md` na raiz para informações gerais
