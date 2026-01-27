import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function LoginCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')

    if (token) {
      // 保存 token
      localStorage.setItem('admin_token', token)
      // 跳转到首页
      navigate('/dashboard')
    } else {
      // 没有 token，跳转到登录页
      navigate('/login?error=' + encodeURIComponent('登录失败，请重试'))
    }
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">正在登录...</p>
      </div>
    </div>
  )
}
