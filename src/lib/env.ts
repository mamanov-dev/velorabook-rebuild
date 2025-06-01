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
      }
      
      // В production не останавливаем приложение, используем заглушки
      if (process.env.NODE_ENV === 'production') {
        return {
          NODE_ENV: 'production' as const,
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret',
          DATABASE_URL: process.env.DATABASE_URL || 'placeholder',
          OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
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

// Проверяем доступность критических сервисов
export const serviceAvailability = {
  database: !!env.DATABASE_URL && !env.DATABASE_URL.includes('placeholder'),
  openai: !!env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('sk-'),
  googleAuth: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
}

// Логируем статус сервисов (только в development)
if (env.NODE_ENV === 'development') {
  console.log('🔧 Статус сервисов:')
  console.log(`  Database: ${serviceAvailability.database ? '✅' : '❌'}`)
  console.log(`  OpenAI: ${serviceAvailability.openai ? '✅' : '❌'}`)
  console.log(`  Google Auth: ${serviceAvailability.googleAuth ? '✅' : '❌'}`)
}