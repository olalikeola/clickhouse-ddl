import { CstParser, IToken } from 'chevrotain'
import {
  Create,
  Table,
  If,
  Not,
  Exists,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Comma,
  Dot,
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
  Plus,
  Minus,
  Star,
  Slash,
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
  String,
  Date,
  DateTime,
  DateTime64,
  UUID,
  Bool,
  Array,
  Tuple,
  Map,
  Nested,
  LowCardinality,
  Enum8,
  Enum16,
  FixedString,
  ClickHouseLexer,
} from './tokens.js'
import { DDLTable, DDLColumn } from './ast.js'

class ClickHouseParser extends CstParser {
  constructor() {
    super(
      [
        Create,
        Table,
        If,
        Not,
        Exists,
        LParen,
        RParen,
        LBracket,
        RBracket,
        Comma,
        Dot,
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
        String,
        Date,
        DateTime,
        DateTime64,
        UUID,
        Bool,
        Array,
        Tuple,
        Map,
        Nested,
        LowCardinality,
        Enum8,
        Enum16,
        FixedString,
      ],
      { recoveryEnabled: true },
    )
    this.performSelfAnalysis()
  }

  public root = this.RULE('root', () => {
    this.SUBRULE(this.createTable)
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
      this.SUBRULE(this.orderByClause)
    })

    this.OPTION4(() => {
      this.SUBRULE(this.partitionByClause)
    })

    this.OPTION5(() => {
      this.SUBRULE(this.settingsClause)
    })
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
      })
      this.CONSUME(RParen) // engine end paren
    })
  })

  private orderByClause = this.RULE('orderByClause', () => {
    this.CONSUME(OrderBy)
    this.CONSUME(LParen)
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.CONSUME(Identifier) })
    this.CONSUME(RParen)
  })

  private partitionByClause = this.RULE('partitionByClause', () => {
    this.CONSUME(PartitionBy)
    this.SUBRULE(this.simpleExpression)
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
        { ALT: () => this.CONSUME(Plus) },
        { ALT: () => this.CONSUME(Minus) },
        { ALT: () => this.CONSUME(Star) },
        { ALT: () => this.CONSUME(Slash) },
      ])
      this.SUBRULE2(this.expressionTerm)
    })
  })

  private expressionTerm = this.RULE('expressionTerm', () => {
    this.OR([
      {
        // Regular identifier (with optional function call)
        ALT: () => {
          this.CONSUME(Identifier)
          this.OPTION(() => {
            // Function call
            this.CONSUME(LParen)
            this.OPTION2(() => {
              this.SUBRULE(this.simpleExpression)
              this.MANY(() => {
                this.CONSUME(Comma)
                this.SUBRULE2(this.simpleExpression)
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
              this.SUBRULE3(this.simpleExpression)
              this.MANY2(() => {
                this.CONSUME2(Comma)
                this.SUBRULE4(this.simpleExpression)
              })
            })
            this.CONSUME2(RParen)
          })
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
      { ALT: () => this.CONSUME(String) },
      { ALT: () => this.CONSUME(Date) },
      { ALT: () => this.CONSUME(DateTime) },
      { ALT: () => this.CONSUME(DateTime64) },
      { ALT: () => this.CONSUME(UUID) },
      { ALT: () => this.CONSUME(Bool) },
      { ALT: () => this.SUBRULE(this.arrayType) },
      { ALT: () => this.SUBRULE(this.tupleType) },
      { ALT: () => this.SUBRULE(this.mapType) },
      { ALT: () => this.SUBRULE(this.nestedType) },
      { ALT: () => this.SUBRULE(this.lowCardinalityType) },
      { ALT: () => this.SUBRULE(this.enumType) },
      { ALT: () => this.SUBRULE(this.fixedStringType) },
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

  private typeParams = this.RULE('typeParams', () => {
    this.CONSUME(LParen) // type start paren
    this.AT_LEAST_ONE_SEP({ SEP: Comma, DEF: () => this.SUBRULE(this.simpleExpression) })
    this.CONSUME(RParen) // type end paren
  })
}

const parser = new ClickHouseParser()

export function parse(sql: string): DDLTable {
  const lexResult = ClickHouseLexer.tokenize(sql)
  parser.input = lexResult.tokens
  const cst = parser.root()
  if (parser.errors.length > 0) {
    throw new Error('Parse errors: ' + JSON.stringify(parser.errors, null, 2))
  }

  // Enhanced CST -> AST transformer
  const create = (cst.children as any).createTable[0]
  
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

  // Simple types
  const typeTokenNames = [
    'UInt8', 'UInt16', 'UInt32', 'UInt64',
    'Int8', 'Int16', 'Int32', 'Int64',
    'Float32', 'Float64', 'String', 'Date', 'DateTime', 'DateTime64', 'UUID', 'Bool'
  ]

  for (const tokenName of typeTokenNames) {
    const token = findTokenOfType(typeNode, tokenName)
    if (token) {
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
      const isOperator = ['Plus', 'Minus', 'Star', 'Slash'].includes(token.tokenType.name)
      const prevIsOperator = ['Plus', 'Minus', 'Star', 'Slash'].includes(prevToken.tokenType.name)
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
        // Space around operators
        result += ' '
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