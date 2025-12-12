const blessed = require('blessed');
const chalk = require('chalk');
const { getTheme, config } = require('./config');

class BibleUI {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'BibleCLI'
    });

    this.theme = getTheme();
    // track last displayed content for redraw (e.g., on theme change)
    this.lastDisplay = null;
    // track which panel is active (books, chapters, verses)
    this.activePanel = null;
    // navigation callbacks
    this.onNextVerse = null;
    this.onPrevVerse = null;
    this.initLayout();
    
    // Handle exit - only Ctrl+C quits the app
    this.screen.key('C-c', () => {
      process.exit(0);
    });
  }
  
  initLayout() {
    // Define active/inactive box styles
    const activeBoxStyle = {
      border: {
        type: 'line',
        fg: this.theme.highlight
      },
      style: {
        selected: {
          bg: this.theme.highlight,
          fg: this.theme.bg
        },
        border: {
          fg: this.theme.highlight,
          bold: true
        },
        label: {
          fg: this.theme.highlight,
          bold: true
        }
      }
    };

    const inactiveBoxStyle = {
      border: {
        type: 'line',
        fg: this.theme.border
      },
      style: {
        selected: {
          bg: this.theme.highlight,
          fg: this.theme.bg
        },
        border: {
          fg: this.theme.border
        },
        label: {
          fg: this.theme.book
        }
      }
    };

    // Books list (left column, full height)
    this.booksList = blessed.list({
      parent: this.screen,
      label: ' [*] Books ',
      top: 0,
      left: 0,
      width: '25%',
      height: '100%-1',
      keys: true,
      vi: true,
      mouse: true,
      ...activeBoxStyle
    });

    // Chapters list (middle column, top half)
    this.chaptersList = blessed.list({
      parent: this.screen,
      label: ' [ ] Chapters ',
      top: 0,
      left: '25%',
      width: '17%',
      height: '50%',
      keys: true,
      vi: true,
      mouse: true,
      ...inactiveBoxStyle
    });

    // Verses list (middle column, bottom half)
    this.versesList = blessed.list({
      parent: this.screen,
      label: ' [ ] Verses ',
      top: '50%',
      left: '25%',
      width: '17%',
      height: '50%-1',
      keys: true,
      vi: true,
      mouse: true,
      ...inactiveBoxStyle
    });
    
    // Define focus handlers to update styles
    const setActivePanel = (panel) => {
      // Reset all panels to inactive
      this.booksList.style.border.fg = this.theme.border;
      this.booksList.style.label.fg = this.theme.book;
      this.booksList.style.label.bold = false;
      this.booksList.setLabel(' [ ] Books ');

      this.chaptersList.style.border.fg = this.theme.border;
      this.chaptersList.style.label.fg = this.theme.chapter;
      this.chaptersList.style.label.bold = false;
      this.chaptersList.setLabel(' [ ] Chapters ');

      this.versesList.style.border.fg = this.theme.border;
      this.versesList.style.label.fg = this.theme.verse;
      this.versesList.style.label.bold = false;
      this.versesList.setLabel(' [ ] Verses ');

      // Set active panel
      panel.style.border.fg = this.theme.highlight;
      panel.style.label.fg = this.theme.highlight;
      panel.style.label.bold = true;

      // Update label with active indicator
      if (panel === this.booksList) {
        this.booksList.setLabel(' [*] Books ');
      } else if (panel === this.chaptersList) {
        this.chaptersList.setLabel(' [*] Chapters ');
      } else if (panel === this.versesList) {
        this.versesList.setLabel(' [*] Verses ');
      }

      // track the active panel for styling/theme updates
      this.activePanel = panel;
      this.screen.render();
    };
    
    // Add focus event handlers
    this.booksList.on('focus', () => setActivePanel(this.booksList));
    this.chaptersList.on('focus', () => setActivePanel(this.chaptersList));
    this.versesList.on('focus', () => setActivePanel(this.versesList));

    // Setup tab navigation between panels
    this.booksList.key('tab', () => this.chaptersList.focus());
    this.chaptersList.key('tab', () => this.versesList.focus());
    this.versesList.key('tab', () => this.contentBox.focus());

    // Setup shift+tab for reverse navigation
    this.booksList.key('S-tab', () => this.contentBox.focus());
    this.chaptersList.key('S-tab', () => this.booksList.focus());
    this.versesList.key('S-tab', () => this.chaptersList.focus());
    
    // Content box (enable tags for style markup) - right column
    this.contentBox = blessed.box({
      parent: this.screen,
      label: ' [ ] Scripture ',
      top: 0,
      left: '42%',
      width: '58%',
      height: '100%-1',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      focusable: true,
      border: { type: 'line' },
      style: {
        border: { fg: this.theme.border },
        focus: {
          border: { fg: this.theme.highlight }
        }
      },
      scrollbar: {
        ch: ' ',
        track: {
          bg: this.theme.border
        },
        style: {
          inverse: true
        }
      }
    });

    // Add contentBox to focus handlers
    this.contentBox.on('focus', () => {
      // Reset all panels to inactive
      this.booksList.style.border.fg = this.theme.border;
      this.booksList.style.label.fg = this.theme.book;
      this.booksList.style.label.bold = false;
      this.booksList.setLabel(' [ ] Books ');

      this.chaptersList.style.border.fg = this.theme.border;
      this.chaptersList.style.label.fg = this.theme.chapter;
      this.chaptersList.style.label.bold = false;
      this.chaptersList.setLabel(' [ ] Chapters ');

      this.versesList.style.border.fg = this.theme.border;
      this.versesList.style.label.fg = this.theme.verse;
      this.versesList.style.label.bold = false;
      this.versesList.setLabel(' [ ] Verses ');

      // Set contentBox as active
      this.contentBox.style.border.fg = this.theme.highlight;
      this.contentBox.setLabel(' [*] Scripture ');

      this.activePanel = this.contentBox;
      this.screen.render();
    });

    // Setup tab navigation for contentBox
    this.contentBox.key('tab', () => this.booksList.focus());
    this.contentBox.key('S-tab', () => this.versesList.focus());

    // Status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      content: '{center}TAB:Switch | n/p:Next/Prev | r:Random | a:Bookmark | b:Bookmarks | s:Search | h:Help{/center}',
      tags: true,
      style: {
        fg: this.theme.fg,
        bg: this.theme.statusBg,
        bold: true
      }
    });
    
    // Help box (hidden by default)
    this.helpBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: '60%',
      content: this.getHelpContent(),
      tags: true,
      border: { type: 'line' },
      style: {
        border: { fg: this.theme.highlight },
        fg: this.theme.fg
      },
      hidden: true
    });
    
    // Help key binding
    this.screen.key('h', () => {
      if (this.helpBox.hidden) {
        this.helpBox.show();
        this.helpBox.setFront();
        this.helpBox.focus();
      } else {
        this.helpBox.hide();
        if (this.activePanel) {
          this.activePanel.focus();
        } else {
          this.booksList.focus();
        }
      }
      this.screen.render();
    });

    // Navigation: next verse with ] or n
    this.screen.key([']', 'n'], () => {
      if (this.onNextVerse) {
        this.onNextVerse();
      }
    });

    // Navigation: previous verse with [ or p
    this.screen.key(['[', 'p'], () => {
      if (this.onPrevVerse) {
        this.onPrevVerse();
      }
    });

    // Help box close handlers
    this.helpBox.key(['escape', 'q', 'h'], () => {
      this.helpBox.hide();
      // Restore focus to active panel or default to books list
      if (this.activePanel) {
        this.activePanel.focus();
      } else {
        this.booksList.focus();
      }
      this.screen.render();
    });
  }
  
  getHelpContent() {
    return `
      {bold}BibleCLI Keyboard Shortcuts{/bold}

      {bold}Navigation{/bold}
      - Arrow keys: Navigate lists / Scroll scripture
      - Tab: Switch between panels
      - Shift+Tab: Switch panels (reverse)
      - Enter: Select item
      - n or ]: Next verse
      - p or [: Previous verse

      {bold}Actions{/bold}
      - r: Random verse
      - s: Search (select to navigate)
      - b: View bookmarks (select to navigate)
      - a: Add bookmark
      - t: Change theme

      {bold}Other{/bold}
      - h: Toggle help
      - Esc/q: Close menus
      - Ctrl+C: Quit app
    `;
  }
  
  setNavigation(onNext, onPrev) {
    this.onNextVerse = onNext;
    this.onPrevVerse = onPrev;
  }

  setBooks(books) {
    this.booksList.setItems(books.map(b => ` ${b.abbrev} - ${b.name}`));
    this.screen.render();
  }
  
  setChapters(chapters) {
    this.chaptersList.setItems(chapters.map(c => ` ${c}`));
    this.screen.render();
  }
  
  setVerses(verses) {
    this.versesList.setItems(verses.map(v => ` ${v}`));
    this.screen.render();
  }
  
  displayScripture(book, chapter, verses) {
    // remember last displayed scripture for redraw on theme change
    this.lastDisplay = { type: 'scripture', book, chapter, verses };
    const theme = getTheme();
    let content = `{bold}${book.name} ${chapter.chapter}{/bold}\n\n`;

    verses.forEach(verse => {
      const verseNum = chalk.hex(theme.verse)(`${verse.verse} `);
      content += `${verseNum}${verse.text}\n\n`;
    });

    this.contentBox.setContent(content);
    this.contentBox.setScrollPerc(0); // Reset scroll to top
    this.screen.render();
  }
  
  setStatus(text) {
    this.statusBar.setContent(`{center}${text}{/center}`);
    this.screen.render();
  }
  
  showSearchPrompt(callback) {
    const searchPrompt = blessed.prompt({
      parent: this.screen,
      border: { type: 'line' },
      height: 'shrink',
      width: 'half',
      top: 'center',
      left: 'center',
      label: ' Search ',
      tags: true,
      keys: true,
      vi: true
    });
    
    searchPrompt.input('Enter search term:', '', (err, value) => {
      if (!err && value) {
        callback(value);
      } else {
        // Cancelled or empty - restore focus
        if (this.activePanel) {
          this.activePanel.focus();
        } else {
          this.contentBox.focus();
        }
      }
      this.screen.render();
    });
  }
  
  showSearchResults(results, query, onSelect) {
    // remember last search results for redraw on theme change
    this.lastDisplay = { type: 'search', results, query };
    if (results.length === 0) {
      this.setStatus('No results found');
      return;
    }

    // Create a list for search results
    const searchList = blessed.list({
      parent: this.screen,
      label: ` Search Results: "${query}" (${results.length}) `,
      top: 'center',
      left: 'center',
      width: '90%',
      height: '80%',
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      style: {
        selected: { bg: this.theme.highlight, bold: true },
        border: { fg: this.theme.highlight },
        label: { fg: this.theme.highlight, bold: true },
        item: { fg: this.theme.fg }
      },
      scrollbar: {
        ch: ' ',
        style: {
          inverse: true
        }
      }
    });

    // Format search results for display
    const items = results.map(result => {
      // Truncate long verses for display
      const text = result.text.length > 100 ? result.text.substring(0, 100) + '...' : result.text;
      return `${result.book} ${result.chapter}:${result.verse} - ${text}`;
    });

    searchList.setItems(items);
    searchList.focus();

    // Handle selection
    searchList.on('select', (item, index) => {
      const result = results[index];
      searchList.destroy();
      this.screen.render();
      if (onSelect) {
        onSelect(result);
      }
    });

    // Handle cancel
    searchList.key(['escape', 'q'], () => {
      searchList.destroy();
      // Restore focus to active panel or default to content box
      if (this.activePanel) {
        this.activePanel.focus();
      } else {
        this.contentBox.focus();
      }
      this.screen.render();
    });

    this.screen.render();
  }
  
  showBookmarks(bookmarks, onSelect, onUpdate) {
    // remember last bookmarks display for redraw on theme change
    this.lastDisplay = { type: 'bookmarks', bookmarks };
    if (bookmarks.length === 0) {
      this.setStatus('No bookmarks found');
      return;
    }

    // Create a box container to hold the list and footer
    const container = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      border: { type: 'line' },
      style: {
        border: { fg: this.theme.highlight }
      }
    });

    // Create a list for bookmarks (vi: false to prevent double j/k handling)
    const bookmarksList = blessed.list({
      parent: container,
      label: ' Bookmarks ',
      top: 0,
      left: 0,
      width: '100%-2',
      height: '100%-3',
      keys: true,
      vi: false,
      mouse: true,
      style: {
        selected: { bg: this.theme.highlight, bold: true },
        label: { fg: this.theme.highlight, bold: true },
        item: { fg: this.theme.fg }
      },
      scrollbar: {
        ch: ' ',
        style: {
          inverse: true
        }
      }
    });

    // Add footer with instructions
    const footer = blessed.box({
      parent: container,
      bottom: 0,
      left: 0,
      width: '100%-2',
      height: 1,
      content: '{center}Enter:Navigate | j/k:Move | Shift+J/K:Reorder | d:Delete | e:Edit | Esc:Close{/center}',
      tags: true,
      style: {
        fg: this.theme.verse
      }
    });

    // Helper function to refresh the list (optionally select a specific index)
    const refreshList = (selectIndex) => {
      const items = bookmarks.map((bookmark, index) => {
        let item = `${index + 1}. ${bookmark.book} ${bookmark.chapter}:${bookmark.verse}`;
        if (bookmark.note) {
          item += ` - ${bookmark.note}`;
        }
        return item;
      });
      const targetIndex = selectIndex !== undefined ? selectIndex : bookmarksList.selected;
      bookmarksList.setItems(items);
      if (targetIndex >= 0 && targetIndex < items.length) {
        bookmarksList.select(targetIndex);
      } else if (items.length > 0) {
        bookmarksList.select(0);
      }
      this.screen.render();
    };

    // Format bookmarks for display
    refreshList();

    // Handle cancel - set up BEFORE focusing
    bookmarksList.key(['escape', 'q'], () => {
      container.destroy();
      // Restore focus to active panel or default to content box
      if (this.activePanel) {
        this.activePanel.focus();
      } else {
        this.contentBox.focus();
      }
      this.screen.render();
    });

    // Handle selection (Enter)
    bookmarksList.on('select', (item, index) => {
      const bookmark = bookmarks[index];
      container.destroy();
      this.screen.render();
      if (onSelect) {
        onSelect(bookmark);
      }
    });

    // Handle delete (d)
    bookmarksList.key('d', () => {
      const index = bookmarksList.selected;
      if (index >= 0 && index < bookmarks.length) {
        bookmarks.splice(index, 1);
        if (onUpdate) {
          onUpdate(bookmarks);
        }
        if (bookmarks.length === 0) {
          container.destroy();
          this.setStatus('All bookmarks deleted');
          // Restore focus when all bookmarks deleted
          if (this.activePanel) {
            this.activePanel.focus();
          } else {
            this.contentBox.focus();
          }
          this.screen.render();
        } else {
          refreshList();
        }
      }
    });

    // Handle edit note (e)
    bookmarksList.key('e', () => {
      const index = bookmarksList.selected;
      if (index >= 0 && index < bookmarks.length) {
        const bookmark = bookmarks[index];
        const notePrompt = blessed.prompt({
          parent: this.screen,
          border: { type: 'line' },
          height: 'shrink',
          width: 'half',
          top: 'center',
          left: 'center',
          label: ' Edit Bookmark Note ',
          tags: true,
          keys: true,
          vi: true
        });

        notePrompt.input('Edit note:', bookmark.note || '', (err, note) => {
          if (!err) {
            bookmark.note = note || '';
            if (onUpdate) {
              onUpdate(bookmarks);
            }
            refreshList();
          }
          bookmarksList.focus();
          this.screen.render();
        });
      }
    });

    // Handle navigation (j/k - vim style)
    bookmarksList.key(['j'], () => {
      const index = bookmarksList.selected;
      if (index < bookmarks.length - 1) {
        bookmarksList.select(index + 1);
        this.screen.render();
      }
    });

    bookmarksList.key(['k'], () => {
      const index = bookmarksList.selected;
      if (index > 0) {
        bookmarksList.select(index - 1);
        this.screen.render();
      }
    });

    // Handle reorder up (Shift+K)
    bookmarksList.key(['S-k'], () => {
      const index = bookmarksList.selected;
      if (index > 0) {
        // Swap with item above
        const temp = bookmarks[index];
        bookmarks[index] = bookmarks[index - 1];
        bookmarks[index - 1] = temp;
        if (onUpdate) {
          onUpdate(bookmarks);
        }
        refreshList(index - 1);
      }
    });

    // Handle reorder down (Shift+J)
    bookmarksList.key(['S-j'], () => {
      const index = bookmarksList.selected;
      if (index >= 0 && index < bookmarks.length - 1) {
        // Swap with item below
        const temp = bookmarks[index];
        bookmarks[index] = bookmarks[index + 1];
        bookmarks[index + 1] = temp;
        if (onUpdate) {
          onUpdate(bookmarks);
        }
        refreshList(index + 1);
      }
    });

    // Now focus the list after all handlers are set up
    bookmarksList.focus();
    this.screen.render();
  }
  
  /**
   * Display a temporary theme picker menu and apply selection
   */
  showThemePicker() {
    const themes = ['black-metal', 'nord', 'gruvbox', 'dracula', 'solarized'];
    const picker = blessed.list({
      parent: this.screen,
      label: ' Select Theme ',
      top: 'center',
      left: 'center',
      width: '30%',
      height: themes.length + 4,
      keys: true,
      vi: true,
      mouse: true,
      items: themes.map(t => ` ${t}`),
      border: { type: 'line', fg: this.theme.highlight },
      style: {
        selected: { bg: this.theme.highlight },
        item: { fg: this.theme.fg },
        label: { fg: this.theme.highlight, bold: true }
      }
    });
    picker.focus();
    this.screen.render();
    picker.on('select', (item, index) => {
      const chosen = themes[index];
      config.set('theme', chosen);
      this.applyTheme();
      picker.destroy();
      // Restore focus to active panel or default to content box
      if (this.activePanel) {
        this.activePanel.focus();
      } else {
        this.contentBox.focus();
      }
      this.screen.render();
    });
    picker.key(['escape', 'q'], () => {
      picker.destroy();
      // Restore focus to active panel or default to content box
      if (this.activePanel) {
        this.activePanel.focus();
      } else {
        this.contentBox.focus();
      }
      this.screen.render();
    });
  }

  /**
   * Apply the current theme to all UI components and redraw content
   */
  applyTheme() {
    this.theme = getTheme();
    // Update panel styles
    const panels = [
      { panel: this.booksList, name: 'Books', colorKey: 'book' },
      { panel: this.chaptersList, name: 'Chapters', colorKey: 'chapter' },
      { panel: this.versesList, name: 'Verses', colorKey: 'verse' }
    ];
    panels.forEach(({ panel, name, colorKey }) => {
      const isActive = panel === this.activePanel;
      panel.style.border.fg = isActive ? this.theme.highlight : this.theme.border;
      panel.style.label.fg = isActive ? this.theme.highlight : this.theme[colorKey];
      panel.style.label.bold = !!isActive;
      panel.setLabel(isActive ? ` [*] ${name} ` : ` [ ] ${name} `);
    });
    // Update scripture box border
    const contentBoxActive = this.contentBox === this.activePanel;
    this.contentBox.style.border.fg = contentBoxActive ? this.theme.highlight : this.theme.border;
    this.contentBox.setLabel(contentBoxActive ? ' [*] Scripture ' : ' [ ] Scripture ');
    // Update status bar colors
    this.statusBar.style.fg = this.theme.fg;
    this.statusBar.style.bg = this.theme.statusBg;
    this.statusBar.style.bold = true;
    // Update help box
    this.helpBox.style.border.fg = this.theme.highlight;
    this.helpBox.style.fg = this.theme.fg;
    // Redraw last content to apply new text colors
    this.redrawContent();
  }

  /**
   * Redraw current displayed content (scripture, search, or bookmarks)
   */
  redrawContent() {
    if (!this.lastDisplay) return;
    const d = this.lastDisplay;
    switch (d.type) {
      case 'scripture':
        this.displayScripture(d.book, d.chapter, d.verses);
        break;
      case 'search':
        // Don't redraw search on theme change - they're in a modal
        break;
      case 'bookmarks':
        // Don't redraw bookmarks on theme change - they're in a modal
        break;
    }
  }
  
  render() {
    this.screen.render();
  }
}

module.exports = BibleUI;