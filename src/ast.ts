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
  
  export interface DDLStatement {
    type: 'CREATE_TABLE'
    table: DDLTable
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