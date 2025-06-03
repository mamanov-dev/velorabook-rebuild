// src/app/api/books/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { serviceAvailability } from '@/lib/env'

// ✅ ИСПРАВЛЕНО: params теперь асинхронные в Next.js 15
interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Проверяем авторизацию
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Проверяем доступность БД
    if (!serviceAvailability.database) {
      return NextResponse.json({
        error: 'Database not available'
      }, { status: 503 })
    }

    // ✅ ИСПРАВЛЕНО: добавили await для получения параметров
    const { id: bookId } = await params

    if (!bookId) {
      return NextResponse.json({
        error: 'Book ID is required'
      }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')

    // Получаем книгу с полной информацией
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: session.user.id // Проверяем что книга принадлежит пользователю
      },
      include: {
        chapters: {
          orderBy: { number: 'asc' }
        },
        images: {
          orderBy: { createdAt: 'asc' }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!book) {
      return NextResponse.json({
        error: 'Book not found'
      }, { status: 404 })
    }

    // Формируем изображения в правильном формате для BookImageGallery
    const bookImages = book.images.map(img => ({
      url: img.storageUrl,
      caption: img.caption || `Фотография ${img.id}`,
      description: img.description || 'Особенный момент из вашей истории',
      originalName: img.originalName,
      size: img.fileSize
    }))

    // Формируем ответ в формате совместимом с BookContext
    const formattedBook = {
      id: book.id,
      title: book.title,
      category: book.category,
      recipient: book.recipient,
      bookType: book.bookType, // для обратной совместимости
      status: book.status,
      author: book.author,
      dedicatedTo: book.dedicatedTo,
      totalChapters: book.totalChapters,
      estimatedReadTime: book.estimatedReadTime,
      createdAt: book.createdAt.toISOString(),
      publishedAt: book.publishedAt?.toISOString(),

      // Главы в правильном формате
      chapters: book.chapters.map(chapter => ({
        number: chapter.number,
        title: chapter.title,
        content: chapter.content,
        epigraph: chapter.epigraph || undefined
      })),

      // Изображения в формате для BookImageGallery
      images: bookImages,

      // Метаданные
      metadata: {
        ...(book.metadata as any),
        category: book.category,
        recipient: book.recipient,
        bookType: book.bookType,
        generatedAt: book.createdAt.toISOString(),
        imagesCount: book.images.length,
        chaptersCount: book.chapters.length
      },

      // Информация о владельце
      owner: book.user
    }

    return NextResponse.json({
      success: true,
      book: formattedBook
    })

  } catch (error) {
    console.error('❌ Get book error:', error)

    return NextResponse.json({
      error: 'Failed to fetch book'
    }, { status: 500 })
  }
}

// PUT - для обновления книги (например, изменение названия)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!serviceAvailability.database) {
      return NextResponse.json({
        error: 'Database not available'
      }, { status: 503 })
    }

    // ✅ ИСПРАВЛЕНО: добавили await для получения параметров
    const { id: bookId } = await params
    const body = await request.json()

    const { prisma } = await import('@/lib/prisma')

    // Проверяем что книга принадлежит пользователю
    const existingBook = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: session.user.id
      }
    })

    if (!existingBook) {
      return NextResponse.json({
        error: 'Book not found'
      }, { status: 404 })
    }

    // Обновляем только разрешенные поля
    const updateData: any = {}

    if (body.title && typeof body.title === 'string') {
      updateData.title = body.title.trim()
    }

    if (body.dedicatedTo !== undefined) {
      updateData.dedicatedTo = body.dedicatedTo ? body.dedicatedTo.trim() : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: 'No valid fields to update'
      }, { status: 400 })
    }

    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: updateData
    })

    console.log(`✅ Book updated: ${bookId}`)

    return NextResponse.json({
      success: true,
      book: updatedBook
    })

  } catch (error) {
    console.error('❌ Update book error:', error)

    return NextResponse.json({
      error: 'Failed to update book'
    }, { status: 500 })
  }
}