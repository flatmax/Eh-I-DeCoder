// Symbol analyzer using tree-sitter for multi-language support
const ParserManager = require('./parsers/parser-manager');
const JavaScriptExtractor = require('./extractors/javascript-extractor');
const PythonExtractor = require('./extractors/python-extractor');
const CppExtractor = require('./extractors/cpp-extractor');
const JavaExtractor = require('./extractors/java-extractor');
const GoExtractor = require('./extractors/go-extractor');
const RustExtractor = require('./extractors/rust-extractor');
const CssExtractor = require('./extractors/css-extractor');

class SymbolAnalyzer {
  constructor() {
    this.symbolCache = new Map();
    this.documentSymbols = new Map();
    this.trees = new Map();
    
    // Initialize parser manager
    this.parserManager = new ParserManager();
    
    // Initialize language extractors
    this.extractors = new Map([
      ['javascript', new JavaScriptExtractor()],
      ['javascriptreact', new JavaScriptExtractor()],
      ['typescript', new JavaScriptExtractor()],
      ['typescriptreact', new JavaScriptExtractor()],
      ['python', new PythonExtractor()],
      ['cpp', new CppExtractor()],
      ['c++', new CppExtractor()],
      ['c', new CppExtractor()],
      ['java', new JavaExtractor()],
      ['go', new GoExtractor()],
      ['rust', new RustExtractor()],
      ['css', new CssExtractor()],
      ['scss', new CssExtractor()],
      ['html', new CssExtractor()], // Basic HTML support using CSS extractor
      ['json', new JavaScriptExtractor()], // Basic JSON support
      ['yaml', new PythonExtractor()], // Basic YAML support
      ['markdown', new JavaScriptExtractor()] // Basic Markdown support
    ]);
  }

  getParserManager() {
    return this.parserManager;
  }

  analyzeDocument(uri, text, languageId) {
    try {
      const parser = this.parserManager.getParser(languageId);
      if (!parser) {
        console.log(`No parser available for language: ${languageId}`);
        return [];
      }
      
      // Parse the document
      const tree = parser.parse(text);
      this.trees.set(uri, tree);
      
      // Extract symbols using language-specific extractor
      const extractor = this.extractors.get(languageId);
      const symbols = extractor ? extractor.extract(tree, text) : [];
      
      // Ensure symbols is always an array
      const symbolArray = Array.isArray(symbols) ? symbols : (symbols ? [symbols] : []);
      
      this.documentSymbols.set(uri, symbolArray);
      
      // Update global symbol cache
      symbolArray.forEach(symbol => {
        const key = `${symbol.name}:${symbol.type}`;
        if (!this.symbolCache.has(key)) {
          this.symbolCache.set(key, []);
        }
        this.symbolCache.get(key).push({
          ...symbol,
          uri
        });
      });
      
      console.log(`Analyzed ${symbolArray.length} symbols in ${uri} (${languageId})`);
      return symbolArray;
    } catch (error) {
      console.error(`Error analyzing document ${uri}:`, error);
      return [];
    }
  }

  findSymbol(name, uri = null) {
    // First check document-specific symbols
    if (uri && this.documentSymbols.has(uri)) {
      const docSymbols = this.documentSymbols.get(uri);
      const found = docSymbols.find(symbol => symbol.name === name);
      if (found) return found;
    }
    
    // Then check global cache
    for (const [key, symbols] of this.symbolCache) {
      if (key.startsWith(`${name}:`)) {
        return symbols[0]; // Return first match
      }
    }
    
    return null;
  }

  getSymbolsInDocument(uri) {
    return this.documentSymbols.get(uri) || [];
  }

  clearDocument(uri) {
    this.documentSymbols.delete(uri);
    this.trees.delete(uri);
    // Clean up global cache entries for this URI
    for (const [key, symbols] of this.symbolCache) {
      const filtered = symbols.filter(s => s.uri !== uri);
      if (filtered.length === 0) {
        this.symbolCache.delete(key);
      } else {
        this.symbolCache.set(key, filtered);
      }
    }
  }

  getTree(uri) {
    return this.trees.get(uri);
  }

  // Get all symbols across all documents
  getAllSymbols() {
    const allSymbols = [];
    for (const symbols of this.documentSymbols.values()) {
      allSymbols.push(...symbols);
    }
    return allSymbols;
  }

  // Find symbols by type
  findSymbolsByType(type) {
    const symbols = [];
    for (const [key, symbolList] of this.symbolCache) {
      if (key.endsWith(`:${type}`)) {
        symbols.push(...symbolList);
      }
    }
    return symbols;
  }

  // Get symbol statistics
  getSymbolStats() {
    const stats = {
      totalSymbols: 0,
      symbolsByType: {},
      symbolsByDocument: {}
    };
    
    for (const [uri, symbols] of this.documentSymbols) {
      stats.totalSymbols += symbols.length;
      stats.symbolsByDocument[uri] = symbols.length;
      
      symbols.forEach(symbol => {
        stats.symbolsByType[symbol.type] = (stats.symbolsByType[symbol.type] || 0) + 1;
      });
    }
    
    return stats;
  }

  // Search symbols by name pattern
  searchSymbols(pattern) {
    const regex = new RegExp(pattern, 'i');
    const matches = [];
    
    for (const symbols of this.documentSymbols.values()) {
      symbols.forEach(symbol => {
        if (regex.test(symbol.name)) {
          matches.push(symbol);
        }
      });
    }
    
    return matches;
  }
}

module.exports = SymbolAnalyzer;
