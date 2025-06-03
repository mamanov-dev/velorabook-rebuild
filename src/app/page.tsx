'use client'

import { useSession, signOut } from 'next-auth/react'
import { Sparkles, Star, Clock, Globe, Heart, Users, BookOpen, ArrowRight, User, LogOut, Settings, Briefcase, GraduationCap, Calendar } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  const { data: session, status } = useSession()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              VeloraBook
            </h1>
          </Link>
          <nav className="hidden md:flex space-x-6 items-center">
            <a href="#how-it-works" className="text-gray-600 hover:text-purple-600">Как работает</a>
            <a href="#book-types" className="text-gray-600 hover:text-purple-600">Типы книг</a>
            <a href="#pricing" className="text-gray-600 hover:text-purple-600">Цены</a>
            
            {status === 'loading' ? (
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {session.user?.image ? (
                    <Image 
                      src={session.user.image} 
                      alt={session.user.name || 'Аватар'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name?.split(' ')[0] || 'Пользователь'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Link href="/dashboard">
                    <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                      Дашборд
                    </button>
                  </Link>
                  <Link href="/profile">
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                      <Settings className="w-4 h-4" />
                    </button>
                  </Link>
                  <button 
                    onClick={handleSignOut}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    title="Выйти"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/auth/signin">
                  <button className="text-gray-600 hover:text-purple-600 transition-colors">
                    Войти
                  </button>
                </Link>
                <Link href="/auth/signup">
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Регистрация
                  </button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-800 mb-6">
            Создайте персональную книгу с помощью 
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"> ИИ</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Выберите из 20+ вариантов персональных книг для любой ситуации. 
            От романтических историй до профессиональных благодарностей — ИИ создаст уникальную книгу за 15 минут.
          </p>

          {/* Stats */}
          <div className="flex justify-center items-center space-x-8 mb-12 text-sm text-gray-500">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-500 mr-1" />
              <span>4.9/5 (2,847 отзывов)</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>Готово за 15 минут</span>
            </div>
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-1" />
              <span>Доставка в 50+ стран</span>
            </div>
          </div>

          {session ? (
            <Link href="/dashboard">
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg">
                Перейти в дашборд
                <ArrowRight className="w-5 h-5 ml-2 inline" />
              </button>
            </Link>
          ) : (
            <div className="space-y-4">
              <Link href="/create">
                <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg">
                  Создать мою книгу
                  <ArrowRight className="w-5 h-5 ml-2 inline" />
                </button>
              </Link>
              <p className="text-sm text-gray-500">
                Или{' '}
                <Link href="/auth/signup" className="text-purple-600 hover:text-purple-500 font-medium">
                  зарегистрируйтесь
                </Link>
                {' '}для сохранения ваших книг
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ✨ ОБНОВЛЕННАЯ СЕКЦИЯ ТИПОВ КНИГ */}
      <section id="book-types" className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-800 mb-4">
          20+ типов персональных книг
        </h3>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Выберите категорию, затем конкретного получателя. Каждая комбинация имеет уникальные вопросы и стиль повествования.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {/* Романтические книги */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center mb-6">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Романтические книги</h4>
            <p className="text-gray-600 mb-4">Для любимых людей</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                Для девушки • 2,990₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                Для парня • 2,990₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                Для жены • 3,490₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                Для мужа • 3,490₽
              </div>
            </div>
            
            <Link href={session ? "/create" : "/auth/signin?callbackUrl=/create"}>
              <button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-4 rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all">
                Выбрать →
              </button>
            </Link>
          </div>

          {/* Семейные книги */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Семейные книги</h4>
            <p className="text-gray-600 mb-4">Для родных и близких</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Для мамы/папы • 3,490₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Для дочери/сына • 3,490₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Для бабушки/дедушки • 3,490₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Для сестры/брата • 3,490₽
              </div>
            </div>
            
            <Link href={session ? "/create" : "/auth/signin?callbackUrl=/create"}>
              <button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all">
                Выбрать →
              </button>
            </Link>
          </div>

          {/* Дружеские книги */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Дружеские книги</h4>
            <p className="text-gray-600 mb-4">Для лучших друзей</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Для лучшей подруги • 2,490₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Для лучшего друга • 2,490₽
              </div>
            </div>
            
            <Link href={session ? "/create" : "/auth/signin?callbackUrl=/create"}>
              <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all">
                Выбрать →
              </button>
            </Link>
          </div>

          {/* Профессиональные книги */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-6">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Профессиональные</h4>
            <p className="text-gray-600 mb-4">Для работы и карьеры</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Для коллеги • 2,790₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Для начальника • 2,990₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Для наставника • 2,990₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Для учителя • 2,990₽
              </div>
            </div>
            
            <Link href={session ? "/create" : "/auth/signin?callbackUrl=/create"}>
              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
                Выбрать →
              </button>
            </Link>
          </div>

          {/* Особые случаи */}
          <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Особые случаи</h4>
            <p className="text-gray-600 mb-4">Для уникальных событий</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                На юбилей • 3,990₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Для себя • 3,490₽
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                На свадьбу • 3,990₽
              </div>
            </div>
            
            <Link href={session ? "/create" : "/auth/signin?callbackUrl=/create"}>
              <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                Выбрать →
              </button>
            </Link>
          </div>

          {/* Попробовать демо */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-dashed border-amber-300">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Попробовать демо</h4>
            <p className="text-gray-600 mb-6">Посмотрите пример готовой книги</p>
            
            <Link href="/book">
              <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all">
                Демо книга →
              </button>
            </Link>
          </div>
        </div>

        {/* Дополнительная информация */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            <strong>Новая система:</strong> Выберите категорию → Выберите получателя → Персонализированные вопросы
          </p>
          <Link href="/create">
            <button className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold">
              Начать создание книги
            </button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Как это работает
          </h3>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Выберите категорию</h4>
              <p className="text-sm text-gray-600">Романтика, семья, дружба, работа или особый случай</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Выберите получателя</h4>
              <p className="text-sm text-gray-600">Конкретный человек из 20+ вариантов</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Ответьте на вопросы</h4>
              <p className="text-sm text-gray-600">Персонализированные под тип отношений</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">4</span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Получите книгу</h4>
              <p className="text-sm text-gray-600">ИИ создаст уникальную историю за 15 минут</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href={session ? "/dashboard" : "/auth/signup"}>
              <button className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors">
                {session ? "Перейти в дашборд" : "Начать создание"}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Auth CTA Section (only for non-authenticated users) */}
      {!session && (
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-16 text-white">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-3xl font-bold mb-4">
              Готовы создать уникальную персональную книгу?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Выберите из 20+ вариантов и создайте идеальный подарок за 15 минут
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/auth/signup">
                <button className="bg-white text-purple-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
                  Создать аккаунт
                </button>
              </Link>
              <Link href="/auth/signin">
                <button className="border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-purple-600 transition-colors font-semibold">
                  Уже есть аккаунт
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <span className="text-xl font-bold">VeloraBook</span>
              </div>
              <p className="text-gray-400">
                Создавайте персональные книги с помощью ИИ. 20+ типов для любой ситуации.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Продукт</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#how-it-works" className="hover:text-white">Как работает</a></li>
                <li><a href="#book-types" className="hover:text-white">Типы книг</a></li>
                <li><a href="#pricing" className="hover:text-white">Цены</a></li>
                <li><Link href="/book" className="hover:text-white">Демо</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Поддержка</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Помощь</a></li>
                <li><a href="#" className="hover:text-white">Контакты</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Компания</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">О нас</a></li>
                <li><a href="#" className="hover:text-white">Блог</a></li>
                <li><a href="#" className="hover:text-white">Карьера</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 VeloraBook. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}