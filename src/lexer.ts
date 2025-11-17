/**
 * Simple lexer for ClickHouse DDL
 * No dependencies, just plain TypeScript
 */

export interface Token {
  type: TokenType
  value: string
  line: number
  col: number
}

export type TokenType =
  // Keywords
  | 'CREATE' | 'TABLE' | 'VIEW' | 'MATERIALIZED' | 'OR' | 'REPLACE'
  | 'IF' | 'NOT' | 'EXISTS' | 'ENGINE' | 'ORDER' | 'BY' | 'PARTITION'
  | 'SETTINGS' | 'AS' | 'SELECT' | 'FROM' | 'WHERE' | 'AND' | 'OR_KW'
  | 'IN' | 'LIKE' | 'IS' | 'NULL' | 'TRUE' | 'FALSE' | 'CAST'
  | 'WITH' | 'OVER' | 'ASC' | 'DESC' | 'NULLABLE' | 'DEFAULT'
  | 'ALIAS' | 'COMMENT' | 'TO' | 'ON' | 'CLUSTER' | 'PRIMARY' | 'KEY'
  | 'ARRAY' | 'JOIN' | 'INTERVAL' | 'UNION' | 'ALL'
  | 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' | 'OUTER'
  // Literals
  | 'IDENTIFIER' | 'NUMBER' | 'STRING' | 'PARAMETER'
  // Operators & Punctuation
  | 'LPAREN' | 'RPAREN' | 'COMMA' | 'DOT' | 'SEMICOLON'
  | 'STAR' | 'PLUS' | 'MINUS' | 'SLASH' | 'PERCENT'
  | 'EQ' | 'NEQ' | 'NEQ2' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'ARROW' | 'LBRACKET' | 'RBRACKET' | 'COLON'
  | 'EOF'

const KEYWORDS: Record<string, TokenType> = {
  'CREATE': 'CREATE',
  'TABLE': 'TABLE',
  'VIEW': 'VIEW',
  'MATERIALIZED': 'MATERIALIZED',
  'OR': 'OR_KW',
  'REPLACE': 'REPLACE',
  'IF': 'IF',
  'NOT': 'NOT',
  'EXISTS': 'EXISTS',
  'ENGINE': 'ENGINE',
  'ORDER': 'ORDER',
  'BY': 'BY',
  'PARTITION': 'PARTITION',
  'SETTINGS': 'SETTINGS',
  'AS': 'AS',
  'SELECT': 'SELECT',
  'FROM': 'FROM',
  'WHERE': 'WHERE',
  'AND': 'AND',
  'IN': 'IN',
  'LIKE': 'LIKE',
  'IS': 'IS',
  'NULL': 'NULL',
  'TRUE': 'TRUE',
  'FALSE': 'FALSE',
  'CAST': 'CAST',
  'WITH': 'WITH',
  'OVER': 'OVER',
  'ASC': 'ASC',
  'DESC': 'DESC',
  'NULLABLE': 'NULLABLE',
  'DEFAULT': 'DEFAULT',
  'ALIAS': 'ALIAS',
  'COMMENT': 'COMMENT',
  'TO': 'TO',
  'ON': 'ON',
  'CLUSTER': 'CLUSTER',
  'PRIMARY': 'PRIMARY',
  'KEY': 'KEY',
  'ARRAY': 'ARRAY',
  'JOIN': 'JOIN',
  'INTERVAL': 'INTERVAL',
  'UNION': 'UNION',
  'ALL': 'ALL',
  'INNER': 'INNER',
  'LEFT': 'LEFT',
  'RIGHT': 'RIGHT',
  'FULL': 'FULL',
  'CROSS': 'CROSS',
  'OUTER': 'OUTER',
}

export class Lexer {
  private input: string
  private pos = 0
  private line = 1
  private col = 1

  constructor(input: string) {
    this.input = input
  }

  tokenize(): Token[] {
    const tokens: Token[] = []

    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const token = this.nextToken()
      if (token) tokens.push(token)
    }

    tokens.push({ type: 'EOF', value: '', line: this.line, col: this.col })
    return tokens
  }

  private nextToken(): Token | null {
    const char = this.input[this.pos]

    // Comments
    if (char === '-' && this.peek() === '-') {
      this.skipLineComment()
      return null
    }
    if (char === '/' && this.peek() === '*') {
      this.skipBlockComment()
      return null
    }

    // Strings
    if (char === "'" || char === '"') {
      return this.readString(char)
    }

    // Backtick identifiers
    if (char === '`') {
      return this.readBacktickIdentifier()
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber()
    }

    // Parameters {name:Type}
    if (char === '{') {
      const param = this.tryReadParameter()
      if (param) return param
    }

    // Multi-character operators
    if (char === '!' && this.peek() === '=') {
      return this.makeToken('NEQ', 2)
    }
    if (char === '<' && this.peek() === '>') {
      return this.makeToken('NEQ2', 2)
    }
    if (char === '<' && this.peek() === '=') {
      return this.makeToken('LTE', 2)
    }
    if (char === '>' && this.peek() === '=') {
      return this.makeToken('GTE', 2)
    }
    if (char === '-' && this.peek() === '>') {
      return this.makeToken('ARROW', 2)
    }

    // Single character tokens
    const singleChar: Record<string, TokenType> = {
      '(': 'LPAREN', ')': 'RPAREN', ',': 'COMMA', '.': 'DOT',
      ';': 'SEMICOLON', '*': 'STAR', '+': 'PLUS', '-': 'MINUS',
      '/': 'SLASH', '%': 'PERCENT', '=': 'EQ', '<': 'LT', '>': 'GT',
      '[': 'LBRACKET', ']': 'RBRACKET', ':': 'COLON'
    }

    if (singleChar[char]) {
      return this.makeToken(singleChar[char], 1)
    }

    // Identifiers and keywords
    if (this.isIdentifierStart(char)) {
      return this.readIdentifier()
    }

    // Unknown character - skip it
    this.advance()
    return null
  }

  private readString(quote: string): Token {
    const start = { line: this.line, col: this.col }
    this.advance() // skip opening quote

    let value = ''
    while (this.pos < this.input.length) {
      const char = this.input[this.pos]

      if (char === '\\') {
        // Backslash escape
        this.advance()
        if (this.pos < this.input.length) {
          value += this.input[this.pos]
          this.advance()
        }
      } else if (char === quote) {
        // Check for doubled quotes
        if (this.peek() === quote) {
          value += quote
          this.advance()
          this.advance()
        } else {
          this.advance() // skip closing quote
          break
        }
      } else {
        value += char
        this.advance()
      }
    }

    return { type: 'STRING', value, ...start }
  }

  private readBacktickIdentifier(): Token {
    const start = { line: this.line, col: this.col }
    this.advance() // skip opening backtick

    let value = ''
    while (this.pos < this.input.length && this.input[this.pos] !== '`') {
      value += this.input[this.pos]
      this.advance()
    }

    if (this.pos < this.input.length) {
      this.advance() // skip closing backtick
    }

    return { type: 'IDENTIFIER', value, ...start }
  }

  private readNumber(): Token {
    const start = { line: this.line, col: this.col }
    let value = ''

    while (this.pos < this.input.length && (this.isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) {
      value += this.input[this.pos]
      this.advance()
    }

    return { type: 'NUMBER', value, ...start }
  }

  private readIdentifier(): Token {
    const start = { line: this.line, col: this.col }
    let value = ''

    while (this.pos < this.input.length && this.isIdentifierPart(this.input[this.pos])) {
      value += this.input[this.pos]
      this.advance()
    }

    const upper = value.toUpperCase()
    const type = KEYWORDS[upper] || 'IDENTIFIER'

    return { type, value, ...start }
  }

  private tryReadParameter(): Token | null {
    const start = { line: this.line, col: this.col }
    const startPos = this.pos

    let depth = 0
    let value = ''

    while (this.pos < this.input.length) {
      const char = this.input[this.pos]
      value += char

      if (char === '{') depth++
      if (char === '}') {
        depth--
        if (depth === 0) {
          this.advance()
          // Check if it's a parameter pattern {name:Type}
          // Use [\s\S] instead of . to match newlines
          const match = value.match(/^\{([^:]+):([\s\S]+)\}$/)
          if (match) {
            return { type: 'PARAMETER', value, ...start }
          }
          // Not a parameter, reset
          this.pos = startPos
          return null
        }
      }

      this.advance()
    }

    // Incomplete, reset
    this.pos = startPos
    return null
  }

  private skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.advance()
    }
  }

  private skipLineComment() {
    while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
      this.advance()
    }
  }

  private skipBlockComment() {
    this.advance() // skip /
    this.advance() // skip *

    while (this.pos < this.input.length - 1) {
      if (this.input[this.pos] === '*' && this.peek() === '/') {
        this.advance() // skip *
        this.advance() // skip /
        break
      }
      this.advance()
    }
  }

  private makeToken(type: TokenType, length: number): Token {
    const token = {
      type,
      value: this.input.slice(this.pos, this.pos + length),
      line: this.line,
      col: this.col
    }
    for (let i = 0; i < length; i++) {
      this.advance()
    }
    return token
  }

  private peek(): string {
    return this.input[this.pos + 1] || ''
  }

  private advance() {
    if (this.input[this.pos] === '\n') {
      this.line++
      this.col = 1
    } else {
      this.col++
    }
    this.pos++
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9'
  }

  private isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_'
  }

  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char)
  }
}
