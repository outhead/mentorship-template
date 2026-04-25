# Настройка проекта

Пошаговая инструкция для Мака. Займёт ~20 минут.

## Шаг 1. Скачать и положить папку

1. Скачай всю папку `mentorship-template/` из артефактов чата
2. Положи в удобное место, например `~/Projects/mentorship-template/`
3. Открой терминал в этой папке:
```bash
cd ~/Projects/mentorship-template
```

## Шаг 2. Инициализировать Git

```bash
git init
git add .
git commit -m "Initial setup: mentorship template"
```

## Шаг 3. Создать репозиторий на GitHub

1. Зайди на https://github.com/new
2. Имя репозитория: `mentorship-template` (или своё)
3. Выбери Public (это шаблон) или Private (если ведёшь свой кейс с реальными именами — рекомендуется обезличить заранее)
4. Не добавляй README/gitignore — они уже есть
5. Нажми Create

## Шаг 4. Запушить

GitHub покажет команды после создания. Примерно так:
```bash
git remote add origin git@github.com:[твой-username]/mentorship-template.git
git branch -M main
git push -u origin main
```

## Шаг 5. Включить GitHub Pages

1. На странице репозитория → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Save

Через 1–2 минуты сайт будет доступен по адресу:
```
https://[твой-username].github.io/mentorship-template/
```

**Внимание:** если репозиторий Private, GitHub Pages будут работать только при платном плане GitHub (Pro/Team). Альтернативы:
- **Вариант A:** Сделать репо Public, предварительно обезличив все имена/компании/личные детали
- **Вариант B:** Cloudflare Pages или Vercel — поддерживают приватные репо бесплатно
- **Вариант C:** Оставить только локально без публикации, смотреть через `open index.html`

## Шаг 6. Проверить Claude Code

У тебя он уже настроен. Проверь, что работает в этой папке:
```bash
claude "Прочитай CLAUDE.md и расскажи, что ты умеешь по этому проекту"
```

Если Claude отвечает осмысленно — всё работает.

## Шаг 7. Первый прогон

Для сессии 3 (когда будет транскрипция):

```bash
# 1. Создай папку сессии
mkdir -p sessions/session-03

# 2. Положи транскрипцию
# (скопируй из ChatGPT/Zoom или откуда берёшь)
pbpaste > sessions/session-03/transcript.md

# 3. Запусти генерацию
claude "Сгенерируй саммари для сессии 3. Тема: [тема]. Дата: [дата]. Следующая сессия: [дата + время + zoom ссылка]"
```

Claude прочитает транскрипцию, обновит `commitments.md`, создаст `sessions/session-03/index.html`, обновит главную `index.html`.

## Шаг 8. Закоммитить и запушить

```bash
git add .
git commit -m "Session 03: [тема]"
git push
```

GitHub Pages автоматически обновится через 1–2 минуты.

---

## Полезные команды

### Подготовка к сессии
```bash
claude "Подготовься к сессии 3. Что висит в договорённостях, на что обратить внимание"
```

### Поиск по истории
```bash
claude "Что мы обсуждали про метрики в B2B?"
claude "Какие советы я давал менти про тайм-менеджмент?"
```

### Закрыть договорённость вручную
```bash
claude "Закрой договорённость 'Найти статьи до/после' — я скинул ей ссылки"
```

### Отправить ссылку менти
После пуша — просто скопируй URL нужной сессии:
```
https://[username].github.io/mentorship-template/sessions/session-03/
```

---

## Что делать, если что-то сломалось

- **Claude не видит файлы:** убедись, что ты в правильной папке (`pwd` должен показать `mentorship-template`)
- **GitHub Pages не обновляется:** проверь Settings → Pages → должен быть зелёный статус «Your site is live»
- **Шаблон сломался:** откат через git (`git checkout assets/templates/session-template.html`)
- **Claude генерирует некрасиво:** посмотри `CLAUDE.md` — возможно нужно уточнить инструкции
