import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9f8]">
        <p className="text-[#64748b]">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
