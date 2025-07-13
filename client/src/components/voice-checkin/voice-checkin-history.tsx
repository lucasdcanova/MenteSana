import React, { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { VoiceCheckin } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceAnalysisResult } from "./voice-analysis-result";
import { Calendar, Headphones, Clock, LayoutGrid } from "lucide-react";

interface VoiceCheckinHistoryProps {
  checkins: VoiceCheckin[];
  isLoading: boolean;
}

export function VoiceCheckinHistory({ checkins, isLoading }: VoiceCheckinHistoryProps) {
  const [selectedCheckin, setSelectedCheckin] = useState<VoiceCheckin | null>(
    checkins.length > 0 ? checkins[0] : null
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Check-ins</CardTitle>
          <CardDescription>Carregando histórico...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (checkins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Check-ins</CardTitle>
          <CardDescription>Você ainda não tem check-ins de voz gravados</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Headphones className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhum check-in encontrado</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Seus check-ins de voz aparecerão aqui quando você começar a gravá-los.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Check-ins</CardTitle>
              <CardDescription>{checkins.length} check-ins realizados</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("list")}
              >
                <Calendar className="h-4 w-4" />
                <span className="sr-only">Visualização em lista</span>
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="sr-only">Visualização em grade</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="analysis">Análise</TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              {viewMode === "list" ? (
                <ScrollArea className="h-[400px]" enableMouseWheel={true}>
                  <div className="space-y-2">
                    {checkins.map((checkin) => (
                      <div
                        key={checkin.id}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedCheckin?.id === checkin.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedCheckin(checkin)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {format(new Date(checkin.createdAt), "PPP", { locale: ptBR })}
                            </p>
                            <p className="text-sm">
                              {checkin.emotionalTone || "Sem análise de tom"}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="text-sm">{checkin.duration}s</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 h-[400px] overflow-y-auto p-1">
                  {checkins.map((checkin) => (
                    <div
                      key={checkin.id}
                      className={`p-4 rounded-md cursor-pointer transition-colors flex flex-col justify-between ${
                        selectedCheckin?.id === checkin.id
                          ? "bg-primary text-primary-foreground"
                          : "border hover:border-primary"
                      }`}
                      onClick={() => setSelectedCheckin(checkin)}
                    >
                      <div className="mb-3">
                        <p className="text-xs">
                          {formatDistanceToNow(new Date(checkin.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <Headphones className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">
                            {checkin.duration}s
                          </span>
                        </div>
                        <p className="text-xs line-clamp-1">
                          {checkin.emotionalTone || "Sem análise de tom"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="analysis">
              {selectedCheckin && <VoiceAnalysisResult checkin={selectedCheckin} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}