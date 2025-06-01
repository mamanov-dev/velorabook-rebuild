// src/app/types/next-auth.d.ts (обновленная версия)
import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isVerified?: boolean // ← Добавляем поле верификации
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
    name: string
    email: string
    image?: string
    isVerified?: boolean // ← Добавляем поле верификации
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    isVerified?: boolean // ← Добавляем поле верификации
  }
}