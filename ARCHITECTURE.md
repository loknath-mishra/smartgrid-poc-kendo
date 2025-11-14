# Kendo Grid AI Assistant - Architecture Overview

## System Architecture

This application implements an intelligent Kendo UI Grid with AI-powered assistance for analyzing and manipulating reporting template data.

## Layer Architecture

### 1. User Interface Layer
- **App Component** (`app.component.ts`)
  - Main Angular standalone component managing the entire application
  - Contains and orchestrates all child components and directives
  - Handles user interactions and event coordination
  - Manages grid state and highlighting logic
  - **Contains within it:**
    - **Kendo Grid**: Data visualization with highlighting and filtering
    - **AI Toolbar**: Integrated AI Assistant button and prompt interface
    - **Event Handlers**: Methods like `onPromptRequest`, `onResponseSuccess`
    - **Data Interface**: Direct access to reporting template data

- **Reporting Data** (`highlight-data.ts`)
  - Template data structure definitions (interfaces)
  - Sample reporting template data (exported arrays)  
  - Type definitions for grid items
  - Used by the App Component for data binding

### 2. Service Layer
- **AI Service** (`ai.service.ts`)
  - **Unified Service**: Combines AI logic and HTTP interceptor functionality
  - Core AI request processing and Azure OpenAI communication
  - HTTP interceptor for `/api/ai-assistant` requests
  - Response parsing and grid operation generation
  - Context management and state handling
  - Error handling with graceful fallbacks

- **HTTP Client**
  - Angular HTTP client for external API communication
  - Request/response handling for Azure OpenAI
  - Error management and retry logic

- **Angular Services**
  - Dependency injection system
  - Service providers and configuration
  - Application-wide state management

### 3. External API Layer
- **Azure OpenAI ChatGPT-5**
  - Endpoint: `https://FramsiktAIAPI.openai.azure.com/openai/v1/chat/completions`
  - Natural language processing
  - Grid operation generation
  - Intelligent response generation
  - Restricted to grid-related queries only

### 4. Data Processing Layer
- **Response Parser**
  - Processes AI responses into grid operations
  - JSON parsing and validation
  - Error handling and fallback logic

- **Filter Engine**
  - Converts AI responses to grid filters
  - Highlighting logic implementation
  - Data matching algorithms

- **Context Manager**
  - Maintains grid data context for AI
  - State management for AI interactions
  - Session persistence and cleanup

## Data Flow

1. **User Input**: User enters natural language query in AI toolbar
2. **Request Processing**: AI Service intercepts and processes the request
3. **API Call**: HTTP request sent to Azure OpenAI ChatGPT-5
4. **AI Processing**: ChatGPT-5 analyzes query and generates grid operations
5. **Response Parsing**: AI Service parses JSON response into grid actions
6. **Grid Operations**: Highlighting, filtering, sorting, or grouping applied
7. **Visual Feedback**: Grid updates with visual changes and user messages

## Key Components

### AI Service Features
- **Unified Architecture**: Single service handling both AI logic and HTTP interception
- **HTTP Interceptor**: Intercepts `/api/ai-assistant` requests automatically
- **Prompt Restriction**: Only answers grid-related queries
- **Response Generation**: Creates JSON for grid operations
- **Context Awareness**: Understands current grid data state
- **Error Handling**: Graceful fallbacks for failed requests
- **Azure OpenAI Integration**: Direct communication with ChatGPT-5

### Grid Integration
- **Highlight System**: Real-time row highlighting based on AI responses
- **Filter Application**: Dynamic filtering using AI-generated criteria
- **Sort/Group Operations**: AI-driven data organization
- **Event Handling**: Seamless integration between AI and grid events

### Security & Restrictions
- **Query Filtering**: Rejects non-grid related questions
- **API Key Management**: Secure Azure OpenAI authentication
- **Response Validation**: Ensures safe grid operations
- **Context Isolation**: Limits AI access to grid data only

## Technology Stack

- **Frontend Framework**: Angular 18+ (Standalone Components)
- **UI Library**: Kendo UI for Angular
- **Language**: TypeScript with strict typing
- **HTTP Handling**: Angular HTTP Client with RxJS
- **AI Integration**: Azure OpenAI ChatGPT-5
- **State Management**: Angular services and dependency injection
- **Data Format**: JSON for grid operations and responses

## Configuration

### AI Model Settings
```typescript
{
  endpoint: 'https://FramsiktAIAPI.openai.azure.com/openai/v1/chat/completions',
  model: 'chatgpt-5',
  maxTokens: 10000,
  timeout: 60000
}
```

### Grid Configuration
```typescript
{
  highlighting: true,
  aiAssistant: true,
  requestUrl: '/api/ai-assistant',
  keepOutputHistory: true
}
```

## Scalability Considerations

- **Modular Architecture**: Clear separation of concerns
- **Service-Based Design**: Easy to extend and modify
- **Configurable AI**: Can switch models or endpoints
- **Type Safety**: Full TypeScript support for maintainability
- **Error Resilience**: Multiple fallback strategies
- **Performance Optimized**: Efficient data processing and caching

## Future Enhancements

- **Multiple Data Sources**: Support for different grid data types
- **Advanced AI Features**: More complex query understanding
- **User Customization**: Personalized AI responses
- **Offline Capabilities**: Local AI processing fallbacks
- **Analytics Integration**: Usage tracking and optimization