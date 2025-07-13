# Documentação Técnica - MindWell

## Arquitetura do Sistema

### Visão Geral
O MindWell é desenvolvido como uma aplicação nativa para iOS, utilizando uma arquitetura moderna de cliente-servidor. O sistema é projetado para garantir alta disponibilidade, escalabilidade e segurança, com foco especial na proteção de dados sensíveis.

### Diagrama de Arquitetura
```
+---------------------------+
|                           |
|    Aplicativo iOS Nativo  |
|                           |
+-------------+-------------+
              |
              | HTTPS/WSS
              |
+-------------v-------------+
|                           |
|      API RESTful          |
|                           |
+-------------+-------------+
              |
     +--------+--------+
     |                 |
+----v------+    +-----v-----+
|           |    |           |
| Banco de  |    | Serviços  |
|  Dados    |    |  de IA    |
|           |    |           |
+-----------+    +-----------+
```

### Componentes Principais

#### Frontend (Cliente iOS)
- **Tecnologia**: Swift, SwiftUI, UIKit
- **Responsabilidades**:
  - Interface de usuário nativa
  - Gestão de estado local
  - Comunicação com API backend
  - Armazenamento em cache local
  - Otimizações específicas para iOS
  - Integração com recursos do dispositivo (câmera, microfone, notificações)

#### Backend (Servidor)
- **Tecnologia**: Node.js com Express, TypeScript
- **Responsabilidades**:
  - Autenticação e autorização
  - Lógica de negócios
  - Persistência de dados
  - Integração com serviços externos
  - WebSockets para comunicação em tempo real
  - Orquestração de serviços de IA

#### Banco de Dados
- **Tecnologia**: PostgreSQL
- **Responsabilidades**:
  - Armazenamento de dados do usuário
  - Histórico de diário e análises emocionais
  - Agendamento de sessões
  - Metadados de usuários e terapeutas
  - Registros de atividades para conformidade com LGPD

#### Serviços de IA
- **Tecnologia**: OpenAI GPT-4o
- **Responsabilidades**:
  - Análise de texto para identificação de padrões emocionais
  - Geração de respostas personalizadas pelo assistente Sana
  - Recomendações de conteúdo baseadas no perfil do usuário
  - Análise de tendências emocionais ao longo do tempo

### Fluxo de Dados

#### Autenticação
1. Usuário fornece credenciais no aplicativo iOS
2. Aplicativo envia requisição de autenticação para o backend via HTTPS
3. Backend valida credenciais contra o banco de dados
4. Após validação, o backend gera um token JWT assinado com HMAC
5. Token é retornado ao cliente e armazenado localmente
6. Token é incluído no cabeçalho Authorization de todas as requisições subsequentes

#### Diário Emocional
1. Usuário cria uma entrada no diário através do aplicativo
2. Dados são enviados para o backend via API RESTful
3. Backend armazena a entrada no banco de dados
4. Entrada é enviada para o serviço de IA para análise de sentimento
5. Resultados da análise são armazenados e associados à entrada do diário
6. Insights e recomendações são gerados e retornados ao usuário

#### Videoconferência
1. Usuário inicia uma sessão agendada no aplicativo
2. Backend valida a sessão e cria uma sala virtual através do serviço Twilio
3. Tokens de acesso à sala são gerados pelo backend e enviados ao cliente
4. Aplicativo conecta-se ao serviço Twilio usando WebSockets seguros (WSS)
5. Fluxos de áudio/vídeo são trocados diretamente entre os participantes via Twilio
6. Após a sessão, metadados são armazenados para fins de cobrança e análise

### Segurança e Privacidade

#### Criptografia
- Todas as comunicações utilizam HTTPS/TLS 1.3
- Dados sensíveis são criptografados em repouso no banco de dados
- Videoconferências utilizam criptografia ponto a ponto
- Senhas são armazenadas com hash usando algoritmos seguros (Argon2)

#### Autenticação e Autorização
- Autenticação baseada em tokens JWT com assinatura HMAC
- Tokens têm prazo de validade curto
- Controle de acesso baseado em funções (RBAC)
- Autenticação biométrica (Face ID/Touch ID) opcional no aplicativo

#### Conformidade com LGPD
- Consentimento explícito para coleta e uso de dados
- Registros detalhados de processamento de dados
- Mecanismos para acesso, correção e exclusão de dados pelo usuário
- Minimização de dados e retenção limitada

### Infraestrutura

#### Ambiente de Produção
- Servidor backend: Kubernetes em nuvem
- Banco de dados: PostgreSQL gerenciado com alta disponibilidade
- CDN para distribuição de ativos estáticos
- Sistema de cache distribuído (Redis)
- Balanceadores de carga para distribuição de tráfego

#### Monitoramento e Logs
- Telemetria de aplicativo para detecção de problemas
- Monitoramento de performance do servidor
- Alertas para anomalias ou falhas
- Logs estruturados para auditoria e debugging

## Integrações com Serviços Externos

### OpenAI
- **Propósito**: Análise de texto e interações do assistente virtual
- **API**: GPT-4o para processamento de linguagem natural
- **Fluxo de Dados**: Textos do usuário são enviados à API OpenAI; as respostas são processadas pelo backend antes de serem retornadas ao usuário

### Twilio
- **Propósito**: Videoconferências e mensagens SMS
- **APIs**: Twilio Video para chamadas, Twilio SMS para notificações
- **Fluxo de Dados**: Backend cria salas de vídeo e gera tokens; o cliente se conecta diretamente ao serviço Twilio

### Stripe
- **Propósito**: Processamento de pagamentos
- **API**: Stripe Payment Intents, Stripe Subscriptions
- **Fluxo de Dados**: Pagamentos são processados no cliente usando o SDK do Stripe; o backend gerencia assinaturas e histórico de pagamentos

## Estratégia de Desenvolvimento

### Metodologia
- Desenvolvimento Ágil com sprints de duas semanas
- CI/CD para implantação contínua
- Testes automatizados para componentes críticos
- Code reviews obrigatórios para todas as alterações

### Controle de Versão
- Repositório Git com estratégia de branching GitFlow
- Branches de feature, release e hotfix
- Semântica de versionamento (SemVer) para releases

### Testes
- Testes unitários para lógica de negócios
- Testes de integração para APIs
- Testes E2E para fluxos críticos
- Testes de UI automatizados

## API RESTful

### Base URL
```
https://api.mindwell.com/v1
```

### Endpoints Principais

#### Autenticação
- `POST /auth/login` - Login de usuário
- `POST /auth/register` - Registro de novo usuário
- `POST /auth/refresh` - Renovação de token
- `POST /auth/logout` - Logout de usuário

#### Usuários
- `GET /user` - Obter perfil do usuário autenticado
- `PATCH /user` - Atualizar perfil do usuário
- `GET /user/settings` - Obter configurações do usuário
- `PATCH /user/settings` - Atualizar configurações

#### Diário
- `GET /journal` - Listar entradas do diário
- `POST /journal` - Criar nova entrada
- `GET /journal/:id` - Obter entrada específica
- `PATCH /journal/:id` - Atualizar entrada
- `DELETE /journal/:id` - Excluir entrada

#### Sessões
- `GET /sessions` - Listar sessões agendadas
- `POST /sessions` - Agendar nova sessão
- `GET /sessions/:id` - Obter detalhes da sessão
- `PATCH /sessions/:id` - Atualizar sessão
- `DELETE /sessions/:id` - Cancelar sessão

#### Terapeutas
- `GET /therapists` - Listar terapeutas disponíveis
- `GET /therapists/:id` - Obter perfil do terapeuta
- `GET /therapists/:id/availability` - Verificar disponibilidade

#### Assistente Virtual
- `POST /assistant/message` - Enviar mensagem ao assistente
- `GET /assistant/context` - Obter contexto atual
- `POST /assistant/feedback` - Enviar feedback sobre resposta

### Formatos de Resposta
```json
// Sucesso
{
  "success": true,
  "data": { ... }
}

// Erro
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro",
    "details": { ... }
  }
}
```

### Códigos de Status HTTP
- 200: Requisição bem-sucedida
- 201: Recurso criado com sucesso
- 400: Requisição inválida
- 401: Não autorizado
- 403: Acesso proibido
- 404: Recurso não encontrado
- 422: Entidade não processável
- 500: Erro interno do servidor

## Modelos de Dados

### User (Usuário)
```typescript
interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  profilePicture: string | null;
  bio: string | null;
  preferences: UserPreferences;
  isTherapist: boolean;
  therapistId: number | null;
  createdAt: Date;
}
```

### Therapist (Terapeuta)
```typescript
interface Therapist {
  id: number;
  userId: number;
  specialization: string;
  education: string;
  license: string;
  experience: number;
  hourlyRate: number;
  bio: string;
  availability: TherapistAvailability[];
  rating: number;
  reviewCount: number;
}
```

### JournalEntry (Entrada de Diário)
```typescript
interface JournalEntry {
  id: number;
  userId: number;
  content: string;
  date: Date;
  mood: string;
  category: string | null;
  tags: string[];
  analysis: {
    dominantEmotions: string[];
    sentimentScore: number;
    emotionalTone: string;
    summary: string | null;
    recommendedActions: string[] | null;
  };
}
```

### Session (Sessão)
```typescript
interface Session {
  id: number;
  userId: number;
  therapistId: number;
  scheduledFor: Date;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in-progress';
  type: 'video' | 'audio' | 'text';
  notes: string | null;
  createdAt: Date;
}
```

### EmotionalState (Estado Emocional)
```typescript
interface EmotionalState {
  userId: number;
  currentState: string;
  dominantEmotion: string;
  secondaryEmotions: string[];
  intensity: number;
  trend: 'improving' | 'declining' | 'stable';
  recentTriggers: string[];
  suggestedActions: string[];
  updatedAt: Date;
}
```

## Considerações Técnicas e Trade-offs

### Performance
- Implementação de cache em vários níveis (cliente, API, banco de dados)
- Otimização de consultas ao banco de dados
- Lazy loading de componentes e recursos
- Processamento em segundo plano para tarefas intensivas

### Escalabilidade
- Arquitetura sem estado para permitir escalabilidade horizontal
- Filas para tarefas assíncronas (análise de textos, notificações)
- Sharding de banco de dados planejado para crescimento futuro
- Micro-serviços para funcionalidades específicas

### Offline First
- Sincronização bidireccional de dados importantes
- Armazenamento local de entradas recentes
- Fila de operações para sincronização quando a conexão for restaurada
- Indicadores claros de estado offline para o usuário

### Acessibilidade
- Aderência às diretrizes WCAG 2.1
- Compatibilidade com VoiceOver e outros leitores de tela
- Contraste adequado para deficiências visuais
- Alternativas textuais para conteúdo não-textual

---

*Documentação Técnica do MindWell - Versão 2.5 - Abril 2025*