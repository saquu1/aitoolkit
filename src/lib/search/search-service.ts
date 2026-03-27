/**
 * Search Engine Service
 * 
 * Provides full-text and semantic search across all entities.
 * Supports search for tables, columns, procedures, views, and modules.
 * 
 * Task: TASK-3.5 - Search Engine Implementation
 */

import { prisma } from "@/lib/db"
import { vectorEmbeddingService } from "@/lib/embeddings/vector-embedding"

// ============================================================================
// Types
// ============================================================================

export interface SearchQuery {
  projectId: string
  query: string
  options?: SearchOptions
}

export interface SearchOptions {
  entityTypes?: Array<'table' | 'column' | 'sp' | 'view' | 'module' | 'form'>
  limit?: number
  offset?: number
  useSemantic?: boolean
  fuzzyMatch?: boolean
  includeColumns?: boolean
  minScore?: number
}

export interface SearchResult {
  entityType: string
  entityId: string
  entityName: string
  entitySchema?: string
  tableName?: string
  score: number
  matchType: 'exact' | 'prefix' | 'contains' | 'fuzzy' | 'semantic'
  matchedField: string
  snippet?: string
  metadata?: Record<string, any>
}

export interface SearchResults {
  results: SearchResult[]
  total: number
  took: number
  query: string
  semantic?: boolean
  aggregations?: SearchAggregations
}

export interface SearchAggregations {
  byType: Record<string, number>
  byScoreRange: Record<string, number>
}

export interface IndexableEntity {
  entityType: string
  entityId: string
  title: string
  content: string
  keywords: string[]
  tags: string[]
  metadata?: Record<string, any>
}

// ============================================================================
// Search Engine Service
// ============================================================================

export class SearchEngineService {
  /**
   * Search across all entities
   */
  async search(query: SearchQuery): Promise<SearchResults> {
    const startTime = Date.now()
    const { projectId, query: searchText, options = {} } = query
    const {
      entityTypes,
      limit = 50,
      offset = 0,
      useSemantic = false,
      fuzzyMatch = true,
      minScore = 0
    } = options

    const allResults: SearchResult[] = []

    // Full-text search
    const fullTextResults = await this.fullTextSearch(projectId, searchText, options)
    allResults.push(...fullTextResults)

    // Semantic search if enabled
    if (useSemantic) {
      const semanticResults = await this.semanticSearch(projectId, searchText, options)
      
      // Merge results, preferring higher scores
      for (const sr of semanticResults) {
        const existing = allResults.find(
          r => r.entityType === sr.entityType && r.entityId === sr.entityId
        )
        
        if (existing) {
          existing.score = Math.max(existing.score, sr.score)
          existing.matchType = existing.score >= sr.score ? existing.matchType : 'semantic'
        } else {
          allResults.push(sr)
        }
      }
    }

    // Sort by score and apply pagination
    allResults.sort((a, b) => b.score - a.score)
    
    const total = allResults.length
    const paginatedResults = allResults.slice(offset, offset + limit)

    // Calculate aggregations
    const aggregations = this.calculateAggregations(allResults)

    return {
      results: paginatedResults,
      total,
      took: Date.now() - startTime,
      query: searchText,
      semantic: useSemantic,
      aggregations
    }
  }

  /**
   * Full-text search across entities
   */
  private async fullTextSearch(
    projectId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const searchTerms = this.tokenizeQuery(query)
    const { entityTypes, includeColumns = true, fuzzyMatch } = options

    // Search tables
    if (!entityTypes || entityTypes.includes('table')) {
      const tableResults = await this.searchTables(projectId, searchTerms, fuzzyMatch)
      results.push(...tableResults)
    }

    // Search columns
    if (includeColumns && (!entityTypes || entityTypes.includes('column'))) {
      const columnResults = await this.searchColumns(projectId, searchTerms, fuzzyMatch)
      results.push(...columnResults)
    }

    // Search procedures
    if (!entityTypes || entityTypes.includes('sp')) {
      const spResults = await this.searchProcedures(projectId, searchTerms, fuzzyMatch)
      results.push(...spResults)
    }

    // Search views
    if (!entityTypes || entityTypes.includes('view')) {
      const viewResults = await this.searchViews(projectId, searchTerms, fuzzyMatch)
      results.push(...viewResults)
    }

    // Search modules
    if (!entityTypes || entityTypes.includes('module')) {
      const moduleResults = await this.searchModules(projectId, searchTerms, fuzzyMatch)
      results.push(...moduleResults)
    }

    return results
  }

  /**
   * Search tables
   */
  private async searchTables(
    projectId: string,
    terms: string[],
    fuzzyMatch?: boolean
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    for (const term of terms) {
      const tables = await prisma.toolkitTable.findMany({
        where: {
          projectId,
          OR: [
            { tableName: { contains: term, mode: 'insensitive' } },
            { tableSchema: { contains: term, mode: 'insensitive' } },
            { displayName: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          tableName: true,
          tableSchema: true,
          displayName: true,
          columnCount: true
        }
      })

      for (const table of tables) {
        const existing = results.find(r => r.entityId === table.id)
        if (existing) {
          existing.score += 0.1
          continue
        }

        const matchType = this.determineMatchType(table.tableName, term)
        const score = this.calculateScore(table.tableName, term, 'table')

        results.push({
          entityType: 'table',
          entityId: table.id,
          entityName: table.tableName,
          entitySchema: table.tableSchema,
          score,
          matchType,
          matchedField: 'tableName',
          metadata: {
            displayName: table.displayName,
            columnCount: table.columnCount
          }
        })
      }
    }

    return results
  }

  /**
   * Search columns
   */
  private async searchColumns(
    projectId: string,
    terms: string[],
    fuzzyMatch?: boolean
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    for (const term of terms) {
      const columns = await prisma.toolkitColumn.findMany({
        where: {
          projectId,
          OR: [
            { columnName: { contains: term, mode: 'insensitive' } },
            { tableName: { contains: term, mode: 'insensitive' } },
            { dataType: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          columnName: true,
          tableName: true,
          dataType: true,
          isNullable: true,
          isPK: true,
          isFK: true
        }
      })

      for (const column of columns) {
        const existing = results.find(r => r.entityId === column.id)
        if (existing) {
          existing.score += 0.1
          continue
        }

        const matchType = this.determineMatchType(column.columnName, term)
        const score = this.calculateScore(column.columnName, term, 'column')

        results.push({
          entityType: 'column',
          entityId: column.id,
          entityName: column.columnName,
          tableName: column.tableName,
          score,
          matchType,
          matchedField: 'columnName',
          metadata: {
            dataType: column.dataType,
            isPK: column.isPK,
            isFK: column.isFK
          }
        })
      }
    }

    return results
  }

  /**
   * Search procedures
   */
  private async searchProcedures(
    projectId: string,
    terms: string[],
    fuzzyMatch?: boolean
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    for (const term of terms) {
      const procedures = await prisma.toolkitSP.findMany({
        where: {
          projectId,
          OR: [
            { spName: { contains: term, mode: 'insensitive' } },
            { spSchema: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          spName: true,
          spSchema: true,
          paramCount: true
        }
      })

      for (const sp of procedures) {
        const existing = results.find(r => r.entityId === sp.id)
        if (existing) {
          existing.score += 0.1
          continue
        }

        const matchType = this.determineMatchType(sp.spName, term)
        const score = this.calculateScore(sp.spName, term, 'sp')

        results.push({
          entityType: 'sp',
          entityId: sp.id,
          entityName: sp.spName,
          entitySchema: sp.spSchema,
          score,
          matchType,
          matchedField: 'spName',
          metadata: {
            paramCount: sp.paramCount
          }
        })
      }
    }

    return results
  }

  /**
   * Search views
   */
  private async searchViews(
    projectId: string,
    terms: string[],
    fuzzyMatch?: boolean
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    for (const term of terms) {
      const views = await prisma.toolkitView.findMany({
        where: {
          projectId,
          OR: [
            { viewName: { contains: term, mode: 'insensitive' } },
            { viewSchema: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          viewName: true,
          viewSchema: true,
          columnCount: true
        }
      })

      for (const view of views) {
        const existing = results.find(r => r.entityId === view.id)
        if (existing) {
          existing.score += 0.1
          continue
        }

        const matchType = this.determineMatchType(view.viewName, term)
        const score = this.calculateScore(view.viewName, term, 'view')

        results.push({
          entityType: 'view',
          entityId: view.id,
          entityName: view.viewName,
          entitySchema: view.viewSchema,
          score,
          matchType,
          matchedField: 'viewName',
          metadata: {
            columnCount: view.columnCount
          }
        })
      }
    }

    return results
  }

  /**
   * Search modules
   */
  private async searchModules(
    projectId: string,
    terms: string[],
    fuzzyMatch?: boolean
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    for (const term of terms) {
      const modules = await prisma.toolkitModule.findMany({
        where: {
          projectId,
          OR: [
            { moduleName: { contains: term, mode: 'insensitive' } },
            { moduleKey: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          moduleName: true,
          moduleKey: true,
          description: true,
          tableCount: true,
          spCount: true
        }
      })

      for (const module of modules) {
        const existing = results.find(r => r.entityId === module.id)
        if (existing) {
          existing.score += 0.1
          continue
        }

        const matchType = this.determineMatchType(module.moduleName || module.moduleKey, term)
        const score = this.calculateScore(module.moduleName || module.moduleKey, term, 'module')

        results.push({
          entityType: 'module',
          entityId: module.id,
          entityName: module.moduleName || module.moduleKey,
          score,
          matchType,
          matchedField: 'moduleName',
          metadata: {
            moduleKey: module.moduleKey,
            tableCount: module.tableCount,
            spCount: module.spCount
          }
        })
      }
    }

    return results
  }

  /**
   * Semantic search using vector embeddings
   */
  private async semanticSearch(
    projectId: string,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const { limit = 50, minScore = 0.3 } = options

    try {
      const semanticResults = await vectorEmbeddingService.semanticSearch(
        projectId,
        query,
        {
          limit: limit * 2, // Get more for deduplication
          threshold: minScore
        }
      )

      return semanticResults.map(result => ({
        entityType: result.entityType,
        entityId: result.entityId,
        entityName: result.metadata?.tableName ||
          result.metadata?.columnName ||
          result.metadata?.spName ||
          result.metadata?.viewName ||
          result.metadata?.moduleName ||
          result.entityId,
        entitySchema: result.metadata?.tableSchema ||
          result.metadata?.spSchema ||
          result.metadata?.viewSchema,
        tableName: result.metadata?.tableName,
        score: result.similarity,
        matchType: 'semantic' as const,
        matchedField: 'content',
        snippet: result.content.slice(0, 200),
        metadata: result.metadata
      }))
    } catch (error) {
      console.warn('[SearchEngine] Semantic search failed:', error)
      return []
    }
  }

  /**
   * Tokenize search query
   */
  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .split(/[\s_-]+/)
      .filter(token => token.length > 1)
      .map(token => token.trim())
  }

  /**
   * Determine match type
   */
  private determineMatchType(fieldName: string, term: string): SearchResult['matchType'] {
    const field = fieldName.toLowerCase()
    const searchTerm = term.toLowerCase()

    if (field === searchTerm) return 'exact'
    if (field.startsWith(searchTerm)) return 'prefix'
    if (field.includes(searchTerm)) return 'contains'
    return 'fuzzy'
  }

  /**
   * Calculate search score
   */
  private calculateScore(
    fieldName: string,
    term: string,
    entityType: string
  ): number {
    const field = fieldName.toLowerCase()
    const searchTerm = term.toLowerCase()

    // Base score by match type
    let score = 0.5
    const matchType = this.determineMatchType(fieldName, term)

    switch (matchType) {
      case 'exact':
        score = 1.0
        break
      case 'prefix':
        score = 0.8
        break
      case 'contains':
        score = 0.6
        break
      case 'fuzzy':
        score = 0.4
        break
    }

    // Boost for important entity types
    if (entityType === 'table') score += 0.1
    if (entityType === 'column') score += 0.05

    // Boost for shorter field names (more specific match)
    if (field.length < 20) score += 0.05

    return Math.min(score, 1.0)
  }

  /**
   * Calculate aggregations
   */
  private calculateAggregations(results: SearchResult[]): SearchAggregations {
    const byType: Record<string, number> = {}
    const byScoreRange: Record<string, number> = {
      '1.0': 0,
      '0.8-0.99': 0,
      '0.6-0.79': 0,
      '0.4-0.59': 0,
      '0.0-0.39': 0
    }

    for (const result of results) {
      // By type
      byType[result.entityType] = (byType[result.entityType] || 0) + 1

      // By score range
      if (result.score >= 1.0) byScoreRange['1.0']++
      else if (result.score >= 0.8) byScoreRange['0.8-0.99']++
      else if (result.score >= 0.6) byScoreRange['0.6-0.79']++
      else if (result.score >= 0.4) byScoreRange['0.4-0.59']++
      else byScoreRange['0.0-0.39']++
    }

    return { byType, byScoreRange }
  }

  /**
   * Index an entity for search
   */
  async indexEntity(entity: IndexableEntity): Promise<void> {
    // Store in search index
    await prisma.searchIndex.upsert({
      where: {
        projectId_entityType_entityId: {
          projectId: entity.metadata?.projectId || '',
          entityType: entity.entityType,
          entityId: entity.entityId
        }
      },
      create: {
        projectId: entity.metadata?.projectId || '',
        entityType: entity.entityType,
        entityId: entity.entityId,
        title: entity.title,
        content: entity.content,
        keywords: JSON.stringify(entity.keywords),
        tags: JSON.stringify(entity.tags)
      },
      update: {
        title: entity.title,
        content: entity.content,
        keywords: JSON.stringify(entity.keywords),
        tags: JSON.stringify(entity.tags),
        updatedAt: new Date()
      }
    })
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(
    projectId: string,
    prefix: string,
    limit: number = 10
  ): Promise<string[]> {
    const suggestions = new Set<string>()

    // Get table name suggestions
    const tables = await prisma.toolkitTable.findMany({
      where: {
        projectId,
        tableName: { startsWith: prefix, mode: 'insensitive' }
      },
      select: { tableName: true },
      take: limit
    })
    tables.forEach(t => suggestions.add(t.tableName))

    // Get column name suggestions
    const columns = await prisma.toolkitColumn.findMany({
      where: {
        projectId,
        columnName: { startsWith: prefix, mode: 'insensitive' }
      },
      select: { columnName: true },
      take: limit
    })
    columns.forEach(c => suggestions.add(c.columnName))

    // Get SP name suggestions
    const sps = await prisma.toolkitSP.findMany({
      where: {
        projectId,
        spName: { startsWith: prefix, mode: 'insensitive' }
      },
      select: { spName: true },
      take: limit
    })
    sps.forEach(s => suggestions.add(s.spName))

    return Array.from(suggestions).slice(0, limit)
  }
}

// Export singleton instance
export const searchEngineService = new SearchEngineService()

// Export types
export type {
  SearchQuery as SearchQueryType,
  SearchOptions as SearchOptionsType,
  SearchResult as SearchResultType,
  SearchResults as SearchResultsType
}
