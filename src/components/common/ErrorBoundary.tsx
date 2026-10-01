import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('EntomoLens error boundary caught:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-24 text-center">
          <h1 className="font-serif text-4xl font-semibold text-forest-900">Something went wrong</h1>
          <p className="mt-3 max-w-md text-ink-400">
            An unexpected error occurred while rendering the app. Please reload the page.
          </p>
          <Button className="mt-8" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}