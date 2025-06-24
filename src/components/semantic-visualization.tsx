"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { similarityToDistance } from "@/lib/similarity"
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/basic-ui"
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react"

interface SemanticNode extends d3.SimulationNodeDatum {
    id: string
    label: string
    description: string
    imageUrl?: string
}

interface SemanticLink extends d3.SimulationLinkDatum<SemanticNode> {
  similarity: number
}

export function SemanticVisualization() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })
  const [selectedNode, setSelectedNode] = useState<SemanticNode | null>(null)
  
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7)
  const [maxNodes, setMaxNodes] = useState(500)
  
  const [nodes, setNodes] = useState<SemanticNode[]>([])
  const [links, setLinks] = useState<SemanticLink[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGraphData() {
      setIsLoading(true)
      setError(null)
      const url = `/api/graph-data?limit=${maxNodes}&threshold=${similarityThreshold}`
      
      try {
        const response = await fetch(url)
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || `API Error: ${response.status}`)
        }
        const graphData = await response.json()
        
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const updatedNodes = graphData.nodes.map((n: SemanticNode) => ({
            ...nodeMap.get(n.id),
            ...n
        }));

        setNodes(updatedNodes);
        setLinks(graphData.links)
      } catch (e) {
        setError((e as Error).message)
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchGraphData()
  }, [maxNodes, similarityThreshold])

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

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) {
        d3.select(svgRef.current).selectAll("*").remove();
        return
    }

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const { width, height } = dimensions

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 8]).on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom as any);
    const container = svg.append("g");
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => similarityToDistance(d.similarity) * 250)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25))

    const linkElements = container
      .append("g")
      .attr("stroke", "#999")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-opacity", (d: any) => d.similarity * 0.7)
      .attr("stroke-width", (d: any) => d.similarity * 2);

    const nodeElements = container
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", (d: any, i) => colorScale(String(i % 10)))
      .style("cursor", "pointer")
      
    const labels = container.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .text((d: any) => d.label)
        .attr("text-anchor", "middle")
        .attr("dy", -12)
        .style("font-size", "10px")
        .style("fill", "#fff")
        .style("pointer-events", "none")
        .style("text-shadow", "0 0 3px #000, 0 0 3px #000");

    const drag = d3.drag<any, SemanticNode>()
        .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; });
    
    nodeElements.call(drag as any);

    nodeElements.on("click", (event, d) => {
        setSelectedNode(d);
        const connectedNodeIds = new Set<string>();
        links.forEach(link => {
            const sourceId = (link.source as SemanticNode).id;
            const targetId = (link.target as SemanticNode).id;
            if (sourceId === d.id) connectedNodeIds.add(targetId);
            if (targetId === d.id) connectedNodeIds.add(sourceId);
        });

        nodeElements.attr("opacity", n => (n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.2)).attr("r", n => n.id === d.id ? 12 : 8);
        linkElements.attr("stroke-opacity", l => ((l.source as SemanticNode).id === d.id || (l.target as SemanticNode).id === d.id) ? 0.9 : 0.1);
        labels.attr("opacity", n => (n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.2));
    });
    
    simulation.on("tick", () => {
      linkElements.attr("x1", d => (d.source as any).x).attr("y1", d => (d.source as any).y).attr("x2", d => (d.target as any).x).attr("y2", d => (d.target as any).y);
      nodeElements.attr("cx", d => d.x!).attr("cy", d => d.y!);
      labels.attr("x", d => d.x!).attr("y", d => d.y!);
    });

    ;(svg.node() as any)._controls = {
      resetView: () => {
          svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
          setSelectedNode(null);
          nodeElements.attr("opacity", 1).attr("r", 8);
          linkElements.attr("stroke-opacity", (d: any) => d.similarity * 0.7);
          labels.attr("opacity", 1);
      },
      zoomIn: () => svg.transition().duration(300).call(zoom.scaleBy, 1.5),
      zoomOut: () => svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.5),
    };

    // --- FIX IS HERE ---
    // The cleanup function must return void.
    // By adding curly braces, we prevent it from returning the result of simulation.stop()
    return () => {
      simulation.stop();
    };
    // --- END FIX ---

  }, [nodes, links, dimensions]);

  const handleControlClick = (action: string) => {
    const controls = (svgRef.current as any)?._controls
    if (controls && controls[action]) {
      controls[action]()
    }
  };

  return (
    // The JSX from your file - no changes needed here
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleControlClick("zoomIn")}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => handleControlClick("zoomOut")}><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => handleControlClick("resetView")}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Max Nodes:</label>
            <select value={maxNodes} onChange={(e) => setMaxNodes(Number(e.target.value))} className="border rounded px-2 py-1 text-sm bg-background" disabled={isLoading}>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Similarity:</label>
            <input type="range" min="0.6" max="0.95" step="0.01" value={similarityThreshold} onChange={(e) => setSimilarityThreshold(Number.parseFloat(e.target.value))} className="w-32" disabled={isLoading} />
            <Badge variant="secondary">{similarityThreshold.toFixed(2)}</Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1 border rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 relative" style={{ minHeight: '600px' }}>
          {(isLoading || (nodes.length === 0 && !error)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-white/80">{isLoading ? "Processing on server..." : "No data"}</p>
              </div>
            </div>
          )}
          {error && !isLoading && (
             <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 z-10"><div className="text-center p-4"><p className="text-lg font-semibold text-white">Failed to load visualization</p><p className="text-sm text-red-200 mt-1">{error}</p></div></div>
          )}
          <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />
        </div>
        {selectedNode && (
          <Card className="w-80 flex-shrink-0">
            <CardHeader><CardTitle className="text-lg">{selectedNode.label}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedNode.imageUrl && <img src={selectedNode.imageUrl} alt={selectedNode.label} className="rounded-md border w-full h-auto mb-3" />}
                <div><p className="text-sm font-medium text-muted-foreground">ID</p><p className="text-xs font-mono break-all">{selectedNode.id}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Description</p><p className="text-sm">{selectedNode.description}</p></div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}