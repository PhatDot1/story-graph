"use client"

import React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import dynamic from "next/dynamic"

// Define the props type for the dynamic component
interface CytoscapeComponentProps {
  elements: any[]
  style?: React.CSSProperties
  stylesheet?: any[]
  layout?: any
  cy?: (cy: any) => void
  [key: string]: any
}

// Dynamically import Cytoscape to avoid SSR issues
const CytoscapeComponent = dynamic<CytoscapeComponentProps>(
  () => import("react-cytoscapejs").then((mod) => mod.default),
  { ssr: false },
)

interface CommunityVisualizationProps {
  communityData: {
    nodes: Array<{
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
    }>
    edges: Array<{
      id: string
      source: string
      target: string
      weight: number
      connectionCount: number
      type: string
    }>
    stats: any
  }
}

export function CommunityVisualization({ communityData }: CommunityVisualizationProps) {
  const cyRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null)
  const [layoutName, setLayoutName] = useState<string>("cose")
  const [isLayoutRunning, setIsLayoutRunning] = useState(false)
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
    return communityData.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
  }, [communityData.edges, filteredNodes])

  // Set isClient to true once component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle community selection
  const handleCommunitySelect = useCallback(
    (event: any) => {
      const node = event.target
      const nodeId = node.data("id")

      setSelectedCommunity((prevSelected) => (prevSelected === nodeId ? null : nodeId))

      if (cyRef.current) {
        const cy = cyRef.current

        // Reset all elements
        cy.elements().removeClass("faded highlighted selected")

        if (selectedCommunity !== nodeId) {
          // Highlight selected community and its connections
          cy.elements().addClass("faded")

          const selectedNode = cy.getElementById(nodeId)
          selectedNode.removeClass("faded").addClass("selected")

          // Highlight connected communities and edges
          const connectedEdges = selectedNode.connectedEdges()
          const connectedNodes = connectedEdges.connectedNodes()

          connectedEdges.removeClass("faded").addClass("highlighted")
          connectedNodes.removeClass("faded").addClass("highlighted")
        }
      }
    },
    [selectedCommunity],
  )

  // Reset selection
  const resetSelection = useCallback(() => {
    setSelectedCommunity(null)
    if (cyRef.current) {
      cyRef.current.elements().removeClass("faded highlighted selected")
    }
  }, [])

  // Run layout
  const runLayout = useCallback(
    (layoutType: string) => {
      if (cyRef.current && !isLayoutRunning) {
        setIsLayoutRunning(true)
        setLayoutName(layoutType)

        const layout = cyRef.current.layout({
          name: layoutType,
          ...getLayoutOptions(layoutType),
        })

        layout.run()
        layout.on("layoutstop", () => {
          setIsLayoutRunning(false)
        })
      }
    },
    [isLayoutRunning],
  )

  // Get layout options
  const getLayoutOptions = (layoutType: string) => {
    switch (layoutType) {
      case "cose":
        return {
          idealEdgeLength: 150,
          nodeOverlap: 40,
          refresh: 20,
          fit: true,
          padding: 50,
          randomize: false,
          componentSpacing: 150,
          nodeRepulsion: 800000,
          edgeElasticity: 200,
          nestingFactor: 5,
          gravity: 100,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
        }
      case "circle":
        return {
          fit: true,
          padding: 50,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
          startAngle: (3 / 2) * Math.PI,
          clockwise: true,
        }
      case "grid":
        return {
          fit: true,
          padding: 50,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
        }
      case "concentric":
        return {
          fit: true,
          padding: 50,
          concentric: (node: any) => node.data("assetCount"),
          levelWidth: () => 2,
        }
      default:
        return {}
    }
  }

  // Enhanced Cytoscape stylesheet for community blobs
  const cytoscapeStylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "data(color)",
        "background-opacity": "data(brightness)",
        label: "data(label)",
        width: "data(size)",
        height: "data(size)",
        "font-size": "14px",
        "font-weight": "bold",
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "wrap",
        "text-max-width": "120px",
        "text-background-color": "#000",
        "text-background-opacity": 0.8,
        "text-background-padding": "4px",
        "text-background-shape": "roundrectangle",
        "border-width": 3,
        "border-color": "#fff",
        "border-opacity": 0.9,
        "overlay-padding": "8px",
        "z-index": 10,
        "shadow-blur": 20,
        "shadow-color": "data(color)",
        "shadow-opacity": 0.3,
        "shadow-offset-x": 0,
        "shadow-offset-y": 0,
      },
    },
    {
      selector: "edge",
      style: {
        width: "data(weight)",
        "line-color": "#666",
        "target-arrow-color": "#666",
        "target-arrow-shape": "triangle",
        "target-arrow-size": "10px",
        "curve-style": "bezier",
        "arrow-scale": 1.5,
        opacity: 0.7,
        "line-style": "solid",
      },
    },
    {
      selector: ".faded",
      style: {
        opacity: 0.2,
        "shadow-opacity": 0.1,
      },
    },
    {
      selector: ".highlighted",
      style: {
        opacity: 1,
        "z-index": 999,
        "shadow-blur": 30,
        "shadow-opacity": 0.6,
      },
    },
    {
      selector: ".selected",
      style: {
        opacity: 1,
        "z-index": 1000,
        "border-width": 5,
        "border-color": "#ff6b6b",
        "border-opacity": 1,
        "shadow-blur": 40,
        "shadow-opacity": 0.8,
        "shadow-color": "#ff6b6b",
      },
    },
    {
      selector: "edge.highlighted",
      style: {
        "line-color": "#ff6b6b",
        "target-arrow-color": "#ff6b6b",
        width: "mapData(weight, 0, 10, 4, 12)",
        opacity: 1,
        "z-index": 999,
      },
    },
  ]

  // Prepare elements for Cytoscape
  const elements = React.useMemo(() => {
    return [
      ...filteredNodes.map((node) => ({
        data: { ...node },
      })),
      ...filteredEdges.map((edge) => ({
        data: { ...edge },
      })),
    ]
  }, [filteredNodes, filteredEdges])

  // Get selected community data
  const selectedCommunityData = selectedCommunity ? filteredNodes.find((node) => node.id === selectedCommunity) : null

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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Layout:</span>
            <select
              value={layoutName}
              onChange={(e) => runLayout(e.target.value)}
              disabled={isLayoutRunning}
              className="bg-input border border-border rounded px-2 py-1 text-sm"
            >
              <option value="cose">Force-directed</option>
              <option value="concentric">Concentric (by size)</option>
              <option value="circle">Circle</option>
              <option value="grid">Grid</option>
            </select>
            {isLayoutRunning && <span className="text-xs text-muted-foreground">Running...</span>}
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

      <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[600px]">
        {/* Network Visualization */}
        <div className="w-full lg:w-3/4 h-full bg-card rounded-lg border overflow-hidden">
          {isClient && elements.length > 0 ? (
            <CytoscapeComponent
              elements={elements}
              style={{ width: "100%", height: "600%" }}
              stylesheet={cytoscapeStylesheet}
              layout={{
                name: layoutName,
                ...getLayoutOptions(layoutName),
              }}
              cy={(cy: any) => {
                cyRef.current = cy

                // Add event listeners
                cy.on("tap", "node", (event: any) => handleCommunitySelect(event))
                cy.on("tap", (event: any) => {
                  if (event.target === cy) {
                    resetSelection()
                  }
                })

                // Enable panning and zooming
                cy.userPanningEnabled(true)
                cy.userZoomingEnabled(true)
                cy.boxSelectionEnabled(false)

                // Set zoom limits
                cy.minZoom(0.1)
                cy.maxZoom(3)
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                {!isClient ? (
                  <>
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Initializing visualization...</p>
                  </>
                ) : elements.length === 0 ? (
                  <>
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-muted-foreground mb-2">No communities to display</p>
                    <p className="text-xs text-muted-foreground">Try unchecking "Show only connected communities"</p>
                  </>
                ) : (
                  <>
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading visualization...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-1/4 bg-card p-4 rounded-lg border overflow-y-auto">
          {selectedCommunityData ? (
            <div>
              <h3 className="font-semibold mb-4">Community Details</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Name</h4>
                  <p className="font-semibold">{selectedCommunityData.label}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Assets</h4>
                  <p className="text-2xl font-bold text-primary">{selectedCommunityData.assetCount.toLocaleString()}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Internal Connections</h4>
                  <p className="font-semibold">{selectedCommunityData.avgConnections.toFixed(2)} avg per asset</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Contract Address</h4>
                  <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                    {selectedCommunityData.tokenContract}
                  </p>
                </div>

                {selectedCommunityData.topAssets.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Top Assets</h4>
                    <div className="space-y-2">
                      {selectedCommunityData.topAssets.slice(0, 3).map((asset, index) => (
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
                      onClick={() => {
                        if (cyRef.current) {
                          const cy = cyRef.current
                          const node = cy.getElementById(community.id)
                          cy.center(node)
                          cy.zoom(1.5)

                          // Simulate click
                          handleCommunitySelect({ target: node })
                        }
                      }}
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

          <div className="space-y-3 mt-6">
            <button
              onClick={resetSelection}
              className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
            >
              Reset Selection
            </button>

            <button
              onClick={() => cyRef.current?.fit()}
              className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
            >
              Fit to View
            </button>

            <button
              onClick={() => cyRef.current?.center()}
              className="w-full py-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors"
            >
              Center View
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="font-medium mb-2 text-sm">Legend</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Blob size = Number of assets</div>
              <div>• Blob brightness = Relative size</div>
              <div>• Line thickness = Connection strength</div>
              <div>• Click blobs to explore details</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
