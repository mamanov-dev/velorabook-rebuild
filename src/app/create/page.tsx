'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Heart, Users, BookOpen, Sparkles, Briefcase, Star, User, Handshake, Crown, GraduationCap, Calendar, Camera } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBook } from '@/contexts/BookContext';
import ImageUploader from '@/components/ImageUploader';
import { useImageUpload } from '@/hooks/useImageUpload';
import { BookCategory, BookRecipient, BookTypeUtils } from '@/lib/validation';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'file';
  placeholder?: string;
  required: boolean;
}

interface BookRecipientOption {
  id: BookRecipient;
  title: string;
  description: string;
  price: string;
  questions: Question[];
}

interface BookCategoryOption {
  id: BookCategory;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  recipients: BookRecipientOption[];
}

// ✨ НОВАЯ СТРУКТУРА ТИПОВ КНИГ
const bookCategories: BookCategoryOption[] = [
  {
    id: 'romantic',
    title: 'Романтические книги',
    description: 'Для любимых людей',
    icon: Heart,
    color: 'from-pink-500 to-rose-600',
    recipients: [
      {
        id: 'girlfriend',
        title: 'Для девушки',
        description: 'Романтическая история ваших отношений',
        price: '2,990₽',
        questions: [
          {
            id: 'girlfriend_name',
            text: 'Как зовут вашу девушку?',
            type: 'text',
            placeholder: 'Полное имя или как вы ее называете',
            required: true
          },
          {
            id: 'relationship_duration',
            text: 'Как долго вы встречаетесь?',
            type: 'text',
            placeholder: '6 месяцев, 2 года, с лета 2022...',
            required: true
          },
          {
            id: 'first_meeting',
            text: 'Где и как вы познакомились?',
            type: 'textarea',
            placeholder: 'Расскажите детально о вашей первой встрече, что почувствовали, о чем говорили... (минимум 60 слов)',
            required: true
          },
          {
            id: 'what_attracts',
            text: 'Что вас больше всего привлекает в ней?',
            type: 'textarea',
            placeholder: 'Внешность, характер, манера говорить, смеяться... (минимум 50 слов)',
            required: true
          },
          {
            id: 'first_date',
            text: 'Расскажите о вашем первом свидании',
            type: 'textarea',
            placeholder: 'Куда пошли, что делали, как прошел вечер, что чувствовали... (минимум 70 слов)',
            required: true
          },
          {
            id: 'love_realization',
            text: 'Когда поняли, что влюбились?',
            type: 'textarea',
            placeholder: 'Опишите момент осознания, где были, что происходило... (минимум 60 слов)',
            required: true
          },
          {
            id: 'special_moments',
            text: 'Самые особенные моменты вместе',
            type: 'textarea',
            placeholder: 'Романтические вечера, путешествия, смешные ситуации... (минимум 80 слов)',
            required: true
          },
          {
            id: 'her_qualities',
            text: 'За какие качества вы ее любите?',
            type: 'textarea',
            placeholder: 'Доброта, ум, чувство юмора, как заботится о вас... (минимум 60 слов)',
            required: true
          },
          {
            id: 'future_plans',
            text: 'Планируете ли серьезные отношения/свадьбу?',
            type: 'textarea',
            placeholder: 'Ваши мечты о совместном будущем, планы... (минимум 50 слов)',
            required: true
          },
          {
            id: 'love_declaration',
            text: 'Что хотите сказать ей через эту книгу?',
            type: 'textarea',
            placeholder: 'Ваши самые искренние слова любви и благодарности... (минимум 80 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите ваши самые дорогие совместные фотографии',
            type: 'file',
            required: true
          }
        ]
      },
      {
        id: 'boyfriend',
        title: 'Для парня',
        description: 'История любви от женского сердца',
        price: '2,990₽',
        questions: [
          {
            id: 'boyfriend_name',
            text: 'Как зовут вашего парня?',
            type: 'text',
            placeholder: 'Полное имя или как вы его называете',
            required: true
          },
          {
            id: 'relationship_duration',
            text: 'Как долго вы встречаетесь?',
            type: 'text',
            placeholder: '8 месяцев, 3 года, с весны 2021...',
            required: true
          },
          {
            id: 'first_impression',
            text: 'Какое первое впечатление он на вас произвел?',
            type: 'textarea',
            placeholder: 'Что заметили сразу, что привлекло внимание... (минимум 50 слов)',
            required: true
          },
          {
            id: 'his_charm',
            text: 'Что в нем самое обаятельное?',
            type: 'textarea',
            placeholder: 'Улыбка, чувство юмора, манера держаться... (минимум 60 слов)',
            required: true
          },
          {
            id: 'how_he_cares',
            text: 'Как он о вас заботится?',
            type: 'textarea',
            placeholder: 'Конкретные примеры его заботы, поддержки... (минимум 70 слов)',
            required: true
          },
          {
            id: 'proud_moments',
            text: 'Чем в нем вы больше всего гордитесь?',
            type: 'textarea',
            placeholder: 'Достижения, качества характера, поступки... (минимум 60 слов)',
            required: true
          },
          {
            id: 'funny_memories',
            text: 'Самые смешные моменты с ним',
            type: 'textarea',
            placeholder: 'Ситуации, над которыми смеетесь до сих пор... (минимум 70 слов)',
            required: true
          },
          {
            id: 'perfect_day',
            text: 'Опишите ваш идеальный день вдвоем',
            type: 'textarea',
            placeholder: 'С утра до вечера - что бы делали, где были... (минимум 80 слов)',
            required: true
          },
          {
            id: 'why_love_him',
            text: 'За что вы его любите больше всего?',
            type: 'textarea',
            placeholder: 'Глубокие чувства, что делает его особенным... (минимум 70 слов)',
            required: true
          },
          {
            id: 'love_message',
            text: 'Ваше послание любви для него',
            type: 'textarea',
            placeholder: 'Самые важные слова, которые хотите ему сказать... (минимум 80 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите ваши лучшие совместные фотографии',
            type: 'file',
            required: true
          }
        ]
      },
      {
        id: 'wife',
        title: 'Для жены',
        description: 'Книга благодарности спутнице жизни',
        price: '3,490₽',
        questions: [
          {
            id: 'wife_name',
            text: 'Как зовут вашу жену?',
            type: 'text',
            placeholder: 'Полное имя или домашнее прозвище',
            required: true
          },
          {
            id: 'marriage_duration',
            text: 'Сколько лет в браке?',
            type: 'text',
            placeholder: '5 лет, 15 лет, с 2010 года...',
            required: true
          },
          {
            id: 'dating_story',
            text: 'История ваших отношений до свадьбы',
            type: 'textarea',
            placeholder: 'Как встретились, развивались отношения, решение пожениться... (минимум 80 слов)',
            required: true
          },
          {
            id: 'wedding_memories',
            text: 'Воспоминания о свадебном дне',
            type: 'textarea',
            placeholder: 'Самые яркие моменты торжества, эмоции... (минимум 70 слов)',
            required: true
          },
          {
            id: 'life_together',
            text: 'Как строили совместную жизнь?',
            type: 'textarea',
            placeholder: 'Первый дом, привычки, традиции семьи... (минимум 80 слов)',
            required: true
          },
          {
            id: 'her_role',
            text: 'Какая она жена и хозяйка?',
            type: 'textarea',
            placeholder: 'Как ведет дом, заботится о семье, создает уют... (минимум 70 слов)',
            required: true
          },
          {
            id: 'difficult_times',
            text: 'Как вместе преодолевали трудности?',
            type: 'textarea',
            placeholder: 'Сложные периоды и как поддерживали друг друга... (минимум 80 слов)',
            required: true
          },
          {
            id: 'children_topic',
            text: 'Если есть дети - какая она мать?',
            type: 'textarea',
            placeholder: 'Как воспитывает детей, какие у нее материнские качества... (минимум 60 слов)',
            required: false
          },
          {
            id: 'gratitude',
            text: 'За что вы благодарны жене больше всего?',
            type: 'textarea',
            placeholder: 'Что она дала вашей жизни, как изменила вас... (минимум 80 слов)',
            required: true
          },
          {
            id: 'love_declaration',
            text: 'Слова любви, которые хотите сказать жене',
            type: 'textarea',
            placeholder: 'Самые искренние чувства и обещания... (минимум 90 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии вашей семейной жизни',
            type: 'file',
            required: true
          }
        ]
      },
      {
        id: 'husband',
        title: 'Для мужа',
        description: 'Признание в любви спутнику жизни',
        price: '3,490₽',
        questions: [
          {
            id: 'husband_name',
            text: 'Как зовут вашего мужа?',
            type: 'text',
            placeholder: 'Полное имя или как вы его называете дома',
            required: true
          },
          {
            id: 'marriage_years',
            text: 'Сколько лет в браке?',
            type: 'text',
            placeholder: '3 года, 20 лет, с 2015 года...',
            required: true
          },
          {
            id: 'courtship_memories',
            text: 'Воспоминания о времени ухаживаний',
            type: 'textarea',
            placeholder: 'Как он вас покорил, самые романтичные моменты... (минимум 80 слов)',
            required: true
          },
          {
            id: 'why_chose_him',
            text: 'Почему выбрали именно его в мужья?',
            type: 'textarea',
            placeholder: 'Качества, которые убедили в правильности выбора... (минимум 70 слов)',
            required: true
          },
          {
            id: 'husband_qualities',
            text: 'Каким он стал мужем?',
            type: 'textarea',
            placeholder: 'Как заботится о семье, какой он партнер в браке... (минимум 80 слов)',
            required: true
          },
          {
            id: 'his_support',
            text: 'Как он вас поддерживает?',
            type: 'textarea',
            placeholder: 'В трудные моменты, в достижении целей... (минимум 70 слов)',
            required: true
          },
          {
            id: 'father_role',
            text: 'Если есть дети - какой он отец?',
            type: 'textarea',
            placeholder: 'Как общается с детьми, какие отцовские качества... (минимум 60 слов)',
            required: false
          },
          {
            id: 'growth_together',
            text: 'Как вы росли и развивались вместе?',
            type: 'textarea',
            placeholder: 'Чему научились друг у друга, как изменились... (минимум 80 слов)',
            required: true
          },
          {
            id: 'appreciation',
            text: 'За что цените его больше всего?',
            type: 'textarea',
            placeholder: 'Что делает его особенным мужем и человеком... (минимум 80 слов)',
            required: true
          },
          {
            id: 'love_words',
            text: 'Что хотите сказать мужу через эту книгу?',
            type: 'textarea',
            placeholder: 'Слова благодарности, любви и планы на будущее... (минимум 90 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии вашей семейной истории',
            type: 'file',
            required: true
          }
        ]
      }
    ]
  },
  {
    id: 'family',
    title: 'Семейные книги',
    description: 'Для родных и близких',
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
    recipients: [
      {
        id: 'mother',
        title: 'Для мамы',
        description: 'Книга благодарности самому дорогому человеку',
        price: '3,490₽',
        questions: [
          {
            id: 'mother_name',
            text: 'Как зовут вашу маму?',
            type: 'text',
            placeholder: 'Полное имя или как вы ее называете',
            required: true
          },
          {
            id: 'childhood_memories',
            text: 'Самые яркие детские воспоминания с мамой',
            type: 'textarea',
            placeholder: 'Игры, сказки на ночь, совместные занятия... (минимум 80 слов)',
            required: true
          },
          {
            id: 'mother_care',
            text: 'Как мама о вас заботилась в детстве?',
            type: 'textarea',
            placeholder: 'Болезни, школьные проблемы, как поддерживала... (минимум 70 слов)',
            required: true
          },
          {
            id: 'life_lessons',
            text: 'Какие жизненные уроки дала вам мама?',
            type: 'textarea',
            placeholder: 'Мудрые советы, принципы которые привила... (минимум 80 слов)',
            required: true
          },
          {
            id: 'mother_strength',
            text: 'В чем проявляется сила характера вашей мамы?',
            type: 'textarea',
            placeholder: 'Как преодолевала трудности, где брала силы... (минимум 70 слов)',
            required: true
          },
          {
            id: 'mother_sacrifice',
            text: 'Чем мама жертвовала ради вас и семьи?',
            type: 'textarea',
            placeholder: 'Карьера, личные интересы, время... (минимум 70 слов)',
            required: true
          },
          {
            id: 'adult_relationship',
            text: 'Как изменились ваши отношения, когда вы повзрослели?',
            type: 'textarea',
            placeholder: 'Стали ли ближе, о чем теперь говорите... (минимум 60 слов)',
            required: true
          },
          {
            id: 'mother_pride',
            text: 'Чем мама гордится в вас больше всего?',
            type: 'textarea',
            placeholder: 'Ваши достижения, качества характера... (минимум 50 слов)',
            required: true
          },
          {
            id: 'gratitude_specifics',
            text: 'За что конкретно вы благодарны маме?',
            type: 'textarea',
            placeholder: 'Что она дала вашей жизни, как повлияла на вас... (минимум 90 слов)',
            required: true
          },
          {
            id: 'love_declaration',
            text: 'Что хотите сказать маме?',
            type: 'textarea',
            placeholder: 'Слова любви, благодарности и признательности... (минимум 80 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии с мамой разных лет',
            type: 'file',
            required: true
          }
        ]
      },
      {
        id: 'father',
        title: 'Для папы',
        description: 'Признание в любви и уважении отцу',
        price: '3,490₽',
        questions: [
          {
            id: 'father_name',
            text: 'Как зовут вашего папу?',
            type: 'text',
            placeholder: 'Полное имя или как вы его называете',
            required: true
          },
          {
            id: 'father_work',
            text: 'Расскажите о работе папы и его профессионализме',
            type: 'textarea',
            placeholder: 'Профессия, карьера, как относится к работе... (минимум 60 слов)',
            required: true
          },
          {
            id: 'father_wisdom',
            text: 'Какие мужские уроки преподал вам отец?',
            type: 'textarea',
            placeholder: 'О жизни, отношениях, ответственности... (минимум 70 слов)',
            required: true
          },
          {
            id: 'shared_activities',
            text: 'Что вы любили делать вместе с папой?',
            type: 'textarea',
            placeholder: 'Рыбалка, футбол, ремонт, поездки... (минимум 70 слов)',
            required: true
          },
          {
            id: 'father_protection',
            text: 'Как папа защищал и оберегал семью?',
            type: 'textarea',
            placeholder: 'Конкретные примеры его заботы и защиты... (минимум 70 слов)',
            required: true
          },
          {
            id: 'father_character',
            text: 'Какие качества характера папы вы больше всего цените?',
            type: 'textarea',
            placeholder: 'Честность, надежность, чувство юмора... (минимум 60 слов)',
            required: true
          },
          {
            id: 'difficult_times',
            text: 'Как папа справлялся с трудными периодами?',
            type: 'textarea',
            placeholder: 'Кризисы, болезни, проблемы - где брал силы... (минимум 70 слов)',
            required: true
          },
          {
            id: 'inherited_traits',
            text: 'Что вы унаследовали от отца?',
            type: 'textarea',
            placeholder: 'Черты характера, привычки, взгляды на жизнь... (минимум 60 слов)',
            required: true
          },
          {
            id: 'respect_reasons',
            text: 'За что вы уважаете отца больше всего?',
            type: 'textarea',
            placeholder: 'Поступки, принципы, жизненная позиция... (минимум 80 слов)',
            required: true
          },
          {
            id: 'father_message',
            text: 'Что хотите сказать папе через эту книгу?',
            type: 'textarea',
            placeholder: 'Слова благодарности, уважения и любви... (минимум 80 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии с отцом',
            type: 'file',
            required: true
          }
        ]
      }
      // Добавлю остальных получателей в следующем обновлении для экономии места
    ]
  },
  {
    id: 'friendship',
    title: 'Дружеские книги',
    description: 'Для лучших друзей',
    icon: BookOpen,
    color: 'from-green-500 to-emerald-600',
    recipients: [
      {
        id: 'best_friend_female',
        title: 'Для лучшей подруги',
        description: 'История настоящей женской дружбы',
        price: '2,490₽',
        questions: [
          {
            id: 'friend_name',
            text: 'Как зовут вашу лучшую подругу?',
            type: 'text',
            placeholder: 'Имя и как вы ее называете',
            required: true
          },
          {
            id: 'friendship_duration',
            text: 'Как долго вы дружите?',
            type: 'text',
            placeholder: 'С детства, 10 лет, со школы...',
            required: true
          },
          {
            id: 'how_met',
            text: 'Как вы познакомились?',
            type: 'textarea',
            placeholder: 'Обстоятельства знакомства, первое впечатление... (минимум 60 слов)',
            required: true
          },
          {
            id: 'what_bonds',
            text: 'Что вас объединяет?',
            type: 'textarea',
            placeholder: 'Общие интересы, ценности, взгляды на жизнь... (минимум 50 слов)',
            required: true
          },
          {
            id: 'adventures_together',
            text: 'Ваши самые яркие приключения вместе',
            type: 'textarea',
            placeholder: 'Путешествия, вечеринки, спонтанные поездки... (минимум 80 слов)',
            required: true
          },
          {
            id: 'support_moments',
            text: 'Как она поддерживала вас в трудные моменты?',
            type: 'textarea',
            placeholder: 'Конкретные ситуации поддержки и заботы... (минимум 70 слов)',
            required: true
          },
          {
            id: 'funny_memories',
            text: 'Самые смешные моменты вашей дружбы',
            type: 'textarea',
            placeholder: 'Истории, над которыми смеетесь до сих пор... (минимум 70 слов)',
            required: true
          },
          {
            id: 'her_qualities',
            text: 'За какие качества вы цените подругу?',
            type: 'textarea',
            placeholder: 'Верность, честность, чувство юмора... (минимум 60 слов)',
            required: true
          },
          {
            id: 'gratitude',
            text: 'За что вы благодарны подруге?',
            type: 'textarea',
            placeholder: 'Что она привнесла в вашу жизнь... (минимум 70 слов)',
            required: true
          },
          {
            id: 'friendship_message',
            text: 'Что хотите сказать лучшей подруге?',
            type: 'textarea',
            placeholder: 'Слова благодарности и планы на будущую дружбу... (минимум 80 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии с лучшими моментами дружбы',
            type: 'file',
            required: true
          }
        ]
      },
      {
        id: 'best_friend_male',
        title: 'Для лучшего друга',
        description: 'Книга о настоящей мужской дружбе',
        price: '2,490₽',
        questions: [
          {
            id: 'friend_name',
            text: 'Как зовут вашего лучшего друга?',
            type: 'text',
            placeholder: 'Имя и как вы его называете',
            required: true
          },
          {
            id: 'friendship_years',
            text: 'Сколько лет дружите?',
            type: 'text',
            placeholder: 'С детства, 15 лет, с армии...',
            required: true
          },
          {
            id: 'brotherhood_story',
            text: 'История вашего знакомства и дружбы',
            type: 'textarea',
            placeholder: 'Как встретились, что сразу понравилось друг в друге... (минимум 80 слов)',
            required: true
          },
          {
            id: 'shared_interests',
            text: 'Общие увлечения и интересы',
            type: 'textarea',
            placeholder: 'Спорт, хобби, то что любите делать вместе... (минимум 60 слов)',
            required: true
          },
          {
            id: 'loyal_moments',
            text: 'Как он проявил верность в дружбе?',
            type: 'textarea',
            placeholder: 'Ситуации, когда он вас поддержал, не предал... (минимум 70 слов)',
            required: true
          },
          {
            id: 'crazy_adventures',
            text: 'Самые безумные приключения вместе',
            type: 'textarea',
            placeholder: 'Смешные, опасные или просто запоминающиеся истории... (минимум 80 слов)',
            required: true
          },
          {
            id: 'his_character',
            text: 'Что особенного в характере друга?',
            type: 'textarea',
            placeholder: 'Надежность, честность, чувство юмора... (минимум 60 слов)',
            required: true
          },
          {
            id: 'learned_together',
            text: 'Чему вы научились благодаря этой дружбе?',
            type: 'textarea',
            placeholder: 'Жизненные уроки, навыки, мудрость... (минимум 60 слов)',
            required: true
          },
          {
            id: 'appreciation',
            text: 'За что цените друга больше всего?',
            type: 'textarea',
            placeholder: 'Качества, поступки, влияние на вашу жизнь... (минимум 70 слов)',
            required: true
          },
          {
            id: 'brotherhood_message',
            text: 'Послание лучшему другу',
            type: 'textarea',
            placeholder: 'Что значит для вас эта дружба, планы на будущее... (минимум 80 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии ваших приключений',
            type: 'file',
            required: true
          }
        ]
      }
    ]
  },
  {
    id: 'professional',
    title: 'Профессиональные книги',
    description: 'Для коллег и наставников',
    icon: Briefcase,
    color: 'from-blue-600 to-purple-600',
    recipients: [
      {
        id: 'colleague',
        title: 'Для коллеги',
        description: 'Книга признательности сотруднику',
        price: '2,790₽',
        questions: [
          {
            id: 'colleague_name',
            text: 'Как зовут вашего коллегу?',
            type: 'text',
            placeholder: 'Полное имя',
            required: true
          },
          {
            id: 'work_together_duration',
            text: 'Как долго работаете вместе?',
            type: 'text',
            placeholder: '2 года, с 2020 года...',
            required: true
          },
          {
            id: 'professional_qualities',
            text: 'Профессиональные качества коллеги',
            type: 'textarea',
            placeholder: 'Компетентность, ответственность, инициативность... (минимум 60 слов)',
            required: true
          },
          {
            id: 'collaboration_projects',
            text: 'Самые успешные совместные проекты',
            type: 'textarea',
            placeholder: 'Конкретные проекты и роль коллеги в успехе... (минимум 70 слов)',
            required: true
          },
          {
            id: 'support_examples',
            text: 'Как коллега помогал в работе?',
            type: 'textarea',
            placeholder: 'Советы, поддержка в сложных ситуациях... (минимум 60 слов)',
            required: true
          },
          {
            id: 'positive_impact',
            text: 'Как коллега влияет на рабочую атмосферу?',
            type: 'textarea',
            placeholder: 'Создание позитива, решение конфликтов... (минимум 50 слов)',
            required: true
          },
          {
            id: 'learning_from_colleague',
            text: 'Чему вы научились у этого коллеги?',
            type: 'textarea',
            placeholder: 'Профессиональные навыки, подходы к работе... (минимум 60 слов)',
            required: true
          },
          {
            id: 'appreciation_message',
            text: 'Слова благодарности коллеге',
            type: 'textarea',
            placeholder: 'За что благодарны, как цените сотрудничество... (минимум 70 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии с рабочих мероприятий',
            type: 'file',
            required: false
          }
        ]
      },
      {
        id: 'teacher',
        title: 'Для учителя',
        description: 'Благодарность наставнику',
        price: '2,990₽',
        questions: [
          {
            id: 'teacher_name',
            text: 'Как зовут вашего учителя?',
            type: 'text',
            placeholder: 'Полное имя и отчество',
            required: true
          },
          {
            id: 'subject_taught',
            text: 'Какой предмет преподавал?',
            type: 'text',
            placeholder: 'Математика, литература, история...',
            required: true
          },
          {
            id: 'learning_period',
            text: 'Когда и где у вас учились?',
            type: 'text',
            placeholder: 'Школа, университет, годы обучения...',
            required: true
          },
          {
            id: 'teaching_style',
            text: 'Что особенного было в методах преподавания?',
            type: 'textarea',
            placeholder: 'Как объяснял материал, находил подход к ученикам... (минимум 70 слов)',
            required: true
          },
          {
            id: 'life_lessons',
            text: 'Какие жизненные уроки дал учитель?',
            type: 'textarea',
            placeholder: 'Не только предмет, но и мудрость, принципы... (минимум 80 слов)',
            required: true
          },
          {
            id: 'inspiration',
            text: 'Как учитель вас вдохновлял?',
            type: 'textarea',
            placeholder: 'Влияние на выбор профессии, интерес к предмету... (минимум 70 слов)',
            required: true
          },
          {
            id: 'personal_support',
            text: 'Как учитель поддерживал вас лично?',
            type: 'textarea',
            placeholder: 'Помощь в трудностях, вера в способности... (минимум 60 слов)',
            required: true
          },
          {
            id: 'memorable_moments',
            text: 'Самые запоминающиеся моменты с учителем',
            type: 'textarea',
            placeholder: 'Уроки, беседы, ситуации которые помните... (минимум 80 слов)',
            required: true
          },
          {
            id: 'gratitude_words',
            text: 'Слова благодарности учителю',
            type: 'textarea',
            placeholder: 'За что благодарны, как повлиял на вашу жизнь... (минимум 90 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии из учебных лет',
            type: 'file',
            required: false
          }
        ]
      }
    ]
  },
  {
    id: 'special',
    title: 'Особые случаи',
    description: 'Для особенных событий',
    icon: Star,
    color: 'from-purple-500 to-pink-500',
    recipients: [
      {
        id: 'anniversary',
        title: 'На юбилей',
        description: 'Книга-поздравление к юбилею',
        price: '3,990₽',
        questions: [
          {
            id: 'celebrant_name',
            text: 'Имя юбиляра',
            type: 'text',
            placeholder: 'Полное имя именинника',
            required: true
          },
          {
            id: 'anniversary_age',
            text: 'Какой юбилей празднуете?',
            type: 'text',
            placeholder: '50 лет, 60 лет...',
            required: true
          },
          {
            id: 'relationship_to_celebrant',
            text: 'Кем вы приходитесь юбиляру?',
            type: 'text',
            placeholder: 'Сын/дочь, внук/внучка, друг...',
            required: true
          },
          {
            id: 'life_achievements',
            text: 'Главные достижения юбиляра в жизни',
            type: 'textarea',
            placeholder: 'Карьера, семья, достижения которыми гордитесь... (минимум 80 слов)',
            required: true
          },
          {
            id: 'character_qualities',
            text: 'Выдающиеся качества характера',
            type: 'textarea',
            placeholder: 'Мудрость, доброта, сила духа... (минимум 70 слов)',
            required: true
          },
          {
            id: 'memorable_stories',
            text: 'Самые яркие истории из жизни юбиляра',
            type: 'textarea',
            placeholder: 'Интересные случаи, проявления характера... (минимум 90 слов)',
            required: true
          },
          {
            id: 'impact_on_others',
            text: 'Как юбиляр повлиял на жизнь других людей?',
            type: 'textarea',
            placeholder: 'Помощь, поддержка, пример для подражания... (минимум 80 слов)',
            required: true
          },
          {
            id: 'congratulations',
            text: 'Поздравления и пожелания',
            type: 'textarea',
            placeholder: 'Теплые слова, пожелания на будущее... (минимум 90 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии юбиляра разных лет',
            type: 'file',
            required: true
          }
        ]
      },
      {
        id: 'self',
        title: 'Для себя',
        description: 'Автобиографическая книга',
        price: '3,490₽',
        questions: [
          {
            id: 'my_name',
            text: 'Ваше полное имя',
            type: 'text',
            placeholder: 'Как хотите назвать себя в книге',
            required: true
          },
          {
            id: 'life_period',
            text: 'Какой период жизни описываете?',
            type: 'text',
            placeholder: 'Всю жизнь, последние годы, детство...',
            required: true
          },
          {
            id: 'early_memories',
            text: 'Самые ранние воспоминания',
            type: 'textarea',
            placeholder: 'Детство, семья, дом где выросли... (минимум 80 слов)',
            required: true
          },
          {
            id: 'turning_points',
            text: 'Поворотные моменты в жизни',
            type: 'textarea',
            placeholder: 'Решения которые изменили все, важные события... (минимум 90 слов)',
            required: true
          },
          {
            id: 'achievements',
            text: 'Чем гордитесь в жизни?',
            type: 'textarea',
            placeholder: 'Достижения, преодоленные трудности... (минимум 80 слов)',
            required: true
          },
          {
            id: 'important_people',
            text: 'Люди, которые повлияли на вашу жизнь',
            type: 'textarea',
            placeholder: 'Семья, учителя, друзья, наставники... (минимум 90 слов)',
            required: true
          },
          {
            id: 'life_lessons',
            text: 'Главные уроки жизни',
            type: 'textarea',
            placeholder: 'Мудрость которую приобрели с опытом... (минимум 80 слов)',
            required: true
          },
          {
            id: 'dreams_goals',
            text: 'Мечты и цели на будущее',
            type: 'textarea',
            placeholder: 'Планы, к чему стремитесь... (минимум 70 слов)',
            required: true
          },
          {
            id: 'self_reflection',
            text: 'Размышления о себе и жизни',
            type: 'textarea',
            placeholder: 'Философские мысли, что поняли о себе... (минимум 90 слов)',
            required: true
          },
          {
            id: 'photos',
            text: 'Загрузите фотографии из разных периодов жизни',
            type: 'file',
            required: true
          }
        ]
      }
    ]
  }
];

export default function CreateBook() {
  const router = useRouter();
  const { saveBook, setIsBookLoading } = useBook();
  
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | ''>('');
  const [selectedRecipient, setSelectedRecipient] = useState<BookRecipient | ''>('');
  const [currentStep, setCurrentStep] = useState(0); // 0 = category, 1 = recipient, 2+ = questions
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const imageUpload = useImageUpload({
    required: true,
    maxImages: 8,
    maxTotalSize: 40 * 1024 * 1024 // 40MB общий лимит
  });

  const currentCategory = bookCategories.find(cat => cat.id === selectedCategory);
  const currentRecipientOption = currentCategory?.recipients.find(rec => rec.id === selectedRecipient);
  const totalSteps = currentRecipientOption ? currentRecipientOption.questions.length + 3 : 3; // +3 для category, recipient, finish

  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [imageUpload.imageState.hasImages, imageUpload.imageState.count, imageUpload.imageState.isValid]);

  const handleCategorySelect = (categoryId: BookCategory) => {
    setSelectedCategory(categoryId);
    setSelectedRecipient('');
    setAnswers({});
    imageUpload.clearImages();
    setCurrentStep(1);
  };

  const handleRecipientSelect = (recipientId: BookRecipient) => {
    setSelectedRecipient(recipientId);
    setAnswers({});
    imageUpload.clearImages();
    setCurrentStep(2);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const getCurrentQuestion = (): Question | null => {
    if (!currentRecipientOption || currentStep < 2) return null;
    const questionIndex = currentStep - 2;
    return currentRecipientOption.questions[questionIndex] || null;
  };

  const isStepComplete = (): boolean => {
    if (currentStep === 0) return selectedCategory !== '';
    if (currentStep === 1) return selectedRecipient !== '';
    
    const question = getCurrentQuestion();
    if (!question) return true;
    
    if (question.type === 'file') {
      return !question.required || imageUpload.imageState.hasImages;
    } else {
      const answer = answers[question.id];
      return !question.required || (!!answer && answer.trim() !== '');
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Переход к выбору получателя
      if (selectedCategory) {
        setCurrentStep(1);
      }
      return;
    }

    if (currentStep === 1) {
      // Переход к вопросам
      if (selectedRecipient) {
        setCurrentStep(2);
      }
      return;
    }

    const currentQuestion = getCurrentQuestion();
    const stepComplete = isStepComplete();

    // Проверяем последний вопрос
    if (currentStep === totalSteps - 2) {
      if (currentQuestion?.required && !stepComplete) {
        if (currentQuestion?.type === 'file') {
          const error = imageUpload.getImageValidationError();
          alert(error || 'Необходимо загрузить фотографии');
        } else {
          alert('Пожалуйста, заполните все обязательные поля');
        }
        return;
      }

      // Генерируем книгу
      setIsGenerating(true);
      setIsBookLoading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 240000);
      
      try {
        let processedImages: Array<{
          name: string;
          base64: string;
          size: number;
          dimensions: { width: number; height: number };
          compressed?: boolean;
        }> = [];
        
        try {
          processedImages = imageUpload.getImagesForApi();
        } catch (apiError) {
          console.log('Image processing error:', apiError);
          processedImages = [];
        }
        
        const apiData = {
          category: selectedCategory,
          recipient: selectedRecipient,
          answers: answers,
          images: processedImages.length > 0 ? processedImages : []
        };
        
        const response = await fetch('/api/generate-book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
          signal: controller.signal
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}: ${errorData.error || 'Ошибка при генерации книги'}`);
        }

        const result = await response.json();
        
        if (result.success) {
          saveBook(result.book);
          router.push('/book');
        } else {
          throw new Error(result.error || 'Неизвестная ошибка');
        }
      } catch (apiError) {
        if (apiError instanceof Error) {
          if (apiError.name === 'AbortError') {
            alert('Генерация большой книги заняла слишком много времени. Попробуйте еще раз или выберите меньше деталей.');
          } else {
            alert(`Ошибка: ${apiError.message}`);
          }
        } else {
          alert('Произошла неизвестная ошибка. Попробуйте еще раз.');
        }
      } finally {
        clearTimeout(timeoutId);
        setIsGenerating(false);
        setIsBookLoading(false);
      }
      
    } else if (currentStep < totalSteps - 2) {
      // Переход к следующему вопросу
      if (!stepComplete) {
        if (currentQuestion?.type === 'file') {
          const error = imageUpload.getImageValidationError();
          alert(error || 'Необходимо загрузить фотографии');
        } else {
          alert('Пожалуйста, заполните все обязательные поля');
        }
        return;
      }
      
      setCurrentStep(prev => prev + 1);
      setForceUpdate(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setForceUpdate(prev => prev + 1);
    }
  };

  // Экран выбора категории
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <header className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              VeloraBook
            </h1>
          </Link>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Выберите категорию книги
            </h1>
            <p className="text-xl text-gray-600">
              Какую историю хотите рассказать?
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl cursor-pointer transform hover:-translate-y-1 transition-all duration-200 border-2 border-transparent hover:border-purple-300 group"
                >
                  <div className="text-center">
                    <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{category.description}</p>
                    <div className="text-sm text-purple-600 mb-4">
                      {category.recipients.length} вариантов получателей
                    </div>
                    <div className="flex items-center justify-center text-purple-600 text-sm font-medium">
                      Выбрать
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Экран выбора получателя
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <header className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              VeloraBook
            </h1>
          </Link>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <button
              onClick={() => setCurrentStep(0)}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 mx-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentCategory?.title}
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Для кого создаем книгу?
            </h1>
            <p className="text-xl text-gray-600">
              Выберите получателя подарка
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentCategory?.recipients.map((recipient) => (
              <div
                key={recipient.id}
                onClick={() => handleRecipientSelect(recipient.id)}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl cursor-pointer transform hover:-translate-y-1 transition-all duration-200 border-2 border-transparent hover:border-purple-300 group"
              >
                <div className="text-center">
                  <div className={`w-12 h-12 bg-gradient-to-r ${currentCategory.color} rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <currentCategory.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {recipient.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {recipient.description}
                  </p>
                  <div className="text-lg font-bold text-purple-600 mb-4">
                    {recipient.price}
                  </div>
                  <div className="flex items-center justify-center text-purple-600 text-sm font-medium">
                    Выбрать
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Экран генерации
  if (isGenerating) {
    const hasImages = imageUpload.imageState.hasImages;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            ИИ создает вашу объемную книгу...
          </h2>
          <p className="text-gray-600 mb-4">
            Генерируем полную персональную историю 4000-6000 слов
          </p>
          
          {hasImages && (
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-center space-x-2 text-blue-600 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Анализируем ваши фотографии</span>
              </div>
              <p className="text-xs text-gray-500">
                ИИ изучает {imageUpload.imageState.count} изображений для создания более персональной истории
              </p>
            </div>
          )}
          
          <p className="text-sm text-gray-500">
            Это может занять до {hasImages ? '240' : '180'} секунд для полной книги
          </p>
          
          <div className="mt-4 space-y-2 text-xs text-gray-400">
            <div>🧠 Анализируем детальные ответы</div>
            {hasImages && <div>📸 Обрабатываем изображения с помощью ИИ</div>}
            <div>✍️ Создаем объемную персональную историю</div>
            <div>📖 Форматируем книгу с множественными главами</div>
            <div>🎨 Финальная обработка и оформление</div>
          </div>
        </div>
      </div>
    );
  }

  // Экран вопроса
  const question = getCurrentQuestion();
  if (!question || !currentRecipientOption) return null;

  const stepComplete = isStepComplete();
  const buttonDisabled = !stepComplete;
  const questionNumber = currentStep - 1;
  const totalQuestions = currentRecipientOption.questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <header className="container mx-auto px-4 py-6">
        <Link href="/" className="flex items-center space-x-2">
          <Sparkles className="w-8 h-8 text-purple-600" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            VeloraBook
          </h1>
        </Link>
      </header>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Вопрос {questionNumber} из {totalQuestions}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((questionNumber / totalQuestions) * 100)}% завершено
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            ></div>
          </div>
          
          <div className="mt-4 text-center">
            <span className="text-sm text-purple-600 font-medium">
              {currentCategory?.title} › {currentRecipientOption.title}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {question.text}
          </h2>

          {question.type === 'text' && (
            <input
              type="text"
              placeholder={question.placeholder}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            />
          )}

          {question.type === 'textarea' && (
            <textarea
              placeholder={question.placeholder}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            />
          )}

          {question.type === 'file' && (
            <div>
              <ImageUploader
                maxFiles={8}
                maxSizeBytes={5 * 1024 * 1024}
                onImagesChange={imageUpload.handleImagesChange}
                initialImages={imageUpload.imageState.images}
                disabled={isGenerating}
              />
              
              {imageUpload.imageState.hasImages && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    ✓ Загружено {imageUpload.imageState.count} изображений
                    ({Math.round(imageUpload.imageState.totalSize / (1024 * 1024) * 100) / 100} MB)
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    ИИ проанализирует ваши фотографии и включит их описания в книгу
                  </p>
                </div>
              )}
              
              {imageUpload.getImageValidationError() && (
                <div className="mt-3 text-red-600 text-sm">
                  {imageUpload.getImageValidationError()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            className="flex items-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            disabled={currentStep === 2}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </button>

          <button
            key={`next-button-${forceUpdate}-${stepComplete}`}
            onClick={handleNext}
            disabled={buttonDisabled}
            className={`flex items-center px-6 py-3 rounded-lg transition-all font-semibold ${
              buttonDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
            }`}
          >
            {currentStep === totalSteps - 2 ? 'Создать книгу' : 'Далее'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}