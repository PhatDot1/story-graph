// Calculate cosine similarity between two vectors
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length")
    }
  
    let dotProduct = 0
    let normA = 0
    let normB = 0
  
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }
  
    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)
  
    if (normA === 0 || normB === 0) {
      return 0
    }
  
    return dotProduct / (normA * normB)
  }
  
  // Calculate Euclidean distance between two vectors
  export function euclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length")
    }
  
    let sum = 0
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i]
      sum += diff * diff
    }
  
    return Math.sqrt(sum)
  }
  
  // Normalize similarity to distance (1 - similarity)
  export function similarityToDistance(similarity: number): number {
    return 1 - similarity
  }
  