import type React from "react"
declare module "react-cytoscapejs" {
  import { Component } from "react"

  interface CytoscapeComponentProps {
    elements: any[]
    style?: React.CSSProperties
    stylesheet?: any[]
    layout?: any
    cy?: (cy: any) => void
    [key: string]: any
  }

  export default class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
}

declare module "cytoscape-cola" {
  const cola: any
  export = cola
}

declare module "cytoscape-dagre" {
  const dagre: any
  export = dagre
}
