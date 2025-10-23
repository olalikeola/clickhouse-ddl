import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser'

describe('ClickHouse DDL Parser - Comprehensive Tests', () => {
  describe('Basic CREATE TABLE', () => {
    it('parses simple create table', () => {
      const sql = `CREATE TABLE IF NOT EXISTS users (
        id UInt64,
        name String DEFAULT 'anon'
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.name).toBe('users')
      expect(result.columns).toHaveLength(2)
      expect(result.engine).toBe('MergeTree')
    })

    it('parses table without IF NOT EXISTS', () => {
      const sql = `CREATE TABLE events (
        id UInt64,
        timestamp DateTime
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.name).toBe('events')
      expect(result.columns).toHaveLength(2)
    })
  })

  describe('Complex Data Types', () => {
    it('parses Array types', () => {
      const sql = `CREATE TABLE test (
        tags Array(String),
        numbers Array(UInt32)
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].type).toBe('Array(String)')
      expect(result.columns[1].type).toBe('Array(UInt32)')
    })

    it('parses Tuple types', () => {
      const sql = `CREATE TABLE test (
        coordinates Tuple(Float64, Float64),
        person Tuple(String, UInt32)
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].type).toBe('Tuple(Float64, Float64)')
      expect(result.columns[1].type).toBe('Tuple(String, UInt32)')
    })

    it('parses Map types', () => {
      const sql = `CREATE TABLE test (
        metadata Map(String, String),
        scores Map(String, UInt32)
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].type).toBe('Map(String, String)')
      expect(result.columns[1].type).toBe('Map(String, UInt32)')
    })

    it('parses Nested types', () => {
      const sql = `CREATE TABLE test (
        metadata Nested(
          key String,
          value String
        )
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].type).toBe('Nested(key String, value String)')
    })

    it('parses Nullable types', () => {
      const sql = `CREATE TABLE test (
        name Nullable(String),
        age Nullable(UInt32)
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].type).toBe('String')
      expect(result.columns[0].nullable).toBe(true)
      expect(result.columns[1].type).toBe('UInt32')
      expect(result.columns[1].nullable).toBe(true)
    })

    it('parses LowCardinality types', () => {
      const sql = `CREATE TABLE test (
        category LowCardinality(String),
        status LowCardinality(Enum8('active' = 1, 'inactive' = 0))
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].type).toBe('LowCardinality(String)')
      expect(result.columns[1].type).toBe('LowCardinality(Enum8(\'active\' = 1, \'inactive\' = 0))')
    })

    it('parses Enum types', () => {
      const sql = `CREATE TABLE test (
        status Enum8('active' = 1, 'inactive' = 0),
        priority Enum16('low' = 1, 'medium' = 2, 'high' = 3)
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].type).toBe('Enum8(\'active\' = 1, \'inactive\' = 0)')
      expect(result.columns[1].type).toBe('Enum16(\'low\' = 1, \'medium\' = 2, \'high\' = 3)')
    })
  })

  describe('Column Modifiers', () => {
    it('parses DEFAULT values', () => {
      const sql = `CREATE TABLE test (
        name String DEFAULT 'unknown',
        age UInt32 DEFAULT 0,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].default).toBe("'unknown'")
      expect(result.columns[1].default).toBe('0')
      expect(result.columns[2].default).toBe('now()')
    })

    it('parses MATERIALIZED columns', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        double_id UInt64 MATERIALIZED id * 2
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[1].materialized).toBe('id * 2')
    })

    it('parses ALIAS columns', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        user_id ALIAS id
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[1].alias).toBe('id')
    })

    it('parses COMMENT on columns', () => {
      const sql = `CREATE TABLE test (
        id UInt64 COMMENT 'Primary key',
        name String COMMENT 'User name'
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.columns[0].comment).toBe('Primary key')
      expect(result.columns[1].comment).toBe('User name')
    })
  })

  describe('Table Options', () => {
    it('parses ORDER BY clause', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        timestamp DateTime
      ) ENGINE = MergeTree()
      ORDER BY (id, timestamp)`
      
      const result = parse(sql)
      expect(result.orderBy).toEqual(['id', 'timestamp'])
    })

    it('parses PARTITION BY clause', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        timestamp DateTime
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)`
      
      const result = parse(sql)
      expect(result.partitionBy).toBe('toYYYYMM(timestamp)')
    })

    it('parses SETTINGS clause', () => {
      const sql = `CREATE TABLE test (
        id UInt64
      ) ENGINE = MergeTree()
      SETTINGS index_granularity = 8192, merge_with_ttl_timeout = 86400`
      
      const result = parse(sql)
      expect(result.settings).toEqual({
        'index_granularity': '8192',
        'merge_with_ttl_timeout': '86400'
      })
    })
  })

  describe('Complex Real-World Example', () => {
    it('parses a complex table with all features', () => {
      const sql = `
        CREATE TABLE IF NOT EXISTS events (
          id UInt64,
          user_id UInt64,
          event_name String DEFAULT 'unknown',
          timestamp DateTime DEFAULT now(),
          properties Map(String, String),
          tags Array(String),
          metadata Nested(
            key String,
            value String
          ),
          computed_score UInt64 MATERIALIZED user_id * 100,
          display_name ALIAS event_name,
          status Enum8('active' = 1, 'inactive' = 0) DEFAULT 'active',
          created_at DateTime COMMENT 'Creation timestamp'
        ) ENGINE = MergeTree()
        ORDER BY (user_id, timestamp)
        PARTITION BY toYYYYMM(timestamp)
        SETTINGS index_granularity = 8192, merge_with_ttl_timeout = 86400
      `
      
      const result = parse(sql)
      
      // Basic structure
      expect(result.name).toBe('events')
      expect(result.columns).toHaveLength(11)
      expect(result.engine).toBe('MergeTree')
      
      // Order by
      expect(result.orderBy).toEqual(['user_id', 'timestamp'])
      
      // Partition by
      expect(result.partitionBy).toBe('toYYYYMM(timestamp)')
      
      // Settings
      expect(result.settings).toEqual({
        'index_granularity': '8192',
        'merge_with_ttl_timeout': '86400'
      })
      
      // Column types
      expect(result.columns[0].type).toBe('UInt64')
      expect(result.columns[4].type).toBe('Map(String, String)')
      expect(result.columns[5].type).toBe('Array(String)')
      expect(result.columns[6].type).toBe('Nested(key String, value String)')
      
      // Materialized column
      expect(result.columns[7].materialized).toBe('user_id * 100')
      
      // Alias column
      expect(result.columns[8].alias).toBe('event_name')
      
      // Default values
      expect(result.columns[2].default).toBe("'unknown'")
      expect(result.columns[3].default).toBe('now()')
      expect(result.columns[9].default).toBe("'active'")
      
      // Comments
      expect(result.columns[10].comment).toBe('Creation timestamp')
    })
  })

  describe('NULL Keyword', () => {
    it('parses NULL as equivalent to Nullable', () => {
      const sql = `CREATE TABLE test (
        updated_at DateTime NULL,
        deleted_at DateTime NULL
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].type).toBe('DateTime')
      expect(result.columns[0].nullable).toBe(true)
      expect(result.columns[1].type).toBe('DateTime')
      expect(result.columns[1].nullable).toBe(true)
    })

    it('handles both NULL and Nullable syntax', () => {
      const sql = `CREATE TABLE test (
        col1 DateTime NULL,
        col2 Nullable(DateTime)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0]).toEqual({ name: 'col1', type: 'DateTime', nullable: true })
      expect(result.columns[1]).toEqual({ name: 'col2', type: 'DateTime', nullable: true })
    })
  })

  describe('SQL Comments', () => {
    it('ignores single-line comments', () => {
      const sql = `CREATE TABLE test (
        -- This is a comment
        id UInt64,
        -- Another comment
        name String
        -- Final comment
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns).toHaveLength(2)
      expect(result.columns[0].name).toBe('id')
      expect(result.columns[1].name).toBe('name')
    })

    it('handles comments with production schema', () => {
      const sql = `CREATE TABLE test (
        -- Basic types
        id UInt64,
        name String,
        -- Nullable types
        updated_at Nullable(DateTime)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns).toHaveLength(3)
    })
  })

  describe('Empty Array Default', () => {
    it('parses empty array as default value', () => {
      const sql = `CREATE TABLE test (
        tags Array(String) DEFAULT [],
        numbers Array(UInt32) DEFAULT []
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe('[]')
      expect(result.columns[1].default).toBe('[]')
    })

    it('handles array defaults with other defaults', () => {
      const sql = `CREATE TABLE test (
        tags Array(String) DEFAULT [],
        count UInt32 DEFAULT 0,
        name String DEFAULT 'unknown'
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe('[]')
      expect(result.columns[1].default).toBe('0')
      expect(result.columns[2].default).toBe("'unknown'")
    })
  })

  describe('Error Handling', () => {
    it('throws error for invalid SQL', () => {
      const sql = `INVALID SQL STATEMENT`

      expect(() => parse(sql)).toThrow()
    })

    it('throws error for missing table name', () => {
      const sql = `CREATE TABLE () ENGINE = MergeTree()`

      expect(() => parse(sql)).toThrow()
    })
  })
})