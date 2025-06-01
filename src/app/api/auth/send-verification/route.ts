// src/app/api/auth/send-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VerificationService } from '@/lib/verification'
import { EmailService } from '@/lib/email'
import { prisma } from '@/lib/prisma'

const SendVerificationSchema = z.object({
  email: z.string().email('Некорректный email').toLowerCase()
})

export async function POST(request: NextRequest) {
  try {
    // Парсим и валидируем данные
    const body = await request.json()
    const { email } = SendVerificationSchema.parse(body)

    // Проверяем, существует ли пользователь
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, isVerified: true }
    })

    if (!user) {
      return NextResponse.json({
        error: 'Пользователь с таким email не найден'
      }, { status: 404 })
    }

    if (user.isVerified) {
      return NextResponse.json({
        error: 'Email уже подтвержден'
      }, { status: 400 })
    }

    // Создаем код верификации
    const codeResult = await VerificationService.createCode(email)

    if (!codeResult.success) {
      return NextResponse.json({
        error: codeResult.error,
        waitSeconds: codeResult.waitSeconds
      }, { status: 429 })
    }

    // Отправляем email с кодом
    const emailSent = await EmailService.sendVerificationCode({
      email,
      name: user.name,
      code: codeResult.code!,
      expiresIn: 10
    })

    if (!emailSent) {
      // Если email не отправился, удаляем код
      await VerificationService.deleteCode(email)
      return NextResponse.json({
        error: 'Ошибка отправки email. Попробуйте позже.'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Код отправлен на ваш email',
      expiresIn: 600 // 10 минут в секундах
    })

  } catch (error) {
    console.error('❌ Send verification error:', error)
    
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