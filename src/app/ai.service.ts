import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
    maxTokens: 2000,   // Increased tokens for GPT-4o's detailed responses
    timeout: 30000,    // 30 second timeout for GPT-4o's processing time
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
    
    // Enhance prompt with grid data context for summary/analysis requests
    let enhancedPrompt = prompt;
    if (gridData && this.isSummaryOrAnalysisRequest(prompt)) {
      enhancedPrompt = this.buildDataContextPrompt(prompt, gridData);
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
For requests like "summary", "overview", "statistics", "analyze", provide comprehensive insights including:
- Total number of templates
- Distribution by status (locked vs unlocked)
- Distribution by access rights (global vs restricted)
- Top organizations/owners
- Recent activity patterns
- Key insights and recommendations

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
   * Build enhanced prompt with grid data context for summary/analysis requests
   */
  private buildDataContextPrompt(prompt: string, gridData: any[]): string {
    if (!gridData || gridData.length === 0) {
      return prompt + "\n\nNote: No grid data available for analysis.";
    }

    // Calculate basic statistics
    const stats = this.calculateGridStatistics(gridData);
    
    const dataContext = `
    ${prompt}

    Current Grid Data Context:
    - Total templates: ${stats.totalTemplates}
    - Locked templates: ${stats.lockedCount} (${stats.lockedPercentage}%)
    - Unlocked templates: ${stats.unlockedCount} (${stats.unlockedPercentage}%)
    - Global access templates: ${stats.globalCount}
    - Restricted access templates: ${stats.restrictedCount}
    - Organizations represented: ${stats.organizationCount}
    - Top organizations: ${stats.topOrganizations.join(', ')}
    - Template owners: ${stats.ownerCount}
    - Top owners: ${stats.topOwners.join(', ')}
    
    Please provide a comprehensive analysis based on this data.`;

    return dataContext;
  }

  /**
   * Calculate statistics from grid data
   */
  private calculateGridStatistics(gridData: any[]): any {
    const totalTemplates = gridData.length;
    const lockedCount = gridData.filter(item => item.isLocked === true).length;
    const unlockedCount = totalTemplates - lockedCount;
    const globalCount = gridData.filter(item => 
      item.isGlobalStringValue && item.isGlobalStringValue.toLowerCase().includes('global') ||
      item.isGlobalStringValue && item.isGlobalStringValue.toLowerCase().includes('felles')
    ).length;
    const restrictedCount = totalTemplates - globalCount;
    
    // Get unique organizations and owners
    const organizations = [...new Set(gridData.map(item => item.createdOrg).filter(Boolean))];
    const owners = [...new Set(gridData.map(item => item.ownerName).filter(Boolean))];
    
    // Get top organizations by template count
    const orgCounts = gridData.reduce((acc: any, item) => {
      if (item.createdOrg) {
        acc[item.createdOrg] = (acc[item.createdOrg] || 0) + 1;
      }
      return acc;
    }, {});
    const topOrganizations = Object.entries(orgCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 3)
      .map(([org]: any) => org);
    
    // Get top owners by template count
    const ownerCounts = gridData.reduce((acc: any, item) => {
      if (item.ownerName) {
        acc[item.ownerName] = (acc[item.ownerName] || 0) + 1;
      }
      return acc;
    }, {});
    const topOwners = Object.entries(ownerCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 3)
      .map(([owner]: any) => owner);

    return {
      totalTemplates,
      lockedCount,
      unlockedCount,
      lockedPercentage: Math.round((lockedCount / totalTemplates) * 100),
      unlockedPercentage: Math.round((unlockedCount / totalTemplates) * 100),
      globalCount,
      restrictedCount,
      organizationCount: organizations.length,
      ownerCount: owners.length,
      topOrganizations,
      topOwners
    };
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