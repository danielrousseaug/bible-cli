#!/usr/bin/env node

const { program } = require('commander');
const BibleReader = require('../utils/bible');
const { config, addBookmark, removeBookmark, getBookmarks } = require('../utils/config');

const bible = new BibleReader(config.get('translation'));
// Early handler for random verse flag (e.g., -r or --random)
{
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes('-r') || rawArgs.includes('--random')) {
    const rand = bible.getRandomVerse();
    if (rand) {
      console.log(`${rand.book} ${rand.chapter}:${rand.verse} - ${rand.text}`);
    } else {
      console.error('No verse found');
    }
    process.exit(0);
  }
}

// Only load UI in interactive mode to prevent terminal issues
let ui;

// Simple function to display text content without TUI
function displayText(content) {
  console.log('\n' + content + '\n');
}

// Setup CLI commands
program
  .name('bible')
  .description('A riced-out CLI tool for reading the Bible')
  .version('0.1.0')
  .option('-r, --random', 'Display a random verse');


program
  .command('read')
  .description('Start interactive Bible reader')
  .action(() => {
    try {
      // Load UI only when needed
      const BibleUI = require('../utils/ui');
      ui = new BibleUI();
      startInteractiveBible();
    } catch (error) {
      console.error('Error starting interactive mode:', error.message);
      console.error('If running in a limited terminal, try the command-line commands instead:');
      console.error('  node cli/index.js verse John 3 16');
      console.error('  node cli/index.js chapter Genesis 1');
      console.error('  node cli/index.js search "beginning"');
    }
  });

program
  .command('verse <book> <chapter> <verse>')
  .description('Display a specific verse')
  .action((book, chapter, verse) => {
    const result = bible.getVerse(book, chapter, verse);
    if (result) {
      console.log(`${book} ${chapter}:${verse} - ${result.text}`);
    } else {
      console.error('Verse not found');
    }
  });

program
  .command('chapter <book> <chapter>')
  .description('Display a specific chapter')
  .action((book, chapter) => {
    const chapterData = bible.getChapter(book, chapter);
    if (chapterData) {
      console.log(`${book} ${chapter}`);
      chapterData.verses.forEach(verse => {
        console.log(`${verse.verse}. ${verse.text}`);
      });
    } else {
      console.error('Chapter not found');
    }
  });

program
  .command('search <query>')
  .description('Search the Bible')
  .action((query) => {
    const results = bible.search(query);
    console.log(`Found ${results.length} results for "${query}":`);
    results.forEach(result => {
      console.log(`${result.book} ${result.chapter}:${result.verse} - ${result.text}`);
    });
  });

program
  .command('bookmark <book> <chapter> <verse> [note]')
  .description('Add a bookmark')
  .action((book, chapter, verse, note) => {
    addBookmark(book, parseInt(chapter), parseInt(verse), note);
    console.log(`Bookmark added for ${book} ${chapter}:${verse}`);
  });

program
  .command('bookmarks')
  .description('List all bookmarks')
  .action(() => {
    const bookmarks = getBookmarks();
    console.log('Bookmarks:');
    bookmarks.forEach((bookmark, index) => {
      console.log(`${index + 1}. ${bookmark.book} ${bookmark.chapter}:${bookmark.verse}${bookmark.note ? ` - ${bookmark.note}` : ''}`);
    });
  });

program
  .command('theme <theme>')
  .description('Set theme (default, dark, light, sepia, black-metal-gorgoroth)')
  .action((theme) => {
    if (['default', 'dark', 'light', 'sepia', 'black-metal-gorgoroth'].includes(theme)) {
      config.set('theme', theme);
      console.log(`Theme set to ${theme}`);
    } else {
      console.error('Invalid theme');
    }
  });

// Interactive Bible reader
function startInteractiveBible() {
  const books = bible.getBooks();
  ui.setBooks(books);
  
  // Define event handlers outside to avoid multiple registrations
  // Chapter selection handler: show chapter & prepare verse options (including whole chapter)
  function setupChapterHandler(bookData, selectedBook) {
    ui.chaptersList.removeAllListeners('select');
    ui.chaptersList.on('select', (chapterItem, chapterIndex) => {
      const selectedChapter = bookData.chapters[chapterIndex];
      // Build verse list with an 'All' option at top
      const verseNumbers = selectedChapter.verses.map(v => v.verse);
      // Prepend option to show entire chapter
      verseNumbers.unshift('Whole chapter');
      ui.setVerses(verseNumbers);
      // Display full chapter initially
      ui.displayScripture(selectedBook, selectedChapter, selectedChapter.verses);
      ui.setStatus(`Reading: ${selectedBook.name} ${selectedChapter.chapter}`);
      setupVerseHandler(selectedBook, selectedChapter);
      // Focus on verses list after selection
      ui.versesList.focus();
    });
  }
  
  // Verse selection handler: either re-show whole chapter or single verse
  function setupVerseHandler(selectedBook, selectedChapter) {
    ui.versesList.removeAllListeners('select');
    ui.versesList.on('select', (verseItem, verseIndex) => {
      if (verseIndex === 0) {
        // 'All' selected: show entire chapter
        ui.displayScripture(selectedBook, selectedChapter, selectedChapter.verses);
        ui.setStatus(`Reading: ${selectedBook.name} ${selectedChapter.chapter}`);
      } else {
        // Specific verse selected (index-1)
        const v = selectedChapter.verses[verseIndex - 1];
        ui.contentBox.setContent(`{bold}${selectedBook.name} ${selectedChapter.chapter}:${v.verse}{/bold}\n\n${v.text}`);
        ui.setStatus(`Selected: ${selectedBook.name} ${selectedChapter.chapter}:${v.verse}`);
      }
      ui.render();
    });
  }
  
  // Book selection
  ui.booksList.on('select', (item, index) => {
    const selectedBook = books[index];
    const bookData = bible.getBook(selectedBook.name);
    const chapters = bookData.chapters.map(c => c.chapter);
    
    ui.setChapters(chapters);
    ui.setStatus(`Selected: ${selectedBook.name}`);
    
    setupChapterHandler(bookData, selectedBook);
    
    // Focus on chapters list after selection
    ui.chaptersList.focus();
  });
  
  // Search functionality
  ui.screen.key('s', () => {
    ui.showSearchPrompt((query) => {
      const results = bible.search(query);
      ui.showSearchResults(results);
      ui.setStatus(`Search results for: "${query}"`);
    });
  });
  
  // Bookmark functionality
  ui.screen.key('b', () => {
    const bookmarks = getBookmarks();
    ui.showBookmarks(bookmarks);
    ui.setStatus('Showing bookmarks');
  });
  
  // Theme picker within UI
  ui.screen.key('t', () => {
    ui.showThemePicker();
  });
  
  // Initialize focus
  ui.booksList.focus();
  ui.render();
}

// Simple demo mode
program
  .command('demo')
  .description('Run a simple demo without TUI')
  .action(() => {
    // Display available books
    const books = bible.getBooks();
    displayText('Available Books:');
    books.forEach(book => {
      console.log(`- ${book.abbrev}: ${book.name}`);
    });
    
    // Find a book that exists in the data
    const sampleBook = books[0];
    const bookName = sampleBook.name;
    const bookData = bible.getBook(bookName);
    
    // Find the first chapter and verse with valid data
    let chapterNum, verseNum, verseText;
    
    // Find the first valid chapter and verse
    for (const chapter of bookData.chapters || []) {
      if (chapter && chapter.verses && chapter.verses.length > 0) {
        for (const verse of chapter.verses) {
          if (verse && verse.text) {
            chapterNum = chapter.chapter;
            verseNum = verse.verse;
            verseText = verse.text;
            break;
          }
        }
        if (chapterNum) break;
      }
    }
    
    // Default values if nothing found
    if (!chapterNum) {
      chapterNum = 1;
      verseNum = 1;
      verseText = "Sample verse text";
    }
    
    // Show a sample verse from the first book
    displayText(`\nSample Verse (${bookName} ${chapterNum}:${verseNum}):`);
    console.log(`${bookName} ${chapterNum}:${verseNum} - ${verseText}`);
    
    // Show search results
    displayText('\nSearch Results for "God":');
    const results = bible.search('God');
    results.slice(0, 5).forEach(result => { // Only show first 5 results
      console.log(`${result.book} ${result.chapter}:${result.verse} - ${result.text}`);
    });
  });

// Process CLI arguments
if (process.argv.length <= 2) {
  try {
    // Load UI only in interactive mode
    const BibleUI = require('../utils/ui');
    ui = new BibleUI();
    startInteractiveBible();
  } catch (error) {
    console.error('Could not initialize the interactive UI. Try using command line options instead.');
    console.error(`Run 'node cli/index.js --help' to see available commands.`);
    console.error(`Or try 'node cli/index.js demo' to see a simple demo.`);
    console.error('\nError details:', error.message);
  }
} else {
  // Parse commands and options
  program.parse(process.argv);
  const opts = program.opts();
  // Handle random verse flag
  if (opts.random) {
    const result = bible.getRandomVerse();
    if (result) {
      console.log(`${result.book} ${result.chapter}:${result.verse} - ${result.text}`);
    } else {
      console.error('No verse found');
    }
    process.exit(0);
  }
}