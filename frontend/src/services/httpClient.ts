import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

class HttpClient {
  private instance: AxiosInstance

  constructor(baseURL: string = '/api') {
    this.instance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor for adding auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for handling errors
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token')
          window.location.href = '/login'
        }

        // Extract error message from response
        const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.message || 
                           error.message || 
                           '發生未知錯誤'

        return Promise.reject(new Error(errorMessage))
      }
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config)
    return response.data
  }

  // Method to update base URL if needed
  setBaseURL(baseURL: string) {
    this.instance.defaults.baseURL = baseURL
  }

  // Method to set default headers
  setDefaultHeader(key: string, value: string) {
    this.instance.defaults.headers.common[key] = value
  }

  // Method to remove default header
  removeDefaultHeader(key: string) {
    delete this.instance.defaults.headers.common[key]
  }
}

export const httpClient = new HttpClient()
export default httpClient