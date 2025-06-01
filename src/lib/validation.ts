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

// Книги
export const BookTypeSchema = z.enum([
  'romantic', 'family', 'friendship', 'child', 'travel'
], {
  errorMap: () => ({ message: 'Недопустимый тип книги' })
});

export const GenerateBookSchema = z.object({
  bookType: BookTypeSchema,
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
export type GenerateBookRequest = z.infer<typeof GenerateBookSchema>;