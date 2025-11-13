import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AIRequest {
  prompt: string;
  gridData?: any[];
  context?: any;
}

export interface AIResponse {
  result: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  // Try different deployment names - update this based on your actual Azure OpenAI deployments
  private readonly aiUrl = 'https://framsiktaiapi.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview';
  private readonly aiKey = '4606bf622d804eefa76e13166d25a3a2';
  
  // AI Configuration optimized for GPT-4o (GPT-4 Omni)
  public readonly aiConfig = {
    requestUrl: '/api/ai-assistant',
    keepOutputHistory: true,
    maxTokens: 4000,   // Increased tokens for full data analysis responses
    timeout: 45000,    // 45 second timeout for complex data analysis
    temperature: 0.3,  // Lower temperature for more consistent grid operations
    model: 'gpt-4o',   // GPT-4 Omni - most recent and capable model
    enabled: true      // AI feature toggle - can be controlled externally
  };

  // AI feature state management
  private _aiEnabled: boolean = true;
  private _currentGridData: any[] = [];

  /**
   * Get current AI enabled state
   */
  public get isAIEnabled(): boolean {
    return this._aiEnabled && this.aiConfig.enabled;
  }

  /**
   * Enable or disable AI functionality
   */
  public setAIEnabled(enabled: boolean): void {
    this._aiEnabled = enabled;
    console.log(`AI functionality ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle AI functionality on/off
   */
  public toggleAI(): boolean {
    this._aiEnabled = !this._aiEnabled;
    console.log(`AI functionality ${this._aiEnabled ? 'enabled' : 'disabled'}`);
    return this._aiEnabled;
  }

  /**
   * Set current grid data for AI context
   */
  public setCurrentGridData(gridData: any[]): void {
    this._currentGridData = gridData || [];
    console.log(`Grid data context updated: ${this._currentGridData.length} items`);
  }

  constructor(private readonly http: HttpClient) {}

  /**
   * Direct AI request handler that bypasses HTTP interceptor issues
   * This method avoids all header-related problems by working directly
   */
  public handleAIRequestDirect(prompt: string): Observable<any> {
    console.log('Handling AI request directly (no interceptor):', prompt);
    
    // Check if AI is enabled
    if (!this.isAIEnabled) {
      return of({
        messages: ['AI assistant is currently disabled. Please enable it to use AI features.'],
        highlight: [],
        disabled: true
      });
    }

    // Generate AI response directly and return as Observable
    return new Observable(observer => {
      this.generateGridResponse(prompt, this._currentGridData)
        .then(response => {
          observer.next(response);
          observer.complete();
        })
        .catch(error => {
          console.error('AI generation error:', error);
          observer.next({
            messages: [`Processing: ${prompt}`],
            highlight: []
          });
          observer.complete();
        });
    });
  }

  /**
   * Create a direct AI endpoint that bypasses interceptor issues
   * This method handles requests directly to avoid headers.has problems
   */
  public createDirectAIEndpoint(): void {
    // Create a global function that the Kendo component can call directly
    (window as any).aiAssistantDirect = async (request: any) => {
      console.log('Direct AI endpoint called with:', request);
      
      let prompt = '';
      if (request.contents && Array.isArray(request.contents)) {
        prompt = request.contents[0]?.text || request.contents[0]?.content || request.contents[0] || '';
      } else if (request.promptMessage) {
        prompt = request.promptMessage;
      } else if (typeof request === 'string') {
        prompt = request;
      }

      try {
        const response = await this.generateGridResponse(prompt, this._currentGridData);
        return response;
      } catch (error) {
        console.error('Direct AI endpoint error:', error);
        return {
          messages: [`Processing: ${prompt}`],
          highlight: []
        };
      }
    };

    // Also create the mock endpoint for compatibility
    (window as any).aiAssistantMock = (window as any).aiAssistantDirect;
  }

  public async generateGridResponse(prompt: string, gridData?: any[]): Promise<any> {
    console.log('Generating AI response for:', prompt);
    
    // Check if AI is enabled
    if (!this.isAIEnabled) {
      console.log('AI is disabled, returning disabled message');
      return {
        messages: ['AI assistant is currently disabled. Please enable it to use AI features.'],
        highlight: [],
        disabled: true
      };
    }
    
    // Call Azure OpenAI API - Use plain object for fetch headers
    const headers = {
      'api-key': this.aiKey,
      'Content-Type': 'application/json'
    };

    const systemContent = this.getReportingTemplateSystemPrompt();
    
    // For summary/analysis requests, send full grid data to LLM
    let enhancedPrompt = prompt;
    if (gridData && this.isSummaryOrAnalysisRequest(prompt)) {
      enhancedPrompt = this.buildFullDataPrompt(prompt, gridData);
    }

    const body = {
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      max_completion_tokens: this.aiConfig.maxTokens,
      temperature: this.aiConfig.temperature,
      stream: false // Disable streaming for faster single response
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.aiConfig.timeout);

      const response = await fetch(this.aiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      console.log('Raw AI Response:', content);
      
      // Check if the response is JSON (for grid operations) or text (for questions)
      try {
        const aiResponse = JSON.parse(content.trim());
        console.log('Parsed JSON AI Response:', aiResponse);
        return aiResponse;
      } catch (parseError) {
        // If not JSON, treat as natural language response (for questions)
        console.log('Natural language AI Response:', content);
        return {
          messages: [content.trim()],
          highlight: []
        };
      }
    } catch (error) {
      console.error('Azure OpenAI API error:', error);
      return {
        messages: [`Processing: ${prompt}`],
        highlight: []
      };
    }
  }

  private getReportingTemplateSystemPrompt(): string {
    return `You are an AI assistant for a Kendo Grid with reporting templates. Support English/Norwegian.

IMPORTANT: 
- For GRID OPERATIONS (highlight, filter, sort, group): Return JSON only
- For QUESTIONS (who, what, when, explain, analyze): Return natural language text
- For SUMMARY/ANALYSIS requests: Return natural language with statistics and insights

Fields: templateName, ownerName, formattedCreatedDate, formattedLastUpdatedDate, isGlobalStringValue, isDocWidgetStringValue, isLockedStringValue ("Låst"/"Åpen"), isLocked (boolean), createdOrg

GRID OPERATIONS (return JSON):
- highlight/marker → {"messages":["Done"], "highlight":[{"logic":"and","filters":[{"field":"isLocked","operator":"eq","value":true}],"cells":{}}]}
- filter/show/vis → {"messages":["Done"], "filter":{"logic":"and","filters":[{"field":"isLocked","operator":"eq","value":true}]}}
- sort/sorter → {"messages":["Done"], "sort":[{"field":"templateName","dir":"asc"}]}
- group/grupper → {"messages":["Done"], "group":[{"field":"ownerName","dir":"asc"}]}

SUMMARY/ANALYSIS REQUESTS (return natural text):
For requests like "summary", "overview", "statistics", "analyze", when full grid data is provided, analyze the complete dataset and provide comprehensive insights including:
- Statistical analysis of all templates
- Distribution patterns by status, ownership, organizations
- Temporal patterns in creation and updates
- Access rights and security analysis
- Template usage patterns and trends
- Data quality observations
- Actionable recommendations and insights
- Any anomalies or notable patterns discovered

QUESTIONS (return natural text):
For questions like "who is the owner?", "what is this template?", "analyze this template" - provide helpful natural language responses using the template data provided in the user message.

Map: låst=locked, felles=global, maler=templates, eier=owner, sammendrag=summary, oversikt=overview, statistikk=statistics.
          
          Examples (English):
          - "highlight locked templates" → {"messages": ["Highlighted locked templates"], "highlight": [{"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}], "cells": {}}]}
          - "show only locked templates" → {"messages": ["Filtered to show locked templates only"], "filter": {"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}]}}
          - "sort by template name alphabetically" → {"messages": ["Sorted templates alphabetically by name"], "sort": [{"field": "templateName", "dir": "asc"}]}
          - "group templates by owner" → {"messages": ["Grouped templates by owner"], "group": [{"field": "ownerName", "dir": "asc"}]}
          - "provide a summary" → Natural language summary with statistics and insights
          - "analyze template distribution" → Natural language analysis with breakdowns and trends
          
          Examples (Norwegian):
          - "marker låste maler" → {"messages": ["Markerte låste maler"], "highlight": [{"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}], "cells": {}}]}
          - "vis bare låste maler" → {"messages": ["Filtrert for å vise bare låste maler"], "filter": {"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}]}}
          - "sorter etter malnavn alfabetisk" → {"messages": ["Sortert maler alfabetisk etter navn"], "sort": [{"field": "templateName", "dir": "asc"}]}
          - "grupper maler etter eier" → {"messages": ["Gruppert maler etter eier"], "group": [{"field": "ownerName", "dir": "asc"}]}
          - "marker felles maler" → {"messages": ["Markerte felles maler"], "highlight": [{"logic": "and", "filters": [{"field": "isGlobalStringValue", "operator": "eq", "value": "Felles"}], "cells": {}}]}
          - "vis kun åpne maler" → {"messages": ["Filtrert for å vise åpne maler"], "filter": {"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": false}]}}
          - "gi meg en sammendrag" → Naturlig språk sammendrag med statistikk og innsikt
          - "analyser malfordeling" → Naturlig språk analyse med oppdelinger og trender
          
          For clearing highlights: {"messages": ["Cleared all highlighting / Fjernet all markering"], "highlight": []}
          For clearing all operations: {"messages": ["Cleared all filters, sorting, and grouping / Fjernet alle filtre, sortering og gruppering"], "sort": [], "group": [], "filter": null, "highlight": []}
          
          Available operators: eq (equals), gt (greater than), lt (less than), gte (greater or equal), lte (less or equal), contains (text contains)
          
          IMPORTANT: 
          - For grid operations (highlight, filter, sort, group): Respond ONLY with the JSON object, no other text
          - For summaries, analysis, and questions: Respond with natural language text`;
  }

  /**
   * Check if the prompt is requesting a summary or analysis
   */
  private isSummaryOrAnalysisRequest(prompt: string): boolean {
    const summaryKeywords = [
      'summary', 'sammendrag', 'overview', 'oversikt', 'statistics', 'statistikk',
      'analyze', 'analyser', 'analysis', 'analyse', 'breakdown', 'distribution',
      'fordeling', 'overall', 'totalt', 'info', 'information', 'insight', 'innsikt'
    ];
    
    const lowercasePrompt = prompt.toLowerCase();
    return summaryKeywords.some(keyword => lowercasePrompt.includes(keyword));
  }

  /**
   * Build enhanced prompt with full grid data for LLM analysis
   */
  private buildFullDataPrompt(prompt: string, gridData: any[]): string {
    if (!gridData || gridData.length === 0) {
      return prompt + "\n\nNote: No grid data available for analysis.";
    }

    // Send the complete grid data to LLM for analysis
    const fullDataPrompt = `
    ${prompt}

    Please analyze the following reporting template data and provide comprehensive insights:

    GRID DATA (${gridData.length} templates):
    ${JSON.stringify(gridData, null, 2)}

    Please provide a detailed analysis including:
    - Overall statistics and distribution patterns
    - Key insights about template usage and ownership
    - Status breakdown (locked vs unlocked templates)
    - Access rights distribution (global vs restricted)
    - Organizational patterns and top contributors
    - Recent activity trends
    - Any notable patterns or recommendations
    - Budget data insights for last year for each owners, along with sum of all templates for last year actuals per owners
    - Budget data insights for current year actual data for each owners, along with sum of all templates for current year actuals per owners
    - Budget data insights for current year budget data for each owners, along with sum of all templates for current year budget per owners
    - Budget data insights for current year deviation data for each owners, along with sum of all templates for current year deviation per owners

    Respond in natural language with clear, actionable insights.`;

    return fullDataPrompt;
  }





  public processGridAIRequest(request: AIRequest): Observable<AIResponse> {
    // Check if AI is enabled
    if (!this.isAIEnabled) {
      console.log('AI is disabled, returning disabled response');
      return new Observable(observer => {
        observer.next({
          result: 'AI assistant is currently disabled. Please enable it to use AI features.',
          success: false
        });
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      'api-key': this.aiKey,
      'Content-Type': 'application/json'
    });

    const body = {
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for a Kendo UI Grid that helps users analyze and highlight loan application data.`
        },
        {
          role: 'user',
          content: `Grid Data Context: ${JSON.stringify(request.gridData)}
                   
                   User Request: ${request.prompt}
                   
                   Please provide JavaScript code to highlight the relevant grid rows based on the user's request.`
        }
      ],
      max_completion_tokens: 1000
    };

    return this.http.post<any>(this.aiUrl, body, { headers }).pipe(
      map(response => {
        try {
          const content = response.choices?.[0]?.message?.content || '';
          return {
            result: content,
            success: true
          };
        } catch (error) {
          console.error('Error processing AI response:', error);
          return {
            result: 'Error processing AI response',
            success: false
          };
        }
      })
    );
  }
}