 # Bible CLI

 A powerful command-line tool and interactive terminal UI for reading the Bible, complete with themes, search, bookmarks, and more.

 ## Features

 - Interactive terminal UI with book, chapter, and verse navigation
 - Single-shot commands for verse, chapter, search, and random verses
 - Random verse generator: `-r, --random`
 - Bookmarks with optional notes
 - Theming system (default, dark, light, sepia, black-metal-gorgoroth, etc.)
 - Whole-chapter view option in the Verses panel
 - Easy JSON data downloader for KJV and other sources
 - Configuration stored locally in `config.json`

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
 - `bible download <source>`  
   Download full Bible JSON (simple_json, kjv, etc.).
 - `bible demo`  
   Run a non-interactive demo.

 ## Interactive TUI

 Simply run:
 ```bash
 bible read
 ```
 or:
 ```bash
 bible
 ```

 - **Tab** to switch panels (Books, Chapters, Verses).
 - **Enter** to select.
 - In the Verses panel, the top entry **Whole chapter** shows the entire chapter.
 - **s** to search, **b** to view bookmarks, **t** to pick theme, **q**/Esc to quit.

 ## Configuration

 A `config.json` in the project root stores:
 - `theme`: current theme name
 - `translation`: Bible JSON key (e.g. "kjv")
 - `fontSize`: font size setting (unused in TUI)
 - `showVerseNumbers`: toggle verse numbers (unused in TUI)
 - `bookmarks`: array of `{book,chapter,verse,note}` objects

 You can edit `config.json` by hand or via the CLI commands.

 ## Data

 By default the repo includes a minimal `src/data/bible-kjv.json`. To fetch the full KJV:
 ```bash
 bible download simple_json
 ```

 ## Contributing

 Pull requests welcome! Please:
 1. Fork the repo and create a feature branch
 2. Write tests and update docs
 3. Run `npm test`
 4. Open a pull request

 ## License

 MIT