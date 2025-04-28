const Conf = require('conf');
const path = require('path');

const schema = {
  theme: {
    type: 'string',
    enum: ['default', 'dark', 'light', 'sepia', 'black-metal-gorgoroth'],
    default: 'default'
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
    default: {
      bg: 'black',
      fg: 'white',
      border: 'blue',
      book: 'yellow',
      chapter: 'green',
      verse: 'cyan',
      highlight: 'magenta'
    },
    dark: {
      bg: '#121212',
      fg: '#e0e0e0',
      border: '#404040',
      book: '#bb86fc',
      chapter: '#03dac6',
      verse: '#3700b3',
      highlight: '#cf6679'
    },
    light: {
      bg: '#ffffff',
      fg: '#121212',
      border: '#757575',
      book: '#6200ee',
      chapter: '#03dac6',
      verse: '#3700b3',
      highlight: '#b00020'
    },
    sepia: {
      bg: '#f4ecd8',
      fg: '#5b4636',
      border: '#a38d72',
      book: '#7a623c',
      chapter: '#5b4636',
      verse: '#a38d72',
      highlight: '#7a623c'
    }
    ,
    'black-metal-gorgoroth': {
      bg: '#000000',       // primary background (black)
      fg: '#c1c1c1',       // primary text (light gray)
      border: '#8a7f72',   // taupe borders
      book: '#8a7f72',     // taupe for book list items
      chapter: '#8a7f72',  // taupe for chapter list items
      verse: '#5f8787',    // muted red for verse numbers
      highlight: '#688686' // teal-blue highlights/selections
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

function getBookmarks() {
  return config.get('bookmarks');
}

module.exports = {
  config,
  getTheme,
  addBookmark,
  removeBookmark,
  getBookmarks
};