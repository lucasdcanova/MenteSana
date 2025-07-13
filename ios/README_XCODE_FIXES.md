# Soluções para Problemas do Xcode

Este documento explica como resolver os problemas encontrados no Xcode ao tentar compilar o app nativo MindWell para iOS.

## Problema 1: Splash Screen Excede o Limite de Memória

**Erro:** "The launch screen exceeds the memory limit and may not display during app launch. Use images requiring less space."

**Solução:**

1. Execute o script de otimização da splash screen incluído:

   ```bash
   cd ios/App/App
   ./optimize-splash.sh
   ```

   Este script substitui automaticamente as imagens da splash screen por versões otimizadas com resolução mais baixa (1242x1242 pixels) e tamanho de arquivo reduzido em aproximadamente 90%.

2. No Xcode, limpe o build (Product > Clean Build Folder) e reconstrua o projeto.

## Problema 2: Erro de configuração base

**Erro:** "Unable to open base configuration reference file '/Users/.../Pods/Target Support Files/...'"

**Solução:**

1. Feche o Xcode
2. No terminal, navegue até a pasta do projeto iOS:

   ```bash
   cd ios
   pod deintegrate
   pod install --repo-update
   ```

3. Reabra o projeto usando o arquivo `App.xcworkspace` (não o `.xcodeproj`)

## Problema 3: Aviso de script de build

**Aviso:** "Run script build phase '[CP] Embed Pods Frameworks' will be run during every build because it does not specify any outputs."

**Solução:**

Este é apenas um aviso e não impede o build ou execução do aplicativo. Você pode ignorá-lo com segurança.

Se quiser corrigir este aviso:

1. No Xcode, selecione o projeto no navegador
2. Vá para a aba "Build Phases"
3. Expanda a seção "[CP] Embed Pods Frameworks"
4. Adicione explicitamente os seguintes arquivos de saída:
   - `$(DERIVED_FILE_DIR)/$(FRAMEWORKS_FOLDER_PATH)/Capacitor.framework`
   - `$(DERIVED_FILE_DIR)/$(FRAMEWORKS_FOLDER_PATH)/CapacitorCordova.framework`

## Outros Problemas Comuns

### Se o aplicativo não sincronizar corretamente:

```bash
npx cap sync ios
```

### Para atualizar o código depois de fazer alterações no aplicativo web:

1. Faça o build do projeto web:
   ```bash
   npm run build
   ```

2. Sincronize com o projeto iOS:
   ```bash
   npx cap copy ios
   npx cap sync ios
   ```

### Para abrir no Xcode após a sincronização:

```bash
npx cap open ios
```