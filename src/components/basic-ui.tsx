export function Button({
    children,
    onClick,
    className = "",
    variant = "default",
    size = "md",
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    className?: string
    variant?: "default" | "outline"
    size?: "sm" | "md" | "lg"
  }) {
    const variantClass =
      variant === "outline"
        ? "border border-gray-300 bg-white text-gray-900"
        : "bg-blue-600 text-white"
  
    const sizeClass =
      size === "sm"
        ? "text-sm px-2 py-1"
        : size === "lg"
        ? "text-lg px-4 py-2"
        : "text-base px-3 py-1.5"
  
    return (
      <button
        onClick={onClick}
        className={`rounded transition ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
  
  
  export function Card({ children, className = "" }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`border rounded-lg p-4 shadow-sm bg-white ${className}`}>{children}</div>
  }
  
  export function CardHeader({ children }: { children: React.ReactNode }) {
    return <div className="mb-2 border-b pb-2">{children}</div>
  }
  
  export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <h3 className={`font-semibold text-lg ${className}`}>{children}</h3>
  }
  
  export function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={className}>{children}</div>
  }
  
  export function Badge({
    children,
    variant = "default",
    className = "",
  }: { children: React.ReactNode; variant?: "default" | "outline" | "secondary"; className?: string }) {
    const variantClass =
      variant === "outline"
        ? "border border-gray-300"
        : variant === "secondary"
        ? "bg-gray-100 text-gray-700"
        : "bg-blue-500 text-white"
  
    return <span className={`inline-block px-2 py-1 text-xs rounded ${variantClass} ${className}`}>{children}</span>
  }
  