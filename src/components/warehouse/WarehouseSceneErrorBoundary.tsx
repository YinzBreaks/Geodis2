"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback: ReactNode
}

interface State {
  hasError: boolean
}

/** Keep the Simulator usable when a WebGL/dynamic 3D scene fails at runtime. */
export class WarehouseSceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Warehouse 3D scene failed", error, info.componentStack)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
