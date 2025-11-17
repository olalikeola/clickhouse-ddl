export interface DDLColumn {
    name: string
    type: string
    nullable: boolean
    default?: string
    comment?: string
    materialized?: string 
    alias?: string        
  }
  
  export interface DDLTable {
    name: string
    engine?: string
    engineArgs?: string
    columns: DDLColumn[]
    orderBy?: string[]
    partitionBy?: string[]
    settings?: Record<string, string>  // Engine settings
  }

  // AST node types for SELECT queries
  export interface CTEDefinition {
    type: 'CTE'
    name: string
    query: SelectStatement
  }

  export interface SelectStatement {
    type: 'SELECT'
    with?: CTEDefinition[]  // NEW: WITH clause (CTEs)
    columns: SelectColumn[]
    from?: FromClause
    where?: Expression
  }

  export interface SelectColumn {
    expression: Expression
    alias?: string
  }

  export interface OrderByItem {
    expression: Expression
    direction?: 'ASC' | 'DESC'
  }

  export interface FromClause {
    type: 'FROM'
    table: TableRef | SubqueryRef
    arrayJoin?: ArrayJoinClause
  }

  export interface TableRef {
    type: 'TABLE'
    database?: string
    name: string
    alias?: string
  }

  export interface SubqueryRef {
    type: 'SUBQUERY_TABLE'
    query: SelectStatement
    alias?: string
  }

  export interface ArrayJoinClause {
    type: 'ARRAY_JOIN'
    array: Expression
    alias?: string
  }

  export interface ColumnRef {
    type: 'COLUMN'
    table?: string
    name: string
  }

  export interface BinaryOp {
    type: 'BINARY_OP'
    operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'IN' | 'NOT IN' | 'LIKE' | 'NOT LIKE' | 'AND' | 'OR' | 'IS NULL' | 'IS NOT NULL' | '+' | '-' | '*' | '/' | '%'
    left: Expression
    right: Expression
  }

  export interface ParameterRef {
    type: 'PARAMETER'
    name: string
    dataType?: string  // e.g., "Array(String)"
  }

  export interface Literal {
    type: 'LITERAL'
    valueType: 'NUMBER' | 'STRING' | 'NULL' | 'BOOLEAN'
    value: string | number | null | boolean
  }

  export interface FunctionCall {
    type: 'FUNCTION_CALL'
    name: string
    args: Expression[]
  }

  export interface WindowFunction {
    type: 'WINDOW_FUNCTION'
    name: string
    args: Expression[]
    over: {
      partitionBy?: Expression[]
      orderBy?: OrderByItem[]
    }
  }

  export interface ArrayLiteral {
    type: 'ARRAY_LITERAL'
    elements: Expression[]
  }

  export interface TupleLiteral {
    type: 'TUPLE_LITERAL'
    elements: Expression[]
  }

  export interface Subquery {
    type: 'SUBQUERY'
    query: SelectStatement
  }

  export type Expression = ColumnRef | BinaryOp | ParameterRef | Literal | FunctionCall | WindowFunction | ArrayLiteral | TupleLiteral | Subquery

  export interface DDLView {
    name: string
    select: SelectStatement  // Required: Pure AST, no string fallback
  }

  export interface DDLMaterializedView {
    name: string
    toTable: string
    columns?: DDLColumn[]  // Optional: present in system.tables format
    selectQuery?: string   // Optional: may not be present in system.tables format
  }

  export interface DDLStatement {
    type: 'CREATE_TABLE' | 'CREATE_VIEW' | 'CREATE_MATERIALIZED_VIEW'
    table?: DDLTable
    view?: DDLView
    materializedView?: DDLMaterializedView
  }
  
  export interface SchemaDiff {
    addedColumns: DDLColumn[]
    removedColumns: DDLColumn[]
    modifiedColumns: Array<{
      name: string
      oldType: string
      newType: string
      oldNullable: boolean
      newNullable: boolean
    }>
    engineChanged?: {
      old: string
      new: string
    }
  }