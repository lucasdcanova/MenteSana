# Perguntas Frequentes sobre o MindWell para iOS

## Perguntas Gerais

### Q: Como faço para testar o aplicativo no meu iPhone?
**R:** Para testar no seu iPhone:
1. Abra o projeto no Xcode usando `App.xcworkspace`
2. Conecte seu iPhone via cabo USB
3. Selecione seu dispositivo na lista suspensa de destinos no Xcode
4. Clique no botão de reprodução (▶)
5. Pode ser necessário autorizar seu perfil de desenvolvedor nas configurações do iPhone: Ajustes > Geral > Gerenciamento de Dispositivo

### Q: Preciso fazer o build do aplicativo web antes de testar no iOS?
**R:** Sim. O aplicativo iOS usa os arquivos web compilados na pasta `www`. Execute o script `./build-for-www.sh` para gerar esses arquivos, depois sincronize-os com o projeto iOS usando `npx cap sync ios`.

### Q: Por que estou recebendo erros de permissão no iOS?
**R:** iOS tem regras estritas de permissão. Certifique-se de que:
1. As chaves necessárias estão corretamente configuradas no `Info.plist` 
2. Você está solicitando as permissões no momento adequado usando as APIs do Capacitor
3. As permissões estão sendo solicitadas com um contexto claro para o usuário

## Problemas Comuns e Soluções

### Q: Erro "Unable to open base configuration reference file"
**R:** Este erro geralmente ocorre quando há problemas com CocoaPods. Siga as instruções de reinstalação completa dos Pods no arquivo INSTRUCOES_PARA_XCODE.md.

### Q: O aplicativo abre, mas mostra uma tela em branco
**R:** Isso pode acontecer por vários motivos:
1. O build web não foi feito ou está incorreto
2. Os arquivos web não foram sincronizados com o projeto iOS (`npx cap sync ios`)
3. Há problemas com a inicialização do capacitor no `AppDelegate.swift`
4. Algum erro JavaScript impede a renderização da aplicação (verifique o console)

Para diagnosticar:
1. Nos simuladores iOS, use Cmd+D para abrir o menu de desenvolvedor
2. Selecione "Safari Web Inspector" para ver os logs do console
3. Verifique se há erros JavaScript ou problemas de conectividade

### Q: O microfone não funciona no aplicativo
**R:** Verifique:
1. Se a permissão `NSMicrophoneUsageDescription` está configurada no `Info.plist`
2. Se você está solicitando permissão usando as APIs do Capacitor antes de tentar usar o microfone
3. No dispositivo iOS, verifique se a permissão foi concedida em Ajustes > MindWell > Microfone

### Q: Os sons não tocam no aplicativo
**R:** No iOS, a reprodução de áudio requer:
1. Usar as APIs corretas (Web Audio API ou Howler.js funcionam bem)
2. O usuário deve ter interagido com a aplicação pelo menos uma vez antes de reproduzir áudio
3. Verificar se o dispositivo não está no modo silencioso

## Desenvolvimento e Distribuição

### Q: Como gero uma versão para a App Store?
**R:** Para gerar um build para a App Store:
1. Configure o certificado de desenvolvedor e identificador de aplicativo no Apple Developer Portal
2. No Xcode, selecione "Any iOS Device" como destino
3. Vá para Product > Archive
4. Depois que o arquivamento for concluído, use o Xcode Organizer para enviar para a App Store

### Q: Como atualizo o aplicativo iOS depois de fazer alterações no código web?
**R:** Fluxo de atualização:
1. Faça as alterações no código web (React/TypeScript)
2. Execute o script de build: `./build-for-www.sh`
3. Sincronize as alterações com o projeto iOS: `npx cap sync ios`
4. Abra o projeto no Xcode: `npx cap open ios` ou abra `App.xcworkspace` manualmente
5. Execute o aplicativo no simulador ou dispositivo

### Q: Como debugo o aplicativo iOS durante o desenvolvimento?
**R:** Várias técnicas:
1. Use `console.log()` para depuração simples (visível no Safari Web Inspector)
2. No iOS Simulator, use Cmd+D para abrir o menu de desenvolvedor e selecionar "Safari Web Inspector"
3. Adicione pontos de interrupção no código Swift usando o Xcode para depurar código nativo
4. Use o Capacitor Plugins Logger ativando-o em `capacitor.config.ts`:
   ```typescript
   const config: CapacitorConfig = {
     // outras configurações...
     loggingBehavior: 'debug'
   };
   ```

### Q: Como lidar com atualizações de plugins do Capacitor?
**R:** Quando atualizar plugins:
1. Atualize a versão no `package.json`
2. Execute `npm install`
3. Sincronize as alterações: `npx cap sync ios`
4. Reconstrua o projeto no Xcode