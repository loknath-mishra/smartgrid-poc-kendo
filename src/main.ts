
/// <reference types="@angular/localize" />

import '@angular/localize/init';
import './polyfills';

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { AIService } from './app/ai.service';

import '@progress/kendo-angular-intl/locales/en/all';

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AIService,
      multi: true
    }
  ]
}).catch(err => console.error(err));
    