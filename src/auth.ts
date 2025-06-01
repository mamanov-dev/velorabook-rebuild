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
              isVerified: true, // ← Демо пользователь всегда верифицирован
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
              isVerified: true, // ← Добавляем поле верификации
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

          console.log('✅ User authenticated:', user.email, 'Verified:', user.isVerified)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? undefined,
            isVerified: user.isVerified, // ← Передаем статус верификации
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
        token.isVerified = user.isVerified // ← Добавляем в JWT
      }
      if (trigger === 'update' && session) {
        token.name = session.user.name
        token.image = session.user.image
        token.isVerified = session.user.isVerified // ← Обновляем при изменении
      }
      return token
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string | undefined
        session.user.isVerified = token.isVerified as boolean // ← Добавляем в сессию
      }
      return session
    },

    async signIn({ user, account, profile }) {
      if (env.NODE_ENV === 'development') {
        console.log('🔐 Sign in attempt:', {
          provider: account?.provider,
          email: user.email,
          userId: user.id,
          isVerified: user.isVerified, // ← Логируем статус верификации
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
          isVerified: user.isVerified,
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

// ✨ Расширенный сервис пользователей с поддержкой верификации
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
          isVerified: false, // ← Важно: создаем как неверифицированного
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          isVerified: true,
        },
      })

      console.log('✅ New user created (unverified):', user.email)
      return user
    } catch (error) {
      console.error('❌ User creation error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to create user')
    }
  },

  // ✨ Новый метод: получение пользователя по email
  async getUserByEmail(email: string) {
    if (!serviceAvailability.database) {
      return null
    }

    try {
      const { prisma } = await import('@/lib/prisma')
      
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          emailVerified: true,
          createdAt: true,
        },
      })
    } catch (error) {
      console.error('❌ Get user error:', error)
      return null
    }
  },

  // ✨ Новый метод: верификация пользователя
  async verifyUser(email: string) {
    if (!serviceAvailability.database) {
      throw new Error('Database not available')
    }

    try {
      const { prisma } = await import('@/lib/prisma')
      
      const updatedUser = await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          isVerified: true,
          emailVerified: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true,
          emailVerified: true,
        },
      })

      console.log('✅ User verified:', updatedUser.email)
      return updatedUser
    } catch (error) {
      console.error('❌ User verification error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to verify user')
    }
  },

  // ✨ Новый метод: проверка статуса верификации
  async checkVerificationStatus(email: string) {
    if (!serviceAvailability.database) {
      return { exists: false, isVerified: false }
    }

    try {
      const { prisma } = await import('@/lib/prisma')
      
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          isVerified: true,
        },
      })

      return {
        exists: !!user,
        isVerified: user?.isVerified ?? false,
      }
    } catch (error) {
      console.error('❌ Check verification status error:', error)
      return { exists: false, isVerified: false }
    }
  }
}

// ✨ Новая функция: обновление сессии после верификации
export async function updateUserSession(userId: string) {
  if (!serviceAvailability.database) {
    return null
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isVerified: true,
      }
    })

    return user
  } catch (error) {
    console.error('❌ Update user session error:', error)
    return null
  }
}

// ✨ Новая функция: получение статистики пользователей
export async function getUserStats() {
  if (!serviceAvailability.database) {
    return {
      total: 0,
      verified: 0,
      unverified: 0,
      verificationRate: 0,
    }
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    
    const [total, verified] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
    ])

    const unverified = total - verified
    const verificationRate = total > 0 ? Math.round((verified / total) * 100) : 0

    return {
      total,
      verified,
      unverified,
      verificationRate,
    }
  } catch (error) {
    console.error('❌ Get user stats error:', error)
    return {
      total: 0,
      verified: 0,
      unverified: 0,
      verificationRate: 0,
    }
  }
}