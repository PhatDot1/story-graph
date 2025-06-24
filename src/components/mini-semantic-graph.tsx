"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/basic-ui"

interface SemanticNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  description: string
  embedding: number[]
  imageUrl?: string
  similarity: number
  isCenter?: boolean
}

interface SemanticLink extends d3.SimulationLinkDatum<SemanticNode> {
  source: SemanticNode
  target: SemanticNode
  similarity: number
  distance: number
}

interface MiniGraphData {
  id: string
  label: string
  descriptionText: string
  embedding: number[]
  imageUrl?: string
  similarity: number
}

interface MiniSemanticGraphProps {
  data: MiniGraphData[]
  centerAssetId: string
}

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

export function MiniSemanticGraph({ data, centerAssetId }: MiniSemanticGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<SemanticNode | null>(null)
  const [dimensions] = useState({ width: 800, height: 400 })

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return

    // Find center asset
    const centerAsset = data.find(item => item.id === centerAssetId)
    if (!centerAsset) return

    // Process data and create nodes
    const nodes: SemanticNode[] = data.map((item) => ({
      id: item.id,
      label: item.label || item.id,
      imageUrl: item.imageUrl || undefined,
      description: item.descriptionText,
      embedding: item.embedding,
      similarity: item.similarity,
      isCenter: item.id === centerAssetId,
      x: item.id === centerAssetId ? dimensions.width / 2 : Math.random() * dimensions.width,
      y: item.id === centerAssetId ? dimensions.height / 2 : Math.random() * dimensions.height,
    }))

    // Create links - connect everything to the center asset and high similarity pairs
    const links: SemanticLink[] = []
    const centerNode = nodes.find(n => n.isCenter)!
    
    nodes.forEach(node => {
      if (node.id !== centerAssetId) {
        // Connect all nodes to center
        const similarity = node.similarity
        links.push({
          source: centerNode,
          target: node,
          similarity,
          distance: (1 - similarity) * 150 + 50, // Convert similarity to distance
        })
      }
    })

    // Add some connections between similar non-center nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].isCenter || nodes[j].isCenter) continue
        
        const similarity = cosineSimilarity(nodes[i].embedding, nodes[j].embedding)
        if (similarity > 0.8 && links.length < 50) { // Limit total links
          links.push({
            source: nodes[i],
            target: nodes[j],
            similarity,
            distance: (1 - similarity) * 100 + 30,
          })
        }
      }
    }

    // Clear previous visualization
    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { width, height } = dimensions

    // Create container
    const container = svg.append("g")

    // Create color scales
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0.5, 1]) // similarity range

    // Create force simulation
    const simulation = d3
      .forceSimulation<SemanticNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SemanticNode, SemanticLink>(links)
          .id((d) => d.id)
          .distance((d) => d.distance)
          .strength(0.5),
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25))

    // Pin the center node
    if (centerNode) {
      centerNode.fx = width / 2
      centerNode.fy = height / 2
    }

    // Create links
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) => d.source.isCenter || d.target.isCenter ? "#ef4444" : "#999")
      .attr("stroke-opacity", (d) => d.similarity * 0.8)
      .attr("stroke-width", (d) => Math.max(1, d.similarity * 3))

    // Create nodes
    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => d.isCenter ? 15 : 8)
      .attr("fill", (d) => {
        if (d.isCenter) return "#ef4444"
        return colorScale(d.similarity)
      })
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
      .text((d) => d.label.substring(0, 15) + (d.label.length > 15 ? "..." : ""))
      .style("text-anchor", "middle")
      .style("font-size", (d) => d.isCenter ? "12px" : "10px")
      .style("font-weight", (d) => d.isCenter ? "bold" : "normal")
      .style("fill", "#fff") // Changed from #000 to #fff for dark theme
      .style("text-shadow", "0 0 3px #000, 0 0 3px #000") // Added text shadow for readability
      .attr("dy", (d) => d.isCenter ? -20 : -12)
      .style("pointer-events", "none")

    // Add similarity badges for center connections
    const badges = container
      .append("g")
      .attr("class", "badges")
      .selectAll("text")
      .data(nodes.filter(d => !d.isCenter))
      .enter()
      .append("text")
      .text((d) => `${(d.similarity * 100).toFixed(0)}%`)
      .style("text-anchor", "middle")
      .style("font-size", "8px")
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .style("background", "#000")
      .attr("dy", 3)
      .style("pointer-events", "none")

    // Add drag behavior (except for center node)
    const drag = d3
      .drag<SVGCircleElement, SemanticNode>()
      .on("start", (event, d) => {
        if (d.isCenter) return
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        if (d.isCenter) return
        d.fx = event.x
        d.fy = event.y
      })
      .on("end", (event, d) => {
        if (d.isCenter) return
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
        .attr("r", (n) => {
          if (n.id === d.id) return n.isCenter ? 18 : 12
          return n.isCenter ? 15 : 8
        })

      link.attr("opacity", (l) => (l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.1))

      labels.attr("opacity", (n) => (n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.3))
      badges.attr("opacity", (n) => (n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.3))
    })

    // Add hover effects
    node
      .on("mouseover", (event, d) => {
        if (!selectedNode) {
          d3.select(event.currentTarget).transition().duration(200)
            .attr("r", d.isCenter ? 18 : 12)
        }
      })
      .on("mouseout", (event, d) => {
        if (!selectedNode || selectedNode.id !== d.id) {
          d3.select(event.currentTarget).transition().duration(200)
            .attr("r", d.isCenter ? 15 : 8)
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
      badges.attr("x", (d) => d.x!).attr("y", (d) => d.y!)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [data, centerAssetId, dimensions])

  const centerAsset = data.find(item => item.id === centerAssetId)

  return (
    <Card className="asset-detail-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Similar Assets Network</span>
          <Badge variant="outline">{data.length - 1} similar assets</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Graph */}
          <div className="flex-1">
            <div className="cytoscape-container relative">
              <svg 
                ref={svgRef} 
                width={dimensions.width} 
                height={dimensions.height} 
                className="w-full h-full"
              />
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span>Current Asset</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span>Similar Assets</span>
                </div>
              </div>
              <div className="text-xs">
                Click nodes to highlight connections • Drag to reposition
              </div>
            </div>
          </div>

          {/* Info Panel */}
          {selectedNode && (
            <Card className="w-72 asset-detail-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {selectedNode.isCenter && (
                    <Badge variant="default" className="text-xs bg-red-500 text-white">Current</Badge>
                  )}
                  {selectedNode.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedNode.imageUrl && (
                    <img
                      src={selectedNode.imageUrl}
                      alt={selectedNode.label}
                      className="rounded-md border border-border w-full h-auto mb-3"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Similarity</p>
                    <Badge 
                      variant={selectedNode.similarity > 0.8 ? "default" : "secondary"}
                      className={selectedNode.similarity > 0.8 ? "bg-primary text-primary-foreground" : ""}
                    >
                      {(selectedNode.similarity * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground">{selectedNode.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID</p>
                    <p className="text-xs font-mono break-all text-foreground bg-muted p-2 rounded border border-border">
                      {selectedNode.id}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )
}