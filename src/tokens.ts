import { createToken, Lexer } from 'chevrotain'

// Keywords - using negative lookahead to ensure they're not part of identifiers
export const Create = createToken({ name: 'Create', pattern: /CREATE(?![a-zA-Z0-9_])/i })
export const Table = createToken({ name: 'Table', pattern: /TABLE(?![a-zA-Z0-9_])/i })
export const If = createToken({ name: 'If', pattern: /IF(?![a-zA-Z0-9_])/i })
export const Not = createToken({ name: 'Not', pattern: /NOT(?![a-zA-Z0-9_])/i })
export const Exists = createToken({ name: 'Exists', pattern: /EXISTS(?![a-zA-Z0-9_])/i })
export const Engine = createToken({ name: 'Engine', pattern: /ENGINE(?![a-zA-Z0-9_])/i })
export const Default = createToken({ name: 'Default', pattern: /DEFAULT(?![a-zA-Z0-9_])/i })
export const Null = createToken({ name: 'Null', pattern: /NULL(?![a-zA-Z0-9_])/i })
export const Nullable = createToken({ name: 'Nullable', pattern: /Nullable(?![a-zA-Z0-9_])/i })
export const Materialized = createToken({ name: 'Materialized', pattern: /MATERIALIZED(?![a-zA-Z0-9_])/i })
export const Alias = createToken({ name: 'Alias', pattern: /ALIAS(?![a-zA-Z0-9_])/i })
export const Comment = createToken({ name: 'Comment', pattern: /COMMENT(?![a-zA-Z0-9_])/i })
export const OrderBy = createToken({ name: 'OrderBy', pattern: /ORDER\s+BY(?![a-zA-Z0-9_])/i })
export const PartitionBy = createToken({ name: 'PartitionBy', pattern: /PARTITION\s+BY(?![a-zA-Z0-9_])/i })
export const Settings = createToken({ name: 'Settings', pattern: /SETTINGS(?![a-zA-Z0-9_])/i })

// Symbols
export const LParen = createToken({ name: 'LParen', pattern: /\(/ })
export const RParen = createToken({ name: 'RParen', pattern: /\)/ })
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ })
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ })
export const Comma = createToken({ name: 'Comma', pattern: /,/ })
export const Dot = createToken({ name: 'Dot', pattern: /\./ })
export const Equals = createToken({ name: 'Equals', pattern: /=/ })
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ })
export const Plus = createToken({ name: 'Plus', pattern: /\+/ })
export const Minus = createToken({ name: 'Minus', pattern: /-/ })
export const Star = createToken({ name: 'Star', pattern: /\*/ })
export const Slash = createToken({ name: 'Slash', pattern: /\// })

// ClickHouse specific data types - ORDER MATTERS! More specific first
export const DateTime64 = createToken({ name: 'DateTime64', pattern: /DateTime64(?![a-zA-Z0-9_])/i })
export const DateTime = createToken({ name: 'DateTime', pattern: /DateTime(?![a-zA-Z0-9_])/i })
export const Date = createToken({ name: 'Date', pattern: /Date(?![a-zA-Z0-9_])/i })
export const Array = createToken({ name: 'Array', pattern: /Array(?![a-zA-Z0-9_])/i })
export const Tuple = createToken({ name: 'Tuple', pattern: /Tuple(?![a-zA-Z0-9_])/i })
export const Map = createToken({ name: 'Map', pattern: /Map(?![a-zA-Z0-9_])/i })
export const Nested = createToken({ name: 'Nested', pattern: /Nested(?![a-zA-Z0-9_])/i })
export const LowCardinality = createToken({ name: 'LowCardinality', pattern: /LowCardinality(?![a-zA-Z0-9_])/i })
export const Enum8 = createToken({ name: 'Enum8', pattern: /Enum8(?![a-zA-Z0-9_])/i })
export const Enum16 = createToken({ name: 'Enum16', pattern: /Enum16(?![a-zA-Z0-9_])/i })
export const FixedString = createToken({ name: 'FixedString', pattern: /FixedString(?![a-zA-Z0-9_])/i })

// Basic data types - ORDER MATTERS! More specific first
export const UInt64 = createToken({ name: 'UInt64', pattern: /UInt64(?![a-zA-Z0-9_])/i })
export const UInt32 = createToken({ name: 'UInt32', pattern: /UInt32(?![a-zA-Z0-9_])/i })
export const UInt16 = createToken({ name: 'UInt16', pattern: /UInt16(?![a-zA-Z0-9_])/i })
export const UInt8 = createToken({ name: 'UInt8', pattern: /UInt8(?![a-zA-Z0-9_])/i })
export const Int64 = createToken({ name: 'Int64', pattern: /Int64(?![a-zA-Z0-9_])/i })
export const Int32 = createToken({ name: 'Int32', pattern: /Int32(?![a-zA-Z0-9_])/i })
export const Int16 = createToken({ name: 'Int16', pattern: /Int16(?![a-zA-Z0-9_])/i })
export const Int8 = createToken({ name: 'Int8', pattern: /Int8(?![a-zA-Z0-9_])/i })
export const Float64 = createToken({ name: 'Float64', pattern: /Float64(?![a-zA-Z0-9_])/i })
export const Float32 = createToken({ name: 'Float32', pattern: /Float32(?![a-zA-Z0-9_])/i })
export const String = createToken({ name: 'String', pattern: /String(?![a-zA-Z0-9_])/i })
export const UUID = createToken({ name: 'UUID', pattern: /UUID(?![a-zA-Z0-9_])/i })
export const Bool = createToken({ name: 'Bool', pattern: /Bool(?![a-zA-Z0-9_])/i })

// Others
export const LineComment = createToken({ name: 'LineComment', pattern: /--[^\n\r]*/, group: Lexer.SKIPPED })
export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /[0-9]+(\.[0-9]+)?/ })
export const StringLiteral = createToken({ name: 'StringLiteral', pattern: /'(?:[^']|'')*'|\"(?:[^\"]|\"\")*\"/ })
export const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_\$]*/ })
export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t\n\r]+/, group: Lexer.SKIPPED })
export const Other = createToken({ name: 'Other', pattern: /[^\s]+/ })

export const allTokens = [
  WhiteSpace,
  LineComment,
  Create,
  Table,
  If,
  Not,
  Exists,
  Engine,
  Default,
  Null,
  Nullable,
  Materialized,
  Alias,
  Comment,
  OrderBy,
  PartitionBy,
  Settings,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Comma,
  Dot,
  Equals,
  Semicolon,
  Plus,
  Minus,
  Star,
  Slash,
  // Data types in order of specificity (most specific first)
  DateTime64,
  DateTime,
  Date,
  Array,
  Tuple,
  Map,
  Nested,
  LowCardinality,
  Enum8,
  Enum16,
  FixedString,
  UInt64,
  UInt32,
  UInt16,
  UInt8,
  Int64,
  Int32,
  Int16,
  Int8,
  Float64,
  Float32,
  String,
  UUID,
  Bool,
  StringLiteral,
  NumberLiteral,
  Identifier,
  Other,
]

export const ClickHouseLexer = new Lexer(allTokens)