 # Bible CLI

 A command-line tool and interactive terminal UI for reading the Bible, complete with themes, search, bookmarks, and more.
 
![demo](https://github.com/user-attachments/assets/beaff202-2f02-4784-9c9a-b1762a5dda1b)

 ## Features

 - Interactive terminal UI with book, chapter, and verse navigation
 - Single-shot commands for verse, chapter, search, and random verses
 - Random verse generator: `-r, --random`
 - Bookmarks with optional notes
 - Theming system (default, dark, light, sepia, black-metal-gorgoroth, etc.)
- Whole-chapter view option in the Verses panel
 - Configuration stored locally in `config.json`
 - Keyboard-driven bookmark management in TUI (add with `a`, view with `b`, delete with `d`)
 - Random verse jump in TUI (`r` key)
 - Quit only via `q` or `Ctrl-C`; `Esc` now only closes the help dialog

 ## Installation

 ```bash
 git clone <repository-url>
 cd bible
 npm install
 npm link
 ```

 ## Quick Commands

 - `bible -r` or `bible --random`  
   Show a random verse.
 - `bible verse <Book> <Chapter> <Verse>`  
   E.g. `bible verse John 3 16`.
 - `bible chapter <Book> <Chapter>`  
   E.g. `bible chapter Psalms 23`.
 - `bible search "<query>"`  
   E.g. `bible search "In the beginning"`.
 - `bible bookmark <Book> <Chapter> <Verse> ["Note"]`  
   Add a bookmark.
 - `bible bookmarks`  
   List all bookmarks.
 - `bible theme <theme>`  
   Change theme (default, dark, light, sepia, black-metal-gorgoroth).
 - `bible demo`  
   Run a non-interactive demo.

 ## Interactive TUI

 Simply run:
 ```bash
 bible
 ```

 - **Tab** to switch panels (Books, Chapters, Verses).
 - **Enter** to select.
 - In the Verses panel, the top entry **Whole chapter** shows the entire chapter.
 - **s** to search, **a** to add a bookmark for the current verse, **b** to view bookmarks (`d` to delete), **r** for a random verse, **t** to pick theme.
 - **h** to toggle help; **Esc** closes help; **q** or **Ctrl-C** quits the app.

 ## Configuration

 A `config.json` in the project root stores:
 - `theme`: current theme name
 - `translation`: Bible JSON key (e.g. "kjv")
 - `fontSize`: font size setting (unused in TUI)
 - `showVerseNumbers`: toggle verse numbers (unused in TUI)
 - `bookmarks`: array of `{book,chapter,verse,note}` objects

 You can edit `config.json` by hand or via the CLI commands.

 ## Contributing

 Pull requests welcome! Please:
 1. Fork the repo and create a feature branch
 2. Write tests and update docs
 3. Run `npm test`
 4. Open a pull request

 ## License

 MIT
