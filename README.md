# Tutor CRM System

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/vanyawebs-projects/v0-tutor-crm-system)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/sEa9ioBb9Ds)

## Overview

Полноценная CRM система для управления репетиторским центром с четырьмя уровнями доступа, системой выплат зарплат, аналитикой и автоматизацией процессов.

## Возможности

### 🎯 Четыре роли пользователей

- **Главный Администратор** - полный контроль, аналитика, управление выплатами
- **Репетиторы** - управление учениками, расписанием, отслеживание заработка
- **Менеджеры** - управление платежами, добавление уроков, комиссионные
- **Ученики** - личный кабинет с расписанием, оценками и заданиями

### 💰 Система выплат

- Автоматическое начисление заработка репетиторам за проведенные уроки
- Комиссионная система для менеджеров (500₽ + 5% от продаж)
- Одобрение/отклонение выплат администратором
- История всех транзакций
- Отмена начислений за уроки

### 📅 Управление расписанием

- Регулярные расписания с автоматическим созданием уроков
- Редактирование расписания с обновлением всех будущих уроков
- Разовые уроки
- Оценки и домашние задания
- Ссылки на уроки (Zoom, Google Meet)

### 📊 Аналитика

- Статистика для администратора (доход, прибыль, уроки)
- Отслеживание заработка для репетиторов
- Продажи и комиссии для менеджеров
- Графики и диаграммы для учеников

## Быстрый старт

### 1. Установка зависимостей

\`\`\`bash
npm install
\`\`\`

### 2. Настройка базы данных

Запустите SQL скрипты в следующем порядке:

\`\`\`bash
# Основная система ролей
scripts/027_role_based_system.sql

# Исправления
scripts/028_fix_role_system.sql

# Система выплат и транзакций
scripts/029_payment_tracking_system.sql
\`\`\`

### 3. Создание первого администратора

После регистрации обновите роль в БД:

\`\`\`sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
\`\`\`

### 4. Запуск приложения

\`\`\`bash
npm run dev
\`\`\`

Откройте [http://localhost:3000](http://localhost:3000)

## Структура проекта

\`\`\`
├── app/
│   ├── admin/          # Панель администратора
│   ├── tutor/          # Панель репетитора
│   ├── manager/        # Панель менеджера
│   ├── student/        # Личный кабинет ученика
│   └── auth/           # Аутентификация
├── components/
│   ├── admin-*         # Компоненты администратора
│   ├── tutor-*         # Компоненты репетитора
│   ├── manager-*       # Компоненты менеджера
│   ├── student-*       # Компоненты ученика
│   └── ui/             # UI компоненты
├── lib/
│   └── supabase/       # Клиенты Supabase
└── scripts/            # SQL скрипты

\`\`\`

## Документация

Подробная документация доступна в файле [SYSTEM_GUIDE.md](./SYSTEM_GUIDE.md)

### Основные разделы:

- [Роли и функционал](./SYSTEM_GUIDE.md#роли-и-функционал)
- [Система выплат](./SYSTEM_GUIDE.md#система-выплат)
- [Управление учениками](./SYSTEM_GUIDE.md#система-учеников)
- [База данных](./SYSTEM_GUIDE.md#база-данных)
- [Типичные сценарии](./SYSTEM_GUIDE.md#типичные-сценарии)

## Технологии

- **Next.js 14** - React фреймворк
- **Supabase** - База данных и аутентификация
- **Tailwind CSS** - Стилизация
- **shadcn/ui** - UI компоненты
- **TypeScript** - Типизация

## Deployment

Your project is live at:

**[https://vercel.com/vanyawebs-projects/v0-tutor-crm-system](https://vercel.com/vanyawebs-projects/v0-tutor-crm-system)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/projects/sEa9ioBb9Ds](https://v0.app/chat/projects/sEa9ioBb9Ds)**

## Поддержка

Для вопросов и поддержки обращайтесь к разработчику системы.

## Лицензия

MIT
