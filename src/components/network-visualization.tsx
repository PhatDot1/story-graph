"use client"

import React, { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import type { IPAsset } from "@/types"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface NetworkNode {
  id: string
  label: string
  size?: number
  community?: number
  color?: string
  descendantCount?: number
  childrenCount?: boolean
  isGroup?: boolean
  tokenContract?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface NetworkEdge {
  id: string
  source: string | NetworkNode
  target: string | NetworkNode
  weight?: number
  type?: string
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  stats: any
}

interface NetworkVisualizationProps {
  networkData: NetworkData
  assets: IPAsset[]
  isOptimizedView?: boolean
}

export function NetworkVisualization({ networkData, assets, isOptimizedView = false }: NetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [selectedCommunity, setSelectedCommunity] = useState<number | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 3600 }) // 6x larger height
  const [showSmallCommunities, setShowSmallCommunities] = useState(isOptimizedView)
  const [showLowConnections, setShowLowConnections] = useState(isOptimizedView)
  const [currentZoom, setCurrentZoom] = useState(1)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  // Filter nodes based on communities if needed
  const filteredNodes = React.useMemo(() => {
    if (isOptimizedView) return networkData.nodes // Already optimized server-side

    // Apply client-side filtering for full dataset
    const COMMUNITY_SIZE_THRESHOLD = 50
    const CONNECTION_THRESHOLD = 5
    const MIN_COMMUNITY_SIZE = 10

    // Calculate community stats
    const communityStats: Record<string, { count: number; avgConnections: number }> = {}
    networkData.nodes.forEach((node) => {
      const communityKey = (node.community || 0).toString()
      if (!communityStats[communityKey]) {
        communityStats[communityKey] = { count: 0, avgConnections: 0 }
      }
      communityStats[communityKey].count++
    })

    // Calculate average connections per community
    Object.keys(communityStats).forEach((communityKey) => {
      const communityNodes = networkData.nodes.filter((node) => (node.community || 0).toString() === communityKey)
      const communityEdges = networkData.edges.filter((edge) => {
        const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id
        const targetId = typeof edge.target === "string" ? edge.target : edge.target.id
        const sourceNode = networkData.nodes.find((n) => n.id === sourceId)
        const targetNode = networkData.nodes.find((n) => n.id === targetId)
        return (
          sourceNode &&
          targetNode &&
          ((sourceNode.community || 0).toString() === communityKey ||
            (targetNode.community || 0).toString() === communityKey)
        )
      })

      communityStats[communityKey].avgConnections =
        communityNodes.length > 0 ? (communityEdges.length * 2) / communityNodes.length : 0
    })

    return networkData.nodes.filter((node) => {
      const communityKey = (node.community || 0).toString()
      const stats = communityStats[communityKey]

      if (!stats || stats.count < MIN_COMMUNITY_SIZE) return false

      const passesSizeFilter = showSmallCommunities || stats.count >= COMMUNITY_SIZE_THRESHOLD
      const passesConnectionFilter = showLowConnections || stats.avgConnections >= CONNECTION_THRESHOLD

      return passesSizeFilter && passesConnectionFilter
    })
  }, [networkData.nodes, networkData.edges, isOptimizedView, showSmallCommunities, showLowConnections])

  // Filter edges to only include those between filtered nodes
  const filteredEdges = React.useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((node) => node.id))
    return networkData.edges.filter((edge) => {
      const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id
      const targetId = typeof edge.target === "string" ? edge.target : edge.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })
  }, [networkData.edges, filteredNodes])

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: Math.max(3600, container.clientHeight), // Ensure minimum height of 3600px
          })
        }
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [])

  // Calculate community stats for display
  const communityStats = React.useMemo(() => {
    const stats: Record<string, { count: number; name: string; color: string }> = {}

    filteredNodes.forEach((node) => {
      const communityKey = (node.community || 0).toString()
      if (!stats[communityKey]) {
        stats[communityKey] = {
          count: 0,
          name: node.isGroup ? node.label : `Community ${node.community}`,
          color: node.color || "#8b5cf6",
        }
      }
      stats[communityKey].count++
    })

    return stats
  }, [filteredNodes])

  // Zoom functions
  const zoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current)
      svg.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.5)
    }
  }

  const zoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current)
      svg
        .transition()
        .duration(300)
        .call(zoomBehaviorRef.current.scaleBy, 1 / 1.5)
    }
  }

  const resetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current)
      svg.transition().duration(750).call(zoomBehaviorRef.current.transform, d3.zoomIdentity)
    }
  }

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous render

    const { width, height } = dimensions

    // Create main group for zooming/panning
    const g = svg.append("g")

    // Add zoom behavior with much wider zoom range
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 10]) // Much wider zoom range: 0.01x to 10x
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
        setCurrentZoom(event.transform.k)
      })

    zoomBehaviorRef.current = zoom
    svg.call(zoom)

    // Create force simulation with larger spread
    const simulation = d3
      .forceSimulation<NetworkNode>(filteredNodes)
      .force(
        "link",
        d3
          .forceLink<NetworkNode, NetworkEdge>(filteredEdges)
          .id((d) => d.id)
          .distance((d) => 150 + (d.weight || 1) * 30) // Increased distance
          .strength(0.2), // Reduced strength for more spread
      )
      .force("charge", d3.forceManyBody().strength(-1200)) // Increased repulsion
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3
          .forceCollide<NetworkNode>()
          .radius((d) => (d.size || 30) / 2 + 15), // Increased collision radius
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

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", node.color || "#8b5cf6")
        .attr("stop-opacity", 0.9)

      gradient
        .append("stop")
        .attr("offset", "70%")
        .attr("stop-color", node.color || "#8b5cf6")
        .attr("stop-opacity", 0.7)

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", node.color || "#8b5cf6")
        .attr("stop-opacity", 0.3)

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
      .attr("stroke-width", (d) => Math.sqrt(d.weight || 1) * 2)
      .attr("stroke-dasharray", (d) => (d.type === "cross-contract" ? "5,5" : "none"))

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
      .attr("r", (d) => (d.size || 30) / 2)
      .attr("fill", (d) => `url(#gradient-${d.id})`)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("filter", (d) => `url(#glow-${d.id})`)

    // Add labels
    node
      .append("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.size || 30) / 2 + 15)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .style("pointer-events", "none")

    // Add descendant count labels for larger nodes
    node
      .filter((d) => (d.size || 30) > 40)
      .append("text")
      .text((d) => ((d.descendantCount || 0) > 0 ? `${d.descendantCount} desc.` : ""))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .style("pointer-events", "none")

    // Add drag behavior
    const drag = d3
      .drag<SVGGElement, NetworkNode>()
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
      setSelectedNode(selectedNode?.id === d.id ? null : d)
      setSelectedCommunity(d.community || null)

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
        if (selectedNode?.id === d.id) return 1 // Reset if deselecting
        return nodeData.id === d.id || connectedNodeIds.has(nodeData.id) ? 1 : 0.3
      })

      link.style("opacity", (linkData) => {
        if (selectedNode?.id === d.id) return 0.6 // Reset if deselecting
        const sourceId = typeof linkData.source === "string" ? linkData.source : linkData.source.id
        const targetId = typeof linkData.target === "string" ? linkData.target : linkData.target.id
        return sourceId === d.id || targetId === d.id ? 1 : 0.1
      })
    })

    // Click on background to deselect
    svg.on("click", () => {
      setSelectedNode(null)
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
  }, [filteredNodes, filteredEdges, dimensions, selectedNode])

  // Handle community selection
  const handleCommunitySelect = (communityId: number) => {
    setSelectedCommunity(selectedCommunity === communityId ? null : communityId)
    setSelectedNode(null)

    // Highlight nodes in the selected community
    const svg = d3.select(svgRef.current)
    const node = svg.selectAll(".node")
    const link = svg.selectAll("line")

    if (selectedCommunity === communityId) {
      // Reset highlighting
      node.style("opacity", 1)
      link.style("opacity", 0.6)
    } else {
      // Highlight selected community
      node.style("opacity", (d: any) => (d.community === communityId ? 1 : 0.3))
      link.style("opacity", (d: any) => {
        const sourceId = typeof d.source === "string" ? d.source : d.source.id
        const targetId = typeof d.target === "string" ? d.target : d.target.id
        const sourceNode = filteredNodes.find((n) => n.id === sourceId)
        const targetNode = filteredNodes.find((n) => n.id === targetId)
        return sourceNode?.community === communityId || targetNode?.community === communityId ? 1 : 0.1
      })
    }
  }

  // Reset selection
  const resetSelection = () => {
    setSelectedNode(null)
    setSelectedCommunity(null)

    const svg = d3.select(svgRef.current)
    svg.selectAll(".node").style("opacity", 1)
    svg.selectAll("line").style("opacity", 0.6)
  }

  // Center view
  const centerView = () => {
    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>()

    svg
      .transition()
      .duration(750)
      .call(zoom.transform as any, d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(1))
  }

  // Fit to view
  const fitToView = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current)

      // Calculate bounds of all nodes
      const bounds = {
        minX: d3.min(filteredNodes, (d) => d.x || 0) || 0,
        maxX: d3.max(filteredNodes, (d) => d.x || 0) || dimensions.width,
        minY: d3.min(filteredNodes, (d) => d.y || 0) || 0,
        maxY: d3.max(filteredNodes, (d) => d.y || 0) || dimensions.height,
      }

      const width = bounds.maxX - bounds.minX
      const height = bounds.maxY - bounds.minY
      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2

      // Calculate scale to fit all nodes with padding
      const scale = Math.min(
        (dimensions.width * 0.8) / width,
        (dimensions.height * 0.8) / height,
        2, // Maximum scale
      )

      const transform = d3.zoomIdentity
        .translate(dimensions.width / 2, dimensions.height / 2)
        .scale(scale)
        .translate(-centerX, -centerY)

      svg.transition().duration(750).call(zoomBehaviorRef.current.transform, transform)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls - Only show filters for full dataset */}
      {!isOptimizedView && (
        <div className="bg-card p-4 rounded-lg border mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Network Controls</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showSmallCommunities}
                    onChange={(e) => setShowSmallCommunities(e.target.checked)}
                    className="rounded"
                  />
                  Show communities &lt; 50 nodes
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showLowConnections}
                    onChange={(e) => setShowLowConnections(e.target.checked)}
                    className="rounded"
                  />
                  Show communities &lt; 5 avg connections
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div>🖱️ Click & drag to move</div>
              <div>🔍 Scroll to zoom</div>
              <div>👆 Click nodes to highlight</div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-card p-4 rounded-lg border mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">
              Network Statistics
              {isOptimizedView && <span className="text-sm font-normal text-green-600 ml-2">(Optimized View)</span>}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Visible Nodes</p>
                <p className="font-bold text-lg">{filteredNodes.length}</p>
                {!isOptimizedView && <p className="text-xs text-muted-foreground">of {networkData.nodes.length}</p>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visible Edges</p>
                <p className="font-bold text-lg">{filteredEdges.length}</p>
                {!isOptimizedView && <p className="text-xs text-muted-foreground">of {networkData.edges.length}</p>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Communities</p>
                <p className="font-bold text-lg">{Object.keys(communityStats).length}</p>
                {!isOptimizedView && <p className="text-xs text-muted-foreground">visible</p>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Connections</p>
                <p className="font-bold text-lg">
                  {filteredNodes.length > 0 ? ((filteredEdges.length * 2) / filteredNodes.length).toFixed(1) : 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p
                  className={`font-bold text-lg ${filteredNodes.length > 1000 ? "text-yellow-500" : "text-green-500"}`}
                >
                  {filteredNodes.length > 2000 ? "Heavy" : filteredNodes.length > 1000 ? "Medium" : "Light"}
                </p>
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground text-center">Zoom: {(currentZoom * 100).toFixed(0)}%</div>
            <div className="flex gap-1">
              <button
                onClick={zoomIn}
                className="p-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={zoomOut}
                className="p-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                className="p-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[3600px]">
        {" "}
        {/* 6x larger minimum height */}
        {/* Network Visualization */}
        <div className="w-full lg:w-3/4 h-full min-h-[3600px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border overflow-hidden relative">
          <svg ref={svgRef} width="100%" height="600%" className="w-full h-full" />

          {/* Floating zoom controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 bg-card/90 backdrop-blur-sm rounded-lg p-2 border">
            <button
              onClick={zoomIn}
              className="p-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              className="p-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="text-xs text-muted-foreground text-center px-1">{(currentZoom * 100).toFixed(0)}%</div>
          </div>
        </div>
        {/* Sidebar */}
        <div className="w-full lg:w-1/4 bg-card p-4 rounded-lg border overflow-y-auto">
          <h3 className="font-semibold mb-4">
            Communities ({Object.keys(communityStats).length})
            {isOptimizedView && <span className="text-xs text-green-600 ml-1">(Major only)</span>}
          </h3>

          <div className="space-y-2 mb-6">
            {Object.entries(communityStats).length > 0 ? (
              Object.entries(communityStats)
                .sort((a, b) => b[1].count - a[1].count) // Sort by size, largest first
                .slice(0, 20)
                .map(([communityId, stats]) => (
                  <div
                    key={communityId}
                    className={`flex items-center p-3 rounded cursor-pointer transition-colors ${
                      selectedCommunity === Number.parseInt(communityId)
                        ? "bg-primary/20 border border-primary/50"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleCommunitySelect(Number.parseInt(communityId))}
                  >
                    <div
                      className="w-4 h-4 rounded-full mr-3 border border-white/20"
                      style={{ backgroundColor: stats.color }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{stats.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{stats.count} nodes</span>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No communities to display</p>
              </div>
            )}
            {Object.entries(communityStats).length > 20 && (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">
                  Showing top 20 of {Object.entries(communityStats).length} communities
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={resetSelection}
              className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
            >
              Reset Selection
            </button>

            <button
              onClick={fitToView}
              className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
            >
              Fit to View
            </button>

            <button
              onClick={centerView}
              className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
            >
              Center View
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="font-medium mb-2 text-sm">
              {isOptimizedView ? "Optimization Criteria" : "Filter Thresholds"}
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Min community size: 10</div>
              <div>Large community: ≥50 nodes</div>
              <div>Well connected: ≥5 avg connections</div>
              {isOptimizedView && <div className="text-green-600 mt-2">✓ Pre-filtered server-side</div>}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="font-medium mb-2 text-sm">Controls</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Zoom: 0.01x to 10x range</div>
              <div>• Mouse wheel to zoom</div>
              <div>• Click & drag to pan</div>
              <div>• Use +/- buttons for precise zoom</div>
              <div>• Reset button returns to 100%</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="font-medium mb-2 text-sm">Legend</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Node size = Asset count/importance</div>
              <div>• Node color = Community</div>
              <div>• Line thickness = Connection strength</div>
              <div>• Dashed lines = Cross-contract connections</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
