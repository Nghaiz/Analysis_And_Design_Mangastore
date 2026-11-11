import { Component, type ErrorInfo, type ReactNode } from 'react'

interface SceneBoundaryProps {
  children: ReactNode
  /** Cảnh 3D hỏng (chunk không tải được, shader lỗi...): island quay về ảnh tĩnh. */
  onError: () => void
}

interface SceneBoundaryState {
  failed: boolean
}

/** Chặn lỗi của cảnh 3D để ảnh tĩnh và link đăng nhập vẫn dùng được; báo đúng một lần ra console. */
export class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  state: SceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ShelfScene] The 3D shelf failed; keeping the static image.', error, info.componentStack)
    this.props.onError()
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}
