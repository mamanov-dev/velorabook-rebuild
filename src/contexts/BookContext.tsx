'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BookCategory, BookRecipient } from '@/lib/validation';

// Типы для книги
export interface BookChapter {
  number: number;
  title: string;
  content: string;
  epigraph?: string;
}

export interface GeneratedBook {
  title: string;
  chapters: BookChapter[];
  totalChapters: number;
  estimatedReadTime: number;
  author?: string;
  dedicatedTo?: string;
  
  // ✨ НОВЫЕ ПОЛЯ для двухуровневой системы
  category?: BookCategory;
  recipient?: BookRecipient;
  
  // Поля для обратной совместимости (deprecated)
  bookType?: string;
  
  createdAt?: string;
  images?: BookImage[];
  metadata?: {
    // ✨ ОБНОВЛЕННЫЕ МЕТАДАННЫЕ
    category?: BookCategory;
    recipient?: BookRecipient;
    bookType?: string; // для обратной совместимости
    generatedAt: string;
    wordCount: number;
    imagesCount?: number;
    imageAnalysis?: string[];
  };
}

export interface BookImage {
  url: string;
  caption?: string;
  description?: string;
  originalName?: string;
  size?: number;
}

// Интерфейс контекста
interface BookContextType {
  currentBook: GeneratedBook | null;
  setCurrentBook: (book: GeneratedBook | null) => void;
  isBookLoading: boolean;
  setIsBookLoading: (loading: boolean) => void;
  saveBook: (book: GeneratedBook) => void;
  clearBook: () => void;
  hasBook: boolean;
}

// Создаем контекст
const BookContext = createContext<BookContextType | undefined>(undefined);

// Провайдер контекста
export function BookProvider({ children }: { children: ReactNode }) {
  const [currentBook, setCurrentBook] = useState<GeneratedBook | null>(null);
  const [isBookLoading, setIsBookLoading] = useState(false);

  // Функция сохранения книги
  const saveBook = (book: GeneratedBook) => {
    const bookWithMetadata = {
      ...book,
      createdAt: new Date().toISOString(),
      // ✨ Обеспечиваем обратную совместимость
      bookType: book.bookType || (book.category && book.recipient ? `${book.category}-${book.recipient}` : 'romantic'),
    };
    setCurrentBook(bookWithMetadata);
  };

  // Функция очистки книги
  const clearBook = () => {
    setCurrentBook(null);
  };

  // Проверка наличия книги
  const hasBook = currentBook !== null;

  const value: BookContextType = {
    currentBook,
    setCurrentBook,
    isBookLoading,
    setIsBookLoading,
    saveBook,
    clearBook,
    hasBook,
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
}

// Хук для использования контекста
export function useBook() {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return context;
}

// ✨ ОБНОВЛЕННАЯ демо-книга с новой структурой
export const sampleBook: GeneratedBook = {
  title: "Демо Книга VeloraBook",
  
  // ✨ Новые поля
  category: 'romantic',
  recipient: 'girlfriend',
  
  chapters: [
    {
      number: 1,
      title: "Добро пожаловать в VeloraBook",
      content: `Добро пожаловать в VeloraBook! Это демонстрационная книга, созданная для показа возможностей нашей платформы.

Наша система теперь использует двухуровневую структуру выбора типов книг. Сначала вы выбираете категорию (романтические, семейные, дружеские, профессиональные или особые случаи), а затем конкретного получателя подарка.

Это позволяет создавать более персонализированные и подходящие истории. Например, книга для девушки будет отличаться от книги для жены, хотя обе относятся к романтической категории.

Когда вы загружаете фотографии, наш ИИ анализирует их содержимое и органично включает описания в повествование, создавая более живую и персональную историю.

Чтобы создать свою собственную книгу, перейдите на страницу создания, выберите категорию и получателя, затем ответьте на персонализированные вопросы. ИИ проанализирует ваши ответы и создаст красивую персональную историю.

Это лишь начало вашего путешествия в мир персонализированной литературы! Каждая книга создается с любовью и вниманием к деталям.

Мы используем самые современные технологии искусственного интеллекта, чтобы превратить ваши воспоминания в настоящее литературное произведение.`
    },
    {
      number: 2,
      title: "Новая система типов книг",
      content: `VeloraBook предлагает пять основных категорий персональных книг для разных случаев жизни.

**💝 Романтические книги** - для любимых людей. Теперь вы можете создать книгу специально для девушки, парня, жены или мужа. Каждый вариант имеет уникальные вопросы и стиль повествования. Книга для девушки фокусируется на нежности и планах на будущее, в то время как книга для жены подчеркивает глубину семейных отношений и благодарность за годы вместе.

**👨‍👩‍👧‍👦 Семейные книги** - сохраните историю вашей семьи для будущих поколений. Создайте особенную книгу для мамы, папы, дочери, сына, или даже для бабушек и дедушек. Каждая книга учитывает особенности отношений и роль человека в семье.

**🤝 Дружеские книги** - отпразднуйте особенные отношения с лучшими друзьями. Отдельные варианты для лучшей подруги и лучшего друга, учитывающие особенности женской и мужской дружбы.

**💼 Профессиональные книги** - новая категория для рабочих отношений. Создайте книгу благодарности для коллеги, начальника, наставника или учителя. Эти книги имеют более официальный, но теплый тон.

**✨ Особые случаи** - для уникальных событий и ситуаций. Юбилейные книги, автобиографии для себя, или книги к свадьбе. Каждый тип имеет специальную структуру и стиль.

Эта система позволяет создавать гораздо более точные и подходящие истории для каждого конкретного случая и получателя.`
    },
    {
      number: 3,
      title: "Персонализированные вопросы",
      content: `Каждая комбинация категории и получателя имеет уникальный набор вопросов, разработанных специально для этого типа отношений.

Например, вопросы для книги девушке включают:
- "Как долго вы встречаетесь?"
- "Что вас больше всего привлекает в ней?"
- "Планируете ли серьезные отношения?"

В то время как вопросы для книги маме фокусируются на:
- "Самые яркие детские воспоминания с мамой"
- "Какие жизненные уроки дала вам мама?"
- "За что вы благодарны маме больше всего?"

Профессиональные книги для коллег включают вопросы о:
- Совместных проектах и достижениях
- Профессиональных качествах
- Влиянии на рабочую атмосферу

Такой подход позволяет ИИ создавать истории, которые идеально подходят для конкретных отношений и ситуаций. Каждая книга получается максимально релевантной и трогательной для своего получателя.

ИИ анализирует не только содержание ваших ответов, но и их эмоциональную окраску, чтобы выбрать правильный тон и стиль повествования.`
    },
    {
      number: 4,
      title: "Создайте свою уникальную историю",
      content: `Готовы создать свою уникальную книгу с новой системой типов? Процесс стал еще более интуитивным и персонализированным.

**Шаг 1: Выберите категорию**
Сначала определитесь с общим типом отношений: романтические, семейные, дружеские, профессиональные или особый случай.

**Шаг 2: Выберите получателя**
Затем выберите конкретного получателя из доступных вариантов. Каждая категория предлагает несколько специфических вариантов.

**Шаг 3: Ответьте на персонализированные вопросы**
Получите уникальный набор вопросов, разработанный специально для выбранной комбинации. Количество вопросов варьируется от 8 до 15 в зависимости от типа книги.

**Шаг 4: Загрузите фотографии**
Добавьте до 8 ваших самых дорогих фотографий. ИИ проанализирует их и включит в повествование.

**Шаг 5: Получите персональную книгу**
ИИ создаст уникальную историю, учитывающую специфику ваших отношений и выбранного получателя.

Новая система гарантирует, что каждая книга будет максимально подходящей и трогательной для своего получателя. Начните создание вашей книги прямо сейчас!

Попробуйте разные комбинации категорий и получателей, чтобы создать несколько книг для разных близких людей.`
    }
  ],
  totalChapters: 4,
  estimatedReadTime: 12,
  author: "VeloraBook AI",
  dedicatedTo: "Всем пользователям новой системы типов",
  
  // Для обратной совместимости
  bookType: "romantic-girlfriend",
  
  createdAt: new Date().toISOString(),
  images: [
    {
      url: "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=600&h=400&fit=crop",
      caption: "Пример романтической фотографии",
      description: "Новая система позволяет лучше анализировать романтические моменты"
    },
    {
      url: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop",
      caption: "Семейные моменты",
      description: "Семейные книги теперь имеют специализированные варианты для каждого члена семьи"
    },
    {
      url: "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&h=400&fit=crop",
      caption: "Дружеские приключения",
      description: "Отдельные варианты для мужской и женской дружбы"
    }
  ],
  metadata: {
    category: 'romantic',
    recipient: 'girlfriend',
    bookType: "romantic-girlfriend", // для обратной совместимости
    generatedAt: new Date().toISOString(),
    wordCount: 1500,
    imagesCount: 3,
    imageAnalysis: [
      "Романтическая атмосфера с персонализированным подходом",
      "Семейный уют с учетом конкретных отношений", 
      "Дружеская радость с гендерной спецификой"
    ]
  }
};

// ✨ Утилитарные функции для работы с новой системой
export const BookContextUtils = {
  // Получить отображаемое название типа книги
  getBookTypeDisplay(book: GeneratedBook): string {
    if (book.category && book.recipient) {
      const categoryNames: Record<BookCategory, string> = {
        romantic: 'Романтическая',
        family: 'Семейная',
        friendship: 'Дружеская',
        professional: 'Профессиональная',
        special: 'Особая'
      };
      
      const recipientNames: Record<BookRecipient, string> = {
        girlfriend: 'для девушки',
        boyfriend: 'для парня',
        wife: 'для жены',
        husband: 'для мужа',
        mother: 'для мамы',
        father: 'для папы',
        daughter: 'для дочери',
        son: 'для сына',
        grandmother: 'для бабушки',
        grandfather: 'для дедушки',
        sister: 'для сестры',
        brother: 'для брата',
        best_friend_female: 'для лучшей подруги',
        best_friend_male: 'для лучшего друга',
        colleague: 'для коллеги',
        boss: 'для начальника',
        mentor: 'для наставника',
        teacher: 'для учителя',
        self: 'для себя',
        anniversary: 'на юбилей',
        wedding: 'на свадьбу'
      };
      
      return `${categoryNames[book.category]} книга ${recipientNames[book.recipient]}`;
    }
    
    // Fallback для старой системы
    const legacyNames: Record<string, string> = {
      romantic: 'Романтическая книга',
      family: 'Семейная книга',
      friendship: 'Книга дружбы',
      child: 'Детская книга',
      travel: 'Книга путешествий',
      demo: 'Демо книга'
    };
    
    return legacyNames[book.bookType || 'romantic'] || 'Персональная книга';
  },
  
  // Получить иконку для типа книги
  getBookTypeIcon(book: GeneratedBook): string {
    if (book.category) {
      const categoryIcons: Record<BookCategory, string> = {
        romantic: '💝',
        family: '👨‍👩‍👧‍👦',
        friendship: '🤝',
        professional: '💼',
        special: '✨'
      };
      
      return categoryIcons[book.category];
    }
    
    // Fallback для старой системы
    const legacyIcons: Record<string, string> = {
      romantic: '💝',
      family: '👨‍👩‍👧‍👦',
      friendship: '🤝',
      child: '👶',
      travel: '✈️',
      demo: '📖'
    };
    
    return legacyIcons[book.bookType || 'romantic'] || '📖';
  },
};