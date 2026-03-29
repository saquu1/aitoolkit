// =============================================================================
// Enhanced HTML Parser - Deep Element Extraction for CSHTML Support
// =============================================================================
// Extracts HTML elements, data attributes, Bootstrap components, and form relationships
// Works alongside CSHTML parser for comprehensive frontend intelligence
// =============================================================================

/**
 * Parsed HTML Element
 */
export interface HTMLElementInfo {
  tagName: string;
  attributes: Record<string, string>;
  dataAttributes: Record<string, string>;
  content?: string;
  children?: HTMLElementInfo[];
  location: ElementLocation;
  inferredPurpose?: string;
}

/**
 * Element location in source
 */
export interface ElementLocation {
  startIndex: number;
  endIndex: number;
  lineNumber?: number;
}

/**
 * Data Attribute extracted from elements
 */
export interface DataAttribute {
  element: string;
  elementSelector: string;
  name: string;
  value: string;
  inferredPurpose: string;
  relatedField?: string;
}

/**
 * Bootstrap Component Detection
 */
export interface BootstrapComponent {
  type: string;
  selector: string;
  options: Record<string, string>;
  triggerElement?: string;
  targetElement?: string;
  events: string[];
  sourceCode: string;
}

/**
 * Form Relationship Map
 */
export interface FormRelationship {
  formId: string;
  formAction: string;
  method: string;
  fields: FormFieldRelationship[];
  submitButtons: string[];
  validationTrigger: 'onsubmit' | 'onchange' | 'manual';
  hasClientValidation: boolean;
  relatedScripts: string[];
}

/**
 * Form Field Relationship
 */
export interface FormFieldRelationship {
  name: string;
  type: string;
  isRequired: boolean;
  hasRemoteValidation: boolean;
  dependsOn?: string[];
  controls?: string[];
  label?: string;
}

/**
 * Hidden Field Purpose
 */
export interface HiddenFieldPurpose {
  name: string;
  value: string;
  purpose: 'id' | 'token' | 'state' | 'timestamp' | 'foreign_key' | 'config' | 'unknown';
  relatedEntity?: string;
}

/**
 * Action Link/Button
 */
export interface ActionElement {
  type: 'link' | 'button' | 'submit';
  selector: string;
  action: string;
  controller?: string;
  httpMethod?: string;
  confirmation?: string;
  dataAttributes: Record<string, string>;
  isAjax: boolean;
  target?: string;
}

/**
 * Modal Definition
 */
export interface ModalDefinition {
  id: string;
  title?: string;
  triggerSelectors: string[];
  formInside?: string;
  hasDynamicContent: boolean;
  size?: string;
  backdrop?: boolean;
  keyboardClose?: boolean;
}

/**
 * Tab/Accordion Structure
 */
export interface TabAccordionStructure {
  type: 'tabs' | 'accordion' | 'pills';
  containerId: string;
  items: TabAccordionItem[];
  activeItem?: string;
  isLazyLoad: boolean;
}

/**
 * Tab/Accordion Item
 */
export interface TabAccordionItem {
  id: string;
  title: string;
  contentSelector: string;
  isRemote: boolean;
  remoteUrl?: string;
  isDisabled: boolean;
}

/**
 * DataTable Configuration
 */
export interface DataTableConfig {
  selector: string;
  ajaxUrl?: string;
  ajaxMethod?: string;
  columns: DataTableColumn[];
  features: DataTableFeatures;
  events: string[];
  sourceCode: string;
}

/**
 * DataTable Column
 */
export interface DataTableColumn {
  data: string;
  title?: string;
  render?: string;
  isSortable: boolean;
  isSearchable: boolean;
  className?: string;
}

/**
 * DataTable Features
 */
export interface DataTableFeatures {
  paging: boolean;
  searching: boolean;
  ordering: boolean;
  info: boolean;
  serverSide: boolean;
  responsive: boolean;
  exportButtons: string[];
}

/**
 * Select2 Configuration
 */
export interface Select2Config {
  selector: string;
  ajaxUrl?: string;
  ajaxMethod?: string;
  placeholder?: string;
  allowClear: boolean;
  multiple: boolean;
  minimumInputLength?: number;
  templateResult?: string;
  templateSelection?: string;
  isCascade: boolean;
  parentSelector?: string;
}

/**
 * HTML Parser Result
 */
export interface HTMLParserResult {
  elements: HTMLElementInfo[];
  dataAttributes: DataAttribute[];
  bootstrapComponents: BootstrapComponent[];
  formRelationships: FormRelationship[];
  hiddenFields: HiddenFieldPurpose[];
  actionElements: ActionElement[];
  modals: ModalDefinition[];
  tabsAccordions: TabAccordionStructure[];
  dataTables: DataTableConfig[];
  select2Configs: Select2Config[];
  customComponents: CustomComponent[];
  complexity: number;
}

/**
 * Custom Component (non-Bootstrap)
 */
export interface CustomComponent {
  type: string;
  selector: string;
  library?: string;
  configuration: Record<string, unknown>;
  sourceCode: string;
}

/**
 * Enhanced HTML Parser Engine
 */
export class HTMLParserEngine {
  private content: string;
  private fileName: string;

  constructor(content: string, fileName?: string) {
    this.content = content;
    this.fileName = fileName || '';
  }

  /**
   * Parse HTML content
   */
  parse(): HTMLParserResult {
    const elements = this.extractElements();
    const dataAttributes = this.extractDataAttributes();
    const bootstrapComponents = this.extractBootstrapComponents();
    const formRelationships = this.extractFormRelationships();
    const hiddenFields = this.extractHiddenFields();
    const actionElements = this.extractActionElements();
    const modals = this.extractModals();
    const tabsAccordions = this.extractTabsAccordions();
    const dataTables = this.extractDataTables();
    const select2Configs = this.extractSelect2Configs();
    const customComponents = this.extractCustomComponents();
    const complexity = this.calculateComplexity();

    return {
      elements,
      dataAttributes,
      bootstrapComponents,
      formRelationships,
      hiddenFields,
      actionElements,
      modals,
      tabsAccordions,
      dataTables,
      select2Configs,
      customComponents,
      complexity,
    };
  }

  /**
   * Extract HTML elements with their attributes
   */
  private extractElements(): HTMLElementInfo[] {
    const elements: HTMLElementInfo[] = [];
    
    // Extract form elements
    const formRegex = /<form[^>]*>/gi;
    let match;
    while ((match = formRegex.exec(this.content)) !== null) {
      elements.push(this.parseElement(match[0], 'form', match.index));
    }

    // Extract input elements
    const inputRegex = /<input[^>]*\/?>/gi;
    while ((match = inputRegex.exec(this.content)) !== null) {
      elements.push(this.parseElement(match[0], 'input', match.index));
    }

    // Extract select elements
    const selectRegex = /<select[^>]*>[\s\S]*?<\/select>/gi;
    while ((match = selectRegex.exec(this.content)) !== null) {
      elements.push(this.parseElement(match[0], 'select', match.index));
    }

    // Extract button elements
    const buttonRegex = /<button[^>]*>[\s\S]*?<\/button>/gi;
    while ((match = buttonRegex.exec(this.content)) !== null) {
      elements.push(this.parseElement(match[0], 'button', match.index));
    }

    // Extract anchor elements with actions
    const anchorRegex = /<a[^>]*>[\s\S]*?<\/a>/gi;
    while ((match = anchorRegex.exec(this.content)) !== null) {
      const anchor = this.parseElement(match[0], 'a', match.index);
      // Only include anchors with data attributes or action classes
      if (Object.keys(anchor.dataAttributes).length > 0 || 
          /\b(btn|action|link-)/i.test(anchor.attributes.class || '')) {
        elements.push(anchor);
      }
    }

    return elements;
  }

  /**
   * Parse a single element
   */
  private parseElement(tag: string, tagName: string, index: number): HTMLElementInfo {
    const attributes = this.extractAttributes(tag);
    const dataAttributes = this.extractDataAttrs(tag);
    const inferredPurpose = this.inferElementPurpose(tagName, attributes, dataAttributes);

    return {
      tagName,
      attributes,
      dataAttributes,
      location: {
        startIndex: index,
        endIndex: index + tag.length,
      },
      inferredPurpose,
    };
  }

  /**
   * Extract attributes from tag
   */
  private extractAttributes(tag: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    
    // Match attribute="value" patterns
    const attrRegex = /(\w+(?:-\w+)*)\s*=\s*["']([^"']*)["']/g;
    let match;
    while ((match = attrRegex.exec(tag)) !== null) {
      attrs[match[1]] = match[2];
    }

    // Match boolean attributes (disabled, readonly, required, etc.)
    const boolAttrRegex = /\b(disabled|readonly|required|checked|selected|multiple|autofocus|autocomplete)\b(?!=)/gi;
    while ((match = boolAttrRegex.exec(tag)) !== null) {
      attrs[match[1]] = 'true';
    }

    return attrs;
  }

  /**
   * Extract data-* attributes
   */
  private extractDataAttrs(tag: string): Record<string, string> {
    const dataAttrs: Record<string, string> = {};
    
    const dataAttrRegex = /data-([\w-]+)\s*=\s*["']([^"']*)["']/gi;
    let match;
    while ((match = dataAttrRegex.exec(tag)) !== null) {
      dataAttrs[match[1]] = match[2];
    }

    return dataAttrs;
  }

  /**
   * Infer element purpose
   */
  private inferElementPurpose(
    tagName: string, 
    attributes: Record<string, string>, 
    dataAttrs: Record<string, string>
  ): string {
    // Form elements
    if (tagName === 'form') {
      if (dataAttrs.ajax || dataAttrs['ajax-url']) return 'ajax-form';
      if (attributes.enctype?.includes('multipart')) return 'file-upload-form';
      return 'form';
    }

    // Input elements
    if (tagName === 'input') {
      const type = attributes.type || 'text';
      if (type === 'hidden') return 'hidden-field';
      if (type === 'submit') return 'submit-button';
      if (type === 'file') return 'file-input';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      return 'input';
    }

    // Buttons
    if (tagName === 'button') {
      if (dataAttrs.dismiss) return 'dismiss-button';
      if (dataAttrs.toggle) return 'toggle-button';
      if (attributes.type === 'submit') return 'submit-button';
      return 'button';
    }

    // Anchors
    if (tagName === 'a') {
      if (dataAttrs.toggle === 'modal') return 'modal-trigger';
      if (dataAttrs.toggle === 'tab') return 'tab-trigger';
      if (dataAttrs.toggle === 'collapse') return 'collapse-trigger';
      if (attributes.href?.startsWith('#')) return 'anchor-link';
      return 'link';
    }

    return 'unknown';
  }

  /**
   * Extract all data attributes with context
   */
  private extractDataAttributes(): DataAttribute[] {
    const dataAttrs: DataAttribute[] = [];
    
    // Pattern: data-* attributes on any element
    const elementRegex = /<(\w+)([^>]*?)>/gi;
    let match;
    
    while ((match = elementRegex.exec(this.content)) !== null) {
      const tagName = match[1];
      const attrString = match[2];
      
      // Extract all data attributes from this element
      const dataAttrRegex = /data-([\w-]+)\s*=\s*["']([^"']*)["']/gi;
      let dataMatch;
      
      while ((dataMatch = dataAttrRegex.exec(attrString)) !== null) {
        const name = dataMatch[1];
        const value = dataMatch[2];
        
        // Extract element selector
        const idMatch = attrString.match(/id\s*=\s*["']([^"']+)["']/);
        const classMatch = attrString.match(/class\s*=\s*["']([^"']+)["']/);
        const selector = idMatch ? `#${idMatch[1]}` : 
                        classMatch ? `.${classMatch[1].split(' ')[0]}` : 
                        tagName;

        // Extract related field
        const nameMatch = attrString.match(/name\s*=\s*["']([^"']+)["']/);
        const aspForMatch = attrString.match(/asp-for\s*=\s*["']([^"']+)["']/);

        dataAttrs.push({
          element: tagName,
          elementSelector: selector,
          name,
          value,
          inferredPurpose: this.inferDataAttrPurpose(name, value),
          relatedField: nameMatch?.[1] || aspForMatch?.[1],
        });
      }
    }

    return dataAttrs;
  }

  /**
   * Infer data attribute purpose
   */
  private inferDataAttrPurpose(name: string, value: string): string {
    // Bootstrap data attributes
    if (name === 'toggle') return `Bootstrap ${value} toggle`;
    if (name === 'dismiss') return `Bootstrap dismiss (${value})`;
    if (name === 'target') return `Target selector: ${value}`;
    if (name === 'slide') return 'Bootstrap carousel slide';
    if (name === 'ride') return 'Bootstrap carousel auto-start';
    if (name === 'interval') return `Carousel interval: ${value}ms`;
    if (name === 'keyboard') return `Keyboard navigation: ${value}`;
    if (name === 'backdrop') return `Modal backdrop: ${value}`;
    
    // jQuery validation data attributes
    if (name === 'val') return 'jQuery validation: enabled';
    if (name === 'val-required') return 'Validation: required';
    if (name === 'val-email') return 'Validation: email format';
    if (name === 'val-length-max') return `Validation: max length ${value}`;
    if (name === 'val-length-min') return `Validation: min length ${value}`;
    if (name === 'val-regex-pattern') return `Validation: regex pattern`;
    if (name === 'val-remote') return `Validation: remote endpoint ${value}`;
    if (name === 'val-remote-additionalfields') return `Validation: remote fields ${value}`;
    if (name === 'val-equalto') return `Validation: must equal ${value}`;
    if (name === 'val-date') return 'Validation: date format';
    if (name === 'val-number') return 'Validation: numeric';
    if (name === 'val-digits') return 'Validation: digits only';
    if (name === 'val-accept') return `Validation: accept ${value}`;
    
    // ASP.NET anti-forgery
    if (name === 'antiforgery' || name === 'csrf') return 'Anti-forgery token';
    
    // Custom data attributes
    if (name.startsWith('url')) return `URL configuration: ${value}`;
    if (name.startsWith('api')) return `API configuration: ${value}`;
    if (name.startsWith('endpoint')) return `Endpoint: ${value}`;
    if (name.startsWith('action')) return `Action: ${value}`;
    if (name.startsWith('controller')) return `Controller: ${value}`;
    if (name.startsWith('confirm')) return `Confirmation: ${value}`;
    if (name.startsWith('loading')) return 'Loading indicator';
    if (name.startsWith('ajax')) return 'AJAX configuration';
    if (name.startsWith('param')) return `Parameter: ${value}`;
    
    return `Custom: ${name}`;
  }

  /**
   * Extract Bootstrap component configurations
   */
  private extractBootstrapComponents(): BootstrapComponent[] {
    const components: BootstrapComponent[] = [];

    // Modals
    const modalRegex = /<div[^>]*class="[^"]*modal[^"]*"[^>]*>/gi;
    let match;
    while ((match = modalRegex.exec(this.content)) !== null) {
      const modal = this.parseBootstrapModal(match[0], match.index);
      if (modal) components.push(modal);
    }

    // Dropdowns
    const dropdownRegex = /<[^>]*data-toggle="dropdown"[^>]*>/gi;
    while ((match = dropdownRegex.exec(this.content)) !== null) {
      components.push(this.parseBootstrapDropdown(match[0], match.index));
    }

    // Tooltips
    const tooltipRegex = /<[^>]*(?:data-toggle="tooltip"|data-bs-toggle="tooltip")[^>]*>/gi;
    while ((match = tooltipRegex.exec(this.content)) !== null) {
      components.push(this.parseBootstrapTooltip(match[0], match.index));
    }

    // Popovers
    const popoverRegex = /<[^>]*(?:data-toggle="popover"|data-bs-toggle="popover")[^>]*>/gi;
    while ((match = popoverRegex.exec(this.content)) !== null) {
      components.push(this.parseBootstrapPopover(match[0], match.index));
    }

    // Carousels
    const carouselRegex = /<div[^>]*data-ride="carousel"[^>]*>/gi;
    while ((match = carouselRegex.exec(this.content)) !== null) {
      components.push(this.parseBootstrapCarousel(match[0], match.index));
    }

    return components;
  }

  /**
   * Parse Bootstrap modal
   */
  private parseBootstrapModal(tag: string, index: number): BootstrapComponent {
    const attrs = this.extractAttributes(tag);
    const dataAttrs = this.extractDataAttrs(tag);

    return {
      type: 'Modal',
      selector: `#${attrs.id || ''}`,
      options: {
        backdrop: dataAttrs.backdrop || 'true',
        keyboard: dataAttrs.keyboard || 'true',
      },
      triggerElement: `[data-target="#${attrs.id}"], [data-bs-target="#${attrs.id}"]`,
      targetElement: `#${attrs.id}`,
      events: ['show.bs.modal', 'shown.bs.modal', 'hide.bs.modal', 'hidden.bs.modal'],
      sourceCode: tag,
    };
  }

  /**
   * Parse Bootstrap dropdown
   */
  private parseBootstrapDropdown(tag: string, index: number): BootstrapComponent {
    const attrs = this.extractAttributes(tag);

    return {
      type: 'Dropdown',
      selector: attrs.id ? `#${attrs.id}` : attrs.class?.split(' ')[0] || '',
      options: {},
      triggerElement: attrs.id ? `#${attrs.id}` : '',
      events: ['show.bs.dropdown', 'shown.bs.dropdown', 'hide.bs.dropdown', 'hidden.bs.dropdown'],
      sourceCode: tag,
    };
  }

  /**
   * Parse Bootstrap tooltip
   */
  private parseBootstrapTooltip(tag: string, index: number): BootstrapComponent {
    const dataAttrs = this.extractDataAttrs(tag);

    return {
      type: 'Tooltip',
      selector: '',
      options: {
        title: dataAttrs['original-title'] || dataAttrs.title || '',
        placement: dataAttrs.placement || 'top',
        trigger: dataAttrs.trigger || 'hover focus',
      },
      events: ['show.bs.tooltip', 'shown.bs.tooltip', 'hide.bs.tooltip', 'hidden.bs.tooltip'],
      sourceCode: tag,
    };
  }

  /**
   * Parse Bootstrap popover
   */
  private parseBootstrapPopover(tag: string, index: number): BootstrapComponent {
    const dataAttrs = this.extractDataAttrs(tag);

    return {
      type: 'Popover',
      selector: '',
      options: {
        title: dataAttrs['original-title'] || dataAttrs.title || '',
        content: dataAttrs.content || '',
        placement: dataAttrs.placement || 'right',
        trigger: dataAttrs.trigger || 'click',
        html: dataAttrs.html || 'false',
      },
      events: ['show.bs.popover', 'shown.bs.popover', 'hide.bs.popover', 'hidden.bs.popover'],
      sourceCode: tag,
    };
  }

  /**
   * Parse Bootstrap carousel
   */
  private parseBootstrapCarousel(tag: string, index: number): BootstrapComponent {
    const attrs = this.extractAttributes(tag);
    const dataAttrs = this.extractDataAttrs(tag);

    return {
      type: 'Carousel',
      selector: `#${attrs.id || ''}`,
      options: {
        interval: dataAttrs.interval || '5000',
        keyboard: dataAttrs.keyboard || 'true',
        pause: dataAttrs.pause || 'hover',
        ride: dataAttrs.ride || 'carousel',
      },
      events: ['slide.bs.carousel', 'slid.bs.carousel'],
      sourceCode: tag,
    };
  }

  /**
   * Extract form relationships
   */
  private extractFormRelationships(): FormRelationship[] {
    const forms: FormRelationship[] = [];

    // Find all forms
    const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let match;

    while ((match = formRegex.exec(this.content)) !== null) {
      const formTag = match[0];
      const formContent = match[1];
      const attrs = this.extractAttributes(formTag);

      // Extract fields from form
      const fields = this.extractFormFields(formContent);

      // Extract submit buttons
      const submitButtons = this.extractSubmitButtons(formContent);

      // Determine validation trigger
      const validationTrigger = this.determineValidationTrigger(formContent);

      // Check for client validation
      const hasClientValidation = /data-val|jquery\.validate|\$\(.*\)\.validate/i.test(formContent);

      // Find related scripts
      const relatedScripts = this.findRelatedScripts(attrs.id);

      forms.push({
        formId: attrs.id || attrs.name || '',
        formAction: attrs.action || '',
        method: attrs.method || 'POST',
        fields,
        submitButtons,
        validationTrigger,
        hasClientValidation,
        relatedScripts,
      });
    }

    return forms;
  }

  /**
   * Extract form fields
   */
  private extractFormFields(formContent: string): FormFieldRelationship[] {
    const fields: FormFieldRelationship[] = [];
    
    // Input fields
    const inputRegex = /<input[^>]*\/?>/gi;
    let match;
    
    while ((match = inputRegex.exec(formContent)) !== null) {
      const tag = match[0];
      const attrs = this.extractAttributes(tag);
      const dataAttrs = this.extractDataAttrs(tag);
      
      if (attrs.type === 'submit' || attrs.type === 'button') continue;
      
      // Find label
      const label = this.findLabelForField(formContent, attrs.name || attrs.id || '');
      
      // Check for dependencies
      const dependsOn = this.findFieldDependencies(dataAttrs);
      
      fields.push({
        name: attrs.name || attrs.id || '',
        type: attrs.type || 'text',
        isRequired: attrs.required === 'true' || !!dataAttrs['val-required'],
        hasRemoteValidation: !!dataAttrs['val-remote'],
        dependsOn,
        label,
      });
    }

    // Select fields
    const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>/gi;
    while ((match = selectRegex.exec(formContent)) !== null) {
      const tag = match[0];
      const attrs = this.extractAttributes(tag);
      const dataAttrs = this.extractDataAttrs(tag);
      
      fields.push({
        name: attrs.name || '',
        type: 'select',
        isRequired: attrs.required === 'true',
        hasRemoteValidation: false,
        label: this.findLabelForField(formContent, attrs.name || ''),
      });
    }

    // Textarea fields
    const textareaRegex = /<textarea[^>]*name=["']([^"']+)["'][^>]*>/gi;
    while ((match = textareaRegex.exec(formContent)) !== null) {
      const tag = match[0];
      const attrs = this.extractAttributes(tag);
      
      fields.push({
        name: attrs.name || '',
        type: 'textarea',
        isRequired: attrs.required === 'true',
        hasRemoteValidation: false,
        label: this.findLabelForField(formContent, attrs.name || ''),
      });
    }

    return fields;
  }

  /**
   * Find label for field
   */
  private findLabelForField(content: string, fieldName: string): string | undefined {
    // Try label with for attribute
    const labelForRegex = new RegExp(`<label[^>]*for=["']${fieldName}["'][^>]*>([^<]+)</label>`, 'i');
    const labelForMatch = content.match(labelForRegex);
    if (labelForMatch) return labelForMatch[1].trim();

    // Try label wrapping the field
    const labelWrapRegex = new RegExp(`<label[^>]*>([^<]*)<[^>]*name=["']${fieldName}["']`, 'i');
    const labelWrapMatch = content.match(labelWrapRegex);
    if (labelWrapMatch) return labelWrapMatch[1].trim();

    // Try asp-for label
    const aspLabelRegex = new RegExp(`<label[^>]*asp-for=["']${fieldName}["'][^>]*>([^<]*)</label>`, 'i');
    const aspLabelMatch = content.match(aspLabelRegex);
    if (aspLabelMatch) return aspLabelMatch[1].trim();

    return undefined;
  }

  /**
   * Find field dependencies from data attributes
   */
  private findFieldDependencies(dataAttrs: Record<string, string>): string[] | undefined {
    const deps: string[] = [];
    
    if (dataAttrs['val-equalto']) {
      deps.push(dataAttrs['val-equalto'].replace(/[#.]/g, ''));
    }
    
    if (dataAttrs['depends-on']) {
      deps.push(dataAttrs['depends-on']);
    }
    
    return deps.length > 0 ? deps : undefined;
  }

  /**
   * Extract submit buttons
   */
  private extractSubmitButtons(formContent: string): string[] {
    const buttons: string[] = [];
    
    const buttonRegex = /<(?:button[^>]*type=["']submit["']|input[^>]*type=["']submit["'])[^>]*(?:id|name)=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = buttonRegex.exec(formContent)) !== null) {
      buttons.push(match[1]);
    }

    return buttons;
  }

  /**
   * Determine validation trigger
   */
  private determineValidationTrigger(formContent: string): 'onsubmit' | 'onchange' | 'manual' {
    if (dataAttrs['val-trigger'] === 'onchange') return 'onchange';
    if (/onsubmit|\.validate\s*\(/i.test(formContent)) return 'onsubmit';
    if (/onchange|onblur/i.test(formContent)) return 'onchange';
    return 'onsubmit';
  }

  /**
   * Find related scripts for a form
   */
  private findRelatedScripts(formId?: string): string[] {
    const scripts: string[] = [];
    if (!formId) return scripts;

    // Find scripts that reference this form
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(this.content)) !== null) {
      const scriptContent = match[1];
      if (scriptContent.includes(`#${formId}`) || scriptContent.includes(`'${formId}'`)) {
        scripts.push(scriptContent.substring(0, 200));
      }
    }

    return scripts;
  }

  /**
   * Extract hidden fields with their purposes
   */
  private extractHiddenFields(): HiddenFieldPurpose[] {
    const hiddenFields: HiddenFieldPurpose[] = [];
    
    const hiddenRegex = /<input[^>]*type=["']hidden["'][^>]*\/?>/gi;
    let match;
    
    while ((match = hiddenRegex.exec(this.content)) !== null) {
      const tag = match[0];
      const attrs = this.extractAttributes(tag);
      const name = attrs.name || attrs.id || '';
      const value = attrs.value || '';
      
      hiddenFields.push({
        name,
        value,
        purpose: this.inferHiddenFieldPurpose(name, value),
        relatedEntity: this.inferRelatedEntity(name),
      });
    }

    return hiddenFields;
  }

  /**
   * Infer hidden field purpose
   */
  private inferHiddenFieldPurpose(name: string, value: string): HiddenFieldPurpose['purpose'] {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('id') && !nameLower.includes('request')) return 'id';
    if (nameLower.includes('token') || nameLower.includes('csrf') || nameLower.includes('antiforgery')) return 'token';
    if (nameLower.includes('state') || nameLower.includes('status')) return 'state';
    if (nameLower.includes('timestamp') || nameLower.includes('date') || nameLower.includes('time')) return 'timestamp';
    if (nameLower.endsWith('id') && !nameLower.includes('id')) return 'foreign_key';
    if (nameLower.includes('config') || nameLower.includes('setting')) return 'config';
    
    return 'unknown';
  }

  /**
   * Infer related entity from hidden field name
   */
  private inferRelatedEntity(name: string): string | undefined {
    // Pattern: OrganizationId -> Organization
    const fkMatch = name.match(/^(.+)Id$/i);
    if (fkMatch) return fkMatch[1];
    
    // Pattern: Parent_Id -> Parent
    const parentMatch = name.match(/^(.+)__Id$/i);
    if (parentMatch) return parentMatch[1];
    
    return undefined;
  }

  /**
   * Extract action elements (links, buttons with actions)
   */
  private extractActionElements(): ActionElement[] {
    const actions: ActionElement[] = [];

    // ASP.NET Core Tag Helpers: asp-action, asp-controller
    const aspActionRegex = /<(?:a|button)[^>]*(?:asp-action|asp-controller)[^>]*>/gi;
    let match;
    
    while ((match = aspActionRegex.exec(this.content)) !== null) {
      const tag = match[0];
      const attrs = this.extractAttributes(tag);
      const dataAttrs = this.extractDataAttrs(tag);
      
      const isAjax = 'ajax' in dataAttrs || /data-ajax/i.test(tag);
      
      actions.push({
        type: tag.startsWith('<a') ? 'link' : 'button',
        selector: attrs.id ? `#${attrs.id}` : attrs.name || '',
        action: attrs['asp-action'] || '',
        controller: attrs['asp-controller'] || '',
        httpMethod: attrs['asp-method'] || (tag.startsWith('<button') ? 'POST' : 'GET'),
        confirmation: dataAttrs.confirm,
        dataAttributes: dataAttrs,
        isAjax,
        target: attrs.target,
      });
    }

    // Html.ActionLink helpers
    const actionLinkRegex = /@Html\.ActionLink\s*\(\s*"([^"]+)"\s*,\s*"(\w+)"\s*,\s*"(\w+)"[^)]*\)/gi;
    while ((match = actionLinkRegex.exec(this.content)) !== null) {
      actions.push({
        type: 'link',
        selector: '',
        action: match[2],
        controller: match[3],
        httpMethod: 'GET',
        isAjax: false,
        dataAttributes: {},
      });
    }

    // Form action buttons
    const formActionRegex = /<button[^>]*formaction=["']([^"']+)["'][^>]*>/gi;
    while ((match = formActionRegex.exec(this.content)) !== null) {
      const tag = match[0];
      const attrs = this.extractAttributes(tag);
      const dataAttrs = this.extractDataAttrs(tag);
      
      const formAction = attrs.formaction || '';
      const parts = formAction.split('/').filter(Boolean);
      
      actions.push({
        type: 'submit',
        selector: attrs.id ? `#${attrs.id}` : '',
        action: parts[parts.length - 1] || '',
        controller: parts.length > 1 ? parts[0] : '',
        httpMethod: 'POST',
        confirmation: dataAttrs.confirm,
        dataAttributes: dataAttrs,
        isAjax: false,
      });
    }

    // Delete buttons with confirmation
    const deleteBtnRegex = /<(?:a|button)[^>]*(?:data-delete|data-action=["']delete["'])[^>]*>/gi;
    while ((match = deleteBtnRegex.exec(this.content)) !== null) {
      const tag = match[0];
      const attrs = this.extractAttributes(tag);
      const dataAttrs = this.extractDataAttrs(tag);
      
      actions.push({
        type: tag.startsWith('<a') ? 'link' : 'button',
        selector: attrs.id ? `#${attrs.id}` : '',
        action: 'Delete',
        controller: dataAttrs.controller,
        httpMethod: 'DELETE',
        confirmation: dataAttrs.confirm || dataAttrs['delete-confirm'],
        dataAttributes: dataAttrs,
        isAjax: true,
      });
    }

    return actions;
  }

  /**
   * Extract modal definitions
   */
  private extractModals(): ModalDefinition[] {
    const modals: ModalDefinition[] = [];
    
    const modalRegex = /<div[^>]*class="[^"]*modal[^"]*"[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let match;
    
    while ((match = modalRegex.exec(this.content)) !== null) {
      const modalId = match[1];
      const modalContent = match[2];
      
      // Find title
      const titleMatch = modalContent.match(/<h[45][^>]*class="[^"]*modal-title[^"]*"[^>]*>([^<]+)</);
      const title = titleMatch ? titleMatch[1].trim() : undefined;
      
      // Find form inside
      const formMatch = modalContent.match(/<form[^>]*id=["']([^"']+)["']/i);
      
      // Find trigger selectors
      const triggers: string[] = [];
      const triggerRegex = new RegExp(`data-target=["']#${modalId}["']|data-bs-target=["']#${modalId}["']`, 'gi');
      let triggerMatch;
      while ((triggerMatch = triggerRegex.exec(this.content)) !== null) {
        // Find the element containing this trigger
        const beforeTrigger = this.content.substring(Math.max(0, triggerMatch.index - 100), triggerMatch.index);
        const idMatch = beforeTrigger.match(/id=["']([^"']+)["']/);
        if (idMatch) triggers.push(`#${idMatch[1]}`);
      }
      
      modals.push({
        id: modalId,
        title,
        triggerSelectors: triggers,
        formInside: formMatch?.[1],
        hasDynamicContent: /load\s*\(|\.html\s*\(|\.append\s*\(/i.test(modalContent),
        size: /modal-lg/i.test(match[0]) ? 'large' : /modal-sm/i.test(match[0]) ? 'small' : 'default',
        backdrop: !/data-backdrop=["']false["']/i.test(match[0]),
        keyboardClose: !/data-keyboard=["']false["']/i.test(match[0]),
      });
    }

    return modals;
  }

  /**
   * Extract tabs and accordions
   */
  private extractTabsAccordions(): TabAccordionStructure[] {
    const structures: TabAccordionStructure[] = [];

    // Bootstrap Tabs
    const tabsRegex = /<ul[^>]*class="[^"]*nav\s+nav-tabs[^"]*"[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/ul>/gi;
    let match;
    
    while ((match = tabsRegex.exec(this.content)) !== null) {
      const containerId = match[1];
      const tabList = match[2];
      
      const items: TabAccordionItem[] = [];
      const itemRegex = /<li[^>]*><a[^>]*href=["']#([^"']+)["'][^>]*>([^<]+)<\/a><\/li>/gi;
      let itemMatch;
      
      while ((itemMatch = itemRegex.exec(tabList)) !== null) {
        items.push({
          id: itemMatch[1],
          title: itemMatch[2].trim(),
          contentSelector: `#${itemMatch[1]}`,
          isRemote: /data-remote|data-url/i.test(itemMatch[0]),
          isDisabled: /disabled/i.test(itemMatch[0]),
        });
      }
      
      // Find active tab
      const activeMatch = tabList.match(/class="[^"]*active[^"]*"[^>]*href=["']#([^"']+)["']/i);
      
      structures.push({
        type: 'tabs',
        containerId,
        items,
        activeItem: activeMatch?.[1],
        isLazyLoad: /data-toggle="tab".*data-url/i.test(this.content),
      });
    }

    // Bootstrap Pills
    const pillsRegex = /<ul[^>]*class="[^"]*nav\s+nav-pills[^"]*"[^>]*id=["']([^"']+)["'][^>]*>/gi;
    while ((match = pillsRegex.exec(this.content)) !== null) {
      // Similar parsing to tabs
      structures.push({
        type: 'pills',
        containerId: match[1],
        items: [],
        isLazyLoad: false,
      });
    }

    // Accordions
    const accordionRegex = /<div[^>]*class="[^"]*(?:accordion|panel-group)[^"]*"[^>]*id=["']([^"']+)["'][^>]*>/gi;
    while ((match = accordionRegex.exec(this.content)) !== null) {
      structures.push({
        type: 'accordion',
        containerId: match[1],
        items: [],
        isLazyLoad: false,
      });
    }

    return structures;
  }

  /**
   * Extract DataTable configurations
   */
  private extractDataTables(): DataTableConfig[] {
    const dataTables: DataTableConfig[] = [];

    // Find script sections with DataTable initialization
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;

    while ((scriptMatch = scriptRegex.exec(this.content)) !== null) {
      const scriptContent = scriptMatch[1];
      
      // DataTable initialization patterns
      const dtRegex = /\$\((["'])([^"']+)\1\)\.(?:DataTable|dataTable)\s*\(\s*\{([\s\S]*?)\}\s*\)/gi;
      let dtMatch;

      while ((dtMatch = dtRegex.exec(scriptContent)) !== null) {
        const selector = dtMatch[2];
        const configBody = dtMatch[3];

        // Extract columns
        const columns = this.extractDataTableColumns(configBody);

        // Extract ajax config
        const ajaxUrl = this.extractAjaxUrl(configBody);

        // Extract features
        const features = this.extractDataTableFeatures(configBody);

        dataTables.push({
          selector,
          ajaxUrl,
          ajaxMethod: this.extractAjaxMethod(configBody),
          columns,
          features,
          events: this.extractDataTableEvents(configBody),
          sourceCode: dtMatch[0].substring(0, 500),
        });
      }
    }

    return dataTables;
  }

  /**
   * Extract DataTable columns
   */
  private extractDataTableColumns(configBody: string): DataTableColumn[] {
    const columns: DataTableColumn[] = [];

    // Columns array
    const colsMatch = configBody.match(/columns\s*:\s*\[([\s\S]*?)\]/);
    if (colsMatch) {
      const colsBody = colsMatch[1];
      
      // Each column object
      const colObjRegex = /\{([^}]+)\}/g;
      let colMatch;
      
      while ((colMatch = colObjRegex.exec(colsBody)) !== null) {
        const colBody = colMatch[1];
        
        columns.push({
          data: this.extractProp(colBody, 'data') || '',
          title: this.extractProp(colBody, 'title'),
          render: this.extractProp(colBody, 'render'),
          isSortable: !/orderable\s*:\s*false/i.test(colBody),
          isSearchable: !/searchable\s*:\s*false/i.test(colBody),
          className: this.extractProp(colBody, 'className') || this.extractProp(colBody, 'class'),
        });
      }
    }

    // ColumnDefs
    const colDefsMatch = configBody.match(/columnDefs\s*:\s*\[([\s\S]*?)\]/);
    if (colDefsMatch) {
      // Parse columnDefs similar to columns
    }

    return columns;
  }

  /**
   * Extract property from object string
   */
  private extractProp(objStr: string, propName: string): string | undefined {
    const regex = new RegExp(`${propName}\\s*:\\s*["']([^"']+)["']`);
    const match = objStr.match(regex);
    return match?.[1];
  }

  /**
   * Extract AJAX URL from config
   */
  private extractAjaxUrl(configBody: string): string | undefined {
    // ajax: "url"
    const simpleMatch = configBody.match(/ajax\s*:\s*["']([^"']+)["']/);
    if (simpleMatch) return simpleMatch[1];

    // ajax: { url: "..." }
    const objMatch = configBody.match(/ajax\s*:\s*\{[^}]*url\s*:\s*["']([^"']+)["']/);
    return objMatch?.[1];
  }

  /**
   * Extract AJAX method from config
   */
  private extractAjaxMethod(configBody: string): string | undefined {
    const match = configBody.match(/ajax\s*:\s*\{[^}]*type\s*:\s*["'](\w+)["']/i);
    return match?.[1];
  }

  /**
   * Extract DataTable features
   */
  private extractDataTableFeatures(configBody: string): DataTableFeatures {
    return {
      paging: !/paging\s*:\s*false/i.test(configBody),
      searching: !/searching\s*:\s*false/i.test(configBody),
      ordering: !/ordering\s*:\s*false/i.test(configBody),
      info: !/info\s*:\s*false/i.test(configBody),
      serverSide: /serverSide\s*:\s*true/i.test(configBody),
      responsive: /responsive\s*:\s*true/i.test(configBody),
      exportButtons: this.extractExportButtons(configBody),
    };
  }

  /**
   * Extract export buttons
   */
  private extractExportButtons(configBody: string): string[] {
    const buttons: string[] = [];
    const buttonsMatch = configBody.match(/buttons\s*:\s*\[([\s\S]*?)\]/);
    
    if (buttonsMatch) {
      const btnBody = buttonsMatch[1];
      const btnTypes = ['copy', 'csv', 'excel', 'pdf', 'print', 'colvis'];
      
      for (const btn of btnTypes) {
        if (btnBody.includes(`'${btn}'`) || btnBody.includes(`"${btn}"`)) {
          buttons.push(btn);
        }
      }
    }

    return buttons;
  }

  /**
   * Extract DataTable events
   */
  private extractDataTableEvents(configBody: string): string[] {
    const events: string[] = [];
    const dtEvents = ['draw', 'init', 'preDraw', 'destroy', 'page', 'search', 'order', 'length'];
    
    for (const event of dtEvents) {
      if (configBody.includes(`on('${event}`) || configBody.includes(`.on('${event}`)) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Extract Select2 configurations
   */
  private extractSelect2Configs(): Select2Config[] {
    const configs: Select2Config[] = [];

    // Find script sections
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;

    while ((scriptMatch = scriptRegex.exec(this.content)) !== null) {
      const scriptContent = scriptMatch[1];
      
      // Select2 initialization
      const s2Regex = /\$\((["'])([^"']+)\1\)\.select2\s*\(\s*(?:\{([\s\S]*?)\})?\s*\)/gi;
      let s2Match;

      while ((s2Match = s2Regex.exec(scriptContent)) !== null) {
        const selector = s2Match[2];
        const configBody = s2Match[3] || '';

        // Check for cascade
        const isCascade = /cascade|parent|depends/i.test(configBody);
        const parentMatch = configBody.match(/parent\s*:\s*["']([^"']+)["']/i);

        configs.push({
          selector,
          ajaxUrl: this.extractAjaxUrl(configBody),
          ajaxMethod: this.extractAjaxMethod(configBody),
          placeholder: this.extractProp(configBody, 'placeholder'),
          allowClear: /allowClear\s*:\s*true/i.test(configBody),
          multiple: /multiple\s*:\s*true/i.test(configBody),
          minimumInputLength: this.extractMinInputLength(configBody),
          templateResult: this.extractProp(configBody, 'templateResult'),
          templateSelection: this.extractProp(configBody, 'templateSelection'),
          isCascade,
          parentSelector: parentMatch?.[1],
        });
      }
    }

    return configs;
  }

  /**
   * Extract minimum input length
   */
  private extractMinInputLength(configBody: string): number | undefined {
    const match = configBody.match(/minimumInputLength\s*:\s*(\d+)/i);
    return match ? parseInt(match[1]) : undefined;
  }

  /**
   * Extract custom components
   */
  private extractCustomComponents(): CustomComponent[] {
    const components: CustomComponent[] = [];

    // Date picker (jQuery UI, Bootstrap Datepicker, etc.)
    const datePickerRegex = /\$\((["'])([^"']+)\1\)\.(?:datepicker|datetimepicker|daterangepicker)\s*\(\s*(\{[\s\S]*?\})?\s*\)/gi;
    let match;
    
    while ((match = datePickerRegex.exec(this.content)) !== null) {
      components.push({
        type: 'DatePicker',
        selector: match[2],
        library: match[0].includes('daterangepicker') ? 'daterangepicker' : 
                 match[0].includes('datetimepicker') ? 'datetimepicker' : 'datepicker',
        configuration: this.parseConfigObject(match[3]),
        sourceCode: match[0].substring(0, 200),
      });
    }

    // Time picker
    const timePickerRegex = /\$\((["'])([^"']+)\1\)\.timepicker\s*\(/gi;
    while ((match = timePickerRegex.exec(this.content)) !== null) {
      components.push({
        type: 'TimePicker',
        selector: match[2],
        library: 'timepicker',
        configuration: {},
        sourceCode: match[0],
      });
    }

    // Masked input
    const maskRegex = /\$\((["'])([^"']+)\1\)\.mask\s*\(\s*["']([^"']+)["']\s*\)/gi;
    while ((match = maskRegex.exec(this.content)) !== null) {
      components.push({
        type: 'MaskedInput',
        selector: match[2],
        library: 'jquery-mask',
        configuration: { mask: match[3] },
        sourceCode: match[0],
      });
    }

    // Rich text editor (TinyMCE, CKEditor, Summernote)
    const tinymceRegex = /tinymce\.(?:init|initEditor)\s*\(\s*\{[\s\S]*?selector\s*:\s*["']([^"']+)["']/gi;
    while ((match = tinymceRegex.exec(this.content)) !== null) {
      components.push({
        type: 'RichTextEditor',
        selector: match[1],
        library: 'tinymce',
        configuration: {},
        sourceCode: match[0].substring(0, 200),
      });
    }

    const ckeditorRegex = /CKEDITOR\.(?:replace|inline)\s*\(\s*["']([^"']+)["']/gi;
    while ((match = ckeditorRegex.exec(this.content)) !== null) {
      components.push({
        type: 'RichTextEditor',
        selector: `#${match[1]}`,
        library: 'ckeditor',
        configuration: {},
        sourceCode: match[0],
      });
    }

    const summernoteRegex = /\$\((["'])([^"']+)\1\)\.summernote\s*\(/gi;
    while ((match = summernoteRegex.exec(this.content)) !== null) {
      components.push({
        type: 'RichTextEditor',
        selector: match[2],
        library: 'summernote',
        configuration: {},
        sourceCode: match[0],
      });
    }

    // SweetAlert
    const sweetAlertRegex = /swal\s*\(\s*\{([\s\S]*?)\}\s*\)/gi;
    while ((match = sweetAlertRegex.exec(this.content)) !== null) {
      components.push({
        type: 'AlertDialog',
        selector: '',
        library: 'sweetalert',
        configuration: this.parseConfigObject(match[1]),
        sourceCode: match[0].substring(0, 200),
      });
    }

    // Toastr notifications
    const toastrRegex = /toastr\.(success|error|warning|info)\s*\(\s*["']([^"']+)["']/gi;
    while ((match = toastrRegex.exec(this.content)) !== null) {
      components.push({
        type: 'Notification',
        selector: '',
        library: 'toastr',
        configuration: { type: match[1], message: match[2] },
        sourceCode: match[0],
      });
    }

    // File upload (Dropzone, FineUploader, etc.)
    const dropzoneRegex = /new\s+Dropzone\s*\(\s*["']([^"']+)["']/gi;
    while ((match = dropzoneRegex.exec(this.content)) !== null) {
      components.push({
        type: 'FileUpload',
        selector: match[1],
        library: 'dropzone',
        configuration: {},
        sourceCode: match[0],
      });
    }

    return components;
  }

  /**
   * Parse configuration object string
   */
  private parseConfigObject(objStr?: string): Record<string, unknown> {
    if (!objStr) return {};
    
    const config: Record<string, unknown> = {};
    
    // Simple key: value parsing
    const propRegex = /(\w+)\s*:\s*(?:["']([^"']+)["']|(\d+)|(true|false|null))/g;
    let match;
    
    while ((match = propRegex.exec(objStr)) !== null) {
      const key = match[1];
      const value = match[2] || match[3] || match[4];
      config[key] = value;
    }

    return config;
  }

  /**
   * Calculate complexity score
   */
  private calculateComplexity(): number {
    let score = 0;

    // Count elements
    score += (this.content.match(/<[a-z][^>]*>/gi) || []).length;

    // Count data attributes
    score += (this.content.match(/data-[\w-]+=/gi) || []).length * 2;

    // Count forms
    score += (this.content.match(/<form/gi) || []).length * 5;

    // Count JavaScript in script tags
    const scripts = this.content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    scripts.forEach(script => {
      score += (script.match(/\{|\}/g) || []).length;
    });

    return score;
  }
}

// Export singleton
export const htmlParser = new HTMLParserEngine('');
