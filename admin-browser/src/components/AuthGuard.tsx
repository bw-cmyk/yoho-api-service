import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface AuthGuardProps {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation()
  const token = localStorage.getItem('admin_token')

  if (!token) {
    // 未登录，重定向到登录页
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
