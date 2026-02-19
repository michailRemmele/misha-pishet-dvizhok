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

`postSlug` используется как база URL статьи: `/posts/<postSlug>-<salt>/`.
`cover` и `coverAlt` можно опускать, если у поста нет обложки.

Имя файла делай по дате, например `2026-02-16.md`.

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


aws s3 sync "public/images" "s3://4d7b85999aed-legendary-azamat/blog/images/" \
  --exclude "*" --include "*.avif" \
  --no-progress \
  --endpoint-url https://s3.ru1.storage.beget.cloud