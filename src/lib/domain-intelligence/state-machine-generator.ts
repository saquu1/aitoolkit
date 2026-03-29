/**
 * State Machine Generator
 * 
 * Generates state machines from domain workflows for:
 * - Order workflows
 * - Approval flows
 * - Process automation
 * 
 * @module domain-intelligence/state-machine-generator
 */

import { BusinessDomain, WorkflowPattern } from './base'
import { DOMAIN_REGISTRY } from './detector'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * State definition in a state machine
 */
export interface StateDefinition {
  /** State identifier */
  id: string
  /** Display name */
  name: string
  /** State type */
  type: 'initial' | 'intermediate' | 'terminal' | 'error'
  /** State description */
  description?: string
  /** Entry actions */
  onEntry?: string[]
  /** Exit actions */
  onExit?: string[]
  /** Timeout configuration */
  timeout?: {
    duration: number
    unit: 'seconds' | 'minutes' | 'hours' | 'days'
    transitionTo: string
  }
  /** Sub-states for hierarchical state machines */
  subStates?: StateDefinition[]
}

/**
 * Transition between states
 */
export interface StateTransition {
  /** Transition ID */
  id: string
  /** From state */
  from: string
  /** To state */
  to: string
  /** Event that triggers this transition */
  event: string
  /** Guard condition (condition must be true to allow transition) */
  guard?: string
  /** Actions to perform during transition */
  actions?: string[]
  /** Description */
  description?: string
  /** Auto-transition (no event required) */
  auto?: boolean
}

/**
 * Complete state machine definition
 */
export interface StateMachineDefinition {
  /** Machine ID */
  id: string
  /** Display name */
  name: string
  /** Domain this machine belongs to */
  domain: BusinessDomain
  /** Entity/table this machine applies to */
  entityType: string
  /** Initial state */
  initialState: string
  /** All states */
  states: StateDefinition[]
  /** All transitions */
  transitions: StateTransition[]
  /** Events that can be triggered */
  events: string[]
  /** Context variables available in the machine */
  context?: Record<string, {
    type: string
    description?: string
    default?: any
  }>
  /** Generated timestamp */
  generatedAt: Date
  /** Source workflow pattern */
  sourceWorkflow?: string
}

/**
 * State machine visualization data
 */
export interface StateMachineVisualization {
  /** Nodes for graph visualization */
  nodes: Array<{
    id: string
    label: string
    type: 'initial' | 'intermediate' | 'terminal' | 'error'
    x?: number
    y?: number
  }>
  /** Edges for graph visualization */
  edges: Array<{
    id: string
    from: string
    to: string
    label: string
    dashed?: boolean
  }>
}

/**
 * Generated code output
 */
export interface GeneratedStateMachine {
  /** TypeScript/XState definition */
  typescript?: string
  /** Mermaid diagram */
  mermaid?: string
  /** PlantUML diagram */
  plantUml?: string
  /** JSON state machine definition */
  json?: string
}

// =============================================================================
// STATE MACHINE GENERATOR CLASS
// =============================================================================

export class StateMachineGenerator {
  
  /**
   * Generate state machine from workflow patterns for a domain
   */
  generateFromDomain(
    domain: BusinessDomain,
    options?: {
      entityTypes?: string[]
      includeVisualizations?: boolean
    }
  ): StateMachineDefinition[] {
    const domainDef = DOMAIN_REGISTRY[domain]
    if (!domainDef) {
      return []
    }
    
    const machines: StateMachineDefinition[] = []
    const workflows = domainDef.workflows
    
    for (const workflow of workflows) {
      // Filter by entity types if specified
      if (options?.entityTypes?.length) {
        const entityMatches = options.entityTypes.some(e => 
          (workflow.tableName instanceof RegExp) && workflow.tableName.test(e)
        )
        if (!entityMatches) continue
      }
      
      const machine = this.generateFromWorkflow(workflow, domain)
      machines.push(machine)
    }
    
    return machines
  }
  
  /**
   * Generate state machine from a single workflow pattern
   */
  generateFromWorkflow(
    workflow: WorkflowPattern,
    domain: BusinessDomain
  ): StateMachineDefinition {
    const states = this.generateStates(workflow.states)
    const transitions = this.generateTransitions(workflow.states, workflow.statusColumn)
    const events = this.extractEvents(transitions)
    
    return {
      id: this.generateMachineId(workflow.name),
      name: workflow.name,
      domain,
      entityType: workflow.tableName instanceof RegExp ? workflow.tableName.source : String(workflow.tableName),
      initialState: states.find(s => s.type === 'initial')?.id || workflow.states[0],
      states,
      transitions,
      events,
      context: this.generateContext(workflow),
      generatedAt: new Date(),
      sourceWorkflow: workflow.name
    }
  }
  
  /**
   * Generate state definitions from workflow states
   */
  private generateStates(workflowStates: string[]): StateDefinition[] {
    const states: StateDefinition[] = []
    const terminalStates = ['Completed', 'Closed', 'Cancelled', 'Rejected', 'Disqualified', 
                           'Expired', 'Delivered', 'Refunded', 'Lost', 'Won', 'Archived', 'Void']
    const errorStates = ['Failed', 'Rejected', 'Cancelled', 'Error', 'Void', 'Chargeback']
    
    for (let i = 0; i < workflowStates.length; i++) {
      const stateName = workflowStates[i]
      const normalizedId = this.normalizeStateId(stateName)
      
      let type: StateDefinition['type'] = 'intermediate'
      
      // First state is initial
      if (i === 0) {
        type = 'initial'
      }
      // Check if terminal state
      else if (terminalStates.some(t => stateName.toLowerCase().includes(t.toLowerCase()))) {
        type = 'terminal'
      }
      // Check if error state
      if (errorStates.some(e => stateName.toLowerCase().includes(e.toLowerCase()))) {
        type = 'error'
      }
      
      const state: StateDefinition = {
        id: normalizedId,
        name: stateName,
        type,
        description: this.generateStateDescription(stateName, type)
      }
      
      // Add entry/exit actions based on state type
      if (type === 'terminal' && !stateName.toLowerCase().includes('cancel')) {
        state.onEntry = [`record_completion_timestamp()`, `notify_stakeholders()`]
      }
      
      if (type === 'error') {
        state.onEntry = [`log_error()`, `notify_administrator()`]
      }
      
      states.push(state)
    }
    
    return states
  }
  
  /**
   * Generate transitions between states
   */
  private generateTransitions(
    states: string[],
    statusColumn: string
  ): StateTransition[] {
    const transitions: StateTransition[] = []
    let transitionId = 1
    
    // Standard forward progression
    for (let i = 0; i < states.length - 1; i++) {
      const fromState = this.normalizeStateId(states[i])
      const toState = this.normalizeStateId(states[i + 1])
      
      // Forward transition
      transitions.push({
        id: `trans_${transitionId++}`,
        from: fromState,
        to: toState,
        event: `advance_to_${toState}`,
        description: `Transition from ${states[i]} to ${states[i + 1]}`,
        actions: [`update_${statusColumn.toLowerCase()}('${states[i + 1]}')`]
      })
    }
    
    // Add common transitions based on state types
    const stateIds = states.map(s => this.normalizeStateId(s))
    
    // Find cancel/void states and add transitions from all states
    const cancelState = stateIds.find(s => 
      s.includes('cancel') || s.includes('void') || s.includes('reject')
    )
    
    if (cancelState) {
      for (const stateId of stateIds) {
        if (stateId !== cancelState && !stateId.includes('complete') && !stateId.includes('closed')) {
          transitions.push({
            id: `trans_${transitionId++}`,
            from: stateId,
            to: cancelState,
            event: 'cancel',
            description: `Cancel from ${stateId}`,
            guard: 'can_cancel()',
            actions: ['record_cancellation_reason()']
          })
        }
      }
    }
    
    return transitions
  }
  
  /**
   * Extract unique events from transitions
   */
  private extractEvents(transitions: StateTransition[]): string[] {
    const events = new Set<string>()
    for (const transition of transitions) {
      events.add(transition.event)
    }
    return Array.from(events)
  }
  
  /**
   * Generate context variables for the state machine
   */
  private generateContext(workflow: WorkflowPattern): Record<string, { type: string; description?: string; default?: any }> {
    return {
      status: {
        type: 'string',
        description: 'Current status of the entity',
        default: workflow.states[0]
      },
      statusHistory: {
        type: 'array',
        description: 'History of status changes'
      },
      assignedTo: {
        type: 'string | null',
        description: 'Current assignee'
      },
      createdAt: {
        type: 'Date',
        description: 'Creation timestamp'
      },
      updatedAt: {
        type: 'Date',
        description: 'Last update timestamp'
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata'
      }
    }
  }
  
  /**
   * Generate machine ID from name
   */
  private generateMachineId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
  }
  
  /**
   * Normalize state name to ID
   */
  private normalizeStateId(stateName: string): string {
    return stateName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
  }
  
  /**
   * Generate description for a state
   */
  private generateStateDescription(stateName: string, type: StateDefinition['type']): string {
    const descriptions: Record<string, string> = {
      initial: `Initial state - ${stateName}`,
      intermediate: `Processing state - ${stateName}`,
      terminal: `Final state - ${stateName}`,
      error: `Error/failure state - ${stateName}`
    }
    return descriptions[type]
  }
  
  // =============================================================================
  // CODE GENERATION METHODS
  // =============================================================================
  
  /**
   * Generate TypeScript/XState code
   */
  generateTypeScript(machine: StateMachineDefinition): string {
    const statesCode = machine.states.map(state => {
      const onTransitions = machine.transitions
        .filter(t => t.from === state.id)
        .map(t => `        '${t.event}': '${t.to}'`)
        .join(',\n')
      
      return `    ${state.id}: {
      type: '${state.type}',
      ${onTransitions ? `on: {\n${onTransitions}\n      }` : ''}
    }`
    }).join(',\n')
    
    return `import { createMachine, assign } from 'xstate';

/**
 * ${machine.name} State Machine
 * Domain: ${machine.domain}
 * Entity: ${machine.entityType}
 * Generated: ${machine.generatedAt.toISOString()}
 */
export const ${machine.id}Machine = createMachine({
  id: '${machine.id}',
  initial: '${machine.initialState}',
  context: {
    status: '${machine.initialState}',
    statusHistory: [],
    assignedTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {}
  },
  states: {
${statesCode}
  }
});

// Events that can be sent to this machine
export type ${this.toPascalCase(machine.id)}Event = 
${machine.events.map(e => `  | { type: '${e}' }`).join('\n')};

// State types
export type ${this.toPascalCase(machine.id)}State = 
${machine.states.map(s => `  | '${s.id}'`).join('\n')};
`
  }
  
  /**
   * Generate Mermaid diagram
   */
  generateMermaid(machine: StateMachineDefinition): string {
    const lines: string[] = [
      `stateDiagram-v2`,
      `    [*] --> ${machine.initialState}`
    ]
    
    for (const transition of machine.transitions) {
      lines.push(`    ${transition.from} --> ${transition.to} : ${transition.event}`)
    }
    
    // Mark terminal states
    for (const state of machine.states) {
      if (state.type === 'terminal') {
        lines.push(`    ${state.id} --> [*]`)
      }
    }
    
    return lines.join('\n')
  }
  
  /**
   * Generate PlantUML diagram
   */
  generatePlantUml(machine: StateMachineDefinition): string {
    const lines: string[] = [
      `@startuml ${machine.id}`,
      `title ${machine.name}`,
      ``,
      `[*] --> ${machine.initialState}`
    ]
    
    for (const state of machine.states) {
      let stateDef = `state "${state.name}" as ${state.id}`
      if (state.type === 'terminal') {
        stateDef += ' <<Final>>'
      } else if (state.type === 'error') {
        stateDef += ' <<Error>>'
      }
      lines.push(stateDef)
    }
    
    lines.push('')
    
    for (const transition of machine.transitions) {
      lines.push(`${transition.from} --> ${transition.to} : ${transition.event}`)
    }
    
    // Terminal states to end
    for (const state of machine.states) {
      if (state.type === 'terminal') {
        lines.push(`${state.id} --> [*]`)
      }
    }
    
    lines.push('@enduml')
    
    return lines.join('\n')
  }
  
  /**
   * Generate JSON definition
   */
  generateJson(machine: StateMachineDefinition): string {
    return JSON.stringify(machine, null, 2)
  }
  
  /**
   * Generate all output formats
   */
  generateAll(machine: StateMachineDefinition): GeneratedStateMachine {
    return {
      typescript: this.generateTypeScript(machine),
      mermaid: this.generateMermaid(machine),
      plantUml: this.generatePlantUml(machine),
      json: this.generateJson(machine)
    }
  }
  
  /**
   * Generate visualization data for graph rendering
   */
  generateVisualization(machine: StateMachineDefinition): StateMachineVisualization {
    const nodes = machine.states.map((state, index) => ({
      id: state.id,
      label: state.name,
      type: state.type
    }))
    
    const edges = machine.transitions.map(transition => ({
      id: transition.id,
      from: transition.from,
      to: transition.to,
      label: transition.event,
      dashed: transition.auto || false
    }))
    
    return { nodes, edges }
  }
  
  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }
  
  // =============================================================================
  // APPROVAL FLOW GENERATORS
  // =============================================================================
  
  /**
   * Generate standard approval workflow
   */
  generateApprovalWorkflow(
    entityType: string,
    domain: BusinessDomain,
    options?: {
      approvalLevels?: number
      requireReason?: boolean
      allowDelegation?: boolean
    }
  ): StateMachineDefinition {
    const levels = options?.approvalLevels ?? 1
    const states: StateDefinition[] = [
      { id: 'draft', name: 'Draft', type: 'initial', description: 'Initial draft state' },
      { id: 'submitted', name: 'Submitted', type: 'intermediate', description: 'Submitted for approval' }
    ]
    
    const transitions: StateTransition[] = [
      {
        id: 'trans_1',
        from: 'draft',
        to: 'submitted',
        event: 'submit',
        description: 'Submit for approval',
        actions: ['validate_submission()', 'notify_approvers()']
      }
    ]
    
    // Add approval levels
    for (let i = 1; i <= levels; i++) {
      const stateId = i === levels ? 'approved' : `approval_level_${i}`
      const stateName = i === levels ? 'Approved' : `Level ${i} Approval`
      
      states.push({
        id: stateId,
        name: stateName,
        type: i === levels ? 'terminal' : 'intermediate',
        description: stateName
      })
    }
    
    // Add rejected and cancelled states
    states.push(
      { id: 'rejected', name: 'Rejected', type: 'error', description: 'Rejected' },
      { id: 'cancelled', name: 'Cancelled', type: 'terminal', description: 'Cancelled' }
    )
    
    // Add transitions between approval levels
    for (let i = 0; i < levels; i++) {
      const fromState = i === 0 ? 'submitted' : `approval_level_${i}`
      const toState = i === levels - 1 ? 'approved' : `approval_level_${i + 1}`
      
      transitions.push({
        id: `trans_approve_${i + 1}`,
        from: fromState,
        to: toState,
        event: 'approve',
        description: `Approve at level ${i + 1}`,
        guard: options?.requireReason ? 'has_approval_reason()' : undefined,
        actions: ['record_approval()', 'notify_next_approver()']
      })
      
      transitions.push({
        id: `trans_reject_${i + 1}`,
        from: fromState,
        to: 'rejected',
        event: 'reject',
        description: `Reject at level ${i + 1}`,
        guard: 'has_rejection_reason()',
        actions: ['record_rejection()', 'notify_submitter()']
      })
    }
    
    // Add cancel transition
    transitions.push({
      id: 'trans_cancel',
      from: 'draft',
      to: 'cancelled',
      event: 'cancel',
      description: 'Cancel the request'
    })
    
    const events = ['submit', 'approve', 'reject', 'cancel']
    
    return {
      id: `${entityType.toLowerCase()}_approval_workflow`,
      name: `${entityType} Approval Workflow`,
      domain,
      entityType,
      initialState: 'draft',
      states,
      transitions,
      events,
      context: {
        approvalLevel: { type: 'number', default: 0 },
        approvalHistory: { type: 'array', default: [] },
        rejectionReason: { type: 'string | null' },
        delegatedTo: { type: 'string | null' }
      },
      generatedAt: new Date()
    }
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const stateMachineGenerator = new StateMachineGenerator()

/**
 * Generate state machines for a domain
 */
export function generateDomainStateMachines(
  domain: BusinessDomain,
  options?: { entityTypes?: string[] }
): StateMachineDefinition[] {
  return stateMachineGenerator.generateFromDomain(domain, options)
}

/**
 * Generate approval workflow
 */
export function generateApprovalWorkflow(
  entityType: string,
  domain: BusinessDomain,
  options?: { approvalLevels?: number }
): StateMachineDefinition {
  return stateMachineGenerator.generateApprovalWorkflow(entityType, domain, options)
}
