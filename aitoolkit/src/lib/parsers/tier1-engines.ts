// =============================================================================
// TIER 1 ENGINES - COMPLETE IMPLEMENTATION (100%)
// =============================================================================
// 1. NonColumnExclusionEngine - Filter garbage fields (with Telerik/DevExpress)
// 2. MultiFileMergeEngine - Merge Create/Edit/Index into single entity
// 3. PKResolutionEngine - Context-aware PK vs FK detection (with GUID/Composite)
// 4. UniqueDetectionEngine - data-val-remote + JS CheckExists + fetch/axios
// 5. ViewModelFilteringEngine - Detect non-column ViewModel fields
// 6. ContextAwareConstraintWeightingEngine - Weight constraints by view context
// 7. ViewComponentResolutionEngine - Extract fields from ViewComponents
// 8. EditorForTemplateEngine - Detect EditorFor templates
// =============================================================================

// =============================================================================
// SECTION 1: NON-COLUMN EXCLUSION RULES (EXPANDED)
// =============================================================================

export interface ExclusionRule {
  pattern: RegExp
  reason: string
  category: 'csrf' | 'pagination' | 'ui_state' | 'dropdown_data' | 'search' | 'navigation' | 'file_upload' | 'hidden_id' | 'telerik' | 'devexpress' | 'viewmodel_state' | 'computed' | 'temp_field'
}

export const NON_COLUMN_RULES: ExclusionRule[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // CSRF / Anti-Forgery Tokens
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^__RequestVerificationToken$/i, reason: 'CSRF anti-forgery token', category: 'csrf' },
  { pattern: /^__RequestVerificationToken\w*$/i, reason: 'CSRF anti-forgery token variant', category: 'csrf' },
  { pattern: /^__AntiforgeryField$/i, reason: 'Anti-forgery field', category: 'csrf' },
  { pattern: /^__AntiXsrfToken$/i, reason: 'Anti-XSRF token', category: 'csrf' },
  { pattern: /^_RequestVerificationToken$/i, reason: 'CSRF token (underscore prefix)', category: 'csrf' },
  { pattern: /^AntiForgeryToken$/i, reason: 'Anti-forgery token', category: 'csrf' },
  { pattern: /^CsrfToken$/i, reason: 'CSRF token', category: 'csrf' },
  { pattern: /^XsrfToken$/i, reason: 'XSRF token', category: 'csrf' },
  { pattern: /^_csrf$/i, reason: 'CSRF token (underscore)', category: 'csrf' },
  { pattern: /^_token$/i, reason: 'Generic token', category: 'csrf' },

  // ═══════════════════════════════════════════════════════════════════════
  // ASP.NET WebForms Hidden Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^__VIEWSTATE$/i, reason: 'WebForms ViewState', category: 'hidden_id' },
  { pattern: /^__VIEWSTATEGENERATOR$/i, reason: 'WebForms ViewState Generator', category: 'hidden_id' },
  { pattern: /^__VIEWSTATEENCRYPTED$/i, reason: 'WebForms Encrypted ViewState', category: 'hidden_id' },
  { pattern: /^__EVENTVALIDATION$/i, reason: 'WebForms Event Validation', category: 'hidden_id' },
  { pattern: /^__EVENTTARGET$/i, reason: 'WebForms Event Target', category: 'hidden_id' },
  { pattern: /^__EVENTARGUMENT$/i, reason: 'WebForms Event Argument', category: 'hidden_id' },
  { pattern: /^__ASYNCPOST$/i, reason: 'WebForms Async Post', category: 'hidden_id' },
  { pattern: /^__LASTFOCUS$/i, reason: 'WebForms Last Focus', category: 'hidden_id' },
  { pattern: /^__SCROLLPOSITIONX$/i, reason: 'WebForms Scroll Position X', category: 'hidden_id' },
  { pattern: /^__SCROLLPOSITIONY$/i, reason: 'WebForms Scroll Position Y', category: 'hidden_id' },

  // ═══════════════════════════════════════════════════════════════════════
  // Pagination Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^page(?:Number|Index|Num|No)?$/i, reason: 'Pagination page number', category: 'pagination' },
  { pattern: /^pageSize$/i, reason: 'Pagination page size', category: 'pagination' },
  { pattern: /^currentPage$/i, reason: 'Pagination current page', category: 'pagination' },
  { pattern: /^perPage$/i, reason: 'Pagination per page', category: 'pagination' },
  { pattern: /^offset$/i, reason: 'Pagination offset', category: 'pagination' },
  { pattern: /^limit$/i, reason: 'Pagination limit', category: 'pagination' },
  { pattern: /^take$/i, reason: 'Pagination take', category: 'pagination' },
  { pattern: /^skip$/i, reason: 'Pagination skip', category: 'pagination' },
  { pattern: /^rowsPerPage$/i, reason: 'Rows per page', category: 'pagination' },
  { pattern: /^itemsPerPage$/i, reason: 'Items per page', category: 'pagination' },
  { pattern: /^recordsPerPage$/i, reason: 'Records per page', category: 'pagination' },
  { pattern: /^totalPages$/i, reason: 'Total pages', category: 'pagination' },
  { pattern: /^totalRecords$/i, reason: 'Total records', category: 'pagination' },
  { pattern: /^recordCount$/i, reason: 'Record count', category: 'pagination' },

  // ═══════════════════════════════════════════════════════════════════════
  // Search / Filter / Sort Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^search(?:Term|Query|Text|String|Value|Key|Filter)?$/i, reason: 'Search parameter', category: 'search' },
  { pattern: /^filter(?:By|Value|Text|Query|Key|Expression)?$/i, reason: 'Filter parameter', category: 'search' },
  { pattern: /^sort(?:By|Field|Column|Direction|Order|Expression)?$/i, reason: 'Sort parameter', category: 'search' },
  { pattern: /^order(?:By|Direction|Field|Type)?$/i, reason: 'Order parameter', category: 'search' },
  { pattern: /^sortDirection$/i, reason: 'Sort direction', category: 'search' },
  { pattern: /^sortOrder$/i, reason: 'Sort order', category: 'search' },
  { pattern: /^keyword$/i, reason: 'Search keyword', category: 'search' },
  { pattern: /^query$/i, reason: 'Search query', category: 'search' },
  { pattern: /^q$/i, reason: 'Search query (short)', category: 'search' },
  { pattern: /^searchable\w*$/i, reason: 'Searchable field indicator', category: 'search' },
  { pattern: /^filterable\w*$/i, reason: 'Filterable field indicator', category: 'search' },
  { pattern: /^sortable\w*$/i, reason: 'Sortable field indicator', category: 'search' },
  { pattern: /^grid\w+Filter$/i, reason: 'Grid filter', category: 'search' },
  { pattern: /^table\w+Sort$/i, reason: 'Table sort', category: 'search' },

  // ═══════════════════════════════════════════════════════════════════════
  // Navigation Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^returnUrl$/i, reason: 'Navigation return URL', category: 'navigation' },
  { pattern: /^redirectUrl$/i, reason: 'Navigation redirect URL', category: 'navigation' },
  { pattern: /^redirect(?:To)?$/i, reason: 'Navigation redirect', category: 'navigation' },
  { pattern: /^nextUrl$/i, reason: 'Navigation next URL', category: 'navigation' },
  { pattern: /^previousUrl$/i, reason: 'Navigation previous URL', category: 'navigation' },
  { pattern: /^fromUrl$/i, reason: 'Navigation from URL', category: 'navigation' },
  { pattern: /^continueUrl$/i, reason: 'Continue URL', category: 'navigation' },
  { pattern: /^cancelUrl$/i, reason: 'Cancel URL', category: 'navigation' },
  { pattern: /^successUrl$/i, reason: 'Success URL', category: 'navigation' },
  { pattern: /^errorUrl$/i, reason: 'Error URL', category: 'navigation' },
  { pattern: /^callbackUrl$/i, reason: 'Callback URL', category: 'navigation' },
  { pattern: /^referrer$/i, reason: 'Referrer URL', category: 'navigation' },
  { pattern: /^referer$/i, reason: 'Referer URL', category: 'navigation' },

  // ═══════════════════════════════════════════════════════════════════════
  // UI State Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^isEdit(?:Mode|ing)?$/i, reason: 'UI state: edit mode', category: 'ui_state' },
  { pattern: /^isCreate(?:Mode)?$/i, reason: 'UI state: create mode', category: 'ui_state' },
  { pattern: /^isView(?:Mode)?$/i, reason: 'UI state: view mode', category: 'ui_state' },
  { pattern: /^isDelete(?:Mode)?$/i, reason: 'UI state: delete mode', category: 'ui_state' },
  { pattern: /^isDetail(?:Mode)?$/i, reason: 'UI state: detail mode', category: 'ui_state' },
  { pattern: /^activeTab$/i, reason: 'UI state: active tab', category: 'ui_state' },
  { pattern: /^selectedTab$/i, reason: 'UI state: selected tab', category: 'ui_state' },
  { pattern: /^currentTab$/i, reason: 'UI state: current tab', category: 'ui_state' },
  { pattern: /^activePanel$/i, reason: 'UI state: active panel', category: 'ui_state' },
  { pattern: /^selectedPanel$/i, reason: 'UI state: selected panel', category: 'ui_state' },
  { pattern: /^viewMode$/i, reason: 'UI state: view mode', category: 'ui_state' },
  { pattern: /^displayMode$/i, reason: 'UI state: display mode', category: 'ui_state' },
  { pattern: /^formMode$/i, reason: 'UI state: form mode', category: 'ui_state' },
  { pattern: /^mode$/i, reason: 'UI state: mode', category: 'ui_state' },
  { pattern: /^action$/i, reason: 'UI state: action', category: 'ui_state' },
  { pattern: /^submitAction$/i, reason: 'UI state: submit action', category: 'ui_state' },
  { pattern: /^button(?:Click|Action)?$/i, reason: 'UI state: button', category: 'ui_state' },
  { pattern: /^isReadOnly$/i, reason: 'UI state: read only', category: 'ui_state' },
  { pattern: /^isDisabled$/i, reason: 'UI state: disabled', category: 'ui_state' },
  { pattern: /^isHidden$/i, reason: 'UI state: hidden', category: 'ui_state' },
  { pattern: /^isExpanded$/i, reason: 'UI state: expanded', category: 'ui_state' },
  { pattern: /^isCollapsed$/i, reason: 'UI state: collapsed', category: 'ui_state' },
  { pattern: /^isVisible$/i, reason: 'UI state: visible', category: 'ui_state' },
  { pattern: /^show\w+$/i, reason: 'UI state: show flag', category: 'ui_state' },
  { pattern: /^hide\w+$/i, reason: 'UI state: hide flag', category: 'ui_state' },
  { pattern: /^enable\w+$/i, reason: 'UI state: enable flag', category: 'ui_state' },
  { pattern: /^disable\w+$/i, reason: 'UI state: disable flag', category: 'ui_state' },
  { pattern: /^canEdit$/i, reason: 'UI state: can edit', category: 'ui_state' },
  { pattern: /^canDelete$/i, reason: 'UI state: can delete', category: 'ui_state' },
  { pattern: /^canView$/i, reason: 'UI state: can view', category: 'ui_state' },
  { pattern: /^hasAccess$/i, reason: 'UI state: has access', category: 'ui_state' },
  { pattern: /^hasPermission$/i, reason: 'UI state: has permission', category: 'ui_state' },

  // ═══════════════════════════════════════════════════════════════════════
  // Dropdown Data Fields (NOT FK columns)
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /\w+List$/i, reason: 'Dropdown data source (SelectList)', category: 'dropdown_data' },
  { pattern: /\w+Items$/i, reason: 'Dropdown items collection', category: 'dropdown_data' },
  { pattern: /\w+Options$/i, reason: 'Dropdown options collection', category: 'dropdown_data' },
  { pattern: /\w+SelectList$/i, reason: 'SelectList for dropdown', category: 'dropdown_data' },
  { pattern: /\w+Dropdown$/i, reason: 'Dropdown data', category: 'dropdown_data' },
  { pattern: /\w+DDL$/i, reason: 'DDL dropdown data', category: 'dropdown_data' },
  { pattern: /\w+Data$/i, reason: 'Generic data collection', category: 'dropdown_data' },
  { pattern: /\w+DataSource$/i, reason: 'Data source for controls', category: 'dropdown_data' },
  { pattern: /available\w+$/i, reason: 'Available items list', category: 'dropdown_data' },
  { pattern: /\w+Choices$/i, reason: 'Choices for selection', category: 'dropdown_data' },
  { pattern: /\w+Collection$/i, reason: 'Collection for display', category: 'dropdown_data' },
  { pattern: /\w+Values$/i, reason: 'Values collection', category: 'dropdown_data' },
  { pattern: /^all\w+$/i, reason: 'All items collection', category: 'dropdown_data' },

  // ═══════════════════════════════════════════════════════════════════════
  // Selected Multi-Select Fields (M:M selectors, not columns)
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^selected\w+Ids$/i, reason: 'M:M selector (selected IDs)', category: 'dropdown_data' },
  { pattern: /^selected\w+Values$/i, reason: 'Multi-select values', category: 'dropdown_data' },
  { pattern: /^selected\w+Items$/i, reason: 'Multi-select items', category: 'dropdown_data' },
  { pattern: /^chosen\w+Ids$/i, reason: 'M:M selector (chosen IDs)', category: 'dropdown_data' },
  { pattern: /^chosen\w+Items$/i, reason: 'Chosen items', category: 'dropdown_data' },
  { pattern: /^assigned\w+Ids$/i, reason: 'Assigned items IDs', category: 'dropdown_data' },

  // ═══════════════════════════════════════════════════════════════════════
  // Display-Only Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /\w+Display$/i, reason: 'Display-only field', category: 'computed' },
  { pattern: /\w+DisplayName$/i, reason: 'Display name', category: 'computed' },
  { pattern: /\w+DisplayText$/i, reason: 'Display text', category: 'computed' },
  { pattern: /\w+DisplayValue$/i, reason: 'Display value', category: 'computed' },
  { pattern: /\w+Label$/i, reason: 'Label field', category: 'computed' },
  { pattern: /\w+Caption$/i, reason: 'Caption field', category: 'computed' },
  { pattern: /\w+Text$/i, reason: 'Text display field', category: 'computed' },
  { pattern: /\w+Formatted$/i, reason: 'Formatted display', category: 'computed' },
  { pattern: /\w+String$/i, reason: 'String representation', category: 'computed' },
  { pattern: /\w+Description$/i, reason: 'Description field', category: 'computed' },

  // ═══════════════════════════════════════════════════════════════════════
  // Computed/Aggregate Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^total\w+$/i, reason: 'Computed total', category: 'computed' },
  { pattern: /^count\w+$/i, reason: 'Computed count', category: 'computed' },
  { pattern: /^sum\w+$/i, reason: 'Computed sum', category: 'computed' },
  { pattern: /^average\w+$/i, reason: 'Computed average', category: 'computed' },
  { pattern: /^avg\w+$/i, reason: 'Computed average', category: 'computed' },
  { pattern: /^min\w+$/i, reason: 'Computed min', category: 'computed' },
  { pattern: /^max\w+$/i, reason: 'Computed max', category: 'computed' },
  { pattern: /^calculated\w+$/i, reason: 'Calculated field', category: 'computed' },
  { pattern: /^computed\w+$/i, reason: 'Computed field', category: 'computed' },
  { pattern: /^derived\w+$/i, reason: 'Derived field', category: 'computed' },
  { pattern: /^aggregated\w+$/i, reason: 'Aggregated field', category: 'computed' },
  { pattern: /\w+Aggregate$/i, reason: 'Aggregate field', category: 'computed' },
  { pattern: /\w+Summary$/i, reason: 'Summary field', category: 'computed' },

  // ═══════════════════════════════════════════════════════════════════════
  // TELERIK / KENDO UI Control Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^kendo\w+$/i, reason: 'Kendo UI control field', category: 'telerik' },
  { pattern: /^Kendo\w+$/i, reason: 'Kendo UI component', category: 'telerik' },
  { pattern: /\w+_kendo\w*$/i, reason: 'Kendo UI bound field', category: 'telerik' },
  { pattern: /^grid\w+Settings$/i, reason: 'Kendo Grid settings', category: 'telerik' },
  { pattern: /^grid\w+DataSource$/i, reason: 'Kendo Grid data source', category: 'telerik' },
  { pattern: /^grid\w+Columns$/i, reason: 'Kendo Grid columns', category: 'telerik' },
  { pattern: /^grid\w+Filter$/i, reason: 'Kendo Grid filter', category: 'telerik' },
  { pattern: /^grid\w+Sort$/i, reason: 'Kendo Grid sort', category: 'telerik' },
  { pattern: /^grid\w+Group$/i, reason: 'Kendo Grid group', category: 'telerik' },
  { pattern: /^grid\w+Page$/i, reason: 'Kendo Grid page', category: 'telerik' },
  { pattern: /^scheduler\w+$/i, reason: 'Kendo Scheduler field', category: 'telerik' },
  { pattern: /^chart\w+Series$/i, reason: 'Kendo Chart series', category: 'telerik' },
  { pattern: /^chart\w+Options$/i, reason: 'Kendo Chart options', category: 'telerik' },
  { pattern: /^treeview\w+$/i, reason: 'Kendo TreeView field', category: 'telerik' },
  { pattern: /^dropdownlist\w*$/i, reason: 'Kendo DropDownList', category: 'telerik' },
  { pattern: /^combobox\w*$/i, reason: 'Kendo ComboBox', category: 'telerik' },
  { pattern: /^multiselect\w*$/i, reason: 'Kendo MultiSelect', category: 'telerik' },
  { pattern: /^datepicker\w*$/i, reason: 'Kendo DatePicker', category: 'telerik' },
  { pattern: /^datetimepicker\w*$/i, reason: 'Kendo DateTimePicker', category: 'telerik' },
  { pattern: /^numerictextbox\w*$/i, reason: 'Kendo NumericTextBox', category: 'telerik' },
  { pattern: /^editor\w+Value$/i, reason: 'Kendo Editor value', category: 'telerik' },
  { pattern: /^upload\w+Files$/i, reason: 'Kendo Upload files', category: 'telerik' },
  { pattern: /^window\w+Content$/i, reason: 'Kendo Window content', category: 'telerik' },
  { pattern: /^tabstrip\w+$/i, reason: 'Kendo TabStrip field', category: 'telerik' },
  { pattern: /^panelbar\w+$/i, reason: 'Kendo PanelBar field', category: 'telerik' },

  // ═══════════════════════════════════════════════════════════════════════
  // DEVEXPRESS Control Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^ASPx\w+$/i, reason: 'DevExpress ASPx control', category: 'devexpress' },
  { pattern: /^dx\w+$/i, reason: 'DevExpress dx control', category: 'devexpress' },
  { pattern: /^gridView\w+$/i, reason: 'DevExpress GridView field', category: 'devexpress' },
  { pattern: /^gridView\w+Settings$/i, reason: 'DevExpress GridView settings', category: 'devexpress' },
  { pattern: /^gridView\w+DataSource$/i, reason: 'DevExpress GridView data source', category: 'devexpress' },
  { pattern: /^gridView\w+Columns$/i, reason: 'DevExpress GridView columns', category: 'devexpress' },
  { pattern: /^pivotGrid\w+$/i, reason: 'DevExpress PivotGrid field', category: 'devexpress' },
  { pattern: /^cardView\w+$/i, reason: 'DevExpress CardView field', category: 'devexpress' },
  { pattern: /^treeList\w+$/i, reason: 'DevExpress TreeList field', category: 'devexpress' },
  { pattern: /^dataView\w+$/i, reason: 'DevExpress DataView field', category: 'devexpress' },
  { pattern: /^chart\w+Settings$/i, reason: 'DevExpress Chart settings', category: 'devexpress' },
  { pattern: /^chart\w+Series$/i, reason: 'DevExpress Chart series', category: 'devexpress' },
  { pattern: /^report\w+$/i, reason: 'DevExpress Report field', category: 'devexpress' },
  { pattern: /^spreadsheet\w+$/i, reason: 'DevExpress Spreadsheet field', category: 'devexpress' },
  { pattern: /^richEdit\w+$/i, reason: 'DevExpress RichEdit field', category: 'devexpress' },
  { pattern: /^memo\w+$/i, reason: 'DevExpress Memo field', category: 'devexpress' },
  { pattern: /^comboBox\w+$/i, reason: 'DevExpress ComboBox', category: 'devexpress' },
  { pattern: /^dateEdit\w+$/i, reason: 'DevExpress DateEdit', category: 'devexpress' },
  { pattern: /^spinEdit\w+$/i, reason: 'DevExpress SpinEdit', category: 'devexpress' },
  { pattern: /^checkEdit\w+$/i, reason: 'DevExpress CheckEdit', category: 'devexpress' },
  { pattern: /^radioGroup\w+$/i, reason: 'DevExpress RadioGroup', category: 'devexpress' },
  { pattern: /^listBox\w+$/i, reason: 'DevExpress ListBox', category: 'devexpress' },
  { pattern: /^tokenBox\w+$/i, reason: 'DevExpress TokenBox', category: 'devexpress' },
  { pattern: /^lookup\w+$/i, reason: 'DevExpress Lookup', category: 'devexpress' },
  { pattern: /^callbackPanel\w+$/i, reason: 'DevExpress CallbackPanel', category: 'devexpress' },
  { pattern: /^popupControl\w+$/i, reason: 'DevExpress PopupControl', category: 'devexpress' },
  { pattern: /^pageControl\w+$/i, reason: 'DevExpress PageControl', category: 'devexpress' },
  { pattern: /^menu\w+$/i, reason: 'DevExpress Menu field', category: 'devexpress' },
  { pattern: /^navbar\w+$/i, reason: 'DevExpress Navbar field', category: 'devexpress' },
  { pattern: /^toolbar\w+$/i, reason: 'DevExpress Toolbar field', category: 'devexpress' },

  // ═══════════════════════════════════════════════════════════════════════
  // ViewModel State Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^viewModel$/i, reason: 'ViewModel reference', category: 'viewmodel_state' },
  { pattern: /^modelState$/i, reason: 'ModelState dictionary', category: 'viewmodel_state' },
  { pattern: /^validationState$/i, reason: 'Validation state', category: 'viewmodel_state' },
  { pattern: /^errorState$/i, reason: 'Error state', category: 'viewmodel_state' },
  { pattern: /^successState$/i, reason: 'Success state', category: 'viewmodel_state' },
  { pattern: /^loadingState$/i, reason: 'Loading state', category: 'viewmodel_state' },
  { pattern: /^isSubmitting$/i, reason: 'Form submitting state', category: 'viewmodel_state' },
  { pattern: /^isValid$/i, reason: 'Validation state', category: 'viewmodel_state' },
  { pattern: /^hasError$/i, reason: 'Error state', category: 'viewmodel_state' },
  { pattern: /^hasChanges$/i, reason: 'Change tracking state', category: 'viewmodel_state' },
  { pattern: /^isDirty$/i, reason: 'Dirty state', category: 'viewmodel_state' },
  { pattern: /^isPristine$/i, reason: 'Pristine state', category: 'viewmodel_state' },
  { pattern: /^isTouched$/i, reason: 'Touched state', category: 'viewmodel_state' },
  { pattern: /^errorMessage$/i, reason: 'Error message', category: 'viewmodel_state' },
  { pattern: /^successMessage$/i, reason: 'Success message', category: 'viewmodel_state' },
  { pattern: /^warningMessage$/i, reason: 'Warning message', category: 'viewmodel_state' },
  { pattern: /^infoMessage$/i, reason: 'Info message', category: 'viewmodel_state' },
  { pattern: /^statusMessage$/i, reason: 'Status message', category: 'viewmodel_state' },

  // ═══════════════════════════════════════════════════════════════════════
  // File Upload Temporary Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^fileUpload$/i, reason: 'File upload control', category: 'file_upload' },
  { pattern: /^uploadedFile$/i, reason: 'Uploaded file reference', category: 'file_upload' },
  { pattern: /^attachment$/i, reason: 'File attachment', category: 'file_upload' },
  { pattern: /^attachments$/i, reason: 'File attachments', category: 'file_upload' },
  { pattern: /^documentUpload$/i, reason: 'Document upload', category: 'file_upload' },
  { pattern: /^imageUpload$/i, reason: 'Image upload', category: 'file_upload' },
  { pattern: /^photoUpload$/i, reason: 'Photo upload', category: 'file_upload' },
  { pattern: /^fileInput$/i, reason: 'File input', category: 'file_upload' },
  { pattern: /^fileBlob$/i, reason: 'File blob', category: 'file_upload' },
  { pattern: /^fileData$/i, reason: 'File data', category: 'file_upload' },
  { pattern: /^tempFile\w*$/i, reason: 'Temporary file', category: 'temp_field' },
  { pattern: /^sessionFile\w*$/i, reason: 'Session file', category: 'temp_field' },

  // ═══════════════════════════════════════════════════════════════════════
  // AJAX Headers and Request Fields
  // ═══════════════════════════════════════════════════════════════════════
  { pattern: /^X-Requested-With$/i, reason: 'AJAX header', category: 'hidden_id' },
  { pattern: /^X-HTTP-Method-Override$/i, reason: 'HTTP method override', category: 'hidden_id' },
  { pattern: /^X-CSRF-Token$/i, reason: 'CSRF token header', category: 'csrf' },
  { pattern: /^X-XSRF-Token$/i, reason: 'XSRF token header', category: 'csrf' },
  { pattern: /^X-API-Key$/i, reason: 'API key header', category: 'hidden_id' },
  { pattern: /^X-Auth-Token$/i, reason: 'Auth token header', category: 'hidden_id' },
  { pattern: /^Authorization$/i, reason: 'Authorization header', category: 'hidden_id' },
  { pattern: /^ContentType$/i, reason: 'Content type', category: 'hidden_id' },
]

// =============================================================================
// SECTION 2: NON-COLUMN EXCLUSION ENGINE
// =============================================================================

export class NonColumnExclusionEngine {
  private rules: ExclusionRule[]
  private customExclusions: Set<string>
  private customInclusions: Set<string>

  constructor() {
    this.rules = NON_COLUMN_RULES
    this.customExclusions = new Set()
    this.customInclusions = new Set()
  }

  shouldExclude(fieldName: string): { exclude: boolean; reason?: string; category?: string } {
    if (this.customInclusions.has(fieldName.toLowerCase())) {
      return { exclude: false }
    }

    if (this.customExclusions.has(fieldName.toLowerCase())) {
      return { exclude: true, reason: 'Custom exclusion rule', category: 'custom' }
    }

    for (const rule of this.rules) {
      if (rule.pattern.test(fieldName)) {
        return { exclude: true, reason: rule.reason, category: rule.category }
      }
    }

    return { exclude: false }
  }

  filterFields<T extends { name: string }>(
    fields: T[],
    options?: { logExclusions?: boolean; keepCategories?: string[] }
  ): { filtered: T[]; excluded: Array<{ field: T; reason: string; category: string }> } {
    const filtered: T[] = []
    const excluded: Array<{ field: T; reason: string; category: string }> = []

    for (const field of fields) {
      const result = this.shouldExclude(field.name)

      if (result.exclude) {
        if (options?.keepCategories?.includes(result.category || '')) {
          filtered.push(field)
        } else {
          excluded.push({ field, reason: result.reason || 'Unknown', category: result.category || 'unknown' })
        }
      } else {
        filtered.push(field)
      }
    }

    return { filtered, excluded }
  }

  addExclusion(fieldName: string): void { this.customExclusions.add(fieldName.toLowerCase()) }
  addInclusion(fieldName: string): void { this.customInclusions.add(fieldName.toLowerCase()) }

  getExclusionStats<T extends { name: string }>(fields: T[]): { total: number; excluded: number; byCategory: Record<string, number> } {
    const { excluded: excludedFields } = this.filterFields(fields)
    const byCategory: Record<string, number> = {}
    for (const ex of excludedFields) {
      byCategory[ex.category] = (byCategory[ex.category] || 0) + 1
    }
    return { total: fields.length, excluded: excludedFields.length, byCategory }
  }
}

// =============================================================================
// SECTION 3: VIEW TYPE DEFINITIONS
// =============================================================================

export type ViewType = 'create' | 'edit' | 'index' | 'details' | 'delete' | 'form' | 'unknown'

export interface ParsedView {
  fileName: string
  filePath?: string
  viewType: ViewType
  modelName?: string
  fields: any[]
  relationships?: any[]
  validationRules?: any[]
  scripts?: string[]
  ajaxEndpoints?: string[]
  rawContent?: string
}

export interface MergedEntity {
  entityName: string
  sourceViews: Array<{ file: string; type: ViewType; fieldCount: number }>
  fields: any[]
  primaryKey: string | null
  uniqueConstraints: string[]
  relationships: any[]
  tableCount: number
  compositePK?: string[]
}

// =============================================================================
// SECTION 4: MULTI-FILE MERGE ENGINE
// =============================================================================

export class MultiFileMergeEngine {
  private entityMap: Map<string, ParsedView[]> = new Map()

  detectViewType(fileName: string): ViewType {
    const name = fileName.toLowerCase().replace(/\.cshtml$|\.vbhtml$/i, '')
    if (name === 'create' || name.endsWith('_create') || name.includes('create')) return 'create'
    if (name === 'edit' || name.endsWith('_edit') || name.includes('edit')) return 'edit'
    if (name === 'index' || name.endsWith('_index') || name.includes('index')) return 'index'
    if (name === 'details' || name.endsWith('_details') || name.includes('details')) return 'details'
    if (name === 'delete' || name.endsWith('_delete') || name.includes('delete')) return 'delete'
    if (name.startsWith('_') || name.includes('partial') || name.includes('form')) return 'form'
    return 'unknown'
  }

  extractEntityName(fileName: string, modelName?: string): string {
    if (modelName) return modelName.replace(/ViewModel|Model|DTO|VM$/i, '')
    const pathParts = fileName.split('/')
    const viewsIndex = pathParts.findIndex(p => p.toLowerCase() === 'views')
    if (viewsIndex >= 0 && viewsIndex + 1 < pathParts.length) return pathParts[viewsIndex + 1]
    const baseName = fileName.toLowerCase().replace(/\.cshtml$|\.vbhtml$/i, '').replace(/_(create|edit|index|details|delete)$/i, '')
    return baseName.charAt(0).toUpperCase() + baseName.slice(1)
  }

  addView(view: ParsedView): void {
    const entityName = this.extractEntityName(view.fileName, view.modelName)
    if (!this.entityMap.has(entityName)) this.entityMap.set(entityName, [])
    this.entityMap.get(entityName)!.push({ ...view, viewType: view.viewType || this.detectViewType(view.fileName) })
  }

  getViewPriority(viewType: ViewType): number {
    const priorities: Record<ViewType, number> = { create: 100, form: 95, edit: 85, index: 50, details: 30, delete: 20, unknown: 40 }
    return priorities[viewType] || 40
  }

  mergeAll(): MergedEntity[] {
    const entities: MergedEntity[] = []
    for (const [entityName, views] of this.entityMap) {
      entities.push(this.mergeEntity(entityName, views))
    }
    return entities
  }

  private mergeEntity(entityName: string, views: ParsedView[]): MergedEntity {
    const sortedViews = [...views].sort((a, b) => this.getViewPriority(b.viewType) - this.getViewPriority(a.viewType))
    const fieldMap = new Map<string, any>()

    for (const view of sortedViews) {
      for (const field of view.fields) {
        if (!fieldMap.has(field.name)) {
          fieldMap.set(field.name, { ...field, sources: [view.fileName], viewTypes: [view.viewType] })
        } else {
          const existing = fieldMap.get(field.name)
          existing.sources.push(view.fileName)
          existing.viewTypes.push(view.viewType)
          // Merge constraints
          if (field.constraints && !existing.constraints?.includes(field.constraints)) {
            existing.constraints = (existing.constraints || '') + ' ' + field.constraints
          }
        }
      }
    }

    const mergedFields = Array.from(fieldMap.values())
    const primaryKey = this.detectPrimaryKey(mergedFields, entityName)
    const compositePK = this.detectCompositePK(mergedFields, entityName)

    return {
      entityName,
      sourceViews: views.map(v => ({ file: v.fileName, type: v.viewType, fieldCount: v.fields.length })),
      fields: mergedFields,
      primaryKey,
      compositePK,
      uniqueConstraints: mergedFields.filter(f => f.isUnique).map(f => f.name),
      relationships: this.deduplicateRelationships(views.flatMap(v => v.relationships || [])),
      tableCount: new Set(views.map(v => v.modelName).filter(Boolean)).size || 1
    }
  }

  private detectPrimaryKey(fields: any[], entityName: string): string | null {
    // Rule 1: Exact "Id" field
    const idField = fields.find(f => f.name === 'Id')
    if (idField) return 'Id'

    // Rule 2: EntityNameId pattern
    const entityIdField = fields.find(f => f.name === `${entityName}Id`)
    if (entityIdField) return entityIdField.name

    // Rule 3: Hidden field that appears in edit views
    const hiddenInEdit = fields.find(f => 
      f.viewTypes?.includes('edit') && 
      (f.type === 'hidden' || f.inputType === 'hidden') &&
      f.name.toLowerCase().includes('id')
    )
    if (hiddenInEdit) return hiddenInEdit.name

    // Rule 4: GUID field that looks like PK
    const guidField = fields.find(f => 
      f.sqlType === 'UNIQUEIDENTIFIER' && 
      (f.name === 'Id' || f.name === `${entityName}Id` || f.name === 'Guid' || f.name === `${entityName}Guid`)
    )
    if (guidField) return guidField.name

    return null
  }

  private detectCompositePK(fields: any[], entityName: string): string[] | undefined {
    // Look for junction table pattern: EntityAId + EntityBId (both are FKs)
    const fkFields = fields.filter(f => f.isFK && f.name.endsWith('Id'))
    
    if (fkFields.length === 2 && fields.length <= 4) {
      // Likely a junction table
      return fkFields.map(f => f.name)
    }

    // Look for explicit composite key pattern
    const pkFields = fields.filter(f => f.isPK)
    if (pkFields.length > 1) {
      return pkFields.map(f => f.name)
    }

    return undefined
  }

  private deduplicateRelationships(relationships: any[]): any[] {
    const seen = new Set<string>()
    return relationships.filter(rel => {
      const key = `${rel.type}:${rel.from}:${rel.to}:${rel.fkColumn || ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  clear(): void { this.entityMap.clear() }
}

// =============================================================================
// SECTION 5: PK RESOLUTION ENGINE (WITH GUID AND COMPOSITE SUPPORT)
// =============================================================================

export interface PKResolutionResult {
  fieldName: string
  isPK: boolean
  isFK: boolean
  isCompositePK: boolean
  compositePKFields?: string[]
  fkTable?: string
  isGUID: boolean
  confidence: number
  reason: string
  context: {
    appearsInCreate: boolean
    appearsInEdit: boolean
    isHiddenInEdit: boolean
    isHiddenInCreate: boolean
    isDropdown: boolean
    matchesEntityName: boolean
    isGUIDType: boolean
    hasIdentityPattern: boolean
  }
}

export class PKResolutionEngine {
  /**
   * Resolve a field's role (PK, FK, Composite PK, or neither)
   */
  resolve(
    fieldName: string,
    entityName: string,
    views: Array<{ viewType: ViewType; field: any }>
  ): PKResolutionResult {
    const context = {
      appearsInCreate: views.some(v => v.viewType === 'create'),
      appearsInEdit: views.some(v => v.viewType === 'edit'),
      isHiddenInEdit: views.some(v => v.viewType === 'edit' && (v.field.type === 'hidden' || v.field.inputType === 'hidden' || v.field.isHidden === true)),
      isHiddenInCreate: views.some(v => v.viewType === 'create' && (v.field.type === 'hidden' || v.field.inputType === 'hidden' || v.field.isHidden === true)),
      isDropdown: views.some(v => v.field.type === 'select' || v.field.inputType === 'select' || v.field.type === 'DropDownList'),
      matchesEntityName: fieldName === `${entityName}Id`,
      isGUIDType: this.isGUIDField(fieldName, views),
      hasIdentityPattern: views.some(v => v.field.constraints?.includes('IDENTITY') || v.field.isIdentity === true)
    }

    // === GUID PK DETECTION ===
    if (context.isGUIDType) {
      if (fieldName === 'Id' || fieldName === `${entityName}Id` || fieldName === 'Guid' || fieldName === `${entityName}Guid`) {
        return {
          fieldName, isPK: true, isFK: false, isCompositePK: false,
          isGUID: true, confidence: 90,
          reason: 'GUID field matching entity pattern = Primary Key',
          context
        }
      }
    }

    // === STANDARD PK DETECTION ===
    
    // Rule 1: "Id" is always PK
    if (fieldName === 'Id') {
      return {
        fieldName, isPK: true, isFK: false, isCompositePK: false,
        isGUID: context.isGUIDType, confidence: 95,
        reason: 'Field named "Id" is primary key by convention',
        context
      }
    }

    // Rule 2: Hidden in edit but not in create = PK
    if (context.isHiddenInEdit && !context.isHiddenInCreate && context.appearsInCreate) {
      return {
        fieldName, isPK: true, isFK: false, isCompositePK: false,
        isGUID: context.isGUIDType, confidence: 90,
        reason: 'Hidden in edit view but present in create = Primary Key',
        context
      }
    }

    // Rule 3: EntityNameId pattern when hidden in edit
    if (context.matchesEntityName && context.isHiddenInEdit) {
      return {
        fieldName, isPK: true, isFK: false, isCompositePK: false,
        isGUID: context.isGUIDType, confidence: 85,
        reason: 'Matches entity name pattern and hidden in edit = Primary Key',
        context
      }
    }

    // === FK DETECTION ===
    
    // Rule 4: Already marked as FK
    const fkView = views.find(v => v.field.isFK === true)
    if (fkView) {
      return {
        fieldName, isPK: false, isFK: true, isCompositePK: false,
        fkTable: fkView.field.fkTable || this.inferFkTable(fieldName),
        isGUID: false, confidence: 90,
        reason: 'Explicitly marked as foreign key',
        context
      }
    }

    // Rule 5: Dropdown pattern = FK
    if (context.isDropdown && fieldName.endsWith('Id') && fieldName !== 'Id') {
      return {
        fieldName, isPK: false, isFK: true, isCompositePK: false,
        fkTable: this.inferFkTable(fieldName),
        isGUID: false, confidence: 85,
        reason: 'Dropdown with Id suffix = Foreign Key',
        context
      }
    }

    // Rule 6: EntityNameId in main entity = PK
    if (context.matchesEntityName && !context.isDropdown) {
      return {
        fieldName, isPK: true, isFK: false, isCompositePK: false,
        isGUID: context.isGUIDType, confidence: 75,
        reason: 'Matches entity name pattern = likely Primary Key',
        context
      }
    }

    // Default: Not PK, not FK
    return {
      fieldName, isPK: false, isFK: false, isCompositePK: false,
      isGUID: false, confidence: 50,
      reason: 'No PK or FK indicators found',
      context
    }
  }

  private isGUIDField(fieldName: string, views: Array<{ viewType: ViewType; field: any }>): boolean {
    // Check SQL type
    if (views.some(v => v.field.sqlType === 'UNIQUEIDENTIFIER' || v.field.sqlType === 'GUID')) {
      return true
    }
    // Check field name patterns
    if (/^(Guid|UUID|Uid|UniqueIdentifier)$/i.test(fieldName)) return true
    if (/\w+(Guid|UUID|Uid)$/i.test(fieldName)) return true
    return false
  }

  private inferFkTable(fieldName: string): string {
    return fieldName.replace(/Id$/, '')
  }

  /**
   * Detect composite primary keys in an entity
   */
  detectCompositePK(entity: MergedEntity): string[] | null {
    const fields = entity.fields
    
    // Pattern 1: Junction table (M:M link table)
    // Has exactly 2 FK fields and minimal other fields
    const fkFields = fields.filter(f => f.isFK)
    if (fkFields.length === 2 && fields.length <= 4) {
      return fkFields.map(f => f.name)
    }

    // Pattern 2: Explicit composite PK markers
    // Fields with isPK=true for multiple fields
    const pkFields = fields.filter(f => f.isPK === true)
    if (pkFields.length > 1) {
      return pkFields.map(f => f.name)
    }

    // Pattern 3: Common junction table naming
    const entityName = entity.entityName
    if (entityName.includes('_') || entityName.match(/^[A-Z][a-z]+[A-Z][a-z]+$/)) {
      // Entity names like "UserOrganization", "OrderProduct", "StudentCourse"
      // These are typically junction tables
      const idFields = fields.filter(f => f.name.endsWith('Id') && f.name !== 'Id')
      if (idFields.length >= 2) {
        return idFields.map(f => f.name)
      }
    }

    return null
  }

  resolveEntity(entityName: string, fieldViews: Map<string, Array<{ viewType: ViewType; field: any }>>): Map<string, PKResolutionResult> {
    const results = new Map<string, PKResolutionResult>()
    for (const [fieldName, views] of fieldViews) {
      results.set(fieldName, this.resolve(fieldName, entityName, views))
    }
    return results
  }
}

// =============================================================================
// SECTION 6: UNIQUE DETECTION ENGINE (WITH FETCH/AXIOS AND COMPOSITE)
// =============================================================================

export interface UniqueConstraint {
  fieldName: string
  isUnique: boolean
  isComposite: boolean
  compositeFields?: string[]
  validationMethod: 'remote' | 'js_check' | 'fetch' | 'axios' | 'pattern' | 'explicit'
  checkUrl?: string
  confidence: number
}

export class UniqueDetectionEngine {
  private static readonly UNIQUE_NAME_PATTERNS = [
    /^Email$/i, /^UserName$/i, /^Username$/i, /^Code$/i, /^Sku$/i, /^Isbn$/i,
    /^Slug$/i, /^SerialNumber$/i, /^LicenseKey$/i, /^ApiKey$/i, /^Token$/i,
    /^Reference$/i, /^AccountNumber$/i, /^Phone$/i, /^Mobile$/i, /^NationalId$/i,
    /^PassportNumber$/i, /^TaxId$/i, /^VatNumber$/i, /^RegistrationNumber$/i,
    /^EmployeeCode$/i, /^StaffId$/i, /^MemberId$/i, /^CustomerId$/i,
  ]

  private static readonly JS_CHECK_PATTERNS = [
    { pattern: /check(\w+)exists/i, fieldGroup: 1 },
    { pattern: /validate(\w+)unique/i, fieldGroup: 1 },
    { pattern: /is(\w+)available/i, fieldGroup: 1 },
    { pattern: /(\w+)alreadyexists/i, fieldGroup: 1 },
    { pattern: /(\w+)taken/i, fieldGroup: 1 },
    { pattern: /verify(\w+)/i, fieldGroup: 1 },
  ]

  private static readonly FETCH_UNIQUE_PATTERNS = [
    // fetch('/api/check-email') or fetch("/api/check-email")
    /fetch\s*\(\s*['"`]([^'"`]*check[^'"`]*)['"`]/gi,
    /fetch\s*\(\s*['"`]([^'"`]*validate[^'"`]*)['"`]/gi,
    /fetch\s*\(\s*['"`]([^'"`]*exists[^'"`]*)['"`]/gi,
    /fetch\s*\(\s*['"`]([^'"`]*unique[^'"`]*)['"`]/gi,
  ]

  private static readonly AXIOS_PATTERNS = [
    /axios\.(get|post)\s*\(\s*['"`]([^'"`]*check[^'"`]*)['"`]/gi,
    /axios\.(get|post)\s*\(\s*['"`]([^'"`]*validate[^'"`]*)['"`]/gi,
    /axios\.(get|post)\s*\(\s*['"`]([^'"`]*exists[^'"`]*)['"`]/gi,
    /\$\.ajax\s*\(\s*\{[\s\S]*?url\s*:\s*['"`]([^'"`]*check[^'"`]*)['"`]/gi,
    /\$\.ajax\s*\(\s*\{[\s\S]*?url\s*:\s*['"`]([^'"`]*validate[^'"`]*)['"`]/gi,
  ]

  detect(fieldName: string, fieldData: { validationRules?: any[]; constraints?: string; scripts?: string[]; ajaxEndpoints?: string[]; type?: string }): UniqueConstraint {
    // 1. Check explicit remote validation
    const remoteRule = fieldData.validationRules?.find(r => r.rule === 'remote')
    if (remoteRule) {
      const composite = this.parseCompositeUnique(remoteRule)
      return {
        fieldName, isUnique: true, isComposite: composite.isComposite,
        compositeFields: composite.fields,
        validationMethod: 'remote', checkUrl: remoteRule.value,
        confidence: 95
      }
    }

    // 2. Check constraints string
    if (fieldData.constraints?.toUpperCase().includes('UNIQUE')) {
      return { fieldName, isUnique: true, isComposite: false, validationMethod: 'explicit', confidence: 90 }
    }

    // 3. Check scripts for uniqueness patterns (fetch, axios, jQuery)
    if (fieldData.scripts?.length) {
      const scriptContent = fieldData.scripts.join(' ')
      
      // Check fetch patterns
      for (const pattern of UniqueDetectionEngine.FETCH_UNIQUE_PATTERNS) {
        pattern.lastIndex = 0 // Reset regex
        const match = pattern.exec(scriptContent)
        if (match && this.urlMatchesField(match[1], fieldName)) {
          return { fieldName, isUnique: true, isComposite: false, validationMethod: 'fetch', checkUrl: match[1], confidence: 80 }
        }
      }

      // Check axios patterns
      for (const pattern of UniqueDetectionEngine.AXIOS_PATTERNS) {
        pattern.lastIndex = 0
        const match = pattern.exec(scriptContent)
        if (match && this.urlMatchesField(match[2] || match[1], fieldName)) {
          return { fieldName, isUnique: true, isComposite: false, validationMethod: 'axios', checkUrl: match[2] || match[1], confidence: 80 }
        }
      }

      // Check JS function patterns
      for (const { pattern, fieldGroup } of UniqueDetectionEngine.JS_CHECK_PATTERNS) {
        const match = scriptContent.match(pattern)
        if (match) {
          const matchedField = match[fieldGroup]?.toLowerCase()
          if (matchedField && fieldName.toLowerCase().includes(matchedField)) {
            return { fieldName, isUnique: true, isComposite: false, validationMethod: 'js_check', confidence: 80 }
          }
        }
      }
    }

    // 4. Check name patterns
    for (const pattern of UniqueDetectionEngine.UNIQUE_NAME_PATTERNS) {
      if (pattern.test(fieldName)) {
        return { fieldName, isUnique: true, isComposite: false, validationMethod: 'pattern', confidence: 70 }
      }
    }

    return { fieldName, isUnique: false, isComposite: false, validationMethod: 'explicit', confidence: 50 }
  }

  private urlMatchesField(url: string, fieldName: string): boolean {
    const urlLower = url.toLowerCase()
    const fieldLower = fieldName.toLowerCase()
    return urlLower.includes(fieldLower) || 
           urlLower.includes('check') ||
           urlLower.includes('validate') ||
           urlLower.includes('exists') ||
           urlLower.includes('unique')
  }

  private parseCompositeUnique(remoteRule: any): { isComposite: boolean; fields?: string[] } {
    const additionalFields = remoteRule.param || remoteRule.additionalFields
    if (!additionalFields) return { isComposite: false }

    const fields = additionalFields
      .split(',')
      .map((f: string) => f.replace(/^\*\./, '').trim())
      .filter((f: string) => f)

    if (fields.length > 0) {
      return { isComposite: true, fields }
    }
    return { isComposite: false }
  }

  detectAll(fields: Array<{ name: string; validationRules?: any[]; constraints?: string; scripts?: string[] }>): UniqueConstraint[] {
    return fields.map(f => this.detect(f.name, f)).filter(u => u.isUnique)
  }

  /**
   * Detect composite unique constraints across multiple fields
   */
  detectCompositeUnique(entity: MergedEntity): Array<{ fields: string[]; confidence: number }> {
    const composites: Array<{ fields: string[]; confidence: number }> = []

    // Check for data-val-remote-additionalfields patterns
    for (const field of entity.fields) {
      if (field.validationRules) {
        const remoteRule = field.validationRules.find((r: any) => r.rule === 'remote' && r.additionalFields)
        if (remoteRule) {
          const additionalFields = remoteRule.additionalFields
            .split(',')
            .map((f: string) => f.replace(/^\*\./, '').trim())
            .filter((f: string) => f)
          
          if (additionalFields.length > 0) {
            composites.push({
              fields: [field.name, ...additionalFields],
              confidence: 95
            })
          }
        }
      }
    }

    return composites
  }
}

// =============================================================================
// SECTION 7: VIEWMODEL FILTERING ENGINE (NEW)
// =============================================================================

export interface ViewModelFilterRule {
  pattern: RegExp
  reason: string
  category: 'display_only' | 'computed' | 'selector' | 'metadata' | 'navigation'
}

export const VIEWMODEL_FILTER_RULES: ViewModelFilterRule[] = [
  // Display-only fields (rendered via DisplayFor, not EditorFor)
  { pattern: /\w+DisplayName$/i, reason: 'Display name for lookup field', category: 'display_only' },
  { pattern: /\w+DisplayText$/i, reason: 'Display text for field', category: 'display_only' },
  { pattern: /\w+Formatted$/i, reason: 'Formatted display value', category: 'display_only' },
  { pattern: /\w+String$/i, reason: 'String representation for display', category: 'display_only' },
  { pattern: /formatted\w+$/i, reason: 'Formatted field for display', category: 'display_only' },
  { pattern: /display\w+$/i, reason: 'Display-only field', category: 'display_only' },

  // Computed fields
  { pattern: /^total\w+$/i, reason: 'Computed total', category: 'computed' },
  { pattern: /^count\w+$/i, reason: 'Computed count', category: 'computed' },
  { pattern: /^sum\w+$/i, reason: 'Computed sum', category: 'computed' },
  { pattern: /^average\w+$/i, reason: 'Computed average', category: 'computed' },
  { pattern: /^calculated\w+$/i, reason: 'Calculated field', category: 'computed' },
  { pattern: /^computed\w+$/i, reason: 'Computed field', category: 'computed' },
  { pattern: /^derived\w+$/i, reason: 'Derived field', category: 'computed' },
  { pattern: /^aggregated\w+$/i, reason: 'Aggregated field', category: 'computed' },

  // M:M selector fields (the selector itself, not the junction)
  { pattern: /^selected\w+Ids$/i, reason: 'M:M selector (not a column)', category: 'selector' },
  { pattern: /^selected\w+Items$/i, reason: 'M:M selector items', category: 'selector' },
  { pattern: /^chosen\w+Ids$/i, reason: 'M:M chosen IDs selector', category: 'selector' },
  { pattern: /^assigned\w+$/i, reason: 'Assignment selector', category: 'selector' },
  { pattern: /^available\w+$/i, reason: 'Available items selector', category: 'selector' },

  // Metadata fields
  { pattern: /^metadata$/i, reason: 'Metadata object', category: 'metadata' },
  { pattern: /^properties$/i, reason: 'Properties collection', category: 'metadata' },
  { pattern: /^attributes$/i, reason: 'Attributes collection', category: 'metadata' },
  { pattern: /^extensions$/i, reason: 'Extensions data', category: 'metadata' },
  { pattern: /^extras$/i, reason: 'Extra data', category: 'metadata' },

  // Navigation properties (Entity Framework)
  { pattern: /^\w+Navigation$/i, reason: 'Navigation property', category: 'navigation' },
  { pattern: /^\w+Reference$/i, reason: 'Reference navigation', category: 'navigation' },
  { pattern: /^\w+Collection$/i, reason: 'Collection navigation', category: 'navigation' },
]

export class ViewModelFilteringEngine {
  private rules: ViewModelFilterRule[]

  constructor() {
    this.rules = VIEWMODEL_FILTER_RULES
  }

  /**
   * Check if a field is a ViewModel artifact (not a DB column)
   */
  isViewModelArtifact(fieldName: string, fieldData?: { isDisplayOnly?: boolean; isComputed?: boolean; isNavigation?: boolean }): { isArtifact: boolean; reason?: string; category?: string } {
    // Check explicit flags first
    if (fieldData?.isDisplayOnly) return { isArtifact: true, reason: 'Marked as display-only', category: 'display_only' }
    if (fieldData?.isComputed) return { isArtifact: true, reason: 'Marked as computed', category: 'computed' }
    if (fieldData?.isNavigation) return { isArtifact: true, reason: 'Marked as navigation property', category: 'navigation' }

    // Check rules
    for (const rule of this.rules) {
      if (rule.pattern.test(fieldName)) {
        return { isArtifact: true, reason: rule.reason, category: rule.category }
      }
    }

    return { isArtifact: false }
  }

  /**
   * Filter ViewModel artifacts from field list
   */
  filterViewModelArtifacts<T extends { name: string; isDisplayOnly?: boolean; isComputed?: boolean; isNavigation?: boolean }>(
    fields: T[]
  ): { filtered: T[]; artifacts: Array<{ field: T; reason: string; category: string }> } {
    const filtered: T[] = []
    const artifacts: Array<{ field: T; reason: string; category: string }> = []

    for (const field of fields) {
      const result = this.isViewModelArtifact(field.name, field)

      if (result.isArtifact) {
        artifacts.push({ field, reason: result.reason || 'Unknown', category: result.category || 'unknown' })
      } else {
        filtered.push(field)
      }
    }

    return { filtered, artifacts }
  }

  /**
   * Detect display-only vs editable fields based on view context
   */
  detectDisplayOnlyFields(views: ParsedView[]): Map<string, boolean> {
    const result = new Map<string, boolean>()

    // Fields that appear in Details but NOT in Create/Edit are display-only
    const detailsView = views.find(v => v.viewType === 'details')
    const createView = views.find(v => v.viewType === 'create')
    const editView = views.find(v => v.viewType === 'edit')

    if (detailsView && !createView && !editView) {
      // Only details view - all fields might be display-only
      for (const field of detailsView.fields) {
        result.set(field.name, true)
      }
    } else if (detailsView) {
      const editableFields = new Set([
        ...(createView?.fields.map(f => f.name) || []),
        ...(editView?.fields.map(f => f.name) || [])
      ])

      for (const field of detailsView.fields) {
        if (!editableFields.has(field.name)) {
          result.set(field.name, true)
        }
      }
    }

    return result
  }
}

// =============================================================================
// SECTION 8: CONTEXT-AWARE CONSTRAINT WEIGHTING ENGINE (NEW)
// =============================================================================

export interface ConstraintWeight {
  constraint: string
  weight: number
  source: string
  confidence: number
}

export interface WeightedConstraint {
  name: string
  sqlType?: string
  isNullable: boolean
  isUnique: boolean
  maxLength?: number
  constraints: ConstraintWeight[]
  finalDecision: {
    isNullable: boolean
    isUnique: boolean
    maxLength?: number
    confidence: number
    reason: string
  }
}

export class ContextAwareConstraintWeightingEngine {
  /**
   * View type weights for constraint decisions
   */
  private static readonly VIEW_WEIGHTS: Record<ViewType, number> = {
    create: 1.0,   // Create view shows all fields with validation - HIGHEST AUTHORITY
    form: 0.95,    // Shared form partial - near highest
    edit: 0.7,     // Edit view - some fields may be readonly
    index: 0.3,    // Index view - only shows columns, no constraints
    details: 0.1,  // Details view - display only, ignore constraints
    delete: 0.1,   // Delete view - minimal info
    unknown: 0.4,
  }

  /**
   * Calculate weighted constraint for a field across multiple views
   */
  calculateWeightedConstraint(
    fieldName: string,
    viewDeclarations: Array<{
      viewType: ViewType
      field: {
        isRequired?: boolean
        constraints?: string
        maxLength?: number
        isUnique?: boolean
        sqlType?: string
      }
    }>
  ): WeightedConstraint {
    const constraints: ConstraintWeight[] = []
    let totalWeight = 0
    let nullableWeight = 0
    let uniqueWeight = 0
    let maxLengthSum = 0
    let maxLengthWeight = 0

    for (const decl of viewDeclarations) {
      const weight = ContextAwareConstraintWeightingEngine.VIEW_WEIGHTS[decl.viewType] || 0.4
      totalWeight += weight

      // Nullable analysis
      const isRequired = decl.field.isRequired === true ||
        decl.field.constraints?.toUpperCase().includes('NOT NULL') ||
        decl.field.constraints?.toUpperCase().includes('REQUIRED')

      if (isRequired) {
        nullableWeight += weight * 0 // Required = NOT NULL
        constraints.push({ constraint: 'NOT NULL', weight, source: decl.viewType, confidence: weight * 100 })
      } else {
        nullableWeight += weight * 1 // Optional = NULL
      }

      // Unique analysis
      if (decl.field.isUnique === true || decl.field.constraints?.toUpperCase().includes('UNIQUE')) {
        uniqueWeight += weight
        constraints.push({ constraint: 'UNIQUE', weight, source: decl.viewType, confidence: weight * 100 })
      }

      // MaxLength analysis
      if (decl.field.maxLength) {
        maxLengthSum += decl.field.maxLength * weight
        maxLengthWeight += weight
        constraints.push({ constraint: `MAXLENGTH(${decl.field.maxLength})`, weight, source: decl.viewType, confidence: weight * 100 })
      }
    }

    // Calculate final decisions
    const isNullable = totalWeight > 0 ? (nullableWeight / totalWeight) > 0.5 : true
    const isUnique = totalWeight > 0 ? (uniqueWeight / totalWeight) >= 0.5 : false
    const maxLength = maxLengthWeight > 0 ? Math.round(maxLengthSum / maxLengthWeight) : undefined

    return {
      name: fieldName,
      isNullable,
      isUnique,
      maxLength,
      constraints,
      finalDecision: {
        isNullable,
        isUnique,
        maxLength,
        confidence: Math.round(totalWeight * 100),
        reason: isNullable ? 
          (uniqueWeight > 0 ? 'Optional but unique' : 'Optional field') :
          (uniqueWeight > 0 ? 'Required and unique' : 'Required field')
      }
    }
  }

  /**
   * Weight constraints for all fields in an entity
   */
  weightEntityConstraints(
    entity: MergedEntity,
    fieldViews: Map<string, Array<{ viewType: ViewType; field: any }>>
  ): Map<string, WeightedConstraint> {
    const results = new Map<string, WeightedConstraint>()

    for (const field of entity.fields) {
      const declarations = fieldViews.get(field.name) || []
      results.set(field.name, this.calculateWeightedConstraint(field.name, declarations))
    }

    return results
  }

  /**
   * Get priority order for view types when conflicts occur
   */
  getViewPriorityOrder(): ViewType[] {
    return ['create', 'form', 'edit', 'unknown', 'index', 'details', 'delete']
  }
}

// =============================================================================
// SECTION 9: VIEWCOMPONENT RESOLUTION ENGINE (NEW)
// =============================================================================

export interface ViewComponentReference {
  name: string
  parameters: Record<string, string>
  invokePattern: string
  sourceFile: string
}

export interface ResolvedViewComponent {
  componentName: string
  resolvedFields: any[]
  parameters: Record<string, any>
  confidence: number
}

export class ViewComponentResolutionEngine {
  /**
   * Detect ViewComponent invocations in CSHTML content
   */
  detectViewComponents(content: string, sourceFile: string): ViewComponentReference[] {
    const components: ViewComponentReference[] = []

    // Pattern 1: @await Component.InvokeAsync("ComponentName", new { param = value })
    const invokeAsyncPattern = /@await\s+Component\.InvokeAsync\s*\(\s*["'](\w+)["']\s*(?:,\s*new\s*\{([^}]*)\})?\s*\)/gi
    let match
    while ((match = invokeAsyncPattern.exec(content)) !== null) {
      components.push({
        name: match[1],
        parameters: this.parseParameters(match[2] || ''),
        invokePattern: 'InvokeAsync',
        sourceFile
      })
    }

    // Pattern 2: @Component.Invoke("ComponentName")
    const invokePattern = /@Component\.Invoke\s*\(\s*["'](\w+)["']\s*(?:,\s*([^)]*))?\s*\)/gi
    while ((match = invokePattern.exec(content)) !== null) {
      components.push({
        name: match[1],
        parameters: this.parseParameters(match[2] || ''),
        invokePattern: 'Invoke',
        sourceFile
      })
    }

    // Pattern 3: <vc:component-name param="value" />
    const tagHelperPattern = /<vc:(\w+(?:-\w+)*)\s+([^>]*?)\s*\/?>/gi
    while ((match = tagHelperPattern.exec(content)) !== null) {
      const componentName = match[1].replace(/-/g, '') // Convert kebab-case to PascalCase
      components.push({
        name: componentName,
        parameters: this.parseTagHelperAttributes(match[2] || ''),
        invokePattern: 'TagHelper',
        sourceFile
      })
    }

    return components
  }

  private parseParameters(paramsStr: string): Record<string, string> {
    const params: Record<string, string> = {}
    const paramPattern = /(\w+)\s*=\s*(?:@?Model\.?(\w+)?|["']([^"']+)["']|(\d+))/g
    let match
    while ((match = paramPattern.exec(paramsStr)) !== null) {
      params[match[1]] = match[2] || match[3] || match[4] || ''
    }
    return params
  }

  private parseTagHelperAttributes(attrsStr: string): Record<string, string> {
    const params: Record<string, string> = {}
    const attrPattern = /(\w+(?:-\w+)*)\s*=\s*["']([^"']+)["']/g
    let match
    while ((match = attrPattern.exec(attrsStr)) !== null) {
      params[match[1]] = match[2]
    }
    return params
  }

  /**
   * Try to resolve ViewComponent fields (requires component definition)
   * This is a placeholder for when component definitions are available
   */
  resolveViewComponent(ref: ViewComponentReference, componentDefinitions?: Map<string, any[]>): ResolvedViewComponent | null {
    if (!componentDefinitions || !componentDefinitions.has(ref.name)) {
      return {
        componentName: ref.name,
        resolvedFields: [],
        parameters: ref.parameters,
        confidence: 20
      }
    }

    const fields = componentDefinitions.get(ref.name) || []
    return {
      componentName: ref.name,
      resolvedFields: fields,
      parameters: ref.parameters,
      confidence: 70
    }
  }
}

// =============================================================================
// SECTION 10: EDITORFOR TEMPLATE DETECTION ENGINE (NEW)
// =============================================================================

export interface EditorForTemplate {
  propertyName: string
  templateName?: string
  additionalViewData: Record<string, string>
  sourceFile: string
}

export interface ResolvedEditorTemplate {
  propertyName: string
  templateName: string
  inferredFields: any[]
  confidence: number
}

export class EditorForTemplateEngine {
  /**
   * Detect EditorFor calls in CSHTML content
   */
  detectEditorForTemplates(content: string, sourceFile: string): EditorForTemplate[] {
    const templates: EditorForTemplate[] = []

    // Pattern 1: @Html.EditorFor(m => m.Property, "TemplateName")
    const editorForPattern = /@Html\.EditorFor\s*\(\s*(?:m|model|x)\s*=>\s*(?:m|model|x)\.([\w.]+)\s*(?:,\s*["'](\w+)["']\s*)?(?:,\s*new\s*\{([^}]*)\})?\s*\)/gi
    let match
    while ((match = editorForPattern.exec(content)) !== null) {
      templates.push({
        propertyName: match[1],
        templateName: match[2] || undefined,
        additionalViewData: this.parseViewData(match[3] || ''),
        sourceFile
      })
    }

    // Pattern 2: @Html.EditorForModel("TemplateName")
    const editorForModelPattern = /@Html\.EditorForModel\s*\(\s*(?:["'](\w+)["']\s*)?(?:,\s*new\s*\{([^}]*)\})?\s*\)/gi
    while ((match = editorForModelPattern.exec(content)) !== null) {
      templates.push({
        propertyName: 'Model',
        templateName: match[1] || undefined,
        additionalViewData: this.parseViewData(match[2] || ''),
        sourceFile
      })
    }

    return templates
  }

  private parseViewData(viewDataStr: string): Record<string, string> {
    const data: Record<string, string> = {}
    const pattern = /(\w+)\s*=\s*(?:@?[\w.]+|["']([^"']+)["']|(\d+))/g
    let match
    while ((match = pattern.exec(viewDataStr)) !== null) {
      data[match[1]] = match[2] || match[3] || ''
    }
    return data
  }

  /**
   * Infer fields from EditorFor template based on common patterns
   */
  inferFieldsFromTemplate(template: EditorForTemplate): any[] {
    const fields: any[] = []

    // Common template name patterns
    const templatePatterns: Record<string, any[]> = {
      'Address': [
        { name: 'Street', sqlType: 'NVARCHAR(500)', isNullable: true },
        { name: 'City', sqlType: 'NVARCHAR(100)', isNullable: true },
        { name: 'State', sqlType: 'NVARCHAR(100)', isNullable: true },
        { name: 'ZipCode', sqlType: 'VARCHAR(20)', isNullable: true },
        { name: 'Country', sqlType: 'NVARCHAR(100)', isNullable: true },
      ],
      'Contact': [
        { name: 'Phone', sqlType: 'VARCHAR(20)', isNullable: true },
        { name: 'Email', sqlType: 'VARCHAR(255)', isNullable: true },
        { name: 'Website', sqlType: 'VARCHAR(500)', isNullable: true },
      ],
      'PersonName': [
        { name: 'FirstName', sqlType: 'NVARCHAR(100)', isNullable: true },
        { name: 'LastName', sqlType: 'NVARCHAR(100)', isNullable: true },
        { name: 'MiddleName', sqlType: 'NVARCHAR(100)', isNullable: true },
      ],
      'DateRange': [
        { name: 'StartDate', sqlType: 'DATETIME2', isNullable: true },
        { name: 'EndDate', sqlType: 'DATETIME2', isNullable: true },
      ],
    }

    // If template name matches a known pattern, return those fields
    if (template.templateName && templatePatterns[template.templateName]) {
      return templatePatterns[template.templateName].map(f => ({
        ...f,
        source: `EditorFor:${template.templateName}`,
        confidence: 70
      }))
    }

    // Infer from property name
    const propName = template.propertyName.toLowerCase()
    
    if (propName.includes('address')) {
      return templatePatterns['Address'].map(f => ({ ...f, source: `EditorFor:inferred_address`, confidence: 60 }))
    }
    if (propName.includes('contact')) {
      return templatePatterns['Contact'].map(f => ({ ...f, source: `EditorFor:inferred_contact`, confidence: 60 }))
    }

    return fields
  }

  /**
   * Detect DisplayFor vs EditorFor to determine display-only fields
   */
  detectDisplayOnlyFields(content: string): string[] {
    const displayOnlyFields: string[] = []

    // DisplayFor indicates display-only
    const displayForPattern = /@Html\.DisplayFor\s*\(\s*(?:m|model|x)\s*=>\s*(?:m|model|x)\.([\w.]+)/gi
    let match
    while ((match = displayForPattern.exec(content)) !== null) {
      displayOnlyFields.push(match[1])
    }

    // DisplayTextFor
    const displayTextPattern = /@Html\.DisplayTextFor\s*\(\s*(?:m|model|x)\s*=>\s*(?:m|model|x)\.([\w.]+)/gi
    while ((match = displayTextPattern.exec(content)) !== null) {
      if (!displayOnlyFields.includes(match[1])) {
        displayOnlyFields.push(match[1])
      }
    }

    return displayOnlyFields
  }
}

// =============================================================================
// SECTION 11: UNIFIED TIER 1 PROCESSOR (COMPLETE)
// =============================================================================

export interface Tier1ProcessingOptions {
  excludeNonColumns: boolean
  mergeMultiFile: boolean
  resolvePKs: boolean
  detectUniques: boolean
  filterViewModel: boolean
  weightConstraints: boolean
  resolveViewComponents: boolean
  resolveEditorTemplates: boolean
  detectCompositePKs: boolean
  logExclusions: boolean
}

export interface Tier1Result {
  entities: MergedEntity[]
  exclusionStats: { totalFields: number; excludedFields: number; byCategory: Record<string, number> }
  pkResolutions: Map<string, PKResolutionResult>
  uniqueConstraints: UniqueConstraint[]
  viewModelArtifacts: Map<string, string[]>
  weightedConstraints: Map<string, Map<string, WeightedConstraint>>
  viewComponents: ViewComponentReference[]
  editorTemplates: EditorForTemplate[]
  compositePKs: Map<string, string[]>
  compositeUniques: Map<string, Array<{ fields: string[]; confidence: number }>>
}

export class Tier1Processor {
  private exclusionEngine: NonColumnExclusionEngine
  private mergeEngine: MultiFileMergeEngine
  private pkEngine: PKResolutionEngine
  private uniqueEngine: UniqueDetectionEngine
  private viewModelEngine: ViewModelFilteringEngine
  private constraintWeightingEngine: ContextAwareConstraintWeightingEngine
  private viewComponentEngine: ViewComponentResolutionEngine
  private editorTemplateEngine: EditorForTemplateEngine

  constructor() {
    this.exclusionEngine = new NonColumnExclusionEngine()
    this.mergeEngine = new MultiFileMergeEngine()
    this.pkEngine = new PKResolutionEngine()
    this.uniqueEngine = new UniqueDetectionEngine()
    this.viewModelEngine = new ViewModelFilteringEngine()
    this.constraintWeightingEngine = new ContextAwareConstraintWeightingEngine()
    this.viewComponentEngine = new ViewComponentResolutionEngine()
    this.editorTemplateEngine = new EditorForTemplateEngine()
  }

  process(views: ParsedView[], options: Partial<Tier1ProcessingOptions> = {}): Tier1Result {
    const opts: Tier1ProcessingOptions = {
      excludeNonColumns: true,
      mergeMultiFile: true,
      resolvePKs: true,
      detectUniques: true,
      filterViewModel: true,
      weightConstraints: true,
      resolveViewComponents: true,
      resolveEditorTemplates: true,
      detectCompositePKs: true,
      logExclusions: false,
      ...options
    }

    let totalFields = 0
    let excludedFields = 0
    const byCategory: Record<string, number> = {}

    // STEP 1: Non-column exclusion
    const filteredViews = opts.excludeNonColumns
      ? views.map(view => {
          const { filtered, excluded } = this.exclusionEngine.filterFields(view.fields, { logExclusions: opts.logExclusions })
          totalFields += view.fields.length
          excludedFields += excluded.length
          for (const ex of excluded) byCategory[ex.category] = (byCategory[ex.category] || 0) + 1
          return { ...view, fields: filtered }
        })
      : views

    // STEP 2: ViewModel filtering
    const viewModelArtifacts = new Map<string, string[]>()
    const afterViewModelFilter = opts.filterViewModel
      ? filteredViews.map(view => {
          const { filtered, artifacts } = this.viewModelEngine.filterViewModelArtifacts(view.fields)
          viewModelArtifacts.set(view.fileName, artifacts.map(a => `${a.field.name}:${a.reason}`))
          return { ...view, fields: filtered }
        })
      : filteredViews

    // STEP 3: Multi-file merge
    if (opts.mergeMultiFile) {
      this.mergeEngine.clear()
      for (const view of afterViewModelFilter) {
        this.mergeEngine.addView(view)
      }
    }

    const entities = opts.mergeMultiFile
      ? this.mergeEngine.mergeAll()
      : afterViewModelFilter.map(v => ({
          entityName: v.modelName || 'Unknown',
          sourceViews: [{ file: v.fileName, type: v.viewType, fieldCount: v.fields.length }],
          fields: v.fields.map(f => ({ ...f, sources: [v.fileName] })),
          primaryKey: 'Id',
          uniqueConstraints: [],
          relationships: v.relationships || [],
          tableCount: 1
        }))

    // STEP 4: PK Resolution
    const pkResolutions = new Map<string, PKResolutionResult>()
    if (opts.resolvePKs) {
      for (const entity of entities) {
        const fieldViews = new Map<string, Array<{ viewType: ViewType; field: any }>>()
        for (const field of entity.fields) {
          const views: Array<{ viewType: ViewType; field: any }> = []
          for (const source of entity.sourceViews) {
            const view = afterViewModelFilter.find(v => v.fileName === source.file)
            const fieldData = view?.fields.find(f => f.name === field.name)
            if (fieldData) views.push({ viewType: source.type, field: fieldData })
          }
          fieldViews.set(field.name, views)
        }
        const entityPkResolutions = this.pkEngine.resolveEntity(entity.entityName, fieldViews)
        for (const [fieldName, resolution] of entityPkResolutions) {
          pkResolutions.set(`${entity.entityName}.${fieldName}`, resolution)
          const field = entity.fields.find(f => f.name === fieldName)
          if (field) {
            field.isPK = resolution.isPK
            field.isFK = resolution.isFK
            field.fkTable = resolution.fkTable
            field.isGUID = resolution.isGUID
          }
        }
        const pkField = entity.fields.find(f => f.isPK)
        if (pkField) entity.primaryKey = pkField.name
      }
    }

    // STEP 5: Composite PK Detection
    const compositePKs = new Map<string, string[]>()
    if (opts.detectCompositePKs) {
      for (const entity of entities) {
        const compositePK = this.pkEngine.detectCompositePK(entity)
        if (compositePK) {
          compositePKs.set(entity.entityName, compositePK)
          entity.compositePK = compositePK
        }
      }
    }

    // STEP 6: Unique Detection
    const uniqueConstraints: UniqueConstraint[] = []
    const compositeUniques = new Map<string, Array<{ fields: string[]; confidence: number }>>()
    if (opts.detectUniques) {
      for (const entity of entities) {
        for (const field of entity.fields) {
          const unique = this.uniqueEngine.detect(field.name, { constraints: field.constraints?.join?.(' ') || field.constraints })
          if (unique.isUnique) {
            uniqueConstraints.push({ ...unique, fieldName: `${entity.entityName}.${field.name}` })
            field.isUnique = true
          }
        }
        entity.uniqueConstraints = uniqueConstraints.filter(u => u.fieldName.startsWith(entity.entityName)).map(u => u.fieldName.split('.')[1])
        
        // Composite uniques
        const compUniques = this.uniqueEngine.detectCompositeUnique(entity)
        if (compUniques.length > 0) {
          compositeUniques.set(entity.entityName, compUniques)
        }
      }
    }

    // STEP 7: Constraint Weighting
    const weightedConstraints = new Map<string, Map<string, WeightedConstraint>>()
    if (opts.weightConstraints) {
      for (const entity of entities) {
        const fieldViews = new Map<string, Array<{ viewType: ViewType; field: any }>>()
        for (const field of entity.fields) {
          const views: Array<{ viewType: ViewType; field: any }> = []
          for (const source of entity.sourceViews) {
            const view = afterViewModelFilter.find(v => v.fileName === source.file)
            const fieldData = view?.fields.find(f => f.name === field.name)
            if (fieldData) views.push({ viewType: source.type, field: fieldData })
          }
          fieldViews.set(field.name, views)
        }
        weightedConstraints.set(entity.entityName, this.constraintWeightingEngine.weightEntityConstraints(entity, fieldViews))
      }
    }

    // STEP 8: ViewComponent Resolution
    const viewComponents: ViewComponentReference[] = []
    if (opts.resolveViewComponents) {
      for (const view of views) {
        if (view.rawContent) {
          viewComponents.push(...this.viewComponentEngine.detectViewComponents(view.rawContent, view.fileName))
        }
      }
    }

    // STEP 9: EditorFor Template Detection
    const editorTemplates: EditorForTemplate[] = []
    if (opts.resolveEditorTemplates) {
      for (const view of views) {
        if (view.rawContent) {
          editorTemplates.push(...this.editorTemplateEngine.detectEditorForTemplates(view.rawContent, view.fileName))
        }
      }
    }

    return {
      entities,
      exclusionStats: { totalFields, excludedFields, byCategory },
      pkResolutions,
      uniqueConstraints,
      viewModelArtifacts,
      weightedConstraints,
      viewComponents,
      editorTemplates,
      compositePKs,
      compositeUniques
    }
  }
}

// =============================================================================
// EXPORT SINGLETONS
// =============================================================================

export const nonColumnExclusionEngine = new NonColumnExclusionEngine()
export const multiFileMergeEngine = new MultiFileMergeEngine()
export const pkResolutionEngine = new PKResolutionEngine()
export const uniqueDetectionEngine = new UniqueDetectionEngine()
export const viewModelFilteringEngine = new ViewModelFilteringEngine()
export const contextAwareConstraintWeightingEngine = new ContextAwareConstraintWeightingEngine()
export const viewComponentResolutionEngine = new ViewComponentResolutionEngine()
export const editorForTemplateEngine = new EditorForTemplateEngine()
export const tier1Processor = new Tier1Processor()
