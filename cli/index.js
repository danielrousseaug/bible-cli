#!/usr/bin/env node

const { program } = require('commander');
const blessed = require('blessed');
const BibleReader = require('../utils/bible');
const { config, addBookmark, removeBookmark, updateBookmark, moveBookmark, getBookmarks } = require('../utils/config');

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
  .description('Set theme (black-metal, nord, gruvbox, dracula, solarized)')
  .action((theme) => {
    if (['black-metal', 'nord', 'gruvbox', 'dracula', 'solarized'].includes(theme)) {
      config.set('theme', theme);
      console.log(`Theme set to ${theme}`);
    } else {
      console.error('Invalid theme. Choose from: black-metal, nord, gruvbox, dracula, solarized');
    }
  });

// Interactive Bible reader
function startInteractiveBible() {
  const books = bible.getBooks();
  ui.setBooks(books);

  // Track currently selected verse for bookmarking
  let currentSelection = {
    book: null,
    chapter: null,
    verse: null
  };

  // Helper function to navigate to a specific verse and update UI
  function navigateToVerse(target) {
    if (!target) return;

    const bookData = bible.getBook(target.book);
    const book = books.find(b => b.name === target.book);
    const chapter = bookData.chapters.find(c => c.chapter === target.chapter);

    // Update book selection
    const bookIndex = books.findIndex(b => b.name === target.book);
    if (bookIndex !== -1) {
      ui.booksList.select(bookIndex);

      // Update chapters list
      const chapters = bookData.chapters.map(c => c.chapter);
      ui.setChapters(chapters);

      // Update chapter selection
      const chapterIndex = bookData.chapters.findIndex(c => c.chapter === target.chapter);
      if (chapterIndex !== -1) {
        ui.chaptersList.select(chapterIndex);

        // Update verses list
        const verseNumbers = chapter.verses.map(v => v.verse);
        verseNumbers.unshift('Whole chapter');
        ui.setVerses(verseNumbers);

        // Update verse selection
        const verseIndex = chapter.verses.findIndex(v => v.verse === target.verse);
        if (verseIndex !== -1) {
          ui.versesList.select(verseIndex + 1);
        }
      }

      // Setup handlers
      setupChapterHandler(bookData, book);
      setupVerseHandler(book, chapter);
    }

    // Display the verse
    ui.contentBox.setContent(`{bold}${target.book} ${target.chapter}:${target.verse}{/bold}\n\n${target.text}`);
    ui.contentBox.setScrollPerc(0);
    ui.setStatus(`${target.book} ${target.chapter}:${target.verse}`);

    // Update current selection
    currentSelection = {
      book: target.book,
      chapter: target.chapter,
      verse: target.verse
    };

    ui.render();
  }

  // Helper function to navigate to a chapter and display it fully
  function navigateToChapter(target) {
    if (!target) return;

    const bookData = bible.getBook(target.book);
    const book = books.find(b => b.name === target.book);
    const chapter = bookData.chapters.find(c => c.chapter === target.chapter);

    const bookIndex = books.findIndex(b => b.name === target.book);
    if (bookIndex !== -1) {
      ui.booksList.select(bookIndex);

      const chapters = bookData.chapters.map(c => c.chapter);
      ui.setChapters(chapters);

      const chapterIndex = bookData.chapters.findIndex(c => c.chapter === target.chapter);
      if (chapterIndex !== -1) {
        ui.chaptersList.select(chapterIndex);

        const verseNumbers = chapter.verses.map(v => v.verse);
        verseNumbers.unshift('Whole chapter');
        ui.setVerses(verseNumbers);
        ui.versesList.select(0); // Select "Whole chapter"
      }

      setupChapterHandler(bookData, book);
      setupVerseHandler(book, chapter);
    }

    ui.displayScripture(book, chapter, chapter.verses);
    ui.setStatus(`Reading: ${target.book} ${target.chapter}`);

    currentSelection = {
      book: target.book,
      chapter: target.chapter,
      verse: chapter.verses[0].verse
    };

    ui.render();
  }

  // Set up next/prev chapter navigation
  ui.setChapterNavigation(
    // Next chapter
    () => {
      if (currentSelection.book && currentSelection.chapter) {
        const next = bible.getNextChapter(currentSelection.book, currentSelection.chapter);
        if (next) {
          navigateToChapter(next);
        } else {
          ui.setStatus('End of Bible');
        }
      } else {
        ui.setStatus('Select a chapter first');
      }
    },
    // Previous chapter
    () => {
      if (currentSelection.book && currentSelection.chapter) {
        const prev = bible.getPrevChapter(currentSelection.book, currentSelection.chapter);
        if (prev) {
          navigateToChapter(prev);
        } else {
          ui.setStatus('Beginning of Bible');
        }
      } else {
        ui.setStatus('Select a chapter first');
      }
    }
  );

  // Set up next/prev navigation
  ui.setNavigation(
    // Next verse
    () => {
      if (currentSelection.book && currentSelection.chapter && currentSelection.verse) {
        const next = bible.getNextVerse(currentSelection.book, currentSelection.chapter, currentSelection.verse);
        if (next) {
          navigateToVerse(next);
        } else {
          ui.setStatus('End of Bible');
        }
      } else {
        ui.setStatus('Select a verse first');
      }
    },
    // Previous verse
    () => {
      if (currentSelection.book && currentSelection.chapter && currentSelection.verse) {
        const prev = bible.getPrevVerse(currentSelection.book, currentSelection.chapter, currentSelection.verse);
        if (prev) {
          navigateToVerse(prev);
        } else {
          ui.setStatus('Beginning of Bible');
        }
      } else {
        ui.setStatus('Select a verse first');
      }
    }
  );
  
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
        currentSelection = {
          book: selectedBook.name,
          chapter: selectedChapter.chapter,
          verse: null // Whole chapter, no specific verse
        };
      } else {
        // Specific verse selected (index-1)
        const v = selectedChapter.verses[verseIndex - 1];
        ui.contentBox.setContent(`{bold}${selectedBook.name} ${selectedChapter.chapter}:${v.verse}{/bold}\n\n${v.text}`);
        ui.contentBox.setScrollPerc(0); // Reset scroll to top
        ui.setStatus(`Selected: ${selectedBook.name} ${selectedChapter.chapter}:${v.verse}`);
        currentSelection = {
          book: selectedBook.name,
          chapter: selectedChapter.chapter,
          verse: v.verse
        };
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
      ui.showSearchResults(results, query, (result) => {
        // Navigate to the selected search result
        const bookData = bible.getBook(result.book);
        const book = books.find(b => b.name === result.book);
        const chapter = bookData.chapters.find(c => c.chapter === result.chapter);
        const verse = chapter.verses.find(v => v.verse === result.verse);

        // Find the book index and select it in the books list
        const bookIndex = books.findIndex(b => b.name === result.book);
        if (bookIndex !== -1) {
          ui.booksList.select(bookIndex);

          // Update chapters list
          const chapters = bookData.chapters.map(c => c.chapter);
          ui.setChapters(chapters);

          // Find and select the chapter
          const chapterIndex = bookData.chapters.findIndex(c => c.chapter === result.chapter);
          if (chapterIndex !== -1) {
            ui.chaptersList.select(chapterIndex);

            // Update verses list with 'Whole chapter' option
            const verseNumbers = chapter.verses.map(v => v.verse);
            verseNumbers.unshift('Whole chapter');
            ui.setVerses(verseNumbers);

            // Find and select the verse (add 1 for 'Whole chapter' offset)
            const verseIndex = chapter.verses.findIndex(v => v.verse === result.verse);
            if (verseIndex !== -1) {
              ui.versesList.select(verseIndex + 1);
            }
          }

          // Setup handlers for the selected book/chapter
          setupChapterHandler(bookData, book);
          setupVerseHandler(book, chapter);
        }

        // Display the search result verse
        if (verse) {
          ui.contentBox.setContent(`{bold}${result.book} ${result.chapter}:${result.verse}{/bold}\n\n${verse.text}`);
          ui.contentBox.setScrollPerc(0); // Reset scroll to top
          ui.setStatus(`Search result: ${result.book} ${result.chapter}:${result.verse}`);

          // Update current selection for bookmarking
          currentSelection = {
            book: result.book,
            chapter: result.chapter,
            verse: result.verse
          };
        }

        // Restore focus to content box
        ui.contentBox.focus();
        ui.render();
      });
    });
  });
  
  // Bookmark functionality - view and select
  ui.screen.key('b', () => {
    const bookmarks = getBookmarks();
    ui.showBookmarks(bookmarks, (bookmark) => {
      // Navigate to the selected bookmark
      const bookData = bible.getBook(bookmark.book);
      const book = books.find(b => b.name === bookmark.book);
      const chapter = bookData.chapters.find(c => c.chapter === bookmark.chapter);
      const verse = chapter.verses.find(v => v.verse === bookmark.verse);

      // Find the book index and select it in the books list
      const bookIndex = books.findIndex(b => b.name === bookmark.book);
      if (bookIndex !== -1) {
        ui.booksList.select(bookIndex);

        // Update chapters list
        const chapters = bookData.chapters.map(c => c.chapter);
        ui.setChapters(chapters);

        // Find and select the chapter
        const chapterIndex = bookData.chapters.findIndex(c => c.chapter === bookmark.chapter);
        if (chapterIndex !== -1) {
          ui.chaptersList.select(chapterIndex);

          // Update verses list with 'Whole chapter' option
          const verseNumbers = chapter.verses.map(v => v.verse);
          verseNumbers.unshift('Whole chapter');
          ui.setVerses(verseNumbers);

          // Find and select the verse (add 1 for 'Whole chapter' offset)
          const verseIndex = chapter.verses.findIndex(v => v.verse === bookmark.verse);
          if (verseIndex !== -1) {
            ui.versesList.select(verseIndex + 1);
          }
        }

        // Setup handlers for the selected book/chapter
        setupChapterHandler(bookData, book);
        setupVerseHandler(book, chapter);
      }

      // Display the bookmarked verse
      if (verse) {
        ui.contentBox.setContent(`{bold}${bookmark.book} ${bookmark.chapter}:${bookmark.verse}{/bold}\n\n${verse.text}`);
        ui.contentBox.setScrollPerc(0); // Reset scroll to top
        ui.setStatus(`Bookmark: ${bookmark.book} ${bookmark.chapter}:${bookmark.verse}`);

        // Update current selection for bookmarking
        currentSelection = {
          book: bookmark.book,
          chapter: bookmark.chapter,
          verse: bookmark.verse
        };
      }

      // Restore focus to content box
      ui.contentBox.focus();
      ui.render();
    }, (updatedBookmarks) => {
      // Save updated bookmarks to config
      const { config } = require('../utils/config');
      config.set('bookmarks', updatedBookmarks);
    });
  });

  // Theme picker within UI
  ui.screen.key('t', () => {
    ui.showThemePicker();
  });

  // Random verse functionality
  ui.screen.key('r', () => {
    const randomVerse = bible.getRandomVerse();
    if (randomVerse) {
      // Get the full book data to display it properly
      const bookData = bible.getBook(randomVerse.book);
      const book = books.find(b => b.name === randomVerse.book);
      const chapter = bookData.chapters.find(c => c.chapter === randomVerse.chapter);
      const verse = chapter.verses.find(v => v.verse === randomVerse.verse);

      // Find the book index and select it in the books list
      const bookIndex = books.findIndex(b => b.name === randomVerse.book);
      if (bookIndex !== -1) {
        ui.booksList.select(bookIndex);

        // Update chapters list
        const chapters = bookData.chapters.map(c => c.chapter);
        ui.setChapters(chapters);

        // Find and select the chapter
        const chapterIndex = bookData.chapters.findIndex(c => c.chapter === randomVerse.chapter);
        if (chapterIndex !== -1) {
          ui.chaptersList.select(chapterIndex);

          // Update verses list with 'Whole chapter' option
          const verseNumbers = chapter.verses.map(v => v.verse);
          verseNumbers.unshift('Whole chapter');
          ui.setVerses(verseNumbers);

          // Find and select the verse (add 1 for 'Whole chapter' offset)
          const verseIndex = chapter.verses.findIndex(v => v.verse === randomVerse.verse);
          if (verseIndex !== -1) {
            ui.versesList.select(verseIndex + 1);
          }
        }

        // Setup handlers for the selected book/chapter
        setupChapterHandler(bookData, book);
        setupVerseHandler(book, chapter);
      }

      // Display the random verse
      ui.contentBox.setContent(`{bold}${randomVerse.book} ${randomVerse.chapter}:${randomVerse.verse}{/bold}\n\n${randomVerse.text}`);
      ui.contentBox.setScrollPerc(0); // Reset scroll to top
      ui.setStatus(`Random verse: ${randomVerse.book} ${randomVerse.chapter}:${randomVerse.verse}`);

      // Update current selection for bookmarking
      currentSelection = {
        book: randomVerse.book,
        chapter: randomVerse.chapter,
        verse: randomVerse.verse
      };

      ui.render();
    } else {
      ui.setStatus('No random verse found');
    }
  });

  // Add bookmark functionality
  ui.screen.key('a', () => {
    if (currentSelection.book && currentSelection.chapter && currentSelection.verse) {
      // Prompt for optional note
      const notePrompt = blessed.prompt({
        parent: ui.screen,
        border: { type: 'line' },
        height: 'shrink',
        width: 'half',
        top: 'center',
        left: 'center',
        label: ' Add Bookmark Note (optional) ',
        tags: true,
        keys: true,
        vi: true
      });

      notePrompt.input('Enter a note for this bookmark (or leave empty):', '', (err, note) => {
        if (!err) {
          addBookmark(
            currentSelection.book,
            currentSelection.chapter,
            currentSelection.verse,
            note || ''
          );
          ui.setStatus(`Bookmark added: ${currentSelection.book} ${currentSelection.chapter}:${currentSelection.verse}`);
        } else {
          // Cancelled - restore focus
          ui.contentBox.focus();
        }
        ui.render();
      });
    } else {
      ui.setStatus('No verse selected. Please select a verse first.');
    }
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