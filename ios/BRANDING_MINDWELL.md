# Guia de Branding Mindwell para iOS

Este guia descreve como aplicar corretamente o branding do Mindwell ao aplicativo iOS.

## Paleta de Cores

A paleta de cores oficiais do Mindwell foi configurada no `tailwind.config.ts` e pode ser acessada usando as classes CSS do Tailwind com o prefixo `mindwell-`:

```
🔵 Azul Nevoeiro (Primária) #6C8EFF – transmite tranquilidade e confiança.
🟣 Lilás Névoa (Secundária) #C3BFFF – toque emocional e acolhedor.
🟢 Verde Mentha (Apoio) #A8E6CF – sinaliza positividade e evolução emocional.
⚫ Cinza Escuro (Texto) #2F2F2F – para legibilidade em fundo claro.
⚫ Cinza Médio #666666 – usado em textos auxiliares.
⚪ Branco (Fundo) #FFFFFF – base clean para uma interface leve.
```

## Logo e Splash Screen

1. **Logo SVG**: O logo oficial do Mindwell está disponível em formato SVG em `temp_splash/mindwell-logo.svg`. Este é o formato vetorial que deve ser usado como base para todas as representações do logo.

2. **Splash Screen Personalizada**:
   - Os arquivos da splash screen estão em `ios/App/App/Assets.xcassets/Splash.imageset/`
   - Use o arquivo SVG do logo para gerar uma splash screen personalizada
   - Siga as instruções em `ios/SPLASH_SCREEN_FIX.md` para otimizar as imagens

### Instruções para Conversão da Splash Screen

No macOS, você pode usar as seguintes ferramentas para converter o SVG em PNG para uso na splash screen:

**Usando o Finder e Visualização Rápida**:
1. Localize o arquivo `temp_splash/mindwell-logo.svg`
2. Pressione espaço para abrir a Visualização Rápida
3. Selecione "Exportar" e escolha o formato PNG
4. Configure a resolução para 1242x1242 pixels
5. Salve-o temporariamente
6. Copie o arquivo PNG para:
   - `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png`
   - `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png`
   - `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png`

**Usando o Terminal com ImageMagick** (se instalado):
```bash
cd ios/App/App
brew install imagemagick # se necessário
convert -background white -size 1242x1242 ../../../temp_splash/mindwell-logo.svg splash-mindwell.png
cp splash-mindwell.png Assets.xcassets/Splash.imageset/splash-2732x2732.png
cp splash-mindwell.png Assets.xcassets/Splash.imageset/splash-2732x2732-1.png
cp splash-mindwell.png Assets.xcassets/Splash.imageset/splash-2732x2732-2.png
```

## Tipografia

Fontes utilizadas (Google Fonts):

- **Poppins** (600) – Títulos e logotipo
- **Inter** (400) – Texto de corpo
- **Roboto Mono** (400) – Indicadores numéricos e dados

No iOS, você pode configurar as fontes personalizadas no Xcode:

1. Adicione os arquivos das fontes ao projeto:
   - Arraste os arquivos de fonte (.ttf ou .otf) para o projeto no Xcode
   - Certifique-se de marcar "Copy items if needed" e "Add to target: App"

2. Configure o Info.plist:
   - Adicione a chave "Fonts provided by application" (UIAppFonts)
   - Adicione os nomes dos arquivos de fonte como itens dessa lista

## Cores no Interface Builder (Storyboard)

Para usar as cores do branding no Interface Builder:

1. Abra o Assets.xcassets no Xcode
2. Clique com o botão direito > "New Color Set"
3. Nomeie como "MindwellPrimary"
4. Defina o valor da cor como R:108 G:142 B:255 (#6C8EFF)
5. Repita para as outras cores do branding

## Diretrizes de Interface

- Use botões com cantos arredondados (borderRadius 12px)
- Títulos em Poppins Semi-Bold e corpo de texto em Inter Regular
- O uso do slogan "Cuide da mente. Viva melhor." deve acompanhar o logo em materiais promocionais
- Mantenha um tom visual leve e arejado, com bastante espaço em branco

## Teste de Conformidade

Depois de implementar o branding, verifique estes pontos:

- [ ] A cor primária #6C8EFF é usada consistentemente para elementos de ação principal
- [ ] A splash screen exibe o logo Mindwell em fundo branco
- [ ] As fontes Poppins, Inter e Roboto Mono estão sendo carregadas corretamente
- [ ] O tamanho do arquivo da splash screen está otimizado (abaixo de 3MB)

## Conformidade com as Diretrizes da Apple

Certifique-se de que todos os elementos de branding estejam em conformidade com as diretrizes de design da Apple para iOS:
- Use cores do sistema quando apropriado (por exemplo, para elementos de erro)
- Evite sombras excessivas ou efeitos visuais que não seguem o design do iOS
- Certifique-se de que texto e elementos interativos têm tamanho adequado para toque (mínimo 44x44 pontos)