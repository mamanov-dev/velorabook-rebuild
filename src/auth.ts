import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { env, serviceAvailability } from '@/lib/env'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 часа
  },
  
  providers: [
    ...(serviceAvailability.googleAuth ? [
      Google({
        clientId: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
      })
    ] : []),
    
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        try {
          const rawEmail = raw?.email
          const rawPassword = raw?.password

          // Демо пользователь для build time и fallback
          if (rawEmail === 'demo@velorabook.com' && rawPassword === 'demo123') {
            return {
              id: 'demo-user-id',
              email: 'demo@velorabook.com',
              name: 'Demo User',
              image: undefined,
            }
          }

          if (!serviceAvailability.database) {
            console.warn('⚠️ Database not available, only demo user allowed')
            return null
          }

          if (!rawEmail || !rawPassword || typeof rawEmail !== 'string' || typeof rawPassword !== 'string') {
            console.error('❌ Missing or invalid credentials')
            return null
          }

          const [{ prisma }, { UserLoginSchema }] = await Promise.all([
            import('@/lib/prisma'),
            import('@/lib/validation')
          ])

          const validatedFields = UserLoginSchema.safeParse({
            email: rawEmail,
            password: rawPassword,
          })

          if (!validatedFields.success) {
            console.error('❌ Invalid credentials format:', validatedFields.error.errors)
            return null
          }

          const { email, password } = validatedFields.data

          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              password: true,
              isVerified: true,
            }
          })

          if (!user || !user.password) {
            console.error('❌ User not found or no password set')
            return null
          }

          const isValid = await Promise.race([
            bcrypt.compare(password, user.password),
            new Promise<boolean>((_, reject) =>
              setTimeout(() => reject(new Error('bcrypt timeout')), 5000)
            )
          ])

          if (!isValid) {
            console.error('❌ Invalid password')
            return null
          }

          console.log('✅ User authenticated:', user.email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? undefined,
          }
        } catch (error) {
          console.error('❌ Auth error:', error)
          return null
        }
      },
    })
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  callbacks: {
    async jwt({ user, token, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      if (trigger === 'update' && session) {
        token.name = session.user.name
        token.image = session.user.image
      }
      return token
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string | undefined
      }
      return session
    },

    async signIn({ user, account, profile }) {
      if (env.NODE_ENV === 'development') {
        console.log('🔐 Sign in attempt:', {
          provider: account?.provider,
          email: user.email,
          userId: user.id,
        })
      }
      return true
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      if (env.NODE_ENV === 'development') {
        console.log('✅ User signed in:', {
          email: user.email,
          provider: account?.provider,
          isNewUser,
        })
      }
    },
  },

  secret: env.NEXTAUTH_SECRET,
  useSecureCookies: env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
      },
    },
  },
})

// Простой сервис пользователей для этапа 1
export const userService = {
  async createUser(userData: { name: string; email: string; password: string }) {
    if (!serviceAvailability.database) {
      throw new Error('Database not available. Registration temporarily disabled.')
    }

    try {
      const { prisma } = await import('@/lib/prisma')
      
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      })

      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12)

      const user = await prisma.user.create({
        data: {
          name: userData.name.trim(),
          email: userData.email.toLowerCase().trim(),
          password: hashedPassword,
          isVerified: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          isVerified: true,
        },
      })

      console.log('✅ New user created:', user.email)
      return user
    } catch (error) {
      console.error('❌ User creation error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to create user')
    }
  },
}