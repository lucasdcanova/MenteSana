# MindWell para iOS

Este diretório contém a configuração do aplicativo MindWell para iOS, utilizando o framework Capacitor para transformar o aplicativo web em um aplicativo nativo.

## Guias Disponíveis

- [**INSTRUCOES_PARA_XCODE.md**](./INSTRUCOES_PARA_XCODE.md) - Instruções detalhadas para instalação e resolução de problemas no Xcode
- [**README_XCODE_FIXES.md**](./README_XCODE_FIXES.md) - Soluções para problemas comuns do Xcode
- [**SPLASH_SCREEN_FIX.md**](./SPLASH_SCREEN_FIX.md) - Como resolver o problema de limite de memória da splash screen
- [**BRANDING_MINDWELL.md**](./BRANDING_MINDWELL.md) - Guia de aplicação do branding Mindwell no aplicativo iOS
- [**STYLE_GUIDE_MINDWELL.md**](./STYLE_GUIDE_MINDWELL.md) - Guia detalhado de estilo para desenvolvedores iOS
- [**FAQ_iOS.md**](./FAQ_iOS.md) - Perguntas frequentes sobre desenvolvimento para iOS
- [**preparar_para_appstore.md**](./preparar_para_appstore.md) - Guia para preparar o aplicativo para publicação na App Store

## Primeiros Passos

Para começar a trabalhar com a versão iOS do MindWell:

1. **Clone ou baixe apenas a pasta `ios`** deste repositório
2. **Siga as instruções em [INSTRUCOES_PARA_XCODE.md](./INSTRUCOES_PARA_XCODE.md)** para instalação e configuração inicial
3. **Execute o script de otimização da splash screen** conforme [SPLASH_SCREEN_FIX.md](./SPLASH_SCREEN_FIX.md)
4. **Abra o projeto no Xcode** usando o arquivo `App.xcworkspace` (não o `.xcodeproj`)

## Estrutura do Diretório

```
ios/
├── App/                        # Projeto Xcode principal
│   ├── App/                    # Código-fonte do aplicativo iOS
│   │   ├── App.entitlements    # Configurações de permissões
│   │   ├── AppDelegate.swift   # Delegate principal do app
│   │   ├── Assets.xcassets/    # Recursos visuais (ícones, splash)
│   │   ├── Info.plist          # Configurações e permissões
│   │   ├── optimize-splash.sh  # Script para otimizar splash screen
│   │   └── public/             # Arquivos web sincronizados
│   ├── App.xcodeproj/          # Projeto Xcode (NÃO abra diretamente)
│   ├── App.xcworkspace/        # Workspace Xcode (abra este)
│   └── Podfile                 # Dependências do CocoaPods
├── FAQ_iOS.md                  # Perguntas frequentes
├── INSTRUCOES_PARA_XCODE.md    # Guia principal de instalação
├── preparar_para_appstore.md   # Guia para publicação
├── README.md                   # Este arquivo
├── README_XCODE_FIXES.md       # Soluções para problemas comuns
└── SPLASH_SCREEN_FIX.md        # Resolução do problema da splash screen
```

## Fluxo de Trabalho para Atualização

Quando fizer alterações no código web (React/TypeScript):

1. **Gere o build web:**
   ```bash
   # No diretório raiz do projeto
   ./build-for-www.sh
   ```

2. **Sincronize com o projeto iOS:**
   ```bash
   npx cap sync ios
   ```

3. **Abra no Xcode para testes:**
   ```bash
   npx cap open ios
   # Ou abra ios/App/App.xcworkspace manualmente
   ```

## Requisitos

- **macOS**: O desenvolvimento para iOS requer macOS
- **Xcode**: Versão 13 ou superior
- **CocoaPods**: Para instalação das dependências
- **Versão mínima do iOS**: iOS 14.0

## Notas para Desenvolvimento

- O AppDelegate.swift foi configurado para inicializar o Capacitor corretamente
- Permissões para microfone e câmera estão configuradas no Info.plist
- As imagens de splash screen foram ajustadas para 1242x1242px para evitar problemas de memória
- O branding do Mindwell foi aplicado ao projeto através da configuração em:
  - `theme.json`: Cor primária #6C8EFF (Azul Nevoeiro)
  - `tailwind.config.ts`: Paleta completa de cores do Mindwell
  - `temp_splash/mindwell-logo.svg`: Logo oficial para a splash screen

## Suporte

Se encontrar problemas, consulte primeiro os arquivos de solução neste diretório. Para problemas persistentes, entre em contato com a equipe de desenvolvimento.

---

Desenvolvido com ❤️ pela equipe MindWell