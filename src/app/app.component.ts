import { Component, ViewChild, ViewEncapsulation } from "@angular/core";
import { ReportingTemplate, reportingData } from "./highlight-data";
import {
  KENDO_GRID,
  GridComponent,
  GridToolbarAIWindowSettings,
  GridToolbarAIPromptSettings,
  AIAssistantToolbarDirective,
  GridToolbarAIRequestResponse,
} from "@progress/kendo-angular-grid";
import { KENDO_TOOLBAR } from "@progress/kendo-angular-toolbar";
import { process, SortDescriptor, GroupDescriptor, CompositeFilterDescriptor } from "@progress/kendo-data-query";
import {
  AIPromptComponent,
  PromptOutput,
  KENDO_CONVERSATIONALUI,
} from "@progress/kendo-angular-conversational-ui";
import {
  BadgeThemeColor,
  KENDO_INDICATORS,
} from "@progress/kendo-angular-indicators";
import { KENDO_ICONS } from "@progress/kendo-angular-icons";
import { arrowRotateCcwIcon, lockIcon, unlockIcon, SVGIcon } from "@progress/kendo-svg-icons";
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
    KENDO_INDICATORS,
    KENDO_TOOLBAR,
    KENDO_ICONS,
    KENDO_CONVERSATIONALUI,
    HttpClientModule,
  ],
  template: `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <h3>Reporting Templates</h3>
          <kendo-grid 
            #reportingGrid
            [kendoGridBinding]="reportingTemplates"
            [sortable]="true"
            [filterable]="true"
            [groupable]="{ enabled: true, emptyText: 'Dra en kolonne hit for å gruppere' }"
            [sort]="reportingSortDescriptors"
            [group]="reportingGroupDescriptors"
            [filter]="reportingFilterDescriptor"
            [rowClass]="reportingRowClass"
            class="border-0 report-template-grid"
          >
            <kendo-toolbar>
              <kendo-toolbar-button
                kendoGridAIAssistantTool
                requestUrl="/api/ai-assistant"
                [requestOptions]="aiRequestOptions"
                [keepOutputHistory]="true"
                [aiPromptSettings]="reportingAiPromptSettings"
                [aiWindowSettings]="aiWindowSettings"
                (promptRequest)="onReportingPromptRequest($event)"
                (responseSuccess)="onReportingResponseSuccess($event)"
                (responseError)="onReportingResponseError($event)"
              ></kendo-toolbar-button>
              <kendo-toolbar-spacer></kendo-toolbar-spacer>
              <kendo-toolbar-button
                (click)="resetReportingChanges()"
                [svgIcon]="resetIcon"
                text="Reset Changes"
                [disabled]="!hasReportingDataOperations"
              ></kendo-toolbar-button>
            </kendo-toolbar>

            <ng-template kendoGridNoRecordsTemplate>
              Ingen maler funnet.
            </ng-template>
            
            <kendo-grid-column
              *ngFor="let column of reportingTemplateGridColumns"
              [field]="column.field"
              [title]="column.title"
              [width]="column.width"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem *ngIf="column.field === 'templateName'">
                <span class="fw-bold text-primary">{{ dataItem.templateName }}</span>
              </ng-template>
              
              <ng-template kendoGridCellTemplate let-dataItem *ngIf="column.field === 'isLockedStringValue'">
                <span class="locked-content-wrap">
                  <kendo-svg-icon *ngIf="!dataItem.isLocked" [icon]="unlockIcon"></kendo-svg-icon>
                  <kendo-svg-icon *ngIf="dataItem.isLocked" [icon]="lockIcon"></kendo-svg-icon>
                  <span>{{ dataItem.isLockedStringValue }}</span>
                </span>
              </ng-template>
              
              <ng-template kendoGridCellTemplate let-dataItem *ngIf="column.field === 'createdOrg'">
                <span class="org-created-name" [title]="dataItem.createdOrg">{{ dataItem.createdOrg }}</span>
              </ng-template>
            </kendo-grid-column>
          </kendo-grid>
        </div>
      </div>
    </div>
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
      
      .report-template-grid {
        margin-top: 1rem;
      }
      
      .locked-content-wrap {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      .locked-content-wrap kendo-svg-icon {
        flex-shrink: 0;
      }
      
      .org-created-name {
        display: block;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      h3 {
        margin-bottom: 1rem;
        color: #333;
      }
      
      .highlighted-row {
        background-color: #fff3cd !important;
        border-left: 4px solid #ffc107 !important;
      }
      
      .highlighted-row:hover {
        background-color: #fff3cd !important;
      }
      
      .highlighted-row td {
        background-color: #fff3cd !important;
      }
    `,
  ],
})
export class AppComponent {
  @ViewChild('reportingGrid', { static: false }) public reportingGrid!: GridComponent;
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

  public reportingAiPromptSettings: GridToolbarAIPromptSettings = {
    promptSuggestions: [
      // 2 Highlighting prompts (English & Norwegian)
      "Highlight locked templates",
      "Marker låste maler",
      
      // 2 Filtering prompts (English & Norwegian)
      "Show only locked templates",
      "Vis bare låste maler",
      
      // 2 Sorting prompts (English & Norwegian)
      "Sort by template name alphabetically",
      "Sorter etter malnavn alfabetisk",
      
      // 1 Grouping prompt (English & Norwegian)
      "Group templates by owner",
      "Grupper maler etter eier",
    ],
  };
  public resetIcon: SVGIcon = arrowRotateCcwIcon;
  public lockIcon: SVGIcon = lockIcon;
  public unlockIcon: SVGIcon = unlockIcon;

  public resetChanges(): void {
    // This method is no longer needed but kept for backwards compatibility
    // Use resetReportingChanges instead
    this.resetReportingChanges();
  }


  public reportingTemplates: ReportingTemplate[] = reportingData;
  public columns: any[] = [];
  public aiPrompt!: AIPromptComponent;
  public idCounter: number = 0;
  public lastMessage!: string;
  public promptOutputs: PromptOutput[] = [];
  public hasReportingDataOperations: boolean = false;
  
  // Reporting grid state properties
  public reportingSortDescriptors: SortDescriptor[] = [];
  public reportingGroupDescriptors: GroupDescriptor[] = [];
  public reportingFilterDescriptor: CompositeFilterDescriptor | null = null;
  public highlightedTemplateIds: Set<number> = new Set();

  // Reporting template grid columns
  public reportingTemplateGridColumns = [
    { field: 'templateName', title: 'Spørremaler', width: 200 },
    { field: 'ownerName', title: 'Eier', width: 150 },
    { field: 'formattedCreatedDate', title: 'Opprettet dato', width: 120 },
    { field: 'formattedLastUpdatedDate', title: 'Sist oppdatert', width: 120 },
    { field: 'isGlobalStringValue', title: 'Tilgangsrettigheter', width: 100 },
    { field: 'isDocWidgetStringValue', title: 'Dokumentwidget', width: 100 },
    { field: 'isLockedStringValue', title: 'Status', width: 80 },
    { field: 'createdOrg', title: 'Organisasjon', width: 150 }
  ];

  constructor(private readonly aiService: AIService) {}

  public resetReportingChanges(): void {
    this.reportingSortDescriptors = [];
    this.reportingGroupDescriptors = [];
    this.reportingFilterDescriptor = null;
    this.reportingTemplates = reportingData;
    this.highlightedTemplateIds.clear();
    this.hasReportingDataOperations = false;
  }

  public reportingRowClass = (context: any) => {
    const index = context.index;
    return this.highlightedTemplateIds.has(index) ? 'highlighted-row' : '';
  };

  public onReportingResponseSuccess(event: any): void {
    console.log('Reporting AI Response Success:', event);
    
    let responseData = null;
    
    // Handle different response structures
    if (event.response?.body) {
      responseData = event.response.body;
    } else if (event.body) {
      responseData = event.body;
    } else if (event.response) {
      responseData = event.response;
    }
    
    if (responseData) {
      console.log('Processing reporting response data:', responseData);
      this.applyReportingAIResponse(responseData);
    } else {
      console.warn('No response data found in reporting event');
    }
  }

  public onReportingResponseError(event: any): void {
    console.error('Reporting AI Response Error:', event);
  }

  public onReportingPromptRequest(event: any): void {
    console.log('Reporting AI Prompt Request received:', event);
    // Let the automatic processing handle this through the interceptor
  }




  

  private applyReportingAIResponse(response: GridToolbarAIRequestResponse): void {
    console.log('Applying reporting AI response:', response);
    
    // Apply highlighting
    if (response.highlight) {
      this.applyHighlighting(response.highlight);
    }
    
    // Apply sorting
    if (response.sort && response.sort.length > 0) {
      this.reportingSortDescriptors = response.sort;
      if (this.reportingGrid) {
        this.reportingGrid.sort = response.sort;
      }
      console.log('Applied reporting sorting:', response.sort);
    }
    
    // Apply grouping
    if (response.group && response.group.length > 0) {
      this.reportingGroupDescriptors = response.group;
      if (this.reportingGrid) {
        this.reportingGrid.group = response.group;
      }
      console.log('Applied reporting grouping:', response.group);
    }
    
    // Apply filtering
    if (response.filter) {
      this.reportingFilterDescriptor = response.filter;
      if (this.reportingGrid) {
        this.reportingGrid.filter = response.filter;
      }
      console.log('Applied reporting filtering:', response.filter);
    }
    
    // Clear operations if requested
    if (response.sort && response.sort.length === 0) {
      this.reportingSortDescriptors = [];
      if (this.reportingGrid) {
        this.reportingGrid.sort = [];
      }
    }
    
    if (response.group && response.group.length === 0) {
      this.reportingGroupDescriptors = [];
      if (this.reportingGrid) {
        this.reportingGrid.group = [];
      }
    }
    
    if (response.filter === null) {
      this.reportingFilterDescriptor = null;
      if (this.reportingGrid) {
        this.reportingGrid.filter = null;
      }
    }
    
    // Clear highlighting if empty array
    if (response.highlight && response.highlight.length === 0) {
      this.highlightedTemplateIds.clear();
    }
    
    // Update hasReportingDataOperations flag
    this.hasReportingDataOperations = 
      (this.reportingSortDescriptors.length > 0) ||
      (this.reportingGroupDescriptors.length > 0) ||
      (this.reportingFilterDescriptor !== null) ||
      (this.highlightedTemplateIds.size > 0);
    
    // Show messages to user
    if (response.messages && response.messages.length > 0) {
      console.log('Reporting AI Assistant:', response.messages.join(' '));
    }
  }

  private applyHighlighting(highlightRules: any[]): void {
    this.highlightedTemplateIds.clear();
    
    if (!highlightRules || highlightRules.length === 0) {
      return;
    }
    
    // Process each template to see if it matches highlighting rules
    this.reportingTemplates.forEach((template, index) => {
      const matches = highlightRules.some(rule => this.matchesHighlightRule(template, rule));
      if (matches) {
        this.highlightedTemplateIds.add(index);
      }
    });
    
    console.log('Highlighted template IDs:', Array.from(this.highlightedTemplateIds));
  }

  private matchesHighlightRule(template: ReportingTemplate, rule: any): boolean {
    if (!rule.filters || !Array.isArray(rule.filters)) {
      return false;
    }
    
    const logic = rule.logic || 'and';
    
    if (logic === 'and') {
      return rule.filters.every((filter: any) => this.matchesFilter(template, filter));
    } else if (logic === 'or') {
      return rule.filters.some((filter: any) => this.matchesFilter(template, filter));
    }
    
    return false;
  }

  private matchesFilter(template: ReportingTemplate, filter: any): boolean {
    const field = filter.field;
    const operator = filter.operator;
    const value = filter.value;
    
    const templateValue = (template as any)[field];
    
    switch (operator) {
      case 'eq':
        return templateValue === value;
      case 'neq':
        return templateValue !== value;
      case 'gt':
        return templateValue > value;
      case 'gte':
        return templateValue >= value;
      case 'lt':
        return templateValue < value;
      case 'lte':
        return templateValue <= value;
      case 'contains':
        return templateValue && templateValue.toString().toLowerCase().includes(value.toString().toLowerCase());
      case 'startswith':
        return templateValue && templateValue.toString().toLowerCase().startsWith(value.toString().toLowerCase());
      case 'endswith':
        return templateValue && templateValue.toString().toLowerCase().endsWith(value.toString().toLowerCase());
      default:
        return false;
    }
  }

}
