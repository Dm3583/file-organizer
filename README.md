# File Organizer

CLI-застосунок на Node.js для наведення порядку в директоріях. Доступні опції:

- **`scan`** — зібрати статистику: кількість і розмір файлів, типи, вік, найбільші й найстаріший файл;
- **`duplicates`** — знайти файли з однаковим вмістом за SHA-256 і порахувати, скільки місця вони займають даремно;
- **`organize`** — скопіювати файли в папки за категоріями (`Documents`, `Images`, `Archives`, `Code`, `Videos`, `Other`);
- **`cleanup`** — знайти файли, старші за N днів, і (за підтвердженням) видалити їх.

Застосунок не має зовнішніх залежностей: використовуються тільки вбудовані модулі Node.js (`fs`, `path`, `crypto`, `stream`, `events`).

## Зміст

- [Вимоги](#вимоги)
- [Встановлення](#встановлення)
- [Запуск](#запуск)
- [Команди](#команди)
  - [scan](#scan--аналіз-директорії)
  - [duplicates](#duplicates--пошук-дублікатів)
  - [organize](#organize--сортування-за-категоріями)
  - [cleanup](#cleanup--видалення-старих-файлів)
- [Структура проєкту](#структура-проєкту)
- [Архітектура](#архітектура)
- [Обробка помилок](#обробка-помилок)

## Вимоги

- **Node.js 20.12 або новіший.** Застосунок використовує `fs.readdir()` з опцією `recursive: true` і властивість `Dirent.parentPath`, яка з'явилася саме в цій версії.

Перевірити версію:

```bash
node -v
```

## Встановлення

```bash
git clone https://github.com/Dm3583/file-organizer.git
cd file-organizer
npm install
```

`npm install` встановлює лише Prettier для форматування коду. Для роботи застосунку він не потрібен.

## Запуск

Загальний формат:

```bash
node file-organizer.js <command> <directory> [options]
```

Те саме через npm-скрипти з `package.json`. Подвійний дефіс `--` передає всі наступні аргументи безпосередньо в скрипт:

```bash
npm run scan -- ~/Downloads
npm run duplicates -- ~/Downloads
npm run organize -- ~/Downloads --output ~/Organized
npm run cleanup -- ~/Downloads --older-than 90
```

Назва команди не залежить від регістру (`scan`, `SCAN` і `Scan` працюють однаково). Шляхи можуть бути як абсолютними, так і відносними до поточної директорії.

## Команди

### `scan` — аналіз директорії

```bash
node file-organizer.js scan <directory>
```

| Аргумент | Обов'язковий | Опис |
|---|---|---|
| `<directory>` | так | Директорія для аналізу. Обходиться рекурсивно, разом з усіма піддиректоріями. |

Для кожного файлу береться розмір і дата останньої модифікації. Звіт містить:

- загальну кількість файлів і їхній сумарний розмір;
- групування за розширенням: кількість і розмір для кожного типу (файли без розширення — у групі `(other)`);
- розподіл за віком: змінені за останні 7 днів, за останні 30 днів і старші за 90 днів;
- топ-3 найбільших файли;
- найстаріший файл.

```
📂 Scanning: /Users/student/Downloads
Processing... ████████████████████ 247/247 files

📊 Scan Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total files: 247
Total size: 1.2 GB

By File Type:
  .pdf    89 files   456.0 MB
  .zip    23 files   234.0 MB
  ...
  (other) 11 files    50.0 MB

File Age:
  Last 7 days:    45 files
  Last 30 days:   89 files
  Older than 90:  56 files

Largest files:
  1. video_lecture.mp4    450.0 MB
  2. archive_backup.zip   156.0 MB
  3. presentation.pptx     89.0 MB

Oldest file: old_report.pdf (modified 365 days ago)
```

### `duplicates` — пошук дублікатів

```bash
node file-organizer.js duplicates <directory>
```

| Аргумент | Обов'язковий | Опис |
|---|---|---|
| `<directory>` | так | Директорія, у якій шукати дублікати (рекурсивно). |

Для кожного файлу обчислюється SHA-256 хеш. Файли з однаковим хешем мають ідентичний вміст, навіть якщо їхні назви різні. Файл читається через `fs.createReadStream()` невеликими порціями, тому навіть дуже великі файли не завантажуються в пам'ять повністю.

Для кожної групи дублікатів показується хеш, список усіх копій і витрачене місце — розмір файлу × (кількість копій − 1). Групи відсортовані від тієї, що займає найбільше зайвого місця. Порожні файли пропускаються: вони всі мають однаковий хеш, але місця не займають.

```
🔍 Searching for duplicates in: /Users/student/Downloads
Calculating hashes... ████████████████████ 247/247 files

Found 3 duplicate groups (8.7 MB wasted):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Group 1 (3 copies, 3.2 MB each):
  SHA-256: a3f2e1b8c4d5...

  📄 Downloads/lecture.pdf
  📄 Downloads/lecture(1).pdf
  📄 Downloads/backup/lecture_copy.pdf

  Wasted space: 6.4 MB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 Total wasted space: 8.7 MB
```

### `organize` — сортування за категоріями

```bash
node file-organizer.js organize <source> --output <target>
```

| Аргумент | Обов'язковий | Опис |
|---|---|---|
| `<source>` | так | Директорія, з якої копіюються файли (рекурсивно). |
| `--output <target>` | так | Директорія, у якій будуть створені папки категорій. Якщо її не існує, вона буде створена. |

Файли **копіюються**, оригінали залишаються на місці. Категорія визначається за розширенням:

| Категорія | Розширення |
|---|---|
| `Documents` | `.pdf` `.docx` `.doc` `.txt` `.md` `.xlsx` `.pptx` |
| `Images` | `.png` `.jpg` `.jpeg` `.gif` `.svg` `.webp` `.bmp` |
| `Archives` | `.zip` `.rar` `.tar` `.gz` `.7z` |
| `Code` | `.js` `.py` `.java` `.cpp` `.html` `.css` `.json` |
| `Videos` | `.mp4` `.avi` `.mkv` `.mov` `.webm` |
| `Other` | усі інші, а також файли без розширення |

Регістр розширення не має значення: `photo.JPG` потрапить у `Images`.

- **Малі файли** (менше 10 MB) копіюються через `fs.copyFile()`.
- **Великі файли** (від 10 MB) копіюються через streams і `pipeline()`, щоб не завантажувати весь файл у пам'ять. Межа задається константою `LARGE_FILE_SIZE` у [`lib/utils/constants.js`](lib/utils/constants.js).
- **Конфлікти назв.** Якщо файл з такою назвою вже є в цільовій папці, він не перезаписується — до назви додається номер: `file.pdf` → `file(1).pdf` → `file(2).pdf`.
- Якщо цільова директорія знаходиться всередині вихідної, вже розкладені файли не копіюються повторно.

```
📦 Organizing: /Users/student/Downloads
Target: /Users/student/Organized

Creating folders...
  ✓ Documents/
  ✓ Images/
  ✓ Archives/
  ✓ Code/
  ✓ Videos/
  ✓ Other/

Copying files... ████████████████████ 247/247

✅ Organization complete!

Summary:
  Documents: 134 files → Organized/Documents/
  Images:     67 files → Organized/Images/
  Archives:   23 files → Organized/Archives/
  Code:       12 files → Organized/Code/
  Videos:      8 files → Organized/Videos/
  Other:       3 files → Organized/Other/

Total copied: 247 files (1.2 GB)
```

### `cleanup` — видалення старих файлів

```bash
# Dry run: тільки показати, що буде видалено
node file-organizer.js cleanup <directory> --older-than <days>

# Показати список і видалити
node file-organizer.js cleanup <directory> --older-than <days> --confirm
```

| Аргумент | Обов'язковий | Опис |
|---|---|---|
| `<directory>` | так | Директорія для пошуку (рекурсивно). |
| `--older-than <days>` | так | Ціле невід'ємне число днів. Знаходяться файли, які не змінювалися довше за цей час. |
| `--confirm` | ні | Без цього прапорця нічого не видаляється (**dry run**). З ним файли зі списку видаляються через `fs.unlink()`. |

Вік файлу визначається за датою останньої модифікації (`mtime`). Без `--confirm` команда тільки показує список, тому спочатку можна переглянути, що саме буде видалено, і лише потім запустити видалення. У списку показуються перші 3 файли, решта згадується кількістю.

**Без `--confirm`:**

```
🧹 Cleanup: /Users/student/Downloads
Looking for files older than 90 days...

Found 45 files to delete:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
old_report.pdf
  Size: 2.3 MB
  Modified: 120 days ago (2024-09-05)

ancient_screenshot.png
  Size: 819.2 KB
  Modified: 365 days ago (2023-01-05)

backup_2023.zip
  Size: 45.0 MB
  Modified: 180 days ago (2023-07-08)

... (42 more files)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total: 45 files (156.0 MB)

⚠️  DRY RUN MODE: No files were deleted.
To actually delete these files, run with --confirm flag.
```

**З `--confirm`:**

```
...
Total: 45 files (156.0 MB)

⚠️  DELETING 45 files (156.0 MB). This action cannot be undone!

Deleting... ████████████████████ 45/45

✅ Cleanup complete!
Deleted: 45 files (156.0 MB freed)
```

> ⚠️ Видалення незворотне: файли не потрапляють у кошик. Завжди спочатку запускайте команду без `--confirm`.

## Структура проєкту

```
file-organizer/
├── package.json
├── .gitignore
├── .prettierrc.json
├── README.md
├── file-organizer.js         ← точка входу: запуск команд і підписка на події
└── lib/
    ├── scanner.js            ← клас Scanner (команда scan)
    ├── duplicates.js         ← клас DuplicateFinder (команда duplicates)
    ├── organizer.js          ← клас Organizer (команда organize)
    ├── cleanup.js            ← клас Cleanup (команда cleanup)
    └── utils/
        ├── cli.js            ← розбір аргументів, обробка й вивід помилок
        ├── constants.js      ← команди, прапорці, події, категорії, числові константи
        ├── fs-utils.js       ← обхід директорій, SHA-256, копіювання, унікальні назви
        ├── category-utils.js ← визначення категорії файлу за розширенням
        ├── date-utils.js     ← обчислення віку файлів
        ├── format.js         ← форматування розмірів, дат, прогрес-бар
        └── reports.js        ← вивід звітів усіх команд у консоль
```

У `lib/` лежать тільки класи команд, у `lib/utils/` — допоміжні модулі без класів.

## Архітектура

### Розділення логіки й виводу

Кожна команда — окремий клас, що наслідується від `EventEmitter`. Класи тільки виконують роботу й повідомляють про неї подіями. Вони нічого не виводять у консоль і не завершують процес.

Усе, що бачить користувач, робить [`file-organizer.js`](file-organizer.js): підписується на події, малює прогрес-бар і викликає функції з [`reports.js`](lib/utils/reports.js).

Назви всіх подій зібрані в об'єкті `EVENTS` у [`constants.js`](lib/utils/constants.js), тож у коді немає рядкових назв подій.

### Події

| Клас | Подія | Коли надсилається | Дані |
|---|---|---|---|
| `Scanner` | `scan-start` | на початку сканування | `{ directory }` |
| | `file-found` | файл успішно прочитано | `{ name, path, size, mtime, ext }` |
| | `file-processed` | після кожного файлу (для прогресу) | `{ processed, total }` |
| | `scan-complete` | сканування завершено | уся статистика |
| `DuplicateFinder` | `search-start` | на початку пошуку | `{ directory }` |
| | `file-processed` | хеш файлу обчислено | `{ processed, total }` |
| | `duplicates-found` | пошук завершено | `{ directory, duplicates }` |
| `Organizer` | `copy-start` | перед копіюванням файлу | `{ source, destination, category }` |
| | `copy-complete` | файл скопійовано | `{ source, destination, category, size, processed, total }` |
| | `copy-error` | файл не вдалося скопіювати | `{ path, error, processed, total }` |
| | `file-processed` | після кожного файлу | `{ processed, total }` |
| `Cleanup` | `file-found` | знайдено файл для видалення | `{ name, path, size, mtime }` |
| | `file-deleted` | файл видалено | `{ name, path, size, mtime, processed, total }` |
| | `file-processed` | після кожного файлу | `{ processed, total }` |
| | `cleanup-complete` | видалення завершено | `{ deletedCount, freedSize, failed }` |
| усі класи | `file-error` | помилка з окремим файлом, файл пропущено | `{ path, error }` |
| | `error` | фатальна помилка, робота зупинена | `Error` |

## Обробка помилок

Усі файлові операції обгорнуті в `try...catch`. Помилки поділяються на два рівні:

- **Фатальні** — не вдалося прочитати директорію чи створити папки категорій. Клас надсилає подію `error`, програма виводить повідомлення й завершується з кодом виходу `1`.
- **Помилки окремих файлів** — файл видалили під час роботи, до нього немає доступу тощо. Клас надсилає `file-error` (або `copy-error`), пропускає файл і продовжує роботу. Прогрес-бар однаково доходить до кінця.

Коди помилок Node.js перетворюються на зрозумілий текст (функція `describeError` у [`cli.js`](lib/utils/cli.js)):

| Код | Повідомлення |
|---|---|
| `ENOENT` | File or directory not found |
| `EACCES` | Permission denied |
| `EPERM` | Operation not permitted |
| `ENOTDIR` | Not a directory |
| `EISDIR` | Is a directory |
| `EBUSY` | File is busy or locked |
| `ENOSPC` | No space left on device |
| `EMFILE` | Too many open files |
| інші | Unexpected error: … |

Приклади:

```
❌ Error: File or directory not found: /Users/student/Downlods
❌ Error: Not a directory: /Users/student/report.pdf
⚠️  Permission denied: /Users/student/Downloads/locked.pdf (skipped)
```

Неправильні аргументи теж завершують програму з кодом `1` і підказкою:

```
❌ Error: Unknown command: sacn
Available commands: scan, duplicates, organize, cleanup

❌ Error: No output directory specified
Usage: node file-organizer.js organize <source> --output <target>

❌ Error: Invalid value for --older-than: abc (expected a non-negative whole number of days)
```
