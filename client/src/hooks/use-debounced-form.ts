import { useForm, UseFormProps, UseFormReturn } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "./use-toast";

/**
 * Interface para as props do hook useDebouncedForm
 */
interface UseDebouncedFormProps<T extends Record<string, any>> 
  extends Omit<UseFormProps<T>, "resolver"> {
  /**
   * Schema zod para validação do formulário
   */
  schema: z.ZodType<any, any>;
  
  /**
   * Tempo em milissegundos para debounce
   */
  debounceMs?: number;
  
  /**
   * Função a ser executada quando o formulário for válido após o debounce
   */
  onValidDebounced?: (data: T) => void;
  
  /**
   * Flag para determinar se deve realizar a validação automaticamente durante a digitação
   */
  validateOnChange?: boolean;
}

/**
 * Hook personalizado que adiciona funcionalidade de debounce para formulários
 * usando react-hook-form. Útil para validação em tempo real sem sobrecarregar o 
 * desempenho ou criar experiências frustrantes para o usuário.
 * 
 * @returns Form com recursos de debounce e funções auxiliares
 */
export function useDebouncedForm<T extends Record<string, any>>({
  schema,
  debounceMs = 500,
  onValidDebounced,
  validateOnChange = true,
  ...formProps
}: UseDebouncedFormProps<T>): UseFormReturn<T> & {
  isDirty: boolean;
  isValidatingDebounced: boolean;
  debouncedValues: Partial<T>;
} {
  // Inicializar react-hook-form com validação zod
  const form = useForm<T>({
    ...formProps,
    resolver: zodResolver(schema),
    mode: validateOnChange ? "onChange" : "onSubmit"
  });
  
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  const [isValidatingDebounced, setIsValidatingDebounced] = useState(false);
  const [debouncedValues, setDebouncedValues] = useState<Partial<T>>(form.getValues());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Observar mudanças no formulário
  useEffect(() => {
    const subscription = form.watch((values) => {
      setIsDirty(true);
      
      // Limpar timer anterior se existir
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Criar novo timer para debounce
      setIsValidatingDebounced(true);
      
      timerRef.current = setTimeout(() => {
        setDebouncedValues(values as Partial<T>);
        setIsValidatingDebounced(false);
        
        // Se a validação deve ocorrer durante a digitação e há callback
        if (validateOnChange && onValidDebounced) {
          form.trigger().then(isValid => {
            if (isValid) {
              onValidDebounced(values as T);
            }
          }).catch(error => {
            console.error("Erro na validação do formulário:", error);
            toast({
              title: "Erro na validação",
              description: "Ocorreu um erro ao validar o formulário.",
              variant: "destructive"
            });
          });
        }
      }, debounceMs);
    });
    
    // Cleanup da subscription
    return () => {
      subscription.unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [form, debounceMs, onValidDebounced, validateOnChange, toast]);
  
  return {
    ...form,
    isDirty,
    isValidatingDebounced,
    debouncedValues
  };
}