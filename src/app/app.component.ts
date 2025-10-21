import { Component, ViewChild, ViewEncapsulation } from "@angular/core";
import { applications, LoanApplication } from "./highlight-data";
import {
  KENDO_GRID,
  GridComponent,
  GridToolbarAIWindowSettings,
  GridToolbarAIPromptSettings,
  HighlightItem,
  AIAssistantToolbarDirective,
  GridToolbarAIRequestResponse,
  CompositeHighlightDescriptor,
} from "@progress/kendo-angular-grid";
import {
  KENDO_PROGRESSBARS,
  LabelSettings,
} from "@progress/kendo-angular-progressbar";
import { KENDO_TOOLBAR } from "@progress/kendo-angular-toolbar";
import {
  AIPromptComponent,
  PromptOutput,
  KENDO_CONVERSATIONALUI,
} from "@progress/kendo-angular-conversational-ui";
import { KENDO_BUTTONS, ChipThemeColor } from "@progress/kendo-angular-buttons";
import {
  BadgeThemeColor,
  KENDO_INDICATORS,
} from "@progress/kendo-angular-indicators";
import { arrowRotateCcwIcon, SVGIcon } from "@progress/kendo-svg-icons";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { AIService } from './ai.service';

@Component({
  selector: "app-root",
  standalone: true,
  providers: [HttpClient, AIService],
  imports: [
    CommonModule,
    KENDO_GRID,
    KENDO_BUTTONS,
    KENDO_INDICATORS,
    KENDO_PROGRESSBARS,
    KENDO_TOOLBAR,
    KENDO_CONVERSATIONALUI,
    HttpClientModule,
  ],
  template: `
    <kendo-grid #grid [kendoGridBinding]="applications" [kendoGridHighlight]="highlightedKeys">
      <kendo-toolbar>
        <kendo-toolbar-button
          kendoGridAIAssistantTool
          requestUrl="/api/ai-assistant"
          [requestOptions]="aiRequestOptions"
          [keepOutputHistory]="true"
          [aiPromptSettings]="aiPromptSettings"
          [aiWindowSettings]="aiWindowSettings"
          (promptRequest)="onPromptRequest($event)"
          (responseSuccess)="onResponseSuccess($event)"
          (responseError)="onResponseError($event)"
        ></kendo-toolbar-button>
        <kendo-toolbar-spacer></kendo-toolbar-spacer>
        <kendo-toolbar-button
          (click)="resetChanges()"
          [svgIcon]="resetIcon"
          text="Reset Changes"
          [disabled]="!highlightedKeys.length"
        ></kendo-toolbar-button>
      </kendo-toolbar>

      <kendo-grid-column
        field="CustomerName"
        title="Customer Name"
        [width]="130"
      ></kendo-grid-column>

      <kendo-grid-column
        field="LoanType"
        title="Loan Type"
        [width]="120"
      ></kendo-grid-column>
      <kendo-grid-column field="RiskLevel" title="Risk Level" [width]="100">
        <ng-template kendoGridCellTemplate let-dataItem>
          <kendo-badge-container>
            <kendo-badge
              rounded="full"
              [themeColor]="getBadgeThemeColor(dataItem.RiskLevel)"
            >
              {{ dataItem.RiskLevel }}
            </kendo-badge>
          </kendo-badge-container>
        </ng-template>
      </kendo-grid-column>
      <kendo-grid-column
        field="RequestedAmount"
        title="Requested Amount"
        [width]="150"
        format="{0:c0}"
      ></kendo-grid-column>
      <kendo-grid-column field="ApplicationStatus" title="Status" [width]="140">
        <ng-template kendoGridCellTemplate let-dataItem>
          <kendo-chip
            [label]="dataItem.ApplicationStatus"
            [themeColor]="getChipThemeColor(dataItem.ApplicationStatus)"
            rounded="large"
          >
          </kendo-chip>
        </ng-template>
      </kendo-grid-column>

      <kendo-grid-column
        field="SubmissionDate"
        title="Submission Date"
        [width]="140"
        format="{0:dd-MM-yy}"
      ></kendo-grid-column>
      <kendo-grid-column
        field="CreditScore"
        title="Credit Score"
        [width]="120"
        format="{0:n0}"
      >
        <ng-template kendoGridCellTemplate let-dataItem>
          <kendo-progressbar
            [value]="((dataItem.CreditScore - 300) / 550) * 100"
            [label]="label"
            orientation="horizontal"
          >
          </kendo-progressbar>
        </ng-template>
      </kendo-grid-column>
    </kendo-grid>
  `,
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      .k-badge-edge.k-top-end {
        transform: translate(100%, -70%);
      }

      .k-card-body p {
        white-space: pre-wrap;
      }

      .k-progressbar.k-progressbar-horizontal {
        border-radius: 0px;
      }
    `,
  ],
})
export class AppComponent {
  @ViewChild(GridComponent) public grid!: GridComponent;
  @ViewChild(AIAssistantToolbarDirective)
  public aiAssistant!: AIAssistantToolbarDirective;
  
  public aiRequestOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  public aiWindowSettings: GridToolbarAIWindowSettings = {
    width: 500,
    height: 510,
  };
  public aiPromptSettings: GridToolbarAIPromptSettings = {
    promptSuggestions: [
      "Highlight high-risk applications",
      "Show rejected loans greater than $20,000",
      "Highlight applications with credit scores below 600",
      "Mark applications under review submitted after July 15th",
      "Show approved loans with high amounts",
      "Highlight customers with medium or high risk levels",
      "Clear all highlighting",
    ],
  };
  public highlightedKeys: HighlightItem[] = [];
  public label: LabelSettings = {
    visible: true,
    format: "percent",
    position: "center",
  };
  public resetIcon: SVGIcon = arrowRotateCcwIcon;

  public resetChanges(): void {
    this.highlightedKeys = [];
  }

  public getChipThemeColor(applicationStatus: string): ChipThemeColor {
    switch (applicationStatus) {
      case "Approved":
        return "success";
      case "Under Review":
        return "warning";
      case "Rejected":
        return "error";
      default:
        return "base";
    }
  }

  public getBadgeThemeColor(riskLevel: string): BadgeThemeColor {
    switch (riskLevel) {
      case "High":
        return "error";
      case "Medium":
        return "warning";
      case "Low":
        return "success";
      default:
        return "primary";
    }
  }

  public applications: LoanApplication[] = applications;
  public columns: any[] = [];
  public aiPrompt!: AIPromptComponent;
  public idCounter: number = 0;
  public lastMessage!: string;
  public promptOutputs: PromptOutput[] = [];

  constructor(private aiService: AIService) {}

  public onResponseSuccess(event: any): void {
    console.log('AI Response Success:', event);
    
    let responseData = null;
    
    // Handle different response structures
    if (event.response && event.response.body) {
      responseData = event.response.body;
    } else if (event.body) {
      responseData = event.body;
    } else if (event.response) {
      responseData = event.response;
    }
    
    if (responseData) {
      console.log('Processing response data:', responseData);
      this.applyAIResponse(responseData);
    } else {
      console.warn('No response data found in event');
    }
  }

  public onResponseError(event: any): void {
    console.error('AI Response Error:', event);
  }

  public onPromptRequest(event: any): void {
    console.log('AI Prompt Request received:', event);
    // Let the automatic processing handle this through the interceptor
    // Don't do manual processing here to avoid conflicts
  }

  private applyAIResponse(response: GridToolbarAIRequestResponse): void {
    console.log('Applying AI response:', response);
    
    // Apply highlighting directly to the grid
    if (response.highlight && response.highlight.length > 0) {
      // Clear existing highlights
      this.highlightedKeys = [];
      
      // Apply new highlights based on the filters
      response.highlight.forEach(highlightDescriptor => {
        this.applications.forEach((item, index) => {
          if (this.matchesFilters(item, highlightDescriptor.filters, highlightDescriptor.logic)) {
            // For Kendo Grid highlighting, we need to use the actual data item
            this.highlightedKeys.push(item as HighlightItem);
          }
        });
      });
      
      console.log(`Applied highlighting to ${this.highlightedKeys.length} items`);
      console.log('Highlighted items:', this.highlightedKeys.map(item => (item as any).CustomerName));
      
    } else if (response.highlight && response.highlight.length === 0) {
      // Clear highlights
      this.highlightedKeys = [];
      console.log('Cleared all highlights');
    }
    
    // Show messages to user
    if (response.messages && response.messages.length > 0) {
      console.log('AI Assistant:', response.messages.join(' '));
    }
  }

  private matchesFilters(item: any, filters: any[], logic: 'and' | 'or'): boolean {
    if (!filters || filters.length === 0) return false;
    
    const results = filters.map(filter => {
      const fieldValue = item[filter.field];
      
      switch (filter.operator) {
        case 'eq':
          return fieldValue === filter.value;
        case 'gt':
          return fieldValue > filter.value;
        case 'lt':
          return fieldValue < filter.value;
        case 'gte':
          return fieldValue >= filter.value;
        case 'lte':
          return fieldValue <= filter.value;
        case 'contains':
          return fieldValue && fieldValue.toString().toLowerCase().includes(filter.value.toLowerCase());
        default:
          return false;
      }
    });
    
    return logic === 'and' ? results.every(r => r) : results.some(r => r);
  }


}
