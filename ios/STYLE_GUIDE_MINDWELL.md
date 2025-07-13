# Guia de Estilo Mindwell para iOS

Este guia foi criado para orientar o desenvolvimento do aplicativo Mindwell em Swift para iOS, garantindo consistência visual e experiência de usuário adequada aos padrões da plataforma Apple.

## Fundamentos do Design Mindwell

O design do Mindwell é baseado em três princípios:

1. **Serenidade e Confiança** - Transmitimos tranquilidade e confiança através de uma interface limpa e cores calmantes
2. **Acessibilidade** - Garantimos que o aplicativo seja utilizável por todos, independente de limitações visuais
3. **Sensibilidade Contextual** - Adaptamos o tom e as funcionalidades ao contexto emocional do usuário

## Sistema de Cores

A paleta de cores oficial do Mindwell inclui:

| Cor | Hex | Swift UIColor | Uso |
|-----|-----|---------------|-----|
| **Azul Nevoeiro** (Primária) | #6C8EFF | `UIColor(red: 108/255, green: 142/255, blue: 255/255, alpha: 1)` | Botões de ação principal, cabeçalhos, ícones principais |
| **Lilás Névoa** (Secundária) | #C3BFFF | `UIColor(red: 195/255, green: 191/255, blue: 255/255, alpha: 1)` | Elementos secundários, backgrounds de destaque |
| **Verde Mentha** (Apoio) | #A8E6CF | `UIColor(red: 168/255, green: 230/255, blue: 207/255, alpha: 1)` | Indicadores de progresso, sucesso, elementos positivos |
| **Cinza Escuro** (Texto) | #2F2F2F | `UIColor(red: 47/255, green: 47/255, blue: 47/255, alpha: 1)` | Texto principal |
| **Cinza Médio** | #666666 | `UIColor(red: 102/255, green: 102/255, blue: 102/255, alpha: 1)` | Texto secundário, legendas |
| **Branco** (Fundo) | #FFFFFF | `UIColor.white` | Fundo da interface |

### Extensão do UIColor para Swift

```swift
extension UIColor {
    static let mindwellPrimary = UIColor(red: 108/255, green: 142/255, blue: 255/255, alpha: 1)
    static let mindwellSecondary = UIColor(red: 195/255, green: 191/255, blue: 255/255, alpha: 1)
    static let mindwellAccent = UIColor(red: 168/255, green: 230/255, blue: 207/255, alpha: 1)
    static let mindwellText = UIColor(red: 47/255, green: 47/255, blue: 47/255, alpha: 1)
    static let mindwellTextSecondary = UIColor(red: 102/255, green: 102/255, blue: 102/255, alpha: 1)
}
```

## Tipografia

### Fontes do Sistema (Preferencial)

No iOS, sempre preferimos usar as fontes do sistema para melhor performance e compatibilidade:

- **SF Pro Display** - Para títulos e elementos grandes
- **SF Pro Text** - Para corpo de texto e elementos de interface
- **SF Pro Rounded** - Para botões e elementos com estilo mais suave

### Fontes Customizadas (Somente para elementos de branding)

Apenas em casos específicos de branding, usar:

- **Poppins** (600) para o logotipo do Mindwell
- **Inter** (400) para o slogan

### Escala Tipográfica

| Elemento | Tamanho | Peso | Swift UIFont |
|----------|---------|------|--------------|
| Título Principal | 28pt | Bold | `UIFont.systemFont(ofSize: 28, weight: .bold)` |
| Título Secundário | 22pt | Semibold | `UIFont.systemFont(ofSize: 22, weight: .semibold)` |
| Subtítulo | 17pt | Semibold | `UIFont.systemFont(ofSize: 17, weight: .semibold)` |
| Corpo | 17pt | Regular | `UIFont.systemFont(ofSize: 17, weight: .regular)` |
| Legenda | 13pt | Regular | `UIFont.systemFont(ofSize: 13, weight: .regular)` |
| Botões | 17pt | Medium | `UIFont.systemFont(ofSize: 17, weight: .medium)` |

## Componentes UI

### Botões

Em SwiftUI:

```swift
Button(action: {
    // Ação do botão
}) {
    Text("Continuar")
        .font(.system(size: 17, weight: .medium))
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(UIColor.mindwellPrimary))
        .cornerRadius(12)
}
.padding(.horizontal)
```

Em UIKit:

```swift
let button = UIButton(type: .system)
button.setTitle("Continuar", for: .normal)
button.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .medium)
button.setTitleColor(.white, for: .normal)
button.backgroundColor = .mindwellPrimary
button.layer.cornerRadius = 12
```

### Cards

Estilo padrão para cards:

```swift
// Em SwiftUI
VStack(alignment: .leading, spacing: 12) {
    // Conteúdo do card
}
.padding(16)
.background(Color.white)
.cornerRadius(12)
.shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
```

## Espaçamento

Siga o sistema de espaçamento consistente:

- Extra pequeno: 4pt
- Pequeno: 8pt
- Médio: 16pt
- Grande: 24pt
- Extra grande: 32pt

## Adaptações Específicas para iOS

### Status Bar

- Use fundo claro com texto escuro em telas com fundo branco
- Configure no Info.plist:
  - `UIViewControllerBasedStatusBarAppearance` definido como `true`
  - Controle via `preferredStatusBarStyle` em cada ViewController

### Gestos e Navegação

- Suporte ao "swipe de volta" em navegações
- Adicione haptic feedback nos principais pontos de interação
- Botões grandes (mínimo 44x44pt) para facilitar o toque

### Dark Mode

O Mindwell suporta modo escuro nativo do iOS:

```swift
// Em UIKit
if traitCollection.userInterfaceStyle == .dark {
    // Configure o tema escuro
} else {
    // Configure o tema claro
}

// Em SwiftUI
Color("TextColor") // Definido no Assets.xcassets com variantes dark/light
```

## Conformidade com HIG (Human Interface Guidelines)

Para garantir aprovação na App Store:

- Use padrões nativos de navegação (UINavigationController)
- Respeite as áreas seguras (safe areas) em todos os dispositivos
- Implemente suporte a VoiceOver e Dynamic Type
- Evite customização excessiva de gestos padrão
- Siga padrões contextuais do iOS (ex: compartilhamento via UIActivityViewController)

## Uso de Ícones

- Use SF Symbols sempre que possível para garantir consistência com o sistema
- Para ícones personalizados, use traço de 2pt e estilo compatível com SF Symbols
- Configure peso e escala dos símbolos para corresponder ao texto:

```swift
// Em UIKit
let configuration = UIImage.SymbolConfiguration(textStyle: .body, scale: .medium)
let image = UIImage(systemName: "heart.fill", withConfiguration: configuration)

// Em SwiftUI
Image(systemName: "heart.fill")
    .font(.body)
    .symbolRenderingMode(.hierarchical)
    .foregroundStyle(Color("AccentColor"))
```

## Testes de Acessibilidade

Antes de enviar para a App Store:

- Teste com VoiceOver
- Verifique contraste (WCAG AA - mínimo 4.5:1 para texto normal)
- Garanta que todos os elementos interativos têm tamanho mínimo de 44x44pt
- Teste com diferentes tamanhos de texto (Configurações > Acessibilidade > Tamanho do texto)

---

Desenvolvido com ❤️ pela equipe MindWell