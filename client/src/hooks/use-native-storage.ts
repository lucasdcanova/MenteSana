/**
 * Hook para armazenamento de dados unificado entre navegador e app nativo
 * 
 * Usa Capacitor Preferences quando disponível, com fallback para localStorage.
 * Oferece uma API consistente para ambos os ambientes.
 */

import { useState, useEffect, useCallback } from "react";
import { Storage } from "../lib/capacitor";

// Função para serializar valores que não são strings para armazenamento
const serialize = (value: any): string => {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch (error) {
    console.error('Erro ao serializar valor para armazenamento:', error);
    return '';
  }
};

// Função para deserializar valores do armazenamento
const deserialize = (storedValue: string | null): any => {
  if (storedValue === null) return null;
  
  try {
    // Tenta fazer parse como JSON
    return JSON.parse(storedValue);
  } catch (error) {
    // Se não for um JSON válido, retorna a string original
    return storedValue;
  }
};

/**
 * Hook useNativeStorage - Para persistência de dados em aplicativos nativos e web
 * 
 * @param key Chave para armazenamento
 * @param initialValue Valor inicial (opcional)
 * @returns [value, setValue, loading] - Valor atual, função para atualizar, flag de carregamento
 */
export function useNativeStorage<T>(
  key: string,
  initialValue?: T
): [T | undefined, (value: T) => Promise<void>, boolean] {
  // Estado para o valor armazenado
  const [storedValue, setStoredValue] = useState<T | undefined>(initialValue);
  // Estado para indicar que o valor está sendo carregado
  const [loading, setLoading] = useState(true);

  // Carregar o valor inicialmente
  useEffect(() => {
    const loadValue = async () => {
      try {
        setLoading(true);
        const value = await Storage.getItem(key);
        
        if (value === null && initialValue !== undefined) {
          // Se não há valor armazenado e temos um valor inicial, salvamos esse valor
          await Storage.setItem(key, serialize(initialValue));
          setStoredValue(initialValue);
        } else if (value !== null) {
          // Se há valor armazenado, deserializamos e definimos como estado
          setStoredValue(deserialize(value));
        }
      } catch (error) {
        console.error(`Erro ao carregar valor para chave ${key}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key, initialValue]);

  // Função para atualizar o valor armazenado
  const setValue = useCallback(
    async (value: T) => {
      try {
        setLoading(true);
        // Atualiza o estado
        setStoredValue(value);
        // Salva no armazenamento
        await Storage.setItem(key, serialize(value));
      } catch (error) {
        console.error(`Erro ao salvar valor para chave ${key}:`, error);
      } finally {
        setLoading(false);
      }
    },
    [key]
  );

  return [storedValue, setValue, loading];
}

/**
 * Função para remover um item do armazenamento
 * 
 * @param key Chave do item a ser removido
 * @returns Promessa que resolve quando a operação for concluída
 */
export async function removeStorageItem(key: string): Promise<void> {
  try {
    await Storage.removeItem(key);
  } catch (error) {
    console.error(`Erro ao remover item com chave ${key}:`, error);
  }
}

/**
 * Função para limpar todo o armazenamento
 * 
 * @returns Promessa que resolve quando a operação for concluída
 */
export async function clearStorage(): Promise<void> {
  try {
    await Storage.clear();
  } catch (error) {
    console.error('Erro ao limpar o armazenamento:', error);
  }
}