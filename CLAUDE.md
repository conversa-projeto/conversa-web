# Guia para manutenção do projeto

## Arquitetura de exibição de mensagens

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

### Regras

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

## Convenções

- Nomes em português para componentes e utilitários do domínio
- Vue 3 com `<script setup lang="ts">` e Tailwind CSS
- Enums como `const` objects seguindo o padrão de `src/types/api.ts`
