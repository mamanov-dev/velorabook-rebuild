// src/app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { serviceAvailability } from '@/lib/env'

export async function GET(request: NextRequest) {
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
        books: [],
        total: 0,
        message: 'Database not available'
      })
    }

    const { prisma } = await import('@/lib/prisma')

    // Получаем параметры запроса
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    const skip = (page - 1) * limit

    // Строим условие фильтрации
    const where: any = {
      userId: session.user.id
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    // Получаем книги с главами и изображениями
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          chapters: {
            orderBy: { number: 'asc' }
          },
          images: true,
          _count: {
            select: {
              chapters: true,
              images: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.book.count({ where })
    ])

    // Преобразуем в формат для фронтенда
    const formattedBooks = books.map(book => {
      // Формируем изображения в правильном формате
      const bookImages = book.images.map(img => ({
        url: img.storageUrl,
        caption: img.caption || `Изображение ${img.id}`,
        description: img.description || 'Персональное изображение',
        originalName: img.originalName,
        size: img.fileSize
      }))

      return {
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

        // Главы
        chapters: book.chapters.map(chapter => ({
          number: chapter.number,
          title: chapter.title,
          content: chapter.content,
          epigraph: chapter.epigraph
        })),

        // Изображения
        images: bookImages,

        // Метаданные
        metadata: {
          ...(book.metadata as any),
          chaptersCount: book._count.chapters,
          imagesCount: book._count.images
        }
      }
    })

    const response = {
      books: formattedBooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Get books error:', error)

    return NextResponse.json({
      error: 'Failed to fetch books',
      books: [],
      total: 0
    }, { status: 500 })
  }
}

// DELETE - для удаления книги
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('id')

    if (!bookId) {
      return NextResponse.json({
        error: 'Book ID is required'
      }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')

    // Проверяем что книга принадлежит пользователю
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: session.user.id
      }
    })

    if (!book) {
      return NextResponse.json({
        error: 'Book not found'
      }, { status: 404 })
    }

    // Удаляем книгу (каскадное удаление глав и изображений настроено в схеме)
    await prisma.book.delete({
      where: { id: bookId }
    })

    console.log(`✅ Book deleted: ${bookId}`)

    return NextResponse.json({
      success: true,
      message: 'Book deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete book error:', error)

    return NextResponse.json({
      error: 'Failed to delete book'
    }, { status: 500 })
  }
}