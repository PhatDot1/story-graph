"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { cosineSimilarity, similarityToDistance } from "@/lib/similarity"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/basic-ui"
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react"

// Interfaces remain the same
interface SemanticNode extends d3.SimulationNodeDatum {
    id: string
    label: string
    description: string
    embedding: number[]
    imageUrl?: string
  }

interface SemanticLink extends d3.SimulationLinkDatum<SemanticNode> {
  source: SemanticNode
  target: SemanticNode
  similarity: number
  distance: number
}

interface SemanticData {
    id: string
    descriptionText: string
    embedding: number[]
    label?: string
    imageUrl?: string
  }

// The component no longer accepts a 'data' prop
interface SemanticVisualizationProps {}

export function SemanticVisualization({}: SemanticVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })
  const [selectedNode, setSelectedNode] = useState<SemanticNode | null>(null)
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7)
  
  // NEW: State to hold all data fetched from the API
  const [allData, setAllData] = useState<SemanticData[]>([])
  
  // MODIFIED: isLoading is true by default until data is fetched
  const [isLoading, setIsLoading] = useState(true) 
  const [error, setError] = useState<string | null>(null); // NEW: State for errors

  const [maxNodes, setMaxNodes] = useState(500)

  // NEW: useEffect hook to fetch data from our API route on component mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/vectors')
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`)
        }
        const data: SemanticData[] = await response.json()
        setAllData(data)
      } catch (e) {
        setError((e as Error).message)
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, []) // Empty dependency array means this runs once on mount


  // This useEffect handles resizing, no changes needed here.
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const container = svgRef.current.parentElement
        setDimensions({
          width: container.clientWidth,
          height: Math.max(600, container.clientHeight - 100),
        })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  // MODIFIED: This main D3 effect now depends on `allData` instead of `data` prop
  useEffect(() => {
    // We now use `allData` from our state
    if (!svgRef.current || allData.length === 0) return
    
    // Set a temporary loading state specifically for D3 processing
    setIsLoading(true)

    const limitedData = allData.slice(0, maxNodes)
    
    // ... all the D3 logic below remains exactly the same
    // Just replace every instance of `data` with `allData` if you copied it from here before.
    // The code you provided already correctly uses `limitedData` derived from the source `data`/`allData`.

    // Process data and create nodes
    const nodes: SemanticNode[] = limitedData.map((item, index) => ({
      id: item.id,
      label: item.label || item.id,
      imageUrl: (item as any).imageUrl || null,
      description: item.descriptionText,
      embedding: item.embedding,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
    }))

    // Calculate similarities and create links (with performance optimization)
    const links: SemanticLink[] = []
    const maxLinks = 5000 // Limit links for performance
    let linkCount = 0
    
    for (let i = 0; i < nodes.length && linkCount < maxLinks; i++) {
      for (let j = i + 1; j < nodes.length && linkCount < maxLinks; j++) {
        const similarity = cosineSimilarity(nodes[i].embedding, nodes[j].embedding)
        if (similarity > similarityThreshold) {
          links.push({
            source: nodes[i],
            target: nodes[j],
            similarity,
            distance: similarityToDistance(similarity) * 200,
          })
          linkCount++
        }
      }
    }

    // Clear previous visualization
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { width, height } = dimensions

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform)
      })

    svg.call(zoom)

    // Create container for zoomable content
    const container = svg.append("g")

    // Create color scale based on similarity clusters
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

    // Create force simulation
    const simulation = d3
      .forceSimulation<SemanticNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SemanticNode, SemanticLink>(links)
          .id((d) => d.id)
          .distance((d) => d.distance)
          .strength(0.3),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20))

    // Create links
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", (d) => d.similarity * 0.8)
      .attr("stroke-width", (d) => Math.max(1, d.similarity * 4))

    // Create nodes
    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d, i) => colorScale(String(i % 10)))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")

    // Add labels
    const labels = container
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => d.label)
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .attr("dy", -12)
      .style("pointer-events", "none")

    // Add drag behavior
    const drag = d3
      .drag<SVGCircleElement, SemanticNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    node.call(drag)

    // Add click behavior
    node.on("click", (event, d) => {
      setSelectedNode(d)

      // Highlight connected nodes
      const connectedNodeIds = new Set<string>()
      links.forEach((link) => {
        if (link.source.id === d.id) connectedNodeIds.add(link.target.id)
        if (link.target.id === d.id) connectedNodeIds.add(link.source.id)
      })

      node
        .attr("opacity", (n) => (n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.3))
        .attr("r", (n) => (n.id === d.id ? 12 : 8))

      link.attr("opacity", (l) => (l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.1))

      labels.attr("opacity", (n) => (n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.3))
    })

    // Add hover effects
    node
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).transition().duration(200).attr("r", 10)
      })
      .on("mouseout", (event, d) => {
        if (selectedNode?.id !== d.id) {
          d3.select(event.currentTarget).transition().duration(200).attr("r", 8)
        }
      })

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x!)
        .attr("y1", (d) => d.source.y!)
        .attr("x2", (d) => d.target.x!)
        .attr("y2", (d) => d.target.y!)

      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!)

      labels.attr("x", (d) => d.x!).attr("y", (d) => d.y!)
    })

    // Control functions
    const resetView = () => {
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity)
      setSelectedNode(null)
      node.attr("opacity", 1).attr("r", 8)
      link.attr("opacity", (d) => d.similarity * 0.8)
      labels.attr("opacity", 1)
    }

    const zoomIn = () => {
      svg.transition().duration(300).call(zoom.scaleBy, 1.5)
    }

    const zoomOut = () => {
      svg
        .transition()
        .duration(300)
        .call(zoom.scaleBy, 1 / 1.5)
    }

    const fitToView = () => {
      const bounds = container.node()?.getBBox()
      if (bounds) {
        const fullWidth = width
        const fullHeight = height
        const widthScale = fullWidth / bounds.width
        const heightScale = fullHeight / bounds.height
        const scale = Math.min(widthScale, heightScale) * 0.8
        const translate = [
          fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
          fullHeight / 2 - scale * (bounds.y + bounds.height / 2),
        ]

        svg
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
      }
    }

    // Store control functions for external access
    ;(svg.node() as any)._controls = {
      resetView,
      zoomIn,
      zoomOut,
      fitToView,
    }

    // Done processing
    setIsLoading(false)

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [allData, dimensions, similarityThreshold, maxNodes]) // Dependency array now watches `allData`

  const handleControlClick = (action: string) => {
    const controls = (svgRef.current as any)?._controls
    if (controls && controls[action]) {
      controls[action]()
    }
  }

  // Render the component
  return (
    <div className="w-full space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* ... buttons ... */}
          <Button variant="outline" size="sm" onClick={() => handleControlClick("zoomIn")}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleControlClick("zoomOut")}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleControlClick("fitToView")}>
            <Maximize2 className="h-4 w-4" />
            Fit to View
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleControlClick("resetView")}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Max Nodes:</label>
            <select 
              value={maxNodes} 
              onChange={(e) => setMaxNodes(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
              disabled={isLoading || allData.length === 0} // Disable while loading
            >
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
              {/* MODIFIED: Use allData.length */}
              <option value={allData.length}>All ({allData.length})</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Similarity Threshold:</label>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number.parseFloat(e.target.value))}
              className="w-32"
            />
            <Badge variant="secondary">{similarityThreshold.toFixed(2)}</Badge>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Visualization */}
        <div className="flex-1 border rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 relative" style={{ minHeight: '600px' }}>
          {/* MODIFIED: More robust loading/error display */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-white/80">Fetching & Processing Semantic Similarities...</p>
              </div>
            </div>
          )}
          {error && !isLoading && (
             <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 z-10">
              <div className="text-center p-4">
                <p className="text-lg font-semibold text-white">Failed to load visualization</p>
                <p className="text-sm text-red-200 mt-1">{error}</p>
              </div>
            </div>
          )}
          <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />
        </div>

        {/* Info Panel */}
        {selectedNode && (
            // ... Info Panel JSX remains the same
             <Card className="w-80">
                <CardHeader>
                <CardTitle className="text-lg">{selectedNode.label}</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-3">
                    {selectedNode.imageUrl && (
                    <img
                        src={selectedNode.imageUrl}
                        alt={selectedNode.label}
                        className="rounded-md border w-full h-auto mb-3"
                    />
                    )}
                    <div>
                    <p className="text-sm font-medium text-muted-foreground">ID</p>
                    <p className="text-xs font-mono break-all">{selectedNode.id}</p>
                    </div>
                    <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{selectedNode.description}</p>
                    </div>
                    <div>
                    <p className="text-sm font-medium text-muted-foreground">Embedding Dimensions</p>
                    <Badge variant="outline">{selectedNode.embedding.length}D</Badge>
                    </div>
                </div>
                </CardContent>
            </Card>
        )}

      </div>

      {/* Legend */}
      <Card>
        {/* ... Legend JSX remains the same */}
      </Card>
    </div>
  )
}