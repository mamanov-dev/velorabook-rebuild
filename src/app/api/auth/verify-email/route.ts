// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VerificationService } from '@/lib/verification'
import { EmailService } from '@/lib/email'
import { prisma } from '@/lib/prisma'

const VerifyEmailSchema = z.object({
  email: z.string().email('Некорректный email').toLowerCase(),
  code: z.string().length(6, 'Код должен содержать 6 цифр').regex(/^\d+$/, 'Код должен состоять только из цифр')
})

export async function POST(request: NextRequest) {
  try {
    // Парсим и валидируем данные
    const body = await request.json()
    const { email, code } = VerifyEmailSchema.parse(body)

    // Проверяем код
    const verificationResult = await VerificationService.verifyCode(email, code)

    if (!verificationResult.success) {
      return NextResponse.json({
        error: verificationResult.error,
        attemptsLeft: verificationResult.attemptsLeft
      }, { status: 400 })
    }

    // Обновляем пользователя в базе данных
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        emailVerified: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    })

    // Отправляем welcome email
    try {
      await EmailService.sendWelcomeEmail(email, updatedUser.name)
    } catch (emailError) {
      console.error('❌ Welcome email failed:', emailError)
      // Не останавливаем процесс если welcome email не отправился
    }

    console.log(`✅ User email verified: ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Email успешно подтвержден!',
      user: updatedUser
    })

  } catch (error) {
    console.error('❌ Verify email error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: error.errors[0].message
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}