import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Facebook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MindWellLogo } from "@/components/ui/mindwell-logo";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Registration form schema with password confirmation
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string()
    .min(8, "Confirmação de senha deve ter pelo menos 8 caracteres"),
  isTherapist: z.boolean().default(false),
  // Campos opcionais que são obrigatórios apenas para terapeutas
  graduationYear: z.number().nullable().optional()
    .refine(
      (val) => !val || (val >= 1950 && val <= new Date().getFullYear()),
      { message: "Ano de formatura inválido" }
    ),
  universityName: z.string().nullable().optional(),
  diplomaFile: z.any().optional(), // Será um File object
  licenseNumber: z.string().nullable().optional(),
  specialization: z.string().nullable().optional(),
  terms: z.boolean().refine((val) => val === true, {
    message: "Você deve concordar com os termos e condições",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
}).refine(
  (data) => {
    // Se é terapeuta, verifica se a especialização está preenchida (simplificado)
    // Os outros campos serão opcionais para facilitar o registro inicial
    if (data.isTherapist) {
      return !!data.specialization;
    }
    return true;
  },
  {
    message: "Por favor, informe sua especialização",
    path: ["specialization"],
  }
);

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation, loginTesteMutation, loginTerapeutaMutation, registerMutation } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      isTherapist: false,
      graduationYear: null,
      universityName: null,
      diplomaFile: undefined,
      licenseNumber: null,
      specialization: null,
      terms: false,
    },
  });
  
  // Monitorar mudanças no campo isTherapist
  const isTherapist = registerForm.watch("isTherapist");

  // Handle login form submission
  function onLoginSubmit(data: LoginFormValues) {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    }, {
      onSuccess: () => {
        // Redireciona para a página inicial imediatamente sem mostrar toast
        navigate("/");
      }
    });
  }

  // Handle registration form submission
  function onRegisterSubmit(data: RegisterFormValues) {
    // Gerar nome de usuário único com timestamp para evitar conflitos
    const timestamp = new Date().getTime().toString().slice(-4);
    
    // Tornar o nome de usuário e email únicos para evitar conflitos
    if (data.isTherapist) {
      data.username = `${data.username}_${timestamp}`;
      
      // Modificar o email adicionando um sufixo único para evitar conflitos
      const emailParts = data.email.split('@');
      if (emailParts.length === 2) {
        const emailUsername = emailParts[0];
        const emailDomain = emailParts[1];
        data.email = `${emailUsername}+${timestamp}@${emailDomain}`;
      }
      
      console.log("Email modificado para testes:", data.email);
    }
    
    console.log("Registrando com nome de usuário:", data.username);
    registerMutation.mutate(data, {
      onSuccess: () => {
        // Redireciona para a página inicial imediatamente sem mostrar toast
        navigate("/");
      },
      onError: (error) => {
        toast({
          title: "Erro ao criar conta",
          description: error.message || "Verifique se o nome de usuário e email estão disponíveis.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div 
      className="min-h-screen w-full overflow-hidden flex flex-col items-center justify-start md:justify-center py-4 px-4 md:py-8 md:px-6"
      style={{ 
        background: "linear-gradient(145deg, hsl(163 50% 94%), hsl(163 60% 86%))",
        backgroundSize: "cover",
        backgroundPosition: "center"
     }}
    >
      {/* Decorative elements estilo iOS com glassmorphism e shapes leves */}
      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/30 blur-xl"></div>
      <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-primary/20 blur-lg"></div>
      <div className="absolute top-1/4 right-10 w-10 h-10 rounded-full bg-primary/30 blur-md"></div>
      
      {/* Logo and main content */}
      <div className="w-full max-w-md mx-auto pt-6 md:pt-0 relative z-10">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <MindWellLogo size="large" showText={false} variant="elevated" />
          </div>
          <h1 
            className="text-3xl font-semibold mb-1"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              letterSpacing: "-0.01em",
              fontWeight: 600,
              color: "var(--mindwell-text, #2F2F2F)"
            }}
          >
            <span style={{ color: "var(--mindwell-primary, #6C8EFF)" }}>Mind</span>Well
          </h1>
          <h2 
            className="text-lg font-medium text-gray-600"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
            }}
          >
            Bem-vindo de volta
          </h2>
        </div>

        <div
          className="w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 pb-8 border border-gray-100"
        >
          {isRegisterMode ? (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="space-y-4">
                  {/* Nome e sobrenome */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-600 mb-1">Nome</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Seu nome" 
                              {...field} 
                              className="bg-primary/5 border-0 rounded-xl py-5 px-4 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium mt-1" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-600 mb-1">Sobrenome</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Seu sobrenome" 
                              {...field} 
                              className="bg-primary/5 border-0 rounded-xl py-5 px-4 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium mt-1" />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Email */}
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-600 mb-1">Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="seu@email.com" 
                            {...field} 
                            className="bg-primary/5 border-0 rounded-xl py-5 px-4 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium mt-1" />
                      </FormItem>
                    )}
                  />

                  {/* Usuário */}
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-600 mb-1">Nome de usuário</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Escolha um nome de usuário" 
                            {...field} 
                            className="bg-primary/5 border-0 rounded-xl py-5 px-4 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium mt-1" />
                      </FormItem>
                    )}
                  />
                  
                  {/* Senha */}
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-600 mb-1">Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Crie uma senha segura" 
                            {...field} 
                            className="bg-primary/5 border-0 rounded-xl py-5 px-4 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium mt-1" />
                      </FormItem>
                    )}
                  />
                  
                  {/* Confirmação de senha */}
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-600 mb-1">Confirme a senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Digite sua senha novamente" 
                            {...field} 
                            className="bg-primary/5 border-0 rounded-xl py-5 px-4 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium mt-1" />
                      </FormItem>
                    )}
                  />
                  
                  {/* Termos e condições */}
                  <FormField
                    control={registerForm.control}
                    name="terms"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-3 mt-5">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                            className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-white rounded transition-all mt-0.5"
                          />
                        </FormControl>
                        <div className="grid gap-1">
                          <FormLabel className="text-sm text-gray-600 cursor-pointer leading-tight">
                            Eu concordo com os <a href="#" className="text-primary font-medium underline-offset-2 hover:underline">Termos de Serviço</a> e 
                            a <a href="#" className="text-primary font-medium underline-offset-2 hover:underline">Política de Privacidade</a>
                          </FormLabel>
                          <FormMessage className="text-xs font-medium mt-0" />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full mt-6 bg-primary hover:bg-primary/90 text-white rounded-xl py-6 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? 
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Criando conta...</span>
                    </div> : 
                    "Criar conta"
                  }
                </Button>
                
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-primary font-medium mt-3 opacity-80 hover:opacity-100 transition-opacity"
                  onClick={() => setIsRegisterMode(false)}
                >
                  Já tem uma conta? Entrar
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Nome de usuário</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome de usuário" 
                          {...field} 
                          className="bg-primary/5 border-0 rounded-xl py-6 px-5 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Senha</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Senha" 
                          {...field} 
                          className="bg-primary/5 border-0 rounded-xl py-6 px-5 text-base text-gray-800 focus:ring-primary/30 focus:bg-white focus:shadow-md transition-all duration-200" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl py-6 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Entrando...</span>
                    </div> : 
                    "Entrar"
                  }
                </Button>
                
                <div className="relative my-5">
                  <Separator className="bg-primary/20" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-primary font-medium rounded-md">
                    ou
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl h-12 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                    {/* Google icon com design atualizado */}
                    <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500"></div>
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span className="font-medium text-gray-700">Google</span>
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl h-12 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                    {/* Apple icon com design atualizado */}
                    <div className="absolute inset-0 opacity-5 bg-gradient-to-b from-gray-800 to-gray-500"></div>
                    <svg className="h-5 w-5 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.7023 0C15.0722 0.1396 13.2463 1.1533 12.1823 2.5474C11.2379 3.78262 10.4387 5.64524 10.7388 7.46701C12.5255 7.53395 14.3789 6.48117 15.376 5.06191C16.3085 3.72546 17.0443 1.88333 16.7023 0Z" />
                      <path d="M21.9926 8.15503C20.608 6.39766 18.6578 5.39966 16.8059 5.39966C14.3097 5.39966 13.3352 6.69832 11.7452 6.69832C10.1161 6.69832 8.68538 5.40336 6.56159 5.40336C4.53376 5.40336 2.35953 6.65504 0.965616 8.84858C-1.10633 12.2516 0.365324 17.9079 2.34908 21.0368C3.33452 22.5498 4.52423 24.2368 6.11648 24.1971C7.62608 24.1574 8.18225 23.2397 10.0714 23.2397C11.9507 23.2397 12.4745 24.1971 14.0379 24.1697C15.6434 24.1574 16.6889 22.6571 17.6646 21.1395C18.819 19.3355 19.2986 17.5807 19.3227 17.5026C19.2889 17.4911 16.3664 16.2913 16.3326 12.9323C16.3086 10.1229 18.6433 8.68541 18.7447 8.61848C17.3456 6.61879 15.1714 6.4078 14.5243 6.35625C12.8122 6.20178 11.3146 7.20717 10.412 7.20717C9.48521 7.20717 8.20617 6.4013 6.74538 6.4013C6.16159 6.40315 4.00266 6.52617 2.35953 8.15503H21.9926Z" />
                    </svg>
                    <span className="font-medium text-gray-700">Apple</span>
                  </Button>
                </div>
                
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-primary font-medium mt-2"
                  onClick={() => setIsRegisterMode(true)}
                >
                  Não tem uma conta? Cadastre-se
                </Button>
                
                {/* Botões de teste com estilo iOS */}
                <div className="mt-6 space-y-3">
                  <p className="text-xs text-center text-gray-500 mb-1">Acesso rápido para testes</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl py-5 text-sm shadow-sm border-gray-200 bg-gradient-to-r from-green-50 to-teal-50 text-primary hover:from-green-100 hover:to-teal-100 transition-all duration-300"
                    onClick={() => {
                      loginTesteMutation.mutate(undefined, {
                        onSuccess: () => {
                          navigate("/");
                        }
                      });
                    }}
                    disabled={loginTesteMutation.isPending}
                  >
                    {loginTesteMutation.isPending ? 
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span>Entrando...</span>
                      </div> : 
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                        </div>
                        <span>Entrar como Paciente</span>
                      </div>
                    }
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl py-5 text-sm shadow-sm border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300"
                    onClick={() => {
                      loginTerapeutaMutation.mutate(undefined, {
                        onSuccess: () => {
                          navigate("/");
                        }
                      });
                    }}
                    disabled={loginTerapeutaMutation.isPending}
                  >
                    {loginTerapeutaMutation.isPending ? 
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                        <span>Entrando...</span>
                      </div> : 
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                        </div>
                        <span>Entrar como Terapeuta</span>
                      </div>
                    }
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}