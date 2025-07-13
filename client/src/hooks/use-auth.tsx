import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient, setAuthToken, clearAuthToken } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type AuthContextType = {
  user: Omit<User, "password"> | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<User, "password">, Error, LoginData>;
  loginTesteMutation: UseMutationResult<Omit<User, "password">, Error, void>; // Mutação para login de teste como paciente
  loginTerapeutaMutation: UseMutationResult<Omit<User, "password">, Error, void>; // Mutação para login como terapeuta
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<User, "password">, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

// Extended schema for registration with password confirmation
// Removido o schema local para usar o definido em auth-page.tsx que está em conformidade com o esquema compartilhado
// Isso evita duplicação e inconsistências
type RegisterData = InsertUser & {
  confirmPassword: string;
  terms: boolean;
  diplomaFile?: any;
  isTherapist: boolean;
  graduationYear?: number | null;
  universityName?: string | null;
  licenseNumber?: string | null;
  specialization?: string | null;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<Omit<User, "password"> | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Limpar tokens anteriores
      clearAuthToken();
      
      // Realizar a autenticação via senha/usuário para obter um token
      const res = await apiRequest("POST", "/api/token", credentials);
      return await res.json();
    },
    onSuccess: (data) => {
      // Verificar se o token está presente na resposta
      if (data.token) {
        console.log(`Token de autenticação recebido: ${data.token.substring(0, 8)}...`);
        // Salvar o token no localStorage e na memória
        setAuthToken(data.token);
      } else {
        console.warn("Login bem-sucedido, mas sem token na resposta");
      }
      
      // Extrair os dados do usuário da resposta
      const user = data.user || data;
      
      // Atualizar cache com dados do usuário
      queryClient.setQueryData(["/api/user"], user);
      
      // Removida mensagem de toast para login bem-sucedido
    },
    onError: (error: Error) => {
      // Limpar token em caso de erro
      clearAuthToken();
      
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      // Remove confirmPassword and terms before sending to API
      const { confirmPassword, terms, ...registerData } = credentials;
      const res = await apiRequest("POST", "/api/register", registerData);
      return await res.json();
    },
    onSuccess: (user: Omit<User, "password">) => {
      queryClient.setQueryData(["/api/user"], user);
      // Removida mensagem de toast para registro bem-sucedido
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Tentar fazer logout no servidor, mas continue mesmo se falhar
      try {
        await apiRequest("POST", "/api/logout");
      } catch (e) {
        console.warn("Erro ao fazer logout no servidor, continuando com logout local:", e);
      }
      
      // Limpar token independentemente do resultado da chamada de API
      clearAuthToken();
    },
    onSuccess: () => {
      // Limpar cache do usuário
      queryClient.setQueryData(["/api/user"], null);
      
      // Removida mensagem de toast para logout bem-sucedido
    },
    onError: (error: Error) => {
      // Mesmo com erro, limpar dados locais
      queryClient.setQueryData(["/api/user"], null);
      clearAuthToken();
      
      toast({
        title: "Logout failed on server",
        description: "You have been logged out locally. " + error.message,
        variant: "default",
      });
    },
  });

  // Mutação para login de teste (sem usar senha) - usando token
  const loginTesteMutation = useMutation({
    mutationFn: async () => {
      // Limpar tokens e cookies antigos
      clearAuthToken();
      
      const cookiesToClear = document.cookie.split(";").map(cookie => cookie.split("=")[0].trim());
      for (const cookie of cookiesToClear) {
        document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
      
      console.log("Cookies limpos antes do login");
      
      try {
        console.log("Iniciando login de teste...");
        
        // Fazer o login com o servidor
        console.log("Enviando requisição para /api/login-teste");
        const res = await apiRequest("POST", "/api/login-teste");
        
        console.log("Resposta recebida:", res.status, res.statusText);
        
        // Verificar o status da resposta
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Erro na resposta do servidor:", res.status, errorText);
          throw new Error(`Falha na autenticação: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        console.log("Dados de login recebidos:", JSON.stringify({
          id: data.id,
          username: data.username,
          token: data.token ? `${data.token.substring(0, 8)}...` : 'nenhum',
          authenticated: data.authenticated
        }));
        
        return data;
      } catch (error) {
        console.error("Erro ao fazer login de teste:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Verificar se o token está presente na resposta
      if (data.token) {
        console.log(`Token de autenticação recebido: ${data.token.substring(0, 8)}...`);
        // Salvar o token no localStorage e na memória
        setAuthToken(data.token);
      } else {
        console.warn("Login de teste bem-sucedido, mas sem token de autenticação na resposta");
      }
      
      // Extrair os dados do usuário (removendo o token)
      const { token, ...user } = data;
      
      console.log("Login de teste bem-sucedido, salvando dados do usuário no cache", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidar as consultas para forçar o recarregamento dos dados
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/streaks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      
      // Removida mensagem de toast para login de teste bem-sucedido
    },
    onError: (error: Error) => {
      // Limpar token em caso de erro
      clearAuthToken();
      
      toast({
        title: "Falha no login de teste",
        description: error.message || "Não foi possível fazer login de teste",
        variant: "destructive",
      });
    },
  });
  
  // Mutação para login como terapeuta (sem usar senha) - usando token
  const loginTerapeutaMutation = useMutation({
    mutationFn: async () => {
      // Limpar tokens e cookies antigos
      clearAuthToken();
      
      const cookiesToClear = document.cookie.split(";").map(cookie => cookie.split("=")[0].trim());
      for (const cookie of cookiesToClear) {
        document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
      
      console.log("Cookies limpos antes do login como terapeuta");
      
      try {
        console.log("Iniciando login como terapeuta...");
        
        // Fazer o login com o servidor
        console.log("Enviando requisição para /api/login-terapeuta");
        const res = await apiRequest("POST", "/api/login-terapeuta");
        
        console.log("Resposta do login como terapeuta recebida:", res.status, res.statusText);
        
        // Verificar o status da resposta
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Erro na resposta do servidor de login terapeuta:", res.status, errorText);
          throw new Error(`Falha na autenticação do terapeuta: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        console.log("Dados de login terapeuta recebidos:", JSON.stringify({
          id: data.id,
          username: data.username,
          token: data.token ? `${data.token.substring(0, 8)}...` : 'nenhum',
          authenticated: data.authenticated,
          isTherapist: data.isTherapist
        }));
        
        return data;
      } catch (error) {
        console.error("Erro ao fazer login como terapeuta:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Verificar se o token está presente na resposta
      if (data.token) {
        console.log(`Token de autenticação recebido: ${data.token.substring(0, 8)}...`);
        // Salvar o token no localStorage e na memória
        setAuthToken(data.token);
      } else {
        console.warn("Login como terapeuta bem-sucedido, mas sem token de autenticação na resposta");
      }
      
      // Forçar a configuração da flag isTherapist para garantir acesso às rotas de terapeuta
      data.isTherapist = true;
      
      // Extrair os dados do usuário (removendo o token)
      const { token, ...user } = data;
      
      console.log("Login como terapeuta bem-sucedido, salvando dados do usuário no cache", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidar as consultas para forçar o recarregamento dos dados
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/availability'] });
      
      // Removida mensagem de toast para login como terapeuta bem-sucedido
    },
    onError: (error: Error) => {
      // Limpar token em caso de erro
      clearAuthToken();
      
      toast({
        title: "Falha no login como terapeuta",
        description: error.message || "Não foi possível fazer login como terapeuta",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        loginTesteMutation,
        loginTerapeutaMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
