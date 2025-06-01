'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Clock, RefreshCw, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'

export default function VerifyEmailPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 минут по умолчанию
  const [canResend, setCanResend] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [statusChecked, setStatusChecked] = useState(false)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Проверяем статус пользователя
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated' && session?.user?.isVerified) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Таймер для истечения кода
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  // Таймер для cooldown переотправки
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [resendCooldown])

  // 🔧 ИСПРАВЛЕНО: Проверяем статус кода с задержкой и fallback
  useEffect(() => {
    if (session?.user?.email && !statusChecked) {
      console.log('🔍 Starting code status check for:', session.user.email)
      
      // Даем время серверу сохранить код, затем проверяем
      const timer = setTimeout(async () => {
        try {
          await checkCodeStatus()
          setStatusChecked(true)
          
          // 🔧 FALLBACK: Если после проверки timeLeft все еще 0, ставим дефолт
          setTimeout(() => {
            if (timeLeft <= 0) {
              console.log('🔧 Fallback: setting default time (600s)')
              setTimeLeft(590) // Чуть меньше 10 минут на всякий случай
            }
          }, 500)
          
        } catch (error) {
          console.error('❌ Status check failed, using fallback time')
          setTimeLeft(590) // Fallback время
          setStatusChecked(true)
        }
      }, 3000) // Ждем 3 секунды перед проверкой
      
      return () => clearTimeout(timer)
    }
  }, [session?.user?.email, statusChecked])

  const checkCodeStatus = async () => {
    if (!session?.user?.email) return

    try {
      console.log('🔍 Requesting status for:', session.user.email)
      
      const response = await fetch('/api/auth/verification-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email })
      })

      const data = await response.json()
      console.log('🔍 Status response:', data)
      
      if (data.success) {
        // 🔧 ИСПРАВЛЕНО: Проверяем что expiresIn разумное число
        const expiresIn = data.expiresIn || 0
        
        if (expiresIn > 0 && expiresIn <= 600) {
          console.log('✅ Setting timeLeft to:', expiresIn)
          setTimeLeft(expiresIn)
        } else {
          console.log('⚠️ Invalid expiresIn:', expiresIn, 'using fallback')
          setTimeLeft(590) // Fallback
        }
        
        setCanResend(data.canResend)
        setResendCooldown(data.resendCooldown || 0)
      } else {
        console.log('⚠️ Status check unsuccessful, using fallback time')
        setTimeLeft(590)
      }
    } catch (error) {
      console.error('❌ Status check error:', error)
      // 🔧 FALLBACK: При ошибке ставим дефолтное время
      setTimeLeft(590)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Только цифры

    const newCode = [...code]
    newCode[index] = value.slice(-1) // Только последняя цифра
    setCode(newCode)
    setError('')

    // Автоматический переход к следующему полю
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Автоматическая отправка при заполнении всех полей
    if (newCode.every(digit => digit !== '') && !isLoading) {
      setTimeout(() => handleVerify(newCode.join('')), 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace - переход к предыдущему полю
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    // Enter - попытка верификации
    if (e.key === 'Enter') {
      handleVerify()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      setError('')
      
      // Автоматическая отправка
      setTimeout(() => handleVerify(pastedData), 100)
    }
  }

  const handleVerify = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code.join('')
    
    if (verificationCode.length !== 6) {
      setError('Введите полный 6-значный код')
      return
    }

    if (!session?.user?.email) {
      setError('Email не найден в сессии')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('🔍 Verifying code:', verificationCode)
      
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          code: verificationCode
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        
        // Обновляем сессию
        await update({
          ...session,
          user: {
            ...session.user,
            isVerified: true
          }
        })

        // Перенаправляем на дашборд через 2 секунды
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)

      } else {
        setError(data.error || 'Неверный код')
        
        // Показываем оставшиеся попытки
        if (data.attemptsLeft !== undefined) {
          setError(`${data.error} (осталось попыток: ${data.attemptsLeft})`)
        }
        
        // Очищаем поля при ошибке
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      setError('Ошибка сети. Попробуйте еще раз.')
      console.error('Verification error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!session?.user?.email || !canResend || isResending) return

    setIsResending(true)
    setError('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTimeLeft(600) // Сброс таймера на 10 минут
        setCanResend(false)
        setResendCooldown(60) // 1 минута cooldown
        setCode(['', '', '', '', '', '']) // Очищаем поля
        setStatusChecked(false) // Сброс статуса для повторной проверки
        inputRefs.current[0]?.focus()
        
        // Показываем уведомление об успехе
        setError('') // Очищаем ошибки
      } else {
        setError(data.error || 'Ошибка отправки кода')
        
        if (data.waitSeconds) {
          setResendCooldown(data.waitSeconds)
          setCanResend(false)
        }
      }
    } catch (error) {
      setError('Ошибка сети при отправке кода')
      console.error('Resend error:', error)
    } finally {
      setIsResending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Показываем загрузку если сессия еще загружается
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900">Загружаем...</h2>
        </div>
      </div>
    )
  }

  // Экран успеха
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email подтвержден! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Ваш аккаунт успешно активирован. Перенаправляем в дашборд...
            </p>
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              VeloraBook
            </h1>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Подтвердите email</h2>
          <p className="text-gray-600">
            Мы отправили 6-значный код на <br />
            <strong>{session?.user?.email}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Debug информация (только в development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
              Debug: timeLeft={timeLeft}, statusChecked={statusChecked}, canResend={canResend}
            </div>
          )}

          {/* Код верификации */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Введите код подтверждения
            </label>
            
            <div className="flex space-x-3 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg mb-6">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Timer */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {timeLeft > 0 
                  ? `Код действителен еще ${formatTime(timeLeft)}`
                  : 'Код истек - запросите новый'
                }
              </span>
            </div>
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isLoading || code.some(digit => digit === '') || timeLeft <= 0}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 transition-all mb-4"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Проверяем код...
              </div>
            ) : timeLeft <= 0 ? (
              'Код истек'
            ) : (
              'Подтвердить email'
            )}
          </button>

          {/* Resend Button */}
          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={!canResend || isResending || resendCooldown > 0}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                  Отправляем...
                </div>
              ) : resendCooldown > 0 ? (
                `Повторная отправка через ${resendCooldown}с`
              ) : (
                'Отправить код повторно'
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">
              Не получили код? Проверьте папку "Спам"
            </p>
            <Link href="/auth/signin" className="text-sm text-purple-600 hover:text-purple-500">
              ← Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}