const fs = require('fs');
const path = require('path');

class BibleReader {
  constructor(translation = 'kjv') {
    this.translation = translation;
    this.data = this.loadBibleData(translation);
  }

  loadBibleData(translation) {
    try {
      // Load the main Bible data
      const dataPath = path.join(__dirname, '..', 'src', 'data', `bible-${translation}.json`);
      const rawData = fs.readFileSync(dataPath, 'utf8');
      const bibleData = JSON.parse(rawData);
      
      // Load sample verse if it exists
      const samplePath = path.join(__dirname, '..', 'src', 'data', 'sample-verse.json');
      if (fs.existsSync(samplePath)) {
        try {
          const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
          
          // Merge the sample verses into the main Bible data
          if (sampleData && sampleData.books) {
            sampleData.books.forEach(sampleBook => {
              // Find if this book exists in the main Bible
              const existingBook = bibleData.books.find(b => 
                b.name.toLowerCase() === sampleBook.name.toLowerCase() || 
                b.abbrev.toLowerCase() === sampleBook.abbrev.toLowerCase()
              );
              
              if (existingBook) {
                // Merge chapters from sample into existing book
                sampleBook.chapters.forEach(sampleChapter => {
                  // Find if this chapter exists in the book
                  const existingChapter = existingBook.chapters.find(c => 
                    c.chapter === sampleChapter.chapter
                  );
                  
                  if (existingChapter) {
                    // Add verses to existing chapter
                    sampleChapter.verses.forEach(sampleVerse => {
                      const existingVerse = existingChapter.verses.find(v => 
                        v.verse === sampleVerse.verse
                      );
                      
                      if (existingVerse) {
                        // Update existing verse
                        existingVerse.text = sampleVerse.text;
                      } else {
                        // Add new verse
                        existingChapter.verses.push(sampleVerse);
                        // Sort verses
                        existingChapter.verses.sort((a, b) => a.verse - b.verse);
                      }
                    });
                  } else {
                    // Add new chapter
                    existingBook.chapters.push(sampleChapter);
                    // Sort chapters
                    existingBook.chapters.sort((a, b) => a.chapter - b.chapter);
                  }
                });
              } else {
                // Add the entire book
                bibleData.books.push(sampleBook);
              }
            });
          }
        } catch (sampleError) {
          console.warn(`Warning: Error loading sample verses: ${sampleError.message}`);
        }
      }
      
      // Normalize any nonstandard JSON shape into proper chapters/verses
      return this.normalizeData(bibleData);
    } catch (error) {
      console.error(`Error loading Bible data: ${error.message}`);
      process.exit(1);
    }
  }

  getBooks() {
    return this.data.books.map(book => ({
      name: book.name,
      abbrev: book.abbrev
    }));
  }

  getBook(bookName) {
    return this.data.books.find(b => 
      b.name.toLowerCase() === bookName.toLowerCase() || 
      b.abbrev.toLowerCase() === bookName.toLowerCase()
    );
  }

  getChapter(bookName, chapterNum) {
    const book = this.getBook(bookName);
    if (!book) return null;
    
    return book.chapters.find(c => c.chapter === parseInt(chapterNum));
  }

  getVerse(bookName, chapterNum, verseNum) {
    const chapter = this.getChapter(bookName, chapterNum);
    if (!chapter) return null;
    
    return chapter.verses.find(v => v.verse === parseInt(verseNum));
  }

  search(query) {
    query = query.toLowerCase();
    const results = [];
    
    this.data.books.forEach(book => {
      if (!book.chapters) return;
      
      book.chapters.forEach(chapter => {
        if (!chapter.verses) return;
        
        chapter.verses.forEach(verse => {
          if (!verse || !verse.text) return;
          
          // Make sure text is a string
          const text = String(verse.text);
          
          if (text.toLowerCase().includes(query)) {
            results.push({
              book: book.name,
              chapter: chapter.chapter,
              verse: verse.verse,
              text: text
            });
          }
        });
      });
    });
    
    return results;
  }

  /**
   * Return a random verse from the loaded Bible data
   */
  getRandomVerse() {
    const books = this.data.books;
    if (!books || books.length === 0) return null;
    // Pick a random book
    const book = books[Math.floor(Math.random() * books.length)];
    if (!book.chapters || book.chapters.length === 0) return null;
    // Pick a random chapter
    const chapter = book.chapters[Math.floor(Math.random() * book.chapters.length)];
    if (!chapter.verses || chapter.verses.length === 0) return null;
    // Pick a random verse
    const verse = chapter.verses[Math.floor(Math.random() * chapter.verses.length)];
    return {
      book: book.name,
      chapter: chapter.chapter,
      verse: verse.verse,
      text: verse.text
    };
  }

  /**
   * Normalize raw Bible JSON into proper chapters and verses structure
   */
  normalizeData(raw) {
    if (!raw || !Array.isArray(raw.books)) return raw;
    raw.books.forEach(book => {
      if (!Array.isArray(book.chapters)) return;
      const fixed = [];
      book.chapters.forEach(ch => {
        // Keep well-formed chapters (numeric chapter > 0)
        if (typeof ch.chapter === 'number' && ch.chapter > 0 && Array.isArray(ch.verses)) {
          fixed.push(ch);
        // Detect wrapped chapter object in verse 0
        } else if (Array.isArray(ch.verses) && ch.verses.length > 0
                   && ch.verses[0].text && typeof ch.verses[0].text === 'object'
                   && ch.verses[0].text.chapter && Array.isArray(ch.verses[0].text.verses)) {
          const obj = ch.verses[0].text;
          const verses = obj.verses.map(v => ({ verse: parseInt(v.verse, 10), text: v.text }));
          fixed.push({ chapter: parseInt(obj.chapter, 10), verses });
        }
      });
      // Sort chapters by number
      fixed.sort((a, b) => a.chapter - b.chapter);
      book.chapters = fixed;
    });
    return raw;
  }
}

module.exports = BibleReader;