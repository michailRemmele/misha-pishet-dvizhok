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

## Деплой на VPS (нативный Caddy)

Проект статический (`output: 'static'`), поэтому деплой устроен так:

1. GitHub Actions на каждом push в `main` собирает `dist/`.
2. CI заливает сборку в `/srv/sites/blog/releases/<sha>/` и виртуальный хост
   `ops/blog.caddy` на VPS.
3. Симлинк `/srv/sites/blog/current` переключается на новый релиз — публикация
   атомарна. Caddy перезагружается только если изменился сам виртуальный хост.
4. Хранятся пять последних релизов, живой не удаляется.

На хосте один нативный Caddy (systemd) на все сайты: базовый `Caddyfile`
импортирует `/etc/caddy/conf.d/*.caddy`, каждый сайт привозит свой виртуальный
хост из своего репозитория.

Файлы деплоя в репозитории:

- `.github/workflows/deploy-vps.yml`
- `ops/vps-bootstrap.sh` - подготовка хоста
- `ops/Caddyfile` - базовый конфиг хоста
- `ops/blog.caddy` - виртуальный хост блога
- `ops/MIGRATION.md` - как хост переехал с Docker и как проверить

### 1) Первый запуск VPS (Ubuntu)

Один раз на сервере:

```bash
sudo bash ops/vps-bootstrap.sh
```

Скрипт:

- ставит Caddy из его apt-репозитория (и сразу останавливает — запуск это
  отдельный шаг, см. `ops/MIGRATION.md`);
- создает `/srv/sites/<site>/releases` и `/etc/caddy/conf.d`;
- разрешает деплой-пользователю ровно одну привилегированную команду:
  `systemctl reload caddy`;
- открывает порты `22`, `80`, `443` через `ufw`.

Дальше базовый конфиг и виртуальный хост ставятся руками:

```bash
sudo cp ops/Caddyfile /etc/caddy/Caddyfile
cp ops/blog.caddy /etc/caddy/conf.d/blog.caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
```

### 2) GitHub Secrets

В приватном репозитории добавь Secrets (`Settings` -> `Secrets and variables` -> `Actions`):

- `VPS_HOST` - IP или домен VPS
- `VPS_PORT` - SSH порт (обычно `22`)
- `VPS_USER` - SSH пользователь
- `VPS_SSH_KEY` - приватный ключ для SSH (лучше отдельный deploy key)
- `DOMAIN` - основной домен сайта (например `example.com`, без `https://`)

### 3) Домен

Сделай DNS записи на IP VPS:

- `A` для `@`
- `A` для `www`

После следующего push в `main` workflow `Deploy to VPS` выполнит деплой
автоматически. Его же можно запустить руками через `workflow_dispatch` во
вкладке Actions.
