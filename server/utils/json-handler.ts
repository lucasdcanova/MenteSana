/**
 * Utilitário para processamento seguro de respostas JSON da OpenAI
 * com tratamento de erros e correções automáticas comuns
 */

/**
 * Tenta analisar uma string JSON, aplicando correções para problemas comuns
 * caso falhe na primeira tentativa
 * 
 * @param jsonString String JSON a ser analisada
 * @returns Objeto parseado ou objeto vazio em caso de falha
 */
export function safeJsonParse(jsonString: string): any {
  // Primeiro tenta o parse normal
  try {
    return JSON.parse(jsonString);
  } catch (jsonError) {
    console.error("Erro no parse JSON:", jsonError);
    
    try {
      // Tenta corrigir problemas comuns
      const fixedContent = jsonString
        .replace(/(\r\n|\n|\r)/gm, " ") // Remove quebras de linha
        .replace(/,\s*}/g, "}") // Remove vírgulas antes de fechar objetos
        .replace(/,\s*]/g, "]") // Remove vírgulas antes de fechar arrays
        .replace(/"/g, '"') // Substitui aspas curvas por retas
        .replace(/'/g, "'") // Substitui aspas simples curvas por retas
        .replace(/\\\\/g, "\\") // Remove escape duplo
        .replace(/\\"/g, '"') // Remove escape de aspas
        .trim();
        
      return JSON.parse(fixedContent);
    } catch (secondError) {
      console.error("Falha na segunda tentativa de parse de JSON:", secondError);
      console.error("Conteúdo problemático:", jsonString);
      // Retorna objeto vazio em caso de falha total
      return {};
    }
  }
}

/**
 * Verifica se uma propriedade existe em um objeto, retornando valor padrão se não existir
 * 
 * @param obj Objeto a ser verificado
 * @param path Caminho da propriedade (ex: 'user.profile.name')
 * @param defaultValue Valor padrão caso a propriedade não exista
 * @returns Valor da propriedade ou valor padrão
 */
export function getNestedProperty(obj: any, path: string, defaultValue: any = undefined): any {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === undefined || result === null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
}

/**
 * Verifica se uma propriedade é um array e aplica limpeza a cada item
 * 
 * @param obj Objeto que contém o array
 * @param key Nome da propriedade do array
 * @param cleanFn Função de limpeza a ser aplicada em cada item
 * @param defaultValue Array padrão caso a propriedade não seja um array
 * @returns Array limpo ou valor padrão
 */
export function cleanArrayProperty(
  obj: any, 
  key: string, 
  cleanFn: (item: string) => string,
  defaultValue: string[] = []
): string[] {
  if (!obj || !Array.isArray(obj[key])) {
    return defaultValue;
  }
  
  return obj[key]
    .map((item: any) => typeof item === 'string' ? cleanFn(item) : String(item))
    .filter((item: string) => item.trim().length > 0);
}