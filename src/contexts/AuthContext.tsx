import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, signIn as firebaseSignIn, signUp as firebaseSignUp, signOut as firebaseSignOut, signInAnonymousUser, linkAnonymousAccount } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAnonymous: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInAnonymously: () => Promise<void>
  linkAccount: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        setLoading(false)
      } else {
        // Auto sign in anonymously if no user
        try {
          await signInAnonymousUser()
          // onAuthStateChanged will fire again with the anonymous user
        } catch (error) {
          console.error('Failed to sign in anonymously:', error)
          setLoading(false)
        }
      }
    })

    return unsubscribe
  }, [])

  const isAnonymous = user?.isAnonymous ?? false

  const signIn = async (email: string, password: string) => {
    await firebaseSignIn(email, password)
  }

  const signUp = async (email: string, password: string) => {
    await firebaseSignUp(email, password)
  }

  const signOut = async () => {
    await firebaseSignOut()
  }

  const signInAnonymously = async () => {
    await signInAnonymousUser()
  }

  const linkAccount = async (email: string, password: string) => {
    await linkAnonymousAccount(email, password)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAnonymous, signIn, signUp, signOut, signInAnonymously, linkAccount }}>
      {children}
    </AuthContext.Provider>
  )
}
