"use client"

import React, { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface CommunityNode {
  id: string
  label: string
  size: number
  assetCount: number
  color: string
  brightness: number
  tokenContract: string
  hasConnections: boolean
  avgConnections: number
  topAssets: Array<{
    name: string
    ipId: string
    descendantCount: number
  }>
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface CommunityEdge {
  id: string
  source: string | CommunityNode
  target: string | CommunityNode
  weight: number
  connectionCount: number
  type: string
}

interface D3NetworkVisualizationProps {
  communityData: {
    nodes: CommunityNode[]
    edges: CommunityEdge[]
    stats: any
  }
}

export function D3NetworkVisualization({ communityData }: D3NetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityNode | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 3600 }) // 6x larger height
  const [showConnectionsOnly, setShowConnectionsOnly] = useState(false)

  // Filter nodes based on connections if needed
  const filteredNodes = React.useMemo(() => {
    if (!showConnectionsOnly) return communityData.nodes
    return communityData.nodes.filter(
      (node) =>
        node.hasConnections || communityData.edges.some((edge) => edge.source === node.id || edge.target === node.id),
    )
  }, [communityData.nodes, communityData.edges, showConnectionsOnly])

  // Filter edges to only include those between filtered nodes
  const filteredEdges = React.useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((node) => node.id))
    return communityData.edges.filter((edge) => {
      const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id
      const targetId = typeof edge.target === "string" ? edge.target : edge.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })
  }, [communityData.edges, filteredNodes])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: Math.max(3600, container.clientHeight), // Ensure minimum 3600px height
          })
        }
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous render

    const { width, height } = dimensions

    // Create main group for zooming/panning
    const g = svg.append("g")

    // Add zoom behavior with wider range for larger space
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 10]) // Much wider zoom range for larger space
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom)

    // Create force simulation with parameters adjusted for larger space
    const simulation = d3
      .forceSimulation<CommunityNode>(filteredNodes)
      .force(
        "link",
        d3
          .forceLink<CommunityNode, CommunityEdge>(filteredEdges)
          .id((d) => d.id)
          .distance((d) => 200 + d.weight * 40) // Increased distance for larger space
          .strength(0.2), // Reduced strength for more spread
      )
      .force("charge", d3.forceManyBody().strength(-1500)) // Increased repulsion for larger space
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3
          .forceCollide<CommunityNode>()
          .radius((d) => d.size / 2 + 20), // Increased collision radius
      )

    // Create gradient definitions for glowing effects
    const defs = svg.append("defs")

    filteredNodes.forEach((node) => {
      const gradient = defs
        .append("radialGradient")
        .attr("id", `gradient-${node.id}`)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%")

      gradient.append("stop").attr("offset", "0%").attr("stop-color", node.color).attr("stop-opacity", node.brightness)

      gradient
        .append("stop")
        .attr("offset", "70%")
        .attr("stop-color", node.color)
        .attr("stop-opacity", node.brightness * 0.8)

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", node.color)
        .attr("stop-opacity", node.brightness * 0.3)

      // Glow filter
      const filter = defs.append("filter").attr("id", `glow-${node.id}`)

      filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur")

      const feMerge = filter.append("feMerge")
      feMerge.append("feMergeNode").attr("in", "coloredBlur")
      feMerge.append("feMergeNode").attr("in", "SourceGraphic")
    })

    // Create links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredEdges)
      .enter()
      .append("line")
      .attr("stroke", "#666")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.weight) * 2)
      .attr("stroke-dasharray", (d) => (d.type === "cross-community" ? "5,5" : "none"))

    // Create nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")

    // Add circles for nodes
    node
      .append("circle")
      .attr("r", (d) => d.size / 2)
      .attr("fill", (d) => `url(#gradient-${d.id})`)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", (d) => `url(#glow-${d.id})`)

    // Add labels
    node
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.size / 2 + 15)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .style("pointer-events", "none")

    // Add asset count labels
    node
      .append("text")
      .text((d) => d.assetCount.toLocaleString())
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .style("pointer-events", "none")

    // Add drag behavior
    const drag = d3
      .drag<SVGGElement, CommunityNode>()
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
      event.stopPropagation()
      setSelectedCommunity(selectedCommunity?.id === d.id ? null : d)

      // Highlight connected nodes
      const connectedNodeIds = new Set<string>()
      filteredEdges.forEach((edge) => {
        const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id
        const targetId = typeof edge.target === "string" ? edge.target : edge.target.id

        if (sourceId === d.id) connectedNodeIds.add(targetId)
        if (targetId === d.id) connectedNodeIds.add(sourceId)
      })

      // Update visual highlighting
      node.style("opacity", (nodeData) => {
        if (selectedCommunity?.id === d.id) return 1 // Reset if deselecting
        return nodeData.id === d.id || connectedNodeIds.has(nodeData.id) ? 1 : 0.3
      })

      link.style("opacity", (linkData) => {
        if (selectedCommunity?.id === d.id) return 0.6 // Reset if deselecting
        const sourceId = typeof linkData.source === "string" ? linkData.source : linkData.source.id
        const targetId = typeof linkData.target === "string" ? linkData.target : linkData.target.id
        return sourceId === d.id || targetId === d.id ? 1 : 0.1
      })
    })

    // Click on background to deselect
    svg.on("click", () => {
      setSelectedCommunity(null)
      node.style("opacity", 1)
      link.style("opacity", 0.6)
    })

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (typeof d.source === "string" ? 0 : d.source.x || 0))
        .attr("y1", (d) => (typeof d.source === "string" ? 0 : d.source.y || 0))
        .attr("x2", (d) => (typeof d.target === "string" ? 0 : d.target.x || 0))
        .attr("y2", (d) => (typeof d.target === "string" ? 0 : d.target.y || 0))

      node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [filteredNodes, filteredEdges, dimensions, selectedCommunity])

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="bg-card p-4 rounded-lg border mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Community Network</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showConnectionsOnly}
                onChange={(e) => setShowConnectionsOnly(e.target.checked)}
                className="rounded"
              />
              Show only connected communities
            </label>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div>🖱️ Click & drag to move</div>
            <div>🔍 Scroll to zoom</div>
            <div>👆 Click nodes to highlight</div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-card p-4 rounded-lg border mb-4">
        <h2 className="text-lg font-semibold mb-2">Network Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Communities</p>
            <p className="font-bold text-lg">{filteredNodes.length}</p>
            {showConnectionsOnly && <p className="text-xs text-muted-foreground">connected only</p>}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Connections</p>
            <p className="font-bold text-lg">{filteredEdges.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Assets</p>
            <p className="font-bold text-lg">{communityData.stats.totalAssets.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Largest Community</p>
            <p className="font-bold text-lg">{communityData.stats.largestCommunity.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER - 6x larger height */}
      <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[3600px]" style={{ minHeight: "3600px" }}>
        {/* Network Visualization - 6x larger height */}
        <div
          className="w-full lg:w-3/4 h-full min-h-[3600px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border overflow-hidden"
          style={{ minHeight: "3600px", height: "3600px" }}
        >
          <svg ref={svgRef} width="100%" height="100%" className="w-full h-full" style={{ height: "3600px" }} />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-1/4 bg-card p-4 rounded-lg border overflow-y-auto">
          {selectedCommunity ? (
            <div>
              <h3 className="font-semibold mb-4">Community Details</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Name</h4>
                  <p className="font-semibold">{selectedCommunity.label}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Assets</h4>
                  <p className="text-2xl font-bold text-primary">{selectedCommunity.assetCount.toLocaleString()}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Internal Connections</h4>
                  <p className="font-semibold">{selectedCommunity.avgConnections.toFixed(2)} avg per asset</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Contract Address</h4>
                  <p className="text-xs font-mono bg-muted p-2 rounded break-all">{selectedCommunity.tokenContract}</p>
                </div>

                {selectedCommunity.topAssets.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Top Assets</h4>
                    <div className="space-y-2">
                      {selectedCommunity.topAssets.slice(0, 3).map((asset, index) => (
                        <div key={asset.ipId} className="bg-muted/30 p-2 rounded text-xs">
                          <div className="font-medium truncate">{asset.name}</div>
                          <div className="text-muted-foreground">{asset.descendantCount} descendants</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold mb-4">Communities ({filteredNodes.length})</h3>

              <div className="space-y-2 mb-6">
                {filteredNodes
                  .sort((a, b) => b.assetCount - a.assetCount)
                  .slice(0, 15)
                  .map((community) => (
                    <div
                      key={community.id}
                      className="flex items-center p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedCommunity(community)}
                    >
                      <div
                        className="w-4 h-4 rounded-full mr-3 border border-white/20"
                        style={{
                          backgroundColor: community.color,
                          opacity: community.brightness,
                        }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{community.label}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{community.assetCount} assets</span>
                          {community.hasConnections && <span>• connected</span>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="font-medium mb-2 text-sm">Legend</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Blob size = Number of assets</div>
              <div>• Blob brightness = Relative size</div>
              <div>• Line thickness = Connection strength</div>
              <div>• Dashed lines = Cross-community</div>
              <div>• Numbers = Asset count</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
