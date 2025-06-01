// src/app/api/auth/verification-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VerificationService } from '@/lib/verification'

const StatusSchema = z.object({
  email: z.string().email('Некорректный email').toLowerCase()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = StatusSchema.parse(body)

    const status = await VerificationService.getCodeStatus(email)

    return NextResponse.json({
      success: true,
      ...status
    })

  } catch (error) {
    console.error('❌ Verification status error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: error.errors[0].message
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Ошибка получения статуса'
    }, { status: 500 })
  }
}