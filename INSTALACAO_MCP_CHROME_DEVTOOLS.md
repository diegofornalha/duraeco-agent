# Instalação do MCP do Chrome DevTools no Claude Code

## O que é MCP?

MCP (Model Context Protocol) é um protocolo que permite ao Claude Code se integrar com ferramentas externas e CLIs, expandindo suas capacidades.

## O que é Chrome DevTools MCP?

O `chrome-devtools-mcp` permite que o Claude Code controle e inspecione um navegador Chrome ao vivo. Ele atua como um servidor MCP, dando ao assistente de IA acesso ao poder completo do Chrome DevTools para:

- ✅ **Automação confiável** de interações com o navegador
- ✅ **Debugging avançado** de aplicações web
- ✅ **Análise de performance** com traces e insights
- ✅ **Análise de rede** (requests, responses, etc.)
- ✅ **Screenshots e console** do navegador
- ✅ **Execução de scripts** no contexto da página

## Instalação do Servidor MCP do Chrome DevTools

### Comando Utilizado

```bash
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

### O que esse comando faz:

1. **`claude mcp add`**: Comando do Claude Code para adicionar um novo servidor MCP
2. **`chrome-devtools`**: Nome identificador do servidor MCP
3. **`npx`**: Comando base que será executado
4. **`chrome-devtools-mcp@latest`**: Pacote npm do Chrome DevTools MCP (sempre usa a versão mais recente)

### Resultado

O servidor foi adicionado ao arquivo de configuração: `/Users/2a/.claude.json`

A configuração criada foi:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

## Funcionalidades Disponíveis

Com o MCP do Chrome DevTools instalado, o Claude Code agora tem acesso a:

### Automação de Entrada (8 ferramentas)
- ✅ `click` - Clicar em elementos
- ✅ `drag` - Arrastar elementos
- ✅ `fill` - Preencher campos
- ✅ `fill_form` - Preencher formulários completos
- ✅ `handle_dialog` - Gerenciar diálogos (alerts, confirms)
- ✅ `hover` - Passar mouse sobre elementos
- ✅ `press_key` - Pressionar teclas
- ✅ `upload_file` - Upload de arquivos

### Automação de Navegação (6 ferramentas)
- ✅ `close_page` - Fechar páginas
- ✅ `list_pages` - Listar páginas abertas
- ✅ `navigate_page` - Navegar para URLs
- ✅ `new_page` - Abrir nova página
- ✅ `select_page` - Selecionar página ativa
- ✅ `wait_for` - Aguardar condições

### Emulação (2 ferramentas)
- ✅ `emulate` - Emular dispositivos móveis
- ✅ `resize_page` - Redimensionar viewport

### Performance (3 ferramentas)
- ✅ `performance_analyze_insight` - Analisar insights de performance
- ✅ `performance_start_trace` - Iniciar gravação de trace
- ✅ `performance_stop_trace` - Parar gravação de trace

### Rede (2 ferramentas)
- ✅ `get_network_request` - Obter detalhes de request
- ✅ `list_network_requests` - Listar todas as requests

### Debugging (5 ferramentas)
- ✅ `evaluate_script` - Executar JavaScript na página
- ✅ `get_console_message` - Obter mensagem do console
- ✅ `list_console_messages` - Listar todas as mensagens do console
- ✅ `take_screenshot` - Capturar screenshot
- ✅ `take_snapshot` - Capturar snapshot do DOM

## Configurações Avançadas

Você pode adicionar opções adicionais ao servidor MCP editando o arquivo `.claude.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--headless=true",           // Executar sem interface gráfica
        "--isolated=true",            // Usar perfil temporário
        "--channel=canary",          // Usar Chrome Canary
        "--viewport=1920x1080"       // Definir tamanho da janela
      ]
    }
  }
}
```

### Opções Disponíveis

- **`--headless`**: Executar Chrome sem interface gráfica (padrão: `false`)
- **`--isolated`**: Usar diretório temporário que é limpo automaticamente (padrão: `false`)
- **`--channel`**: Especificar canal do Chrome (`stable`, `canary`, `beta`, `dev`)
- **`--viewport`**: Tamanho inicial da viewport (ex: `1280x720`)
- **`--executablePath`**: Caminho customizado para executável do Chrome
- **`--browserUrl`**: Conectar a instância Chrome existente (ex: `http://127.0.0.1:9222`)
- **`--wsEndpoint`**: Endpoint WebSocket para conexão direta
- **`--categoryEmulation`**: Desabilitar ferramentas de emulação (padrão: `true`)
- **`--categoryPerformance`**: Desabilitar ferramentas de performance (padrão: `true`)
- **`--categoryNetwork`**: Desabilitar ferramentas de rede (padrão: `true`)

## Conectar a uma Instância Chrome Existente

Se preferir usar seu perfil Chrome existente:

1. **Inicie o Chrome com porta de debugging:**

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-profile-stable

# Linux
/usr/bin/google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-profile-stable

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-profile-stable"
```

2. **Configure o MCP para conectar:**

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--browserUrl=http://127.0.0.1:9222"
      ]
    }
  }
}
```

⚠️ **Aviso de Segurança**: Habilitar a porta de debugging abre uma porta no navegador que qualquer aplicação pode usar para controlar o Chrome. Não navegue em sites sensíveis enquanto o debugging estiver ativo.

## Primeiro Teste

Para testar se a instalação funcionou, use este prompt no Claude Code:

```
Verifique a performance de https://developers.chrome.com
```

O Claude Code deve abrir o navegador automaticamente e gerar um relatório de performance.

## Diretório de Dados do Usuário

O `chrome-devtools-mcp` usa o seguinte diretório por padrão:

- **Linux / macOS**: `$HOME/.cache/chrome-devtools-mcp/chrome-profile-stable`
- **Windows**: `%HOMEPATH%/.cache/chrome-devtools-mcp/chrome-profile-stable`

Este diretório é compartilhado entre todas as instâncias e **não é limpo automaticamente**. Use a opção `--isolated=true` para usar um diretório temporário que é limpo após o fechamento do navegador.

## Casos de Uso

### 1. Testar Aplicação Angular
```
Abra http://localhost:4210 e verifique se há erros no console
```

### 2. Analisar Performance
```
Grave um trace de performance da página inicial do sistema e identifique gargalos
```

### 3. Testar Formulários
```
Preencha o formulário de cadastro de carteira com dados de teste e submeta
```

### 4. Debug de Requisições
```
Liste todas as requisições HTTP feitas ao carregar a página de cotações
```

### 5. Screenshots Automatizados
```
Tire um screenshot da página de consulta de operações em diferentes resoluções
```

## Limitações Conhecidas

### Sandboxes do Sistema Operacional

Alguns clientes MCP permitem sandboxing do servidor usando macOS Seatbelt ou containers Linux. Se o sandbox estiver habilitado, o `chrome-devtools-mcp` não conseguirá iniciar o Chrome (que requer permissões para criar seus próprios sandboxes).

**Soluções:**
1. Desabilitar sandbox para `chrome-devtools-mcp` no cliente MCP
2. Usar `--browserUrl` para conectar a uma instância Chrome iniciada manualmente fora do sandbox

## Próximos Passos

1. **Reinicie o Claude Code** para carregar o novo servidor MCP
2. Comece a usar comandos de automação e debugging do Chrome
3. O Claude agora pode ajudar com testes E2E, debugging visual e análise de performance

## Requisitos

- ✅ **Node.js** v20.19 ou superior
- ✅ **Chrome** versão estável atual ou superior
- ✅ **npm** instalado

## Referências

- [Repositório oficial do Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Documentação de ferramentas](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md)
- [Troubleshooting](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/troubleshooting.md)
- [Claude Code Documentation](https://code.claude.com/docs)

---

**Data de instalação:** 01/12/2025
**Projeto:** odoo19framework
**Versão:** chrome-devtools-mcp@latest
**Status:** ✅ Conectado e funcionando
