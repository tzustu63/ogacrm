import { toast } from 'react-hot-toast'

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): void {
    console.error('Error occurred:', error, context ? `Context: ${context}` : '')

    let message = '發生未知錯誤'

    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = (error as any).message
    }

    // Show user-friendly error message
    toast.error(message)
  }

  static handleValidationErrors(errors: Record<string, string>): void {
    Object.values(errors).forEach(error => {
      toast.error(error)
    })
  }

  static handleNetworkError(): void {
    toast.error('網路連線錯誤，請檢查您的網路連線')
  }

  static handleAuthError(): void {
    toast.error('認證失敗，請重新登入')
    // Redirect to login will be handled by the HTTP client interceptor
  }

  static handlePermissionError(): void {
    toast.error('您沒有執行此操作的權限')
  }

  static handleNotFoundError(resource?: string): void {
    const message = resource ? `找不到${resource}` : '找不到請求的資源'
    toast.error(message)
  }

  static handleServerError(): void {
    toast.error('伺服器錯誤，請稍後再試')
  }

  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    } else if (typeof error === 'string') {
      return error
    } else if (error && typeof error === 'object' && 'message' in error) {
      return (error as any).message
    }
    return '發生未知錯誤'
  }
}