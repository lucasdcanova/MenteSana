# Como Resolver o Problema de Limite de Memória da Splash Screen

O Xcode pode apresentar o seguinte erro ao tentar compilar o aplicativo:

> **Error**: "The launch screen exceeds the memory limit and may not display during app launch. Use images requiring less space."

Este erro ocorre porque as imagens originais da splash screen são muito grandes (aproximadamente 41MB cada, resolução 2732x2732 pixels). Siga estas instruções para resolver o problema:

## 1. Usando o Script de Otimização (Recomendado)

Um script de otimização foi criado para facilitar o processo. Este script reduzirá automaticamente o tamanho das imagens mantendo a qualidade visual.

1. **Primeiro, conecte seu Mac ao repositório do projeto e baixe a pasta `ios`**

2. **Abra o Terminal no macOS e navegue até a pasta do projeto iOS:**
   ```bash
   cd ~/caminho/para/pasta/ios/App/App
   ```

3. **Verifique se o script tem permissão de execução:**
   ```bash
   chmod +x optimize-splash.sh
   ```

4. **Execute o script de otimização:**
   ```bash
   ./optimize-splash.sh
   ```

5. **Verifique os resultados:**
   - O script mostrará o tamanho das imagens antes e depois da otimização
   - As imagens originais terão um backup preservado em um diretório temporário

6. **No Xcode:**
   - Limpe o build: Menu > Product > Clean Build Folder
   - Execute novamente o build do projeto

## 2. Otimização Manual (Alternativa)

Se o script automatizado não funcionar por algum motivo, você pode seguir estas etapas manuais:

1. **Localize as imagens da splash screen:**
   - Abra o Xcode
   - No navegador de projetos, expanda `App > App > Assets.xcassets > Splash.imageset`
   - Você verá três arquivos de imagem: `splash-2732x2732.png`, `splash-2732x2732-1.png` e `splash-2732x2732-2.png`

2. **Crie versões otimizadas:**
   - Use um editor de imagens como Preview, Photoshop ou GIMP
   - Abra cada imagem e redimensione para 1242x1242 pixels
   - Salve em formato PNG com compressão
   - Mantenha os mesmos nomes de arquivo

3. **Substitua as imagens originais:**
   - Arraste e solte as novas imagens otimizadas no Xcode, substituindo as originais
   - Ou, no Finder, navegue até o diretório do projeto e substitua os arquivos diretamente

4. **Limpe e reconstrua:**
   - No Xcode: Menu > Product > Clean Build Folder
   - Execute novamente o build

## Detalhes Técnicos

- **Problema**: O iOS impõe um limite de memória para imagens de splash screen de aproximadamente 3-5MB
- **Solução**: Reduzir a resolução de 2732x2732 para 1242x1242 (ainda adequada para telas de alta resolução) e otimizar a compressão
- **Resultado esperado**: Imagens de aproximadamente 2-4MB que não excederão o limite de memória

## Observações

- Os nomes dos arquivos originais são mantidos para evitar a necessidade de alterar o `Contents.json`
- A qualidade visual não será perceptivelmente afetada 
- A splash screen aparecerá corretamente em todos os dispositivos iOS

Se você ainda encontrar problemas após seguir estas etapas, entre em contato com a equipe de desenvolvimento para assistência adicional.