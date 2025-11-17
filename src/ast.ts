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
    partitionBy?: string
    settings?: Record<string, string>  // Engine settings
  }

  // AST node types for SELECT queries
  export interface SelectStatement {
    type: 'SELECT'
    columns: SelectColumn[]
    from?: FromClause
    where?: Expression  // NEW: WHERE clause
  }

  export interface SelectColumn {
    expression: Expression
    alias?: string
  }

  export interface FromClause {
    type: 'FROM'
    table: TableRef
  }

  export interface TableRef {
    type: 'TABLE'
    database?: string
    name: string
    alias?: string
  }

  export interface ColumnRef {
    type: 'COLUMN'
    table?: string
    name: string
  }

  export interface BinaryOp {
    type: 'BINARY_OP'
    operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'IN' | 'LIKE' | 'AND' | 'OR'
    left: Expression
    right: Expression
  }

  export interface ParameterRef {
    type: 'PARAMETER'
    name: string
    dataType?: string  // e.g., "Array(String)"
  }

  export type Expression = ColumnRef | BinaryOp | ParameterRef
  // We'll add more expression types later (Literal, FunctionCall, etc.)

  export interface DDLView {
    name: string
    selectQuery: string  // Keep for backward compatibility
    select?: SelectStatement  // NEW: Structured AST
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