import { createToken, Lexer } from 'chevrotain'

// Keywords - using negative lookahead to ensure they're not part of identifiers
export const Create = createToken({ name: 'Create', pattern: /CREATE(?![a-zA-Z0-9_])/i })
export const Table = createToken({ name: 'Table', pattern: /TABLE(?![a-zA-Z0-9_.])(?=\s)/i })
export const View = createToken({ name: 'View', pattern: /VIEW(?![a-zA-Z0-9_])/i })
export const To = createToken({ name: 'To', pattern: /TO(?![a-zA-Z0-9_])/i })
export const As = createToken({ name: 'As', pattern: /AS(?![a-zA-Z0-9_])/i })
// Only match IF when it's the keyword (followed by NOT), not the if() function
export const If = createToken({ name: 'If', pattern: /IF(?=\s+NOT)/i })
export const Not = createToken({ name: 'Not', pattern: /NOT(?![a-zA-Z0-9_])/i })
export const Exists = createToken({ name: 'Exists', pattern: /EXISTS(?![a-zA-Z0-9_])/i })
export const Engine = createToken({ name: 'Engine', pattern: /ENGINE(?![a-zA-Z0-9_])/i })
export const Default = createToken({ name: 'Default', pattern: /DEFAULT(?![a-zA-Z0-9_])/i })
export const Null = createToken({ name: 'Null', pattern: /NULL(?![a-zA-Z0-9_])/i })
export const Nullable = createToken({ name: 'Nullable', pattern: /Nullable(?![a-zA-Z0-9_])/i })
export const Materialized = createToken({ name: 'Materialized', pattern: /MATERIALIZED(?![a-zA-Z0-9_])/i })
export const Alias = createToken({ name: 'Alias', pattern: /ALIAS(?![a-zA-Z0-9_])/i })
export const Comment = createToken({ name: 'Comment', pattern: /COMMENT(?![a-zA-Z0-9_])/i })
export const PrimaryKey = createToken({ name: 'PrimaryKey', pattern: /PRIMARY\s+KEY(?![a-zA-Z0-9_])/i })
export const OrderBy = createToken({ name: 'OrderBy', pattern: /ORDER\s+BY(?![a-zA-Z0-9_])/i })
export const PartitionBy = createToken({ name: 'PartitionBy', pattern: /PARTITION\s+BY(?![a-zA-Z0-9_])/i })
export const Settings = createToken({ name: 'Settings', pattern: /SETTINGS(?![a-zA-Z0-9_])/i })

// SQL operators and keywords for WHERE clauses, JOIN conditions, etc.
export const In = createToken({ name: 'In', pattern: /IN(?![a-zA-Z0-9_])/i })
export const And = createToken({ name: 'And', pattern: /AND(?![a-zA-Z0-9_])/i })
export const Or = createToken({ name: 'Or', pattern: /OR(?![a-zA-Z0-9_])/i })
export const Like = createToken({ name: 'Like', pattern: /LIKE(?![a-zA-Z0-9_])/i })
export const Between = createToken({ name: 'Between', pattern: /BETWEEN(?![a-zA-Z0-9_])/i })
export const Replace = createToken({ name: 'Replace', pattern: /REPLACE(?![a-zA-Z0-9_])/i })
export const Union = createToken({ name: 'Union', pattern: /UNION(?![a-zA-Z0-9_])/i })
export const All = createToken({ name: 'All', pattern: /ALL(?![a-zA-Z0-9_])/i })
export const Cast = createToken({ name: 'Cast', pattern: /CAST(?![a-zA-Z0-9_])/i })
export const With = createToken({ name: 'With', pattern: /WITH(?![a-zA-Z0-9_])/i })
export const Join = createToken({ name: 'Join', pattern: /JOIN(?![a-zA-Z0-9_])/i })
export const Inner = createToken({ name: 'Inner', pattern: /INNER(?![a-zA-Z0-9_])/i })
export const Left = createToken({ name: 'Left', pattern: /LEFT(?![a-zA-Z0-9_])/i })
export const Right = createToken({ name: 'Right', pattern: /RIGHT(?![a-zA-Z0-9_])/i })
export const Full = createToken({ name: 'Full', pattern: /FULL(?![a-zA-Z0-9_])/i })
export const Cross = createToken({ name: 'Cross', pattern: /CROSS(?![a-zA-Z0-9_])/i })
export const On = createToken({ name: 'On', pattern: /ON(?![a-zA-Z0-9_])/i })
export const Using = createToken({ name: 'Using', pattern: /USING(?![a-zA-Z0-9_])/i })
export const Interval = createToken({ name: 'Interval', pattern: /INTERVAL(?![a-zA-Z0-9_])/i })
export const Day = createToken({ name: 'Day', pattern: /DAY(?![a-zA-Z0-9_])/i })
export const Days = createToken({ name: 'Days', pattern: /DAYS(?![a-zA-Z0-9_])/i })
export const Hour = createToken({ name: 'Hour', pattern: /HOUR(?![a-zA-Z0-9_])/i })
export const Hours = createToken({ name: 'Hours', pattern: /HOURS(?![a-zA-Z0-9_])/i })
export const Minute = createToken({ name: 'Minute', pattern: /MINUTE(?![a-zA-Z0-9_])/i })
export const Minutes = createToken({ name: 'Minutes', pattern: /MINUTES(?![a-zA-Z0-9_])/i })
export const Second = createToken({ name: 'Second', pattern: /SECOND(?![a-zA-Z0-9_])/i })
export const Seconds = createToken({ name: 'Seconds', pattern: /SECONDS(?![a-zA-Z0-9_])/i })
export const Week = createToken({ name: 'Week', pattern: /WEEK(?![a-zA-Z0-9_])/i })
export const Weeks = createToken({ name: 'Weeks', pattern: /WEEKS(?![a-zA-Z0-9_])/i })
export const Month = createToken({ name: 'Month', pattern: /MONTH(?![a-zA-Z0-9_])/i })
export const Months = createToken({ name: 'Months', pattern: /MONTHS(?![a-zA-Z0-9_])/i })
export const Year = createToken({ name: 'Year', pattern: /YEAR(?![a-zA-Z0-9_])/i })
export const Years = createToken({ name: 'Years', pattern: /YEARS(?![a-zA-Z0-9_])/i })
export const Select = createToken({ name: 'Select', pattern: /SELECT(?![a-zA-Z0-9_])/i })
export const From = createToken({ name: 'From', pattern: /FROM(?![a-zA-Z0-9_])/i })
export const Where = createToken({ name: 'Where', pattern: /WHERE(?![a-zA-Z0-9_])/i })
export const GroupBy = createToken({ name: 'GroupBy', pattern: /GROUP\\s+BY(?![a-zA-Z0-9_])/i })
export const Having = createToken({ name: 'Having', pattern: /HAVING(?![a-zA-Z0-9_])/i })
export const Limit = createToken({ name: 'Limit', pattern: /LIMIT(?![a-zA-Z0-9_])/i })
export const Offset = createToken({ name: 'Offset', pattern: /OFFSET(?![a-zA-Z0-9_])/i })

// Symbols
export const LParen = createToken({ name: 'LParen', pattern: /\(/ })
export const RParen = createToken({ name: 'RParen', pattern: /\)/ })
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ })
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ })
export const Comma = createToken({ name: 'Comma', pattern: /,/ })
export const Dot = createToken({ name: 'Dot', pattern: /\./ })
export const Colon = createToken({ name: 'Colon', pattern: /:/ })
export const LCurly = createToken({ name: 'LCurly', pattern: /\{/ })
export const RCurly = createToken({ name: 'RCurly', pattern: /\}/ })

// Comparison operators - ORDER MATTERS! More specific patterns first
export const Arrow = createToken({ name: 'Arrow', pattern: /->/ })
export const NotEquals = createToken({ name: 'NotEquals', pattern: /!=/ })
export const NotEquals2 = createToken({ name: 'NotEquals2', pattern: /<>/ })
export const GreaterThanOrEqual = createToken({ name: 'GreaterThanOrEqual', pattern: />=/ })
export const LessThanOrEqual = createToken({ name: 'LessThanOrEqual', pattern: /<=/ })
export const GreaterThan = createToken({ name: 'GreaterThan', pattern: />/ })
export const LessThan = createToken({ name: 'LessThan', pattern: /</ })
export const Equals = createToken({ name: 'Equals', pattern: /=/ })

export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ })
export const Plus = createToken({ name: 'Plus', pattern: /\+/ })
export const Minus = createToken({ name: 'Minus', pattern: /-/ })
export const Star = createToken({ name: 'Star', pattern: /\*/ })
export const Slash = createToken({ name: 'Slash', pattern: /\// })
export const Percent = createToken({ name: 'Percent', pattern: /%/ })

// ClickHouse specific data types - ORDER MATTERS! More specific first
export const SimpleAggregateFunction = createToken({ name: 'SimpleAggregateFunction', pattern: /SimpleAggregateFunction(?![a-zA-Z0-9_])/i })
export const AggregateFunction = createToken({ name: 'AggregateFunction', pattern: /AggregateFunction(?![a-zA-Z0-9_])/i })
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
export const Decimal = createToken({ name: 'Decimal', pattern: /Decimal(?![a-zA-Z0-9_])/i })
export const String = createToken({ name: 'String', pattern: /String(?![a-zA-Z0-9_])/i })
export const UUID = createToken({ name: 'UUID', pattern: /UUID(?![a-zA-Z0-9_])/i })
export const Bool = createToken({ name: 'Bool', pattern: /Bool(?![a-zA-Z0-9_])/i })
export const IPv4 = createToken({ name: 'IPv4', pattern: /IPv4(?![a-zA-Z0-9_])/i })
export const IPv6 = createToken({ name: 'IPv6', pattern: /IPv6(?![a-zA-Z0-9_])/i })
export const JSONType = createToken({ name: 'JSONType', pattern: /JSON(?![a-zA-Z0-9_])/i })
export const Date32 = createToken({ name: 'Date32', pattern: /Date32(?![a-zA-Z0-9_])/i })

// Others
export const LineComment = createToken({ name: 'LineComment', pattern: /--[^\n\r]*/, group: Lexer.SKIPPED })
export const NumberLiteral = createToken({ name: 'NumberLiteral', pattern: /[0-9]+(\.[0-9]+)?/ })
export const StringLiteral = createToken({ name: 'StringLiteral', pattern: /'(?:[^'\\]|\\.|'')*'|"(?:[^"\\]|\\.|"")*"/ })
export const BacktickIdentifier = createToken({ name: 'BacktickIdentifier', pattern: /`[^`]+`/ })
export const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_\$]*/ })
export const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t\n\r]+/, group: Lexer.SKIPPED })
export const Other = createToken({ name: 'Other', pattern: /[^\s]+/ })

export const allTokens = [
  WhiteSpace,
  LineComment,
  Create,
  Table,
  View,
  To,
  As,
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
  PrimaryKey,
  OrderBy,
  PartitionBy,
  Settings,
  In,
  And,
  Or,
  Like,
  Between,
  Replace,
  Union,
  All,
  Cast,
  With,
  GroupBy, // Must come before Join since it has multiple words
  Join,
  Inner,
  Left,
  Right,
  Full,
  Cross,
  On,
  Using,
  Interval,
  Days, // Plural forms must come before singular
  Day,
  Hours,
  Hour,
  Minutes,
  Minute,
  Seconds,
  Second,
  Weeks,
  Week,
  Months,
  Month,
  Years,
  Year,
  Select,
  From,
  Where,
  Having,
  Limit,
  Offset,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Comma,
  Dot,
  Colon,
  LCurly,
  RCurly,
  // Comparison operators and special symbols - more specific first
  Arrow,
  NotEquals,
  NotEquals2,
  GreaterThanOrEqual,
  LessThanOrEqual,
  GreaterThan,
  LessThan,
  Equals,
  Semicolon,
  Plus,
  Minus,
  Star,
  Slash,
  Percent,
  // Data types in order of specificity (most specific first)
  SimpleAggregateFunction,
  AggregateFunction,
  DateTime64,
  DateTime,
  Date32,
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
  Decimal,
  String,
  UUID,
  Bool,
  IPv4,
  IPv6,
  JSONType,
  StringLiteral,
  NumberLiteral,
  BacktickIdentifier,
  Identifier,
  Other,
]

export const ClickHouseLexer = new Lexer(allTokens)