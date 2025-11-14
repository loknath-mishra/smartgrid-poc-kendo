import { Component, ViewChild, ViewEncapsulation, ElementRef, OnInit, AfterViewInit, TemplateRef } from "@angular/core";
import { ReportingTemplate, reportingData } from "./highlight-data";
import {
  KENDO_GRID,
  GridComponent,
  GridToolbarAIWindowSettings,
  GridToolbarAIPromptSettings,
  GridToolbarAIRequestResponse,
} from "@progress/kendo-angular-grid";
import { KENDO_TOOLBAR } from "@progress/kendo-angular-toolbar";
import { SortDescriptor, GroupDescriptor, CompositeFilterDescriptor } from "@progress/kendo-data-query";
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
              <!-- AI Toggle Button -->
              <kendo-toolbar-button
                [togglable]="true"
                [selected]="aiService.isAIEnabled"
                (click)="toggleAI()"
                [svgIcon]="sparklesIcon"
                [text]="aiService.isAIEnabled ? 'AI Enabled' : 'AI Disabled'"
                [themeColor]="aiService.isAIEnabled ? 'primary' : 'error'"
                title="Toggle AI Assistant On/Off"
              ></kendo-toolbar-button>
              <kendo-toolbar-separator></kendo-toolbar-separator>
              
              <kendo-toolbar-button
                kendoGridAIAssistantTool
                requestUrl="bypass-interceptor"
                [requestOptions]="aiRequestOptions"
                [keepOutputHistory]="false"
                [aiPromptSettings]="reportingAiPromptSettings"
                [autoClose]="false"
                [aiWindowSettings]="aiWindowSettings"
                text="AI Assistant"
                [disabled]="!aiService.isAIEnabled"
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
            
            <!-- AI Assistant Command Column -->
            <kendo-grid-command-column 
              title="AI Assistant" 
              [width]="120"
              [resizable]="false"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <button
                  #anchor
                  kendoButton
                  [svgIcon]="sparklesIcon"
                  fillMode="flat"
                  themeColor="primary"
                  title="AI Analysis for this template"
                  [disabled]="!aiService.isAIEnabled"
                  (click)="onAIButtonClick(dataItem, anchor)"
                  class="ai-assistant-btn"
                >
                </button>
              </ng-template>
            </kendo-grid-command-column>
            
            <!-- Template Name Column -->
            <kendo-grid-column
              field="templateName"
              title="Spørremaler"
              [width]="200"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <span class="fw-bold text-primary">{{ dataItem.templateName }}</span>
              </ng-template>
            </kendo-grid-column>
            
            <!-- Owner Column -->
            <kendo-grid-column
              field="ownerName"
              title="Eier"
              [width]="150"
              [sortable]="true"
            >
            </kendo-grid-column>
            
            <!-- Created Date Column -->
            <kendo-grid-column
              field="formattedCreatedDate"
              title="Opprettet dato"
              [width]="120"
              [sortable]="true"
            >
            </kendo-grid-column>
            
            <!-- Last Updated Column -->
            <kendo-grid-column
              field="formattedLastUpdatedDate"
              title="Sist oppdatert"
              [width]="120"
              [sortable]="true"
            >
            </kendo-grid-column>
            
            <!-- Access Rights Column -->
            <kendo-grid-column
              field="isGlobalStringValue"
              title="Tilgangsrettigheter"
              [width]="100"
              [sortable]="true"
            >
            </kendo-grid-column>
            
            <!-- Doc Widget Column -->
            <kendo-grid-column
              field="isDocWidgetStringValue"
              title="Dokumentwidget"
              [width]="100"
              [sortable]="true"
            >
            </kendo-grid-column>
            
            <!-- Status Column -->
            <kendo-grid-column
              field="isLockedStringValue"
              title="Status"
              [width]="80"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <span class="locked-content-wrap">
                  <kendo-svg-icon *ngIf="!dataItem.isLocked" [icon]="unlockIcon"></kendo-svg-icon>
                  <kendo-svg-icon *ngIf="dataItem.isLocked" [icon]="lockIcon"></kendo-svg-icon>
                  <span>{{ dataItem.isLockedStringValue }}</span>
                </span>
              </ng-template>
            </kendo-grid-column>
            
            <!-- Organization Column -->
            <kendo-grid-column
              field="createdOrg"
              title="Organisasjon"
              [width]="150"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <span class="org-created-name" [title]="dataItem.createdOrg">{{ dataItem.createdOrg }}</span>
              </ng-template>
            </kendo-grid-column>
            
            <!-- Price1 Column -->
            <kendo-grid-column
              field="previousYearActuals"
              title="Previous Year Actuals"
              [width]="100"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <span class="numeric-value">{{ dataItem.previousYearActuals }}</span>
              </ng-template>
            </kendo-grid-column>
            
            <!-- Price2 Column -->
            <kendo-grid-column
              field="currentYearBudget"
              title="Current Year Budget"
              [width]="100"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <span class="numeric-value">{{ dataItem.currentYearBudget }}</span>
              </ng-template>
            </kendo-grid-column>
            
            <!-- Price3 Column -->
            <kendo-grid-column
              field="currentYearActuals"
              title="Current Year Actuals"
              [width]="100"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <span class="numeric-value">{{ dataItem.currentYearActuals }}</span>
              </ng-template>
            </kendo-grid-column>
            
            <!-- Price4 Column -->
            <kendo-grid-column
              field="currentYearDeviation"
              title="Current Year Deviation"
              [width]="100"
              [sortable]="true"
            >
              <ng-template kendoGridCellTemplate let-dataItem>
                <span class="numeric-value">{{ dataItem.currentYearDeviation }}</span>
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
      
      /* AI-Powered Row Highlight Styles */
      .highlighted-row {
        background-color: #fff3cd !important;
        border-left: 4px solid #ffc107 !important;
        animation: highlightPulse 1s ease-in-out;
      }
      
      .highlighted-row:hover {
        background-color: #fff3cd !important;
      }
      
      .highlighted-row td {
        background-color: #fff3cd !important;
      }
      
      @keyframes highlightPulse {
        0% { background-color: #fff3cd; }
        50% { background-color: #ffeb3b; }
        100% { background-color: #fff3cd; }
      }
      
      /* AI Toggle Button Styles */
      .k-toolbar .k-button.k-toggle-button.k-selected {
        background-color: #28a745 !important;
        border-color: #28a745 !important;
        color: white !important;
      }
      
      .k-toolbar .k-button.k-toggle-button:not(.k-selected) {
        background-color: #dc3545 !important;
        border-color: #dc3545 !important;
        color: white !important;
      }
      
      .k-toolbar .k-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }
      
      /* AI Column Assistant Button Styles */
      .ai-assistant-column .k-button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        padding: 0 !important;
        margin: 0 auto !important;
        display: block !important;
      }
      
      .ai-assistant-column .k-button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
      }
      
      .ai-assistant-column .k-button:disabled {
        background: #ccc !important;
        transform: none !important;
        box-shadow: none !important;
      }

      /* Grid Layout and Alignment Fixes */
      .report-template-grid.k-grid {
        table-layout: fixed !important;
        width: 100% !important;
      }
      
      .report-template-grid .k-grid-header table,
      .report-template-grid .k-grid-content table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      
      .report-template-grid .k-grid-header th,
      .report-template-grid .k-grid-content td {
        box-sizing: border-box !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      
      /* AI Column Specific Styling */
      .report-template-grid .k-grid-header th:first-child,
      .report-template-grid .k-grid-content td:first-child {
        width: 120px !important;
        min-width: 120px !important;
        max-width: 120px !important;
        text-align: center !important;
        padding: 8px !important;
        vertical-align: middle !important;
      }
      
      .report-template-grid .k-grid-header th:first-child {
        background-color: #f8f9fa !important;
        font-weight: 600 !important;
        border-right: 2px solid #dee2e6 !important;
      }
      
      .report-template-grid .k-grid-content td:first-child {
        background-color: inherit !important;
        border-right: 2px solid #dee2e6 !important;
      }
      
      /* Other columns consistent width */
      .report-template-grid .k-grid-header th:not(:first-child),
      .report-template-grid .k-grid-content td:not(:first-child) {
        padding: 8px 12px !important;
      }
      
      /* AI Assistant Button Specific Styles */
      .ai-assistant-btn {
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        max-width: 36px !important;
        padding: 0 !important;
        margin: 0 auto !important;
        display: block !important;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border: none !important;
        color: white !important;
        border-radius: 50% !important;
        box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3) !important;
        transition: all 0.3s ease !important;
      }
      
      .ai-assistant-btn:hover:not([disabled]) {
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4) !important;
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%) !important;
      }
      
      .ai-assistant-btn[disabled] {
        background: #ccc !important;
        transform: none !important;
        box-shadow: none !important;
        opacity: 0.6 !important;
      }
      
      .ai-assistant-btn .k-svg-icon {
        width: 16px !important;
        height: 16px !important;
      }
      
      /* AI Column Assistant Popup Styles */
      .ai-column-assistant-popup .k-popup {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        border-radius: 8px;
      }
      
      .ai-column-assistant-popup .k-conversational-ui {
        max-width: 400px;
      }
      
      /* Toolbar AI Assistant Button Enhancement */
      .k-toolbar .k-button[kendoGridAIAssistantTool] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white !important;
        font-weight: 600;
        transition: all 0.3s ease;
      }
      
      .k-toolbar .k-button[kendoGridAIAssistantTool]:hover:not(:disabled) {
        background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      /* Enhanced highlighting for better visibility */
      .k-grid tr.highlighted-row {
        position: relative;
      }
      
      .k-grid tr.highlighted-row::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: linear-gradient(180deg, #ffc107 0%, #ffeb3b 100%);
      }
      
      /* AI features coordination indicator */
      .ai-features-active {
        border-left: 3px solid #667eea;
        padding-left: 15px;
      }
      
      /* Numeric value styling */
      .numeric-value {
        font-weight: 600;
        color: #28a745;
        text-align: right;
        display: block;
      }
    `,
  ],
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('reportingGrid', { static: false }) public reportingGrid!: GridComponent;
  customOutputs: PromptOutput[] = [];
  outputIdCounter = 1;
  public aiRequestOptions = {
    timeout: 30000,
    withCredentials: false
    // Remove headers to avoid headers.has issues
  };
  
  public aiWindowSettings: GridToolbarAIWindowSettings = {
    width: 600,
    height: 650,
    title: 'Framsikt AI Assistant',
    resizable: true,
    draggable: true
  };

  public reportingAiPromptSettings: GridToolbarAIPromptSettings = {
    promptSuggestions: [
      // Summary and Overview prompts (English & Norwegian)
      "Provide a summary of all templates",
      "Give me overall grid statistics",
      "Gi meg en sammendrag av alle maler",
      "Vis meg en oversikt over statistikk",
      
      // Highlighting prompts (English & Norwegian)
      "Highlight locked templates",
      "Marker låste maler",
      
      // Filtering prompts (English & Norwegian)
      "Show only locked templates",
      "Vis bare låste maler",
      
      // Sorting prompts (English & Norwegian)
      "Sort by template name alphabetically",
      "Sorter etter malnavn alfabetisk",
      
      // Grouping prompts (English & Norwegian)
      "Group templates by owner",
      "Grupper maler etter eier",
      
      // Analysis prompts (English & Norwegian)
      "Analyze template distribution by organization",
      "Show template status breakdown",
      "Analyser malfordeling etter organisasjon",
      "Vis statusfordeling for maler",
    ],
    promptOutputs : this.customOutputs
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
    public readonly aiService: AIService,
    private readonly promptService: InlineAIPromptService
  ) {
    // Set initial grid data for AI context
    this.aiService.setCurrentGridData(this.reportingTemplates);
  }

  ngOnInit(): void {
    // Setup direct AI endpoint to bypass interceptor issues
    this.aiService.createDirectAIEndpoint();
    
    // Ensure AI context is properly initialized
    this.updateAIGridContext();
  }

  ngAfterViewInit(): void {
    // Update AI context after view is initialized
    setTimeout(() => {
      this.updateAIGridContext();
      this.fixGridAlignment();
    }, 100);
  }

  /**
   * Fix grid alignment issues by ensuring header and content table widths match
   */
  private fixGridAlignment(): void {
    if (this.reportingGrid && this.reportingGrid.wrapper) {
      setTimeout(() => {
        try {
          const gridElement = this.reportingGrid.wrapper.nativeElement;
          const headerTable = gridElement.querySelector('.k-grid-header table');
          const contentTable = gridElement.querySelector('.k-grid-content table');
          
          if (headerTable && contentTable) {
            // Force table layout and widths
            headerTable.style.tableLayout = 'fixed';
            contentTable.style.tableLayout = 'fixed';
            headerTable.style.borderCollapse = 'collapse';
            contentTable.style.borderCollapse = 'collapse';
            
            // Set exact column widths
            const columnWidths = [120, 200, 150, 120, 120, 100, 100, 80, 150];
            
            // Fix header cells
            const headerCells = headerTable.querySelectorAll('th');
            headerCells.forEach((cell, index) => {
              if (columnWidths[index]) {
                cell.style.width = columnWidths[index] + 'px';
                cell.style.minWidth = columnWidths[index] + 'px';
                cell.style.maxWidth = columnWidths[index] + 'px';
                cell.style.boxSizing = 'border-box';
              }
            });
            
            // Fix content cells in all rows
            const rows = contentTable.querySelectorAll('tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              cells.forEach((cell, index) => {
                if (columnWidths[index]) {
                  cell.style.width = columnWidths[index] + 'px';
                  cell.style.minWidth = columnWidths[index] + 'px';
                  cell.style.maxWidth = columnWidths[index] + 'px';
                  cell.style.boxSizing = 'border-box';
                }
              });
            });
            
            // Clean up any debug text in headers
            headerCells.forEach((cell, index) => {
              const textContent = cell.textContent || '';
              if (textContent.includes('td.k-table') || textContent.includes('command-cell')) {
                // Remove debug text - keep only the title
                const titleSpan = cell.querySelector('.k-header-text') || cell.querySelector('[role="columnheader"]');
                if (titleSpan && index === 0) {
                  cell.textContent = 'AI Assistant';
                } else if (!titleSpan && index === 0) {
                  cell.textContent = 'AI Assistant';
                }
              }
            });
            
            console.log('Grid alignment fixed and debug text cleaned');
          }
        } catch (error) {
          console.warn('Could not fix grid alignment:', error);
        }
      }, 100);
    }
  }

  public toggleAI(): void {
    const newState = this.aiService.toggleAI();
    console.log(`AI ${newState ? 'enabled' : 'disabled'} by user`);
    // Update grid data context when toggling
    this.updateAIGridContext();
  }

  /**
   * Update AI service with current grid data
   */
  private updateAIGridContext(): void {
    console.log('Updating AI grid context with', this.reportingTemplates.length, 'templates');
    this.aiService.setCurrentGridData(this.reportingTemplates);
    
    // Also make data available globally for the interceptor
    (window as any).currentGridData = this.reportingTemplates;
  }

  public resetReportingChanges(): void {
    this.reportingSortDescriptors = [];
    this.reportingGroupDescriptors = [];
    this.reportingFilterDescriptor = null;
    this.reportingTemplates = reportingData;
    this.highlightedTemplateIds.clear();
    this.hasReportingDataOperations = false;
    // Update AI context after reset
    this.updateAIGridContext();
    // Force grid refresh to clear highlighting
    this.refreshGridView();
  }

  public reportingRowClass = (context: any) => {
    const index = context.index;
    const dataItem = context.dataItem;
    
    // Debug logging to help identify alignment issues
    if (this.highlightedTemplateIds.has(index)) {
      console.log(`Highlighting row at index ${index} for template:`, dataItem?.templateName);
    }
    
    return this.highlightedTemplateIds.has(index) ? 'highlighted-row' : '';
  };

  public onReportingResponseSuccess(event: any): void {
    console.log('Reporting AI Response Success:', event);
    
    // Ensure AI has current grid data context
    this.updateAIGridContext();
    
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
      
      // Add to custom outputs for history
      if (responseData.messages && responseData.messages.length > 0) {
        const output: PromptOutput = {
          id: this.outputIdCounter.toString(),
          output: responseData.messages.join(' '),
          prompt: event.prompt || 'AI Assistant Request'
        };
        this.addCustomOutput(output);
        this.outputIdCounter++;
      }
    } else {
      console.warn('No response data found in reporting event');
    }
  }

  public onReportingResponseError(event: any): void {
    console.error('Reporting AI Response Error:', event);
    
    // Add error to custom outputs
    const output: PromptOutput = {
      id: this.outputIdCounter.toString(),
      output: 'Sorry, there was an error processing your request. Please try again.',
      prompt: event.prompt || 'AI Assistant Request'
    };
    this.addCustomOutput(output);
    this.outputIdCounter++;
  }

  // AI Column Assistant Methods - Enhanced for comprehensive analysis
  public onAIButtonClick(dataItem: ReportingTemplate, anchor: ElementRef): void {
    console.log('AI Assistant clicked for:', dataItem.templateName);
    
    this.currentDataItem = dataItem;
    
    // Enhanced prompt commands specific to reporting templates with all AI features
    const promptCommands: InlineAIPromptCommand[] = [
      // Analysis Commands
      {
        id: 'analyze',
        text: '📊 Analyze this template',
        icon: 'k-i-chart-line-markers'
      },
      {
        id: 'compare',
        text: '🔍 Compare with similar templates',
        icon: 'k-i-compare'
      },
      {
        id: 'highlight-similar',
        text: '🔍 Highlight similar templates in grid',
        icon: 'k-i-highlight'
      },
      
      // Information Commands  
      {
        id: 'explain',
        text: '❓ Explain template purpose',
        icon: 'k-i-question'
      },
      {
        id: 'history',
        text: '📅 Show template history',
        icon: 'k-i-calendar'
      },
      
      // Norwegian Commands
      {
        id: 'analyser',
        text: '📊 Analyser denne malen',
        icon: 'k-i-chart-line-markers'
      },
      {
        id: 'sammenlign',
        text: '🔍 Sammenlign med lignende maler',
        icon: 'k-i-compare'
      },
      {
        id: 'marker-lignende',
        text: '🔍 Marker lignende maler i rutenett',
        icon: 'k-i-highlight'
      },
      {
        id: 'forklar',
        text: '❓ Forklar malens formål',
        icon: 'k-i-question'
      },
      {
        id: 'historikk',
        text: '📅 Vis malhistorikk',
        icon: 'k-i-calendar'
      }
    ];

    // Enhanced output actions
    const outputActions: InlineAIPromptOutputAction[] = [
      {
        name: 'copy',
        text: 'Copy to Clipboard'
      },
      {
        name: 'highlight',
        text: 'Highlight in Grid'
      },
      {
        name: 'filter',
        text: 'Filter Similar'
      },
      {
        name: 'discard'
      }
    ];

    try {
      this.inlineAIPromptInstance = this.promptService.open({
        popupSettings: { 
          anchor: anchor,
          popupClass: 'ai-column-assistant-popup'
        },
        promptCommands: promptCommands,
        outputActions: outputActions
      });

      const promptComponentInstance = this.inlineAIPromptInstance.content.instance;

      // Handle manual prompts with enhanced processing
      promptComponentInstance.promptRequest.subscribe((event: InlineAIPromptRequestEvent) => {
        this.handleAIRequest(dataItem, event.prompt);
      });

      // Handle command executions with special actions for grid operations
      promptComponentInstance.commandExecute.subscribe((command: InlineAIPromptCommand) => {
        this.handleAIRequest(dataItem, command.text);
      });

      // Handle output actions for grid integration
      if (promptComponentInstance.outputAction) {
        promptComponentInstance.outputAction.subscribe((action: any) => {
          this.handleColumnAIAction(dataItem, action);
        });
      }

    } catch (error) {
      console.error('Error opening AI prompt:', error);
    }
  }

  private handleAIRequest(dataItem: ReportingTemplate, prompt: string): void {
    console.log('Handling AI request:', prompt, 'for:', dataItem.templateName);
    
    // Create output object
    const outputId = this.outputIdCounter.toString();
    const output: PromptOutput = {
      id: outputId,
      output: '',
      prompt: prompt
    };

    this.promptOutput = output;
    this.outputIdCounter++;

    // Create context-aware prompt for the AI service
    const contextualPrompt = this.buildContextualPrompt(dataItem, prompt);
    
    // Call AI service
    this.aiService.generateGridResponse(contextualPrompt)
      .then((response) => this.onAIResponseSuccess(response))
      .catch((error) => this.onAIResponseError(error));
  }

  private buildContextualPrompt(dataItem: ReportingTemplate, userPrompt: string): string {
    // Detect if this is a Norwegian command
    const isNorwegian = userPrompt.includes('Analyser') || userPrompt.includes('Forklar') || 
                       userPrompt.includes('malen') || userPrompt.includes('formål');
    
    if (isNorwegian) {
      const context = `
      Du analyserer en rapporteringsmal med følgende detaljer:
      - Malnavn: ${dataItem.templateName}
      - Eier: ${dataItem.ownerName}
      - Opprettet dato: ${dataItem.formattedCreatedDate}
      - Sist oppdatert: ${dataItem.formattedLastUpdatedDate}
      - Status: ${dataItem.isLockedStringValue}
      - Tilgangsrettigheter: ${dataItem.isGlobalStringValue}
      - Organisasjon: ${dataItem.createdOrg}
      - Dokument Widget: ${dataItem.isDocWidgetStringValue}
      
      Brukers spørsmål: ${userPrompt}
      
      Vennligst gi et nyttig, kortfattet svar på norsk om denne rapporteringsmalen.
      `;
      
      return context;
    } else {
      const context = `
      You are analyzing a reporting template with the following details:
      - Template Name: ${dataItem.templateName}
      - Owner: ${dataItem.ownerName}
      - Created Date: ${dataItem.formattedCreatedDate}
      - Last Updated: ${dataItem.formattedLastUpdatedDate}
      - Status: ${dataItem.isLockedStringValue}
      - Access Rights: ${dataItem.isGlobalStringValue}
      - Organization: ${dataItem.createdOrg}
      - Doc Widget: ${dataItem.isDocWidgetStringValue}
      
      User Question: ${userPrompt}
      
      Please provide a helpful, concise response about this reporting template.
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
      responseText = 'AI analysis completed successfully.';
    }

    if (this.promptOutput) {
      // Update the current output
      this.promptOutput = { 
        ...this.promptOutput, 
        output: responseText 
      };
      
      // Add to custom outputs
      this.addCustomOutput(this.promptOutput);
      
      if (this.inlineAIPromptInstance?.content?.instance) {
        this.inlineAIPromptInstance.content.instance.promptOutput = { ...this.promptOutput };
      }
    }
  }

  private onAIResponseError(error: any): void {
    console.error('AI Response Error:', error);
    
    const errorMessage = 'Sorry, I encountered an error while analyzing this template. Please try again.';
    
    if (this.promptOutput) {
      this.promptOutput = { 
        ...this.promptOutput, 
        output: errorMessage 
      };
      
      // Add error output to custom outputs
      this.addCustomOutput(this.promptOutput);
      
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

  /**
   * Handle output actions from Column AI Assistant for grid integration
   */
  private handleColumnAIAction(dataItem: ReportingTemplate, action: any): void {
    console.log('Handling Column AI Action:', action, 'for:', dataItem.templateName);
    
    switch (action.name) {
      case 'highlight':
        // Highlight similar templates in the grid
        this.highlightSimilarTemplates(dataItem);
        break;
      
      case 'filter':
        // Filter to show similar templates
        this.filterSimilarTemplates(dataItem);
        break;
        
      case 'copy':
        // Copy analysis to clipboard
        if (this.promptOutput) {
          navigator.clipboard.writeText(this.promptOutput.output);
          console.log('Analysis copied to clipboard');
        }
        break;
        
      default:
        console.log('Unknown action:', action.name);
    }
  }

  /**
   * Highlight templates similar to the selected one - AI-Powered Row Highlight
   */
  private highlightSimilarTemplates(dataItem: ReportingTemplate): void {
    this.highlightedTemplateIds.clear();
    
    this.reportingTemplates.forEach((template, index) => {
      // Highlight templates with same owner or same status
      if (template.ownerName === dataItem.ownerName || 
          template.isLocked === dataItem.isLocked ||
          template.isGlobalStringValue === dataItem.isGlobalStringValue) {
        this.highlightedTemplateIds.add(index);
      }
    });
    
    this.hasReportingDataOperations = this.highlightedTemplateIds.size > 0;
    console.log(`Highlighted ${this.highlightedTemplateIds.size} similar templates`);
    
    // Force grid refresh to apply highlighting
    this.refreshGridView();
  }

  /**
   * Filter to show templates similar to the selected one
   */
  private filterSimilarTemplates(dataItem: ReportingTemplate): void {
    // Create filter for similar templates (same owner)
    this.reportingFilterDescriptor = {
      logic: 'or',
      filters: [
        { field: 'ownerName', operator: 'eq', value: dataItem.ownerName },
        { field: 'isLocked', operator: 'eq', value: dataItem.isLocked }
      ]
    };
    
    if (this.reportingGrid) {
      this.reportingGrid.filter = this.reportingFilterDescriptor;
    }
    
    this.hasReportingDataOperations = true;
    console.log(`Filtered to show templates similar to: ${dataItem.templateName}`);
  }

  private generateEnglishAnalysis(template: ReportingTemplate): string {
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

  private generateNorwegianAnalysis(template: ReportingTemplate): string {
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
    console.log('Current grid data length:', this.reportingTemplates.length);
    
    // Always update grid data context before AI processing
    this.updateAIGridContext();
    
    // Handle the request directly to bypass interceptor issues
    if (event && event.prompt) {
      this.handleDirectAIRequest(event.prompt, event);
    }
  }

  /**
   * Handle AI request directly without going through the interceptor
   */
  private handleDirectAIRequest(prompt: string, originalEvent: any): void {
    console.log('Handling direct AI request:', prompt);
    
    // Check if AI is enabled
    if (!this.aiService.isAIEnabled) {
      this.onReportingResponseSuccess({
        response: {
          body: {
            messages: ['AI assistant is currently disabled. Please enable it to use AI features.'],
            highlight: [],
            disabled: true
          }
        }
      });
      return;
    }

    try {
      // Generate AI response directly
      this.aiService.generateGridResponse(prompt)
        .then(response => {
          console.log('Direct AI response:', response);
          this.onReportingResponseSuccess({
            response: {
              body: response
            }
          });
        })
        .catch(error => {
          console.error('Direct AI request error:', error);
          // Provide fallback response for headers.has errors
          if (error.message && error.message.includes('headers.has')) {
            console.warn('Headers.has error detected, providing fallback response');
            this.onReportingResponseSuccess({
              response: {
                body: {
                  messages: [`Processed request: ${prompt}`],
                  highlight: []
                }
              }
            });
          } else {
            this.onReportingResponseError(error);
          }
        });
    } catch (syncError) {
      console.error('Synchronous error in handleDirectAIRequest:', syncError);
      // Provide immediate fallback
      this.onReportingResponseSuccess({
        response: {
          body: {
            messages: [`Processing: ${prompt}`],
            highlight: []
          }
        }
      });
    }
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

  /**
   * Force the grid to refresh its view to apply row highlighting
   */
  private refreshGridView(): void {
    if (this.reportingGrid) {
      // Trigger a change detection to refresh row classes
      setTimeout(() => {
        try {
          // Force the grid to re-evaluate row classes by updating the data reference
          this.reportingTemplates = [...this.reportingTemplates];
          // Also fix alignment after data refresh
          this.fixGridAlignment();
        } catch (error) {
          console.warn('Grid refresh failed:', error);
        }
      }, 50);
    }
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

  private addCustomOutput(output: PromptOutput): void {
    // Check if output already exists (by ID) to avoid duplicates
    const existingIndex = this.customOutputs.findIndex(o => o.id === output.id);
    if (existingIndex !== -1) {
      this.customOutputs[existingIndex] = output;
    } else {
      this.customOutputs.unshift(output);
      // Keep only last 10 outputs
      if (this.customOutputs.length > 10) {
        this.customOutputs = this.customOutputs.slice(0, 10);
      }
    }
    
    // Update the prompt settings to reflect current outputs
    this.reportingAiPromptSettings.promptOutputs = [...this.customOutputs];
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
