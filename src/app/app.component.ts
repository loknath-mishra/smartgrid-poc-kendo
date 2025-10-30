import { Component, ViewChild, ViewEncapsulation, ElementRef } from "@angular/core";
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
  InlineAIPromptService,
  InlineAIPromptRequestEvent,
  InlineAIPromptCommand,
  InlineAIPromptOutputAction
} from "@progress/kendo-angular-conversational-ui";
import {
  BadgeThemeColor,
  KENDO_INDICATORS,
} from "@progress/kendo-angular-indicators";
import { KENDO_ICONS } from "@progress/kendo-angular-icons";
import { KENDO_BUTTON } from "@progress/kendo-angular-buttons";
import { arrowRotateCcwIcon, lockIcon, unlockIcon, SVGIcon, sparklesIcon } from "@progress/kendo-svg-icons";
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
    KENDO_BUTTON,
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
                text="🤖 Toolbar AI Assistant"
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
              <kendo-toolbar-button
                (click)="exportGridData()"
                icon="k-i-excel"
                text="Export"
              ></kendo-toolbar-button>
            </kendo-toolbar>

            <ng-template kendoGridNoRecordsTemplate>
              Ingen maler funnet.
            </ng-template>
            
            <!-- AI Column Assistant -->
            <kendo-grid-column title="AI Assistant" [width]="120" [sortable]="false" [filterable]="false">
              <ng-template kendoGridCellTemplate let-dataItem>
                <button
                  #anchor
                  kendoButton
                  [svgIcon]="sparklesIcon"
                  fillMode="flat"
                  themeColor="primary"
                  title="Ask AI about this template"
                  (click)="onAIButtonClick(dataItem, anchor)"
                >
                  AI
                </button>
              </ng-template>
            </kendo-grid-column>
            
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
  public sparklesIcon: SVGIcon = sparklesIcon;
  
  // AI Column Assistant properties
  public inlineAIPromptInstance: any;
  public currentDataItem: any;
  public promptOutput: PromptOutput | null = null;

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

  constructor(
    private readonly aiService: AIService,
    private promptService: InlineAIPromptService
  ) {}

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

  // AI Column Assistant Methods
  public onAIButtonClick(dataItem: ReportingTemplate, anchor: ElementRef): void {
    console.log('AI Assistant clicked for:', dataItem.templateName);
    
    this.currentDataItem = dataItem;
    
    // Define prompt commands specific to reporting templates
    const promptCommands: InlineAIPromptCommand[] = [
      {
        id: 'summarize',
        text: 'Summarize this template',
        icon: 'k-i-chart-line-markers'
      },   
      {
        id: 'explain',
        text: 'Explain template purpose',
        icon: 'k-i-question'
      },
      {
        id: 'sammendrag',
        text: 'Sammendrag av denne malen',
        icon: 'k-i-chart-line-markers'
      },   
      {
        id: 'forklar',
        text: 'Forklar malens formål',
        icon: 'k-i-question'
      }
    ];

    // Define output actions
    const outputActions: InlineAIPromptOutputAction[] = [
      {
        name: 'copy'
      },
      {
        name: 'discard'
      }
    ];

    try {
      this.inlineAIPromptInstance = this.promptService.open({
        popupSettings: { 
          anchor: anchor
        },
        promptCommands: promptCommands,
        outputActions: outputActions
      });

      const promptComponentInstance = this.inlineAIPromptInstance.content.instance;

      // Handle manual prompts
      promptComponentInstance.promptRequest.subscribe((event: InlineAIPromptRequestEvent) => {
        this.handleAIRequest(dataItem, event.prompt);
      });

      // Handle command executions
      promptComponentInstance.commandExecute.subscribe((command: InlineAIPromptCommand) => {
        this.handleAIRequest(dataItem, command.text);
      });

    } catch (error) {
      console.error('Error opening AI prompt:', error);
    }
  }

  private handleAIRequest(dataItem: ReportingTemplate, prompt: string): void {
    console.log('Handling AI request:', prompt, 'for:', dataItem.templateName);
    
    // Create output object
    const outputId = this.generateGuid();
    const output: PromptOutput = {
      id: outputId,
      output: '',
      prompt: prompt
    };

    this.promptOutput = output;

    // Create context-aware prompt for the AI service
    const contextualPrompt = this.buildContextualPrompt(dataItem, prompt);
    
    // Call AI service
    this.aiService.generateGridResponse(contextualPrompt)
      .then((response) => this.onAIResponseSuccess(response))
      .catch((error) => this.onAIResponseError(error));
  }

  private buildContextualPrompt(dataItem: ReportingTemplate, userPrompt: string): string {
    // Detect if this is a Norwegian command
    const isNorwegian = userPrompt.includes('Sammendrag') || userPrompt.includes('Forklar') || 
                       userPrompt.includes('malen') || userPrompt.includes('formål');
    
    if (isNorwegian) {
      const context = `
      Du lager et sammendrag av en rapporteringsmal med følgende detaljer:
      - Malnavn: ${dataItem.templateName}
      - Eier: ${dataItem.ownerName}
      - Opprettet dato: ${dataItem.formattedCreatedDate}
      - Sist oppdatert: ${dataItem.formattedLastUpdatedDate}
      - Status: ${dataItem.isLockedStringValue}
      - Tilgangsrettigheter: ${dataItem.isGlobalStringValue}
      - Organisasjon: ${dataItem.createdOrg}
      - Dokument Widget: ${dataItem.isDocWidgetStringValue}
      
      Brukers spørsmål: ${userPrompt}
      
      Vennligst gi et nyttig, kortfattet sammendrag på norsk om denne rapporteringsmalen.
      `;
      
      return context;
    } else {
      const context = `
      You are summarizing a reporting template with the following details:
      - Template Name: ${dataItem.templateName}
      - Owner: ${dataItem.ownerName}
      - Created Date: ${dataItem.formattedCreatedDate}
      - Last Updated: ${dataItem.formattedLastUpdatedDate}
      - Status: ${dataItem.isLockedStringValue}
      - Access Rights: ${dataItem.isGlobalStringValue}
      - Organization: ${dataItem.createdOrg}
      - Doc Widget: ${dataItem.isDocWidgetStringValue}
      
      User Question: ${userPrompt}
      
      Please provide a helpful, concise summary about this reporting template.
      `;
      
      return context;
    }
  }

  private onAIResponseSuccess(response: any): void {
    console.log('AI Response Success:', response);
    
    let responseText = '';
    if (response.messages && response.messages.length > 0) {
      responseText = response.messages.join(' ');
    } else if (typeof response === 'string') {
      responseText = response;
    } else {
      // Generate dynamic summary based on actual template data
      const template = this.currentDataItem;
      
      // Check if this was a Norwegian request
      const isNorwegianRequest = this.promptOutput?.prompt?.includes('Sammendrag') || 
                                this.promptOutput?.prompt?.includes('malen');
      
      if (isNorwegianRequest) {
        responseText = this.generateNorwegianSummary(template);
      } else {
        responseText = this.generateEnglishSummary(template);
      }
    }

    if (this.promptOutput) {
      this.promptOutput = { 
        ...this.promptOutput, 
        output: responseText 
      };
      
      if (this.inlineAIPromptInstance?.content?.instance) {
        this.inlineAIPromptInstance.content.instance.promptOutput = { ...this.promptOutput };
      }
    }
  }

  private onAIResponseError(error: any): void {
    console.error('AI Response Error:', error);
    
    if (this.promptOutput) {
      this.promptOutput = { 
        ...this.promptOutput, 
        output: 'Sorry, I encountered an error while summarizing this template. Please try again.' 
      };
      
      if (this.inlineAIPromptInstance?.content?.instance) {
        this.inlineAIPromptInstance.content.instance.promptOutput = { ...this.promptOutput };
      }
    }
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateEnglishSummary(template: ReportingTemplate): string {
    if (!template) return 'Template information is not available.';

    const isLocked = template.isLocked ? 'locked' : 'unlocked';
    const isGlobal = template.isGlobalStringValue?.toLowerCase().includes('global') ? 'globally accessible' : 'restricted access';
    const hasDocWidget = template.isDocWidgetStringValue?.toLowerCase() === 'yes' ? 'includes document widget functionality' : 'standard template without document widgets';
    
    const ageInDays = this.calculateDaysFromDate(template.formattedCreatedDate);
    const ageDescription = ageInDays > 365 ? 'established' : ageInDays > 30 ? 'recent' : 'new';
    
    return `Template "${template.templateName}" is a ${ageDescription} reporting template owned by ${template.ownerName} from ${template.createdOrg}. ` +
           `Created on ${template.formattedCreatedDate} and last updated ${template.formattedLastUpdatedDate}, this template is currently ${isLocked} with ${isGlobal} permissions. ` +
           `The template ${hasDocWidget} and is ready for ${template.isLocked ? 'review and approval before use' : 'immediate use in reporting workflows'}.`;
  }

  private generateNorwegianSummary(template: ReportingTemplate): string {
    if (!template) return 'Malinformasjon er ikke tilgjengelig.';

    const isLocked = template.isLocked ? 'låst' : 'åpen';
    const isGlobal = template.isGlobalStringValue?.toLowerCase().includes('global') ? 'globalt tilgjengelig' : 'begrenset tilgang';
    const hasDocWidget = template.isDocWidgetStringValue?.toLowerCase() === 'yes' ? 'inkluderer dokument widget-funksjonalitet' : 'standardmal uten dokument widgets';
    
    const ageInDays = this.calculateDaysFromDate(template.formattedCreatedDate);
    const ageDescription = ageInDays > 365 ? 'etablert' : ageInDays > 30 ? 'nylig' : 'ny';
    
    return `Malen "${template.templateName}" er en ${ageDescription} rapporteringsmal som eies av ${template.ownerName} fra ${template.createdOrg}. ` +
           `Opprettet ${template.formattedCreatedDate} og sist oppdatert ${template.formattedLastUpdatedDate}, denne malen er for øyeblikket ${isLocked} med ${isGlobal} tillatelser. ` +
           `Malen ${hasDocWidget} og er klar for ${template.isLocked ? 'gjennomgang og godkjenning før bruk' : 'umiddelbar bruk i rapporteringsarbeidsflyter'}.`;
  }

  private calculateDaysFromDate(dateString: string): number {
    try {
      const createdDate = new Date(dateString);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - createdDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  public onReportingPromptRequest(event: any): void {
    console.log('Reporting AI Prompt Request received:', event);
    // This method is kept for compatibility but not used in the new implementation
  }

  public exportGridData(): void {
    // Export grid data functionality
    console.log('Exporting grid data...');
    const data = this.getFilteredGridData();
    this.downloadAsJson(data, 'reporting-templates.json');
  }

  private getFilteredGridData(): ReportingTemplate[] {
    // Get the current filtered/sorted data from the grid
    let data = [...this.reportingTemplates];
    
    // Apply current filters if any
    if (this.reportingFilterDescriptor) {
      data = this.applyFilters(data, this.reportingFilterDescriptor);
    }
    
    // Apply current sorting if any
    if (this.reportingSortDescriptors.length > 0) {
      data = this.applySorting(data, this.reportingSortDescriptors);
    }
    
    return data;
  }

  private applyFilters(data: ReportingTemplate[], filter: any): ReportingTemplate[] {
    // Simplified filter application - in production use kendo-data-query process function
    return data.filter(item => {
      if (!filter.filters || filter.filters.length === 0) return true;
      
      return filter.filters.some((f: any) => {
        const itemValue = (item as any)[f.field];
        switch (f.operator) {
          case 'eq': return itemValue === f.value;
          case 'contains': return itemValue && itemValue.toString().toLowerCase().includes(f.value.toLowerCase());
          default: return true;
        }
      });
    });
  }

  private applySorting(data: ReportingTemplate[], sort: any[]): ReportingTemplate[] {
    if (sort.length === 0) return data;
    
    return data.sort((a, b) => {
      const sortDesc = sort[0];
      const aVal = (a as any)[sortDesc.field];
      const bVal = (b as any)[sortDesc.field];
      
      if (aVal < bVal) return sortDesc.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDesc.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private downloadAsJson(data: any, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
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
