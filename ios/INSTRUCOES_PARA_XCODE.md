# Instruções para Instalação e Resolução de Problemas no Xcode

## Instalação e Execução do Aplicativo iOS

Para executar o aplicativo MindWell no Xcode e em dispositivos iOS, siga estas etapas:

1. **Baixe a pasta `ios`** deste projeto para seu Mac
2. **Abra o Terminal** e navegue até o diretório baixado:
   ```bash
   cd ~/caminho/para/pasta/ios
   ```
3. **Instale os Pods necessários**:
   ```bash
   cd App
   pod install
   ```
4. **Abra o projeto no Xcode** usando o arquivo `.xcworkspace`:
   ```bash
   open App.xcworkspace
   ```
5. **Selecione um dispositivo ou simulador** como destino
6. **Execute o aplicativo** clicando no botão de reprodução (▶)

## Problema: "Unable to open base configuration reference file"

Se você estiver enfrentando erros como:
- "Unable to open base configuration reference file" em arquivos `.xcconfig`
- Problemas relacionados aos arquivos Pods

Siga estas etapas de solução em seu Mac (não no Replit):

### 1. Reinstalação completa dos Pods

Abra o Terminal no seu Mac e navegue até a pasta do projeto iOS:

```bash
# Navegue até a pasta onde você salvou os arquivos iOS
cd ~/caminho/para/sua/pasta/ios/App

# Instale as ferramentas de desintegração e limpeza do CocoaPods
sudo gem install cocoapods-deintegrate cocoapods-clean

# Desintegre e limpe os Pods existentes
pod deintegrate
pod clean

# Remova completamente a pasta Pods
rm -rf Pods

# Limpe os dados derivados do Xcode
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Remova o arquivo de bloqueio do Podfile
rm Podfile.lock

# Configure e reinstale os Pods
pod setup
pod install --repo-update
```

## 2. Modificação do AppDelegate.swift (se necessário)

Se o aplicativo não inicializar corretamente, você pode precisar modificar o AppDelegate.swift. Compare seu arquivo atual com esta implementação recomendada:

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // No código padrão do Capacitor, isso já é gerenciado pelo ApplicationDelegateProxy
        // Não é necessário sobrescrever com implementação manual do CAPBridgeViewController
        return ApplicationDelegateProxy.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
```

## 3. Processo de build e atualização

Após corrigir os problemas dos Pods, atualize o código web e sincronize com o projeto iOS:

```bash
# No diretório do projeto Replit
# Execute o build para a pasta www 
./build-for-www.sh

# Sincronize o código web com o projeto iOS
npx cap sync ios
```

## 4. Abrir no Xcode

Após sincronizar, você pode abrir o projeto no Xcode:

```bash
npx cap open ios
```

Importante: No Xcode, abra sempre o arquivo `App.xcworkspace` em vez do `.xcodeproj`.

## 5. Problema persistente?

Se o problema persistir, uma solução mais drástica seria:

1. Fazer backup da pasta `ios/App/App` (que contém Info.plist e outros arquivos configurados)
2. Remover completamente a pasta `ios`
3. Adicionar a plataforma iOS novamente com `npx cap add ios`
4. Restaurar manualmente as configurações personalizadas

## Notas sobre a estrutura de diretórios

- O Capacitor espera que o código web esteja na pasta `www`, conforme configurado no `capacitor.config.ts`.
- Os arquivos no Xcode devem ser acessados através do App.xcworkspace após a instalação dos Pods.