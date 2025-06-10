declare module "react-cytoscapejs" {
    interface CytoscapeComponentProps {
      elements: any[]
      style?: React.CSSProperties
      stylesheet?: any[]
      layout?: any
      cy?: (cy: any) => void
      [key: string]: any
    }
  
    const CytoscapeComponent: React.ComponentType<CytoscapeComponentProps>
    export default CytoscapeComponent
  }
  
  declare module "cytoscape-cola" {
    const cola: any
    export = cola
  }
  
  declare module "cytoscape-dagre" {
    const dagre: any
    export = dagre
  }
  