import { useState, useEffect } from 'react';

/**
 * Custom hook para escutar media queries
 * Útil para detecção responsiva de dispositivos móveis
 * 
 * @param query Media query a ser avaliada (ex: "(max-width: 768px)")
 * @returns Boolean indicando se a media query corresponde
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Criar o MediaQueryList
    const media = window.matchMedia(query);
    
    // Definir o estado inicial
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // Definir callback para alterações
    const listener = () => {
      setMatches(media.matches);
    };
    
    // Adicionar listener
    media.addEventListener('change', listener);
    
    // Limpeza ao desmontar
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [matches, query]);

  return matches;
}