// This file is used to initialize Cytoscape extensions
// It's imported in the network page to ensure extensions are loaded

export function initCytoscape() {
    if (typeof window !== "undefined") {
      // For now, we'll just use the built-in layouts
      // Cola and Dagre layouts can be added later if needed
      console.log("Cytoscape initialized with built-in layouts")
    }
  }
  