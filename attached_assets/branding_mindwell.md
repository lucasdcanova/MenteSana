
# 🎨 Branding Oficial - Mindwell

## 🧠 Nome do App
**Mindwell**

**Slogan:** _“Cuide da mente. Viva melhor.”_  
**Tom de voz:** empático, positivo e direto. Evitar termos clínicos pesados.

---

## 🖋️ Tipografia

Fontes utilizadas (Google Fonts):

- **Poppins** (600) – Títulos e logotipo
- **Inter** (400) – Texto de corpo
- **Roboto Mono** (400) – Indicadores numéricos e dados

---

## 🎨 Paleta de Cores

```ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      mindwell: {
        primary: "#6C8EFF",        // Azul Nevoeiro
        secondary: "#C3BFFF",      // Lilás Névoa
        accent: "#A8E6CF",         // Verde Mentha
        text: "#2F2F2F",           // Cinza Escuro
        textLight: "#666666",      // Cinza Médio
        background: "#FFFFFF",     // Branco
      }
    }
  }
}
```

---

## 🖼️ Logotipo

- Wordmark com fonte **Poppins**:
  - “Mind” com peso 600
  - “well” com peso 400
- Ícone circular azul `#6C8EFF` com três ondas curvas, lembrando cérebro fluido
- Aplicar em:
  - Splash screen
  - Tela de onboarding
  - Header principal

---

## 🔘 Componentes UI

| Componente        | Especificação |
|-------------------|---------------|
| **Botão primário** | `bg-mindwell-primary text-white rounded-2xl px-6 py-2` com hover `shadow-md` |
| **Check-in de humor** | Emojis com rótulo, gráfico com gradiente Azul → Verde |
| **Cards de insights** | `bg-mindwell-secondary text-mindwell-text p-4 rounded-xl` |
| **Splash screen** | Logo centralizado + animação leve (fade + scale 1.05s) |
| **Fonte padrão UI** | `Inter`, fallback `sans-serif` |

---

## 🔔 Micro-copy

- **Onboarding:**  
  `"Oi, {nome}! Como você se sente hoje?"`

- **Push:**  
  `"⏱️ Que tal 2 min para colocar seus pensamentos em ordem?"`

- **Pós-sessão:**  
  `"Parabéns por se priorizar hoje. Estamos aqui sempre que precisar."`

---

## 📁 Entregáveis esperados

1. Atualização do `tailwind.config.ts`
2. Inclusão das fontes Google Fonts
3. Inserção da logo (`mindwell-logo.svg`)
4. Componente `BotaoPrimario.tsx` com nova identidade
5. Splash screen e onboarding aplicando o branding

---

> Enviar dúvidas para a equipe de design ou IA responsável pelo branding. Este guia deve servir como base para o redesenho completo do front-end do app.
