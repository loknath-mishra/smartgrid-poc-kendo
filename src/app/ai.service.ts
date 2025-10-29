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
  private readonly aiUrl = 'https://framsiktaiapi.openai.azure.com/openai/deployments/gpt-o1/chat/completions?api-version=2024-12-01-preview';
  private readonly aiKey = '4606bf622d804eefa76e13166d25a3a2';

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

  private async generateGridResponse(prompt: string): Promise<any> {
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
      max_completion_tokens: 1500
    };

    try {
      const response = await fetch(this.aiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

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
    return `You are an AI assistant for a Kendo UI Grid that helps users analyze, filter, and highlight reporting template data. You support both English and Norwegian languages.
          
          The grid contains reporting templates with the following fields:
          - templateName: string (e.g., "Driftsbudsjett med endringer", "Totalt budsjett")
          - ownerName: string (e.g., "Kathrine Bolsø", "Elin Fejerskov")
          - formattedCreatedDate: string (e.g., "17.09.2025", "06.08.2025")
          - formattedLastUpdatedDate: string (e.g., "25.09.2025", "11.09.2025")
          - isGlobalStringValue: string ("Felles" for global templates)
          - isDocWidgetStringValue: string ("Ja" or "Nei")
          - isLockedStringValue: string ("Låst" for locked, "Åpen" for unlocked)
          - isLocked: boolean (true for locked, false for unlocked)
          - createdOrg: string (e.g., "Asker kommune")
          
          IMPORTANT: Distinguish between "highlight/marker" and "filter/vis/show" requests:
          - "highlight/marker" = visually highlight matching rows (keeps all data visible)
          - "filter/vis/show only" = hide non-matching rows (reduces visible data)
          
          Norwegian Keywords:
          - "marker" = highlight
          - "vis bare" or "vis kun" = show only (filter)
          - "sorter" = sort
          - "grupper" = group
          - "låst/låste" = locked
          - "åpen/åpne" = unlocked
          - "global/globale" = global
          - "felles" = global/shared
          - "maler" = templates
          - "mal" = template
          - "eier" = owner
          - "opprettet" = created
          - "alfabetisk" = alphabetically
          
          When users ask to HIGHLIGHT data (English: "highlight", Norwegian: "marker"), use this format:
          {
            "messages": ["Highlighted [criteria] / Markerte [kriterier]"],
            "highlight": [
              {
                "logic": "and",
                "filters": [
                  {
                    "field": "FieldName",
                    "operator": "eq",
                    "value": "ActualValue"
                  }
                ],
                "cells": {}
              }
            ]
          }
          
          When users ask to sort data (English: "sort", Norwegian: "sorter"), use this format:
          {
            "messages": ["Sorted by [field] [direction] / Sortert etter [felt] [retning]"],
            "sort": [
              {
                "field": "FieldName",
                "dir": "asc" or "desc"
              }
            ]
          }
          
          When users ask to group data (English: "group", Norwegian: "grupper"), use this format:
          {
            "messages": ["Grouped by [field] / Gruppert etter [felt]"],
            "group": [
              {
                "field": "FieldName",
                "dir": "asc" or "desc"
              }
            ]
          }
          
          When users ask to filter data (English: "show only", Norwegian: "vis bare/vis kun"), use this format:
          {
            "messages": ["Filtered to show [criteria] / Filtrert for å vise [kriterier]"],
            "filter": {
              "logic": "and",
              "filters": [
                {
                  "field": "FieldName",
                  "operator": "eq",
                  "value": "ActualValue"
                }
              ]
            }
          }
          
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