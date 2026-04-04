# Conversa Web

Cliente web do Conversa, construido com Vue 3 + TypeScript + Tailwind CSS.

## Pre-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Repositorio backend [conversa](../conversa) clonado ao lado deste projeto

## Arquitetura do ambiente

O ambiente de desenvolvimento usa varios servicos que trabalham juntos:

```
Navegador
    |
    | https://<seu-ip>:4430
    v
+---------+
|  Nginx  |  (reverse proxy com SSL - porta 4430)
+---------+
    |
    +---> /            -> Vite dev server (porta 5173)
    +---> /api/        -> Backend Delphi (porta 8080)
    +---> /ws/         -> WebSocket (porta 9090)
    +---> /storage/    -> MinIO S3 (porta 9000)
    +---> /webrtc/     -> MediaMTX (porta 8889)
```

O Nginx atua como ponto de entrada unico, encaminhando cada tipo de requisicao para o servico correto. Isso permite que o frontend acesse tudo pelo mesmo endereco e porta, sem problemas de CORS.

## Configuracao inicial (primeira vez)

Na pasta `conversa\bin\` existem tres scripts de setup que preparam o ambiente. Execute-os **uma unica vez**, na ordem abaixo:

### setup-postgres.bat

Cria o volume Docker e sobe o container do PostgreSQL (porta 5432).

```
conversa\bin\setup-postgres.bat
```

- Cria um volume `pgdata` para persistir os dados do banco
- Sobe o container `postgres` com a imagem `postgres:15-alpine`
- Senha do superusuario: `root`

### setup-minio.bat

Sobe o container do MinIO (armazenamento S3) e cria o bucket inicial.

```
conversa\bin\setup-minio.bat
```

- Sobe o container `minio` nas portas 9000 (API S3) e 9001 (console web)
- Credenciais: usuario `admin`, senha `admin123`
- Cria o bucket `chat` onde os arquivos enviados serao armazenados
- Console de administracao acessivel em `http://localhost:9001`

### setup-cert.bat

Gera o certificado SSL local para desenvolvimento (necessario para HTTPS e WebRTC).

```
conversa\bin\setup-cert.bat
```

- Baixa e instala o [mkcert](https://github.com/FiloSottile/mkcert) automaticamente se nao estiver instalado
- Pede o IP da sua maquina na rede local (ex: `192.168.0.5`)
- Gera os arquivos `cert.pem` e `key.pem` na pasta `conversa\bin\cert\`
- Instala a CA raiz no sistema para que o navegador confie no certificado

> Apos executar os tres scripts, o ambiente esta pronto. Os passos abaixo sao os que voce executa **toda vez** que for desenvolver.

---

## 1. Iniciar os servicos Docker

Antes de tudo, certifique-se de que o **Docker Desktop** esta aberto e rodando. Dois containers sao necessarios:

| Container  | Imagem                | Porta  | Funcao                      |
|------------|-----------------------|--------|-----------------------------|
| `postgres` | `postgres:15-alpine`  | `5432` | Banco de dados PostgreSQL   |
| `minio`    | `quay.io/minio/minio` | `9000` | Armazenamento de arquivos   |

## 2. Iniciar o servidor backend

O backend (API REST, WebSocket, Nginx e MediaMTX) e iniciado por um unico script:

```
conversa\bin\_start.bat
```

Basta dar **duplo-clique** neste arquivo. Ele abre tres abas no Windows Terminal:

1. **Nginx** - Reverse proxy (porta 4430 dev / porta 80 prod)
2. **MediaMTX** - Servidor WebRTC para chamadas de audio/video
3. **conversa.rest.exe** - API REST (porta 8080) + WebSocket (porta 9090)

Aguarde alguns segundos ate que todos os servicos estejam prontos. O terminal do `conversa.rest.exe` mostrara as rotas registradas quando estiver pronto.

## 3. Iniciar o frontend (Vite dev server)

Abra a pasta `conversa-web` no VS Code e execute no terminal integrado:

```bash
# Instalar dependencias (apenas na primeira vez ou apos alterar package.json)
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

O Vite sobe na porta **5173**, mas voce **nao deve acessar diretamente** por essa porta. O acesso ao app e feito via Nginx.

## 4. Acessar a aplicacao

Abra o navegador e acesse:

```
https://<seu-ip>:4430
```

Por exemplo: `https://192.168.0.5:4430`

> Em outras máquinas navegador mostrará um aviso de certificado SSL auto-assinado. Clique em **Avancado** e **Prosseguir** para continuar.

**Por que usar o IP e nao localhost?** As chamadas WebRTC exigem HTTPS com um certificado, e o Nginx esta configurado com SSL no IP da maquina. Alem disso, usar o IP permite testar de outros dispositivos na mesma rede (celular, outro computador).

## Comandos disponiveis

| Comando            | Descricao                              |
|--------------------|----------------------------------------|
| `npm run dev`      | Inicia o Vite dev server com HMR       |
| `npm run build`    | Type-check + build de producao         |

## Resumo da ordem de inicializacao

**Primeira vez (setup):**

1. Executar `setup-postgres.bat` (cria o banco)
2. Executar `setup-minio.bat` (cria o armazenamento)
3. Executar `setup-cert.bat` (gera certificado SSL)
4. Rodar `npm install` no projeto web

**Toda vez que for desenvolver:**

1. Abrir o **Docker Desktop** (aguardar containers `postgres` e `minio` subirem)
2. Executar **`_start.bat`** do backend (Nginx + MediaMTX + API)
3. Rodar **`npm run dev`** no projeto web
4. Acessar **`https://<seu-ip>:4430`** no navegador

## Deploy (atualizar o frontend em producao)

Para publicar uma nova versao do frontend:

```bash
npm run build
```

Isso gera os arquivos otimizados na pasta `dist/`. Em seguida, copie todo o conteudo de `dist/` para a pasta `web/` do servidor backend:

```
conversa-web\dist\*  -->  conversa\bin\web\
```
