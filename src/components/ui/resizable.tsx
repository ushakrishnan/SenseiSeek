"use client"

import * as React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

// Some react-resizable-panels primitives don't expose ideal TS typings for `ref` in JSX
// contexts; cast to 'any' helpers so we can forward refs without TypeScript errors.
// We make a deliberate, localized exception for `any` here because the upstream
// library does not export a convenient ref handle type. Keep the cast minimal.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PanelGroupAny: any = ResizablePrimitive.PanelGroup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PanelResizeHandleAny: any = ResizablePrimitive.PanelResizeHandle

const ResizablePanelGroup = React.forwardRef<any, React.ComponentProps<typeof ResizablePrimitive.PanelGroup>>(({ className, ...props }, ref) => (
  <PanelGroupAny
    ref={ref as any}
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
))
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = React.forwardRef<any, React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & { withHandle?: boolean }>(( { withHandle, className, ...props }, ref) => (
  <PanelResizeHandleAny
    ref={ref as any}
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </PanelResizeHandleAny>
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
