# ClickHouse DDL Parser

A TypeScript parser for ClickHouse DDL (Data Definition Language) statements, built with Chevrotain. This parser can parse CREATE TABLE statements and extract structured information about tables, columns, and their properties.

## Features

- **CREATE TABLE statements** with IF NOT EXISTS support
- **All ClickHouse data types** (UInt8-64, Int8-64, Float32/64, String, Date, DateTime, etc.)
- **Complex data types** (Array, Tuple, Map, Nested, LowCardinality, Enum8/16, FixedString)
- **Column modifiers** (DEFAULT, MATERIALIZED, ALIAS, COMMENT)
- **Table options** (ENGINE, ORDER BY, PARTITION BY, SETTINGS)
- **Nullable types** support
- **TypeScript support** with full type definitions

## Installation

```bash
npm install clickhouse-ddl-parser
```

## API Reference

### `parse(sql: string): DDLTable`

Parses a ClickHouse CREATE TABLE DDL statement and returns a structured representation.

**Parameters:**
- `sql` (string): The DDL statement to parse

**Returns:**
- `DDLTable`: Parsed table structure

**Throws:**
- `Error`: If the SQL cannot be parsed or contains syntax errors

### AST Normalization for Schema Diffing

The parser provides utilities to normalize ASTs into canonical forms, enabling comparison of functionally equivalent SQL that uses different syntactic forms. This is particularly useful for schema diffing between databases.

#### Supported Normalizations

- **Tuple element access**: `t.1` → `tupleElement(t, 1)`
- **NULL checks**: `expr IS NULL` → `isNull(expr)`
- **NULL checks**: `expr IS NOT NULL` → `NOT isNull(expr)`

#### Functions

##### `compareViews(view1: DDLView, view2: DDLView): boolean`

Compares two CREATE VIEW statements for semantic equality after normalization.

```typescript
import { parseStatement, compareViews } from 'clickhouse-ddl-parser'

const sourceSQL = `CREATE VIEW test AS
  SELECT if(isNull(tupleElement(t, 1)), 'default', tupleElement(t, 1)) AS col
  FROM table1`

const remoteSQL = `CREATE VIEW test AS
  SELECT if((t.1) IS NULL, 'default', t.1) AS col
  FROM table1`

const sourceAST = parseStatement(sourceSQL)
const remoteAST = parseStatement(remoteSQL)

if (compareViews(sourceAST.view, remoteAST.view)) {
  console.log('Views are functionally equivalent')
}
```

##### `normalizeExpression(expr: Expression): Expression`

Normalizes a single expression to canonical form.

##### `normalizeSelect(select: SelectStatement): SelectStatement`

Normalizes an entire SELECT statement to canonical form.

##### `compareExpressions(expr1: Expression, expr2: Expression): boolean`

Compares two expressions for semantic equality after normalization.

##### `compareSelects(select1: SelectStatement, select2: SelectStatement): boolean`

Compares two SELECT statements for semantic equality after normalization.

### Types

```typescript
interface DDLTable {
  name: string
  engine?: string
  engineArgs?: string
  columns: DDLColumn[]
  orderBy?: string[]
  partitionBy?: string
  settings?: Record<string, string>
}

interface DDLColumn {
  name: string
  type: string
  nullable: boolean
  default?: string
  comment?: string
  materialized?: string
  alias?: string
}
```

ToDo: negative floating points
