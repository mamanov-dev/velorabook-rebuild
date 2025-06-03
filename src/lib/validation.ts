import { z } from 'zod';

// Общие валидаторы
const createSanitizedStringSchema = (minLength = 1, maxLength = 5000) => 
  z.string()
    .min(minLength, `Минимум ${minLength} символов`)
    .max(maxLength, `Максимум ${maxLength} символов`)
    .transform(str => str.trim()) // Удаляем пробелы по краям
    .refine(str => str.length >= minLength, `После удаления пробелов минимум ${minLength} символов`)
    .refine(str => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(str), 
      'Недопустимые теги script')

const emailSchema = z.string()
  .email('Некорректный email адрес')
  .max(320, 'Email слишком длинный') // RFC 5321 ограничение
  .transform(str => str.toLowerCase().trim())

// Пользователь
export const UserRegistrationSchema = z.object({
  name: createSanitizedStringSchema(2, 100)
    .refine(name => /^[a-zA-Zа-яА-ЯёЁ\s\-']+$/.test(name), 
      'Имя может содержать только буквы, пробелы, дефисы и апострофы'),
  
  email: emailSchema,
  
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .max(128, 'Пароль слишком длинный'),
}).strict(); // Запрещаем дополнительные поля

export const UserLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Пароль обязателен').max(128),
}).strict();

// ✨ НОВАЯ СИСТЕМА ТИПОВ КНИГ
export const BookCategorySchema = z.enum([
  'romantic', 
  'family', 
  'friendship', 
  'professional', 
  'special'
], {
  errorMap: () => ({ message: 'Недопустимая категория книги' })
});

export const BookRecipientSchema = z.enum([
  // Романтические
  'girlfriend',
  'boyfriend', 
  'wife',
  'husband',
  
  // Семейные
  'mother',
  'father',
  'daughter',
  'son',
  'grandmother',
  'grandfather',
  'sister',
  'brother',
  
  // Дружеские
  'best_friend_female',
  'best_friend_male',
  
  // Профессиональные
  'colleague',
  'boss',
  'mentor',
  'teacher',
  
  // Особые случаи
  'self',
  'anniversary',
  'wedding'
], {
  errorMap: () => ({ message: 'Недопустимый получатель книги' })
});

// Обновленная схема генерации книги
export const GenerateBookSchema = z.object({
  category: BookCategorySchema,
  recipient: BookRecipientSchema,
  answers: z.record(z.string().min(1).max(5000)),
  images: z.array(z.object({
    name: z.string().min(1).max(255),
    base64: z.string(),
    size: z.number().min(1).max(10 * 1024 * 1024),
    dimensions: z.object({
      width: z.number().min(1),
      height: z.number().min(1),
    }),
  })).max(8).optional().default([]),
}).refine(data => {
  // Валидация комбинаций категория-получатель
  const validCombinations: Record<string, string[]> = {
    romantic: ['girlfriend', 'boyfriend', 'wife', 'husband'],
    family: ['mother', 'father', 'daughter', 'son', 'grandmother', 'grandfather', 'sister', 'brother'],
    friendship: ['best_friend_female', 'best_friend_male'],
    professional: ['colleague', 'boss', 'mentor', 'teacher'],
    special: ['self', 'anniversary', 'wedding']
  };
  
  return validCombinations[data.category]?.includes(data.recipient);
}, {
  message: 'Недопустимая комбинация категории и получателя'
});

// Функция валидации с улучшенной обработкой ошибок
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  customErrorMessage?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors[0].message;
      throw new Error(`Ошибка валидации: ${message}`);
    }
    throw error;
  }
}

// Кастомный класс ошибки валидации
export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[];
  
  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

// Типы
export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type BookCategory = z.infer<typeof BookCategorySchema>;
export type BookRecipient = z.infer<typeof BookRecipientSchema>;
export type GenerateBookRequest = z.infer<typeof GenerateBookSchema>;

// ✨ Утилитарные функции для работы с новой системой типов
export const BookTypeUtils = {
  // Получить все доступные получателей для категории
  getRecipientsForCategory(category: BookCategory): BookRecipient[] {
    const mapping: Record<BookCategory, BookRecipient[]> = {
      romantic: ['girlfriend', 'boyfriend', 'wife', 'husband'],
      family: ['mother', 'father', 'daughter', 'son', 'grandmother', 'grandfather', 'sister', 'brother'],
      friendship: ['best_friend_female', 'best_friend_male'],
      professional: ['colleague', 'boss', 'mentor', 'teacher'],
      special: ['self', 'anniversary', 'wedding']
    };
    
    return mapping[category] || [];
  },
  
  // Получить категорию по получателю
  getCategoryForRecipient(recipient: BookRecipient): BookCategory {
    const mapping: Record<BookRecipient, BookCategory> = {
      // Романтические
      girlfriend: 'romantic',
      boyfriend: 'romantic',
      wife: 'romantic',
      husband: 'romantic',
      
      // Семейные
      mother: 'family',
      father: 'family',
      daughter: 'family',
      son: 'family',
      grandmother: 'family',
      grandfather: 'family',
      sister: 'family',
      brother: 'family',
      
      // Дружеские
      best_friend_female: 'friendship',
      best_friend_male: 'friendship',
      
      // Профессиональные
      colleague: 'professional',
      boss: 'professional',
      mentor: 'professional',
      teacher: 'professional',
      
      // Особые случаи
      self: 'special',
      anniversary: 'special',
      wedding: 'special'
    };
    
    return mapping[recipient];
  },
  
  // Создать составной ключ типа книги
  createBookTypeKey(category: BookCategory, recipient: BookRecipient): string {
    return `${category}-${recipient}`;
  },
  
  // Распарсить составной ключ
  parseBookTypeKey(key: string): { category: BookCategory; recipient: BookRecipient } | null {
    const [category, recipient] = key.split('-') as [BookCategory, BookRecipient];
    
    if (BookCategorySchema.safeParse(category).success && 
        BookRecipientSchema.safeParse(recipient).success) {
      return { category, recipient };
    }
    
    return null;
  },
  
  // Проверить валидность комбинации
  isValidCombination(category: BookCategory, recipient: BookRecipient): boolean {
    const validRecipients = this.getRecipientsForCategory(category);
    return validRecipients.includes(recipient);
  }
};