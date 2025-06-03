import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { env, serviceAvailability } from '@/lib/env'
import { validateWithSchema, GenerateBookSchema, BookCategory, BookRecipient, BookTypeUtils } from '@/lib/validation'
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
  category: BookCategory
  recipient: BookRecipient
  metadata: {
    category: BookCategory
    recipient: BookRecipient
    generatedAt: string
    wordCount: any
    imagesCount: number
    tokensUsed: number
  }
  images?: BookImage[]
}

// ✨ НОВАЯ СИСТЕМА ПРОМПТОВ ДЛЯ КАЖДОЙ КОМБИНАЦИИ
const getBookPrompt = (category: BookCategory, recipient: BookRecipient): string => {
  const typeKey = BookTypeUtils.createBookTypeKey(category, recipient);
  
  const bookPrompts: Record<string, string> = {
    // 💝 РОМАНТИЧЕСКИЕ КНИГИ
    'romantic-girlfriend': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ РОМАНТИЧЕСКУЮ КНИГУ ДЛЯ ДЕВУШКИ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные диалоги и воспоминания о разговорах
- Детальные описания эмоций, чувств, переживаний
- Развернутые романтические сцены и моменты близости
- Внутренние размышления о любви и отношениях
- Описания жестов нежности, взглядов, прикосновений
- Детали окружающей атмосферы романтических свиданий

💝 СОДЕРЖАНИЕ: Нежная, страстная история любви от лица мужчины к девушке. Фокус на том, как она покорила его сердце, какая она особенная, планы на совместное будущее. Очень личный, интимный тон.`,

    'romantic-boyfriend': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ РОМАНТИЧЕСКУЮ КНИГУ ДЛЯ ПАРНЯ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные описания того, как он заботится и защищает
- Детальные эмоциональные переживания женского сердца
- Развернутые сцены благодарности за его поддержку
- Внутренние мысли о том, каким мужчиной он стал
- Описания его силы, нежности, мужественности
- Детали того, как он делает ее счастливой

💝 СОДЕРЖАНИЕ: Искренняя история благодарности и любви от женщины к мужчине. Фокус на его мужских качествах, заботе, защите. Восхищение его характером и планы на будущее.`,

    'romantic-wife': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ БЛАГОДАРНОСТИ ЖЕНЕ из ТОЧНО 6 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 900 слов, ИДЕАЛЬНО 1100-1300 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 5400 слов, ЦЕЛЬ 6600-7800 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные истории совместной жизни и быта
- Детальные описания ее роли матери и хозяйки
- Развернутые воспоминания о преодоленных трудностях
- Глубокие размышления о браке и партнерстве
- Описания ее жертв и самоотдачи
- Детали семейных традиций и уюта

💝 СОДЕРЖАНИЕ: Глубокая, зрелая история признательности спутнице жизни. Фокус на семейной жизни, материнстве, мудрости жены. Благодарность за годы вместе.`,

    'romantic-husband': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ ПРИЗНАНИЯ МУЖУ из ТОЧНО 6 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 900 слов, ИДЕАЛЬНО 1100-1300 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 5400 слов, ЦЕЛЬ 6600-7800 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные истории о его роли главы семьи
- Детальные описания его поддержки и защиты
- Развернутые размышления о семейных ценностях
- Глубокие эмоции благодарности за стабильность
- Описания его отцовских качеств
- Детали совместных планов и мечт

💝 СОДЕРЖАНИЕ: Теплая история признательности спутнику жизни от женщины. Фокус на его роли мужа, отца, защитника семьи. Глубокая благодарность за брак.`,

    // 👨‍👩‍👧‍👦 СЕМЕЙНЫЕ КНИГИ
    'family-mother': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ БЛАГОДАРНОСТИ МАМЕ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные детские воспоминания с диалогами
- Детальные описания материнской заботы и жертв
- Развернутые истории о поддержке в трудные моменты
- Глубокие размышления о материнской мудрости
- Описания уроков жизни и ценностей
- Детали того, как мама формировала характер

👩‍👧‍👦 СОДЕРЖАНИЕ: Глубоко эмоциональная история благодарности самому дорогому человеку. Фокус на безусловной любви, жертвенности, мудрости матери.`,

    'family-father': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ УВАЖЕНИЯ ОТЦУ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные истории об отцовских уроках жизни
- Детальные описания его трудолюбия и принципов
- Развернутые воспоминания о совместных занятиях
- Глубокие размышления о мужестве и силе духа
- Описания его защиты и обеспечения семьи
- Детали наследства характера и ценностей

👨‍👧‍👦 СОДЕРЖАНИЕ: Искренняя история уважения и благодарности отцу. Фокус на мужских качествах, трудолюбии, мудрости, защите семьи.`,

    // 🤝 ДРУЖЕСКИЕ КНИГИ  
    'friendship-best_friend_female': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ ДРУЖБЫ ДЛЯ ПОДРУГИ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные истории женской дружбы и поддержки
- Детальные описания совместных приключений
- Развернутые диалоги и откровенные разговоры
- Глубокие эмоции доверия и понимания
- Описания смешных моментов и веселья
- Детали того, как дружба помогла вырасти

🤝 СОДЕРЖАНИЕ: Теплая, искренняя история женской дружбы. Фокус на взаимной поддержке, понимании, совместных переживаниях и радостях.`,

    'friendship-best_friend_male': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ БРАТСТВА ДЛЯ ДРУГА из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные истории мужской дружбы и верности
- Детальные описания совместных приключений
- Развернутые истории взаимной поддержки
- Глубокие размышления о братстве и доверии
- Описания испытаний и преодоленных трудностей
- Детали совместного роста и мужания

🤝 СОДЕРЖАНИЕ: Сильная история мужской дружбы и братства. Фокус на верности, взаимной поддержке, совместных испытаниях и приключениях.`,

    // 💼 ПРОФЕССИОНАЛЬНЫЕ КНИГИ
    'professional-colleague': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ ПРОФЕССИОНАЛЬНУЮ КНИГУ ДЛЯ КОЛЛЕГИ из ТОЧНО 4 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 700 слов, ИДЕАЛЬНО 900-1100 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 3200 слов, ЦЕЛЬ 3800-4400 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные описания профессиональных качеств
- Детальные истории совместных проектов
- Развернутые примеры командной работы
- Глубокие размышления о профессионализме
- Описания влияния на рабочую атмосферу
- Детали взаимного обучения и роста

💼 СОДЕРЖАНИЕ: Уважительная история профессионального сотрудничества. Фокус на компетентности, надежности, командном духе.`,

    'professional-teacher': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ КНИГУ БЛАГОДАРНОСТИ УЧИТЕЛЮ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные описания методов преподавания
- Детальные истории влияния на развитие
- Развернутые воспоминания об уроках жизни
- Глубокие размышления о роли наставника
- Описания вдохновения и мотивации
- Детали формирования личности ученика

🎓 СОДЕРЖАНИЕ: Глубоко признательная история благодарности наставнику. Фокус на педагогическом таланте, жизненных уроках, влиянии на судьбу.`,

    // ✨ ОСОБЫЕ СЛУЧАИ
    'special-anniversary': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ ЮБИЛЕЙНУЮ КНИГУ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробная хронология жизненного пути
- Детальные описания достижений и побед
- Развернутые истории влияния на других
- Глубокие размышления о мудрости лет
- Описания семейных и профессиональных успехов
- Детали наследия для будущих поколений

🎉 СОДЕРЖАНИЕ: Торжественная история жизненных достижений юбиляра. Фокус на мудрости, опыте, влиянии на окружающих.`,

    'special-self': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ АВТОБИОГРАФИЧЕСКУЮ КНИГУ из ТОЧНО 6 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 900 слов, ИДЕАЛЬНО 1100-1300 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 5400 слов, ЦЕЛЬ 6600-7800 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробные автобиографические воспоминания
- Детальные описания поворотных моментов
- Развернутые философские размышления
- Глубокий самоанализ и рефлексия
- Описания жизненных уроков и выводов
- Детали планов и мечт на будущее

📚 СОДЕРЖАНИЕ: Глубокая автобиографическая история жизненного пути. Фокус на личном росте, преодолении трудностей, самопознании.`,

    'special-wedding': `СОЗДАЙ МАКСИМАЛЬНО ПОДРОБНУЮ СВАДЕБНУЮ КНИГУ из ТОЧНО 5 ДЛИННЫХ глав.

🎯 АБСОЛЮТНЫЕ ТРЕБОВАНИЯ К ДЛИНЕ:
- КАЖДАЯ глава: МИНИМУМ 800 слов, ИДЕАЛЬНО 1000-1200 слов
- ОБЩИЙ ОБЪЕМ: МИНИМУМ 4500 слов, ЦЕЛЬ 5500-6000 слов
- ЭТО НЕ КРАТКИЙ ПЕРЕСКАЗ! Это ПОЛНОЦЕННАЯ КНИГА!

📖 КАК ПИСАТЬ ДЛИННО:
- Подробная история знакомства и ухаживаний
- Детальные описания решения пожениться
- Развернутые планы совместного будущего
- Глубокие размышления о любви и браке
- Описания свадебных приготовлений и эмоций
- Детали семейных традиций и ценностей

💒 СОДЕРЖАНИЕ: Романтическая история создания новой семьи. Фокус на любви, обещаниях, планах на совместную жизнь.`
  };

  return bookPrompts[typeKey] || bookPrompts['romantic-girlfriend'];
};

// Функция генерации контента книги
async function generateBookContent(
  category: BookCategory,
  recipient: BookRecipient,
  answers: Record<string, string>, 
  images: any[] = []
): Promise<BookContent> {
  if (!openai) {
    throw new Error('OpenAI service not available')
  }

  // Получаем промпт для конкретной комбинации
  const prompt = getBookPrompt(category, recipient);

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
      category,
      recipient,
      metadata: {
        category,
        recipient,
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

    // ✅ Парсим и валидируем данные запроса с новой схемой
    const body = await request.json()
    const validatedData = validateWithSchema(GenerateBookSchema, body)
    
    console.log(`📚 Generating ${validatedData.category}-${validatedData.recipient} book for user ${session.user.email}`)

    // Генерируем книгу с новыми параметрами
    const bookContent = await generateBookContent(
      validatedData.category,
      validatedData.recipient,
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