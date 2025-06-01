import { NextRequest, NextResponse } from 'next/server'
import { serviceAvailability } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Динамический импорт для условной загрузки
    const [
      { userService },
      { validateWithSchema, UserRegistrationSchema },
      { VerificationService },
      { EmailService }
    ] = await Promise.all([
      import('@/auth'),
      import('@/lib/validation'),
      import('@/lib/verification'),
      import('@/lib/email')
    ])
    
    // Валидируем данные
    const validatedData = validateWithSchema(UserRegistrationSchema, body)
    
    // Создаем пользователя (isVerified: false)
    const user = await userService.createUser(validatedData)

    // Если email сервис доступен, отправляем код верификации
    if (serviceAvailability.email) {
      try {
        // Создаем код верификации
        const codeResult = await VerificationService.createCode(user.email)
        
        if (codeResult.success && codeResult.code) {
          // Отправляем email с кодом
          const emailSent = await EmailService.sendVerificationCode({
            email: user.email,
            name: user.name,
            code: codeResult.code,
            expiresIn: 10
          })

          if (emailSent) {
            return NextResponse.json({
              success: true,
              requiresVerification: true,
              message: 'Пользователь создан. Код подтверждения отправлен на email.',
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isVerified: false
              }
            }, { status: 201 })
          } else {
            console.warn('⚠️ User created but email failed to send')
          }
        }
      } catch (emailError) {
        console.error('❌ Email verification failed during registration:', emailError)
        // Продолжаем без email верификации
      }
    }

    // Fallback: регистрация без email верификации
    return NextResponse.json({
      success: true,
      requiresVerification: false,
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: !serviceAvailability.email // Если email недоступен, считаем верифицированным
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 400 }
    )
  }
}