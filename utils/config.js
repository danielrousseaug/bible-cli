const Conf = require('conf');
const path = require('path');

const schema = {
  theme: {
    type: 'string',
    enum: ['black-metal', 'nord', 'gruvbox', 'dracula', 'solarized'],
    default: 'black-metal'
  },
  translation: {
    type: 'string',
    default: 'kjv'
  },
  fontSize: {
    type: 'number',
    minimum: 1,
    maximum: 5,
    default: 2
  },
  showVerseNumbers: {
    type: 'boolean',
    default: true
  },
  bookmarks: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        book: { type: 'string' },
        chapter: { type: 'number' },
        verse: { type: 'number' },
        note: { type: 'string' }
      }
    },
    default: []
  }
};

// Store config locally in project root to avoid permission issues
const config = new Conf({ schema, cwd: path.resolve(__dirname, '..') });

// Helper functions
function getTheme() {
  const themes = {
    'black-metal': {
      // Black metal inspired - works on any background
      fg: '#c1c1c1',       // light gray text
      border: '#a89984',   // brighter taupe borders
      book: '#b8aa9e',     // lighter taupe for books
      chapter: '#9eb8b8',  // muted cyan for chapters
      verse: '#7a9e9e',    // muted teal for verse numbers
      highlight: '#d4a574', // warm highlight
      statusBg: '#665c54'  // darker taupe background for status
    },
    nord: {
      // Nord theme - clean and minimal
      fg: '#eceff4',       // snow storm white
      border: '#5e81ac',   // brighter frost blue
      book: '#88c0d0',     // frost cyan
      chapter: '#81a1c1',  // frost blue
      verse: '#5e81ac',    // frost darker blue
      highlight: '#8fbcbb', // frost teal
      statusBg: '#3b4252'  // polar night background for status
    },
    gruvbox: {
      // Gruvbox - warm retro groove
      fg: '#ebdbb2',       // light cream
      border: '#bdae93',   // brighter gray
      book: '#fabd2f',     // bright yellow
      chapter: '#b8bb26',  // bright green
      verse: '#83a598',    // bright blue
      highlight: '#fe8019', // bright orange
      statusBg: '#504945'  // dark gray background for status
    },
    dracula: {
      // Dracula - dark and vibrant
      fg: '#f8f8f2',       // foreground
      border: '#6272a4',   // comment (keeping this, it's already decent)
      book: '#ff79c6',     // pink
      chapter: '#8be9fd',  // cyan
      verse: '#bd93f9',    // purple
      highlight: '#50fa7b', // green
      statusBg: '#44475a'  // darker background for status
    },
    solarized: {
      // Solarized - works on light or dark
      fg: '#93a1a1',       // base1
      border: '#657b83',   // brighter base00
      book: '#268bd2',     // blue
      chapter: '#2aa198',  // cyan
      verse: '#859900',    // green
      highlight: '#cb4b16', // orange
      statusBg: '#073642'  // base02 background for status
    }
  };

  return themes[config.get('theme')];
}

function addBookmark(book, chapter, verse, note = '') {
  const bookmarks = config.get('bookmarks');
  bookmarks.push({ book, chapter, verse, note });
  config.set('bookmarks', bookmarks);
}

function removeBookmark(index) {
  const bookmarks = config.get('bookmarks');
  if (index >= 0 && index < bookmarks.length) {
    bookmarks.splice(index, 1);
    config.set('bookmarks', bookmarks);
    return true;
  }
  return false;
}

function updateBookmark(index, book, chapter, verse, note = '') {
  const bookmarks = config.get('bookmarks');
  if (index >= 0 && index < bookmarks.length) {
    bookmarks[index] = { book, chapter, verse, note };
    config.set('bookmarks', bookmarks);
    return true;
  }
  return false;
}

function moveBookmark(fromIndex, toIndex) {
  const bookmarks = config.get('bookmarks');
  if (fromIndex >= 0 && fromIndex < bookmarks.length &&
      toIndex >= 0 && toIndex < bookmarks.length) {
    const [bookmark] = bookmarks.splice(fromIndex, 1);
    bookmarks.splice(toIndex, 0, bookmark);
    config.set('bookmarks', bookmarks);
    return true;
  }
  return false;
}

function getBookmarks() {
  return config.get('bookmarks');
}

module.exports = {
  config,
  getTheme,
  addBookmark,
  removeBookmark,
  updateBookmark,
  moveBookmark,
  getBookmarks
};