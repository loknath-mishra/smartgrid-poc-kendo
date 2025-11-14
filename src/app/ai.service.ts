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
  // ChatGPT-5 Azure OpenAI endpoint
  private readonly aiUrl = 'https://FramsiktAIAPI.openai.azure.com/openai/v1/chat/completions';
  private readonly aiKey = 'eab2a69c0ca64af1aac5584eeab0907b';
  
  public readonly aiConfig = {
    requestUrl: '/api/ai-assistant',
    keepOutputHistory: true,
    maxTokens: 10000,   // Increased tokens for full data analysis responses
    model: 'gpt-5-mini',   
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
    else if(gridData && prompt.toLowerCase().includes('gridlookup:')) {
      console.log('Data query request detected, building data query prompt');
      console.log('Grid data size for query:', gridData.length);
      console.log('Sample data for query:', gridData.slice(0, 2));
      enhancedPrompt = this.buildDataQueryPrompt(prompt, gridData);
    }

    const body = {
      model: 'gpt-5-mini',
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
      stream: false // Disable streaming for faster single response
    };

    try {
      const controller = new AbortController();
      const response = await fetch(this.aiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
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
    return `You are an AI assistant EXCLUSIVELY for a Kendo Grid with reporting templates. You MUST ONLY respond to questions and requests related to the grid data, filtering, highlighting, sorting, grouping, and analysis of the reporting templates.

STRICT RULES:
- ONLY answer questions about the Kendo Grid data and reporting templates
- REFUSE to answer any questions unrelated to the grid (like "what is a cat?", general knowledge, etc.)
- If asked about non-grid topics, respond with: "I can only help with questions about the reporting templates grid. Please ask about the data, filtering, highlighting, or analysis of the templates."

WHAT I CAN HELP WITH:
- Grid operations: highlighting, filtering, sorting, grouping templates
- Data analysis: summaries, statistics, trends in the template data
- Questions about specific templates: owners, dates, status, properties
- Comparisons and patterns in the reporting template data

RESPONSE FORMATS:
- For GRID OPERATIONS (highlight, filter, sort, group): Return JSON only
- For QUESTIONS about the templates: Return natural language text
- For SUMMARY/ANALYSIS of template data: Return natural language with statistics

Fields available: templateName, ownerName, formattedCreatedDate, formattedLastUpdatedDate, isGlobalStringValue, isDocWidgetStringValue, isLockedStringValue ("Låst"/"Åpen"), isLocked (boolean), createdOrg, previousYearActuals, currentYearBudget, currentYearActuals, currentYearDeviation

GRID OPERATIONS (return JSON):
Examples:
- "highlight locked templates" → {"messages": ["Highlighted locked templates"], "highlight": [{"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}], "cells": {}}]}
- "show templates by Loknath Mishra" → {"messages": ["Filtered templates by Loknath Mishra"], "filter": {"logic": "and", "filters": [{"field": "ownerName", "operator": "eq", "value": "Loknath Mishra"}]}}
- "sort by template name" → {"messages": ["Sorted by template name"], "sort": [{"field": "templateName", "dir": "asc"}]}

QUESTIONS ABOUT TEMPLATES (return natural text):
- "Who owns the most templates?"
- "What is template 1198?"
- "Analyze template distribution by owner"
- "Show budget trends"

REFUSE NON-GRID QUESTIONS:
- "What is a cat?" → "I can only help with questions about the reporting templates grid..."
- "Tell me about the weather" → "I can only help with questions about the reporting templates grid..."
- Any question not related to the grid data → Standard refusal message

Available operators: eq, gt, lt, gte, lte, contains`;
  }

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

  private buildDataQueryPrompt(prompt: string, gridData: any[]): string {
    if (!gridData || gridData.length === 0) {
      return prompt + "\n\nNote: No grid data available for query.";
    }

    const dataQueryPrompt = `
    ${prompt}
      Please analyze the following reporting template data and provide answer the questions related to it:
    GRID DATA (${gridData.length} templates):
    ${JSON.stringify(gridData, null, 2)}
    Respond in natural language with clear and accurate information`;
    return dataQueryPrompt;
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
      model: 'gpt-5-mini'
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