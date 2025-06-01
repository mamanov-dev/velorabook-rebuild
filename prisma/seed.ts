import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...')

  try {
    // Проверяем подключение к базе данных
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Подключение к базе данных успешно')

    // Демо пользователь
    const hashedPassword = await bcrypt.hash('demo123', 12)
    
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@velorabook.com' },
      update: {
        name: 'Demo User',
        password: hashedPassword,
        isVerified: true,
      },
      create: {
        email: 'demo@velorabook.com',
        name: 'Demo User',
        password: hashedPassword,
        isVerified: true,
      },
    })

    console.log('✅ Демо пользователь создан/обновлен:', demoUser.email)

    // Создаем демо книгу для демонстрации
    const demoBook = await prisma.book.upsert({
      where: { 
        id: 'demo-book-id' 
      },
      update: {},
      create: {
        id: 'demo-book-id',
        title: 'Демо книга VeloraBook',
        bookType: 'romantic',
        status: 'COMPLETED',
        content: {
          title: 'Демо книга VeloraBook',
          chapters: [
            {
              number: 1,
              title: 'Добро пожаловать в VeloraBook',
              content: 'Это демонстрационная книга, созданная для показа возможностей нашей платформы. Наша система использует искусственный интеллект для создания персонализированных книг на основе ваших ответов и загруженных фотографий.',
              epigraph: 'Каждая история уникальна, как и каждый человек'
            },
            {
              number: 2,
              title: 'Возможности платформы',
              content: 'VeloraBook предлагает различные типы персональных книг: романтические истории, семейные хроники, книги о дружбе, детские книги и книги путешествий. Каждая книга создается индивидуально с учетом ваших ответов.',
            }
          ]
        },
        metadata: {
          bookType: 'romantic',
          generatedAt: new Date().toISOString(),
          wordCount: 150,
          imagesCount: 0,
          tokensUsed: 0
        },
        answers: {
          demo: 'Это демонстрационная книга'
        },
        totalChapters: 2,
        estimatedReadTime: 5,
        author: 'VeloraBook AI',
        dedicatedTo: 'Всем пользователям VeloraBook',
        userId: demoUser.id,
      },
    })

    // Создаем главы для демо книги
    await prisma.bookChapter.upsert({
      where: {
        bookId_number: {
          bookId: demoBook.id,
          number: 1
        }
      },
      update: {},
      create: {
        bookId: demoBook.id,
        number: 1,
        title: 'Добро пожаловать в VeloraBook',
        content: 'Это демонстрационная книга, созданная для показа возможностей нашей платформы. Наша система использует искусственный интеллект для создания персонализированных книг на основе ваших ответов и загруженных фотографий. Каждая книга уникальна и создается специально для вас.',
        epigraph: 'Каждая история уникальна, как и каждый человек'
      }
    })

    await prisma.bookChapter.upsert({
      where: {
        bookId_number: {
          bookId: demoBook.id,
          number: 2
        }
      },
      update: {},
      create: {
        bookId: demoBook.id,
        number: 2,
        title: 'Возможности платформы',
        content: 'VeloraBook предлагает различные типы персональных книг: романтические истории, семейные хроники, книги о дружбе, детские книги и книги путешествий. Каждая книга создается индивидуально с учетом ваших ответов и может включать анализ ваших фотографий.'
      }
    })

    console.log('✅ Демо книга создана:', demoBook.title)

    // Статистика
    const userCount = await prisma.user.count()
    const bookCount = await prisma.book.count()
    
    console.log('\n📊 Статистика базы данных:')
    console.log(`  Пользователи: ${userCount}`)
    console.log(`  Книги: ${bookCount}`)
    
    console.log('\n🎉 Seed успешно завершен!')
    console.log('\n🔑 Данные для входа:')
    console.log(`  Email: demo@velorabook.com`)
    console.log(`  Password: demo123`)

  } catch (error) {
    console.error('❌ Ошибка при выполнении seed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })