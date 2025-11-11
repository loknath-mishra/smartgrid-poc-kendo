import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AIService } from './ai.service';

@Injectable({
  providedIn: 'root'
})
export class AIMockService implements HttpInterceptor {
  
  constructor(private aiService: AIService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Intercept requests to our mock AI service
    if (req.url.includes('/api/ai-assistant') || req.url.includes('bypass-interceptor')) {
      console.log('Mock AI Service - Intercepting AI request:', req.body);
      
      try {
        // Extract the prompt from the request body
        const requestBody = req.body;
        let prompt = '';
        
        // Handle different request body structures
        if (requestBody?.contents && Array.isArray(requestBody.contents)) {
          if (requestBody.contents[0] && typeof requestBody.contents[0] === 'object') {
            prompt = requestBody.contents[0].text || requestBody.contents[0].content || '';
          } else {
            prompt = requestBody.contents[0] || '';
          }
        } else if (requestBody?.promptMessage) {
          prompt = requestBody.promptMessage;
        } else if (requestBody?.role === 'user' && requestBody.contents) {
          prompt = requestBody.contents[0] || '';
        } else if (typeof requestBody === 'string') {
          prompt = requestBody;
        }
        
        console.log('Extracted prompt:', prompt);
        
        // Call AI service directly and return simple response
        return new Observable(observer => {
          // Get current grid data from the service - ensure it's up to date
          let currentGridData = this.aiService['_currentGridData'] || [];
          
          // For summary/analysis requests, ensure we have fresh data
          if (prompt.toLowerCase().includes('summary') || prompt.toLowerCase().includes('sammendrag')) {
            console.log('Summary request detected, ensuring fresh grid data');
            // Try to get the most current data if available
            if (window && (window as any).currentGridData) {
              currentGridData = (window as any).currentGridData;
            }
          }
          
          console.log('Using grid data for AI request:', currentGridData.length, 'items');
          console.log('Sample data:', currentGridData.slice(0, 2));
          
          this.aiService.generateGridResponse(prompt, currentGridData)
            .then(response => {
              console.log('AI response from interceptor:', response);
              // Create the simplest possible HTTP response without any headers
              const httpResponse = new HttpResponse({
                body: response,
                status: 200,
                statusText: 'OK',
                url: req.url
              });
              observer.next(httpResponse);
              observer.complete();
            })
            .catch(error => {
              console.error('AI service error:', error);
              // Return a fallback response with context info
              const fallbackResponse = new HttpResponse({
                body: {
                  messages: [`Processing: ${prompt} (${currentGridData.length} templates available)`],
                  highlight: []
                },
                status: 200,
                statusText: 'OK',
                url: req.url
              });
              observer.next(fallbackResponse);
              observer.complete();
            });
        });
      } catch (interceptError) {
        console.error('Interceptor error:', interceptError);
        // Return a fallback response
        return of(new HttpResponse({
          body: {
            messages: ['AI service temporarily unavailable'],
            highlight: []
          },
          status: 200,
          statusText: 'OK',
          url: req.url
        }));
      }
    }
    
    // For all other requests, continue normally
    return next.handle(req);
  }
}