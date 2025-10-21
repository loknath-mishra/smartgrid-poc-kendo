import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
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
export class AIService implements HttpInterceptor {
  private readonly aiUrl = 'https://framsiktaiapi.openai.azure.com/openai/deployments/gpt-o1/chat/completions?api-version=2024-12-01-preview';
  private readonly aiKey = '4606bf622d804eefa76e13166d25a3a2';

  constructor(private http: HttpClient) {}

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

    const body = {
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for a Kendo UI Grid that helps users analyze and highlight loan application data. 
          
          The grid contains loan applications with the following fields:
          - CustomerName: string (e.g., "Emma Johnson", "Lucas Brown", "Mia Davis")
          - LoanType: string (e.g., "Personal", "Mortgage", "Auto")
          - RiskLevel: string ("High", "Medium", "Low")
          - RequestedAmount: number (loan amount requested)
          - ApplicationStatus: string ("Approved", "Rejected", "Under Review")
          - SubmissionDate: date
          - CreditScore: number (300-850 range)
          
          When users ask to highlight certain data, respond ONLY with a JSON object in this exact format:
          {
            "messages": ["Brief description of what was highlighted"],
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
          
          For clearing highlights, use: {"messages": ["Cleared all highlighting"], "highlight": []}
          
          Examples:
          - "highlight high risk" → {"messages": ["Highlighted high-risk applications"], "highlight": [{"logic": "and", "filters": [{"field": "RiskLevel", "operator": "eq", "value": "High"}], "cells": {}}]}
          - "show rejected loans" → {"messages": ["Highlighted rejected loans"], "highlight": [{"logic": "and", "filters": [{"field": "ApplicationStatus", "operator": "eq", "value": "Rejected"}], "cells": {}}]}
          - "show loans by John Smith" → {"messages": ["Highlighted loans for John Smith"], "highlight": [{"logic": "and", "filters": [{"field": "CustomerName", "operator": "eq", "value": "John Smith"}], "cells": {}}]}
          - "credit score below 600" → {"messages": ["Highlighted low credit scores"], "highlight": [{"logic": "and", "filters": [{"field": "CreditScore", "operator": "lt", "value": 600}], "cells": {}}]}
          
          IMPORTANT: Respond ONLY with the JSON object, no other text.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 500
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
        console.warn('Failed to parse AI response:', content);
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