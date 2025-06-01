// src/lib/email.ts
import { Resend } from 'resend'
import { env } from '@/lib/env'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface VerificationEmailData {
  email: string
  name: string
  code: string
  expiresIn: number // минуты
}

export class EmailService {
  static async sendVerificationCode(data: VerificationEmailData): Promise<boolean> {
    try {
      const { email, name, code, expiresIn } = data
      
      const { data: result, error } = await resend.emails.send({
        from: 'VeloraBook <noreply@velorabook.com>', // замени на свой домен
        to: [email],
        subject: 'Подтвердите ваш email в VeloraBook',
        html: this.getVerificationEmailTemplate(name, code, expiresIn),
        text: `Ваш код подтверждения: ${code}. Код действителен ${expiresIn} минут.`
      })

      if (error) {
        console.error('❌ Resend email error:', error)
        return false
      }

      console.log('✅ Verification email sent:', result?.id)
      return true
    } catch (error) {
      console.error('❌ Email service error:', error)
      return false
    }
  }

  static async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      const { data: result, error } = await resend.emails.send({
        from: 'VeloraBook <welcome@velorabook.com>',
        to: [email],
        subject: 'Добро пожаловать в VeloraBook! 🎉',
        html: this.getWelcomeEmailTemplate(name),
        text: `Добро пожаловать в VeloraBook, ${name}! Теперь вы можете создавать персональные книги.`
      })

      if (error) {
        console.error('❌ Welcome email error:', error)
        return false
      }

      console.log('✅ Welcome email sent:', result?.id)
      return true
    } catch (error) {
      console.error('❌ Welcome email service error:', error)
      return false
    }
  }

  private static getVerificationEmailTemplate(name: string, code: string, expiresIn: number): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Подтвердите ваш email</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; }
        .logo { color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 24px; color: #1f2937; margin-bottom: 20px; }
        .code-container { text-align: center; margin: 30px 0; }
        .code { font-size: 36px; font-weight: bold; color: #9333ea; background-color: #f3f4f6; padding: 20px 30px; border-radius: 12px; letter-spacing: 8px; display: inline-block; border: 2px dashed #9333ea; }
        .instructions { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .footer { background-color: #f3f4f6; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
        .button { display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">✨ VeloraBook</h1>
        </div>
        
        <div class="content">
          <h2 class="greeting">Привет, ${name}! 👋</h2>
          
          <p>Спасибо за регистрацию в VeloraBook! Для завершения создания аккаунта введите код подтверждения:</p>
          
          <div class="code-container">
            <div class="code">${code}</div>
          </div>
          
          <div class="instructions">
            <strong>📋 Инструкции:</strong>
            <ul>
              <li>Вернитесь на страницу регистрации</li>
              <li>Введите код в поле подтверждения</li>
              <li>Код действителен <strong>${expiresIn} минут</strong></li>
              <li>Если код не работает, запросите новый</li>
            </ul>
          </div>
          
          <p>После подтверждения вы сможете создавать персональные книги с помощью ИИ! 📚</p>
          
          <p class="warning">
            ⚠️ Если вы не регистрировались в VeloraBook, просто проигнорируйте это письмо.
          </p>
        </div>
        
        <div class="footer">
          <p>С любовью, команда VeloraBook ❤️</p>
          <p>Если у вас вопросы, напишите нам: support@velorabook.com</p>
          <p style="margin-top: 20px; font-size: 12px;">
            © 2025 VeloraBook. Все права защищены.
          </p>
        </div>
      </div>
    </body>
    </html>
    `
  }

  private static getWelcomeEmailTemplate(name: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Добро пожаловать в VeloraBook!</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; }
        .logo { color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 24px; color: #1f2937; margin-bottom: 20px; }
        .feature { background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #9333ea; }
        .button { display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f3f4f6; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="logo">🎉 VeloraBook</h1>
        </div>
        
        <div class="content">
          <h2 class="greeting">Добро пожаловать, ${name}!</h2>
          
          <p>Ваш аккаунт успешно создан! Теперь вы можете создавать удивительные персональные книги.</p>
          
          <div class="feature">
            <strong>💝 Романтические книги</strong> - Создайте историю ваших отношений
          </div>
          
          <div class="feature">
            <strong>👨‍👩‍👧‍👦 Семейные хроники</strong> - Сохраните семейную историю для потомков
          </div>
          
          <div class="feature">
            <strong>🤝 Книги дружбы</strong> - Отпразднуйте особенные отношения
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard" class="button">
              Создать мою первую книгу 📚
            </a>
          </div>
          
          <p>Если у вас есть вопросы, мы всегда готовы помочь!</p>
        </div>
        
        <div class="footer">
          <p>С любовью, команда VeloraBook ❤️</p>
          <p>support@velorabook.com | velorabook.com</p>
        </div>
      </div>
    </body>
    </html>
    `
  }
}

// Типы для TypeScript
export interface EmailVerificationResult {
  success: boolean
  messageId?: string
  error?: string
}