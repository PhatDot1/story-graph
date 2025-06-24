"use client"

import { useState, useRef } from "react"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/basic-ui"
import { Search, Upload, Image as ImageIcon, Loader2, Settings } from "lucide-react"

interface SearchResult {
  id: string
  label: string
  imageUrl?: string
  similarity: number
  description?: string
}

export default function SemanticSearchPage() {
  const [textQuery, setTextQuery] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchType, setSearchType] = useState<"text" | "image">("text")
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3) // Default 30%
  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTextSearch = async () => {
    if (!textQuery.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: textQuery, 
          type: 'text',
          similarityThreshold: similarityThreshold 
        }),
      })
      
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageSearch = async () => {
    if (!imageFile) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('similarityThreshold', similarityThreshold.toString())
      
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Image search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setImageFile(file)
      setSearchType("image")
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Semantic Search</h1>
        <p className="text-muted-foreground mt-2">
          Search for similar IP assets using natural language or image similarity. PLEASE NOTE THAT THIS WILL HAVE COLD STARTS WHILE THIS IS IN DEMO STAGE BEFORE WE HOST OUR OWN API ENDPOINT - also need to host somewhere real not vercel
        </p>
      </div>

      {/* Search Interface */}
      <Card className="asset-detail-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search Interface</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings Panel */}
          {showSettings && (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Similarity Threshold: {(similarityThreshold * 100).toFixed(0)}%
                    </label>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-muted-foreground w-8">0%</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={similarityThreshold}
                        onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground w-12">100%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only show results above this similarity score. Higher values = more selective.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Type Tabs */}
          <div className="flex space-x-2">
            <Button 
              variant={searchType === "text" ? "default" : "outline"}
              onClick={() => setSearchType("text")}
              className={searchType === "text" ? "btn-primary" : ""}
            >
              <Search className="h-4 w-4 mr-2" />
              Text Search
            </Button>
            <Button 
              variant={searchType === "image" ? "default" : "outline"}
              onClick={() => setSearchType("image")}
              className={searchType === "image" ? "btn-primary" : ""}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Image Search
            </Button>
          </div>

          {/* Text Search */}
          {searchType === "text" && (
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Describe what you're looking for (e.g., 'colorful abstract art', 'medieval castle', 'cute animals')"
                value={textQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTextQuery(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleTextSearch()}
                className="flex-1 form-input px-3 py-2 rounded-md"
              />
              <Button 
                onClick={handleTextSearch} 
                disabled={isLoading || !textQuery.trim()}
                className="btn-primary"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
          )}

          {/* Image Search */}
          {searchType === "image" && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageFile ? (
                  <div className="space-y-2">
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="Selected" 
                      className="max-h-40 mx-auto rounded"
                    />
                    <p className="text-sm text-muted-foreground">{imageFile.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-foreground">Click to upload an image</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG, GIF up to 10MB</p>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {imageFile && (
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleImageSearch} 
                    disabled={isLoading} 
                    className="flex-1 btn-primary"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    Find Similar Images
                  </Button>
                  <Button variant="outline" onClick={() => setImageFile(null)}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 ? (
        <Card className="asset-detail-card">
          <CardHeader>
            <CardTitle>Search Results ({results.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing results with similarity ≥ {(similarityThreshold * 100).toFixed(0)}%
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((result) => (
                <Card key={result.id} className="overflow-hidden asset-detail-card">
                  {result.imageUrl && (
                    <div className="aspect-square relative">
                      <img 
                        src={result.imageUrl} 
                        alt={result.label}
                        className="w-full h-full object-cover"
                      />
                      <Badge 
                        className="absolute top-2 right-2 bg-black/70 text-white"
                        variant="secondary"
                      >
                        {(result.similarity * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm mb-1 truncate text-foreground">{result.label}</h3>
                    {result.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{result.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono truncate">{result.id}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Show "no results" message when search has been performed but no results match threshold
        isLoading === false && (textQuery.trim() || imageFile) && (
          <Card className="asset-detail-card">
            <CardContent className="text-center py-12">
              <div className="space-y-2">
                <p className="text-lg font-medium text-muted-foreground">No similar results found</p>
                <p className="text-sm text-muted-foreground">
                  Try lowering the similarity threshold or using different search terms
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSimilarityThreshold(Math.max(0, similarityThreshold - 0.1))}
                  disabled={similarityThreshold <= 0}
                >
                  Lower Threshold to {Math.max(0, (similarityThreshold - 0.1) * 100).toFixed(0)}%
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Example Queries */}
      <Card className="asset-detail-card">
        <CardHeader>
          <CardTitle>Example Searches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Text Search Examples</h4>
              <div className="space-y-1 text-sm">
                {[
                  "colorful abstract art",
                  "medieval fantasy castle",
                  "cute cartoon animals",
                  "futuristic cityscape",
                  "nature landscape photography"
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      setTextQuery(example)
                      setSearchType("text")
                    }}
                    className="block text-left link-primary cursor-pointer"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">How It Works</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Text searches use semantic embedding similarity</li>
                <li>• Image searches compare visual features</li>
                <li>• Results are filtered by similarity threshold</li>
                <li>• Maximum 50 results shown even if more match</li>
                <li>• Upload any image to find visually similar assets</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}