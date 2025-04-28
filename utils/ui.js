const blessed = require('blessed');
const contrib = require('blessed-contrib');
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
    this.initLayout();
    
    // Handle exit
    this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
  }
  
  initLayout() {
    // Create a grid layout
    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen
    });
    
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
    
    // Books list
    this.booksList = this.grid.set(0, 0, 12, 3, blessed.list, {
      label: ' [*] Books ',
      keys: true,
      vi: true,
      mouse: true,
      ...activeBoxStyle
    });
    
    // Chapters list
    this.chaptersList = this.grid.set(0, 3, 6, 2, blessed.list, {
      label: ' [ ] Chapters ',
      keys: true,
      vi: true,
      mouse: true,
      ...inactiveBoxStyle
    });
    
    // Verses list
    this.versesList = this.grid.set(6, 3, 6, 2, blessed.list, {
      label: ' [ ] Verses ',
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
    this.versesList.key('tab', () => this.booksList.focus());
    
    // Setup shift+tab for reverse navigation
    this.booksList.key('S-tab', () => this.versesList.focus());
    this.chaptersList.key('S-tab', () => this.booksList.focus());
    this.versesList.key('S-tab', () => this.chaptersList.focus());
    
    // Content box (enable tags for style markup)
    this.contentBox = this.grid.set(0, 5, 12, 7, blessed.box, {
      label: ' Scripture ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      border: { type: 'line' },
      style: {
        border: { fg: this.theme.border }
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
    
    // Status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      content: '{center}TAB:Switch panels | ENTER:Select | s:Search | b:Bookmarks | h:Help | q:Quit{/center}',
      tags: true,
      style: {
        bg: this.theme.border,
        fg: this.theme.bg
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
        border: { fg: this.theme.border },
        bg: this.theme.bg,
        fg: this.theme.fg
      },
      hidden: true
    });
    
    // Help key binding
    this.screen.key('h', () => {
      this.helpBox.hidden = !this.helpBox.hidden;
      this.screen.render();
    });
  }
  
  getHelpContent() {
    return `
      {bold}BibleCLI Keyboard Shortcuts{/bold}
      
      {bold}Navigation{/bold}
      - Arrow keys: Navigate lists
      - Tab: Switch between lists
      - Enter: Select item
      
      {bold}Actions{/bold}
      - s: Search
      - b: Bookmarks
      - t: Change theme
      - f: Change font size
      - m: Toggle verse numbers
      
      {bold}Other{/bold}
      - h: Toggle help
      - q/Esc: Quit
    `;
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
      }
      this.screen.render();
    });
  }
  
  showSearchResults(results) {
    // remember last search results for redraw on theme change
    this.lastDisplay = { type: 'search', results };
    if (results.length === 0) {
      this.setStatus('No results found');
      return;
    }
    
    const theme = getTheme();
    let content = `{bold}Search Results (${results.length}){/bold}\n\n`;
    
    results.forEach(result => {
      const reference = chalk.hex(theme.book)(`${result.book} ${result.chapter}:${result.verse}`);
      content += `${reference} - ${result.text}\n\n`;
    });
    
    this.contentBox.setContent(content);
    this.screen.render();
  }
  
  showBookmarks(bookmarks) {
    // remember last bookmarks display for redraw on theme change
    this.lastDisplay = { type: 'bookmarks', bookmarks };
    if (bookmarks.length === 0) {
      this.setStatus('No bookmarks found');
      return;
    }
    
    const theme = getTheme();
    let content = `{bold}Bookmarks (${bookmarks.length}){/bold}\n\n`;
    
    bookmarks.forEach((bookmark, index) => {
      const reference = chalk.hex(theme.book)(`${bookmark.book} ${bookmark.chapter}:${bookmark.verse}`);
      content += `${index + 1}. ${reference}`;
      if (bookmark.note) {
        content += ` - ${bookmark.note}`;
      }
      content += '\n\n';
    });
    
    this.contentBox.setContent(content);
    this.screen.render();
  }
  
  /**
   * Display a temporary theme picker menu and apply selection
   */
  showThemePicker() {
    const themes = ['default', 'dark', 'light', 'sepia', 'black-metal-gorgoroth'];
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
      border: { type: 'line', fg: this.theme.border },
      style: {
        selected: { bg: this.theme.highlight, fg: this.theme.bg },
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
      this.screen.render();
    });
    picker.key(['escape', 'q'], () => {
      picker.destroy();
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
    this.contentBox.style.border.fg = this.theme.border;
    // Update status bar colors
    this.statusBar.style.bg = this.theme.border;
    this.statusBar.style.fg = this.theme.bg;
    // Update help box
    this.helpBox.style.border.fg = this.theme.border;
    this.helpBox.style.bg = this.theme.bg;
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
        this.showSearchResults(d.results);
        break;
      case 'bookmarks':
        this.showBookmarks(d.bookmarks);
        break;
    }
  }
  
  render() {
    this.screen.render();
  }
}

module.exports = BibleUI;