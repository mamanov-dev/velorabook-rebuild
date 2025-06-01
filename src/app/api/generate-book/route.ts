import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { env, serviceAvailability } from '@/lib/env'
import { validateWithSchema, GenerateBookSchema } from '@/lib/validation'
import OpenAI from 'openai'

// Инициализируем OpenAI только если ключ доступен
const openai = serviceAvailability.openai ? new OpenAI({
  apiKey: env.OPENAI_API_KEY,
}) : null

// Rate limiting простая проверка (можно улучшить с Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 час
  const maxRequests = 3 // 3 книги в час

  const userStats = requestCounts.get(userId)
  
  if (!userStats || now > userStats.resetTime) {
    requestCounts.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userStats.count >= maxRequests) {
    return false
  }

  userStats.count++
  return true
}

// Типы для книги
interface BookImage {
  url: string
  caption: string
  description: string
  originalName: string
  size: number
}

interface BookContent {
  title: any
  chapters: any
  totalChapters: any
  estimatedReadTime: number
  author: string
  bookType: string
  metadata: {
    bookType: string
    generatedAt: string
    wordCount: any
    imagesCount: number
    tokensUsed: number
  }
  images?: BookImage[]
}

// Функция генерации контента книги
async function generateBookContent(
  bookType: string, 
  answers: Record<string, string>, 
  images: any[] = []
): Promise<BookContent> {
  if (!openai) {
    throw new Error('OpenAI service not available')
  }

  // Создаем контекст для ИИ на основе типа книги
  const bookTypePrompts = {
    romantic: `Создай романтическую книгу из 4-5 глав о любовной истории. Используй теплый, эмоциональный тон. 
    Включи описания моментов, чувств, совместных планов. Каждая глава должна быть 800-1200 слов.`,
    
    family: `Создай семейную хронику из 4-5 глав о семейной истории. Используй теплый, семейный тон.
    Включи традиции, воспоминания, ценности семьи. Каждая глава должна быть 800-1200 слов.`,
    
    friendship: `Создай книгу о дружбе из 4-5 глав. Используй дружелюбный, веселый тон.
    Включи совместные приключения, поддержку, смешные моменты. Каждая глава должна быть 800-1200 слов.`,
    
    child: `Создай детскую книгу из 3-4 глав о росте и развитии ребенка. Используй нежный, любящий тон.
    Включи важные моменты, достижения, планы на будущее. Каждая глава должна быть 600-1000 слов.`,
    
    travel: `Создай книгу путешествий из 4-5 глав о приключениях. Используй захватывающий, описательный тон.
    Включи впечатления, открытия, встречи с людьми. Каждая глава должна быть 800-1200 слов.`
  }

  const prompt = bookTypePrompts[bookType as keyof typeof bookTypePrompts] || bookTypePrompts.romantic

  // Формируем детальные ответы пользователя
  const answersText = Object.entries(answers)
    .map(([question, answer]) => `${question}: ${answer}`)
    .join('\n')

  // Информация об изображениях
  const imageContext = images.length > 0 
    ? `\n\nВ книге есть ${images.length} изображений. Органично включи описания этих фотографий в повествование, как будто они иллюстрируют моменты из истории.`
    : ''

  const fullPrompt = `${prompt}

Создай книгу на основе следующих ответов пользователя:
${answersText}${imageContext}

ВАЖНО: 
- Верни ответ строго в JSON формате
- Структура: {"title": "название", "chapters": [{"number": 1, "title": "название главы", "content": "текст главы", "epigraph": "эпиграф (опционально)"}]}
- Каждая глава должна быть качественно написана и эмоционально насыщена
- Используй имена и детали из ответов пользователя
- Создай красивые названия глав
- Общий объем: 4000-6000 слов`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Ты профессиональный писатель, создающий персональные книги. Всегда отвечай валидным JSON."
        },
        {
          role: "user", 
          content: fullPrompt
        }
      ],
      max_tokens: 13000,
      temperature: 0.8,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content generated')
    }

    // Парсим JSON ответ
    const bookData = JSON.parse(content)
    
    // Валидируем структуру
    if (!bookData.title || !Array.isArray(bookData.chapters)) {
      throw new Error('Invalid book structure')
    }

    return {
      title: bookData.title,
      chapters: bookData.chapters,
      totalChapters: bookData.chapters.length,
      estimatedReadTime: Math.ceil(
        bookData.chapters.reduce((total: number, chapter: any) => 
          total + (chapter.content?.length || 0), 0
        ) / 1000 // Примерно 1000 символов в минуту
      ),
      author: 'VeloraBook AI',
      bookType,
      metadata: {
        bookType,
        generatedAt: new Date().toISOString(),
        wordCount: bookData.chapters.reduce((total: number, chapter: any) => 
          total + (chapter.content?.split(' ').length || 0), 0
        ),
        imagesCount: images.length,
        tokensUsed: completion.usage?.total_tokens || 0,
      }
    }
  } catch (error) {
    console.error('OpenAI generation error:', error)
    throw new Error('Failed to generate book content')
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Проверяем авторизацию
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Проверяем доступность OpenAI
    if (!serviceAvailability.openai) {
      return NextResponse.json({
        error: 'Book generation service temporarily unavailable. OpenAI API key not configured.',
        code: 'SERVICE_UNAVAILABLE'
      }, { status: 503 })
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({
        error: 'Rate limit exceeded. You can generate 3 books per hour.',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 })
    }

    // Парсим и валидируем данные запроса
    const body = await request.json()
    const validatedData = validateWithSchema(GenerateBookSchema, body)
    
    console.log(`📚 Generating ${validatedData.bookType} book for user ${session.user.email}`)

    // Генерируем книгу
    const bookContent = await generateBookContent(
      validatedData.bookType,
      validatedData.answers,
      validatedData.images || []
    )

    // Добавляем изображения к книге если они есть
    if (validatedData.images && validatedData.images.length > 0) {
      bookContent.images = validatedData.images.map((img, index) => ({
        url: img.base64,
        caption: `Фотография ${index + 1}`,
        description: `Особенный момент из вашей истории`,
        originalName: img.name,
        size: img.size,
      }))
    }

    const duration = Date.now() - startTime
    console.log(`✅ Book generated in ${duration}ms`)

    // Возвращаем успешный результат
    return NextResponse.json({
      success: true,
      book: bookContent,
      metadata: {
        generationTime: duration,
        timestamp: new Date().toISOString(),
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ Book generation failed:', error)

    // Обработка различных типов ошибок
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json({
          error: 'OpenAI rate limit exceeded. Please try again later.',
          code: 'OPENAI_RATE_LIMIT'
        }, { status: 429 })
      }

      if (error.message.includes('Invalid book structure')) {
        return NextResponse.json({
          error: 'Generated content has invalid structure. Please try again.',
          code: 'GENERATION_ERROR'
        }, { status: 500 })
      }

      if (error.message.includes('Failed to generate')) {
        return NextResponse.json({
          error: 'Failed to generate book content. Please try again.',
          code: 'GENERATION_FAILED'
        }, { status: 500 })
      }

      if (error.message.includes('Ошибка валидации')) {
        return NextResponse.json({
          error: error.message,
          code: 'VALIDATION_ERROR'
        }, { status: 400 })
      }
    }

    // Общая ошибка
    return NextResponse.json({
      error: 'Internal server error during book generation',
      code: 'INTERNAL_ERROR',
      debug: env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}