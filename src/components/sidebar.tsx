"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { WalletConnect } from "./wallet-connect"

export function Sidebar() {
  const pathname = usePathname()

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/network", label: "Network View" },
    { href: "/semantic-view", label: "Semantic View" },
    { href: "/semantic-search", label: "Semantic Search (Demo)" },
    { href: "/my-assets", label: "My Assets" },
    { href: "/debug", label: "Debug" },
  ]

  return (
    <div className="w-64 sidebar p-6 flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          IP Radar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">IP Asset Management</p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block px-4 py-3 rounded-lg transition-all duration-200 sidebar-link ${
                  pathname === link.href ? "active" : ""
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto pt-8 space-y-4">
        <WalletConnect />
        <div className="glass-effect rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Powered by Story Protocol</p>
        </div>
      </div>
    </div>
  )
}
