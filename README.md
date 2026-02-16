# Блог на Astro

Текущая версия Astro в проекте: `5.17.2`.

## Команды

- `npm install` - установить зависимости
- `npm run dev` - локальная разработка (`http://localhost:4321`)
- `npm run build` - production-сборка в `dist/`
- `npm run preview` - локальный preview production-сборки

## Структура контента

Все статьи лежат в `src/content/posts/<year>/*.md`.

Минимальный frontmatter для новой статьи:

```md
---
postSlug: "zagolovok-stati"
title: "Заголовок"
date: 2026-02-16
excerpt: "Короткое описание для карточки"
cover: "/images/example-cover.jpg"
coverAlt: "Описание обложки"
---

Текст статьи...
```

`postSlug` используется в URL статьи: `/posts/<slug>/`.

Имя файла можно делать по дате, например `2026-02-16-0001.md`.

## Импорт из Telegram Export

Для импорта сообщений из `ChatExport_2026-02-16/result.json`:

```bash
npm run import:telegram
```

Скрипт:

- берёт записи с `type: "message"`;
- создаёт статьи в `src/content/posts/<year>/`;
- использует дату + id сообщения в имени файла;
- копирует фото в `public/images/<slug>/`;
- копирует видео в `public/videos/<slug>/`;
- использует `thumbnail` видео как `cover` поста.

## Пагинация

Главная страница показывает ленту статей с пагинацией.

- страница 1: `/`
- страница 2: `/2/`
- и т.д.

Полная статья: `/posts/<slug>/`.

## Деплой на Beget

Проект собран как статический сайт (`output: 'static'`).

1. Выполнить `npm run build`.
2. Открыть папку `dist/`.
3. Загрузить содержимое `dist/` в каталог сайта на Beget (обычно `public_html`).
4. Если у домена уже есть старые файлы, заменить их файлами из `dist/`.

После загрузки сайт сразу готов к работе.
