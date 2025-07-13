# Guia de Implementação MindWell para Desenvolvedores

## Visão Geral

Este documento serve como guia abrangente para desenvolvedores que trabalham no aplicativo MindWell, detalhando a arquitetura, fluxos de trabalho, padrões de código e processos para garantir a consistência e qualidade do desenvolvimento.

## Arquitetura do Sistema

### Stack Tecnológico

#### Frontend (iOS Nativo)
- **Linguagem**: Swift 5.9+
- **Frameworks**:
  - SwiftUI para interfaces modernas
  - UIKit para componentes complexos
  - Combine para programação reativa
  - Core Data para persistência local

#### Backend
- **Linguagem**: TypeScript 5.0+
- **Runtime**: Node.js 20+
- **Frameworks**:
  - Express.js para API RESTful
  - Socket.io para comunicação em tempo real
  - Drizzle ORM para acesso ao banco de dados
  - Passport.js para autenticação

#### Banco de Dados
- PostgreSQL 15+ como banco de dados principal
- Redis para cache e gerenciamento de sessões

#### Serviços em Nuvem
- AWS para infraestrutura
- OpenAI GPT-4o para processamento de linguagem natural
- Twilio para videoconferência
- Stripe para processamento de pagamentos

### Estrutura de Diretórios

#### Aplicação iOS
```
MindWell/
├── App/
│   ├── AppDelegate.swift
│   └── SceneDelegate.swift
├── Features/
│   ├── Authentication/
│   ├── Journal/
│   ├── TherapySessions/
│   ├── Assistant/
│   └── ...
├── Core/
│   ├── Networking/
│   ├── Storage/
│   ├── UIComponents/
│   └── Utilities/
├── Resources/
│   ├── Assets.xcassets
│   ├── Localizable.strings
│   └── ...
└── Supporting/
    ├── Info.plist
    └── ...
```

#### Backend
```
server/
├── index.ts            # Ponto de entrada
├── routes.ts           # Definição de rotas
├── vite.ts             # Configuração do Vite
├── auth.ts             # Lógica de autenticação
├── storage.ts          # Interface de armazenamento
├── db.ts               # Configuração do banco de dados
├── middlewares/        # Middlewares Express
├── routes/             # Implementações de rotas
├── utils/              # Utilitários
└── validators/         # Validadores de entrada
```

## Fluxos de Trabalho de Desenvolvimento

### Configuração do Ambiente

1. **Requisitos**:
   - Node.js 20+
   - npm 9+
   - PostgreSQL 15+
   - Swift 5.9+ e Xcode 15+ (apenas desenvolvimento iOS)

2. **Instalação do Backend**:
   ```bash
   git clone https://github.com/mindwell-health/mindwell-app.git
   cd mindwell-app
   npm install
   cp .env.example .env
   # Configure as variáveis de ambiente
   npm run dev
   ```

3. **Instalação do Frontend iOS**:
   ```bash
   cd ios
   pod install
   open MindWell.xcworkspace
   ```

### Processo de Desenvolvimento

1. **Fluxo de Trabalho Git**:
   - Branch `main` para código estável
   - Branch `develop` para integrações contínuas
   - Branches de feature nomeadas como `feature/nome-da-funcionalidade`
   - Branches de bugfix nomeadas como `bugfix/nome-do-bug`
   - Pull Requests obrigatórios para todas as mudanças

2. **Ciclo de Desenvolvimento**:
   - Criar branch a partir de `develop`
   - Implementar e testar localmente
   - Escrever/atualizar testes
   - Solicitar Pull Request
   - Code review por pelo menos um desenvolvedor
   - Merge para `develop` após aprovação

3. **Releases**:
   - Criar branch `release/vX.Y.Z` a partir de `develop`
   - Realizar testes finais
   - Merge para `main` e tag com número da versão
   - Merge de volta para `develop`

## Padrões de Código

### TypeScript (Backend)

1. **Estilo de Código**:
   - Espaços, não tabs (2 espaços)
   - Ponto e vírgula no final de cada linha
   - Aspas simples para strings
   - Interface para modelos de dados

2. **Estrutura**:
   - Uso de classes ou funções puras quando apropriado
   - Interface para contratos de serviço
   - Tipagem explícita para parâmetros e retornos

3. **Exemplo**:
   ```typescript
   interface UserRequest {
     username: string;
     email: string;
     password: string;
   }

   class AuthService {
     async registerUser(userData: UserRequest): Promise<User> {
       // Implementação
     }
   }
   ```

### Swift (Frontend iOS)

1. **Estilo de Código**:
   - Espaços, não tabs (4 espaços)
   - Swift Style Guide da Apple como referência
   - Comentários de documentação para APIs públicas

2. **Estrutura**:
   - MVVM (Model-View-ViewModel) como padrão de arquitetura
   - Combine para bindings e fluxos de dados reativos
   - Protocolos para contratos de serviço
   - Injeção de dependência para facilitar testes

3. **Exemplo**:
   ```swift
   struct JournalEntry: Identifiable, Codable {
       let id: UUID
       let content: String
       let mood: String
       let date: Date
       
       // ...
   }

   class JournalViewModel: ObservableObject {
       @Published var entries: [JournalEntry] = []
       private let apiService: APIServiceProtocol
       
       init(apiService: APIServiceProtocol) {
           self.apiService = apiService
       }
       
       func loadEntries() {
           // Implementação
       }
   }
   ```

### API RESTful

1. **Padrões de URL**:
   - Recursos no plural: `/users`, `/journal-entries`
   - Parâmetros de consulta para filtragem e paginação
   - Aninhamento limitado a dois níveis: `/users/:id/sessions`

2. **Respostas**:
   - Formato JSON consistente
   - Códigos HTTP apropriados
   - Envelope de resposta padronizado: `{ success, data, error }`

3. **Versionamento**:
   - Prefixo de versão na URL: `/v1/users`
   - Verificação de compatibilidade no cliente

## Implementação de Funcionalidades Principais

### Autenticação e Autorização

1. **Fluxo de Autenticação**:
   - Login/registro usando API RESTful
   - Tokenização via HMAC para segurança
   - Armazenamento seguro de tokens no Keychain (iOS)
   - Atualização automática de token expirado

2. **Implementação Backend**:
   ```typescript
   // Exemplo simplificado
   app.post('/api/login', async (req, res) => {
     const { username, password } = req.body;
     
     try {
       const user = await storage.getUserByUsername(username);
       if (!user || !(await comparePasswords(password, user.password))) {
         return res.status(401).json({
           success: false,
           error: { message: 'Credenciais inválidas' }
         });
       }
       
       const token = generateToken(user);
       return res.json({
         success: true,
         data: { user, token }
       });
     } catch (error) {
       // Tratamento de erro
     }
   });
   ```

3. **Implementação iOS**:
   ```swift
   func login(username: String, password: String) async throws -> User {
       let credentials = LoginCredentials(username: username, password: password)
       
       let response: APIResponse<AuthResponse> = try await apiClient.post(
           endpoint: "login",
           body: credentials
       )
       
       guard let token = response.data?.token, let user = response.data?.user else {
           throw AuthError.invalidResponse
       }
       
       // Armazenar token no Keychain
       tokenManager.storeToken(token)
       
       return user
   }
   ```

### Diário Emocional

1. **Estrutura de Dados**:
   ```typescript
   interface JournalEntry {
     id: number;
     userId: number;
     content: string;
     mood: string;
     tags: string[];
     createdAt: Date;
     analysis?: {
       sentimentScore: number;
       dominantEmotions: string[];
       summary?: string;
     };
   }
   ```

2. **Fluxo de Processamento**:
   - Usuário cria entrada no aplicativo iOS
   - Dados são enviados para a API backend
   - Backend armazena entrada no banco de dados
   - Tarefa assíncrona envia conteúdo para análise da OpenAI
   - Resultados da análise são armazenados e associados à entrada
   - Cliente recebe notificação de análise completa via WebSocket

3. **Integração com IA**:
   ```typescript
   async function analyzeJournalEntry(entry: JournalEntry): Promise<JournalAnalysis> {
     const prompt = `
       Analise o seguinte texto de diário e identifique:
       1. Emoções dominantes (lista de 1-3 emoções)
       2. Pontuação de sentimento (de -1 a 1)
       3. Resumo curto (3-5 frases)
       
       Texto: "${entry.content}"
       
       Responda em formato JSON com as chaves: dominantEmotions, sentimentScore, summary.
     `;
     
     const completion = await openai.chat.completions.create({
       model: "gpt-4o",
       messages: [
         { role: "system", content: "Você é um assistente especializado em análise emocional." },
         { role: "user", content: prompt }
       ],
       response_format: { type: "json_object" }
     });
     
     return JSON.parse(completion.choices[0].message.content);
   }
   ```

### Assistente Virtual (Sana)

1. **Estrutura de Conversação**:
   ```typescript
   interface ChatMessage {
     id: number;
     userId: number;
     role: 'user' | 'assistant';
     content: string;
     timestamp: Date;
   }
   ```

2. **Fluxo de Interação**:
   - Usuário envia mensagem para o assistente
   - Backend processa a mensagem com dados de contexto
   - IA gera resposta personalizada
   - Resposta é enviada de volta para o cliente
   - Mensagens são armazenadas para continuidade de contexto

3. **Gestão de Contexto**:
   - Histórico recente de mensagens
   - Estado emocional atual do usuário
   - Entradas recentes do diário (quando relevante)
   - Preferências do usuário
   - Sessões recentes com terapeutas

4. **Implementação de Prompts**:
   ```typescript
   async function generateAssistantResponse(userId: number, messageContent: string): Promise<string> {
     // Obter informações contextuais
     const user = await storage.getUser(userId);
     const recentMessages = await storage.getChatMessagesByUser(userId, 10);
     const emotionalState = await storage.getEmotionalState(userId);
     const lastJournalEntry = await storage.getLastJournalEntry(userId);
     
     // Estruturar prompt com informações contextuais
     const systemPrompt = `
       Você é Sana, uma assistente de bem-estar emocional empática e solidária.
       Dados do usuário:
       - Nome: ${user.firstName}
       - Estado emocional atual: ${emotionalState?.currentState || 'desconhecido'}
       - Emoção dominante: ${emotionalState?.dominantEmotion || 'desconhecida'}
       
       Diretrizes:
       1. Seja empática e compreensiva
       2. Forneça suporte emocional e validação
       3. Sugira estratégias de enfrentamento baseadas em evidências
       4. Evite diagnósticos médicos ou psicológicos
       5. Encoraje a busca por ajuda profissional quando necessário
       6. Responda em português do Brasil com tom acolhedor e respeitoso
     `;
     
     // Preparar histórico de mensagens
     const messages = [
       { role: "system", content: systemPrompt },
       ...recentMessages.map(msg => ({
         role: msg.role as 'user' | 'assistant',
         content: msg.content
       })),
       { role: "user", content: messageContent }
     ];
     
     // Fazer chamada à API
     const completion = await openai.chat.completions.create({
       model: "gpt-4o",
       messages,
       temperature: 0.7,
       max_tokens: 500
     });
     
     return completion.choices[0].message.content;
   }
   ```

### Sessões com Terapeutas

1. **Agendamento**:
   - Usuário solicita disponibilidade do terapeuta
   - Backend verifica slots disponíveis
   - Usuário seleciona horário e confirma
   - Backend reserva o slot e notifica o terapeuta
   - Pagamento/débito de crédito processado
   - Sessão é confirmada e adicionada aos calendários

2. **Videoconferência**:
   - Backend cria sala Twilio para a sessão
   - Tokens de acesso são gerados para ambos os participantes
   - Cliente se conecta usando SDK Twilio Video
   - Metadados da sessão são atualizados em tempo real
   - Após a sessão, terapeuta pode adicionar notas

3. **Implementação de Sala Virtual**:
   ```typescript
   async function createVideoRoom(sessionId: number): Promise<VideoRoomCredentials> {
     const session = await storage.getSession(sessionId);
     
     if (!session) {
       throw new Error('Sessão não encontrada');
     }
     
     // Criar sala Twilio
     const room = await twilioClient.video.rooms.create({
       uniqueName: `mindwell-session-${sessionId}`,
       type: 'group',
       statusCallback: `${config.apiBaseUrl}/webhooks/twilio/room-status`
     });
     
     // Gerar tokens para participantes
     const patientToken = await twilioClient.tokens.create({
       identity: `patient-${session.userId}`,
       room: room.uniqueName
     });
     
     const therapistToken = await twilioClient.tokens.create({
       identity: `therapist-${session.therapistId}`,
       room: room.uniqueName
     });
     
     // Atualizar status da sessão
     await storage.updateSession(sessionId, { status: 'in-progress', roomSid: room.sid });
     
     // Retornar credenciais
     return {
       roomSid: room.sid,
       roomName: room.uniqueName,
       patientToken: patientToken.token,
       therapistToken: therapistToken.token,
       expiresAt: new Date(Date.now() + 3600000) // 1 hora
     };
   }
   ```

## Otimizações e Melhores Práticas

### Performance

1. **Servidor**:
   - Implementação de cache em vários níveis
   - Processamento assíncrono de tarefas demoradas
   - Agrupamento de consultas ao banco de dados
   - Validação e transformação eficiente de dados

2. **Cliente iOS**:
   - Carregamento lazy de recursos e imagens
   - Cache local para dados frequentemente acessados
   - Renderização otimizada de listas longas
   - Gestão eficiente de ciclo de vida de views

### Segurança

1. **Autenticação e Autorização**:
   - Tokens JWT com HMAC para autenticação
   - Verificação de permissões baseada em função
   - Sanitização de todas as entradas do usuário
   - Proteção contra ataques comuns (XSS, CSRF, injeção SQL)

2. **Dados Sensíveis**:
   - Criptografia em trânsito (TLS) e em repouso
   - Armazenamento seguro de credenciais (Keychain no iOS)
   - Mascaramento de informações sensíveis nos logs
   - Política de acesso mínimo necessário

### Testabilidade

1. **Testes Unitários**:
   - Cobertura mínima de 80% para lógica de negócios
   - Mocking de dependências externas
   - Testes isolados e determinísticos
   - Execução automatizada no CI/CD

2. **Testes de Integração**:
   - API testing completo para endpoints críticos
   - Testes de fluxos de usuário end-to-end
   - Simulação de condições de erro e latência

3. **Testes de UI**:
   - Testes automatizados de componentes de UI
   - Testes de acessibilidade
   - Validação de comportamento em diferentes tamanhos de tela

## Monitoramento e Diagnóstico

### Logging

1. **Estrutura de Logs**:
   - Formato JSON estruturado
   - Níveis de log (DEBUG, INFO, WARN, ERROR)
   - Contexto consistente (userId, requestId, etc.)
   - Filtragem sensível de dados pessoais

2. **Exemplo de Implementação**:
   ```typescript
   const logger = {
     info: (message: string, context?: Record<string, any>) => {
       console.log(JSON.stringify({
         level: 'INFO',
         timestamp: new Date().toISOString(),
         message,
         ...sanitizeContext(context)
       }));
     },
     // Similar para debug, warn, error
   };
   
   function sanitizeContext(context?: Record<string, any>): Record<string, any> {
     if (!context) return {};
     const result = { ...context };
     
     // Mascarar dados sensíveis
     if (result.password) result.password = '***';
     if (result.token) result.token = '***';
     // Etc.
     
     return result;
   }
   ```

### Métricas

1. **Métricas Chave**:
   - Tempo de resposta da API (p50, p95, p99)
   - Taxa de erro por endpoint
   - Utilização de recursos (CPU, memória, IO)
   - Métricas de negócio (usuários ativos, novas contas, sessões)

2. **Alertas**:
   - Taxa de erro acima de limiares específicos
   - Tempo de resposta degradado
   - Falhas de autenticação anômalas
   - Eventos críticos de negócio

## Processo de Atualização e Manutenção

### Atualizações de Backend

1. **Estratégia de Implantação**:
   - Implantações blue/green para mitigar riscos
   - Migrations de banco de dados sem tempo de inatividade
   - Rollback automatizado em caso de falha
   - Monitoramento pós-implantação

2. **Ciclo de Manutenção**:
   - Janelas semanais para atualizações planejadas
   - Atualizações de segurança com prioridade
   - Testes de regressão antes da implantação
   - Comunicação proativa com a equipe de produto

### Atualizações de Cliente iOS

1. **Estratégia de Lançamento**:
   - Lançamentos graduais para grupos de usuários (TestFlight)
   - Monitoramento de métricas de crash e ANR
   - Estratégia de versão mínima de iOS suportada
   - Compatibilidade retroativa com versões anteriores da API

2. **Ciclo de Atualização**:
   - Releases principais a cada 4-6 semanas
   - Hotfixes conforme necessário
   - Conformidade contínua com diretrizes da App Store

## Recursos e Documentação

### Recursos de Desenvolvimento

- Repositório Git: `https://github.com/mindwell-health/mindwell-app`
- Documentação da API: `https://api.mindwell.com/docs`
- Wireframes e Designs: Figma (`https://figma.com/team/mindwell`)
- Backlog e Issues: JIRA (`https://mindwell.atlassian.net`)

### Contatos

- Tech Lead: `techlead@mindwell.com.br`
- Equipe de Backend: `backend@mindwell.com.br`
- Equipe de iOS: `ios@mindwell.com.br`
- DevOps: `devops@mindwell.com.br`

---

*Este guia está sujeito a revisões e atualizações contínuas. Última atualização: 25 de abril de 2025.*