import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { Observable } from 'rxjs';
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
export class AIService implements HttpInterceptor {
  private readonly aiUrl = 'https://framsiktaiapi.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview';
  private readonly aiKey = '4606bf622d804eefa76e13166d25a3a2';
  
  // AI Configuration for faster responses
  public readonly aiConfig = {
    requestUrl: '/api/ai-assistant',
    keepOutputHistory: true,
    temperature: 0.3, // Lower temperature for faster, more focused responses
    maxTokens: 800,   // Reduced tokens for faster responses
    timeout: 15000    // 15 second timeout instead of 30
  };

  constructor(private readonly http: HttpClient) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Intercept requests to our mock AI service
    if (req.url.includes('/api/ai-assistant')) {
      console.log('Intercepting AI request:', req.body);
      
      // Extract the prompt from the request body
      const requestBody = req.body;
      let prompt = '';
      
      // Handle different request body structures
      if (requestBody.contents && Array.isArray(requestBody.contents)) {
        // If contents is an array of objects with text property
        if (requestBody.contents[0] && typeof requestBody.contents[0] === 'object') {
          prompt = requestBody.contents[0].text || requestBody.contents[0].content || '';
        } else {
          // If contents is an array of strings
          prompt = requestBody.contents[0] || '';
        }
      } else if (requestBody.promptMessage) {
        prompt = requestBody.promptMessage;
      } else if (requestBody.role === 'user' && requestBody.contents) {
        // Handle the specific structure we see in the logs
        prompt = requestBody.contents[0] || '';
      }
      
      console.log('Extracted prompt:', prompt);
      
      // Generate AI response asynchronously
      return new Observable(observer => {
        this.generateGridResponse(prompt).then(response => {
          observer.next({
            body: response,
            headers: {},
            status: 200,
            statusText: 'OK',
            url: req.url
          });
          observer.complete();
        }).catch(error => {
          console.error('AI generation error:', error);
          observer.next({
            body: {
              messages: [`Processing: ${prompt}`],
              highlight: []
            },
            headers: {},
            status: 200,
            statusText: 'OK',
            url: req.url
          });
          observer.complete();
        });
      });
    }
    
    // For all other requests, continue normally
    return next.handle(req);
  }

  public async generateGridResponse(prompt: string): Promise<any> {
    console.log('Generating AI response for:', prompt);
    
    // Call Azure OpenAI API
    const headers = {
      'api-key': this.aiKey,
      'Content-Type': 'application/json'
    };

    const systemContent = this.getReportingTemplateSystemPrompt();

    const body = {
      messages: [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: this.aiConfig.maxTokens,
      temperature: this.aiConfig.temperature,
      stream: false, // Disable streaming for faster single response
      top_p: 0.95    // Optimize for focused responses
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
      
      try {
        // Try to parse AI response as JSON
        const aiResponse = JSON.parse(content.trim());
        console.log('AI Response:', aiResponse);
        return aiResponse;
      } catch (parseError) {
        console.warn('Failed to parse AI response:', content, parseError);
        return {
          messages: [`AI processed: ${prompt}`],
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
    return `AI for Kendo Grid. English/Norwegian support. Quick JSON responses only.

Fields: templateName, ownerName, formattedCreatedDate, formattedLastUpdatedDate, isGlobalStringValue, isDocWidgetStringValue
, isLockedStringValue ("Låst"/"Åpen"), isLocked (boolean), createdOrg

Commands:
- highlight/marker → {"messages":["Done"], "highlight":[{"logic":"and","filters":[{"field":"isLocked","operator":"eq","value":true}],"cells":{}}]}
- filter/show/vis → {"messages":["Done"], "filter":{"logic":"and","filters":[{"field":"isLocked","operator":"eq","value":true}]}}
- sort/sorter → {"messages":["Done"], "sort":[{"field":"templateName","dir":"asc"}]}
- group/grupper → {"messages":["Done"], "group":[{"field":"ownerName","dir":"asc"}]}

Map: låst=locked, felles=global, maler=templates, eier=owner. Return JSON only.
          
          Examples (English):
          - "highlight locked templates" → {"messages": ["Highlighted locked templates"], "highlight": [{"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}], "cells": {}}]}
          - "show only locked templates" → {"messages": ["Filtered to show locked templates only"], "filter": {"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}]}}
          - "sort by template name alphabetically" → {"messages": ["Sorted templates alphabetically by name"], "sort": [{"field": "templateName", "dir": "asc"}]}
          - "group templates by owner" → {"messages": ["Grouped templates by owner"], "group": [{"field": "ownerName", "dir": "asc"}]}
          
          Examples (Norwegian):
          - "marker låste maler" → {"messages": ["Markerte låste maler"], "highlight": [{"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}], "cells": {}}]}
          - "vis bare låste maler" → {"messages": ["Filtrert for å vise bare låste maler"], "filter": {"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": true}]}}
          - "sorter etter malnavn alfabetisk" → {"messages": ["Sortert maler alfabetisk etter navn"], "sort": [{"field": "templateName", "dir": "asc"}]}
          - "grupper maler etter eier" → {"messages": ["Gruppert maler etter eier"], "group": [{"field": "ownerName", "dir": "asc"}]}
          - "marker felles maler" → {"messages": ["Markerte felles maler"], "highlight": [{"logic": "and", "filters": [{"field": "isGlobalStringValue", "operator": "eq", "value": "Felles"}], "cells": {}}]}
          - "vis kun åpne maler" → {"messages": ["Filtrert for å vise åpne maler"], "filter": {"logic": "and", "filters": [{"field": "isLocked", "operator": "eq", "value": false}]}}
          
          For clearing highlights: {"messages": ["Cleared all highlighting / Fjernet all markering"], "highlight": []}
          For clearing all operations: {"messages": ["Cleared all filters, sorting, and grouping / Fjernet alle filtre, sortering og gruppering"], "sort": [], "group": [], "filter": null, "highlight": []}
          
          Available operators: eq (equals), gt (greater than), lt (less than), gte (greater or equal), lte (less or equal), contains (text contains)
          
          IMPORTANT: Respond ONLY with the JSON object, no other text.`;
  }



  public processGridAIRequest(request: AIRequest): Observable<AIResponse> {
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