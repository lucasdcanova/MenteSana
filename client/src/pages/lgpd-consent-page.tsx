import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, ShieldAlert, FileText, Download, Eye, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// Interface para consentimentos
interface Consent {
  id: number;
  userId: number;
  consentType: string;
  granted: boolean;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
  documentVersion: string | null;
  expiresAt: string | null;
  additionalData: any | null;
}

// Interface para documentos legais
interface LegalDocument {
  id: number;
  documentType: string;
  version: string;
  effectiveDate: string;
  documentText: string;
  isActive: boolean;
}

// Interface para solicitações do titular
interface DataSubjectRequest {
  id: number;
  userId: number;
  requestType: 'deletion' | 'anonymization' | 'export' | 'correction';
  requestDetails: string | null;
  requestDate: string;
  status: string;
  completionDate: string | null;
  handledBy: number | null;
  responseDetails: string | null;
}

const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return 'Data inválida';
  }
};

export default function LGPDConsentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('consentimentos');

  // Buscar consentimentos
  const {
    data: consents,
    isLoading: isLoadingConsents,
    error: consentsError
  } = useQuery<Consent[]>({
    queryKey: ['/api/lgpd/consents'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/lgpd/consents');
      return response.json();
    }
  });

  // Buscar documentos legais ativos
  const {
    data: privacyPolicy,
    isLoading: isLoadingPrivacyPolicy
  } = useQuery<LegalDocument>({
    queryKey: ['/api/lgpd/documents/privacy_policy'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/lgpd/documents/privacy_policy');
      return response.json();
    },
    retry: false,
    enabled: activeTab === 'documentos'
  });

  const {
    data: termsOfUse,
    isLoading: isLoadingTermsOfUse
  } = useQuery<LegalDocument>({
    queryKey: ['/api/lgpd/documents/terms_of_use'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/lgpd/documents/terms_of_use');
      return response.json();
    },
    retry: false,
    enabled: activeTab === 'documentos'
  });

  // Buscar solicitações do titular
  const {
    data: subjectRequests,
    isLoading: isLoadingRequests
  } = useQuery<DataSubjectRequest[]>({
    queryKey: ['/api/lgpd/subject-requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/lgpd/subject-requests');
      return response.json();
    },
    enabled: activeTab === 'solicitacoes'
  });

  // Mutação para atualizar consentimento
  const updateConsentMutation = useMutation({
    mutationFn: async ({ consentType, granted }: { consentType: string; granted: boolean }) => {
      const response = await apiRequest('POST', '/api/lgpd/consents', { consentType, granted });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lgpd/consents'] });
      toast({
        title: 'Consentimento atualizado',
        description: 'Suas preferências de privacidade foram atualizadas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o consentimento. Tente novamente.',
        variant: 'destructive',
      });
    }
  });

  // Mutação para solicitar exclusão de dados
  const requestDeletionMutation = useMutation({
    mutationFn: async (requestDetails: string) => {
      const response = await apiRequest('POST', '/api/lgpd/subject-requests', {
        requestType: 'deletion',
        requestDetails
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lgpd/subject-requests'] });
      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação de exclusão de dados foi enviada e será processada em breve.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar sua solicitação. Tente novamente.',
        variant: 'destructive',
      });
    }
  });

  // Mutação para solicitar exportação de dados
  const requestExportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/lgpd/data-report');
      return response.json();
    },
    onSuccess: (data) => {
      // Iniciar download do relatório como JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dados_pessoais.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Relatório de dados gerado',
        description: 'O download do relatório completo de seus dados pessoais foi iniciado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o relatório de dados. Tente novamente.',
        variant: 'destructive',
      });
    }
  });

  // Função para traduzir tipo de consentimento
  const getConsentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      marketing: 'Comunicações de marketing',
      third_party: 'Compartilhamento com terceiros',
      analytics: 'Análise de uso',
      personalization: 'Personalização de conteúdo',
      essential: 'Funcionamento essencial'
    };
    return labels[type] || type;
  };

  // Função para obter badge de status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pendente</Badge>;
      case 'Em Processamento':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Em Processamento</Badge>;
      case 'Concluído':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Concluído</Badge>;
      case 'Rejeitado':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Função para traduzir tipo de solicitação
  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deletion: 'Exclusão de dados',
      anonymization: 'Anonimização de dados',
      export: 'Exportação de dados',
      correction: 'Correção de dados'
    };
    return labels[type] || type;
  };

  // Função para controlar mudança de consentimento
  const handleConsentChange = (consentType: string, granted: boolean) => {
    updateConsentMutation.mutate({ consentType, granted });
  };

  // Função para solicitar exclusão de conta
  const handleRequestDeletion = () => {
    if (window.confirm('Tem certeza que deseja solicitar a exclusão de sua conta? Esta ação não pode ser desfeita uma vez que for processada.')) {
      requestDeletionMutation.mutate('Solicitação de exclusão de conta e todos os dados pessoais associados.');
    }
  };

  // Função para exportar dados
  const handleExportData = () => {
    requestExportMutation.mutate();
  };

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Shield className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-2xl font-bold">Centro de Privacidade</h1>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Gerencie suas preferências de privacidade e consentimentos de acordo com a Lei Geral de Proteção de Dados (LGPD).
      </p>
      
      <Tabs defaultValue="consentimentos" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="consentimentos">Consentimentos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos Legais</TabsTrigger>
          <TabsTrigger value="solicitacoes">Suas Solicitações</TabsTrigger>
        </TabsList>
        
        {/* Tab de Consentimentos */}
        <TabsContent value="consentimentos">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Privacidade</CardTitle>
                <CardDescription>
                  Controle quais dados e informações você nos permite coletar e processar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingConsents ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : consentsError ? (
                  <Alert variant="destructive" className="mb-4">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>
                      Não foi possível carregar suas preferências de privacidade. Tente novamente mais tarde.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {consents && consents.length > 0 ? (
                      consents.map((consent) => (
                        <div key={consent.id} className="flex items-start space-x-3 py-3">
                          <Checkbox
                            id={`consent-${consent.id}`}
                            checked={consent.granted}
                            onCheckedChange={(checked) => 
                              handleConsentChange(consent.consentType, Boolean(checked))
                            }
                            disabled={consent.consentType === 'essential'}
                          />
                          <div className="space-y-1">
                            <label
                              htmlFor={`consent-${consent.id}`}
                              className="font-medium leading-none cursor-pointer"
                            >
                              {getConsentTypeLabel(consent.consentType)}
                              {consent.consentType === 'essential' && (
                                <span className="ml-2 text-xs bg-gray-100 p-1 rounded">Obrigatório</span>
                              )}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {consent.consentType === 'marketing' && 'Envio de novidades, dicas e ofertas por e-mail e notificações.'}
                              {consent.consentType === 'third_party' && 'Compartilhamento com parceiros para melhorar os serviços oferecidos.'}
                              {consent.consentType === 'analytics' && 'Análise de uso para melhorar a experiência e o desempenho da plataforma.'}
                              {consent.consentType === 'personalization' && 'Personalização de conteúdo com base em seu perfil e atividades.'}
                              {consent.consentType === 'essential' && 'Processamento necessário para o funcionamento básico da plataforma.'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Última atualização: {formatTimestamp(consent.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>Nenhum consentimento configurado. Entre em contato com o suporte.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seus Direitos</CardTitle>
                <CardDescription>
                  A LGPD garante direitos sobre seus dados pessoais. Você pode solicitar acesso, correção, anonimização, exclusão e mais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleExportData}
                    variant="outline"
                    className="flex items-center justify-center"
                    disabled={requestExportMutation.isPending}
                  >
                    {requestExportMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Baixar Meus Dados
                  </Button>
                  <Button
                    onClick={handleRequestDeletion}
                    variant="outline"
                    className="flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    disabled={requestDeletionMutation.isPending}
                  >
                    {requestDeletionMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Solicitar Exclusão de Conta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab de Documentos Legais */}
        <TabsContent value="documentos">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Política de Privacidade</CardTitle>
                <CardDescription>
                  Nossa política de privacidade explica como coletamos, usamos e protegemos seus dados pessoais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPrivacyPolicy ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : privacyPolicy ? (
                  <div>
                    <div className="text-muted-foreground mb-4 text-sm">
                      <p>Versão: {privacyPolicy.version}</p>
                      <p>Vigência: {formatTimestamp(privacyPolicy.effectiveDate)}</p>
                    </div>
                    <div className="prose prose-sm max-h-96 overflow-y-auto border rounded p-4 bg-gray-50">
                      <div dangerouslySetInnerHTML={{ __html: privacyPolicy.documentText }} />
                    </div>
                  </div>
                ) : (
                  <p>Documento não disponível no momento.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Termos de Uso</CardTitle>
                <CardDescription>
                  Nossos termos de uso descrevem as regras e condições para uso da plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTermsOfUse ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : termsOfUse ? (
                  <div>
                    <div className="text-muted-foreground mb-4 text-sm">
                      <p>Versão: {termsOfUse.version}</p>
                      <p>Vigência: {formatTimestamp(termsOfUse.effectiveDate)}</p>
                    </div>
                    <div className="prose prose-sm max-h-96 overflow-y-auto border rounded p-4 bg-gray-50">
                      <div dangerouslySetInnerHTML={{ __html: termsOfUse.documentText }} />
                    </div>
                  </div>
                ) : (
                  <p>Documento não disponível no momento.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Tab de Solicitações */}
        <TabsContent value="solicitacoes">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Direitos do Titular</CardTitle>
              <CardDescription>
                Acompanhe o status das suas solicitações relacionadas aos seus dados pessoais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : subjectRequests && subjectRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Tipo</th>
                        <th className="text-left py-3 px-2">Data</th>
                        <th className="text-left py-3 px-2">Status</th>
                        <th className="text-left py-3 px-2">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectRequests.map((request) => (
                        <tr key={request.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            {getRequestTypeLabel(request.requestType)}
                          </td>
                          <td className="py-3 px-2">
                            {formatTimestamp(request.requestDate)}
                          </td>
                          <td className="py-3 px-2">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="py-3 px-2">
                            {request.requestDetails || 'Sem detalhes adicionais'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Você ainda não fez nenhuma solicitação.</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                As solicitações são processadas em até 15 dias úteis, conforme previsto na LGPD.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}