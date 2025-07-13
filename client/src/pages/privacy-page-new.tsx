import React from "react";
import { IosCard } from "@/components/ui/ios-card";
import { IosButton } from "@/components/ui/ios-button";
import { FileText, Shield, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="pb-20 min-h-screen bg-white dark:bg-gray-950">
      {/* Cabeçalho fixo estilo iOS */}
      <div className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => window.location.href = '/settings'}
            className="flex items-center text-primary p-2 -ml-2"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Voltar</span>
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 mr-8">Política de Privacidade</h1>
        </div>
      </div>
      
      {/* Espaço para compensar o cabeçalho fixo */}
      <div className="h-14 mt-4" style={{ marginTop: 'env(safe-area-inset-top)' }}></div>
      
      <div className="px-4 space-y-6">
        <IosCard className="overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Política de Privacidade do MindWell</h2>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-500 mb-6">
                <strong>Última atualização:</strong> 24 de abril de 2025
              </p>
              
              <h3>1. INTRODUÇÃO</h3>
              <p>
                A proteção de sua privacidade é de extrema importância para nós. Esta Política de 
                Privacidade foi elaborada em conformidade com a Lei Geral de Proteção de Dados Pessoais 
                (Lei nº 13.709/2018 - "LGPD") e outras legislações aplicáveis, e descreve como o MindWell 
                coleta, usa, compartilha e protege suas informações pessoais.
              </p>
              
              <h3>2. DEFINIÇÕES</h3>
              <p>
                Para os fins desta Política de Privacidade:
              </p>
              <ul>
                <li><strong>Dados Pessoais:</strong> qualquer informação relacionada a pessoa natural identificada ou identificável;</li>
                <li><strong>Dados Pessoais Sensíveis:</strong> dados pessoais sobre origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado genético ou biométrico, quando vinculado a uma pessoa natural;</li>
                <li><strong>Titular:</strong> pessoa natural a quem se referem os dados pessoais;</li>
                <li><strong>Tratamento:</strong> toda operação realizada com dados pessoais, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, avaliação, controle, modificação, comunicação, transferência, difusão ou extração.</li>
              </ul>
              
              <h3>3. COLETA DE DADOS</h3>
              <p>
                O MindWell coleta os seguintes tipos de dados:
              </p>
              <ul>
                <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, data de nascimento;</li>
                <li><strong>Dados de uso:</strong> informações sobre como você utiliza nossa plataforma;</li>
                <li><strong>Dados sensíveis de saúde:</strong> informações sobre seu estado emocional, histórico de saúde mental, entradas de diário, gravações de áudio (quando você utiliza a função de diário por voz);</li>
                <li><strong>Dados de dispositivo:</strong> informações sobre o dispositivo e navegador utilizados para acessar a plataforma.</li>
              </ul>
              
              <h3>4. BASES LEGAIS PARA O TRATAMENTO</h3>
              <p>
                Tratamos seus dados pessoais com base nas seguintes condições previstas na LGPD:
              </p>
              <ul>
                <li><strong>Consentimento:</strong> quando você aceita esta Política de Privacidade e autoriza expressamente o tratamento de seus dados, especialmente dados sensíveis de saúde;</li>
                <li><strong>Execução de contrato:</strong> para prestar os serviços contratados através da plataforma;</li>
                <li><strong>Interesse legítimo:</strong> para melhorar nossos serviços, garantir a segurança da plataforma e entender como podemos melhor atender às suas necessidades;</li>
                <li><strong>Cumprimento de obrigação legal:</strong> quando exigido por lei;</li>
                <li><strong>Tutela da saúde:</strong> exclusivamente em procedimentos realizados por profissionais de saúde ou por entidades sanitárias.</li>
              </ul>
              
              <h3>5. FINALIDADES DO TRATAMENTO</h3>
              <p>
                Utilizamos seus dados pessoais para as seguintes finalidades:
              </p>
              <ul>
                <li>Fornecer acesso à plataforma e seus recursos;</li>
                <li>Conectar você com terapeutas adequados às suas necessidades;</li>
                <li>Analisar seu estado emocional e oferecer recomendações personalizadas;</li>
                <li>Processar suas entradas de diário e fornecer insights sobre suas emoções;</li>
                <li>Melhorar a qualidade dos nossos serviços e desenvolver novos recursos;</li>
                <li>Enviar comunicações relevantes sobre seu uso da plataforma;</li>
                <li>Proteger contra fraudes e atividades potencialmente ilegais;</li>
                <li>Cumprir obrigações legais.</li>
              </ul>
              
              <h3>6. USO DE INTELIGÊNCIA ARTIFICIAL</h3>
              <p>
                O MindWell utiliza tecnologias de inteligência artificial para analisar o conteúdo 
                das suas entradas de diário, gravações de voz e outras interações com a plataforma, 
                com o objetivo de:
              </p>
              <ul>
                <li>Identificar padrões emocionais e fornecer insights personalizados;</li>
                <li>Recomendar exercícios e atividades baseados em seu estado emocional;</li>
                <li>Melhorar a assistente virtual "Sana" para oferecer suporte mais personalizado.</li>
              </ul>
              <p>
                Você pode controlar quais dados são compartilhados com nossos sistemas de IA através 
                das configurações de privacidade da plataforma.
              </p>
              
              <h3>7. COMPARTILHAMENTO DE DADOS</h3>
              <p>
                O MindWell pode compartilhar seus dados pessoais nas seguintes situações:
              </p>
              <ul>
                <li><strong>Com terapeutas:</strong> informações relevantes para a prestação de serviços terapêuticos (mediante seu consentimento específico);</li>
                <li><strong>Com prestadores de serviços:</strong> empresas que nos auxiliam na operação da plataforma, como serviços de hospedagem, processamento de pagamentos e análise de dados;</li>
                <li><strong>Por obrigação legal:</strong> quando exigido por lei, regulamento ou ordem judicial;</li>
                <li><strong>Para proteção de direitos:</strong> quando necessário para proteger nossos direitos, sua segurança ou a de terceiros.</li>
              </ul>
              <p>
                Você pode controlar quais informações são compartilhadas com seu terapeuta através 
                das configurações de privacidade da plataforma.
              </p>
              
              <h3>8. ARMAZENAMENTO E SEGURANÇA</h3>
              <p>
                Adotamos medidas técnicas e administrativas de segurança para proteger seus dados pessoais 
                contra acessos não autorizados, perda, alteração ou destruição acidental. Essas medidas incluem:
              </p>
              <ul>
                <li>Criptografia de dados pessoais e sensíveis;</li>
                <li>Controles de acesso rigorosos;</li>
                <li>Backups regulares;</li>
                <li>Auditoria e monitoramento de segurança.</li>
              </ul>
              <p>
                Os dados são armazenados em servidores localizados no Brasil, em conformidade com 
                a legislação brasileira.
              </p>
              
              <h3>9. RETENÇÃO DE DADOS</h3>
              <p>
                Armazenamos seus dados pessoais pelo tempo necessário para cumprir as finalidades 
                descritas nesta Política de Privacidade, a menos que um período de retenção maior 
                seja exigido por lei. Se você excluir sua conta, seus dados pessoais serão excluídos 
                ou anonimizados, exceto quando for necessário mantê-los para fins legais.
              </p>
              
              <h3>10. DIREITOS DO TITULAR DOS DADOS</h3>
              <p>
                Conforme previsto na LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:
              </p>
              <ul>
                <li>Confirmar a existência de tratamento de seus dados;</li>
                <li>Acessar seus dados;</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;</li>
                <li>Solicitar a portabilidade de seus dados a outro fornecedor de serviço;</li>
                <li>Solicitar a eliminação dos dados tratados com seu consentimento;</li>
                <li>Obter informação sobre entidades públicas ou privadas com as quais compartilhamos seus dados;</li>
                <li>Revogar seu consentimento a qualquer momento;</li>
                <li>Opor-se a tratamento realizado com fundamento em outras bases legais, em caso de descumprimento da LGPD;</li>
                <li>Solicitar revisão de decisões automatizadas que afetem seus interesses.</li>
              </ul>
              <p>
                Para exercer esses direitos, entre em contato conosco através dos canais indicados 
                na seção "Contato" desta Política.
              </p>
              
              <h3>11. COOKIES E TECNOLOGIAS SEMELHANTES</h3>
              <p>
                Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência, entender 
                como você utiliza nossa plataforma e personalizar nosso conteúdo. Você pode gerenciar 
                suas preferências de cookies através das configurações do seu navegador.
              </p>
              
              <h3>12. TRANSFERÊNCIA INTERNACIONAL DE DADOS</h3>
              <p>
                Quando necessário, podemos transferir seus dados para outros países. Nestes casos, 
                garantimos que o país de destino proporcione grau de proteção adequado de dados pessoais, 
                ou utilizamos cláusulas contratuais específicas aprovadas pela Autoridade Nacional de 
                Proteção de Dados.
              </p>
              
              <h3>13. PROTEÇÃO DE DADOS DE MENORES</h3>
              <p>
                O MindWell não se destina a menores de 18 anos sem supervisão parental. Caso tome 
                conhecimento de que coletamos dados de um menor sem a devida autorização de um responsável 
                legal, tomaremos medidas para excluir essas informações.
              </p>
              
              <h3>14. ALTERAÇÕES NA POLÍTICA DE PRIVACIDADE</h3>
              <p>
                Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos você 
                sobre alterações significativas através da plataforma ou outros meios de contato fornecidos.
              </p>
              
              <h3>15. CONTATO E ENCARREGADO DE DADOS (DPO)</h3>
              <p>
                Para questões relacionadas a esta Política de Privacidade ou sobre o tratamento de seus 
                dados pessoais, entre em contato com nosso Encarregado de Dados (DPO) através do e-mail: 
                privacidade@mindwell.com.br
              </p>
              
              <h3>16. AUTORIDADE NACIONAL DE PROTEÇÃO DE DADOS</h3>
              <p>
                Caso tenha dúvidas ou reclamações sobre o tratamento de seus dados que não tenham sido 
                solucionadas pelo MindWell, você pode entrar em contato com a Autoridade Nacional de 
                Proteção de Dados (ANPD) através do site: https://www.gov.br/anpd
              </p>
            </div>
          </div>
        </IosCard>
        
        <div className="flex justify-center mt-6">
          <IosButton onClick={() => window.location.href = '/terms'}>
            <FileText className="w-4 h-4 mr-2" />
            Ver Termos de Uso
          </IosButton>
        </div>
      </div>
    </div>
  );
}