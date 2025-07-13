import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Calendar, BadgeInfo, Loader2, Home, ArrowLeft, ArrowRight } from "lucide-react";
import { DailyTip } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { IOSTouchWrapper, IOSButton } from "@/components/ui/ios-touch-wrapper";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCaptureLayer } from "@/components/ui/event-capture-layer";

export default function DailyTipPage() {
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("detalhes");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");
  
  // Buscar a dica do dia aleatória
  const { 
    data: dailyTip, 
    isLoading, 
    error 
  } = useQuery<DailyTip>({
    queryKey: ["/api/daily-tips/random"],
  });
  
  // Mutação para marcar a dica como lida
  const markAsViewedMutation = useMutation({
    mutationFn: async (tipId: number) => {
      const response = await apiRequest("POST", `/api/daily-tips/${tipId}/view`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidar a consulta de dicas não lidas para atualizar o indicador
      queryClient.invalidateQueries({ queryKey: ["/api/daily-tips/unread"] });
    }
  });
  
  // Ao carregar a dica, marcá-la como lida
  useEffect(() => {
    if (dailyTip?.id) {
      markAsViewedMutation.mutate(dailyTip.id);
    }
  }, [dailyTip?.id]);
  
  // Formatar a data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    }).format(date);
  };

  // Verificar se é hoje
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };
  
  // Estados de loading e erro
  if (isLoading) {
    return (
      <div className="scroll-container-absolute hardware-accelerated-extreme ios-native-scroll-container">
        <div className="p-4 space-y-5 daily-tip-page ios-momentum-scroll ios-scroll-wrapper ios-events-contained">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !dailyTip) {
    return (
      <div className="scroll-container-absolute hardware-accelerated-extreme ios-native-scroll-container">
        <div className="p-4 space-y-5 daily-tip-page ios-momentum-scroll ios-scroll-wrapper ios-events-contained">
          <div className="bg-red-50 p-5 rounded-xl border border-red-200">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Dica do Dia</h1>
            <p className="text-red-700">Não foi possível carregar a dica do dia. Tente novamente mais tarde.</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Renderização da visualização detalhada
  const renderDetailedView = () => (
    <>
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-5 shadow-lg border border-primary/30">
        <div className="flex items-center mb-4">
          <div className="bg-primary rounded-full p-3 mr-3 shadow-lg">
            <Lightbulb className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-gray-900">Dica do Dia</h2>
            {dailyTip.createdAt && (
              <p className="text-xs text-gray-600 flex items-center mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                {isToday(dailyTip.createdAt.toString()) ? 'Hoje' : formatDate(dailyTip.createdAt.toString())}
              </p>
            )}
          </div>
          <div className="ml-auto">
            <span className="text-xs font-medium text-primary-dark bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              {dailyTip.category || "Bem-estar"}
            </span>
          </div>
        </div>
      
        <Tabs defaultValue="detalhes" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-[45px] bg-background/50 p-1">
            <TabsTrigger value="detalhes" className="text-sm font-medium">Detalhes</TabsTrigger>
            <TabsTrigger value="aplicacao" className="text-sm font-medium">Aplicação</TabsTrigger>
            <TabsTrigger value="relacionadas" className="text-sm font-medium">Relacionadas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="detalhes" className="pt-4 mt-0">
            <div className="bg-white rounded-xl p-5 border-l-4 border-l-primary-dark border-t border-r border-b border-gray-200 shadow-md">
              <h3 className="text-lg font-bold mb-3 text-gray-900 bg-gradient-to-r from-primary-dark/20 to-transparent px-3 py-2 rounded-lg">
                {dailyTip.title}
              </h3>
              
              <div className="text-[15px] text-gray-800 leading-relaxed tracking-wide px-3">
                <p className="whitespace-pre-line">{dailyTip.content}</p>
              </div>
              
              {dailyTip.tags && dailyTip.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 px-3">
                  {dailyTip.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="bg-primary-dark/20 text-primary-dark text-xs font-medium px-3 py-1.5 rounded-full shadow-sm border border-primary-dark/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {dailyTip.sources && dailyTip.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200 bg-gray-50 mx-3 px-3 py-2 rounded-b-lg">
                  <p className="text-xs text-gray-600 font-medium flex items-center">
                    <span className="mr-1">🔍</span>
                    Fonte: {dailyTip.sources[0]}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="aplicacao" className="pt-4 mt-0">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md">
              <h3 className="text-lg font-bold mb-3 text-gray-900">Aplicando na sua vida</h3>
              
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-medium text-primary-dark mb-2">Reflexão</h4>
                  <p className="text-sm text-gray-700">
                    Pense sobre como esta dica se relaciona com sua vida atual. Quais aspectos ressoam mais profundamente com você?
                  </p>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-medium text-primary-dark mb-2">Prática Diária</h4>
                  <p className="text-sm text-gray-700">
                    Escolha um pequeno hábito relacionado a esta dica que você possa implementar nos próximos dias. Comece com algo simples e alcançável.
                  </p>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h4 className="font-medium text-primary-dark mb-2">Compartilhe</h4>
                  <p className="text-sm text-gray-700">
                    Considere compartilhar esta reflexão com um amigo ou no seu grupo de apoio. Discutir insights pode aprofundar sua compreensão.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="relacionadas" className="pt-4 mt-0">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-md">
              <h3 className="text-lg font-bold mb-3 text-gray-900">Dicas Relacionadas</h3>
              
              <div className="space-y-3">
                <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <h4 className="font-medium text-gray-900 text-sm">Práticas de Autocompaixão</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Aprenda a tratar a si mesmo com a mesma gentileza que ofereceria a um bom amigo.
                  </p>
                </div>
                
                <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <h4 className="font-medium text-gray-900 text-sm">Técnicas de Respiração para Ansiedade</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Exercícios respiratórios que podem ajudar a acalmar mente e corpo em momentos de tensão.
                  </p>
                </div>
                
                <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <h4 className="font-medium text-gray-900 text-sm">Construindo Resiliência Emocional</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Estratégias para desenvolver a capacidade de se recuperar de adversidades.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="flex justify-between mt-4">
        <IOSButton 
          className="text-xs font-medium"
          iosStyle="outline"
          onClick={() => setViewMode("compact")}
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Ver lista de dicas
        </IOSButton>
        
        <IOSButton 
          className="text-xs font-medium"
          iosStyle="filled"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/daily-tips/random"] })}
        >
          Próxima dica
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </IOSButton>
      </div>
    </>
  );
  
  // Renderização da visualização compacta (lista de dicas)
  const renderCompactView = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dicas do Dia</h1>
          <p className="text-sm text-gray-600">Recomendações personalizadas para seu bem-estar</p>
        </div>
      </div>

      <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-primary mb-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl text-primary-dark">{dailyTip.title}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                {isToday(dailyTip.createdAt.toString()) ? 'Hoje' : formatDate(dailyTip.createdAt.toString())}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/5">
              {dailyTip.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="whitespace-pre-line line-clamp-3">{dailyTip.content}</p>
          </div>
          
          {dailyTip.tags && dailyTip.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {dailyTip.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-700">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <IOSButton 
            className="text-xs font-medium"
            iosStyle="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/daily-tips/random"] })}
          >
            Próxima dica
          </IOSButton>
          <IOSButton 
            className="text-xs font-medium"
            iosStyle="filled"
            onClick={() => setViewMode("detailed")}
          >
            Ver detalhes
          </IOSButton>
        </CardFooter>
      </Card>
      
      <div className="space-y-4 mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Dicas populares</h2>
        
        <div className="space-y-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Técnicas de respiração para reduzir a ansiedade</CardTitle>
            </CardHeader>
            <CardFooter className="py-3 border-t flex justify-between">
              <Badge variant="outline" className="bg-gray-50">Bem-estar</Badge>
              <CardDescription className="text-xs">
                <Calendar className="h-3 w-3 inline mr-1" />
                {formatDate(new Date().toString())}
              </CardDescription>
            </CardFooter>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Construindo hábitos saudáveis para o sono</CardTitle>
            </CardHeader>
            <CardFooter className="py-3 border-t flex justify-between">
              <Badge variant="outline" className="bg-gray-50">Saúde</Badge>
              <CardDescription className="text-xs">
                <Calendar className="h-3 w-3 inline mr-1" />
                {formatDate(new Date().toString())}
              </CardDescription>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
  
  // A camada externa EventCaptureLayer garante que eventos de toque
  // não se propagem através das camadas que poderiam interferir com o botão de menu
  return (
    <EventCaptureLayer>
      <IOSTouchWrapper 
        className="scroll-container-absolute hardware-accelerated-extreme ios-native-scroll-container ios-touch-fix"
        forceEnable={true}
        enableScrollFix={true}
        debug={false}
      >
        <div className="p-4 space-y-5 daily-tip-page ios-momentum-scroll ios-scroll-wrapper ios-events-contained ios-touch-fix">
          {viewMode === "detailed" ? renderDetailedView() : renderCompactView()}
        </div>
      </IOSTouchWrapper>
    </EventCaptureLayer>
  );
}