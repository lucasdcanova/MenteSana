import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, RefreshCw, X, Bot, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

// Tipo de mensagem no chat
interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  role: 'system' | 'user' | 'assistant';
  timestamp: string;
  metadata: {
    emotionalTone?: string;
    suggestedResources?: string[];
    followUpQuestions?: string[];
  };
}

// Resposta do assistente com todas as informações extras
interface AssistantResponse {
  message: string;
  emotionalTone?: string;
  suggestedResources?: string[];
  followUpQuestions?: string[];
}

// Propriedades do componente
interface AssistantChatProps {
  showHeader?: boolean;
  fullHeight?: boolean;
}

// Função para formatar o conteúdo da mensagem, transformando marcadores em HTML
function formatMessageContent(content: string): string {
  if (!content) return '';
  
  // Substituir asteriscos por tags de negrito
  let formattedText = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Substituir todas as variações possíveis de quebras de linha
  formattedText = formattedText.replace(/\/n\/n/g, '<br><br>');
  formattedText = formattedText.replace(/\\n\\n/g, '<br><br>');
  formattedText = formattedText.replace(/\n\n/g, '<br><br>');
  
  // Substituir quebras de linha simples
  formattedText = formattedText.replace(/\/n/g, '<br>');
  formattedText = formattedText.replace(/\\n/g, '<br>');
  formattedText = formattedText.replace(/\n/g, '<br>');
  
  return formattedText;
}

// Componente principal de chat do assistente
export function AssistantChat({ showHeader = true, fullHeight = false }: AssistantChatProps) {
  // Estados
  const [message, setMessage] = useState("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { toast } = useToast();
  
  // Scroll para o final quando receber novas mensagens
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  // Buscar histórico de mensagens
  const { 
    data: messages, 
    isLoading: isLoadingMessages 
  } = useQuery({
    queryKey: ['/api/assistant/history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/assistant/history');
      const data = await res.json();
      return data as ChatMessage[];
    }
  });

  // Buscar saudação personalizada quando o componente é montado
  const { 
    data: greeting, 
    isLoading: isLoadingGreeting 
  } = useQuery({
    queryKey: ['/api/assistant/greeting'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/assistant/greeting');
      const data = await res.json();
      return data as { message: string };
    }
  });

  // Mutação para enviar mensagem ao assistente
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      try {
        const res = await apiRequest('POST', '/api/assistant/message', { message: content });
        return res.json() as Promise<AssistantResponse>;
      } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/history'] });
    },
    onError: (error) => {
      console.error('Erro ao processar mensagem:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível processar sua mensagem. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  });

  // Mutação para limpar o histórico de mensagens
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/assistant/history');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/history'] });
      toast({
        title: "Histórico limpo",
        description: "Todas as mensagens foram removidas.",
      });
      setShowConfirmClear(false);
    }
  });

  // Rolar para o final quando chegar uma nova mensagem
  useEffect(() => {
    if ((messages?.length || 0) > 0 && !sendMessageMutation.isPending) {
      scrollToBottom();
    }
  }, [messages, sendMessageMutation.isPending, scrollToBottom]);

  // Ajustar a altura do textarea conforme o conteúdo
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [message]);

  // Função para enviar mensagem
  const handleSendMessage = async () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    const messageToSend = message.trim();
    setMessage("");
    
    // Redefinir altura do textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
    
    await sendMessageMutation.mutateAsync(messageToSend);
  };

  // Detectar quando o usuário pressiona Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Se o usuário pressionar Enter sem Shift, enviar a mensagem
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div 
      ref={chatContainerRef}
      className={`flex flex-col bg-gray-50 overflow-hidden w-full hardware-accelerated-extreme no-transition ${
        fullHeight ? 'h-full' : 'min-h-screen'
      }`}
      style={{
        paddingBottom: showHeader ? "calc(var(--bottom-nav-height) + 70px)" : "70px",
        paddingTop: showHeader ? "60px" : "0px",
        overscrollBehavior: "none",
        WebkitOverflowScrolling: "touch",
        transform: "translate3d(0, 0, 0)",
        WebkitTransform: "translate3d(0, 0, 0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        isolation: "isolate",
        contain: "layout style paint",
        touchAction: "manipulation"
      }}
    >
      {/* Cabeçalho fixo no topo estilo iOS com blur */}
      {showHeader && (
        <div 
          className="fixed top-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 shadow-sm hardware-accelerated-extreme ios-absolute-fixed no-transition ios-events-contained"
          style={{ 
            WebkitBackdropFilter: "blur(8px)",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9998,
            transform: "translate3d(0, 0, 0)",
            WebkitTransform: "translate3d(0, 0, 0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            willChange: "transform",
            isolation: "isolate",
            touchAction: "none",
            pointerEvents: "auto"
          }}
        >
          <div className="flex items-center justify-between max-w-screen-lg mx-auto">
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9 bg-primary/10 ring-2 ring-primary/20">
                <AvatarFallback className="text-primary">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-gray-900">Sana</h1>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500">Assistente virtual</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-2 relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" style={{ animationDuration: "2s" }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowConfirmClear(true)}
                    className="text-gray-500 hover:text-gray-700 focus:ring-0 rounded-full"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Limpar conversa</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Confirmação de limpeza de histórico */}
            {showConfirmClear && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Limpar conversa?</h3>
                  <p className="text-gray-600 text-sm mb-5">Esta ação removerá todo o histórico de conversa com a Sana.</p>
                  
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowConfirmClear(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => clearHistoryMutation.mutate()}
                      disabled={clearHistoryMutation.isPending}
                    >
                      {clearHistoryMutation.isPending ? "Limpando..." : "Limpar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Área de mensagens com estilo iOS */}
      <div 
        className="flex-1 overflow-y-auto p-4 pt-2 pb-6 overscroll-contain ios-scroll-fix ios-scroll scrollable-content hardware-accelerated-extreme ios-events-contained" 
        style={{ 
          WebkitOverflowScrolling: 'touch',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform, scroll-position',
          contain: 'paint style layout',
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1,
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          overscrollBehavior: 'none'
        }}
      >
        {isLoadingMessages || isLoadingGreeting ? (
          // Esqueletos de carregamento estilo iOS com efeitos visuais sutis
          <div className="space-y-6 pt-4">
            <div className="flex items-start gap-3 max-w-[75%]">
              <Skeleton 
                className="h-9 w-9 rounded-full flex-shrink-0 hardware-accelerated"
                style={{
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
                }} 
              />
              <div className="space-y-2">
                <Skeleton 
                  className="h-20 w-full rounded-xl hardware-accelerated" 
                  style={{
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)"
                  }}
                />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-16 rounded-full hardware-accelerated" />
                </div>
              </div>
            </div>
            
            <div className="flex items-start justify-end gap-3">
              <div>
                <Skeleton 
                  className="h-12 w-40 rounded-xl ml-auto hardware-accelerated" 
                  style={{
                    opacity: 0.9,
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)"
                  }}
                />
              </div>
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 hardware-accelerated" />
            </div>
            
            <div className="flex items-start gap-3 max-w-[85%]">
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0 hardware-accelerated" />
              <div className="space-y-2">
                <Skeleton 
                  className="h-28 w-full rounded-xl hardware-accelerated" 
                  style={{
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)"
                  }}
                />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-24 rounded-full hardware-accelerated" />
                </div>
                <Skeleton 
                  className="h-20 w-[90%] rounded-xl hardware-accelerated" 
                  style={{
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)"
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Mensagem de boas-vindas */}
            {(!messages?.length && greeting?.message) && (
              <div className="flex items-start gap-3 animate-fade-in mb-4 max-w-[95%]">
                <Avatar 
                  className="h-9 w-9 mt-1 bg-white ring-2 ring-primary/20 shadow-sm flex-shrink-0 hardware-accelerated" 
                  style={{
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)"
                  }}
                >
                  <AvatarFallback 
                    className="bg-primary/10 text-primary"
                    style={{
                      fontFamily: "var(--ios-system-font)"
                    }}
                  >
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div 
                  className="bg-white text-gray-700 shadow-sm px-4 py-3 rounded-2xl rounded-tl-lg hardware-accelerated"
                  style={{ 
                    fontFamily: "var(--ios-system-font)",
                    fontSize: "15px",
                    lineHeight: 1.5,
                    letterSpacing: "-0.01em",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)"
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: formatMessageContent(greeting.message) 
                  }}
                />
              </div>
            )}
            
            {/* Lista de mensagens */}
            {messages?.map((message, index) => (
              <div 
                key={message.id} 
                className={`flex items-start gap-3 mb-4 ${
                  message.role === 'user' ? 'justify-end' : ''
                } max-w-[95%] ${
                  message.role === 'user' ? 'ml-auto' : ''
                }`}
              >
                <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {message.role === 'assistant' && (
                    <Avatar 
                      className="h-9 w-9 mt-1 bg-white ring-2 ring-primary/20 shadow-sm flex-shrink-0 hardware-accelerated"
                      style={{
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)"
                      }}
                    >
                      <AvatarFallback 
                        className="bg-primary/10 text-primary"
                        style={{
                          fontFamily: "var(--ios-system-font)"
                        }}
                      >
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div 
                    className={`px-4 py-3 hardware-accelerated ${
                      message.role === 'user' 
                        ? 'bg-primary text-white rounded-2xl rounded-tr-lg' 
                        : 'bg-white text-gray-700 rounded-2xl rounded-tl-lg shadow-sm'
                    }`}
                    style={{ 
                      fontFamily: "var(--ios-system-font)",
                      fontSize: "15px",
                      lineHeight: 1.5,
                      letterSpacing: "-0.01em",
                      boxShadow: message.role === 'user' 
                        ? "0 2px 6px rgba(var(--ios-primary-rgb), 0.2)" 
                        : "0 2px 6px rgba(0, 0, 0, 0.03)"
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessageContent(message.content) 
                    }}
                  />
                  
                  {message.role === 'user' && (
                    <Avatar 
                      className="h-8 w-8 mt-0.5 bg-primary shadow-sm flex-shrink-0 hardware-accelerated"
                      style={{
                        boxShadow: "0 2px 6px rgba(var(--ios-primary-rgb), 0.2)"
                      }}
                    >
                      <AvatarFallback 
                        className="text-white font-medium text-xs"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          fontWeight: 500
                        }}
                      >
                        EU
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            
            {/* Metadados das mensagens do assistente (sugestões e perguntas) - estilo iOS nativo */}
            {messages?.filter(msg => msg.role === 'assistant' && msg.metadata).map((assistantMsg, index) => (
              <div key={`metadata-${assistantMsg.id}`} className="ml-10 mr-2 space-y-2.5 mb-4">
                {/* Tom emocional */}
                {assistantMsg.metadata.emotionalTone && (
                  <div className="flex items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div 
                      className="text-[10px] rounded-full bg-gray-50/80 text-gray-500 px-2 py-0.5 shadow-sm border border-gray-100/80 hardware-accelerated"
                      style={{
                        fontFamily: "var(--ios-system-font)",
                        fontWeight: 500,
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)"
                      }}
                    >
                      <span className="text-primary mr-1">✨</span> 
                      {assistantMsg.metadata.emotionalTone}
                    </div>
                  </div>
                )}
                
                {/* Recursos sugeridos com estilo iOS nativo */}
                {assistantMsg.metadata.suggestedResources && assistantMsg.metadata.suggestedResources.length > 0 && (
                  <div className="max-w-[92%] mt-1 mb-2">
                    <div 
                      className="rounded-xl bg-white/95 border border-gray-100/90 overflow-hidden animate-fade-in hardware-accelerated" 
                      style={{ 
                        animationDelay: '0.15s',
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)"
                      }}
                    >
                      <div 
                        className="bg-gray-50/90 text-xs font-medium px-3 py-1.5 text-gray-700 border-b border-gray-100/90 hardware-accelerated"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          fontWeight: 600,
                          letterSpacing: "-0.01em"
                        }}
                      >
                        <div className="flex items-center">
                          <Sparkles className="h-3.5 w-3.5 text-primary mr-1.5 flex-shrink-0" />
                          <span>Recursos sugeridos</span>
                        </div>
                      </div>
                      <div className="p-3 pt-2">
                        <ul className="text-xs text-gray-700 space-y-1.5">
                          {assistantMsg.metadata.suggestedResources.map((resource, i) => (
                            <li 
                              key={i} 
                              className="flex items-start"
                              style={{
                                fontFamily: "var(--ios-system-font)",
                                letterSpacing: "-0.01em"
                              }}
                            >
                              <span className="text-primary mr-1.5 flex-shrink-0">•</span>
                              <span className="leading-snug break-words">{resource}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Perguntas para reflexão com estilo iOS nativo */}
                {assistantMsg.metadata.followUpQuestions && assistantMsg.metadata.followUpQuestions.length > 0 && (
                  <div className="max-w-[92%] mt-1 mb-2">
                    <div 
                      className="rounded-xl bg-white/95 border border-gray-100/90 overflow-hidden animate-fade-in hardware-accelerated" 
                      style={{ 
                        animationDelay: '0.2s',
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)"
                      }}
                    >
                      <div 
                        className="bg-gray-50/90 text-xs font-medium px-3 py-1.5 text-gray-700 border-b border-gray-100/90 hardware-accelerated"
                        style={{
                          fontFamily: "var(--ios-system-font)",
                          fontWeight: 600,
                          letterSpacing: "-0.01em"
                        }}
                      >
                        <div className="flex items-center">
                          <div className="text-primary mr-1.5 flex-shrink-0">💬</div>
                          <span>Para refletir</span>
                        </div>
                      </div>
                      <div className="p-3 space-y-2.5">
                        {assistantMsg.metadata.followUpQuestions.map((question, i) => (
                          <button 
                            key={i}
                            className="text-xs text-gray-700 flex items-start w-full text-left rounded-lg p-1.5 hover:bg-gray-50/80 active:bg-gray-100/90 transition-colors"
                            onClick={() => {
                              setMessage(question);
                              if (textareaRef.current) {
                                textareaRef.current.focus();
                              }
                            }}
                            style={{
                              fontFamily: "var(--ios-system-font)",
                              letterSpacing: "-0.01em",
                              WebkitTapHighlightColor: "transparent"
                            }}
                          >
                            <div className="text-primary mr-2 mt-0.5 flex-shrink-0">
                              <ArrowRight className="h-2.5 w-2.5" />
                            </div>
                            <span className="leading-tight break-words">{question}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Indicador de digitação - Melhorado com animações mais fluidas */}
            {sendMessageMutation.isPending && (
              <div className="flex items-start gap-3 animate-slide-in-bottom hardware-accelerated max-w-[92%]">
                <Avatar className="h-9 w-9 mt-1 bg-white ring-2 ring-primary/20 shadow-sm animate-pulse-subtle flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white shadow-sm px-4 py-3 rounded-xl rounded-tl-md">
                  <div className="flex space-x-3 items-center">
                    <div className="h-3 w-3 bg-primary/40 rounded-full animate-pulse" 
                         style={{ animationDuration: "1.3s" }}></div>
                    <div className="h-3 w-3 bg-primary/40 rounded-full animate-pulse" 
                         style={{ animationDuration: "1.3s", animationDelay: "0.2s" }}></div>
                    <div className="h-3 w-3 bg-primary/40 rounded-full animate-pulse" 
                         style={{ animationDuration: "1.3s", animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </>
        )}
      </div>
      
      {/* Input de mensagem fixado permanentemente na parte inferior da tela */}
      <div 
        className="assistant-input-fixed fixed left-0 right-0 bottom-0 px-2 py-3 pb-safe bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-sm z-50 hardware-accelerated-extreme ios-absolute-fixed no-transition ios-events-contained" 
        style={{ 
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -1px 0 rgba(0, 0, 0, 0.05), 0 -4px 10px rgba(0, 0, 0, 0.03)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          transform: "translate3d(0, 0, 0)",
          WebkitTransform: "translate3d(0, 0, 0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          willChange: "transform",
          isolation: "isolate",
          touchAction: "none"
        }}
      >
        <div className="flex items-end gap-1.5 max-w-screen-sm mx-auto w-full">
          <div 
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-2 py-2 flex items-end shadow-sm hardware-accelerated"
            style={{
              transition: "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
              boxShadow: message.trim() ? "0 2px 8px rgba(var(--ios-primary-rgb), 0.12)" : "0 1px 3px rgba(0, 0, 0, 0.05)",
              borderColor: message.trim() ? `rgba(var(--ios-primary-rgb), 0.4)` : "rgba(226, 232, 240, 1)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)"
            }}
          >
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem para Sana..."
              className="flex-1 resize-none text-[15px] py-2 min-h-[40px] max-h-[100px] border-0 focus-visible:ring-0 bg-transparent focus-visible:ring-offset-0 placeholder:text-gray-400 hardware-accelerated-extreme ios-events-contained"
              disabled={sendMessageMutation.isPending}
              style={{
                fontFamily: "var(--ios-system-font)",
                letterSpacing: "-0.01em",
                caretColor: "var(--ios-primary-color)",
                transform: "translateZ(0)",
                WebkitTransform: "translateZ(0)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden"
              }}
            />
            
            {/* Botão de enviar mais compacto */}
            <Button
              type="submit"
              size="icon"
              className={`h-8 w-8 rounded-full shrink-0 hardware-accelerated-extreme ios-events-contained no-transition ${
                message.trim() && !sendMessageMutation.isPending 
                  ? "bg-primary hover:bg-primary/95 active:bg-primary/90 opacity-100" 
                  : "bg-gray-200 opacity-50"
              }`}
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              style={{
                WebkitTapHighlightColor: "transparent",
                transition: "all 0.2s ease-out",
                transform: "translateZ(0)",
                WebkitTransform: "translateZ(0)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                willChange: "transform"
              }}
            >
              {sendMessageMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <Send className="h-3.5 w-3.5 text-white" style={{transform: "translateX(0.5px) translateY(-0.5px)"}} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}