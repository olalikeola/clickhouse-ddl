import { CstParser, IToken } from 'chevrotain'
import {
  Create,
  Table,
  View,
  To,
  As,
  If,
  Not,
  Exists,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Comma,
  Dot,
  Colon,
  LCurly,
  RCurly,
  Identifier,
  BacktickIdentifier,
  Engine,
  Equals,
  StringLiteral,
  NumberLiteral,
  Default,
  Null,
  Nullable,
  Materialized,
  Alias,
  Comment,
  PrimaryKey,
  OrderBy,
  PartitionBy,
  Over,
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
  Join,
  Inner,
  Left,
  Right,
  Full,
  Cross,
  On,
  Using,
  Interval,
  Day,
  Days,
  Hour,
  Hours,
  Minute,
  Minutes,
  Second,
  Seconds,
  Week,
  Weeks,
  Month,
  Months,
  Year,
  Years,
  Asc,
  Desc,
  Select,
  From,
  Where,
  GroupBy,
  Having,
  Limit,
  Offset,
  Arrow,
  NotEquals,
  NotEquals2,
  GreaterThanOrEqual,
  LessThanOrEqual,
  GreaterThan,
  LessThan,
  Plus,
  Minus,
  Star,
  Slash,
  Percent,
  Semicolon,
  Other,
  // Data type tokens
  UInt8,
  UInt16,
  UInt32,
  UInt64,
  Int8,
  Int16,
  Int32,
  Int64,
  Float32,
  Float64,
  Decimal,
  String,
  Date,
  Date32,
  DateTime,
  DateTime64,
  UUID,
  Bool,
  IPv4,
  IPv6,
  JSONType,
  Array,
  Tuple,
  Map,
  Nested,
  LowCardinality,
  Enum8,
  Enum16,
  FixedString,
  AggregateFunction,
  SimpleAggregateFunction,
  ClickHouseLexer,
} from './tokens.js'
import {
  DDLTable,
  DDLColumn,
  DDLStatement,
  DDLView,
  DDLMaterializedView,
  SelectStatement,
  SelectColumn,
  OrderByItem,
  FromClause,
  TableRef,
  ColumnRef,
  Expression,
  BinaryOp,
  ParameterRef,
  FunctionCall,
  WindowFunction,
  Literal,
  CTEDefinition
} from './ast.js'

class ClickHouseParser extends CstParser {
  constructor() {
    super(
      [
        Create,
        Table,
        View,
        To,
        As,
        If,
        Not,
        Exists,
        LParen,
        RParen,
        LBracket,
        RBracket,
        Comma,
        Dot,
        Colon,
        LCurly,
        RCurly,
        Identifier,
        BacktickIdentifier,
        Engine,
        Equals,
        StringLiteral,
        NumberLiteral,
        Default,
        Null,
        Nullable,
        Materialized,
        Alias,
        Comment,
        OrderBy,
        PartitionBy,
        Settings,
        NotEquals,
        GreaterThanOrEqual,
        LessThanOrEqual,
        GreaterThan,
        LessThan,
        Plus,
        Minus,
        Star,
        Slash,
        // Data types
        UInt8,
        UInt16,
        UInt32,
        UInt64,
        Int8,
        Int16,
        Int32,
        Int64,
        Float32,
        Float64,
        Decimal,
        String,
        Date,
        Date32,
        DateTime,
        DateTime64,
        UUID,
        Bool,
        IPv4,
        IPv6,
        JSONType,
        Array,
        Tuple,
        Map,
        Nested,
        LowCardinality,
        Enum8,
        Enum16,
        FixedString,
        AggregateFunction,
        SimpleAggregateFunction,
      ],
      { recoveryEnabled: true, maxLookahead: 5 },
    )
    this.performSelfAnalysis()
  }

  public root = this.RULE('root', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.createTable) },
      { ALT: () => this.SUBRULE(this.createMaterializedView) },
      { ALT: () => this.SUBRULE(this.createView) }
    ])
  })

  private createTable = this.RULE('createTable', () => {
    this.CONSUME(Create)
    this.CONSUME(Table)
    this.OPTION(() => {
      this.CONSUME(If)
      this.CONSUME(Not)
      this.CONSUME(Exists)
    })
    this.SUBRULE(this.qualifiedTableName) // table name (qualified or unqualified)

    this.CONSUME(LParen) // table start paren
    this.SUBRULE(this.columns)
    this.CONSUME(RParen) // table end paren

    this.OPTION2(() => {
      this.SUBRULE(this.engineClause)
    })

    this.OPTION3(() => {
      this.SUBRULE(this.primaryKeyClause)
    })

    this.OPTION4(() => {
      this.SUBRULE(this.partitionByClause)
    })

    this.OPTION5(() => {
      this.SUBRULE(this.orderByClause)
    })

    this.OPTION6(() => {
      this.SUBRULE(this.settingsClause)
    })
  })

  private createView = this.RULE('createView', () => {
    this.CONSUME(Create)
    this.OPTION(() => {
      this.CONSUME(Or)
      this.CONSUME(Replace)
    })
    this.CONSUME(View)
    this.OPTION2(() => {
      this.CONSUME(If)
      this.CONSUME(Not)
      this.CONSUME(Exists)
    })
    this.SUBRULE(this.qualifiedTableName) // view name (qualified or unqualified)
    this.CONSUME(As)
    // Capture the SELECT query - consume everything after AS
    this.SUBRULE(this.selectQuery)
  })

  private createMaterializedView = this.RULE('createMaterializedView', () => {
    this.CONSUME(Create)
    this.CONSUME(Materialized)
    this.CONSUME(View)
    this.OPTION(() => {
      this.CONSUME(If)
      this.CONSUME(Not)
      this.CONSUME(Exists)
    })
    this.SUBRULE(this.qualifiedTableName) // view name (qualified or unqualified)
    this.CONSUME(To)
    this.SUBRULE2(this.qualifiedTableName) // target table name (qualified or unqualified)

    // Optional: column definitions (system.tables format)
    this.OPTION2(() => {
      this.CONSUME(LParen) // column definitions start
      this.SUBRULE(this.columns)
      this.CONSUME(RParen) // column definitions end
    })

    // Optional: AS SELECT query (source code format)
    this.OPTION3(() => {
      this.CONSUME(As)
      this.SUBRULE(this.selectQuery)
    })
  })

  // Basic SELECT statement without token catchall (for use inside CTEs)
  private basicSelectStatement = this.RULE('basicSelectStatement', () => {
    this.CONSUME(Select)
    this.SUBRULE(this.selectList)
    this.OPTION(() => {
      this.SUBRULE(this.fromClause)
    })
    this.OPTION2(() => {
      this.SUBRULE(this.whereClause)
    })
    // NO anyToken catchall here - we want to stop at the closing paren
  })

  // NEW: Query parser - gracefully handles SELECT queries and falls back for complex ones
  private selectQuery = this.RULE('selectQuery', () => {
    this.OR([
      {
        // WITH ... SELECT pattern (CTE)
        GATE: () => this.LA(1).tokenType.name === 'With',
        ALT: () => {
          this.SUBRULE(this.withClause)
          this.CONSUME(Select)
          this.SUBRULE2(this.selectList)
          this.OPTION(() => {
            this.SUBRULE(this.fromClause)
          })
          this.OPTION2(() => {
            this.SUBRULE(this.whereClause)
          })
          // Capture any remaining tokens (GROUP BY, ORDER BY, UNION, etc.)
          this.MANY(() => {
            this.SUBRULE(this.anyToken)
          })
        }
      },
      {
        // Structured SELECT parsing for simple queries (no WITH)
        GATE: () => this.LA(1).tokenType.name === 'Select',
        ALT: () => {
          this.CONSUME2(Select)
          this.SUBRULE3(this.selectList)
          this.OPTION3(() => {
            this.SUBRULE2(this.fromClause)
          })
          this.OPTION4(() => {
            this.SUBRULE2(this.whereClause)
          })
          // Capture any remaining tokens (GROUP BY, ORDER BY, UNION, etc.)
          this.MANY2(() => {
            this.SUBRULE2(this.anyToken)
          })
        }
      },
      {
        // Fallback for anything else - capture as tokens
        ALT: () => {
          this.AT_LEAST_ONE(() => {
            this.SUBRULE3(this.anyToken)
          })
        }
      }
    ])
  })

  // Catch-all for any token (for graceful degradation)
  private anyToken = this.RULE('anyToken', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(LParen) },
      { ALT: () => this.CONSUME(RParen) },
      { ALT: () => this.CONSUME(Comma) },
      { ALT: () => this.CONSUME(Dot) },
      { ALT: () => this.CONSUME(Star) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(BacktickIdentifier) },
      { ALT: () => this.CONSUME(LCurly) },
      { ALT: () => this.CONSUME(RCurly) },
      { ALT: () => this.CONSUME(Colon) },
      { ALT: () => this.CONSUME(LBracket) },
      { ALT: () => this.CONSUME(RBracket) },
      { ALT: () => this.CONSUME(Plus) },
      { ALT: () => this.CONSUME(Minus) },
      { ALT: () => this.CONSUME(Arrow) },
      { ALT: () => this.CONSUME(Slash) },
      { ALT: () => this.CONSUME(Percent) },
      { ALT: () => this.CONSUME(Semicolon) },
      // Comparison operators
      { ALT: () => this.CONSUME(Equals) },
      { ALT: () => this.CONSUME(NotEquals) },
      { ALT: () => this.CONSUME(NotEquals2) },
      { ALT: () => this.CONSUME(GreaterThan) },
      { ALT: () => this.CONSUME(LessThan) },
      { ALT: () => this.CONSUME(GreaterThanOrEqual) },
      { ALT: () => this.CONSUME(LessThanOrEqual) },
      // Keywords
      { ALT: () => this.CONSUME(Where) },
      { ALT: () => this.CONSUME(In) },
      { ALT: () => this.CONSUME(From) },
      { ALT: () => this.CONSUME(GroupBy) },
      { ALT: () => this.CONSUME(OrderBy) },
      { ALT: () => this.CONSUME(Having) },
      { ALT: () => this.CONSUME(Limit) },
      { ALT: () => this.CONSUME(Offset) },
      { ALT: () => this.CONSUME(Union) },
      { ALT: () => this.CONSUME(All) },
      { ALT: () => this.CONSUME(Join) },
      { ALT: () => this.CONSUME(Left) },
      { ALT: () => this.CONSUME(Right) },
      { ALT: () => this.CONSUME(Inner) },
      { ALT: () => this.CONSUME(Full) },
      { ALT: () => this.CONSUME(Cross) },
      { ALT: () => this.CONSUME(On) },
      { ALT: () => this.CONSUME(Using) },
      { ALT: () => this.CONSUME(As) },
      { ALT: () => this.CONSUME(And) },
      { ALT: () => this.CONSUME(Or) },
      { ALT: () => this.CONSUME(Not) },
      { ALT: () => this.CONSUME(Null) },
      { ALT: () => this.CONSUME(Like) },
      { ALT: () => this.CONSUME(Between) },
      { ALT: () => this.CONSUME(Cast) },
      { ALT: () => this.CONSUME(Interval) },
      { ALT: () => this.CONSUME(PartitionBy) },
      { ALT: () => this.CONSUME(Array) },
      { ALT: () => this.CONSUME(If) },
      { ALT: () => this.CONSUME(With) },
      { ALT: () => this.CONSUME(Materialized) },
      { ALT: () => this.CONSUME(Replace) },
      { ALT: () => this.CONSUME(To) },
      { ALT: () => this.CONSUME(Engine) },
      { ALT: () => this.CONSUME(Default) },
      { ALT: () => this.CONSUME(Nullable) },
      { ALT: () => this.CONSUME(Alias) },
      { ALT: () => this.CONSUME(Comment) },
      { ALT: () => this.CONSUME(PrimaryKey) },
      { ALT: () => this.CONSUME(Settings) },
      { ALT: () => this.CONSUME(Exists) },
      // Interval units
      { ALT: () => this.CONSUME(Day) },
      { ALT: () => this.CONSUME(Days) },
      { ALT: () => this.CONSUME(Hour) },
      { ALT: () => this.CONSUME(Hours) },
      { ALT: () => this.CONSUME(Minute) },
      { ALT: () => this.CONSUME(Minutes) },
      { ALT: () => this.CONSUME(Second) },
      { ALT: () => this.CONSUME(Seconds) },
      { ALT: () => this.CONSUME(Week) },
      { ALT: () => this.CONSUME(Weeks) },
      { ALT: () => this.CONSUME(Month) },
      { ALT: () => this.CONSUME(Months) },
      { ALT: () => this.CONSUME(Year) },
      { ALT: () => this.CONSUME(Years) },
      // Data types
      { ALT: () => this.CONSUME(SimpleAggregateFunction) },
      { ALT: () => this.CONSUME(AggregateFunction) },
      { ALT: () => this.CONSUME(DateTime64) },
      { ALT: () => this.CONSUME(DateTime) },
      { ALT: () => this.CONSUME(Date32) },
      { ALT: () => this.CONSUME(Date) },
      { ALT: () => this.CONSUME(Tuple) },
      { ALT: () => this.CONSUME(Map) },
      { ALT: () => this.CONSUME(Nested) },
      { ALT: () => this.CONSUME(LowCardinality) },
      { ALT: () => this.CONSUME(Enum8) },
      { ALT: () => this.CONSUME(Enum16) },
      { ALT: () => this.CONSUME(FixedString) },
      { ALT: () => this.CONSUME(UInt64) },
      { ALT: () => this.CONSUME(UInt32) },
      { ALT: () => this.CONSUME(UInt16) },
      { ALT: () => this.CONSUME(UInt8) },
      { ALT: () => this.CONSUME(Int64) },
      { ALT: () => this.CONSUME(Int32) },
      { ALT: () => this.CONSUME(Int16) },
      { ALT: () => this.CONSUME(Int8) },
      { ALT: () => this.CONSUME(Float64) },
      { ALT: () => this.CONSUME(Float32) },
      { ALT: () => this.CONSUME(Decimal) },
      { ALT: () => this.CONSUME(String) },
      { ALT: () => this.CONSUME(UUID) },
      { ALT: () => this.CONSUME(Bool) },
      { ALT: () => this.CONSUME(IPv4) },
      { ALT: () => this.CONSUME(IPv6) },
      { ALT: () => this.CONSUME(JSONType) },
      { ALT: () => this.CONSUME(Other) },
    ])
  })

  // WHERE clause
  private whereClause = this.RULE('whereClause', () => {
    this.CONSUME(Where)
    this.SUBRULE(this.orExpression)
  })

  // WITH clause (CTEs - Common Table Expressions)
  private withClause = this.RULE('withClause', () => {
    this.CONSUME(With)
    this.AT_LEAST_ONE_SEP({
      SEP: Comma,
      DEF: () => this.SUBRULE(this.cteDefinition)
    })
  })

  // CTE definition: name AS (SELECT ...)
  private cteDefinition = this.RULE('cteDefinition', () => {
    this.CONSUME(Identifier)  // CTE name
    this.CONSUME(As)
    this.CONSUME(LParen)
    this.SUBRULE(this.basicSelectStatement)  // Use basic SELECT (no token catchall)
    this.CONSUME(RParen)
  })

  // Level 1: OR (lowest precedence)
  private orExpression = this.RULE('orExpression', () => {
    this.SUBRULE(this.andExpression)
    this.MANY(() => {
      this.CONSUME(Or)
      this.SUBRULE2(this.andExpression)
    })
  })

  // Level 2: AND
  private andExpression = this.RULE('andExpression', () => {
    this.SUBRULE(this.comparisonExpression)
    this.MANY(() => {
      this.CONSUME(And)
      this.SUBRULE2(this.comparisonExpression)
    })
  })

  // Level 3: Comparison (=, !=, <, >, <=, >=, IN)
  private comparisonExpression = this.RULE('comparisonExpression', () => {
    this.SUBRULE(this.primaryValue)
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Equals) },
        { ALT: () => this.CONSUME(NotEquals) },
        { ALT: () => this.CONSUME(LessThan) },
        { ALT: () => this.CONSUME(GreaterThan) },
        { ALT: () => this.CONSUME(LessThanOrEqual) },
        { ALT: () => this.CONSUME(GreaterThanOrEqual) },
        { ALT: () => this.CONSUME(In) },
      ])
      this.SUBRULE2(this.primaryValue)
    })
  })

  // Level 4: Primary values (literals, columns, parentheses, parameters)
  private primaryValue = this.RULE('primaryValue', () => {
    this.OR([
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(Null) },
      {
        // Parameter: {param:Type} or ({param:Type})
        GATE: () => {
          const la1 = this.LA(1)
          const la2 = this.LA(2)
          // Match {param or ({param
          return la1.tokenType.name === 'LCurly' ||
                 (la1.tokenType.name === 'LParen' && la2.tokenType.name === 'LCurly')
        },
        ALT: () => this.SUBRULE(this.parameter)
      },
      {
        // Parenthesized expression (not a parameter)
        ALT: () => {
          this.CONSUME(LParen)
          this.SUBRULE(this.orExpression)
          this.CONSUME(RParen)
        }
      },
      { ALT: () => this.SUBRULE(this.simpleColumn) },
    ])
  })

  // Keep old expression rule for backward compatibility (just delegates to orExpression)
  private expression = this.RULE('expression', () => {
    this.SUBRULE(this.orExpression)
  })

  // Parameter syntax: {param:Type}
  private parameter = this.RULE('parameter', () => {
    this.OPTION(() => this.CONSUME(LParen))  // Optional (
    this.CONSUME(LCurly)
    this.CONSUME(Identifier)  // param name
    this.CONSUME(Colon)
    this.SUBRULE(this.type)  // Array(String)
    this.CONSUME(RCurly)
    this.OPTION2(() => this.CONSUME(RParen))  // Optional )
  })

  // Parse the list of columns: id, name, email
  private selectList = this.RULE('selectList', () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Comma,
      DEF: () => {
        this.SUBRULE(this.selectColumn)
      }
    })
  })

  // Parse a single column (permissive - handles simple and complex expressions)
  private selectColumn = this.RULE('selectColumn', () => {
    this.OR([
      { ALT: () => this.CONSUME(Star) },  // SELECT *
      {
        // Function call or window function: identifier followed by (
        GATE: () => {
          const la1 = this.LA(1)
          const la2 = this.LA(2)
          return la1.tokenType.name === 'Identifier' && la2.tokenType.name === 'LParen'
        },
        ALT: () => this.SUBRULE(this.functionCallOrWindow)
      },
      { ALT: () => this.SUBRULE(this.orExpression) }   // Any other expression
    ])
    // Optional alias: [AS] alias_name
    this.OPTION(() => {
      this.OPTION2(() => this.CONSUME(As))  // AS keyword is optional
      this.CONSUME(Identifier)  // alias name
    })
  })

  // Function call or window function: funcName(...) [OVER (...)]
  private functionCallOrWindow = this.RULE('functionCallOrWindow', () => {
    this.SUBRULE(this.functionCall)
    // Optional OVER clause makes it a window function
    this.OPTION(() => {
      this.CONSUME(Over)
      this.CONSUME(LParen)
      // Optional PARTITION BY clause
      this.OPTION2(() => {
        this.CONSUME(PartitionBy)
        this.SUBRULE(this.orExpression)
        this.MANY(() => {
          this.CONSUME(Comma)
          this.SUBRULE2(this.orExpression)
        })
      })
      // Optional ORDER BY clause
      this.OPTION3(() => {
        this.CONSUME(OrderBy)
        this.SUBRULE(this.orderByItem)
        this.MANY2(() => {
          this.CONSUME2(Comma)
          this.SUBRULE2(this.orderByItem)
        })
      })
      this.CONSUME(RParen)
    })
  })

  // Simple column reference: identifier or qualified identifier
  private simpleColumn = this.RULE('simpleColumn', () => {
    this.CONSUME(Identifier)
    this.OPTION(() => {
      this.CONSUME(Dot)
      this.CONSUME2(Identifier)
    })
  })

  // Function call: funcName(arg1, arg2, ...)
  private functionCall = this.RULE('functionCall', () => {
    this.CONSUME(Identifier)  // Function name
    this.CONSUME(LParen)
    // Optional arguments
    this.OPTION(() => {
      this.OR([
        // Special case: COUNT(*), SUM(*), etc.
        { ALT: () => this.CONSUME(Star) },
        // Regular arguments: comma-separated column expressions
        {
          ALT: () => {
            // First argument
            this.AT_LEAST_ONE(() => {
              this.SUBRULE(this.columnToken)
            })
            // Additional arguments
            this.MANY(() => {
              this.CONSUME(Comma)
              this.AT_LEAST_ONE2(() => {
                this.SUBRULE2(this.columnToken)
              })
            })
          }
        }
      ])
    })
    this.CONSUME(RParen)
  })

  // Window function: functionCall OVER (PARTITION BY ... ORDER BY ...)
  // Order by item: expression [ASC|DESC]
  private orderByItem = this.RULE('orderByItem', () => {
    this.SUBRULE(this.orExpression)  // The expression to order by
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Asc) },
        { ALT: () => this.CONSUME(Desc) }
      ])
    })
  })

  // Tokens that can appear in a column expression (everything except delimiters)
  // NOTE: Removed Identifier and LParen to avoid ambiguity with functionCall
  // NOTE: Removed RParen - it should be consumed explicitly by rules that need it (like functionCall)
  private columnToken = this.RULE('columnToken', () => {
    this.OR([
      { ALT: () => this.CONSUME(Dot) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(BacktickIdentifier) },
      { ALT: () => this.CONSUME(LCurly) },
      { ALT: () => this.CONSUME(RCurly) },
      { ALT: () => this.CONSUME(Colon) },
      { ALT: () => this.CONSUME(LBracket) },
      { ALT: () => this.CONSUME(RBracket) },
      { ALT: () => this.CONSUME(Plus) },
      { ALT: () => this.CONSUME(Minus) },
      { ALT: () => this.CONSUME(Arrow) },
      { ALT: () => this.CONSUME(Slash) },
      { ALT: () => this.CONSUME(Percent) },
      { ALT: () => this.CONSUME(Equals) },
      { ALT: () => this.CONSUME(NotEquals) },
      { ALT: () => this.CONSUME(NotEquals2) },
      { ALT: () => this.CONSUME(GreaterThan) },
      { ALT: () => this.CONSUME(LessThan) },
      { ALT: () => this.CONSUME(GreaterThanOrEqual) },
      { ALT: () => this.CONSUME(LessThanOrEqual) },
      { ALT: () => this.CONSUME(In) },
      { ALT: () => this.CONSUME(And) },
      { ALT: () => this.CONSUME(Or) },
      { ALT: () => this.CONSUME(Not) },
      { ALT: () => this.CONSUME(Null) },
      { ALT: () => this.CONSUME(Like) },
      { ALT: () => this.CONSUME(Between) },
      { ALT: () => this.CONSUME(Cast) },
      { ALT: () => this.CONSUME(Interval) },
      { ALT: () => this.CONSUME(Array) },
      { ALT: () => this.CONSUME(If) },
      { ALT: () => this.CONSUME(As) },
      // Data types
      { ALT: () => this.CONSUME(String) },
      { ALT: () => this.CONSUME(Int32) },
      { ALT: () => this.CONSUME(Int64) },
      { ALT: () => this.CONSUME(Float32) },
      { ALT: () => this.CONSUME(Float64) },
      { ALT: () => this.CONSUME(Date) },
      { ALT: () => this.CONSUME(DateTime) },
      { ALT: () => this.CONSUME(UUID) },
      { ALT: () => this.CONSUME(Other) },
      // Note: Comma, From, Where, GroupBy, OrderBy, etc. are NOT included
      // These act as delimiters that end a column expression
    ])
  })

  // Parse FROM clause
  private fromClause = this.RULE('fromClause', () => {
    this.CONSUME(From)
    this.SUBRULE(this.tableRef)
  })

  // Parse table reference
  private tableRef = this.RULE('tableRef', () => {
    this.CONSUME(Identifier)  // table name
  })

  private qualifiedTableName = this.RULE('qualifiedTableName', () => {
    this.OR([
      { ALT: () => this.CONSUME(Identifier) }, // schema or table name as identifier
      { ALT: () => this.CONSUME(BacktickIdentifier) }, // schema or table name as backtick identifier
      { ALT: () => this.CONSUME(Table) } // table name as table keyword
    ])
    this.OPTION(() => {
      this.CONSUME(Dot) // dot separator
      this.OR2([
        { ALT: () => this.CONSUME2(Identifier) }, // table name as identifier
        { ALT: () => this.CONSUME2(BacktickIdentifier) }, // table name as backtick identifier
        { ALT: () => this.CONSUME2(Table) } // table name as table keyword
      ])
    })
  })

  private engineClause = this.RULE('engineClause', () => {
    this.CONSUME(Engine)
    this.CONSUME(Equals)
    this.CONSUME(Identifier) // engine name
    this.OPTION(() => {
      this.CONSUME(LParen) // engine start paren
      this.OPTION2(() => {
        this.SUBRULE(this.simpleExpression)
        this.MANY(() => {
          this.CONSUME(Comma)
          this.SUBRULE2(this.simpleExpression)
        })
      })
      this.CONSUME(RParen) // engine end paren
    })
  })

  private primaryKeyClause = this.RULE('primaryKeyClause', () => {
    this.CONSUME(PrimaryKey)
    this.CONSUME(LParen)
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.CONSUME(Identifier) })
    this.CONSUME(RParen)
  })

  private orderByClause = this.RULE('orderByClause', () => {
    this.CONSUME(OrderBy)
    this.OR([
      // With parentheses: ORDER BY (id, name)
      {
        ALT: () => {
          this.CONSUME2(LParen)
          this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.CONSUME2(Identifier) })
          this.CONSUME2(RParen)
        }
      },
      // Without parentheses: ORDER BY id, name
      {
        ALT: () => {
          this.AT_LEAST_ONE_SEP2({ SEP: Comma, DEF: () => this.CONSUME3(Identifier) })
        }
      }
    ])
  })

  private partitionByClause = this.RULE('partitionByClause', () => {
    this.CONSUME(PartitionBy)
    // Optional parentheses around partition expression(s)
    const hasParens = this.OPTION(() => this.CONSUME(LParen))

    // One or more comma-separated expressions
    this.SUBRULE(this.simpleExpression)
    this.MANY(() => {
      this.CONSUME(Comma)
      this.SUBRULE2(this.simpleExpression)
    })

    if (hasParens) {
      this.CONSUME(RParen)
    }
  })

  private settingsClause = this.RULE('settingsClause', () => {
    this.CONSUME(Settings)
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.SUBRULE(this.setting) })
  })

  private setting = this.RULE('setting', () => {
    this.CONSUME(Identifier) // setting name
    this.CONSUME(Equals)
    this.SUBRULE(this.simpleExpression)
  })

  // Simplified expression parsing to avoid ambiguity
  private simpleExpression = this.RULE('simpleExpression', () => {
    this.SUBRULE(this.expressionTerm)
    this.MANY(() => {
      this.OR([
        // Comparison operators
        { ALT: () => this.CONSUME(NotEquals) },
        { ALT: () => this.CONSUME(GreaterThanOrEqual) },
        { ALT: () => this.CONSUME(LessThanOrEqual) },
        { ALT: () => this.CONSUME(GreaterThan) },
        { ALT: () => this.CONSUME(LessThan) },
        { ALT: () => this.CONSUME(Equals) },
        // Arithmetic operators
        { ALT: () => this.CONSUME(Plus) },
        { ALT: () => this.CONSUME(Minus) },
        { ALT: () => this.CONSUME(Star) },
        { ALT: () => this.CONSUME(Slash) },
        { ALT: () => this.CONSUME(Percent) },
      ])
      this.SUBRULE2(this.expressionTerm)
    })
  })

  private expressionTerm = this.RULE('expressionTerm', () => {
    this.OR([
      {
        // Unary minus or plus (for negative/positive numbers and expressions)
        ALT: () => {
          this.OR2([
            { ALT: () => this.CONSUME(Minus) },
            { ALT: () => this.CONSUME(Plus) },
          ])
          this.SUBRULE(this.expressionTerm)
        },
      },
      {
        // Regular identifier (with optional function call)
        ALT: () => {
          this.CONSUME2(Identifier)
          this.OPTION(() => {
            // Function call
            this.CONSUME(LParen)
            this.OPTION2(() => {
              this.SUBRULE2(this.simpleExpression)
              this.MANY(() => {
                this.CONSUME(Comma)
                this.SUBRULE3(this.simpleExpression)
              })
            })
            this.CONSUME(RParen)
          })
        },
      },
      {
        // Backtick identifier (with optional function call)
        ALT: () => {
          this.CONSUME(BacktickIdentifier)
          this.OPTION3(() => {
            // Function call
            this.CONSUME2(LParen)
            this.OPTION4(() => {
              this.SUBRULE4(this.simpleExpression)
              this.MANY2(() => {
                this.CONSUME2(Comma)
                this.SUBRULE5(this.simpleExpression)
              })
            })
            this.CONSUME2(RParen)
          })
        },
      },
      {
        // IF keyword as function name (for if() function)
        ALT: () => {
          this.CONSUME(If)
          this.CONSUME3(LParen)
          this.OPTION5(() => {
            this.SUBRULE6(this.simpleExpression)
            this.MANY3(() => {
              this.CONSUME3(Comma)
              this.SUBRULE7(this.simpleExpression)
            })
          })
          this.CONSUME3(RParen)
        },
      },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(NumberLiteral) },
      {
        // Empty array literal []
        ALT: () => {
          this.CONSUME(LBracket)
          this.CONSUME(RBracket)
        },
      },
      {
        // Tuple literal (val1, val2, ...)
        ALT: () => {
          this.CONSUME4(LParen)
          this.SUBRULE8(this.simpleExpression)
          this.AT_LEAST_ONE(() => {
            this.CONSUME4(Comma)
            this.SUBRULE9(this.simpleExpression)
          })
          this.CONSUME4(RParen)
        },
      },
    ])
  })

  private columns = this.RULE('columns', () => {
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.SUBRULE(this.column) })
  })

  private column = this.RULE('column', () => {
    // Column name can be regular or backtick identifier
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(BacktickIdentifier) },
    ])

    // Type is optional for ALIAS columns
    this.OPTION(() => {
      this.SUBRULE(this.type)
    })

    // NULL keyword makes column nullable (alternative to Nullable(Type))
    this.OPTION2(() => {
      this.CONSUME(Null)
    })

    this.OPTION3(() => {
      this.CONSUME(Default)
      this.SUBRULE1(this.simpleExpression)
    })
    this.OPTION4(() => {
      this.CONSUME(Materialized)
      this.SUBRULE2(this.simpleExpression)
    })
    this.OPTION5(() => {
      this.CONSUME(Alias)
      this.SUBRULE3(this.simpleExpression)
    })
    this.OPTION6(() => {
      this.CONSUME(Comment)
      this.CONSUME(StringLiteral)
    })
  })

  private type = this.RULE('type', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.nullableType) },
      { ALT: () => this.CONSUME(UInt8) },
      { ALT: () => this.CONSUME(UInt16) },
      { ALT: () => this.CONSUME(UInt32) },
      { ALT: () => this.CONSUME(UInt64) },
      { ALT: () => this.CONSUME(Int8) },
      { ALT: () => this.CONSUME(Int16) },
      { ALT: () => this.CONSUME(Int32) },
      { ALT: () => this.CONSUME(Int64) },
      { ALT: () => this.CONSUME(Float32) },
      { ALT: () => this.CONSUME(Float64) },
      { ALT: () => this.SUBRULE(this.decimalType) },
      { ALT: () => this.CONSUME(String) },
      { ALT: () => this.CONSUME(Date32) },
      { ALT: () => this.CONSUME(Date) },
      { ALT: () => this.CONSUME(DateTime) },
      { ALT: () => this.CONSUME(DateTime64) },
      { ALT: () => this.CONSUME(UUID) },
      { ALT: () => this.CONSUME(Bool) },
      { ALT: () => this.CONSUME(IPv4) },
      { ALT: () => this.CONSUME(IPv6) },
      { ALT: () => this.CONSUME(JSONType) },
      { ALT: () => this.SUBRULE(this.arrayType) },
      { ALT: () => this.SUBRULE(this.tupleType) },
      { ALT: () => this.SUBRULE(this.mapType) },
      { ALT: () => this.SUBRULE(this.nestedType) },
      { ALT: () => this.SUBRULE(this.lowCardinalityType) },
      { ALT: () => this.SUBRULE(this.enumType) },
      { ALT: () => this.SUBRULE(this.fixedStringType) },
      { ALT: () => this.SUBRULE(this.aggregateFunctionType) },
      { ALT: () => this.SUBRULE(this.simpleAggregateFunctionType) },
      { ALT: () => this.CONSUME(Identifier) }, // fallback for other types
    ])
    this.OPTION(() => {
      this.SUBRULE(this.typeParams)
    })
  })

  private nullableType = this.RULE('nullableType', () => {
    this.CONSUME(Nullable)
    this.CONSUME(LParen)
    this.SUBRULE(this.type)
    this.CONSUME(RParen)
  })

  private arrayType = this.RULE('arrayType', () => {
    this.CONSUME(Array)
    this.CONSUME(LParen)
    this.SUBRULE(this.type)
    this.CONSUME(RParen)
  })

  private tupleType = this.RULE('tupleType', () => {
    this.CONSUME(Tuple)
    this.CONSUME(LParen)
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.SUBRULE(this.type) })
    this.CONSUME(RParen)
  })

  private mapType = this.RULE('mapType', () => {
    this.CONSUME(Map)
    this.CONSUME(LParen)
    this.SUBRULE1(this.type) // key type
    this.CONSUME(Comma)
    this.SUBRULE2(this.type) // value type
    this.CONSUME(RParen)
  })

  private nestedType = this.RULE('nestedType', () => {
    this.CONSUME(Nested)
    this.CONSUME(LParen)
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.SUBRULE(this.nestedField) })
    this.CONSUME(RParen)
  })

  private nestedField = this.RULE('nestedField', () => {
    // Field name can be regular or backtick identifier
    this.OR([
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(BacktickIdentifier) },
    ])
    this.SUBRULE(this.type)
  })

  private lowCardinalityType = this.RULE('lowCardinalityType', () => {
    this.CONSUME(LowCardinality)
    this.CONSUME(LParen)
    this.SUBRULE(this.type)
    this.CONSUME(RParen)
  })

  private enumType = this.RULE('enumType', () => {
    this.OR([
      { ALT: () => this.CONSUME(Enum8) },
      { ALT: () => this.CONSUME(Enum16) },
    ])
    this.CONSUME(LParen)
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.SUBRULE(this.enumValue) })
    this.CONSUME(RParen)
  })

  private enumValue = this.RULE('enumValue', () => {
    this.CONSUME(StringLiteral)
    this.CONSUME(Equals)
    this.CONSUME(NumberLiteral)
  })

  private fixedStringType = this.RULE('fixedStringType', () => {
    this.CONSUME(FixedString)
    this.CONSUME(LParen)
    this.CONSUME(NumberLiteral)
    this.CONSUME(RParen)
  })

  private decimalType = this.RULE('decimalType', () => {
    this.CONSUME(Decimal)
    this.CONSUME(LParen)
    this.CONSUME(NumberLiteral) // precision
    this.CONSUME(Comma)
    this.CONSUME2(NumberLiteral) // scale
    this.CONSUME(RParen)
  })

  private aggregateFunctionType = this.RULE('aggregateFunctionType', () => {
    this.CONSUME(AggregateFunction)
    this.CONSUME(LParen)
    this.CONSUME(Identifier) // function name (sum, avg, etc.)
    this.CONSUME(Comma)
    this.SUBRULE(this.type) // inner type
    this.CONSUME(RParen)
  })

  private simpleAggregateFunctionType = this.RULE('simpleAggregateFunctionType', () => {
    this.CONSUME(SimpleAggregateFunction)
    this.CONSUME(LParen)
    this.CONSUME(Identifier) // function name (sum, avg, max, min, etc.)
    this.CONSUME(Comma)
    this.SUBRULE(this.type) // inner type
    this.CONSUME(RParen)
  })

  private typeParams = this.RULE('typeParams', () => {
    this.CONSUME(LParen) // type start paren
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.SUBRULE(this.simpleExpression) })
    this.CONSUME(RParen) // type end paren
  })
}

const parser = new ClickHouseParser()

export function parseStatement(sql: string): DDLStatement {
  const lexResult = ClickHouseLexer.tokenize(sql)
  parser.input = lexResult.tokens
  const cst = parser.root()
  if (parser.errors.length > 0) {
    throw new Error('Parse errors: ' + JSON.stringify(parser.errors, null, 2))
  }

  // Check if it's a CREATE TABLE, CREATE VIEW, or CREATE MATERIALIZED VIEW statement
  if ((cst.children as any).createTable) {
    const create = (cst.children as any).createTable[0]
    const table = parseCreateTable(create)
    return { type: 'CREATE_TABLE', table }
  } else if ((cst.children as any).createMaterializedView) {
    const create = (cst.children as any).createMaterializedView[0]
    const materializedView = parseCreateMaterializedView(create)
    return { type: 'CREATE_MATERIALIZED_VIEW', materializedView }
  } else if ((cst.children as any).createView) {
    const create = (cst.children as any).createView[0]
    const view = parseCreateView(create)
    return { type: 'CREATE_VIEW', view }
  } else {
    throw new Error('Unknown statement type')
  }
}

// Backwards compatible function - returns just the table
export function parse(sql: string): DDLTable {
  const result = parseStatement(sql)
  if (result.type === 'CREATE_TABLE' && result.table) {
    return result.table
  }
  throw new Error('Expected CREATE TABLE statement')
}

function parseCreateTable(create: any): DDLTable {
  
  // Handle qualified table names (schema.table or just table)
  const qualifiedTableName = create.children.qualifiedTableName[0]
  const identifierTokens = findTokensOfType(qualifiedTableName, 'Identifier')
  const backtickTokens = findTokensOfType(qualifiedTableName, 'BacktickIdentifier')
  const tableTokens = findTokensOfType(qualifiedTableName, 'Table')

  // Combine all identifier-like tokens (Identifier, BacktickIdentifier) and sort by position
  const allIdentifiers = [...identifierTokens, ...backtickTokens].sort((a, b) => a.startOffset - b.startOffset)

  let tableName: string
  if (allIdentifiers.length === 2) {
    // schema.table format with two identifiers
    tableName = `${extractIdentifierValue(allIdentifiers[0])}.${extractIdentifierValue(allIdentifiers[1])}`
  } else if (allIdentifiers.length === 1 && tableTokens.length === 1) {
    // schema.table format with identifier and table keyword
    tableName = `${extractIdentifierValue(allIdentifiers[0])}.${tableTokens[0].image}`
  } else if (tableTokens.length === 2) {
    // schema.table format with both table keywords
    tableName = `${tableTokens[0].image}.${tableTokens[1].image}`
  } else if (allIdentifiers.length === 1 && tableTokens.length === 0) {
    // just table name as identifier
    tableName = extractIdentifierValue(allIdentifiers[0])
  } else if (tableTokens.length === 1 && allIdentifiers.length === 0) {
    // just table name as table keyword
    tableName = tableTokens[0].image
  } else {
    // fallback
    tableName = allIdentifiers[0] ? extractIdentifierValue(allIdentifiers[0]) : (tableTokens[0]?.image || 'unknown')
  }

  const columnNodes = (create.children.columns[0].children as any).column
  const columns: DDLColumn[] = columnNodes.map((colNode: any) => {
    const nameTok = findIdentifierToken(colNode) as IToken
    const name = extractIdentifierValue(nameTok)
    let type = 'unknown'
    let nullable = false
    let def: string | undefined
    let materialized: string | undefined
    let alias: string | undefined
    let comment: string | undefined

    // Parse type - extract from type node
    if (colNode.children.type) {
      const typeNode = colNode.children.type[0]
      const typeResult = extractType(typeNode)
      type = typeResult.type
      nullable = typeResult.nullable
    }

    // Check for NULL keyword (alternative to Nullable)
    if (colNode.children.Null) {
      nullable = true
    }

    // Parse default value
    if (colNode.children.Default) {
      def = extractExpression(colNode.children.simpleExpression[0])
    }

    // Parse materialized
    if (colNode.children.Materialized) {
      //const materializedIdx = Object.keys(colNode.children).indexOf('Materialized')
      //const simpleExpIdx = Object.keys(colNode.children).indexOf('simpleExpression')
      // Find the simpleExpression that comes after Materialized
      const simpleExpNodes = colNode.children.simpleExpression || []
      for (let i = 0; i < simpleExpNodes.length; i++) {
        const expr = extractExpression(simpleExpNodes[i])
        if (!def || i > 0) {
          materialized = expr
          break
        }
      }
    }

    // Parse alias
    if (colNode.children.Alias) {
      const simpleExpNodes = colNode.children.simpleExpression || []
      // The last simpleExpression should be the alias expression
      if (simpleExpNodes.length > 0) {
        alias = extractExpression(simpleExpNodes[simpleExpNodes.length - 1])
      }
    }

    // Parse comment
    if (colNode.children.Comment) {
      const stringLiterals = findTokensOfType(colNode, 'StringLiteral')
      // Comment string literal is the last one (or the only one if no default)
      if (stringLiterals.length > 0) {
        const commentLiteral = stringLiterals[stringLiterals.length - 1].image
        // Strip quotes
        comment = commentLiteral.slice(1, -1)
      }
    }

    return { name, type, nullable, default: def, materialized, alias, comment }
  })

  // Parse table options
  let engine: string | undefined
  let orderBy: string[] | undefined
  let partitionBy: string | undefined
  let settings: Record<string, string> | undefined

  if (create.children.engineClause) {
    const engineClause = create.children.engineClause[0]
    const engineTok = findTokenOfType(engineClause, 'Identifier') as IToken
    engine = engineTok.image
  }

  if (create.children.orderByClause) {
    const orderByClause = create.children.orderByClause[0]
    const orderByTokens = findTokensOfType(orderByClause, 'Identifier')
    orderBy = orderByTokens.map(t => t.image)
  }

  if (create.children.partitionByClause) {
    const partitionByClause = create.children.partitionByClause[0]
    partitionBy = extractExpression(partitionByClause)
  }

  if (create.children.settingsClause) {
    const settingsClause = create.children.settingsClause[0]
    settings = {}
    const settingNodes = settingsClause.children.setting || []
    for (const settingNode of settingNodes) {
      const identifiers = findTokensOfType(settingNode, 'Identifier')
      const expressions = settingNode.children.simpleExpression || []
      if (identifiers.length > 0 && expressions.length > 0) {
        const key = identifiers[0].image
        const value = extractExpression(expressions[0])
        settings[key] = value
      }
    }
  }

  return { name: tableName, columns, engine, orderBy, partitionBy, settings }
}

function parseCreateView(create: any): DDLView {
  // Handle qualified view names (schema.view or just view)
  const qualifiedTableName = create.children.qualifiedTableName[0]
  const identifierTokens = findTokensOfType(qualifiedTableName, 'Identifier')
  const backtickTokens = findTokensOfType(qualifiedTableName, 'BacktickIdentifier')
  const tableTokens = findTokensOfType(qualifiedTableName, 'Table')

  // Combine all identifier-like tokens (Identifier, BacktickIdentifier) and sort by position
  const allIdentifiers = [...identifierTokens, ...backtickTokens].sort((a, b) => a.startOffset - b.startOffset)

  let viewName: string
  if (allIdentifiers.length === 2) {
    // schema.view format with two identifiers
    viewName = `${extractIdentifierValue(allIdentifiers[0])}.${extractIdentifierValue(allIdentifiers[1])}`
  } else if (allIdentifiers.length === 1 && tableTokens.length === 1) {
    // schema.view format with identifier and table keyword
    viewName = `${extractIdentifierValue(allIdentifiers[0])}.${tableTokens[0].image}`
  } else if (tableTokens.length === 2) {
    // schema.view format with both table keywords
    viewName = `${tableTokens[0].image}.${tableTokens[1].image}`
  } else if (allIdentifiers.length === 1 && tableTokens.length === 0) {
    // just view name as identifier
    viewName = extractIdentifierValue(allIdentifiers[0])
  } else if (tableTokens.length === 1 && allIdentifiers.length === 0) {
    // just view name as table keyword
    viewName = tableTokens[0].image
  } else {
    // fallback
    viewName = allIdentifiers[0] ? extractIdentifierValue(allIdentifiers[0]) : (tableTokens[0]?.image || 'unknown')
  }

  // Extract the SELECT query from the selectQuery node
  const selectQueryNode = create.children.selectQuery[0]

  // Try to build AST (returns undefined if parsing fell back to string mode)
  const selectAST = extractSelectStatement(selectQueryNode)

  // Build AST - fail hard if extraction fails (no string fallback)
  if (!selectAST) {
    throw new Error(`Failed to extract SELECT AST for view: ${viewName}`)
  }

  return {
    name: viewName,
    select: selectAST  // Pure AST, required field
  }
}

function parseCreateMaterializedView(create: any): DDLMaterializedView {
  // Handle qualified view names (schema.view or just view)
  const qualifiedTableNames = create.children.qualifiedTableName

  // First qualifiedTableName is the view name
  const viewNameNode = qualifiedTableNames[0]
  const viewIdentifierTokens = findTokensOfType(viewNameNode, 'Identifier')
  const viewBacktickTokens = findTokensOfType(viewNameNode, 'BacktickIdentifier')
  const viewTableTokens = findTokensOfType(viewNameNode, 'Table')

  // Combine all identifier-like tokens (Identifier, BacktickIdentifier) and sort by position
  const viewAllIdentifiers = [...viewIdentifierTokens, ...viewBacktickTokens].sort((a, b) => a.startOffset - b.startOffset)

  let viewName: string
  if (viewAllIdentifiers.length === 2) {
    viewName = `${extractIdentifierValue(viewAllIdentifiers[0])}.${extractIdentifierValue(viewAllIdentifiers[1])}`
  } else if (viewAllIdentifiers.length === 1 && viewTableTokens.length === 1) {
    viewName = `${extractIdentifierValue(viewAllIdentifiers[0])}.${viewTableTokens[0].image}`
  } else if (viewTableTokens.length === 2) {
    viewName = `${viewTableTokens[0].image}.${viewTableTokens[1].image}`
  } else if (viewAllIdentifiers.length === 1 && viewTableTokens.length === 0) {
    viewName = extractIdentifierValue(viewAllIdentifiers[0])
  } else if (viewTableTokens.length === 1 && viewAllIdentifiers.length === 0) {
    viewName = viewTableTokens[0].image
  } else {
    viewName = viewAllIdentifiers[0] ? extractIdentifierValue(viewAllIdentifiers[0]) : (viewTableTokens[0]?.image || 'unknown')
  }

  // Second qualifiedTableName is the target table name
  const toTableNode = qualifiedTableNames[1]
  const toIdentifierTokens = findTokensOfType(toTableNode, 'Identifier')
  const toBacktickTokens = findTokensOfType(toTableNode, 'BacktickIdentifier')
  const toTableTokens = findTokensOfType(toTableNode, 'Table')

  const toAllIdentifiers = [...toIdentifierTokens, ...toBacktickTokens].sort((a, b) => a.startOffset - b.startOffset)

  let toTable: string
  if (toAllIdentifiers.length === 2) {
    toTable = `${extractIdentifierValue(toAllIdentifiers[0])}.${extractIdentifierValue(toAllIdentifiers[1])}`
  } else if (toAllIdentifiers.length === 1 && toTableTokens.length === 1) {
    toTable = `${extractIdentifierValue(toAllIdentifiers[0])}.${toTableTokens[0].image}`
  } else if (toTableTokens.length === 2) {
    toTable = `${toTableTokens[0].image}.${toTableTokens[1].image}`
  } else if (toAllIdentifiers.length === 1 && toTableTokens.length === 0) {
    toTable = extractIdentifierValue(toAllIdentifiers[0])
  } else if (toTableTokens.length === 1 && toAllIdentifiers.length === 0) {
    toTable = toTableTokens[0].image
  } else {
    toTable = toAllIdentifiers[0] ? extractIdentifierValue(toAllIdentifiers[0]) : (toTableTokens[0]?.image || 'unknown')
  }

  // Optional: Parse column definitions (system.tables format)
  let columns: DDLColumn[] | undefined
  if (create.children.columns) {
    const columnNodes = (create.children.columns[0].children as any).column
    columns = columnNodes.map((colNode: any) => {
      const nameTok = findIdentifierToken(colNode) as IToken
      const name = extractIdentifierValue(nameTok)
      let type = 'unknown'
      let nullable = false
      let def: string | undefined
      let materialized: string | undefined
      let alias: string | undefined
      let comment: string | undefined

      // Parse type - extract from type node
      if (colNode.children.type) {
        const typeNode = colNode.children.type[0]
        const typeResult = extractType(typeNode)
        type = typeResult.type
        nullable = typeResult.nullable
      }

      // Check for NULL keyword (alternative to Nullable)
      if (colNode.children.Null) {
        nullable = true
      }

      // Parse default value
      if (colNode.children.Default) {
        def = extractExpression(colNode.children.simpleExpression[0])
      }

      // Parse materialized
      if (colNode.children.Materialized) {
        const simpleExpNodes = colNode.children.simpleExpression || []
        for (let i = 0; i < simpleExpNodes.length; i++) {
          const expr = extractExpression(simpleExpNodes[i])
          if (!def || i > 0) {
            materialized = expr
            break
          }
        }
      }

      // Parse alias
      if (colNode.children.Alias) {
        const simpleExpNodes = colNode.children.simpleExpression || []
        if (simpleExpNodes.length > 0) {
          alias = extractExpression(simpleExpNodes[simpleExpNodes.length - 1])
        }
      }

      // Parse comment
      if (colNode.children.Comment) {
        const stringLiterals = findTokensOfType(colNode, 'StringLiteral')
        if (stringLiterals.length > 0) {
          const commentLiteral = stringLiterals[stringLiterals.length - 1].image
          comment = commentLiteral.slice(1, -1)
        }
      }

      return { name, type, nullable, default: def, materialized, alias, comment }
    })
  }

  // Optional: Extract the SELECT query from the selectQuery node
  let selectQuery: string | undefined
  if (create.children.selectQuery && create.children.selectQuery[0]) {
    const selectQueryNode = create.children.selectQuery[0]
    selectQuery = flattenTokens(selectQueryNode).map(t => t.image).join(' ')
  }

  return { name: viewName, toTable, columns, selectQuery }
}

function extractType(typeNode: any): { type: string; nullable: boolean } {
  let nullable = false
  let type = 'unknown'

  // Check if it's a nullable type
  if (typeNode.children.nullableType) {
    nullable = true
    const innerTypeNode = typeNode.children.nullableType[0].children.type[0]
    return { type: extractType(innerTypeNode).type, nullable: true }
  }

  // Check for complex types
  if (typeNode.children.arrayType) {
    const arrayNode = typeNode.children.arrayType[0]
    const innerType = extractType(arrayNode.children.type[0]).type
    return { type: `Array(${innerType})`, nullable }
  }

  if (typeNode.children.tupleType) {
    const tupleNode = typeNode.children.tupleType[0]
    const types = tupleNode.children.type.map((t: any) => extractType(t).type)
    return { type: `Tuple(${types.join(', ')})`, nullable }
  }

  if (typeNode.children.mapType) {
    const mapNode = typeNode.children.mapType[0]
    const keyType = extractType(mapNode.children.type[0]).type
    const valueType = extractType(mapNode.children.type[1]).type
    return { type: `Map(${keyType}, ${valueType})`, nullable }
  }

  if (typeNode.children.nestedType) {
    const nestedNode = typeNode.children.nestedType[0]
    const fields = nestedNode.children.nestedField.map((f: any) => {
      const fieldToken = findIdentifierToken(f)
      const fieldName = fieldToken ? extractIdentifierValue(fieldToken) : ''
      const fieldType = extractType(f.children.type[0]).type
      return `${fieldName} ${fieldType}`
    })
    return { type: `Nested(${fields.join(', ')})`, nullable }
  }

  if (typeNode.children.lowCardinalityType) {
    const lcNode = typeNode.children.lowCardinalityType[0]
    const innerType = extractType(lcNode.children.type[0]).type
    return { type: `LowCardinality(${innerType})`, nullable }
  }

  if (typeNode.children.enumType) {
    const enumNode = typeNode.children.enumType[0]
    const enumKind = enumNode.children.Enum8 ? 'Enum8' : 'Enum16'
    const enumValues = enumNode.children.enumValue.map((ev: any) => {
      const stringLit = findTokenOfType(ev, 'StringLiteral')?.image || ''
      const numLit = findTokenOfType(ev, 'NumberLiteral')?.image || ''
      return `${stringLit} = ${numLit}`
    })
    return { type: `${enumKind}(${enumValues.join(', ')})`, nullable }
  }

  if (typeNode.children.fixedStringType) {
    const fsNode = typeNode.children.fixedStringType[0]
    const size = findTokenOfType(fsNode, 'NumberLiteral')?.image || ''
    return { type: `FixedString(${size})`, nullable }
  }

  if (typeNode.children.decimalType) {
    const decNode = typeNode.children.decimalType[0]
    const numbers = findTokensOfType(decNode, 'NumberLiteral')
    const precision = numbers[0]?.image || ''
    const scale = numbers[1]?.image || ''
    return { type: `Decimal(${precision}, ${scale})`, nullable }
  }

  if (typeNode.children.aggregateFunctionType) {
    const aggNode = typeNode.children.aggregateFunctionType[0]
    const funcName = findTokenOfType(aggNode, 'Identifier')?.image || ''
    const innerType = extractType(aggNode.children.type[0]).type
    return { type: `AggregateFunction(${funcName}, ${innerType})`, nullable }
  }

  if (typeNode.children.simpleAggregateFunctionType) {
    const aggNode = typeNode.children.simpleAggregateFunctionType[0]
    const funcName = findTokenOfType(aggNode, 'Identifier')?.image || ''
    const innerType = extractType(aggNode.children.type[0]).type
    return { type: `SimpleAggregateFunction(${funcName}, ${innerType})`, nullable }
  }

  // Simple types
  const typeTokenNames = [
    'UInt8', 'UInt16', 'UInt32', 'UInt64',
    'Int8', 'Int16', 'Int32', 'Int64',
    'Float32', 'Float64', 'String', 'Date', 'Date32', 'DateTime', 'DateTime64',
    'UUID', 'Bool', 'IPv4', 'IPv6', 'JSONType'
  ]

  for (const tokenName of typeTokenNames) {
    const token = findTokenOfType(typeNode, tokenName)
    if (token) {
      // Use the token image for the output (which is 'JSON' not 'JSONType')
      return { type: token.image, nullable }
    }
  }

  // Fallback to identifier
  const identifierToken = findTokenOfType(typeNode, 'Identifier')
  if (identifierToken) {
    return { type: identifierToken.image, nullable }
  }

  return { type, nullable }
}

function findTokenOfType(node: any, typeName: string): IToken | null {
  if (!node || !node.children) return null
  for (const key of Object.keys(node.children)) {
    const arr = node.children[key]
    for (const item of arr) {
      if (item.tokenType && item.tokenType.name === typeName) return item
      const found: IToken | null = findTokenOfType(item, typeName)
      if (found) return found
    }
  }
  return null
}

// Helper function to extract identifier value, stripping backticks if present
function extractIdentifierValue(token: IToken): string {
  if (token.tokenType.name === 'BacktickIdentifier') {
    // Strip leading and trailing backticks
    return token.image.slice(1, -1)
  }
  return token.image
}

// Helper function to find either Identifier or BacktickIdentifier token
function findIdentifierToken(node: any): IToken | null {
  return findTokenOfType(node, 'BacktickIdentifier') || findTokenOfType(node, 'Identifier')
}

function findTokensOfType(node: any, typeName: string): IToken[] {
  const tokens: IToken[] = []
  if (!node || !node.children) return tokens
  for (const key of Object.keys(node.children)) {
    const arr = node.children[key]
    for (const item of arr) {
      if (item.tokenType && item.tokenType.name === typeName) {
        tokens.push(item)
      }
      tokens.push(...findTokensOfType(item, typeName))
    }
  }
  return tokens
}

function extractExpression(node: any): string {
  const tokens = flattenTokens(node)
  // Sort tokens by their position in source to preserve order
  tokens.sort((a, b) => a.startOffset - b.startOffset)

  // Filter out structural keywords like PartitionBy
  const filteredTokens = tokens.filter(t =>
    !['PartitionBy', 'OrderBy'].includes(t.tokenType.name)
  )

  // Join tokens preserving structure
  let result = ''
  for (let i = 0; i < filteredTokens.length; i++) {
    const token = filteredTokens[i]
    const prevToken = i > 0 ? filteredTokens[i - 1] : null

    // Add space before token if needed
    if (i > 0 && prevToken) {
      const isOperator = ['Plus', 'Minus', 'Star', 'Slash', 'Equals', 'NotEquals', 'GreaterThan', 'LessThan', 'GreaterThanOrEqual', 'LessThanOrEqual'].includes(token.tokenType.name)
      const prevIsOperator = ['Plus', 'Minus', 'Star', 'Slash', 'Equals', 'NotEquals', 'GreaterThan', 'LessThan', 'GreaterThanOrEqual', 'LessThanOrEqual'].includes(prevToken.tokenType.name)
      const isLParen = token.tokenType.name === 'LParen'
      const isRParen = token.tokenType.name === 'RParen'
      const isLBracket = token.tokenType.name === 'LBracket'
      const isRBracket = token.tokenType.name === 'RBracket'
      const isComma = token.tokenType.name === 'Comma'
      const prevIsLParen = prevToken.tokenType.name === 'LParen'
      const prevIsLBracket = prevToken.tokenType.name === 'LBracket'
      const prevIsIdentifier = prevToken.tokenType.name === 'Identifier' || prevToken.tokenType.name === 'BacktickIdentifier'

      // No space before/after parens when they're for function calls
      // No space after opening paren/bracket or before closing paren/bracket or comma
      // Space around operators
      // Space after comma
      // No space between identifier and opening paren (function call)
      // No space in empty brackets []

      if (isRParen || isRBracket || isComma) {
        // No space before ), ], or ,
      } else if (prevIsLParen || prevIsLBracket) {
        // No space after ( or [
      } else if ((isLParen || isLBracket) && prevIsIdentifier) {
        // No space between identifier and ( for function calls
      } else if (isOperator || prevIsOperator) {
        // Check if the PREVIOUS token was a unary operator (no space after it)
        const prevWasUnaryOperator = prevIsOperator &&
          (prevToken.tokenType.name === 'Minus' || prevToken.tokenType.name === 'Plus') &&
          (i === 1 || // First operator in expression
           (i >= 2 && ['Plus', 'Minus', 'Star', 'Slash', 'Equals', 'NotEquals', 'GreaterThan', 'LessThan', 'GreaterThanOrEqual', 'LessThanOrEqual', 'LParen', 'Comma'].includes(filteredTokens[i - 2].tokenType.name)))

        if (!prevWasUnaryOperator) {
          // Space around binary operators only
          result += ' '
        }
      } else if (prevToken.tokenType.name === 'Comma') {
        // Space after comma
        result += ' '
      } else if (!isLParen && !isLBracket) {
        // Default: add space
        result += ' '
      }
    }

    // Strip backticks from BacktickIdentifier tokens
    const tokenValue = token.tokenType.name === 'BacktickIdentifier'
      ? token.image.slice(1, -1)
      : token.image
    result += tokenValue
  }

  return result
}

function flattenTokens(node: any): IToken[] {
  const out: IToken[] = []
  if (!node || !node.children) return out
  for (const key of Object.keys(node.children)) {
    const arr = node.children[key]
    for (const item of arr) {
      if (item.tokenType) out.push(item)
      else out.push(...flattenTokens(item))
    }
  }
  return out
}

// ========================================
// AST Extraction Functions
// ========================================

/**
 * Extract WITH clause (CTEs)
 */
function extractWithClause(cst: any): CTEDefinition[] {
  const ctes: CTEDefinition[] = []

  if (!cst.children.cteDefinition) {
    return ctes
  }

  for (const cteNode of cst.children.cteDefinition) {
    const cteDef = extractCteDefinition(cteNode)
    if (cteDef) {
      ctes.push(cteDef)
    }
  }

  return ctes
}

/**
 * Extract a single CTE definition
 */
function extractCteDefinition(cst: any): CTEDefinition | undefined {
  const name = cst.children.Identifier[0].image

  // The basicSelectStatement is inside the parentheses
  if (!cst.children.basicSelectStatement || !cst.children.basicSelectStatement[0]) {
    return undefined
  }

  // Extract from basicSelectStatement node
  const selectNode = cst.children.basicSelectStatement[0]
  const query = extractBasicSelectStatement(selectNode)
  if (!query) {
    return undefined
  }

  return {
    type: 'CTE',
    name,
    query
  }
}

/**
 * Extract a basic SELECT statement (used inside CTEs)
 */
function extractBasicSelectStatement(cst: any): SelectStatement | undefined {
  // The selectList contains the columns
  if (!cst.children.selectList) {
    return undefined
  }

  const selectListNode = cst.children.selectList[0]
  const columns = extractSelectList(selectListNode)

  // Build the AST
  const result: SelectStatement = {
    type: 'SELECT',
    columns
  }

  // FROM clause is optional
  if (cst.children.fromClause) {
    result.from = extractFromClause(cst.children.fromClause[0])
  }

  // WHERE clause is optional
  if (cst.children.whereClause) {
    const whereExpr = extractWhereClause(cst.children.whereClause[0])
    if (whereExpr) {
      result.where = whereExpr
    }
  }

  return result
}

/**
 * Extract a SELECT statement into an AST
 * Input: CST node from Chevrotain parser
 * Output: SelectStatement AST
 */
function extractSelectStatement(cst: any): SelectStatement | undefined {
  // Check if we have structured data (selectList exists)
  // If we fell back to anyToken catch-all (e.g., WITH CTEs), we won't have selectList
  if (!cst.children.selectList) {
    // Return undefined to signal that AST extraction is not available
    // Caller should use the string representation instead
    return undefined
  }

  // The selectList contains the columns
  const selectListNode = cst.children.selectList[0]
  const columns = extractSelectList(selectListNode)

  // Build the AST
  const result: SelectStatement = {
    type: 'SELECT',
    columns
  }

  // WITH clause is optional (CTEs)
  if (cst.children.withClause) {
    const ctes = extractWithClause(cst.children.withClause[0])
    if (ctes.length > 0) {
      result.with = ctes
    }
  }

  // FROM clause is optional
  if (cst.children.fromClause) {
    result.from = extractFromClause(cst.children.fromClause[0])
  }

  // WHERE clause is optional
  if (cst.children.whereClause) {
    const whereExpr = extractWhereClause(cst.children.whereClause[0])
    if (whereExpr) {
      result.where = whereExpr
    }
  }

  return result
}

/**
 * Extract the list of columns being selected
 */
function extractSelectList(cst: any): SelectColumn[] {
  // selectColumn is an array of column nodes
  const columnNodes = cst.children.selectColumn

  return columnNodes.map((colNode: any) => extractSelectColumn(colNode))
}

/**
 * Extract a single column
 */
function extractSelectColumn(cst: any): SelectColumn {
  // Extract alias if present (last Identifier in the selectColumn CST)
  let alias: string | undefined
  if (cst.children.Identifier && cst.children.Identifier.length > 0) {
    // The last Identifier in selectColumn is the alias (if alias was present)
    const lastIdentifier = cst.children.Identifier[cst.children.Identifier.length - 1]
    alias = lastIdentifier.image
  }

  // Check if it's SELECT *
  if (cst.children.Star) {
    return {
      expression: {
        type: 'COLUMN',
        name: '*'
      },
      alias
    }
  }

  // Check if it's a function call or window function
  if (cst.children.functionCallOrWindow) {
    return {
      expression: extractFunctionCallOrWindow(cst.children.functionCallOrWindow[0]),
      alias
    }
  }

  // Check for general expression (literals, CAST, columns, etc.)
  if (cst.children.orExpression) {
    return {
      expression: extractOrExpression(cst.children.orExpression[0]),
      alias
    }
  }

  // Fallback for complex expressions
  return {
    expression: {
      type: 'COLUMN',
      name: '(complex expression)'
    }
  }
}

/**
 * Extract function call AST
 */
function extractFunctionCall(cst: any): FunctionCall {
  const name = cst.children.Identifier[0].image
  const args: Expression[] = []

  // Handle COUNT(*), SUM(*), etc.
  if (cst.children.Star) {
    args.push({
      type: 'COLUMN',
      name: '*'
    })
  }
  // Handle function with column/expression arguments
  else if (cst.children.columnToken) {
    // For now, we'll extract each argument group as a simple expression
    // Split by Comma tokens to separate arguments
    const allTokens = cst.children.columnToken
    let currentArg: any[] = []

    for (const token of allTokens) {
      if (token.children.Comma) {
        // End of current argument, start new one
        if (currentArg.length > 0) {
          // For now, just extract first identifier if simple
          const firstToken = currentArg[0]
          if (firstToken.children.Identifier) {
            args.push({
              type: 'COLUMN',
              name: firstToken.children.Identifier[0].image
            })
          }
          currentArg = []
        }
      } else {
        currentArg.push(token)
      }
    }

    // Don't forget the last argument
    if (currentArg.length > 0) {
      const firstToken = currentArg[0]
      if (firstToken.children.Identifier) {
        args.push({
          type: 'COLUMN',
          name: firstToken.children.Identifier[0].image
        })
      }
    }
  }

  return {
    type: 'FUNCTION_CALL',
    name,
    args
  }
}

/**
 * Extract function call or window function
 */
function extractFunctionCallOrWindow(cst: any): FunctionCall | WindowFunction {
  // Extract the underlying function call
  const funcCall = extractFunctionCall(cst.children.functionCall[0])

  // Check if there's an OVER clause (making it a window function)
  if (!cst.children.Over) {
    // No OVER clause, just return the function call
    return funcCall
  }

  // It's a window function
  // Extract PARTITION BY expressions
  const partitionBy: Expression[] = []
  if (cst.children.orExpression) {
    for (const expr of cst.children.orExpression) {
      partitionBy.push(extractOrExpression(expr))
    }
  }

  // Extract ORDER BY items
  const orderBy: OrderByItem[] = []
  if (cst.children.orderByItem) {
    for (const item of cst.children.orderByItem) {
      const expression = extractOrExpression(item.children.orExpression[0])
      let direction: 'ASC' | 'DESC' | undefined

      if (item.children.Asc) {
        direction = 'ASC'
      } else if (item.children.Desc) {
        direction = 'DESC'
      }

      orderBy.push({
        expression,
        direction
      })
    }
  }

  return {
    type: 'WINDOW_FUNCTION',
    name: funcCall.name,
    args: funcCall.args,
    over: {
      partitionBy: partitionBy.length > 0 ? partitionBy : undefined,
      orderBy: orderBy.length > 0 ? orderBy : undefined
    }
  }
}

/**
 * Extract FROM clause
 */
function extractFromClause(cst: any): FromClause {
  const tableRef = extractTableRef(cst.children.tableRef[0])

  return {
    type: 'FROM',
    table: tableRef
  }
}

/**
 * Extract table reference
 */
function extractTableRef(cst: any): TableRef {
  // For now, just get the table name (single identifier)
  const tableName = cst.children.Identifier[0].image

  return {
    type: 'TABLE',
    name: tableName
  }
}

/**
 * Extract WHERE clause
 */
function extractWhereClause(cst: any): Expression | undefined {
  if (!cst.children.orExpression || !cst.children.orExpression[0]) {
    return undefined
  }
  return extractOrExpression(cst.children.orExpression[0])
}

/**
 * Extract OR expression
 */
function extractOrExpression(cst: any): Expression {
  const andExpressions = cst.children.andExpression
  if (andExpressions.length === 1) {
    // No OR, just return the AND expression
    return extractAndExpression(andExpressions[0])
  }

  // Multiple AND expressions joined by OR
  let result: Expression = extractAndExpression(andExpressions[0])
  for (let i = 1; i < andExpressions.length; i++) {
    result = {
      type: 'BINARY_OP',
      operator: 'OR',
      left: result,
      right: extractAndExpression(andExpressions[i])
    }
  }
  return result
}

/**
 * Extract AND expression
 */
function extractAndExpression(cst: any): Expression {
  const comparisonExpressions = cst.children.comparisonExpression
  if (comparisonExpressions.length === 1) {
    // No AND, just return the comparison
    return extractComparisonExpression(comparisonExpressions[0])
  }

  // Multiple comparisons joined by AND
  let result: Expression = extractComparisonExpression(comparisonExpressions[0])
  for (let i = 1; i < comparisonExpressions.length; i++) {
    result = {
      type: 'BINARY_OP',
      operator: 'AND',
      left: result,
      right: extractComparisonExpression(comparisonExpressions[i])
    }
  }
  return result
}

/**
 * Extract comparison expression (=, !=, <, >, etc.)
 */
function extractComparisonExpression(cst: any): Expression {
  const primaryValues = cst.children.primaryValue
  if (primaryValues.length === 1) {
    // No comparison, just a primary value
    return extractPrimaryValue(primaryValues[0])
  }

  // Binary comparison
  const left = extractPrimaryValue(primaryValues[0])
  const right = extractPrimaryValue(primaryValues[1])

  let operator: BinaryOp['operator'] = '='
  if (cst.children.Equals) operator = '='
  else if (cst.children.NotEquals) operator = '!='
  else if (cst.children.LessThan) operator = '<'
  else if (cst.children.GreaterThan) operator = '>'
  else if (cst.children.LessThanOrEqual) operator = '<='
  else if (cst.children.GreaterThanOrEqual) operator = '>='
  else if (cst.children.In) operator = 'IN'

  return {
    type: 'BINARY_OP',
    operator,
    left,
    right
  }
}

/**
 * Extract primary value (literal, column, parameter, parenthesized expression)
 */
function extractPrimaryValue(cst: any): Expression {
  // String literal
  if (cst.children.StringLiteral) {
    const value = cst.children.StringLiteral[0].image
    // Remove quotes
    const unquoted = value.slice(1, -1)
    return {
      type: 'LITERAL',
      valueType: 'STRING',
      value: unquoted
    }
  }

  // Number literal
  if (cst.children.NumberLiteral) {
    return {
      type: 'LITERAL',
      valueType: 'NUMBER',
      value: parseFloat(cst.children.NumberLiteral[0].image)
    }
  }

  // NULL
  if (cst.children.Null) {
    return {
      type: 'LITERAL',
      valueType: 'NULL',
      value: null
    }
  }

  // Parameter: {param:Type}
  if (cst.children.parameter) {
    return extractParameter(cst.children.parameter[0])
  }

  // Parenthesized expression
  if (cst.children.LParen && cst.children.orExpression) {
    return extractOrExpression(cst.children.orExpression[0])
  }

  // Simple column
  if (cst.children.simpleColumn) {
    const simpleCol = cst.children.simpleColumn[0]
    const identifiers = simpleCol.children.Identifier

    if (identifiers.length === 1) {
      return {
        type: 'COLUMN',
        name: identifiers[0].image
      }
    } else {
      return {
        type: 'COLUMN',
        table: identifiers[0].image,
        name: identifiers[1].image
      }
    }
  }

  throw new Error('Unknown primary value type')
}

/**
 * Extract parameter: {param:Type}
 */
function extractParameter(cst: any): ParameterRef {
  // Get parameter name
  const paramName = cst.children.Identifier[0].image

  // Get data type (it's the type node)
  const typeNode = cst.children.type[0]
  const dataTypeString = extractTypeAsString(typeNode)

  return {
    type: 'PARAMETER',
    name: paramName,
    dataType: dataTypeString
  }
}

/**
 * Extract type as a string (e.g., "Array(String)")
 */
function extractTypeAsString(typeNode: any): string {
  // Just flatten all tokens in the type and join them
  const tokens = flattenTokens(typeNode)
  return tokens.map(t => t.image).join('')
}