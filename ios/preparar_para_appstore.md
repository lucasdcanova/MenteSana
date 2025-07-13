# Preparando o MindWell para a App Store

Este guia explica como preparar o aplicativo MindWell para envio à App Store.

## Pré-requisitos

1. Conta de desenvolvedor Apple ativa (US$ 99/ano)
2. Xcode instalado em um Mac
3. Certificados de distribuição configurados
4. Perfil de provisionamento para App Store

## Passo a Passo

### 1. Gere os arquivos web otimizados

Execute o script de build no projeto Replit:

```bash
# Método 1: Usando o script shell
./build-for-www.sh

# Método 2: Usando o script Node.js
node build-web.js
```

### 2. Sincronize os arquivos com o projeto iOS

```bash
npx cap sync ios
```

### 3. Ajuste as informações do aplicativo

No Xcode:
1. Abra o arquivo `App.xcworkspace` 
2. Selecione o projeto "App" no navegador de projetos
3. Selecione a target "App"
4. Na aba "General", verifique e ajuste:
   - Display Name: MindWell
   - Bundle Identifier: br.com.mindwell
   - Version: 1.0.0 (versão semântica major.minor.patch)
   - Build: 1 (incrementar a cada envio para a App Store)
   - Deployment Info:
     - Deployment Target: iOS 14.0 ou superior
     - Device Orientation: Portrait (recomendado)
     - Status Bar Style: Default
     - Hide status bar: Desativado
     - Requires full screen: Ativado

### 4. Configure ícones e splash screen

1. Na aba "General", seção "App Icons and Launch Images":
   - Assegure-se de que o recurso "AppIcon" contém todos os tamanhos de ícones
   - Verifique se os ícones seguem as diretrizes da Apple (sem transparência, dimensões corretas)

2. Para o splash screen:
   - Os recursos devem estar em Assets.xcassets/Splash.imageset
   - Certifique-se de ter imagens para 1x, 2x e 3x (diferentes resoluções)

### 5. Verifique permissões e descrições de uso

Em `Info.plist`, assegure-se de que todas as permissões têm descrições claras e específicas:
- NSMicrophoneUsageDescription: "MindWell precisa acessar seu microfone para gravar entradas de áudio no diário e transcrever seus pensamentos."
- NSCameraUsageDescription: "MindWell usa sua câmera para videochamadas com terapeutas e anexar fotos ao seu diário."
- NSPhotoLibraryUsageDescription: "MindWell precisa acessar sua biblioteca de fotos para anexar imagens às suas entradas do diário."

### 6. Gere um build para arquivamento

1. No Xcode, selecione "Any iOS Device" no seletor de destino
2. Vá para Product > Archive
3. Aguarde a conclusão do processo de arquivamento

### 7. Envie para a App Store

1. Quando o arquivamento for concluído, o Xcode Organizer abrirá automaticamente
2. Selecione o arquivo mais recente
3. Clique em "Distribute App"
4. Selecione "App Store Connect" e siga as instruções
5. Escolha as opções:
   - Upload: para enviar à Apple
   - Export: para criar um arquivo IPA para distribuição manual

### 8. Complete as informações no App Store Connect

Acesse [App Store Connect](https://appstoreconnect.apple.com) e complete:
1. Informações do aplicativo:
   - Nome, subtítulo, descrição, palavras-chave
   - Categoria: Saúde e Fitness / Medicina
   - Capturas de tela (diferentes tamanhos para iPhone/iPad)
   - Vídeo promocional (opcional)
2. Política de privacidade:
   - URL para sua política de privacidade
   - Declaração sobre uso de dados
3. Classificação de idade:
   - Preencha o questionário de classificação
4. Precificação e disponibilidade:
   - Gratuito, assinatura ou compra única
   - Países onde o app estará disponível

### 9. Espere pela revisão da Apple

- O processo de revisão tipicamente leva 1-2 dias úteis
- Esteja preparado para responder a perguntas da equipe de revisão
- Se rejeitado, corrija os problemas e envie novamente

## Dicas extras

1. **TestFlight**: Considere usar o TestFlight antes de enviar para a App Store:
   - Permite testar com usuários reais
   - Ajuda a identificar bugs antes do lançamento oficial
   - Configure em App Store Connect > TestFlight

2. **Otimização para App Store (ASO)**:
   - Pesquise palavras-chave relevantes para seu nicho
   - Escreva descrições claras focadas em benefícios
   - Use todas as capturas de tela possíveis para mostrar recursos

3. **Localização**:
   - Se o app tiver suporte a vários idiomas, certifique-se de que as descrições da App Store também estão traduzidas
   - Configure localizações no App Store Connect

4. **Atendimento à LGPD/GDPR**:
   - Certifique-se de que seu aplicativo atende aos requisitos legais
   - Documente como os dados dos usuários são tratados

5. **App tracking transparency**:
   - Se o app rastrear usuários entre aplicativos, configure corretamente o framework ATT
   - Adicione justificativa clara no NSUserTrackingUsageDescription no Info.plist