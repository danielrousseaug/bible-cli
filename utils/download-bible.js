#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const BIBLE_SOURCES = {
  kjv: {
    github: 'https://github.com/aruljohn/Bible-kjv',
    downloadUrl: 'https://codeload.github.com/aruljohn/Bible-kjv/zip/refs/heads/master',
    description: 'Complete KJV Bible (66 books) - MIT licensed'
  },
  bible_json: {
    github: 'https://github.com/kenyonbowers/BibleJSON',
    downloadUrl: 'https://codeload.github.com/kenyonbowers/BibleJSON/zip/refs/heads/main',
    description: 'KJV Bible with formatting for Jesus\'s words in red - MIT licensed'
  },
  kjv_farskipper: {
    github: 'https://github.com/farskipper/kjv',
    downloadUrl: 'https://codeload.github.com/farskipper/kjv/zip/refs/heads/master',
    description: 'Complete KJV Bible with paragraph markers - Public Domain'
  },
  direct_json: {
    github: 'Direct download',
    downloadUrl: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
    description: 'Direct JSON download of KJV Bible - simple, ready-to-use format'
  },
  simple_json: {
    github: 'Bible API by seven1m',
    downloadUrl: 'https://cdn.jsdelivr.net/gh/seven1m/open-bibles@master/eng-kjv.json',
    description: 'Simple JSON KJV Bible format - easy to process'
  }
};

function showHelp() {
  console.log('\nBible CLI - Bible Downloader');
  console.log('\nThis tool downloads a complete Bible JSON dataset for use with the Bible CLI application.');
  console.log('\nAvailable sources:');
  
  Object.keys(BIBLE_SOURCES).forEach(key => {
    console.log(`  ${key}: ${BIBLE_SOURCES[key].description}`);
    console.log(`      ${BIBLE_SOURCES[key].github}`);
  });
  
  console.log('\nUsage:');
  console.log('  node utils/download-bible.js <source>');
  console.log('\nExample:');
  console.log('  node utils/download-bible.js kjv');
}

function downloadFile(url, destinationPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destinationPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destinationPath, () => {});
      reject(err);
    });
  });
}

async function downloadBible(source) {
  if (!BIBLE_SOURCES[source]) {
    console.error(`Error: Unknown source "${source}"`);
    showHelp();
    process.exit(1);
  }
  
  const tempDir = path.join(__dirname, '..', 'temp');
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Offline fallback: if KJV has already been extracted in temp, skip download
  if (source === 'kjv') {
    const extractDir = path.join(tempDir, 'Bible-kjv-master');
    if (fs.existsSync(extractDir)) {
      console.log('Using existing extracted KJV source, skipping download.');
      console.log('Processing Bible data...');
      // processKJVBible will read from temp/Bible-kjv-master and write bible-kjv.json
      processKJVBible(tempDir, dataDir);
      console.log('Bible data successfully installed!');
      console.log(`\nTo use this Bible, run: node cli/index.js read`);
      return;
    }
  }
  console.log(`Downloading Bible from ${BIBLE_SOURCES[source].github}...`);
  
  try {
    if (source === 'direct_json' || source === 'simple_json') {
      // For direct JSON downloads, download directly to temp directory
      const jsonFile = path.join(tempDir, 'bible.json');
      await downloadFile(BIBLE_SOURCES[source].downloadUrl, jsonFile);
      console.log('Download complete!');
      
      // Process the Bible data
      console.log('Processing Bible data...');
      if (source === 'direct_json') {
        processDirectJSON(tempDir, dataDir);
      } else {
        processSimpleJSON(tempDir, dataDir);
      }
      
      // Clean up
      console.log('Cleaning up temporary files...');
      fs.unlinkSync(jsonFile);
    } else {
      // For other sources, download and extract ZIP
      const zipFile = path.join(tempDir, `${source}.zip`);
      await downloadFile(BIBLE_SOURCES[source].downloadUrl, zipFile);
      console.log('Download complete!');
      
      // Extract with unzip
      console.log('Extracting files...');
      execSync(`unzip -o "${zipFile}" -d "${tempDir}"`, { stdio: 'inherit' });
      
      // Process the Bible data based on the source
      console.log('Processing Bible data...');
      processBibleData(source, tempDir, dataDir);
      
      // Clean up
      console.log('Cleaning up temporary files...');
      fs.unlinkSync(zipFile);
    }
    
    console.log('Bible data successfully installed!');
    console.log(`\nTo use this Bible, run: node cli/index.js read`);
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

function processBibleData(source, tempDir, dataDir) {
  switch (source) {
    case 'kjv':
      processKJVBible(tempDir, dataDir);
      break;
    case 'bible_json':
      processBibleJSON(tempDir, dataDir);
      break;
    case 'kjv_farskipper':
      processKJVFarskipper(tempDir, dataDir);
      break;
    case 'direct_json':
      processDirectJSON(tempDir, dataDir);
      break;
    case 'simple_json':
      processSimpleJSON(tempDir, dataDir);
      break;
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

function processKJVBible(tempDir, dataDir) {
  // This handles the aruljohn/Bible-kjv format
  const extractDir = path.join(tempDir, 'Bible-kjv-master');
  const books = [];
  
  // List of Bible books in order
  const bookNames = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
    '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
    'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
    'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
    'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
  ];
  
  // Standard abbreviations
  const bookAbbreviations = {
    'Genesis': 'GEN', 'Exodus': 'EXO', 'Leviticus': 'LEV', 'Numbers': 'NUM', 'Deuteronomy': 'DEU',
    'Joshua': 'JOS', 'Judges': 'JDG', 'Ruth': 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
    '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH',
    'Ezra': 'EZR', 'Nehemiah': 'NEH', 'Esther': 'EST', 'Job': 'JOB', 'Psalms': 'PSA',
    'Proverbs': 'PRO', 'Ecclesiastes': 'ECC', 'Song of Solomon': 'SNG', 'Isaiah': 'ISA',
    'Jeremiah': 'JER', 'Lamentations': 'LAM', 'Ezekiel': 'EZK', 'Daniel': 'DAN',
    'Hosea': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO', 'Obadiah': 'OBA', 'Jonah': 'JON',
    'Micah': 'MIC', 'Nahum': 'NAM', 'Habakkuk': 'HAB', 'Zephaniah': 'ZEP', 'Haggai': 'HAG',
    'Zechariah': 'ZEC', 'Malachi': 'MAL', 'Matthew': 'MAT', 'Mark': 'MRK', 'Luke': 'LUK',
    'John': 'JHN', 'Acts': 'ACT', 'Romans': 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO',
    'Galatians': 'GAL', 'Ephesians': 'EPH', 'Philippians': 'PHP', 'Colossians': 'COL',
    '1 Thessalonians': '1TH', '2 Thessalonians': '2TH', '1 Timothy': '1TI', '2 Timothy': '2TI',
    'Titus': 'TIT', 'Philemon': 'PHM', 'Hebrews': 'HEB', 'James': 'JAS', '1 Peter': '1PE',
    '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', 'Jude': 'JUD',
    'Revelation': 'REV'
  };

  for (const bookName of bookNames) {
    // Derive the book filename by removing spaces (e.g., "1 Samuel" -> "1Samuel.json")
    const fileBookName = bookName.replace(/\s+/g, '');
    
    const bookFile = path.join(extractDir, `${fileBookName}.json`);
    
    if (fs.existsSync(bookFile)) {
      // Load and convert aruljohn/Bible-kjv format: { book, chapters: [ { chapter: string, verses: [ {verse, text} ] } ] }
      const bookData = JSON.parse(fs.readFileSync(bookFile, 'utf8'));
      const chapters = [];
      if (Array.isArray(bookData.chapters)) {
        for (const chObj of bookData.chapters) {
          const chapNum = parseInt(chObj.chapter, 10);
          if (!isNaN(chapNum) && Array.isArray(chObj.verses)) {
            const verses = chObj.verses.map(v => ({
              verse: parseInt(v.verse, 10),
              text: v.text
            }));
            chapters.push({ chapter: chapNum, verses });
          }
        }
      }
      // Sort chapters by number just in case
      chapters.sort((a, b) => a.chapter - b.chapter);
      books.push({
        name: bookName,
        abbrev: bookAbbreviations[bookName] || bookName.substring(0, 3).toUpperCase(),
        chapters
      });
      console.log(`Processed ${bookName} (${chapters.length} chapters)`);
    } else {
      console.warn(`Warning: Could not find ${bookName} (${bookFile})`);
    }
  }
  
  // Write the complete Bible JSON
  const bibleData = { books };
  fs.writeFileSync(path.join(dataDir, 'bible-kjv.json'), JSON.stringify(bibleData, null, 2));
  console.log(`Written complete Bible with ${books.length} books to bible-kjv.json`);
}

function processBibleJSON(tempDir, dataDir) {
  // This handles the kenyonbowers/BibleJSON format
  const extractDir = path.join(tempDir, 'BibleJSON-main');
  const kjvFile = path.join(extractDir, 'kjv.json');
  
  if (fs.existsSync(kjvFile)) {
    const bibleData = JSON.parse(fs.readFileSync(kjvFile, 'utf8'));
    
    // Convert to our format
    const books = [];
    
    for (const bookKey in bibleData) {
      const bookData = bibleData[bookKey];
      const chapters = [];
      
      for (const chapterKey in bookData) {
        const verses = [];
        for (const verseKey in bookData[chapterKey]) {
          verses.push({
            verse: parseInt(verseKey),
            text: bookData[chapterKey][verseKey]
              .replace(/<r>(.*?)<\/r>/g, '$1') // Remove red letter formatting
              .replace(/<i>(.*?)<\/i>/g, '$1') // Remove italics formatting
          });
        }
        
        // Sort verses by verse number
        verses.sort((a, b) => a.verse - b.verse);
        
        chapters.push({
          chapter: parseInt(chapterKey),
          verses
        });
      }
      
      // Sort chapters by chapter number
      chapters.sort((a, b) => a.chapter - b.chapter);
      
      // Convert bookKey to proper name
      const nameMapping = {
        'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers', 'deu': 'Deuteronomy',
        'jos': 'Joshua', 'jdg': 'Judges', 'rut': 'Ruth', '1sa': '1 Samuel', '2sa': '2 Samuel',
        '1ki': '1 Kings', '2ki': '2 Kings', '1ch': '1 Chronicles', '2ch': '2 Chronicles',
        'ezr': 'Ezra', 'neh': 'Nehemiah', 'est': 'Esther', 'job': 'Job', 'psa': 'Psalms',
        'pro': 'Proverbs', 'ecc': 'Ecclesiastes', 'sng': 'Song of Solomon', 'isa': 'Isaiah',
        'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezk': 'Ezekiel', 'dan': 'Daniel',
        'hos': 'Hosea', 'jol': 'Joel', 'amo': 'Amos', 'oba': 'Obadiah', 'jon': 'Jonah',
        'mic': 'Micah', 'nam': 'Nahum', 'hab': 'Habakkuk', 'zep': 'Zephaniah', 'hag': 'Haggai',
        'zec': 'Zechariah', 'mal': 'Malachi', 'mat': 'Matthew', 'mrk': 'Mark', 'luk': 'Luke',
        'jhn': 'John', 'act': 'Acts', 'rom': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians',
        'gal': 'Galatians', 'eph': 'Ephesians', 'php': 'Philippians', 'col': 'Colossians',
        '1th': '1 Thessalonians', '2th': '2 Thessalonians', '1ti': '1 Timothy', '2ti': '2 Timothy',
        'tit': 'Titus', 'phm': 'Philemon', 'heb': 'Hebrews', 'jas': 'James', '1pe': '1 Peter',
        '2pe': '2 Peter', '1jn': '1 John', '2jn': '2 John', '3jn': '3 John', 'jud': 'Jude',
        'rev': 'Revelation'
      };
      
      const bookName = nameMapping[bookKey] || bookKey.toUpperCase();
      
      books.push({
        name: bookName,
        abbrev: bookKey.toUpperCase(),
        chapters
      });
      
      console.log(`Processed ${bookName} (${chapters.length} chapters)`);
    }
    
    // Write the complete Bible JSON
    const finalBibleData = { books };
    fs.writeFileSync(path.join(dataDir, 'bible-kjv.json'), JSON.stringify(finalBibleData, null, 2));
    console.log(`Written complete Bible with ${books.length} books to bible-kjv.json`);
  } else {
    throw new Error(`Could not find KJV file: ${kjvFile}`);
  }
}

function processKJVFarskipper(tempDir, dataDir) {
  // This handles the farskipper/kjv format
  const extractDir = path.join(tempDir, 'kjv-master');
  const kjvJsonFile = path.join(extractDir, 'kjv.json');
  
  if (fs.existsSync(kjvJsonFile)) {
    const kjvData = JSON.parse(fs.readFileSync(kjvJsonFile, 'utf8'));
    
    // Convert to our format
    const books = [];
    
    kjvData.forEach(bookData => {
      const bookName = bookData.name;
      const bookAbbr = bookData.abbr;
      const chapters = [];
      
      bookData.chapters.forEach(chapterData => {
        const chapterNum = chapterData.chapter;
        const verses = [];
        
        chapterData.verses.forEach(verseData => {
          verses.push({
            verse: verseData.verse,
            text: verseData.text
              .replace(/\{(.*?)\}/g, '$1') // Remove italics markers
          });
        });
        
        chapters.push({
          chapter: chapterNum,
          verses
        });
      });
      
      books.push({
        name: bookName,
        abbrev: bookAbbr,
        chapters
      });
      
      console.log(`Processed ${bookName} (${chapters.length} chapters)`);
    });
    
    // Write the complete Bible JSON
    const bibleData = { books };
    fs.writeFileSync(path.join(dataDir, 'bible-kjv.json'), JSON.stringify(bibleData, null, 2));
    console.log(`Written complete Bible with ${books.length} books to bible-kjv.json`);
  } else {
    throw new Error(`Could not find KJV file: ${kjvJsonFile}`);
  }
}

function processDirectJSON(tempDir, dataDir) {
  // This handles the direct JSON download format from thiagobodruk/bible
  const jsonFile = path.join(tempDir, 'bible.json');
  
  if (fs.existsSync(jsonFile)) {
    // Read file and remove BOM (Byte Order Mark) if present
    let data = fs.readFileSync(jsonFile, 'utf8');
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }
    
    // Parse JSON
    const bibleData = JSON.parse(data);
    
    // Convert to our format
    const books = [];
    
    // The format is an array of books
    bibleData.forEach(bookData => {
      const bookName = bookData.name;
      const abbrev = bookData.abbrev ? bookData.abbrev : bookName.substring(0, 3).toUpperCase();
      const chapters = [];
      
      // Each book has chapters property which is an array of chapter arrays
      bookData.chapters.forEach((chapterVerses, chapterIndex) => {
        const verses = [];
        
        // Each chapter is an array of verse strings
        chapterVerses.forEach((verseText, verseIndex) => {
          verses.push({
            verse: verseIndex + 1, // Verse numbers are 1-based
            text: verseText
          });
        });
        
        chapters.push({
          chapter: chapterIndex + 1, // Chapter numbers are 1-based
          verses
        });
      });
      
      books.push({
        name: bookName,
        abbrev: abbrev,
        chapters
      });
      
      console.log(`Processed ${bookName} (${chapters.length} chapters)`);
    });
    
    // Write the complete Bible JSON
    const finalBibleData = { books };
    fs.writeFileSync(path.join(dataDir, 'bible-kjv.json'), JSON.stringify(finalBibleData, null, 2));
    console.log(`Written complete Bible with ${books.length} books to bible-kjv.json`);
  } else {
    throw new Error(`Could not find Bible JSON file: ${jsonFile}`);
  }
}

function processSimpleJSON(tempDir, dataDir) {
  // This handles the seven1m/open-bibles format
  const jsonFile = path.join(tempDir, 'bible.json');
  
  if (fs.existsSync(jsonFile)) {
    // Read file and remove BOM (Byte Order Mark) if present
    let data = fs.readFileSync(jsonFile, 'utf8');
    if (data.charCodeAt(0) === 0xFEFF) {
      data = data.slice(1);
    }
    
    try {
      // Parse JSON
      const bibleData = JSON.parse(data);
      
      // Convert to our format
      const books = [];
      
      // The structure is: { "Genesis": { "1": { "1": "verse text", ... } } }
      for (const [bookName, bookContent] of Object.entries(bibleData)) {
        const chapters = [];
        const abbrev = getBookAbbreviation(bookName);
        
        for (const [chapterNum, chapterContent] of Object.entries(bookContent)) {
          const verses = [];
          
          for (const [verseNum, verseText] of Object.entries(chapterContent)) {
            verses.push({
              verse: parseInt(verseNum),
              text: verseText
            });
          }
          
          // Sort verses by verse number
          verses.sort((a, b) => a.verse - b.verse);
          
          chapters.push({
            chapter: parseInt(chapterNum),
            verses
          });
        }
        
        // Sort chapters by chapter number
        chapters.sort((a, b) => a.chapter - b.chapter);
        
        books.push({
          name: bookName,
          abbrev: abbrev,
          chapters
        });
        
        console.log(`Processed ${bookName} (${chapters.length} chapters)`);
      }
      
      // Sort books by canonical order
      const bookOrder = getCanonicalBookOrder();
      books.sort((a, b) => {
        return bookOrder.indexOf(a.name) - bookOrder.indexOf(b.name);
      });
      
      // Write the complete Bible JSON
      const finalBibleData = { books };
      fs.writeFileSync(path.join(dataDir, 'bible-kjv.json'), JSON.stringify(finalBibleData, null, 2));
      console.log(`Written complete Bible with ${books.length} books to bible-kjv.json`);
    } catch (error) {
      console.error(`Error processing JSON: ${error.message}`);
      throw error;
    }
  } else {
    throw new Error(`Could not find Bible JSON file: ${jsonFile}`);
  }
}

// Helper function to get book abbreviation
function getBookAbbreviation(bookName) {
  const abbreviations = {
    "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM", "Deuteronomy": "DEU",
    "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
    "1 Kings": "1KI", "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH",
    "Ezra": "EZR", "Nehemiah": "NEH", "Esther": "EST", "Job": "JOB", "Psalms": "PSA",
    "Proverbs": "PRO", "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA",
    "Jeremiah": "JER", "Lamentations": "LAM", "Ezekiel": "EZK", "Daniel": "DAN",
    "Hosea": "HOS", "Joel": "JOL", "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON",
    "Micah": "MIC", "Nahum": "NAM", "Habakkuk": "HAB", "Zephaniah": "ZEP", "Haggai": "HAG",
    "Zechariah": "ZEC", "Malachi": "MAL", "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK",
    "John": "JHN", "Acts": "ACT", "Romans": "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO",
    "Galatians": "GAL", "Ephesians": "EPH", "Philippians": "PHP", "Colossians": "COL",
    "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI", "2 Timothy": "2TI",
    "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB", "James": "JAS", "1 Peter": "1PE",
    "2 Peter": "2PE", "1 John": "1JN", "2 John": "2JN", "3 John": "3JN", "Jude": "JUD",
    "Revelation": "REV"
  };
  
  return abbreviations[bookName] || bookName.substring(0, 3).toUpperCase();
}

// Helper function to get canonical book order
function getCanonicalBookOrder() {
  return [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
    "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
    "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
    "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
    "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
    "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
  ];
}

// Main script
if (process.argv.length < 3) {
  showHelp();
  process.exit(0);
}

const source = process.argv[2];
downloadBible(source);