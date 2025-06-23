"use client"

import { useState, useRef } from "react"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input } from "@/components/basic-ui"
import { Search, Upload, Image as ImageIcon, Loader2 } from "lucide-react"

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
          limit: 20 
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
      formData.append('limit', '20')
      
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
          Search for similar IP assets using natural language or image similarity.
        </p>
      </div>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Search Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Type Tabs */}
          <div className="flex space-x-2">
            <Button 
              variant={searchType === "text" ? "default" : "outline"}
              onClick={() => setSearchType("text")}
            >
              <Search className="h-4 w-4 mr-2" />
              Text Search
            </Button>
            <Button 
              variant={searchType === "image" ? "default" : "outline"}
              onClick={() => setSearchType("image")}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Image Search
            </Button>
          </div>

          {/* Text Search */}
          {searchType === "text" && (
            <div className="flex space-x-2">
              <Input
                placeholder="Describe what you're looking for (e.g., 'colorful abstract art', 'medieval castle', 'cute animals')"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTextSearch()}
                className="flex-1"
              />
              <Button onClick={handleTextSearch} disabled={isLoading || !textQuery.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
          )}

          {/* Image Search */}
          {searchType === "image" && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {imageFile ? (
                  <div className="space-y-2">
                    <img 
                      src={URL.createObjectURL(imageFile)} 
                      alt="Selected" 
                      className="max-h-40 mx-auto rounded"
                    />
                    <p className="text-sm text-gray-600">{imageFile.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="text-gray-600">Click to upload an image</p>
                    <p className="text-sm text-gray-400">JPG, PNG, GIF up to 10MB</p>
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
                  <Button onClick={handleImageSearch} disabled={isLoading} className="flex-1">
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
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((result) => (
                <Card key={result.id} className="overflow-hidden">
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
                    <h3 className="font-medium text-sm mb-1 truncate">{result.label}</h3>
                    {result.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{result.description}</p>
                    )}
                    <p className="text-xs text-gray-500 font-mono truncate">{result.id}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Queries */}
      <Card>
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
                    className="block text-left text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">How It Works</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Text searches use semantic embedding similarity</li>
                <li>• Image searches compare visual features</li>
                <li>• Results are ranked by similarity score</li>
                <li>• Upload any image to find visually similar assets</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}