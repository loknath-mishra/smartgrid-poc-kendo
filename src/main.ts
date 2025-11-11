
/// <reference types="@angular/localize" />

import '@angular/localize/init';
import './polyfills';

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { AIMockService } from './app/ai-mock.service';
import { ErrorHandler, Injectable } from '@angular/core';

import '@progress/kendo-angular-intl/locales/en/all';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Global error handler:', error);
    
    // Handle headers.has errors specifically
    if (error && error.message && error.message.includes('headers.has')) {
      console.warn('Headers.has error intercepted by global error handler');
      // Don't rethrow these errors to prevent app crashes
      return;
    }
    
    // For other errors, log them but don't crash the app
    if (error && error.message) {
      console.error('Error message:', error.message);
    }
    if (error && error.stack) {
      console.error('Error stack:', error.stack);
    }
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    // Re-enable simplified interceptor for AI requests
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AIMockService,
      multi: true
    },
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ]
}).catch(err => console.error('Bootstrap error:', err));
    