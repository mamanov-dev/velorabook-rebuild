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
  romantic: `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ РОМАНТИЧЕСКУЮ КНИГУ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные диалоги между персонажами
- Детальные описания мест, эмоций, ощущений
- Развернутые сцены, а не краткие упоминания  
- Внутренние размышления героев
- Описания жестов, мимики, интонаций
- Детали окружающей обстановки

💝 СОДЕРЖАНИЕ: Теплая, эмоциональная любовная история с детальными сценами знакомства, развития отношений, особенных моментов.`,

  family: `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ СЕМЕЙНУЮ ХРОНИКУ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов  
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные семейные истории с диалогами
- Детальные описания традиций и ритуалов
- Развернутые воспоминания с деталями
- Описания семейного быта, атмосферы дома
- Характеры всех членов семьи подробно
- Эмоциональные сцены и переживания

👨‍👩‍👧‍👦 СОДЕРЖАНИЕ: Теплая семейная сага с подробными традициями, развернутыми воспоминаниями, детальными семейными историями.`,

  friendship: `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ О ДРУЖБЕ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов  
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные диалоги между друзьями
- Детальные описания совместных приключений
- Развернутые смешные истории с деталями
- Описания характеров, привычек друзей
- Эмоциональные моменты поддержки
- Атмосфера дружеских встреч

🤝 СОДЕРЖАНИЕ: Веселая, теплая история дружбы с детальными приключениями, развернутыми смешными моментами, подробными сценами поддержки.`,

  child: `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ ДЕТСКУЮ КНИГУ из ТОЧНО 4 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:  
- КАЖДАЯ глава: МИНИМУМ 700 слов, ИДЕАЛЬНО 900-1100 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 3200 слов, ЦЕЛЬ 3800-4400 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные описания роста и развития
- Детальные сцены важных моментов
- Развернутые истории достижений  
- Описания характера ребенка, привычек
- Эмоциональные переживания родителей
- Планы и мечты для будущего

👶 СОДЕРЖАНИЕ: Нежная, любящая история о ребенке с детальными моментами развития, развернутыми достижениями, подробными планами.`,

  travel: `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ ПУТЕШЕСТВИЙ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные описания мест и пейзажей
- Детальные встречи с местными людьми
- Развернутые впечатления от культуры
- Описания еды, звуков, запахов
- Эмоциональные переживания в пути
- Неожиданные ситуации с деталями

✈️ СОДЕРЖАНИЕ: Захватывающая история путешествий с детальными впечатлениями, развернутыми открытиями, подробными приключениями.`
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

КРИТИЧЕСКИ ВАЖНО - ТРЕБОВАНИЯ К ОБЪЕМУ:
- Книга должна содержать МИНИМУМ 4000 слов
- НЕ ДЕЛАЙ главы короткими! Каждая глава - это полноценный рассказ
- Пиши РАЗВЕРНУТО, ДЕТАЛЬНО, с эмоциями и описаниями
- Лучше больше текста, чем меньше

ФОРМАТ ОТВЕТА:
- Верни ответ строго в JSON формате  
- Структура: {"title": "название", "chapters": [{"number": 1, "title": "название главы", "content": "ДЛИННЫЙ текст главы", "epigraph": "эпиграф (опционально)"}]}
- Используй имена и детали из ответов пользователя
- Создай красивые названия глав`

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
      max_tokens: 15000,
      temperature: 0.8,
    })

    const content = completion.choices[0]?.message?.content
if (!content) {
  throw new Error('No content generated')
}

// Очищаем markdown форматирование от OpenAI
const cleanContent = content
  .replace(/```json\s*/gi, '')      // Убираем ```json
  .replace(/```javascript\s*/gi, '') // Убираем ```javascript  
  .replace(/```\s*/g, '')           // Убираем закрывающие ```
  .trim()                           // Убираем пробелы

// Находим границы JSON объекта
const firstBrace = cleanContent.indexOf('{')
const lastBrace = cleanContent.lastIndexOf('}')
const jsonContent = (firstBrace !== -1 && lastBrace !== -1) 
  ? cleanContent.substring(firstBrace, lastBrace + 1)
  : cleanContent

console.log('🔍 JSON preview:', jsonContent.substring(0, 200) + '...')

// Парсим очищенный JSON
const bookData = JSON.parse(jsonContent)

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