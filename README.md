# Bible TUI

A terminal user interface for reading the Bible, with themes, search, and bookmarks.

![demo](https://github.com/user-attachments/assets/beaff202-2f02-4784-9c9a-b1762a5dda1b)

## Installation

```bash
npm install -g bibletui
```

## Usage

```bash
bible
```

## Keybindings

| Key | Action |
|-----|--------|
| `Tab` | Switch panels (Books, Chapters, Verses) |
| `Enter` | Select item |
| `s` | Search |
| `r` | Random verse |
| `a` | Add bookmark |
| `b` | View bookmarks |
| `d` | Delete bookmark (in bookmark view) |
| `t` | Change theme |
| `h` | Toggle help |
| `q` | Quit |

## Features

- Navigate books, chapters, and verses with keyboard
- Full-text search across all scripture
- Bookmarks with optional notes
- Multiple themes (nord, gruvbox, dracula, solarized, black-metal)
- Whole chapter or single verse view

## CLI Commands

For quick lookups without entering the TUI:

```bash
bible -r                          # Random verse
bible verse John 3 16             # Specific verse
bible chapter Psalms 23           # Full chapter
bible search "In the beginning"   # Search
```

## License

MIT
