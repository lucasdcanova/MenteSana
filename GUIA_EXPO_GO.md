# Guia de Uso do MindWell com Expo Go

## O que é o Expo Go?

O Expo Go é um aplicativo disponível para iOS e Android que permite visualizar e testar aplicativos React Native durante o desenvolvimento sem a necessidade de configurar todo o ambiente nativo.

## Pré-requisitos

1. Instale o aplicativo Expo Go em seu dispositivo:
   - [App Store (iOS)](https://apps.apple.com/app/apple-store/id982107779)
   - [Google Play (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Certifique-se de que seu dispositivo e computador estejam conectados à mesma rede Wi-Fi.

## Como Iniciar o MindWell no Expo Go

### Passo 1: Inicie o servidor Expo

Execute o script `start-expo.sh` na raiz do projeto:

```bash
./start-expo.sh
```

Este script navega até o diretório `expo-app` e inicia o servidor Expo.

### Passo 2: Conecte seu dispositivo

Após iniciar o servidor, você verá um QR code no terminal. Escaneie este código usando:

- **iOS**: Use a câmera do iPhone para escanear o QR code
- **Android**: Abra o aplicativo Expo Go e toque em "Scan QR Code"

### Passo 3: Teste o aplicativo

O aplicativo MindWell será carregado no Expo Go. Você poderá navegar e testar a interface nativa.

## Estrutura do Projeto Expo

A estrutura do MindWell para Expo Go está organizada da seguinte forma:

```
expo-app/
├── App.js               # Componente principal do aplicativo
├── app.json             # Configuração do Expo
├── babel.config.js      # Configuração do Babel
├── package.json         # Dependências do projeto Expo
└── README.md            # Documentação específica
```

## Notas Importantes

1. **Aplicativo Simplificado**: Esta versão Expo é uma implementação simplificada da interface do MindWell, focada principalmente na navegação e na experiência visual.

2. **Desenvolvimento Paralelo**: O código do Expo é mantido separadamente da base principal do MindWell para evitar conflitos de dependências.

3. **Conexão com Backend**: Por padrão, o aplicativo Expo tenta se conectar ao backend do MindWell. Se você estiver executando o backend localmente, precisará ajustar a URL no código.

4. **Alterações em Tempo Real**: O Expo Go suporta "hot reloading", então qualquer alteração feita nos arquivos JavaScript será refletida automaticamente no aplicativo.

## Solução de Problemas

- **QR Code não funciona**: Verifique se o dispositivo e o computador estão na mesma rede Wi-Fi. Alternativamente, no terminal onde o Expo está rodando, você pode encontrar opções como "Send link with email" ou "Send to phone number".

- **Erros de conexão**: Se o aplicativo não conseguir se conectar ao backend, verifique as configurações de rede e firewall.

- **Aplicativo não atualiza**: Tente agitar o dispositivo para abrir o menu de desenvolvimento do Expo e selecione "Reload".

## Próximos Passos

Para uma integração mais profunda entre o MindWell e o Expo, seria necessário alinhar as versões das dependências e compartilhar componentes de interface entre as plataformas web e nativa.

---

Esta documentação será atualizada conforme novas funcionalidades forem adicionadas à versão Expo do MindWell.