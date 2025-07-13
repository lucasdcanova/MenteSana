# MindWell - Versão Expo Go

Este diretório contém uma versão do MindWell adaptada para funcionar com o Expo Go, facilitando o desenvolvimento e teste em dispositivos móveis reais.

## Pré-requisitos

1. Instale o aplicativo Expo Go em seu dispositivo:
   - [App Store (iOS)](https://apps.apple.com/app/apple-store/id982107779)
   - [Google Play (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Certifique-se de ter Node.js instalado em seu computador

## Como Iniciar

### Método 1: Usando o script
Execute o script na raiz do projeto:
```
./start-expo.sh
```

### Método 2: Iniciando manualmente
Navegue até o diretório expo-app e execute:
```
cd expo-app
npx expo start
```

## Usando o Aplicativo

Após iniciar o servidor Expo, você verá um QR code no terminal. Escaneie este QR code usando:
- **iOS**: Câmera do iPhone
- **Android**: Aplicativo Expo Go

O aplicativo MindWell será carregado automaticamente no Expo Go.

## Desenvolvimento

Esta versão Expo é um ambiente paralelo para testes e desenvolvimento mobile. Ela contém a interface do usuário recriada usando componentes React Native nativos, mantendo a mesma aparência e comportamento da versão web.

Quando você fizer alterações na versão Expo, elas não afetarão a versão web principal e vice-versa.

## Conectando ao Backend

Esta versão Expo se conecta ao mesmo backend da versão web. Se você estiver executando o backend localmente, certifique-se de que:

1. O dispositivo e o computador estejam na mesma rede Wi-Fi
2. Use o endereço IP do seu computador (não localhost) na configuração de API do aplicativo Expo

## Problemas Comuns

- **Erro de conexão**: Verifique se o dispositivo e o computador estão na mesma rede
- **QR code não funciona**: Tente usar a opção "Send link with email" no terminal Expo
- **Falha ao iniciar**: Verifique se todas as dependências estão instaladas corretamente

## Observações

Esta é uma versão simplificada do aplicativo MindWell, otimizada para testes de interface e experiência do usuário móvel. A funcionalidade completa está disponível na versão web e na versão iOS nativa.