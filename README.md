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