// src/lib/env.ts (исправленная версия)
import { z } from 'zod'

const envSchema = z.object({
  // Базовые переменные Next.js
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL').optional(),
  
  // База данных
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for book generation'),
  
  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required for email verification').optional(),
  
  // Redis (опционально)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // Upstash Redis для продакшена (опционально)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Google OAuth (опционально)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
})

// Функция валидации с подробными ошибками
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Ошибки в переменных окружения:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      
      // В development показываем помощь
      if (process.env.NODE_ENV === 'development') {
        console.error('\n📝 Создайте файл .env.local с требуемыми переменными:')
        console.error('NEXTAUTH_SECRET=your-secret-here')
        console.error('DATABASE_URL=postgresql://...')
        console.error('OPENAI_API_KEY=sk-proj-...')
        console.error('RESEND_API_KEY=re_...')
        console.error('REDIS_HOST=localhost')
        console.error('REDIS_PORT=6379')
      }
      
      // В production не останавливаем приложение, используем заглушки
      if (process.env.NODE_ENV === 'production') {
        return {
          NODE_ENV: 'production' as const,
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret',
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
          DATABASE_URL: process.env.DATABASE_URL || 'placeholder',
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
          RESEND_API_KEY: process.env.RESEND_API_KEY,
          REDIS_HOST: process.env.REDIS_HOST || 'localhost',
          REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
          REDIS_PASSWORD: process.env.REDIS_PASSWORD,
          UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        }
      }
      
      throw new Error('Invalid environment variables')
    }
    throw error
  }
}

// Экспортируем валидированные переменные
export const env = validateEnv()

// ✅ ИСПРАВЛЕНО: Проверяем доступность критических сервисов (добавлено поле email)
export const serviceAvailability = {
  database: !!env.DATABASE_URL && !env.DATABASE_URL.includes('placeholder'),
  openai: !!env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('sk-'),
  email: !!env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith('re_'), // ← Добавлено поле email
  redis: true, // Redis опционален, есть fallback
  googleAuth: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
}

// Логируем статус сервисов (только в development)
if (env.NODE_ENV === 'development') {
  console.log('🔧 Статус сервисов:')
  console.log(`  Database: ${serviceAvailability.database ? '✅' : '❌'}`)
  console.log(`  OpenAI: ${serviceAvailability.openai ? '✅' : '❌'}`)
  console.log(`  Email (Resend): ${serviceAvailability.email ? '✅' : '❌'}`) // ← Обновлено логирование
  console.log(`  Redis: ${serviceAvailability.redis ? '✅' : '❌'}`)
  console.log(`  Google Auth: ${serviceAvailability.googleAuth ? '✅' : '❌'}`)
  
  if (!serviceAvailability.email) {
    console.log('⚠️  Email verification будет недоступна без RESEND_API_KEY')
  }
}

// Пример файла .env.local
/* 
# Обязательные переменные
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://username:password@localhost:5432/velorabook_dev"
OPENAI_API_KEY="sk-proj-your-openai-key"

# Email верификация (Resend)
RESEND_API_KEY="re_your-resend-api-key"

# Redis (локальный)
REDIS_HOST="localhost"
REDIS_PORT="6379"
# REDIS_PASSWORD="password-if-needed"

# Или Upstash Redis (продакшен)
# UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your-token"

# Google OAuth (опционально)
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"
*/