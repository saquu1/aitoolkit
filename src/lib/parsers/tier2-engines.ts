// =============================================================================
// TIER 2 ENGINES - RELATIONSHIP ENGINE & AI ENRICHMENT
// =============================================================================
// Layer 4: Relationship Engine - FK chains, M:M, self-ref, hierarchy, polymorphic
// Layer 5: AI Enrichment - GPT post-process for ambiguous fields
// =============================================================================

import type { MergedEntity } from './tier1-engines'

// =============================================================================
// SECTION 1: RELATIONSHIP TYPES AND INTERFACES
// =============================================================================

export type RelationshipType = 
  | '1:1'      // One-to-One (e.g., User -> Profile)
  | '1:M'      // One-to-Many (e.g., Order -> OrderItems)
  | 'M:1'      // Many-to-One (e.g., OrderItems -> Order)
  | 'M:M'      // Many-to-Many (e.g., User <-> Role via UserRole)
  | 'SELF_REF' // Self-referencing (e.g., Employee.ManagerId -> Employee)
  | 'POLYMORPHIC' // Polymorphic (e.g., Comment.EntityType + EntityId)
  | 'CASCADE'  // Cascading FK chain (e.g., Country -> Province -> City)

export interface Relationship {
  id: string
  type: RelationshipType
  fromTable: string
  toTable: string
  fromColumn: string
  toColumn: string
  fkColumn: string
  fkTable?: string // For M:M junction tables
  junctionTable?: string // For M:M relationships
  cascadeDelete: boolean
  isNullable: boolean
  confidence: number
  source: 'explicit' | 'inferred' | 'pattern' | 'ai_enriched'
  metadata?: {
    cascadeChain?: string[] // For CASCADE type
    polymorphicTypeColumn?: string // For POLYMORPHIC
    polymorphicTypes?: string[] // Possible entity types
    hierarchyLevel?: number // For SELF_REF (depth)
    hierarchyPath?: string[] // Path from root
    hierarchyType?: string // Type of hierarchy (parent_child, manager_employee, etc.)
    inferredFields?: string[] // For 1:1 relationships
  }
}

export interface RelationshipGraph {
  nodes: Map<string, EntityNode>
  edges: Relationship[]
  junctionTables: Map<string, JunctionTableInfo>
  hierarchyTrees: HierarchyTree[]
  cascadeChains: CascadeChain[]
}

export interface EntityNode {
  name: string
  fields: any[]
  primaryKey: string | null
  isJunctionTable: boolean
  inDegree: number // Number of incoming FKs
  outDegree: number // Number of outgoing FKs
  isLookupTable: boolean
  isAuditTable: boolean
}

export interface JunctionTableInfo {
  tableName: string
  entity1Table: string
  entity1Column: string
  entity2Table: string
  entity2Column: string
  extraColumns: string[]
  confidence: number
}

export interface HierarchyTree {
  tableName: string
  selfRefColumn: string
  rootNodes: string[]
  maxDepth: number
  totalNodes: number
}

export interface CascadeChain {
  chain: Array<{ table: string; column: string; references: string }>
  length: number
  tables: string[]
}

// =============================================================================
// SECTION 2: SELF-REFERENCING FK DETECTION ENGINE
// =============================================================================

export interface SelfRefPattern {
  pattern: RegExp
  label: string
  hierarchyType: 'parent_child' | 'manager_employee' | 'category_tree' | 'folder_structure' | 'generic'
}

export const SELF_REF_PATTERNS: SelfRefPattern[] = [
  // Parent-Child patterns
  { pattern: /^ParentId$/i, label: 'Parent', hierarchyType: 'parent_child' },
  { pattern: /^Parent_Id$/i, label: 'Parent', hierarchyType: 'parent_child' },
  { pattern: /^ParentKey$/i, label: 'Parent', hierarchyType: 'parent_child' },
  { pattern: /^ParentCode$/i, label: 'Parent', hierarchyType: 'parent_child' },
  
  // Manager-Employee patterns
  { pattern: /^ManagerId$/i, label: 'Manager', hierarchyType: 'manager_employee' },
  { pattern: /^Manager_Id$/i, label: 'Manager', hierarchyType: 'manager_employee' },
  { pattern: /^ReportsTo$/i, label: 'Reports To', hierarchyType: 'manager_employee' },
  { pattern: /^ReportsToId$/i, label: 'Reports To', hierarchyType: 'manager_employee' },
  { pattern: /^SupervisorId$/i, label: 'Supervisor', hierarchyType: 'manager_employee' },
  { pattern: /^SuperiorId$/i, label: 'Superior', hierarchyType: 'manager_employee' },
  
  // Category/Tree patterns
  { pattern: /^CategoryId$/i, label: 'Parent Category', hierarchyType: 'category_tree' },
  { pattern: /^ParentCategoryId$/i, label: 'Parent Category', hierarchyType: 'category_tree' },
  { pattern: /^ParentCategory_Id$/i, label: 'Parent Category', hierarchyType: 'category_tree' },
  
  // Folder/Structure patterns
  { pattern: /^FolderId$/i, label: 'Parent Folder', hierarchyType: 'folder_structure' },
  { pattern: /^ParentFolderId$/i, label: 'Parent Folder', hierarchyType: 'folder_structure' },
  
  // Generic hierarchy patterns
  { pattern: /^AncestorId$/i, label: 'Ancestor', hierarchyType: 'generic' },
  { pattern: /^PredecessorId$/i, label: 'Predecessor', hierarchyType: 'generic' },
]

export class SelfReferencingEngine {
  /**
   * Detect self-referencing FK in a single entity
   */
  detect(entity: MergedEntity): Relationship[] {
    const relationships: Relationship[] = []
    const selfRefFields = entity.fields.filter(f => this.isSelfRefField(f.name))
    
    for (const field of selfRefFields) {
      const pattern = this.matchPattern(field.name)
      
      relationships.push({
        id: `${entity.entityName}_SELF_REF_${field.name}`,
        type: 'SELF_REF',
        fromTable: entity.entityName,
        toTable: entity.entityName,
        fromColumn: field.name,
        toColumn: entity.primaryKey || 'Id',
        fkColumn: field.name,
        cascadeDelete: false,
        isNullable: !field.constraints?.includes('NOT NULL'),
        confidence: 95,
        source: 'pattern',
        metadata: {
          hierarchyType: pattern?.hierarchyType || 'generic',
          hierarchyLevel: 0
        }
      })
    }
    
    return relationships
  }

  /**
   * Detect all self-referencing relationships in a list of entities
   */
  detectAll(entities: MergedEntity[]): Relationship[] {
    return entities.flatMap(entity => this.detect(entity))
  }

  /**
   * Build hierarchy trees from self-referencing relationships
   */
  buildHierarchyTrees(entities: MergedEntity[], relationships: Relationship[]): HierarchyTree[] {
    const trees: HierarchyTree[] = []
    const selfRefRels = relationships.filter(r => r.type === 'SELF_REF')
    
    for (const rel of selfRefRels) {
      const tree: HierarchyTree = {
        tableName: rel.fromTable,
        selfRefColumn: rel.fkColumn,
        rootNodes: [],
        maxDepth: this.estimateHierarchyDepth(entities, rel),
        totalNodes: 0
      }
      trees.push(tree)
    }
    
    return trees
  }

  private isSelfRefField(fieldName: string): boolean {
    return SELF_REF_PATTERNS.some(p => p.pattern.test(fieldName))
  }

  private matchPattern(fieldName: string): SelfRefPattern | undefined {
    return SELF_REF_PATTERNS.find(p => p.pattern.test(fieldName))
  }

  private estimateHierarchyDepth(entities: MergedEntity[], rel: Relationship): number {
    // Default estimation - actual depth would require data analysis
    const entity = entities.find(e => e.entityName === rel.fromTable)
    if (!entity) return 3
    
    // Estimate based on typical hierarchy depths
    const pattern = this.matchPattern(rel.fkColumn)
    switch (pattern?.hierarchyType) {
      case 'category_tree': return 5
      case 'folder_structure': return 8
      case 'manager_employee': return 6
      default: return 4
    }
  }
}

// =============================================================================
// SECTION 3: CASCADE FK CHAIN DETECTION ENGINE
// =============================================================================

export interface CascadePattern {
  parentPattern: RegExp
  childPattern: RegExp
  label: string
}

export const CASCADE_PATTERNS: CascadePattern[] = [
  // Geographic cascades
  { parentPattern: /^CountryId$/i, childPattern: /^ProvinceId$/i, label: 'Country -> Province' },
  { parentPattern: /^ProvinceId$/i, childPattern: /^CityId$/i, label: 'Province -> City' },
  { parentPattern: /^CityId$/i, childPattern: /^AreaId$/i, label: 'City -> Area' },
  { parentPattern: /^StateId$/i, childPattern: /^CityId$/i, label: 'State -> City' },
  { parentPattern: /^RegionId$/i, childPattern: /^DistrictId$/i, label: 'Region -> District' },
  { parentPattern: /^DistrictId$/i, childPattern: /^WardId$/i, label: 'District -> Ward' },
  
  // Organization cascades
  { parentPattern: /^CompanyId$/i, childPattern: /^BranchId$/i, label: 'Company -> Branch' },
  { parentPattern: /^BranchId$/i, childPattern: /^DepartmentId$/i, label: 'Branch -> Department' },
  { parentPattern: /^DepartmentId$/i, childPattern: /^SectionId$/i, label: 'Department -> Section' },
  { parentPattern: /^DivisionId$/i, childPattern: /^DepartmentId$/i, label: 'Division -> Department' },
  
  // Product cascades
  { parentPattern: /^CategoryId$/i, childPattern: /^SubCategoryId$/i, label: 'Category -> SubCategory' },
  { parentPattern: /^ProductGroupId$/i, childPattern: /^ProductTypeId$/i, label: 'ProductGroup -> ProductType' },
  
  // Account cascades
  { parentPattern: /^AccountGroupId$/i, childPattern: /^AccountTypeId$/i, label: 'AccountGroup -> AccountType' },
]

export class CascadeChainEngine {
  /**
   * Detect cascading FK chains from JS change handlers
   */
  detectFromJS(content: string, entities: MergedEntity[]): CascadeChain[] {
    const chains: CascadeChain[] = []
    const cascadePairs: Array<{ parent: string; child: string }> = []
    
    // Pattern 1: jQuery change -> ajax -> populate dropdown
    const jqCascadePattern = /\$\(["']#(\w+)["']\)\s*\.(?:change|on\s*\(\s*["']change["'])[\s\S]{0,800}?\$\s*\.\s*(?:ajax|get|getJSON|post)\s*\([\s\S]{0,500}?["']#(\w+)["']/gi
    let match
    while ((match = jqCascadePattern.exec(content)) !== null) {
      cascadePairs.push({ parent: match[1], child: match[2] })
    }
    
    // Pattern 2: fetch/axios cascades
    const fetchCascadePattern = /["']#(\w+)["'][\s\S]{0,100}?(?:change|onchange)[\s\S]{0,500}?(?:fetch|axios)[\s\S]{0,300}?["']#(\w+)["']/gi
    while ((match = fetchCascadePattern.exec(content)) !== null) {
      cascadePairs.push({ parent: match[1], child: match[2] })
    }
    
    // Build chains from pairs
    chains.push(...this.buildChainsFromPairs(cascadePairs))
    
    return chains
  }

  /**
   * Detect cascading FK chains from entity field patterns
   */
  detectFromEntities(entities: MergedEntity[]): CascadeChain[] {
    const chains: CascadeChain[] = []
    
    for (const cascadePattern of CASCADE_PATTERNS) {
      // Find entities that have the parent FK
      const entitiesWithParent = entities.filter(e => 
        e.fields.some(f => cascadePattern.parentPattern.test(f.name) && f.isFK)
      )
      
      // Find entities that have the child FK
      const entitiesWithChild = entities.filter(e =>
        e.fields.some(f => cascadePattern.childPattern.test(f.name) && f.isFK)
      )
      
      // If both exist, there's a potential cascade
      if (entitiesWithParent.length > 0 && entitiesWithChild.length > 0) {
        const chain: CascadeChain = {
          chain: [
            { table: cascadePattern.parentPattern.source.replace(/Id$/i, ''), column: cascadePattern.parentPattern.source, references: 'Parent' },
            { table: cascadePattern.childPattern.source.replace(/Id$/i, ''), column: cascadePattern.childPattern.source, references: 'Child' }
          ],
          length: 2,
          tables: [
            cascadePattern.parentPattern.source.replace(/Id$/i, ''),
            cascadePattern.childPattern.source.replace(/Id$/i, '')
          ]
        }
        chains.push(chain)
      }
    }
    
    // Try to build longer chains
    chains.push(...this.buildLongerChains(chains))
    
    return chains
  }

  /**
   * Build chains from cascade pairs
   */
  private buildChainsFromPairs(pairs: Array<{ parent: string; child: string }>): CascadeChain[] {
    const chains: CascadeChain[] = []
    const usedPairs = new Set<number>()
    
    for (let i = 0; i < pairs.length; i++) {
      if (usedPairs.has(i)) continue
      
      const chain: CascadeChain = {
        chain: [{ table: pairs[i].parent, column: `${pairs[i].parent}Id`, references: 'Root' }],
        length: 1,
        tables: [pairs[i].parent]
      }
      
      let current = pairs[i]
      usedPairs.add(i)
      
      // Find chain continuations
      let foundNext = true
      while (foundNext) {
        foundNext = false
        for (let j = 0; j < pairs.length; j++) {
          if (usedPairs.has(j)) continue
          
          if (pairs[j].parent === current.child) {
            chain.chain.push({ table: pairs[j].parent, column: `${pairs[j].parent}Id`, references: pairs[j].child })
            chain.tables.push(pairs[j].child)
            chain.length++
            current = pairs[j]
            usedPairs.add(j)
            foundNext = true
            break
          }
        }
      }
      
      if (chain.length >= 2) {
        chains.push(chain)
      }
    }
    
    return chains
  }

  /**
   * Build longer chains from shorter ones
   */
  private buildLongerChains(existingChains: CascadeChain[]): CascadeChain[] {
    const longerChains: CascadeChain[] = []
    
    // Try to connect chains where end of one matches start of another
    for (const chain1 of existingChains) {
      for (const chain2 of existingChains) {
        if (chain1 === chain2) continue
        
        const lastTable1 = chain1.tables[chain1.tables.length - 1]
        const firstTable2 = chain2.tables[0]
        
        if (lastTable1 === firstTable2) {
          // Merge chains
          const merged: CascadeChain = {
            chain: [...chain1.chain.slice(0, -1), ...chain2.chain],
            length: chain1.length + chain2.length - 1,
            tables: [...chain1.tables.slice(0, -1), ...chain2.tables]
          }
          longerChains.push(merged)
        }
      }
    }
    
    return longerChains
  }
}

// =============================================================================
// SECTION 4: MANY-TO-MANY DETECTION ENGINE
// =============================================================================

export class ManyToManyEngine {
  /**
   * Detect M:M relationships from junction tables
   */
  detectJunctionTables(entities: MergedEntity[]): JunctionTableInfo[] {
    const junctions: JunctionTableInfo[] = []
    
    for (const entity of entities) {
      const junctionInfo = this.analyzeJunctionCandidate(entity, entities)
      if (junctionInfo) {
        junctions.push(junctionInfo)
      }
    }
    
    return junctions
  }

  /**
   * Analyze if an entity is a junction table
   */
  private analyzeJunctionCandidate(entity: MergedEntity, allEntities: MergedEntity[]): JunctionTableInfo | null {
    const fkFields = entity.fields.filter(f => f.isFK && f.name.endsWith('Id'))
    
    // A junction table typically has exactly 2 FK columns (the two entities it connects)
    // and optionally a few extra columns (like IsActive, CreatedDate, etc.)
    
    if (fkFields.length !== 2) return null
    
    // Check if both FK columns reference actual entities
    const fk1 = fkFields[0]
    const fk2 = fkFields[1]
    
    const entity1 = fk1.fkTable || fk1.name.replace(/Id$/, '')
    const entity2 = fk2.fkTable || fk2.name.replace(/Id$/, '')
    
    // Verify both entities exist
    const entity1Exists = allEntities.some(e => e.entityName === entity1)
    const entity2Exists = allEntities.some(e => e.entityName === entity2)
    
    if (!entity1Exists || !entity2Exists) return null
    
    // Extra columns (not the two FK columns and not Id)
    const extraColumns = entity.fields
      .filter(f => f.name !== 'Id' && f.name !== fk1.name && f.name !== fk2.name)
      .map(f => f.name)
    
    // Junction tables typically have few extra columns
    if (extraColumns.length > 5) return null
    
    return {
      tableName: entity.entityName,
      entity1Table: entity1,
      entity1Column: fk1.name,
      entity2Table: entity2,
      entity2Column: fk2.name,
      extraColumns,
      confidence: extraColumns.length <= 2 ? 95 : 80
    }
  }

  /**
   * Detect M:M from ListBoxFor/multiselect patterns
   */
  detectFromMultiselect(entities: MergedEntity[]): Relationship[] {
    const relationships: Relationship[] = []
    
    for (const entity of entities) {
      const m2mFields = entity.fields.filter(f => 
        f.isM2M || 
        f.inputType === 'multiselect' ||
        /^Selected\w+Ids$/i.test(f.name) ||
        /^Chosen\w+Ids$/i.test(f.name)
      )
      
      for (const field of m2mFields) {
        // Extract related entity name from field name
        // SelectedRoleIds -> Role, ChosenDepartmentIds -> Department
        const relatedEntity = field.name
          .replace(/^(Selected|Chosen|Assigned)/i, '')
          .replace(/Ids?$/i, '')
          .replace(/s$/, '') // Simple singularization
        
        relationships.push({
          id: `${entity.entityName}_M2M_${relatedEntity}`,
          type: 'M:M',
          fromTable: entity.entityName,
          toTable: relatedEntity,
          fromColumn: entity.primaryKey || 'Id',
          toColumn: 'Id',
          fkColumn: field.name,
          junctionTable: `${entity.entityName}${relatedEntity}`,
          cascadeDelete: false,
          isNullable: false,
          confidence: 85,
          source: 'pattern'
        })
      }
    }
    
    return relationships
  }

  /**
   * Generate M:M relationship from junction table info
   */
  generateRelationship(junction: JunctionTableInfo): Relationship {
    return {
      id: `${junction.entity1Table}_M2M_${junction.entity2Table}_via_${junction.tableName}`,
      type: 'M:M',
      fromTable: junction.entity1Table,
      toTable: junction.entity2Table,
      fromColumn: 'Id',
      toColumn: 'Id',
      fkColumn: junction.entity1Column,
      junctionTable: junction.tableName,
      cascadeDelete: false,
      isNullable: false,
      confidence: junction.confidence,
      source: 'explicit'
    }
  }
}

// =============================================================================
// SECTION 5: POLYMORPHIC FK DETECTION ENGINE
// =============================================================================

export interface PolymorphicPattern {
  typeColumn: RegExp
  idColumn: RegExp
  possibleTypes?: string[]
}

export const POLYMORPHIC_PATTERNS: PolymorphicPattern[] = [
  // Entity patterns
  { 
    typeColumn: /^EntityType$/i, 
    idColumn: /^EntityId$/i,
    possibleTypes: ['Order', 'Invoice', 'Customer', 'Product']
  },
  { 
    typeColumn: /^EntityTypeId$/i, 
    idColumn: /^EntityId$/i,
    possibleTypes: []
  },
  { 
    typeColumn: /^RecordType$/i, 
    idColumn: /^RecordId$/i,
    possibleTypes: []
  },
  { 
    typeColumn: /^ObjectType$/i, 
    idColumn: /^ObjectId$/i,
    possibleTypes: []
  },
  { 
    typeColumn: /^ResourceType$/i, 
    idColumn: /^ResourceId$/i,
    possibleTypes: []
  },
  { 
    typeColumn: /^TargetType$/i, 
    idColumn: /^TargetId$/i,
    possibleTypes: []
  },
  { 
    typeColumn: /^OwnerType$/i, 
    idColumn: /^OwnerId$/i,
    possibleTypes: ['User', 'Organization', 'Team']
  },
  { 
    typeColumn: /^CommentableType$/i, 
    idColumn: /^CommentableId$/i,
    possibleTypes: ['Post', 'Article', 'Photo', 'Video']
  },
  { 
    typeColumn: /^TaggableType$/i, 
    idColumn: /^TaggableId$/i,
    possibleTypes: ['Post', 'Article', 'Product', 'User']
  },
]

export class PolymorphicFKEngine {
  /**
   * Detect polymorphic FK patterns in entities
   */
  detect(entities: MergedEntity[]): Relationship[] {
    const relationships: Relationship[] = []
    
    for (const entity of entities) {
      for (const pattern of POLYMORPHIC_PATTERNS) {
        const typeField = entity.fields.find(f => pattern.typeColumn.test(f.name))
        const idField = entity.fields.find(f => pattern.idColumn.test(f.name))
        
        if (typeField && idField) {
          relationships.push({
            id: `${entity.entityName}_POLYMORPHIC_${typeField.name}_${idField.name}`,
            type: 'POLYMORPHIC',
            fromTable: entity.entityName,
            toTable: 'Polymorphic',
            fromColumn: idField.name,
            toColumn: 'Id',
            fkColumn: idField.name,
            cascadeDelete: false,
            isNullable: !idField.constraints?.includes('NOT NULL'),
            confidence: 90,
            source: 'pattern',
            metadata: {
              polymorphicTypeColumn: typeField.name,
              polymorphicTypes: pattern.possibleTypes || []
            }
          })
          break // Only one polymorphic pattern per entity
        }
      }
    }
    
    return relationships
  }

  /**
   * Infer polymorphic types from JS/AJAX patterns
   */
  inferTypesFromContent(content: string, entityName: string): string[] {
    const types: string[] = []
    
    // Look for type values in JS
    const typeValuePattern = /(?:EntityType|RecordType|ObjectType|ResourceType)\s*[=:]\s*["'](\w+)["']/gi
    let match
    while ((match = typeValuePattern.exec(content)) !== null) {
      if (!types.includes(match[1])) {
        types.push(match[1])
      }
    }
    
    // Look for AJAX endpoints that suggest types
    const endpointPattern = /["']\/api\/(\w+)\/.*(?:Entity|Record|Object|Resource)/gi
    while ((match = endpointPattern.exec(content)) !== null) {
      if (!types.includes(match[1])) {
        types.push(match[1])
      }
    }
    
    return types
  }
}

// =============================================================================
// SECTION 6: ONE-TO-ONE RELATIONSHIP DETECTION ENGINE
// =============================================================================

export const ONE_TO_ONE_PATTERNS = [
  /^Address$/i,
  /^Profile$/i,
  /^Setting$/i,
  /^Settings$/i,
  /^Detail$/i,
  /^Details$/i,
  /^Info$/i,
  /^Config$/i,
  /^Configuration$/i,
  /^Preference$/i,
  /^Preferences$/i,
  /^Metadata$/i,
  /^Avatar$/i,
  /^Photo$/i,
  /^Logo$/i,
  /^Thumbnail$/i,
]

export class OneToOneEngine {
  /**
   * Detect 1:1 relationships from nested property patterns
   */
  detect(entities: MergedEntity[]): Relationship[] {
    const relationships: Relationship[] = []
    
    for (const entity of entities) {
      // Check for fields with nested property access (Address.City, Profile.Bio)
      const nestedFields = entity.fields.filter(f => f.name.includes('.'))
      
      const nestedGroups = new Map<string, Set<string>>()
      for (const field of nestedFields) {
        const parts = field.name.split('.')
        if (parts.length === 2) {
          const [parent, child] = parts
          if (!nestedGroups.has(parent)) {
            nestedGroups.set(parent, new Set())
          }
          nestedGroups.get(parent)!.add(child)
        }
      }
      
      // Check if nested group name matches 1:1 patterns
      for (const [parentName, childFields] of nestedGroups) {
        if (ONE_TO_ONE_PATTERNS.some(p => p.test(parentName))) {
          relationships.push({
            id: `${entity.entityName}_1TO1_${parentName}`,
            type: '1:1',
            fromTable: entity.entityName,
            toTable: parentName,
            fromColumn: `${parentName}Id`,
            toColumn: 'Id',
            fkColumn: `${parentName}Id`,
            cascadeDelete: true,
            isNullable: true,
            confidence: 80,
            source: 'pattern',
            metadata: {
              inferredFields: Array.from(childFields)
            }
          })
        }
      }
    }
    
    return relationships
  }

  /**
   * Detect 1:1 from FK that is also UNIQUE
   */
  detectFromUniqueFK(entities: MergedEntity[]): Relationship[] {
    const relationships: Relationship[] = []
    
    for (const entity of entities) {
      // Find FK fields that are also unique (indicates 1:1, not 1:M)
      const uniqueFKs = entity.fields.filter(f => 
        f.isFK && 
        (f.isUnique || f.constraints?.toUpperCase().includes('UNIQUE'))
      )
      
      for (const field of uniqueFKs) {
        const relatedEntity = field.fkTable || field.name.replace(/Id$/, '')
        
        relationships.push({
          id: `${entity.entityName}_1TO1_${relatedEntity}_uniqueFK`,
          type: '1:1',
          fromTable: entity.entityName,
          toTable: relatedEntity,
          fromColumn: field.name,
          toColumn: 'Id',
          fkColumn: field.name,
          cascadeDelete: false,
          isNullable: !field.constraints?.includes('NOT NULL'),
          confidence: 85,
          source: 'inferred'
        })
      }
    }
    
    return relationships
  }
}

// =============================================================================
// SECTION 7: RELATIONSHIP GRAPH BUILDER
// =============================================================================

export class RelationshipGraphBuilder {
  private selfRefEngine: SelfReferencingEngine
  private cascadeEngine: CascadeChainEngine
  private m2mEngine: ManyToManyEngine
  private polymorphicEngine: PolymorphicFKEngine
  private oneToOneEngine: OneToOneEngine

  constructor() {
    this.selfRefEngine = new SelfReferencingEngine()
    this.cascadeEngine = new CascadeChainEngine()
    this.m2mEngine = new ManyToManyEngine()
    this.polymorphicEngine = new PolymorphicFKEngine()
    this.oneToOneEngine = new OneToOneEngine()
  }

  /**
   * Build complete relationship graph from entities
   */
  buildGraph(entities: MergedEntity[]): RelationshipGraph {
    const nodes = new Map<string, EntityNode>()
    const edges: Relationship[] = []
    
    // Create nodes
    for (const entity of entities) {
      nodes.set(entity.entityName, {
        name: entity.entityName,
        fields: entity.fields,
        primaryKey: entity.primaryKey,
        isJunctionTable: false,
        inDegree: 0,
        outDegree: 0,
        isLookupTable: this.isLookupTable(entity),
        isAuditTable: this.isAuditTable(entity)
      })
    }
    
    // Detect all relationship types
    edges.push(...this.selfRefEngine.detectAll(entities))
    edges.push(...this.m2mEngine.detectFromMultiselect(entities))
    edges.push(...this.polymorphicEngine.detect(entities))
    edges.push(...this.oneToOneEngine.detect(entities))
    edges.push(...this.oneToOneEngine.detectFromUniqueFK(entities))
    
    // Extract existing relationships from entities (1:M from FK fields)
    for (const entity of entities) {
      const fkFields = entity.fields.filter(f => f.isFK && !f.isM2M)
      
      for (const field of fkFields) {
        const relatedEntity = field.fkTable || field.name.replace(/Id$/, '')
        
        // Skip if already detected (self-ref, polymorphic, etc.)
        if (edges.some(e => 
          e.type === 'SELF_REF' && e.fkColumn === field.name && e.fromTable === entity.entityName
        )) continue
        
        if (edges.some(e =>
          e.type === 'POLYMORPHIC' && e.fkColumn === field.name
        )) continue
        
        edges.push({
          id: `${entity.entityName}_1M_${relatedEntity}_${field.name}`,
          type: 'M:1',
          fromTable: entity.entityName,
          toTable: relatedEntity,
          fromColumn: field.name,
          toColumn: 'Id',
          fkColumn: field.name,
          cascadeDelete: false,
          isNullable: !field.constraints?.includes('NOT NULL'),
          confidence: 80,
          source: 'inferred'
        })
      }
    }
    
    // Detect junction tables
    const junctionTables = new Map<string, JunctionTableInfo>()
    const junctionInfos = this.m2mEngine.detectJunctionTables(entities)
    for (const info of junctionInfos) {
      junctionTables.set(info.tableName, info)
      
      // Add M:M relationship
      edges.push(this.m2mEngine.generateRelationship(info))
      
      // Mark node as junction
      const node = nodes.get(info.tableName)
      if (node) {
        node.isJunctionTable = true
      }
    }
    
    // Calculate degrees
    for (const edge of edges) {
      const fromNode = nodes.get(edge.fromTable)
      const toNode = nodes.get(edge.toTable)
      
      if (fromNode) fromNode.outDegree++
      if (toNode) toNode.inDegree++
    }
    
    // Build hierarchy trees
    const hierarchyTrees = this.selfRefEngine.buildHierarchyTrees(entities, edges)
    
    // Build cascade chains
    const cascadeChains = this.cascadeEngine.detectFromEntities(entities)
    
    return {
      nodes,
      edges,
      junctionTables,
      hierarchyTrees,
      cascadeChains
    }
  }

  private isLookupTable(entity: MergedEntity): boolean {
    const lookupPatterns = [/Type$/i, /Status$/i, /Category$/i, /Level$/i, /Priority$/i]
    return lookupPatterns.some(p => p.test(entity.entityName))
  }

  private isAuditTable(entity: MergedEntity): boolean {
    const auditPatterns = [/Audit$/i, /Log$/i, /History$/i, /Trace$/i]
    return auditPatterns.some(p => p.test(entity.entityName))
  }
}

// =============================================================================
// SECTION 8: AI ENRICHMENT ENGINE
// =============================================================================

export interface AmbiguousField {
  fieldName: string
  entityName: string
  currentType: string
  currentConstraints: string[]
  possibleTypes: Array<{ type: string; confidence: number; reason: string }>
  context: string
}

export interface AIEnrichmentResult {
  fieldName: string
  entityName: string
  suggestedType: string
  suggestedConstraints: string[]
  confidence: number
  reason: string
  enrichedBy: string
}

export class AIEnrichmentEngine {
  /**
   * Identify fields that need AI enrichment
   */
  identifyAmbiguousFields(entities: MergedEntity[]): AmbiguousField[] {
    const ambiguous: AmbiguousField[] = []
    
    for (const entity of entities) {
      for (const field of entity.fields) {
        // Fields with generic types that could be more specific
        if (this.isAmbiguousType(field.sqlType)) {
          const possibleTypes = this.inferPossibleTypes(field)
          
          if (possibleTypes.length > 1) {
            ambiguous.push({
              fieldName: field.name,
              entityName: entity.entityName,
              currentType: field.sqlType,
              currentConstraints: field.constraints?.split(' ').filter(Boolean) || [],
              possibleTypes,
              context: this.buildContext(field, entity)
            })
          }
        }
      }
    }
    
    return ambiguous
  }

  /**
   * Check if a type is ambiguous/generic
   */
  private isAmbiguousType(sqlType: string): boolean {
    const genericTypes = [
      'NVARCHAR(255)', 'VARCHAR(255)', 'NVARCHAR(MAX)', 'VARCHAR(MAX)',
      'INT', 'BIGINT', 'TEXT', 'NTEXT'
    ]
    return genericTypes.some(t => sqlType?.toUpperCase() === t)
  }

  /**
   * Infer possible types for a field
   */
  private inferPossibleTypes(field: any): Array<{ type: string; confidence: number; reason: string }> {
    const types: Array<{ type: string; confidence: number; reason: string }> = []
    const name = field.name.toLowerCase()
    
    // Check name patterns for type inference
    if (name.includes('email')) {
      types.push({ type: 'VARCHAR(255)', confidence: 90, reason: 'Email field pattern' })
    }
    if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) {
      types.push({ type: 'VARCHAR(20)', confidence: 85, reason: 'Phone field pattern' })
    }
    if (name.includes('url') || name.includes('website') || name.includes('link')) {
      types.push({ type: 'VARCHAR(500)', confidence: 85, reason: 'URL field pattern' })
    }
    if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('fee')) {
      types.push({ type: 'DECIMAL(18,2)', confidence: 90, reason: 'Money field pattern' })
    }
    if (name.includes('date') && !name.includes('update') && !name.includes('create')) {
      types.push({ type: 'DATE', confidence: 80, reason: 'Date field pattern' })
    }
    if (name.includes('percent') || name.includes('ratio')) {
      types.push({ type: 'DECIMAL(5,2)', confidence: 85, reason: 'Percentage field pattern' })
    }
    if (name.includes('description') || name.includes('note') || name.includes('comment')) {
      types.push({ type: 'NVARCHAR(MAX)', confidence: 80, reason: 'Long text field pattern' })
    }
    if (name.startsWith('is') || name.startsWith('has') || name.startsWith('can')) {
      types.push({ type: 'BIT', confidence: 95, reason: 'Boolean field pattern' })
    }
    if (name.includes('code') && name.length < 15) {
      types.push({ type: 'VARCHAR(50)', confidence: 80, reason: 'Code field pattern' })
    }
    if (name === 'name' || name.includes('name') && !name.includes('user') && !name.includes('display')) {
      types.push({ type: 'NVARCHAR(200)', confidence: 75, reason: 'Name field pattern' })
    }
    
    // Add current type as fallback
    if (types.length === 0) {
      types.push({ type: field.sqlType || 'NVARCHAR(255)', confidence: 50, reason: 'Current type as fallback' })
    }
    
    return types
  }

  /**
   * Build context string for AI analysis
   */
  private buildContext(field: any, entity: MergedEntity): string {
    const relatedFields = entity.fields
      .filter(f => f !== field)
      .slice(0, 5)
      .map(f => f.name)
      .join(', ')
    
    return `Entity: ${entity.entityName}, Field: ${field.name}, Related fields: ${relatedFields}`
  }

  /**
   * Generate prompt for AI-based type enrichment
   */
  generateEnrichmentPrompt(ambiguous: AmbiguousField[]): string {
    const fieldDescriptions = ambiguous.map(f => 
      `- ${f.entityName}.${f.fieldName}: Current=${f.currentType}, Context="${f.context}", Possibilities=[${f.possibleTypes.map(p => `${p.type}(${p.confidence}%)`).join(', ')}]`
    ).join('\n')
    
    return `Analyze these database fields and suggest the most appropriate SQL Server data types:

${fieldDescriptions}

Consider:
1. Field naming conventions (Email, Phone, Price, etc.)
2. Entity context (what kind of data this entity stores)
3. Related fields for context clues
4. Common patterns in business applications

Return a JSON array with suggestions:
[{ "fieldName": "x", "entityName": "y", "suggestedType": "TYPE", "reason": "why" }]`
  }

  /**
   * Parse AI response and create enrichment results
   */
  parseAIResponse(response: string): AIEnrichmentResult[] {
    try {
      const parsed = JSON.parse(response)
      return parsed.map((p: any) => ({
        fieldName: p.fieldName,
        entityName: p.entityName,
        suggestedType: p.suggestedType,
        suggestedConstraints: p.suggestedConstraints || [],
        confidence: 85,
        reason: p.reason,
        enrichedBy: 'ai'
      }))
    } catch {
      return []
    }
  }

  /**
   * Apply AI enrichment to entities (stub - actual AI call would be made via z-ai-web-dev-sdk)
   */
  async enrich(entities: MergedEntity[]): Promise<AIEnrichmentResult[]> {
    const ambiguous = this.identifyAmbiguousFields(entities)
    
    if (ambiguous.length === 0) {
      return []
    }
    
    // In a real implementation, this would call the AI API
    // For now, return rule-based suggestions
    const results: AIEnrichmentResult[] = []
    
    for (const field of ambiguous) {
      const bestType = field.possibleTypes[0]
      if (bestType && bestType.confidence >= 75) {
        results.push({
          fieldName: field.fieldName,
          entityName: field.entityName,
          suggestedType: bestType.type,
          suggestedConstraints: [],
          confidence: bestType.confidence,
          reason: bestType.reason,
          enrichedBy: 'rule_based'
        })
      }
    }
    
    return results
  }
}

// =============================================================================
// SECTION 9: UNIFIED TIER 2 PROCESSOR
// =============================================================================

export interface Tier2ProcessingOptions {
  detectSelfRef: boolean
  detectCascadeChains: boolean
  detectM2M: boolean
  detectPolymorphic: boolean
  detectOneToOne: boolean
  aiEnrichment: boolean
  buildGraph: boolean
}

export interface Tier2Result {
  graph: RelationshipGraph | null
  relationships: Relationship[]
  junctionTables: JunctionTableInfo[]
  hierarchyTrees: HierarchyTree[]
  cascadeChains: CascadeChain[]
  aiEnrichments: AIEnrichmentResult[]
  stats: {
    totalEntities: number
    totalRelationships: number
    selfRefCount: number
    m2mCount: number
    junctionCount: number
    polymorphicCount: number
    oneToOneCount: number
    cascadeChainCount: number
    aiEnrichmentCount: number
  }
}

export class Tier2Processor {
  private graphBuilder: RelationshipGraphBuilder
  private aiEngine: AIEnrichmentEngine

  constructor() {
    this.graphBuilder = new RelationshipGraphBuilder()
    this.aiEngine = new AIEnrichmentEngine()
  }

  async process(
    entities: MergedEntity[], 
    options: Partial<Tier2ProcessingOptions> = {}
  ): Promise<Tier2Result> {
    const opts: Tier2ProcessingOptions = {
      detectSelfRef: true,
      detectCascadeChains: true,
      detectM2M: true,
      detectPolymorphic: true,
      detectOneToOne: true,
      aiEnrichment: false, // Disabled by default
      buildGraph: true,
      ...options
    }

    const relationships: Relationship[] = []
    let graph: RelationshipGraph | null = null

    // Build complete relationship graph
    if (opts.buildGraph) {
      graph = this.graphBuilder.buildGraph(entities)
      relationships.push(...graph.edges)
    }

    // AI enrichment (optional)
    let aiEnrichments: AIEnrichmentResult[] = []
    if (opts.aiEnrichment) {
      aiEnrichments = await this.aiEngine.enrich(entities)
    }

    // Calculate stats
    const stats = {
      totalEntities: entities.length,
      totalRelationships: relationships.length,
      selfRefCount: relationships.filter(r => r.type === 'SELF_REF').length,
      m2mCount: relationships.filter(r => r.type === 'M:M').length,
      junctionCount: graph?.junctionTables.size || 0,
      polymorphicCount: relationships.filter(r => r.type === 'POLYMORPHIC').length,
      oneToOneCount: relationships.filter(r => r.type === '1:1').length,
      cascadeChainCount: graph?.cascadeChains.length || 0,
      aiEnrichmentCount: aiEnrichments.length
    }

    return {
      graph,
      relationships,
      junctionTables: graph ? Array.from(graph.junctionTables.values()) : [],
      hierarchyTrees: graph?.hierarchyTrees || [],
      cascadeChains: graph?.cascadeChains || [],
      aiEnrichments,
      stats
    }
  }
}
