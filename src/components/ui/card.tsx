import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "group relative overflow-hidden rounded-xl bg-white border-2 border-blue-100 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-blue-200 hover:-translate-y-1",
      "before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-blue-500 before:via-yellow-400 before:to-blue-600",
      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-blue-200 after:to-transparent",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex flex-col space-y-3 p-6 pb-4 bg-gradient-to-r from-blue-50/50 to-yellow-50/30",
      "after:absolute after:bottom-0 after:left-6 after:right-6 after:h-px after:bg-gradient-to-r after:from-blue-200 after:via-yellow-300 after:to-blue-200",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-bold text-blue-900 leading-tight tracking-tight transition-colors duration-300 group-hover:text-blue-800",
      "drop-shadow-sm relative",
      "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-yellow-400 after:to-yellow-500 after:transition-all after:duration-500 group-hover:after:w-full",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-slate-600 leading-relaxed font-medium transition-colors duration-300 group-hover:text-slate-700",
      className
    )}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "px-6 py-4 text-slate-700 bg-white transition-colors duration-300 group-hover:text-slate-800", 
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50/30 to-yellow-50/20 border-t border-blue-100",
      "before:absolute before:top-0 before:left-6 before:right-6 before:h-px before:bg-gradient-to-r before:from-yellow-300 before:via-blue-300 before:to-yellow-300",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }