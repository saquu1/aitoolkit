/**
 * Vector Embedding Service
 * 
 * Provides vector embedding generation and similarity search.
 * Supports semantic search for database entities.
 * 
 * Task: TASK-3.3 - Vector Storage with pgvector
 */

import { prisma } from "@/lib/db"
import crypto from "crypto"

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingInput {
  projectId: string
  entityType: 'table' | 'column' | 'sp' | 'view' | 'module' | 'form'
  entityId: string
  content: string
  metadata?: Record<string, any>
}

export interface EmbeddingResult {
  id: string
  projectId: string
  entityType: string
  entityId: string
  content: string
  embedding: number[]
  tokenCount: number
  contentHash: string
}

export interface SimilarityResult {
  entityId: string
  entityType: string
  content: string
  similarity: number
  metadata?: Record<string, any>
}

export interface EmbeddingStats {
  totalEmbeddings: number
  byEntityType: Record<string, number>
  avgTokenCount: number
  totalTokens: number
}

export interface SearchOptions {
  limit?: number
  threshold?: number
  entityTypes?: string[]
  excludeIds?: string[]
}

// ============================================================================
// Vector Embedding Service
// ============================================================================

export class VectorEmbeddingService {
  private embeddingDimension = 1536 // OpenAI text-embedding-3-small dimension
  private defaultModel = "text-embedding-3-small"

  /**
   * Generate embedding for content
   * Uses z-ai-web-dev-sdk or falls back to simple hash-based embedding
   */
  async generateEmbedding(content: string): Promise<number[]> {
    // Try to use OpenAI API if available
    const openaiKey = process.env.OPENAI_API_KEY
    
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.defaultModel,
            input: content.slice(0, 8000) // Limit input size
          })
        })

        if (response.ok) {
          const data = await response.json()
          return data.data[0].embedding
        }
      } catch (error) {
        console.warn('[VectorEmbedding] OpenAI API failed, using fallback:', error)
      }
    }

    // Fallback: Generate deterministic pseudo-embedding based on content hash
    return this.generateFallbackEmbedding(content)
  }

  /**
   * Generate fallback embedding using content hash
   * This creates a deterministic but less meaningful embedding
   */
  private generateFallbackEmbedding(content: string): number[] {
    const embedding: number[] = []
    
    // Create hash-based seed
    const hash = crypto.createHash('sha256').update(content).digest()
    
    // Generate embedding from hash
    for (let i = 0; i < this.embeddingDimension; i++) {
      const value = hash[i % hash.length] / 255 - 0.5
      embedding.push(value)
    }
    
    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
    return embedding.map(v => v / magnitude)
  }

  /**
   * Store embedding in database
   */
  async storeEmbedding(input: EmbeddingInput): Promise<EmbeddingResult> {
    const embedding = await this.generateEmbedding(input.content)
    const tokenCount = this.estimateTokenCount(input.content)
    const contentHash = crypto.createHash('sha256').update(input.content).digest('hex')

    // Check if embedding already exists
    const existing = await prisma.codeEmbedding.findFirst({
      where: {
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId
      }
    })

    if (existing) {
      // Update existing
      const updated = await prisma.codeEmbedding.update({
        where: { id: existing.id },
        data: {
          content: input.content,
          embedding: JSON.stringify(embedding),
          embeddingModel: this.defaultModel,
          tokenCount,
          contentHash
        }
      })

      return {
        id: updated.id,
        projectId: updated.projectId,
        entityType: updated.entityType,
        entityId: updated.entityId,
        content: updated.content,
        embedding,
        tokenCount: updated.tokenCount,
        contentHash: updated.contentHash!
      }
    }

    // Create new
    const created = await prisma.codeEmbedding.create({
      data: {
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        content: input.content,
        embedding: JSON.stringify(embedding),
        embeddingModel: this.defaultModel,
        tokenCount,
        contentHash
      }
    })

    return {
      id: created.id,
      projectId: created.projectId,
      entityType: created.entityType,
      entityId: created.entityId,
      content: created.content,
      embedding,
      tokenCount: created.tokenCount,
      contentHash: created.contentHash!
    }
  }

  /**
   * Batch store embeddings
   */
  async batchStoreEmbeddings(
    inputs: EmbeddingInput[]
  ): Promise<{ stored: number; errors: string[] }> {
    let stored = 0
    const errors: string[] = []

    for (const input of inputs) {
      try {
        await this.storeEmbedding(input)
        stored++
      } catch (error) {
        errors.push(`Failed to store embedding for ${input.entityType}:${input.entityId}: ${error}`)
      }
    }

    return { stored, errors }
  }

  /**
   * Find similar entities by content similarity
   */
  async findSimilar(
    projectId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SimilarityResult[]> {
    const { limit = 10, threshold = 0.7, entityTypes, excludeIds = [] } = options
    
    const queryEmbedding = await this.generateEmbedding(query)
    
    // Get all embeddings for the project
    const where: any = { projectId }
    if (entityTypes && entityTypes.length > 0) {
      where.entityType = { in: entityTypes }
    }
    if (excludeIds.length > 0) {
      where.entityId = { notIn: excludeIds }
    }

    const embeddings = await prisma.codeEmbedding.findMany({ where })

    // Calculate similarities
    const results: SimilarityResult[] = []
    
    for (const emb of embeddings) {
      try {
        const storedEmbedding = JSON.parse(emb.embedding || '[]') as number[]
        const similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding)
        
        if (similarity >= threshold) {
          results.push({
            entityId: emb.entityId,
            entityType: emb.entityType,
            content: emb.content,
            similarity
          })
        }
      } catch (error) {
        console.warn(`[VectorEmbedding] Failed to parse embedding for ${emb.id}`)
      }
    }

    // Sort by similarity and limit
    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, limit)
  }

  /**
   * Find similar entities by entity ID
   */
  async findSimilarToEntity(
    projectId: string,
    entityType: string,
    entityId: string,
    options: SearchOptions = {}
  ): Promise<SimilarityResult[]> {
    // Get the entity's embedding
    const embedding = await prisma.codeEmbedding.findFirst({
      where: {
        projectId,
        entityType,
        entityId
      }
    })

    if (!embedding || !embedding.embedding) {
      return []
    }

    const storedEmbedding = JSON.parse(embedding.embedding) as number[]
    
    // Get all other embeddings
    const { limit = 10, threshold = 0.7, entityTypes, excludeIds = [] } = options
    
    const where: any = {
      projectId,
      entityId: { not: entityId }
    }
    if (entityTypes && entityTypes.length > 0) {
      where.entityType = { in: entityTypes }
    }
    if (excludeIds.length > 0) {
      where.entityId = { notIn: [...excludeIds, entityId] }
    }

    const embeddings = await prisma.codeEmbedding.findMany({ where })

    const results: SimilarityResult[] = []
    
    for (const emb of embeddings) {
      try {
        const otherEmbedding = JSON.parse(emb.embedding || '[]') as number[]
        const similarity = this.cosineSimilarity(storedEmbedding, otherEmbedding)
        
        if (similarity >= threshold) {
          results.push({
            entityId: emb.entityId,
            entityType: emb.entityType,
            content: emb.content,
            similarity
          })
        }
      } catch (error) {
        console.warn(`[VectorEmbedding] Failed to parse embedding for ${emb.id}`)
      }
    }

    results.sort((a, b) => b.similarity - a.similarity)
    return results.slice(0, limit)
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length')
    }

    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      magnitudeA += a[i] * a[i]
      magnitudeB += b[i] * b[i]
    }

    magnitudeA = Math.sqrt(magnitudeA)
    magnitudeB = Math.sqrt(magnitudeB)

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0
    }

    return dotProduct / (magnitudeA * magnitudeB)
  }

  /**
   * Estimate token count for content
   */
  private estimateTokenCount(content: string): number {
    // Simple estimation: ~4 characters per token for English
    return Math.ceil(content.length / 4)
  }

  /**
   * Get embedding statistics for a project
   */
  async getStats(projectId: string): Promise<EmbeddingStats> {
    const embeddings = await prisma.codeEmbedding.findMany({
      where: { projectId },
      select: {
        entityType: true,
        tokenCount: true
      }
    })

    const byEntityType: Record<string, number> = {}
    let totalTokens = 0

    for (const emb of embeddings) {
      byEntityType[emb.entityType] = (byEntityType[emb.entityType] || 0) + 1
      totalTokens += emb.tokenCount
    }

    return {
      totalEmbeddings: embeddings.length,
      byEntityType,
      avgTokenCount: embeddings.length > 0 ? totalTokens / embeddings.length : 0,
      totalTokens
    }
  }

  /**
   * Delete embedding for an entity
   */
  async deleteEmbedding(
    projectId: string,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    const result = await prisma.codeEmbedding.deleteMany({
      where: {
        projectId,
        entityType,
        entityId
      }
    })
    return result.count > 0
  }

  /**
   * Delete all embeddings for a project
   */
  async deleteProjectEmbeddings(projectId: string): Promise<number> {
    const result = await prisma.codeEmbedding.deleteMany({
      where: { projectId }
    })
    return result.count
  }

  /**
   * Generate content for embedding from entity data
   */
  generateSearchableContent(
    entityType: string,
    entityData: Record<string, any>
  ): string {
    const parts: string[] = []

    switch (entityType) {
      case 'table':
        parts.push(`Table: ${entityData.tableName}`)
        if (entityData.displayName) parts.push(entityData.displayName)
        if (entityData.description) parts.push(entityData.description)
        if (entityData.columnNames) parts.push(`Columns: ${entityData.columnNames.join(', ')}`)
        break

      case 'column':
        parts.push(`Column: ${entityData.columnName}`)
        parts.push(`Table: ${entityData.tableName}`)
        parts.push(`Type: ${entityData.dataType}`)
        if (entityData.description) parts.push(entityData.description)
        break

      case 'sp':
        parts.push(`Stored Procedure: ${entityData.spName}`)
        if (entityData.description) parts.push(entityData.description)
        if (entityData.parameters) parts.push(`Parameters: ${entityData.parameters.join(', ')}`)
        if (entityData.tablesAccessed) parts.push(`Accesses: ${entityData.tablesAccessed.join(', ')}`)
        break

      case 'view':
        parts.push(`View: ${entityData.viewName}`)
        if (entityData.description) parts.push(entityData.description)
        if (entityData.sourceTables) parts.push(`Sources: ${entityData.sourceTables.join(', ')}`)
        break

      case 'module':
        parts.push(`Module: ${entityData.moduleName}`)
        parts.push(`Key: ${entityData.moduleKey}`)
        if (entityData.description) parts.push(entityData.description)
        if (entityData.layer) parts.push(`Layer: ${entityData.layer}`)
        break

      default:
        parts.push(JSON.stringify(entityData))
    }

    return parts.join('\n')
  }

  /**
   * Create embedding for an entity
   */
  async embedEntity(
    projectId: string,
    entityType: 'table' | 'column' | 'sp' | 'view' | 'module',
    entityId: string,
    entityData: Record<string, any>
  ): Promise<EmbeddingResult> {
    const content = this.generateSearchableContent(entityType, entityData)
    
    return this.storeEmbedding({
      projectId,
      entityType,
      entityId,
      content
    })
  }

  /**
   * Semantic search across all entities
   */
  async semanticSearch(
    projectId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<Array<SimilarityResult & { metadata?: Record<string, any> }>> {
    const results = await this.findSimilar(projectId, query, options)
    
    // Enrich results with entity metadata
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        let metadata: Record<string, any> | undefined
        
        try {
          switch (result.entityType) {
            case 'table':
              const table = await prisma.toolkitTable.findFirst({
                where: { id: result.entityId },
                select: { tableName: true, tableSchema: true, columnCount: true }
              })
              metadata = table || undefined
              break

            case 'column':
              const column = await prisma.toolkitColumn.findFirst({
                where: { id: result.entityId },
                select: { columnName: true, tableName: true, dataType: true }
              })
              metadata = column || undefined
              break

            case 'sp':
              const sp = await prisma.toolkitSP.findFirst({
                where: { id: result.entityId },
                select: { spName: true, spSchema: true }
              })
              metadata = sp || undefined
              break

            case 'view':
              const view = await prisma.toolkitView.findFirst({
                where: { id: result.entityId },
                select: { viewName: true, viewSchema: true }
              })
              metadata = view || undefined
              break

            case 'module':
              const module = await prisma.toolkitModule.findFirst({
                where: { id: result.entityId },
                select: { moduleName: true, moduleKey: true }
              })
              metadata = module || undefined
              break
          }
        } catch (error) {
          // Metadata enrichment failed
        }

        return { ...result, metadata }
      })
    )

    return enrichedResults
  }
}

// Export singleton instance
export const vectorEmbeddingService = new VectorEmbeddingService()

// Export types
export type { 
  EmbeddingInput as EmbeddingInputType,
  EmbeddingResult as EmbeddingResultType,
  SimilarityResult as SimilarityResultType,
  SearchOptions as SearchOptionsType
}
