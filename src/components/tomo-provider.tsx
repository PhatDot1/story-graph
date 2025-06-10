"use client"

import type React from "react"

import { useEffect, useState } from "react"

interface TomoProviderProps {
  children: React.ReactNode
}

export function TomoProvider({ children }: TomoProviderProps) {
  const [isClient, setIsClient] = useState(false)
  const [isTomoLoaded, setIsTomoLoaded] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Load Tomo SDK
    const loadTomo = async () => {
      try {
        // Check if we're in the browser
        if (typeof window === "undefined") return

        // Try to load Tomo SDK
        const tomoModule = await import("@tomo-inc/tomo-web-sdk")
        console.log("Tomo SDK loaded successfully:", tomoModule)
        setIsTomoLoaded(true)
      } catch (error) {
        console.error("Failed to load Tomo SDK:", error)
        // Continue without Tomo SDK
        setIsTomoLoaded(false)
      }
    }

    loadTomo()
  }, [])

  // Always render children, even if Tomo fails to load
  if (!isClient) {
    return <>{children}</>
  }

  return <>{children}</>
}
