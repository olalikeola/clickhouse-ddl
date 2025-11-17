/**
 * Simple recursive descent parser for ClickHouse DDL
 * No Chevrotain, just straightforward parsing
 */

import { Lexer, Token, TokenType } from './lexer.js'
import type {
  DDLStatement, DDLTable, DDLColumn, DDLView, DDLMaterializedView,
  SelectStatement, SelectColumn, Expression, FromClause, TableRef, SubqueryRef, ArrayJoinClause, JoinClause,
  ColumnRef, BinaryOp, Literal, FunctionCall, WindowFunction,
  OrderByItem, CTEDefinition, ParameterRef, ArrayLiteral, TupleLiteral, Subquery, CastExpression
} from './ast.js'

class ParseError extends Error {
  constructor(message: string, public token?: Token) {
    super(message)
    this.name = 'ParseError'
  }
}

export class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): DDLStatement {
    this.expect('CREATE')

    // OR REPLACE
    if (this.check('OR_KW')) {
      this.advance()
      this.expect('REPLACE')
    }

    if (this.check('TABLE')) {
      return this.parseCreateTable()
    } else if (this.check('MATERIALIZED')) {
      return this.parseCreateMaterializedView()
    } else if (this.check('VIEW')) {
      return this.parseCreateView()
    }

    throw new ParseError(`Expected TABLE, VIEW, or MATERIALIZED after CREATE`, this.current())
  }

  // ========== CREATE TABLE ==========

  private parseCreateTable(): DDLStatement {
    this.expect('TABLE')

    // IF NOT EXISTS
    if (this.check('IF')) {
      this.advance()
      this.expect('NOT')
      this.expect('EXISTS')
    }

    let name = this.expectIdentifierOrKeyword()

    // Handle schema-qualified names (database.table)
    if (this.check('DOT')) {
      this.advance()
      const tableName = this.expectIdentifierOrKeyword()
      name = `${name}.${tableName}`
    }

    // ON CLUSTER
    if (this.check('ON')) {
      this.advance()
      this.expect('CLUSTER')
      this.expectIdentifier()
    }

    this.expect('LPAREN')
    const columns = this.parseColumnList()
    this.expect('RPAREN')

    let engine: string | undefined
    let engineArgs: string | undefined
    let orderBy: string[] | undefined
    let partitionBy: string[] | undefined
    let settings: Record<string, string> | undefined

    // ENGINE
    if (this.check('ENGINE')) {
      this.advance()
      this.expect('EQ')
      engine = this.expectIdentifier()

      if (this.check('LPAREN')) {
        engineArgs = this.captureParenthesized()
      }
    }

    // PARTITION BY (comes before ORDER BY in ClickHouse)
    if (this.check('PARTITION')) {
      this.advance()
      this.expect('BY')
      partitionBy = []

      // Check for optional parentheses
      const hasParens = this.match('LPAREN')

      do {
        // Always capture full expressions (including function calls like toYYYYMM(timestamp))
        partitionBy.push(this.captureUntilCommaOrKeyword())
      } while (this.match('COMMA'))

      if (hasParens) {
        this.expect('RPAREN')
      }
    }

    // ORDER BY
    if (this.check('ORDER')) {
      this.advance()
      this.expect('BY')
      orderBy = []

      // Check for optional parentheses
      const hasParens = this.match('LPAREN')

      do {
        // Always capture full expressions
        orderBy.push(this.captureUntilCommaOrKeyword())
      } while (this.match('COMMA'))

      if (hasParens) {
        this.expect('RPAREN')
      }
    }

    // SETTINGS
    if (this.check('SETTINGS')) {
      this.advance()
      settings = this.parseSettings()
    }

    const table: DDLTable = {
      name,
      engine,
      engineArgs,
      columns,
      orderBy,
      partitionBy,
      settings
    }

    return { type: 'CREATE_TABLE', table }
  }

  private parseColumnList(): DDLColumn[] {
    const columns: DDLColumn[] = []

    while (!this.check('RPAREN')) {
      const name = this.expectIdentifier()

      // Check if this is an ALIAS or typeless MATERIALIZED column
      // ALIAS columns don't have types: column_name ALIAS expression
      // MATERIALIZED can be with or without type: column_name [Type] MATERIALIZED expression
      let type = ''
      if (this.check('ALIAS')) {
        // ALIAS column - no type, inferred from expression
        type = ''
      } else if (this.check('MATERIALIZED')) {
        // MATERIALIZED without type
        type = ''
      } else {
        // Regular column with type
        type = this.parseType()
      }

      let nullable = true
      let defaultValue: string | undefined
      let materialized: string | undefined
      let alias: string | undefined
      let comment: string | undefined

      // Column modifiers
      while (true) {
        if (this.check('NOT')) {
          this.advance()
          this.expect('NULL')
          nullable = false
        } else if (this.check('NULL')) {
          // NULL keyword (equivalent to Nullable)
          this.advance()
          nullable = true
        } else if (this.check('NULLABLE')) {
          this.advance()
          nullable = true
        } else if (this.check('DEFAULT')) {
          this.advance()
          defaultValue = this.captureExpression()
        } else if (this.check('MATERIALIZED')) {
          this.advance()
          materialized = this.captureExpression()
        } else if (this.check('ALIAS')) {
          this.advance()
          alias = this.captureExpression()
        } else if (this.check('COMMENT')) {
          this.advance()
          comment = this.expect('STRING').value
        } else {
          break
        }
      }

      columns.push({
        name,
        type,
        nullable,
        default: defaultValue,
        materialized,
        alias,
        comment
      })

      if (!this.match('COMMA')) break
    }

    return columns
  }

  private parseType(): string {
    // Handle special type keywords that are also reserved words
    let type = ''

    if (this.check('NULLABLE')) {
      // Nullable(Type) - unwrap to just Type
      this.advance()
      this.expect('LPAREN')
      type = this.parseType()  // Recursive call for inner type
      this.expect('RPAREN')
      return type
    } else {
      type = this.current().value
      this.advance()
    }

    // Handle parameterized types like Array(String), Map(String, Int32)
    if (this.check('LPAREN')) {
      type += this.captureParenthesized()
    }

    return type
  }

  private parseSettings(): Record<string, string> {
    const settings: Record<string, string> = {}

    do {
      const key = this.expectIdentifier()
      this.expect('EQ')
      const value = this.current().value
      this.advance()
      settings[key] = value
    } while (this.match('COMMA'))

    return settings
  }

  // ========== CREATE VIEW ==========

  private parseCreateView(): DDLStatement {
    this.expect('VIEW')

    // IF NOT EXISTS
    if (this.check('IF')) {
      this.advance()
      this.expect('NOT')
      this.expect('EXISTS')
    }

    let name = this.expectIdentifier()

    // Handle schema-qualified names (database.view)
    if (this.check('DOT')) {
      this.advance()
      const viewName = this.expectIdentifier()
      name = `${name}.${viewName}`
    }

    // ON CLUSTER
    if (this.check('ON')) {
      this.advance()
      this.expect('CLUSTER')
      this.expectIdentifier()
    }

    this.expect('AS')

    const select = this.parseSelect()

    const view: DDLView = { name, select }

    return { type: 'CREATE_VIEW', view }
  }

  // ========== CREATE MATERIALIZED VIEW ==========

  private parseCreateMaterializedView(): DDLStatement {
    this.expect('MATERIALIZED')
    this.expect('VIEW')

    // IF NOT EXISTS
    if (this.check('IF')) {
      this.advance()
      this.expect('NOT')
      this.expect('EXISTS')
    }

    let name = this.expectIdentifier()

    // Handle schema-qualified names (database.view)
    if (this.check('DOT')) {
      this.advance()
      const viewName = this.expectIdentifier()
      name = `${name}.${viewName}`
    }

    // ON CLUSTER
    if (this.check('ON')) {
      this.advance()
      this.expect('CLUSTER')
      this.expectIdentifier()
    }

    this.expect('TO')
    let toTable = this.expectIdentifier()

    // Handle schema-qualified TO table
    if (this.check('DOT')) {
      this.advance()
      const tableName = this.expectIdentifier()
      toTable = `${toTable}.${tableName}`
    }

    // Optional column definitions (system.tables format)
    let columns: DDLColumn[] | undefined
    if (this.check('LPAREN')) {
      this.advance()
      columns = this.parseColumnList()
      this.expect('RPAREN')
    }

    // Optional AS SELECT clause
    let selectQuery: string | undefined
    if (this.check('AS')) {
      this.expect('AS')
      selectQuery = this.captureRemaining()
    }

    const materializedView: DDLMaterializedView = {
      name,
      toTable,
      columns,
      selectQuery
    }

    return { type: 'CREATE_MATERIALIZED_VIEW', materializedView }
  }

  // ========== SELECT STATEMENT ==========

  private parseSelect(): SelectStatement {
    const with_ = this.parseWithClause()

    this.expect('SELECT')

    const columns = this.parseSelectList()

    let from: FromClause | undefined
    if (this.check('FROM')) {
      from = this.parseFromClause()
    }

    let where: Expression | undefined
    if (this.check('WHERE')) {
      where = this.parseWhereClause()
    }

    // Check for UNION ALL (or just UNION)
    const unions: SelectStatement[] = []
    while (this.check('UNION')) {
      this.advance() // consume UNION
      this.match('ALL') // optional ALL keyword

      // Parse the next SELECT (which may have its own WITH clause)
      unions.push(this.parseSelect())
    }

    return {
      type: 'SELECT',
      with: with_,
      columns,
      from,
      where,
      unions: unions.length > 0 ? unions : undefined
    }
  }

  private parseWithClause(): CTEDefinition[] | undefined {
    if (!this.check('WITH')) return undefined

    this.advance()

    const ctes: CTEDefinition[] = []

    do {
      const name = this.expectIdentifier()
      this.expect('AS')
      this.expect('LPAREN')
      const query = this.parseSelect()
      this.expect('RPAREN')

      ctes.push({
        type: 'CTE',
        name,
        query
      })
    } while (this.match('COMMA'))

    return ctes
  }

  private parseSelectList(): SelectColumn[] {
    const columns: SelectColumn[] = []

    do {
      columns.push(this.parseSelectColumn())
    } while (this.match('COMMA'))

    return columns
  }

  private parseSelectColumn(): SelectColumn {
    // SELECT *
    if (this.check('STAR')) {
      this.advance()
      return {
        expression: { type: 'COLUMN', name: '*' }
      }
    }

    const expression = this.parseExpression()

    // Optional alias
    let alias: string | undefined
    if (this.check('AS')) {
      this.advance()
      alias = this.expectIdentifier()
    } else if (this.check('IDENTIFIER') && !this.isReservedKeyword(this.current().value)) {
      alias = this.expectIdentifier()
    }

    return { expression, alias }
  }

  // ========== EXPRESSIONS ==========

  private parseExpression(): Expression {
    return this.parseOrExpression()
  }

  private parseOrExpression(): Expression {
    let left = this.parseAndExpression()

    while (this.check('OR_KW')) {
      this.advance()
      const right = this.parseAndExpression()
      left = {
        type: 'BINARY_OP',
        operator: 'OR',
        left,
        right
      }
    }

    return left
  }

  private parseAndExpression(): Expression {
    let left = this.parseComparisonExpression()

    while (this.check('AND')) {
      this.advance()
      const right = this.parseComparisonExpression()
      left = {
        type: 'BINARY_OP',
        operator: 'AND',
        left,
        right
      }
    }

    return left
  }

  private parseComparisonExpression(): Expression {
    let left = this.parseAdditiveExpression()

    // Handle IS NULL / IS NOT NULL
    if (this.check('IS')) {
      this.advance()
      const isNot = this.match('NOT')
      this.expect('NULL')

      const operator: BinaryOp['operator'] = isNot ? 'IS NOT NULL' : 'IS NULL'
      const right: Literal = {
        type: 'LITERAL',
        valueType: 'NULL',
        value: null
      }

      return {
        type: 'BINARY_OP',
        operator,
        left,
        right
      }
    }

    // Handle NOT IN, NOT LIKE, etc.
    let isNot = false
    if (this.check('NOT')) {
      const nextToken = this.peek()
      if (nextToken && (nextToken.type === 'IN' || nextToken.type === 'LIKE')) {
        isNot = true
        this.advance() // consume NOT
      }
    }

    const operators: TokenType[] = ['EQ', 'NEQ', 'NEQ2', 'LT', 'GT', 'LTE', 'GTE', 'IN', 'LIKE']
    const current = this.current().type

    if (operators.includes(current)) {
      const opMap: Partial<Record<TokenType, BinaryOp['operator']>> = {
        'EQ': '=',
        'NEQ': '!=',
        'NEQ2': '!=',
        'LT': '<',
        'GT': '>',
        'LTE': '<=',
        'GTE': '>=',
        'IN': 'IN',
        'LIKE': 'LIKE'
      }
      let operator = opMap[current]!

      // Modify operator if NOT was present
      if (isNot) {
        if (operator === 'IN') operator = 'NOT IN' as any
        if (operator === 'LIKE') operator = 'NOT LIKE' as any
      }

      this.advance()

      // Special handling for IN/NOT IN operator with array literals or subqueries
      let right: Expression
      if ((operator === 'IN' || operator === 'NOT IN') && this.check('LPAREN')) {
        const checkpoint = this.pos
        this.advance() // consume LPAREN

        // Check if this is a SELECT (subquery)
        if (this.check('SELECT')) {
          const query = this.parseSelect()
          this.expect('RPAREN')
          right = {
            type: 'SUBQUERY',
            query
          }
        } else {
          // Try to parse as array literal (e.g., ('a', 'b', 'c'))
          const elements: Expression[] = []
          while (!this.check('RPAREN') && !this.check('EOF')) {
            elements.push(this.parsePrimaryExpression())
            if (!this.match('COMMA')) break
          }

          if (this.check('RPAREN')) {
            this.advance() // consume RPAREN
            right = {
              type: 'ARRAY_LITERAL',
              elements
            }
          } else {
            // Not an array literal, rewind and parse normally
            this.pos = checkpoint
            right = this.parseAdditiveExpression()
          }
        }
      } else {
        right = this.parseAdditiveExpression()
      }

      return {
        type: 'BINARY_OP',
        operator: operator as any,
        left,
        right
      }
    }

    return left
  }

  private parseAdditiveExpression(): Expression {
    let left = this.parseMultiplicativeExpression()

    while (this.check('PLUS') || this.check('MINUS')) {
      const operator = this.current().type === 'PLUS' ? '+' : '-'
      this.advance()
      const right = this.parseMultiplicativeExpression()
      left = {
        type: 'BINARY_OP',
        operator: operator as any,
        left,
        right
      }
    }

    return left
  }

  private parseMultiplicativeExpression(): Expression {
    let left = this.parsePrimaryExpression()

    while (this.check('STAR') || this.check('SLASH') || this.check('PERCENT')) {
      const opMap: Record<string, string> = { 'STAR': '*', 'SLASH': '/', 'PERCENT': '%' }
      const operator = opMap[this.current().type]
      this.advance()
      const right = this.parsePrimaryExpression()
      left = {
        type: 'BINARY_OP',
        operator: operator as any,
        left,
        right
      }
    }

    return left
  }

  private parsePrimaryExpression(): Expression {
    // Parenthesized expression or tuple literal
    if (this.check('LPAREN')) {
      this.advance() // consume LPAREN

      // Check if this is a SELECT (subquery)
      if (this.check('SELECT')) {
        const query = this.parseSelect()
        this.expect('RPAREN')
        return {
          type: 'SUBQUERY',
          query
        }
      }

      // Try to parse as tuple literal or parenthesized expression
      const firstExpr = this.parseOrExpression()

      // If we see a comma, it's a tuple literal
      if (this.check('COMMA')) {
        const elements: Expression[] = [firstExpr]
        while (this.match('COMMA')) {
          elements.push(this.parseOrExpression())
        }
        this.expect('RPAREN')
        return {
          type: 'TUPLE_LITERAL',
          elements
        }
      }

      // Single parenthesized expression
      this.expect('RPAREN')
      return firstExpr
    }

    // CAST expression
    if (this.check('CAST')) {
      return this.parseCast()
    }

    // IF function (treat as function even though it's a keyword)
    if (this.check('IF') && this.peek() && this.peek()!.type === 'LPAREN') {
      const name = this.current().value
      this.advance() // consume 'if'
      this.expect('LPAREN')
      const args: Expression[] = []
      while (!this.check('RPAREN')) {
        args.push(this.parseOrExpression())
        if (!this.check('RPAREN')) {
          this.expect('COMMA')
        }
      }
      this.expect('RPAREN')
      return { type: 'FUNCTION_CALL', name, args }
    }

    // Function call or window function
    if (this.check('IDENTIFIER') && this.peek() && this.peek()!.type === 'LPAREN') {
      return this.parseFunctionOrWindow()
    }

    // Literals
    if (this.check('NUMBER')) {
      const value = parseFloat(this.current().value)
      this.advance()
      return { type: 'LITERAL', valueType: 'NUMBER', value }
    }

    if (this.check('STRING')) {
      const value = this.current().value
      this.advance()
      return { type: 'LITERAL', valueType: 'STRING', value }
    }

    if (this.check('NULL')) {
      this.advance()
      return { type: 'LITERAL', valueType: 'NULL', value: null }
    }

    if (this.check('TRUE')) {
      this.advance()
      return { type: 'LITERAL', valueType: 'BOOLEAN', value: true }
    }

    if (this.check('FALSE')) {
      this.advance()
      return { type: 'LITERAL', valueType: 'BOOLEAN', value: false }
    }

    // Parameter {name:Type}
    if (this.check('PARAMETER')) {
      const param = this.current().value
      this.advance()
      // Use [\s\S] instead of . to match newlines
      const match = param.match(/^\{([^:]+):([\s\S]+)\}$/)
      if (match) {
        return {
          type: 'PARAMETER',
          name: match[1],
          dataType: match[2]
        }
      }
    }

    // Array literal [1, 2, 3]
    if (this.check('LBRACKET')) {
      return this.parseArrayLiteral()
    }

    // INTERVAL expression: INTERVAL 30 DAYS
    if (this.check('INTERVAL')) {
      return this.parseIntervalExpression()
    }

    // Column reference
    return this.parseColumnRef()
  }

  private parseIntervalExpression(): FunctionCall {
    this.expect('INTERVAL')
    // Parse just the numeric value (don't parse full expression)
    const value = this.parsePrimaryExpression()
    // The unit (DAYS, HOURS, etc.) is parsed as an identifier
    const unit = this.check('IDENTIFIER') ? this.expectIdentifier() : undefined

    return {
      type: 'FUNCTION_CALL',
      name: 'INTERVAL',
      args: unit
        ? [value, { type: 'LITERAL', valueType: 'STRING', value: unit }]
        : [value]
    }
  }

  private parseCast(): CastExpression {
    this.expect('CAST')
    this.expect('LPAREN')
    const expression = this.parseOrExpression()
    this.expect('COMMA')
    const targetType = this.parseType()
    this.expect('RPAREN')

    return {
      type: 'CAST',
      expression,
      targetType
    }
  }

  private parseFunctionOrWindow(): FunctionCall | WindowFunction {
    const name = this.expectIdentifier()
    this.expect('LPAREN')

    const args: Expression[] = []

    // Handle COUNT(*), SUM(*), etc.
    if (this.check('STAR')) {
      this.advance()
      args.push({ type: 'COLUMN', name: '*' })
    } else if (!this.check('RPAREN')) {
      // Parse arguments - any expressions, not just simple columns
      do {
        // Check for lambda function: identifier -> expression or (params) -> expression
        if (this.isLambdaFunction()) {
          args.push(this.parseLambdaFunction())
        } else {
          args.push(this.parseOrExpression())
        }
      } while (this.match('COMMA'))
    }

    this.expect('RPAREN')

    // Check for OVER clause (window function)
    if (this.check('OVER')) {
      return this.parseWindowFunction(name, args)
    }

    return {
      type: 'FUNCTION_CALL',
      name,
      args
    }
  }

  private parseWindowFunction(name: string, args: Expression[]): WindowFunction {
    this.expect('OVER')
    this.expect('LPAREN')

    let partitionBy: Expression[] | undefined
    if (this.check('PARTITION')) {
      this.advance()
      this.expect('BY')
      partitionBy = []

      // Check for optional parentheses
      const hasParens = this.match('LPAREN')

      do {
        partitionBy.push(this.parseOrExpression())
      } while (this.match('COMMA'))

      if (hasParens) {
        this.expect('RPAREN')
      }
    }

    let orderBy: OrderByItem[] | undefined
    if (this.check('ORDER')) {
      this.advance()
      this.expect('BY')
      orderBy = []

      // Check for optional parentheses
      const hasParens = this.match('LPAREN')

      do {
        const expression = this.parseOrExpression()
        let direction: 'ASC' | 'DESC' | undefined
        if (this.check('ASC')) {
          this.advance()
          direction = 'ASC'
        } else if (this.check('DESC')) {
          this.advance()
          direction = 'DESC'
        }
        orderBy.push({ expression, direction })
      } while (this.match('COMMA'))

      if (hasParens) {
        this.expect('RPAREN')
      }
    }

    this.expect('RPAREN')

    return {
      type: 'WINDOW_FUNCTION',
      name,
      args,
      over: { partitionBy, orderBy }
    }
  }

  private parseArrayLiteral(): ArrayLiteral {
    this.expect('LBRACKET')
    const elements: Expression[] = []

    if (!this.check('RBRACKET')) {
      do {
        elements.push(this.parseOrExpression())
      } while (this.match('COMMA'))
    }

    this.expect('RBRACKET')
    return { type: 'ARRAY_LITERAL', elements }
  }

  private parseColumnRef(): ColumnRef {
    const name = this.expectIdentifier()

    // Qualified name: table.column, tuple element access (t.1), or qualified wildcard (t.*)
    if (this.check('DOT')) {
      this.advance()

      // Handle tuple element access (e.g., t.1, t.2)
      if (this.check('NUMBER')) {
        const tupleIndex = this.current().value
        this.advance()
        return { type: 'COLUMN', table: name, name: tupleIndex.toString() }
      }

      // Handle qualified wildcard (e.g., t.*)
      if (this.check('STAR')) {
        this.advance()
        return { type: 'COLUMN', table: name, name: '*' }
      }

      // Regular column name
      const columnName = this.expectIdentifier()
      return { type: 'COLUMN', table: name, name: columnName }
    }

    return { type: 'COLUMN', name }
  }

  private parseFromClause(): FromClause {
    this.expect('FROM')
    const table = this.parseTableRef()

    // Check for ARRAY JOIN
    let arrayJoin: ArrayJoinClause | undefined
    if (this.check('ARRAY')) {
      this.advance()
      this.expect('JOIN')

      const array = this.parseOrExpression()

      let alias: string | undefined
      if (this.check('AS')) {
        this.advance()
        alias = this.expectIdentifier()
      } else if (this.check('IDENTIFIER') && !this.isReservedKeyword(this.current().value)) {
        alias = this.expectIdentifier()
      }

      arrayJoin = {
        type: 'ARRAY_JOIN',
        array,
        alias
      }
    }

    // Check for JOINs (INNER, LEFT, RIGHT, FULL, CROSS)
    const joins: JoinClause[] = []
    while (this.check('INNER') || this.check('LEFT') || this.check('RIGHT') || this.check('FULL') || this.check('CROSS')) {
      const joinType = this.current().type as 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
      this.advance() // consume join type

      // Optional OUTER keyword
      const outer = this.match('OUTER')

      this.expect('JOIN')

      const joinTable = this.parseTableRef()

      // ON clause (optional for CROSS JOIN)
      let on: Expression | undefined
      if (this.check('ON')) {
        this.advance()
        on = this.parseOrExpression()
      }

      joins.push({
        type: joinType,
        outer,
        table: joinTable,
        on
      })
    }

    return { type: 'FROM', table, arrayJoin, joins: joins.length > 0 ? joins : undefined }
  }

  private parseTableRef(): TableRef | SubqueryRef {
    // Check for subquery: (SELECT ...)
    if (this.check('LPAREN')) {
      this.advance() // consume LPAREN
      const query = this.parseSelect()
      this.expect('RPAREN')

      // Optional alias
      let alias: string | undefined
      if (this.check('AS')) {
        this.advance()
        alias = this.expectIdentifier()
      } else if (this.check('IDENTIFIER') && !this.isReservedKeyword(this.current().value)) {
        alias = this.expectIdentifier()
      }

      return {
        type: 'SUBQUERY_TABLE',
        query,
        alias
      }
    }

    // Regular table reference
    const name = this.expectIdentifier()

    let database: string | undefined
    let tableName = name

    // Qualified name: database.table
    if (this.check('DOT')) {
      this.advance()
      database = name
      tableName = this.expectIdentifier()
    }

    // Optional alias
    let alias: string | undefined
    if (this.check('AS')) {
      this.advance()
      alias = this.expectIdentifier()
    } else if (this.check('IDENTIFIER') && !this.isReservedKeyword(this.current().value)) {
      alias = this.expectIdentifier()
    }

    return {
      type: 'TABLE',
      database,
      name: tableName,
      alias
    }
  }

  private parseWhereClause(): Expression {
    this.expect('WHERE')
    return this.parseOrExpression()
  }

  // ========== LAMBDA FUNCTIONS ==========

  private isLambdaFunction(): boolean {
    // Lambda patterns:
    // 1. identifier -> expression (e.g., x -> x + 1)
    // 2. (identifier, identifier, ...) -> expression

    const savePos = this.pos

    try {
      // Check for parenthesized parameter list
      if (this.check('LPAREN')) {
        this.advance()
        // Skip identifiers and commas
        while (this.check('IDENTIFIER') || this.check('COMMA')) {
          this.advance()
        }
        if (!this.check('RPAREN')) {
          return false
        }
        this.advance()
        return this.check('ARROW')
      }

      // Check for single identifier followed by arrow
      if (this.check('IDENTIFIER')) {
        this.advance()
        return this.check('ARROW')
      }

      return false
    } finally {
      // Restore position
      this.pos = savePos
    }
  }

  private parseLambdaFunction(): Literal {
    // Capture lambda as a string literal for simplicity
    let lambda = ''

    // Parse parameters
    if (this.check('LPAREN')) {
      lambda += '('
      this.advance()
      while (!this.check('RPAREN')) {
        lambda += this.current().value
        this.advance()
      }
      lambda += ')'
      this.advance()
    } else {
      lambda += this.current().value
      this.advance()
    }

    // Parse arrow
    lambda += ' -> '
    this.expect('ARROW')

    // Parse body - capture until comma or closing paren
    let depth = 0
    while (this.pos < this.tokens.length) {
      const token = this.current()

      if (token.type === 'LPAREN') depth++
      if (token.type === 'RPAREN') {
        if (depth === 0) break
        depth--
      }
      if (depth === 0 && token.type === 'COMMA') break

      lambda += token.value
      this.advance()
    }

    return {
      type: 'LITERAL',
      valueType: 'STRING',
      value: lambda.trim()
    }
  }

  // ========== UTILITY METHODS ==========

  private captureParenthesized(): string {
    let depth = 0
    let result = ''
    let prevToken: Token | null = null

    while (this.pos < this.tokens.length) {
      const token = this.current()

      if (token.type === 'LPAREN') {
        depth++
        result += token.value
        this.advance()
        prevToken = token
      } else if (token.type === 'RPAREN') {
        depth--
        result += token.value
        this.advance()
        prevToken = token
        if (depth === 0) break
      } else {
        // Add space only between consecutive identifiers (like "key String" in Nested types)
        if (prevToken && prevToken.type === 'IDENTIFIER' && token.type === 'IDENTIFIER') {
          result += ' '
        }
        // Preserve quotes around string literals
        if (token.type === 'STRING') {
          result += `'${token.value}'`
        } else {
          result += token.value
        }
        this.advance()
        prevToken = token
      }
    }

    return result
  }

  private captureExpression(): string {
    let depth = 0
    let expr = ''
    let prevToken: Token | null = null

    while (this.pos < this.tokens.length) {
      const token = this.current()

      if (token.type === 'LPAREN') depth++
      if (token.type === 'RPAREN') {
        if (depth === 0) break
        depth--
      }
      if (depth === 0 && token.type === 'COMMA') break

      // Add space before token based on context
      if (prevToken && this.needsSpaceBetween(prevToken, token)) {
        expr += ' '
      }

      // Preserve quotes around string literals
      if (token.type === 'STRING') {
        expr += `'${token.value}'`
      } else {
        expr += token.value
      }

      prevToken = token
      this.advance()
    }

    return expr.trim()
  }

  private needsSpaceBetween(prev: Token, curr: Token): boolean {
    const prevType = prev.type
    const currType = curr.type

    // No space after opening parenthesis or before closing parenthesis
    if (prevType === 'LPAREN' || currType === 'RPAREN') return false

    // No space around dots
    if (prevType === 'DOT' || currType === 'DOT') return false

    // No space after unary operators (+ or -)
    if ((prevType === 'PLUS' || prevType === 'MINUS') && currType === 'NUMBER') {
      return false
    }

    // Space after comma
    if (prevType === 'COMMA') return true

    // Space around binary operators (except when they follow LPAREN, already handled above)
    const operatorTypes: TokenType[] = ['PLUS', 'MINUS', 'STAR', 'SLASH', 'PERCENT', 'EQ', 'NEQ', 'NEQ2', 'LT', 'GT', 'LTE', 'GTE']
    if (operatorTypes.includes(prevType) || operatorTypes.includes(currType)) {
      return true
    }

    // Space between identifiers
    if (prevType === 'IDENTIFIER' && currType === 'IDENTIFIER') return true

    // Default: no space
    return false
  }

  private captureUntilCommaOrKeyword(): string {
    const keywords = ['SETTINGS', 'ORDER', 'PARTITION', 'EOF', 'SEMICOLON', 'RPAREN']
    let result = ''
    let depth = 0
    let prevToken: Token | null = null

    while (this.pos < this.tokens.length) {
      const token = this.current()

      // Stop at comma or keyword, but only at depth 0
      if (depth === 0) {
        if (token.type === 'COMMA' || keywords.includes(token.type)) break
      }

      // Track parenthesis depth AFTER checking whether to stop
      if (token.type === 'LPAREN') depth++

      // Add space if needed
      if (prevToken && this.needsSpaceBetween(prevToken, token)) {
        result += ' '
      }

      // Preserve quotes around strings
      if (token.type === 'STRING') {
        result += `'${token.value}'`
      } else {
        result += token.value
      }

      prevToken = token
      this.advance()

      // Decrement depth AFTER adding the closing paren to result
      if (token.type === 'RPAREN') depth--
    }

    return result.trim()
  }

  private captureUntilKeyword(): string {
    const keywords = ['SETTINGS', 'ORDER', 'EOF', 'SEMICOLON']
    let result = ''

    while (this.pos < this.tokens.length) {
      const token = this.current()
      if (keywords.includes(token.type)) break

      result += token.value
      this.advance()
    }

    return result.trim()
  }

  private captureRemaining(): string {
    let result = ''

    while (!this.check('EOF') && !this.check('SEMICOLON')) {
      result += this.current().value + ' '
      this.advance()
    }

    return result.trim()
  }

  private isReservedKeyword(word: string): boolean {
    const reserved = ['FROM', 'WHERE', 'AND', 'OR', 'IN', 'LIKE', 'AS', 'ORDER', 'BY', 'PARTITION', 'OVER', 'WITH', 'UNION', 'ALL', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'OUTER', 'JOIN', 'ON']
    return reserved.includes(word.toUpperCase())
  }

  // ========== TOKEN HELPERS ==========

  private current(): Token {
    return this.tokens[this.pos]
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos + 1]
  }

  private check(type: TokenType): boolean {
    return this.current().type === type
  }

  private advance(): Token {
    const token = this.current()
    this.pos++
    return token
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance()
      return true
    }
    return false
  }

  private expect(type: TokenType): Token {
    const token = this.current()
    if (token.type !== type) {
      throw new ParseError(
        `Expected ${type} but got ${token.type} ("${token.value}") at line ${token.line}, col ${token.col}`,
        token
      )
    }
    return this.advance()
  }

  private expectIdentifier(): string {
    const token = this.expect('IDENTIFIER')
    return token.value
  }

  // Allow reserved keywords to be used as identifiers (e.g., table name "table")
  private expectIdentifierOrKeyword(): string {
    const token = this.current()
    if (token.type === 'IDENTIFIER') {
      return this.advance().value
    }
    // Allow certain keywords as identifiers
    const allowedKeywords = ['TABLE', 'VIEW', 'DATABASE', 'COLUMN', 'INDEX', 'KEY', 'PARTITION', 'ORDER', 'BY']
    if (allowedKeywords.includes(token.type)) {
      return this.advance().value
    }
    throw new ParseError(
      `Expected IDENTIFIER but got ${token.type} ("${token.value}") at line ${token.line}, col ${token.col}`,
      token
    )
  }
}

// ========== PUBLIC API ==========

export function parseStatement(sql: string): DDLStatement {
  const lexer = new Lexer(sql)
  const tokens = lexer.tokenize()
  const parser = new Parser(tokens)
  return parser.parse()
}

export function parse(sql: string): DDLTable {
  const result = parseStatement(sql)
  if (result.type === 'CREATE_TABLE' && result.table) {
    return result.table
  }
  throw new Error('Expected CREATE TABLE statement')
}
