// src/app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VerificationService } from '@/lib/verification'
import { EmailService } from '@/lib/email'
import { prisma } from '@/lib/prisma'

const ResendSchema = z.object({
  email: z.string().email('Некорректный email').toLowerCase()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = ResendSchema.parse(body)

    // Проверяем пользователя
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, isVerified: true }
    })

    if (!user) {
      return NextResponse.json({
        error: 'Пользователь не найден'
      }, { status: 404 })
    }

    if (user.isVerified) {
      return NextResponse.json({
        error: 'Email уже подтвержден'
      }, { status: 400 })
    }

    // Удаляем старый код и создаем новый
    await VerificationService.deleteCode(email)
    
    const codeResult = await VerificationService.createCode(email)

    if (!codeResult.success) {
      return NextResponse.json({
        error: codeResult.error,
        waitSeconds: codeResult.waitSeconds
      }, { status: 429 })
    }

    // Отправляем новый код
    const emailSent = await EmailService.sendVerificationCode({
      email,
      name: user.name,
      code: codeResult.code!,
      expiresIn: 10
    })

    if (!emailSent) {
      await VerificationService.deleteCode(email)
      return NextResponse.json({
        error: 'Ошибка отправки email'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Новый код отправлен на ваш email'
    })

  } catch (error) {
    console.error('❌ Resend verification error:', error)
    
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