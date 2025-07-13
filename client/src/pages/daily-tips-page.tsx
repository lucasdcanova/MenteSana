import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LightbulbIcon, BadgeInfo, Home, Calendar } from "lucide-react";
import { Link } from "wouter";
import { DailyTip } from "../../../shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

export default function DailyTipsPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Busca a dica do dia atual
  const { data: dailyTip, isLoading, error } = useQuery<DailyTip>({
    queryKey: ["/api/daily-tips/random"],
    queryFn: async () => {
      const res = await fetch("/api/daily-tips/random", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`
        }
      });
      if (!res.ok) throw new Error("Falha ao carregar dica diária");
      return res.json();
    },
  });

  // Formatar a data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dica do Dia</h1>
          <p className="text-gray-600">Recomendação personalizada baseada na sua jornada de saúde mental</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Erro ao carregar dica diária: {error.message}</p>
          </CardContent>
        </Card>
      ) : dailyTip ? (
        <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl text-green-700">{dailyTip.title}</CardTitle>
                <CardDescription className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  {isToday(dailyTip.createdAt.toString()) ? 'Hoje' : formatDate(dailyTip.createdAt.toString())}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50">
                {dailyTip.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-line">{dailyTip.content}</p>
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
          {(dailyTip.evidenceLevel || (dailyTip.sources && dailyTip.sources.length > 0)) && (
            <CardFooter className="flex-col items-start bg-gray-50 rounded-b-lg pt-4">
              {dailyTip.evidenceLevel && (
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <BadgeInfo className="h-4 w-4 mr-2" />
                  <span>Nível de evidência: <strong>{dailyTip.evidenceLevel}</strong></span>
                </div>
              )}
              
              {dailyTip.sources && dailyTip.sources.length > 0 && (
                <div className="w-full">
                  <Separator className="my-2" />
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Fontes:</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                    {dailyTip.sources.map((source, i) => (
                      <li key={i}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardFooter>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <LightbulbIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma dica disponível hoje</h3>
              <p className="text-gray-500 mb-6">
                Volte amanhã para ver uma nova dica personalizada de saúde mental.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}