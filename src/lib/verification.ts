// src/lib/verification.ts
import { CacheService } from '@/lib/redis'

export interface VerificationCode {
  code: string
  email: string
  attempts: number
  createdAt: number
  expiresAt: number
}

export interface VerificationResult {
  success: boolean
  error?: string
  attemptsLeft?: number
}

export class VerificationService {
  private static readonly CODE_LENGTH = 6
  private static readonly CODE_TTL = 10 * 60 // 10 минут в секундах
  private static readonly MAX_ATTEMPTS = 3
  private static readonly RESEND_COOLDOWN = 60 // 1 минута в секундах
  private static readonly RATE_LIMIT_WINDOW = 60 * 60 // 1 час в секундах
  private static readonly MAX_CODES_PER_HOUR = 3

  /**
   * Генерирует 6-значный код
   */
  private static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Получает ключи для Redis
   */
  private static getKeys(email: string) {
    return {
      code: `verification:code:${email.toLowerCase()}`,
      resend: `verification:resend:${email.toLowerCase()}`,
      rateLimit: `verification:rate:${email.toLowerCase()}`
    }
  }

  /**
   * Проверяет rate limit для отправки кодов
   */
  static async checkRateLimit(email: string): Promise<{ allowed: boolean; codesLeft: number }> {
    const keys = this.getKeys(email)
    
    try {
      const rateData = await CacheService.get(keys.rateLimit) as { count: number; resetTime: number } | null
      const now = Date.now()

      if (!rateData || now > rateData.resetTime) {
        // Создаем новое окно rate limit
        await CacheService.set(keys.rateLimit, {
          count: 0,
          resetTime: now + (this.RATE_LIMIT_WINDOW * 1000)
        }, this.RATE_LIMIT_WINDOW)
        
        return { allowed: true, codesLeft: this.MAX_CODES_PER_HOUR }
      }

      const codesLeft = this.MAX_CODES_PER_HOUR - rateData.count
      return { 
        allowed: codesLeft > 0, 
        codesLeft: Math.max(0, codesLeft) 
      }
    } catch (error) {
      console.error('❌ Rate limit check error:', error)
      return { allowed: true, codesLeft: this.MAX_CODES_PER_HOUR } // Fallback
    }
  }

  /**
   * Проверяет можно ли переотправить код (cooldown)
   */
  static async canResend(email: string): Promise<{ canResend: boolean; waitSeconds: number }> {
    const keys = this.getKeys(email)
    
    try {
      const resendData = await CacheService.get(keys.resend) as { sentAt: number } | null
      
      if (!resendData) {
        return { canResend: true, waitSeconds: 0 }
      }

      const now = Date.now()
      const timePassed = Math.floor((now - resendData.sentAt) / 1000)
      const waitSeconds = Math.max(0, this.RESEND_COOLDOWN - timePassed)

      return {
        canResend: waitSeconds === 0,
        waitSeconds
      }
    } catch (error) {
      console.error('❌ Resend check error:', error)
      return { canResend: true, waitSeconds: 0 } // Fallback
    }
  }

  /**
   * Создает новый код верификации
   */
  static async createCode(email: string): Promise<{ success: boolean; code?: string; error?: string; waitSeconds?: number }> {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      
      // Проверяем rate limit
      const { allowed, codesLeft } = await this.checkRateLimit(normalizedEmail)
      if (!allowed) {
        return {
          success: false,
          error: `Превышен лимит отправки кодов. Осталось ${codesLeft} кодов в час.`
        }
      }

      // Проверяем cooldown для переотправки
      const { canResend, waitSeconds } = await this.canResend(normalizedEmail)
      if (!canResend) {
        return {
          success: false,
          error: `Код уже отправлен. Повторная отправка через ${waitSeconds} секунд.`,
          waitSeconds
        }
      }

      const keys = this.getKeys(normalizedEmail)
      const code = this.generateCode()
      const now = Date.now()

      // Создаем объект кода
      const verificationData: VerificationCode = {
        code,
        email: normalizedEmail,
        attempts: 0,
        createdAt: now,
        expiresAt: now + (this.CODE_TTL * 1000)
      }

      // Сохраняем код в Redis
      await Promise.all([
        CacheService.set(keys.code, verificationData, this.CODE_TTL),
        CacheService.set(keys.resend, { sentAt: now }, this.RESEND_COOLDOWN)
      ])

      // Обновляем rate limit counter
      const rateData = await CacheService.get(keys.rateLimit) as { count: number; resetTime: number } | null
      if (rateData) {
        await CacheService.set(keys.rateLimit, {
          count: rateData.count + 1,
          resetTime: rateData.resetTime
        }, this.RATE_LIMIT_WINDOW)
      }

      console.log(`✅ Verification code created for ${normalizedEmail}: ${code}`)
      return { success: true, code }

    } catch (error) {
      console.error('❌ Create verification code error:', error)
      return {
        success: false,
        error: 'Ошибка создания кода. Попробуйте позже.'
      }
    }
  }

  /**
   * Проверяет код верификации
   */
  static async verifyCode(email: string, inputCode: string): Promise<VerificationResult> {
    try {
      const normalizedEmail = email.toLowerCase().trim()
      const keys = this.getKeys(normalizedEmail)
      
      // Получаем сохраненный код
      const verificationData = await CacheService.get(keys.code) as VerificationCode | null
      
      if (!verificationData) {
        return {
          success: false,
          error: 'Код не найден или истек. Запросите новый код.'
        }
      }

      // Проверяем истечение
      const now = Date.now()
      if (now > verificationData.expiresAt) {
        await CacheService.set(keys.code, null, 1) // Удаляем истекший код
        return {
          success: false,
          error: 'Код истек. Запросите новый код.'
        }
      }

      // Проверяем количество попыток
      if (verificationData.attempts >= this.MAX_ATTEMPTS) {
        await CacheService.set(keys.code, null, 1) // Удаляем заблокированный код
        return {
          success: false,
          error: 'Превышено количество попыток. Запросите новый код.'
        }
      }

      // Проверяем сам код
      if (verificationData.code !== inputCode.trim()) {
        // Увеличиваем счетчик попыток
        verificationData.attempts += 1
        await CacheService.set(keys.code, verificationData, this.CODE_TTL)
        
        const attemptsLeft = this.MAX_ATTEMPTS - verificationData.attempts
        return {
          success: false,
          error: `Неверный код. Осталось попыток: ${attemptsLeft}`,
          attemptsLeft
        }
      }

      // Код правильный - удаляем его из кэша
      await Promise.all([
        CacheService.set(keys.code, null, 1),
        CacheService.set(keys.resend, null, 1)
      ])

      console.log(`✅ Email verified successfully for ${normalizedEmail}`)
      return { success: true }

    } catch (error) {
      console.error('❌ Verify code error:', error)
      return {
        success: false,
        error: 'Ошибка проверки кода. Попробуйте позже.'
      }
    }
  }

  /**
   * Удаляет код верификации (для отмены)
   */
  static async deleteCode(email: string): Promise<void> {
    try {
      const keys = this.getKeys(email.toLowerCase())
      await Promise.all([
        CacheService.set(keys.code, null, 1),
        CacheService.set(keys.resend, null, 1)
      ])
      console.log(`🗑️ Verification code deleted for ${email}`)
    } catch (error) {
      console.error('❌ Delete verification code error:', error)
    }
  }

  /**
   * Получает информацию о статусе кода
   */
  static async getCodeStatus(email: string): Promise<{
    hasActiveCode: boolean
    expiresIn?: number // секунды
    attemptsLeft?: number
    canResend: boolean
    resendCooldown?: number // секунды
  }> {
    try {
      const normalizedEmail = email.toLowerCase()
      const keys = this.getKeys(normalizedEmail)
      
      const [verificationData, resendCheck] = await Promise.all([
        CacheService.get(keys.code) as Promise<VerificationCode | null>,
        this.canResend(normalizedEmail)
      ])

      if (!verificationData) {
        return {
          hasActiveCode: false,
          canResend: resendCheck.canResend,
          resendCooldown: resendCheck.waitSeconds
        }
      }

      const now = Date.now()
      const expiresIn = Math.max(0, Math.floor((verificationData.expiresAt - now) / 1000))
      const attemptsLeft = Math.max(0, this.MAX_ATTEMPTS - verificationData.attempts)

      return {
        hasActiveCode: expiresIn > 0 && attemptsLeft > 0,
        expiresIn,
        attemptsLeft,
        canResend: resendCheck.canResend,
        resendCooldown: resendCheck.waitSeconds
      }
    } catch (error) {
      console.error('❌ Get code status error:', error)
      return {
        hasActiveCode: false,
        canResend: true
      }
    }
  }
}