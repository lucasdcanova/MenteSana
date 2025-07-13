import React from "react";
import { IosCard } from "@/components/ui/ios-card";
import { IosButton } from "@/components/ui/ios-button";
import { Bookmark, FileText, Info, Lock, Shield, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsPage() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="pb-20 min-h-screen bg-white dark:bg-gray-950">
      {/* Cabeçalho fixo estilo iOS */}
      <div className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => setLocation('/settings')}
            className="flex items-center text-primary p-2 -ml-2"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Voltar</span>
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 mr-8">Termos de Uso</h1>
        </div>
      </div>
      
      {/* Espaço para compensar o cabeçalho fixo */}
      <div className="h-14 mt-4" style={{ marginTop: 'env(safe-area-inset-top)' }}></div>
      
      <div className="px-4 space-y-6">
        <IosCard className="overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Termos de Uso da Plataforma MindWell</h2>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-500 mb-6">
                <strong>Última atualização:</strong> 24 de abril de 2025
              </p>
              
              <h3>1. INTRODUÇÃO</h3>
              <p>
                Bem-vindo ao MindWell. Estes Termos de Uso regem o uso da plataforma MindWell, incluindo nosso 
                aplicativo móvel e website ("Plataforma"). Ao utilizar nossa Plataforma, você concorda 
                integralmente com estes termos. Se você não concordar com alguma parte destes termos, 
                solicitamos que não utilize nossa Plataforma.
              </p>
              
              <h3>2. DESCRIÇÃO DO SERVIÇO</h3>
              <p>
                O MindWell é uma plataforma de saúde mental que oferece ferramentas de autoajuda, 
                acesso a terapeutas e recursos para monitoramento emocional. Nossa Plataforma não 
                substitui tratamentos médicos ou psicológicos profissionais presenciais. Em caso de 
                emergência, recomendamos buscar ajuda médica imediata.
              </p>
              
              <h3>3. ELEGIBILIDADE</h3>
              <p>
                Para utilizar o MindWell, você deve ter pelo menos 18 anos de idade ou estar sob supervisão 
                de um responsável legal. Ao criar uma conta, você confirma que atende a este requisito 
                e que tem capacidade legal para aceitar estes termos.
              </p>
              
              <h3>4. CADASTRO E SEGURANÇA</h3>
              <p>
                Para usar todas as funcionalidades do MindWell, é necessário criar uma conta com 
                informações precisas e completas. Você é responsável por manter a confidencialidade 
                de sua senha e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente 
                sobre qualquer uso não autorizado de sua conta.
              </p>
              
              <h3>5. UTILIZAÇÃO ADEQUADA</h3>
              <p>
                Ao usar nossa Plataforma, você concorda em:
              </p>
              <ul>
                <li>Não utilizar a Plataforma para fins ilegais ou não autorizados;</li>
                <li>Não tentar acessar áreas restritas da Plataforma;</li>
                <li>Não interferir no funcionamento normal da Plataforma;</li>
                <li>Não utilizar linguagem ofensiva ou compartilhar conteúdo inadequado;</li>
                <li>Não compartilhar informações falsas ou difamatórias;</li>
                <li>Não utilizar a Plataforma para prejudicar terceiros.</li>
              </ul>
              
              <h3>6. CONTEÚDO DO USUÁRIO</h3>
              <p>
                Ao submeter conteúdo à nossa Plataforma (como entradas de diário, mensagens, etc.), 
                você concede ao MindWell uma licença mundial, não exclusiva, isenta de royalties, 
                para usar, armazenar e processar esse conteúdo conforme necessário para fornecer 
                nossos serviços e melhorar a Plataforma.
              </p>
              
              <h3>7. PROPRIEDADE INTELECTUAL</h3>
              <p>
                Todo o conteúdo disponibilizado pela Plataforma, incluindo textos, gráficos, logos, 
                ícones, imagens, clipes de áudio, downloads digitais e compilações de dados, é 
                propriedade do MindWell ou de seus licenciadores e está protegido por leis brasileiras 
                e internacionais de propriedade intelectual.
              </p>
              
              <h3>8. INTERAÇÕES COM TERAPEUTAS</h3>
              <p>
                O MindWell facilita a conexão entre usuários e terapeutas, mas não é responsável pelas 
                interações, aconselhamentos ou tratamentos fornecidos pelos terapeutas através da 
                Plataforma. Os terapeutas são profissionais independentes e não são empregados do MindWell.
              </p>
              
              <h3>9. LIMITAÇÃO DE RESPONSABILIDADE</h3>
              <p>
                Na máxima extensão permitida por lei, o MindWell não será responsável por quaisquer 
                danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos, 
                relacionados ao uso ou incapacidade de uso da Plataforma.
              </p>
              
              <h3>10. ALTERAÇÕES NOS TERMOS</h3>
              <p>
                Podemos modificar estes Termos de Uso a qualquer momento, publicando os termos revisados 
                na Plataforma. O uso continuado da Plataforma após tais alterações constitui aceitação 
                dos novos termos.
              </p>
              
              <h3>11. CANCELAMENTO</h3>
              <p>
                Você pode cancelar sua conta a qualquer momento através das configurações da Plataforma. 
                Reservamo-nos o direito de suspender ou encerrar o acesso à Plataforma em caso de 
                violação destes Termos.
              </p>
              
              <h3>12. LEI APLICÁVEL</h3>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. 
                Qualquer disputa relacionada a estes Termos será submetida aos tribunais do Brasil.
              </p>
              
              <h3>13. CONTATO</h3>
              <p>
                Para questões relacionadas a estes Termos de Uso, entre em contato conosco pelo e-mail: 
                contato@mindwell.com.br
              </p>
            </div>
          </div>
        </IosCard>
        
        <div className="flex justify-center mt-6">
          <IosButton onClick={() => setLocation('/privacy')}>
            <Shield className="w-4 h-4 mr-2" />
            Ver Política de Privacidade
          </IosButton>
        </div>
      </div>
    </div>
  );
}