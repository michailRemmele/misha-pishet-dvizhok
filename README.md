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

`postSlug` используется как slug статьи в URL: `/posts/<date>/<postSlug>/`.
`cover` и `coverAlt` можно опускать, если у поста нет обложки.

Имя файла делай по дате, например `2026-02-16.md`.

## Пагинация

Главная страница показывает ленту статей с пагинацией.

- страница 1: `/`
- страница 2: `/2/`
- и т.д.

Полная статья: `/posts/<date>/<slug>/`.

## Деплой на VPS через Docker + Caddy

Проект статический (`output: 'static'`), поэтому деплой устроен так:

1. GitHub Actions на каждом push в `main` собирает `dist/`.
2. CI копирует `dist`, `docker-compose.yml`, `Caddyfile` на VPS.
3. На VPS поднимается/обновляется контейнер Caddy, который раздает сайт и TLS.

Файлы деплоя в репозитории:

- `docker-compose.yml`
- `Caddyfile`
- `.github/workflows/deploy-vps.yml`
- `ops/vps-bootstrap.sh`

### 1) Первый запуск VPS (Ubuntu)

Один раз на сервере:

```bash
sudo bash ops/vps-bootstrap.sh
```

Скрипт:

- устанавливает Docker Engine + Compose plugin;
- открывает порты `22`, `80`, `443` через `ufw`;
- создает директорию `/opt/www/misha-blog`.

### 2) GitHub Secrets

В приватном репозитории добавь Secrets (`Settings` -> `Secrets and variables` -> `Actions`):

- `VPS_HOST` - IP или домен VPS
- `VPS_PORT` - SSH порт (обычно `22`)
- `VPS_USER` - SSH пользователь
- `VPS_SSH_KEY` - приватный ключ для SSH (лучше отдельный deploy key)
- `VPS_PATH` - путь на сервере (например `/opt/www/misha-blog`)
- `DOMAIN` - основной домен сайта (например `example.com`, без `https://`)

### 3) Домен

Сделай DNS записи на IP VPS:

- `A` для `@`
- `A` для `www`

После следующего push в `main` workflow `Deploy to VPS` выполнит деплой автоматически.
