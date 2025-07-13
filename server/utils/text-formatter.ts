/**
 * Utilitário para formatação de texto e limpeza de marcações indesejadas
 * em respostas vindas de modelos de IA como OpenAI
 */

/**
 * Remove marcações Markdown e caracteres de escape indesejados de textos
 * vindos de APIs de IA
 * 
 * Versão completa e robusta que lida com diversos casos de formatação
 * 
 * @param text Texto a ser limpo
 * @returns Texto formatado sem marcações indesejadas
 */
export function cleanAIResponseText(text: string): string {
  if (!text) return '';
  
  // Primeiro, lidar com literais escapados (códigos \n, \t, etc.)
  let cleanedText = text
    // Substituir quebras de linha escapadas por quebras reais
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    // Converter tabulações escapadas
    .replace(/\\t/g, '    ');
  
  // Abordar formatação Markdown em duas passagens para pegar casos complexos
  
  // Primeira passagem: Substituir pares de marcação
  cleanedText = cleanedText
    // Remover asteriscos duplos (negrito em Markdown)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remover asteriscos simples (itálico em Markdown)
    .replace(/\*(.*?)\*/g, '$1')
    // Remover underlines duplos (negrito alternativo em Markdown)
    .replace(/__(.*?)__/g, '$1')
    // Remover underlines simples (itálico alternativo em Markdown)
    .replace(/_(.*?)_/g, '$1')
    // Remover marcações de código inline
    .replace(/`(.*?)`/g, '$1')
    // Remover marcações de riscado
    .replace(/~~(.*?)~~/g, '$1');
    
  // Segunda passagem: Remover caracteres de formatação que sobraram sem fechamento
  cleanedText = cleanedText
    // Remover asteriscos isolados
    .replace(/\*/g, '')
    // Remover crases isoladas
    .replace(/`/g, '')
    // Remover underlines isolados
    .replace(/_/g, '')
    // Remover tildes isoladas
    .replace(/~/g, '');
  
  // Lidar com escapes de caracteres
  cleanedText = cleanedText
    // Remover caracteres de escape antes de qualquer caractere
    .replace(/\\(.)/g, '$1');
  
  // Normalizar quebras de linha e espaços
  cleanedText = cleanedText
    // Normalizar múltiplas quebras de linha em uma única
    .replace(/\n{3,}/g, '\n\n')
    // Converter múltiplos espaços em um único
    .replace(/ {2,}/g, ' ')
    // Remover espaços em branco extras no início e fim
    .trim();
  
  return cleanedText;
}

/**
 * Versão mais simples para limpeza básica de resposta de texto
 * para casos menos complexos
 * 
 * @param text Texto a ser limpo
 * @returns Texto formatado
 */
export function simpleTextClean(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\\n/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\\(.)/g, '$1')
    .trim();
}