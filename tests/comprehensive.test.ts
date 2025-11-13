import { describe, it, expect } from 'vitest'
import { parse, parseStatement } from '../src/parser'

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

    it('parses negative numbers in DEFAULT values', () => {
      const sql = `CREATE TABLE test (
        int_val Int64 DEFAULT -1,
        float_val Float64 DEFAULT -1.5,
        computed UInt64 DEFAULT toUInt64(-1)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe('-1')
      expect(result.columns[1].default).toBe('-1.5')
      expect(result.columns[2].default).toBe('toUInt64(-1)')
    })

    it('parses positive numbers with unary plus in DEFAULT values', () => {
      const sql = `CREATE TABLE test (
        int_val Int64 DEFAULT +1,
        float_val Float64 DEFAULT +1.5
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe('+1')
      expect(result.columns[1].default).toBe('+1.5')
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
    it('parses ORDER BY clause with parentheses', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        timestamp DateTime
      ) ENGINE = MergeTree()
      ORDER BY (id, timestamp)`

      const result = parse(sql)
      expect(result.orderBy).toEqual(['id', 'timestamp'])
    })

    it('parses ORDER BY clause without parentheses', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        name String
      ) ENGINE = MergeTree()
      ORDER BY id, name`

      const result = parse(sql)
      expect(result.orderBy).toEqual(['id', 'name'])
    })

    it('parses ORDER BY clause with single column (no parentheses)', () => {
      const sql = `CREATE TABLE test (
        id UInt64
      ) ENGINE = MergeTree()
      ORDER BY id`

      const result = parse(sql)
      expect(result.orderBy).toEqual(['id'])
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

    it('parses PARTITION BY + ORDER BY combination', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        timestamp DateTime
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY id, timestamp`

      const result = parse(sql)
      expect(result.partitionBy).toBe('toYYYYMM(timestamp)')
      expect(result.orderBy).toEqual(['id', 'timestamp'])
    })

    it('parses complex PARTITION BY + ORDER BY with expressions', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        plan_name String,
        created_at DateTime
      ) ENGINE = MergeTree()
      PARTITION BY (toYYYYMMDD(created_at), if(plan_name = 'free', 'free', 'paid'))
      ORDER BY id, plan_name`

      const result = parse(sql)
      expect(result.orderBy).toEqual(['id', 'plan_name'])
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
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (user_id, timestamp)
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

  describe('Schema-Qualified Table Names', () => {
    it('parses schema-qualified table names', () => {
      const sql = `CREATE TABLE mydb.users (
        id UInt64,
        name String
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.name).toBe('mydb.users')
      expect(result.columns).toHaveLength(2)
    })

    it('parses database-qualified table names', () => {
      const sql = `CREATE TABLE analytics.events (
        id UInt64,
        timestamp DateTime
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.name).toBe('analytics.events')
      expect(result.columns).toHaveLength(2)
    })

    it('parses schema-qualified table with IF NOT EXISTS', () => {
      const sql = `CREATE TABLE IF NOT EXISTS production.users (
        id UInt64,
        email String
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.name).toBe('production.users')
      expect(result.columns).toHaveLength(2)
    })

    it('parses schema-qualified table with complex features', () => {
      const sql = `CREATE TABLE IF NOT EXISTS staging.events (
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
      PARTITION BY toYYYYMM(timestamp)
      ORDER BY (user_id, timestamp)
      SETTINGS index_granularity = 8192, merge_with_ttl_timeout = 86400`
      
      const result = parse(sql)
      
      // Basic structure
      expect(result.name).toBe('staging.events')
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

    it('handles both qualified and unqualified names in same parser', () => {
      // Test that the parser can handle both formats
      const qualifiedSQL = `CREATE TABLE schema.table (id UInt64) ENGINE = MergeTree()`
      const unqualifiedSQL = `CREATE TABLE table (id UInt64) ENGINE = MergeTree()`
      
      const qualifiedResult = parse(qualifiedSQL)
      const unqualifiedResult = parse(unqualifiedSQL)
      
      expect(qualifiedResult.name).toBe('schema.table')
      expect(unqualifiedResult.name).toBe('table')
    })

    it('parses qualified names with complex data types', () => {
      const sql = `CREATE TABLE data.analytics (
        id UInt64,
        coordinates Tuple(Float64, Float64),
        metadata Map(String, String),
        tags Array(String),
        status LowCardinality(Enum8('active' = 1, 'inactive' = 0))
      ) ENGINE = MergeTree()`
      
      const result = parse(sql)
      expect(result.name).toBe('data.analytics')
      expect(result.columns[1].type).toBe('Tuple(Float64, Float64)')
      expect(result.columns[2].type).toBe('Map(String, String)')
      expect(result.columns[3].type).toBe('Array(String)')
      expect(result.columns[4].type).toBe('LowCardinality(Enum8(\'active\' = 1, \'inactive\' = 0))')
    })
  })

  describe('Backtick Identifiers', () => {
    it('parses backtick-quoted column names', () => {
      const sql = `CREATE TABLE test (
        \`account_id\` UInt64,
        \`user-name\` String,
        \`created_at\` DateTime
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns).toHaveLength(3)
      expect(result.columns[0].name).toBe('account_id')
      expect(result.columns[1].name).toBe('user-name')
      expect(result.columns[2].name).toBe('created_at')
    })

    it('parses backtick-quoted table names', () => {
      const sql = `CREATE TABLE \`my-table\` (
        id UInt64
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.name).toBe('my-table')
    })

    it('parses schema-qualified names with backticks', () => {
      const sql = `CREATE TABLE \`my-schema\`.\`my-table\` (
        \`my-column\` UInt64
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.name).toBe('my-schema.my-table')
      expect(result.columns[0].name).toBe('my-column')
    })

    it('handles mixed backtick and regular identifiers', () => {
      const sql = `CREATE TABLE mydb.\`my-table\` (
        id UInt64,
        \`user-id\` UInt64,
        name String
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.name).toBe('mydb.my-table')
      expect(result.columns[0].name).toBe('id')
      expect(result.columns[1].name).toBe('user-id')
      expect(result.columns[2].name).toBe('name')
    })

    it('parses backtick identifiers with defaults and modifiers', () => {
      const sql = `CREATE TABLE test (
        \`entity_id\` UInt64 DEFAULT toUInt64(parent_id),
        \`tier_name\` Enum8('basic' = 0, 'pro' = 1) DEFAULT 'premium',
        \`labels\` Array(String) DEFAULT [],
        \`category\` LowCardinality(String),
        \`computed_field\` UInt64 MATERIALIZED \`entity_id\` * 100
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns).toHaveLength(5)
      expect(result.columns[0].name).toBe('entity_id')
      expect(result.columns[0].default).toBe('toUInt64(parent_id)')
      expect(result.columns[1].name).toBe('tier_name')
      expect(result.columns[1].default).toBe("'premium'")
      expect(result.columns[2].name).toBe('labels')
      expect(result.columns[2].default).toBe('[]')
      expect(result.columns[3].name).toBe('category')
      expect(result.columns[4].name).toBe('computed_field')
      expect(result.columns[4].materialized).toBe('entity_id * 100')
    })

    it('handles backtick identifiers in expressions', () => {
      const sql = `CREATE TABLE test (
        \`col1\` UInt64,
        \`col2\` UInt64 DEFAULT \`col1\` * 2
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[1].default).toBe('col1 * 2')
    })
  })

  describe('Complex Nested Expressions', () => {
    it('parses if() conditional expressions', () => {
      const sql = `CREATE TABLE test (
        repo_full_name String DEFAULT if(repo_workspace = '', repo_slug, concat(repo_workspace, '/', repo_slug))
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].name).toBe('repo_full_name')
      expect(result.columns[0].default).toBe("if(repo_workspace = '', repo_slug, concat(repo_workspace, '/', repo_slug))")
    })

    it('parses nested function calls', () => {
      const sql = `CREATE TABLE test (
        full_path String DEFAULT concat(workspace, '/', slug, '/', name)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe("concat(workspace, '/', slug, '/', name)")
    })

    it('parses multi-line default expressions', () => {
      const sql = `CREATE TABLE test (
        event_date_start_of_day DateTime DEFAULT toStartOfDay(
          event_timestamp
        )
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].name).toBe('event_date_start_of_day')
      expect(result.columns[0].default).toBe('toStartOfDay(event_timestamp)')
    })

    it('parses comparison operators in expressions', () => {
      const sql = `CREATE TABLE test (
        is_greater UInt8 DEFAULT if(value > 10, 1, 0),
        is_equal UInt8 DEFAULT if(status = 'active', 1, 0),
        is_not_equal UInt8 DEFAULT if(type != 'free', 1, 0)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe('if(value > 10, 1, 0)')
      expect(result.columns[1].default).toBe("if(status = 'active', 1, 0)")
      expect(result.columns[2].default).toBe("if(type != 'free', 1, 0)")
    })

    it('parses deeply nested function calls', () => {
      const sql = `CREATE TABLE test (
        computed String DEFAULT if(a = '', b, concat(c, '/', if(d = '', e, f)))
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe("if(a = '', b, concat(c, '/', if(d = '', e, f)))")
    })

    it('handles empty string comparisons', () => {
      const sql = `CREATE TABLE test (
        result String DEFAULT if(workspace = '', '/', workspace)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe("if(workspace = '', '/', workspace)")
    })
  })

  describe('Production Data Types', () => {
    it('parses Decimal type', () => {
      const sql = `CREATE TABLE test (
        price Decimal(10, 2),
        rate Decimal(18, 6)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].type).toBe('Decimal(10, 2)')
      expect(result.columns[1].type).toBe('Decimal(18, 6)')
    })

    it('parses Date32 type', () => {
      const sql = `CREATE TABLE test (
        event_date Date32
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].type).toBe('Date32')
    })

    // TODO: IPv4 and IPv6 types cause JSON.stringify issue - needs investigation
    // it('parses IPv4 type', () => {
    //   const sql = `CREATE TABLE test (
    //     ipv4 IPv4
    //   ) ENGINE = MergeTree()`

    //   const result = parse(sql)
    //   expect(result.columns[0].type).toBe('IPv4')
    // })

    // it('parses IPv6 type', () => {
    //   const sql = `CREATE TABLE test (
    //     ipv6 IPv6
    //   ) ENGINE = MergeTree()`

    //   const result = parse(sql)
    //   expect(result.columns[0].type).toBe('IPv6')
    // })

    it('parses JSON type', () => {
      const sql = `CREATE TABLE test (
        data JSON
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].type).toBe('JSON')
    })
  })

  describe('Advanced ClickHouse Features', () => {
    it('parses AggregateFunction type', () => {
      const sql = `CREATE TABLE test (
        total AggregateFunction(sum, UInt64),
        avg_value AggregateFunction(avg, Float64)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].name).toBe('total')
      expect(result.columns[0].type).toBe('AggregateFunction(sum, UInt64)')
      expect(result.columns[1].name).toBe('avg_value')
      expect(result.columns[1].type).toBe('AggregateFunction(avg, Float64)')
    })

    it('parses tuple literals in defaults', () => {
      const sql = `CREATE TABLE test (
        location Tuple(String, UInt64) DEFAULT ('', 0),
        coords Tuple(Float64, Float64) DEFAULT (0.0, 0.0)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].default).toBe("('', 0)")
      expect(result.columns[1].default).toBe('(0.0, 0.0)')
    })

    it('parses SimpleAggregateFunction type', () => {
      const sql = `CREATE TABLE test (
        counter SimpleAggregateFunction(sum, UInt64),
        max_val SimpleAggregateFunction(max, Float32)
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.columns[0].type).toBe('SimpleAggregateFunction(sum, UInt64)')
      expect(result.columns[1].type).toBe('SimpleAggregateFunction(max, Float32)')
    })

    it('parses ENGINE with multiple arguments (ReplicatedMergeTree)', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        name String
      ) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')`

      const result = parse(sql)
      expect(result.name).toBe('test')
      expect(result.columns.length).toBe(2)
      expect(result.engine).toBe('ReplicatedMergeTree')
    })

    it('parses ENGINE with single argument', () => {
      const sql = `CREATE TABLE test (
        id UInt64
      ) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.name).toBe('test')
      expect(result.engine).toBe('MergeTree')
    })

    it('parses PRIMARY KEY clause', () => {
      const sql = `CREATE TABLE test (
        id UInt64,
        name String
      ) ENGINE = MergeTree()
      PRIMARY KEY (id)
      ORDER BY (id, name)`

      const result = parse(sql)
      expect(result.name).toBe('test')
      expect(result.engine).toBe('MergeTree')
    })

    it('parses production-style table with PRIMARY KEY and ORDER BY (with parens)', () => {
      const sql = `CREATE TABLE analytics.system_events (
        id UUID,
        event_type String,
        payload String,
        created_at DateTime64(3)
      ) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
      PRIMARY KEY (id)
      ORDER BY (created_at, id)`

      const result = parse(sql)
      expect(result.name).toBe('analytics.system_events')
      expect(result.engine).toBe('ReplicatedMergeTree')
      expect(result.columns.length).toBe(4)
    })

    it('parses production-style table with ORDER BY (no parens)', () => {
      const sql = `CREATE TABLE analytics.system_events (
        id UUID,
        event_type String,
        payload String,
        created_at DateTime64(3)
      ) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
      ORDER BY created_at, id`

      const result = parse(sql)
      expect(result.name).toBe('analytics.system_events')
      expect(result.engine).toBe('ReplicatedMergeTree')
      expect(result.columns.length).toBe(4)
      expect(result.orderBy).toEqual(['created_at', 'id'])
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

  describe('CREATE VIEW - Phase 1', () => {
    it('parses simple CREATE VIEW', () => {
      const sql = `CREATE VIEW test_view AS SELECT id, name FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view).toBeDefined()
      expect(result.view?.name).toBe('test_view')
      expect(result.view?.selectQuery).toContain('SELECT')
      expect(result.view?.selectQuery).toContain('id')
      expect(result.view?.selectQuery).toContain('name')
      expect(result.view?.selectQuery).toContain('FROM')
      expect(result.view?.selectQuery).toContain('users')
    })

    it('parses CREATE VIEW with IF NOT EXISTS', () => {
      const sql = `CREATE VIEW IF NOT EXISTS test_view AS SELECT * FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('test_view')
      expect(result.view?.selectQuery).toContain('SELECT')
    })

    it('parses CREATE VIEW with schema-qualified name', () => {
      const sql = `CREATE VIEW analytics.user_summary AS SELECT id, name FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.user_summary')
      expect(result.view?.selectQuery).toContain('SELECT')
    })

    it('parses CREATE VIEW with complex SELECT query', () => {
      const sql = `CREATE VIEW user_stats AS SELECT id, COUNT(*) as count FROM events WHERE timestamp > '2024-01-01' GROUP BY id`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('user_stats')
      expect(result.view?.selectQuery).toContain('SELECT')
      expect(result.view?.selectQuery).toContain('COUNT')
      expect(result.view?.selectQuery).toContain('WHERE')
      expect(result.view?.selectQuery).toContain('GROUP')
    })

    it('parses CREATE VIEW with window functions (PARTITION BY inside OVER)', () => {
      const sql = `CREATE VIEW analytics.latest_events_view AS
        WITH ranked_events AS (
          SELECT
            user_id,
            event_type,
            event_timestamp,
            rank() OVER (
              PARTITION BY user_id, event_type
              ORDER BY event_timestamp DESC
            ) AS event_rank
          FROM analytics.events
          WHERE event_timestamp > '2024-01-01'
        )
        SELECT user_id, event_type, event_timestamp
        FROM ranked_events
        WHERE event_rank = 1`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.latest_events_view')
      expect(result.view?.selectQuery).toContain('PARTITION BY')
      expect(result.view?.selectQuery).toContain('ORDER BY')
      expect(result.view?.selectQuery).toContain('OVER')
      expect(result.view?.selectQuery).toContain('rank')
    })

    it('parses CREATE VIEW with multiple window functions', () => {
      const sql = `CREATE VIEW stats AS
        SELECT
          id,
          rank() OVER (PARTITION BY category ORDER BY score DESC) as rank,
          row_number() OVER (PARTITION BY category ORDER BY created_at) as row_num
        FROM events`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('PARTITION BY')
      expect(result.view?.selectQuery).toContain('rank')
      expect(result.view?.selectQuery).toContain('row_number')
    })

    it('parses CREATE VIEW with if() function in WHERE clause', () => {
      const sql = `CREATE VIEW analytics.filtered_events_view AS
        SELECT user_id, event_type, event_timestamp
        FROM analytics.events
        WHERE if(length({selected_ids:Array(String)}) > 0, user_id IN ({selected_ids:Array(String)}), true)
          AND if({category:String} = 'basic', tier = 'basic', tier != 'basic')`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.filtered_events_view')
      expect(result.view?.selectQuery).toContain('if')
      expect(result.view?.selectQuery).toContain('length')
      expect(result.view?.selectQuery).toContain('selected_ids')
    })

    it('parses CREATE VIEW with parameterized query syntax', () => {
      const sql = `CREATE VIEW reports AS
        SELECT id, name
        FROM users
        WHERE id IN ({ids:Array(UInt64)})
          AND status = {status:String}
          AND created_at > {start_date:DateTime}`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('ids')
      expect(result.view?.selectQuery).toContain('Array')
      expect(result.view?.selectQuery).toContain('status')
      expect(result.view?.selectQuery).toContain('start_date')
    })

    it('parses CREATE VIEW with LowCardinality in parameterized queries', () => {
      const sql = `CREATE VIEW filtered_reports AS
        SELECT id, name, tier
        FROM users
        WHERE tier = {tier_name:LowCardinality(String)}
          AND if({plan:LowCardinality(String)} = 'basic', tier = 'basic', tier != 'basic')`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('tier_name')
      expect(result.view?.selectQuery).toContain('LowCardinality')
      expect(result.view?.selectQuery).toContain('plan')
    })

    it('parses CREATE VIEW with Nullable in parameterized queries', () => {
      const sql = `CREATE VIEW nullable_reports AS
        SELECT id, name
        FROM users
        WHERE email = {email:Nullable(String)}
          AND age > {min_age:Nullable(UInt8)}`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('email')
      expect(result.view?.selectQuery).toContain('Nullable')
      expect(result.view?.selectQuery).toContain('min_age')
    })

    it('parses CREATE VIEW with complex nested types in parameterized queries', () => {
      const sql = `CREATE VIEW complex_reports AS
        SELECT id, name
        FROM users
        WHERE ids IN ({ids:Array(Nullable(UInt64))})
          AND metadata = {meta:Map(String, Nullable(String))}
          AND tags = {tags:Array(LowCardinality(String))}`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('Array')
      expect(result.view?.selectQuery).toContain('Nullable')
      expect(result.view?.selectQuery).toContain('Map')
      expect(result.view?.selectQuery).toContain('LowCardinality')
    })

    it('parses CREATE VIEW with IS NULL in if() function calls', () => {
      const sql = `CREATE VIEW analytics.merged_data_view AS
        WITH merged_records AS (
          SELECT
            if((t.1) IS NULL, generateUUIDv4(), t.1) AS record_id,
            if((t.2) IS NULL, now(), t.2) AS created_at,
            if((t.6) IS NULL, 'default', t.6) AS tier_name
          FROM analytics.raw_data t
        )
        SELECT record_id, created_at, tier_name
        FROM merged_records`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.merged_data_view')
      expect(result.view?.selectQuery).toContain('IS')
      expect(result.view?.selectQuery).toContain('NULL')
      expect(result.view?.selectQuery).toContain('if')
      expect(result.view?.selectQuery).toContain('generateUUIDv4')
    })

    it('parses CREATE VIEW with IS NULL in WHERE clause', () => {
      const sql = `CREATE VIEW filtered_users AS
        SELECT id, name, email
        FROM users
        WHERE email IS NULL
          OR phone IS NULL`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('IS')
      expect(result.view?.selectQuery).toContain('NULL')
      expect(result.view?.selectQuery).toContain('email')
      expect(result.view?.selectQuery).toContain('phone')
    })

    it('parses CREATE VIEW with IS NULL in CASE expressions', () => {
      const sql = `CREATE VIEW user_status AS
        SELECT
          id,
          CASE
            WHEN email IS NULL THEN 'no_email'
            WHEN phone IS NULL THEN 'no_phone'
            ELSE 'complete'
          END AS status
        FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('IS')
      expect(result.view?.selectQuery).toContain('NULL')
      expect(result.view?.selectQuery).toContain('CASE')
      expect(result.view?.selectQuery).toContain('WHEN')
    })

    it('parses CREATE VIEW with complex if() and window functions', () => {
      const sql = `CREATE VIEW analytics.latest_records_view AS
        WITH ranked_records AS (
          SELECT
            user_id,
            entity_id,
            record_timestamp,
            record_id,
            rank() OVER (
              PARTITION BY entity_id, record_timestamp
              ORDER BY record_timestamp DESC
            ) AS record_rank
          FROM analytics.records
          WHERE if(length({filter_ids:Array(String)}) > 0, entity_id IN ({filter_ids:Array(String)}), true)
        )
        SELECT user_id, entity_id, record_id
        FROM ranked_records
        WHERE record_rank = 1`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.latest_records_view')
      expect(result.view?.selectQuery).toContain('if')
      expect(result.view?.selectQuery).toContain('PARTITION BY')
      expect(result.view?.selectQuery).toContain('rank')
      expect(result.view?.selectQuery).toContain('filter_ids')
    })

    it('backwards compatibility: parse() still works for CREATE TABLE', () => {
      const sql = `CREATE TABLE users (id UInt64, name String) ENGINE = MergeTree()`

      const result = parse(sql)
      expect(result.name).toBe('users')
      expect(result.columns).toHaveLength(2)
    })
  })

  describe('CREATE MATERIALIZED VIEW - Phase 2 (Bug Fix)', () => {
    it('parses materialized view with schema-qualified names and multi-line SELECT', () => {
      const sql = `CREATE MATERIALIZED VIEW IF NOT EXISTS
        analytics.daily_summary_mv
        TO analytics.daily_summary
      AS
      SELECT
        snapshot_id AS last_snapshot_id,
        user_id AS last_user_id,
        entity_id AS last_entity_id
      FROM analytics.raw_events`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView).toBeDefined()
      expect(result.materializedView?.name).toBe('analytics.daily_summary_mv')
      expect(result.materializedView?.toTable).toBe('analytics.daily_summary')
      expect(result.materializedView?.selectQuery).toContain('SELECT')
      expect(result.materializedView?.selectQuery).toContain('snapshot_id')
      expect(result.materializedView?.selectQuery).toContain('FROM')
      expect(result.materializedView?.selectQuery).toContain('raw_events')
    })

    it('parses minimal CREATE MATERIALIZED VIEW', () => {
      const sql = `CREATE MATERIALIZED VIEW test_mv TO test_table AS SELECT 1`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.name).toBe('test_mv')
      expect(result.materializedView?.toTable).toBe('test_table')
      expect(result.materializedView?.selectQuery).toContain('SELECT')
    })

    it('parses CREATE MATERIALIZED VIEW with IF NOT EXISTS', () => {
      const sql = `CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.stats_mv TO analytics.stats AS SELECT id, COUNT(*) FROM events GROUP BY id`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.name).toBe('analytics.stats_mv')
      expect(result.materializedView?.toTable).toBe('analytics.stats')
      expect(result.materializedView?.selectQuery).toContain('SELECT')
      expect(result.materializedView?.selectQuery).toContain('COUNT')
    })

    it('parses CREATE MATERIALIZED VIEW with complex SELECT', () => {
      const sql = `CREATE MATERIALIZED VIEW user_summary_mv TO user_summary AS
        SELECT
          user_id,
          COUNT(*) as event_count,
          MAX(timestamp) as last_event
        FROM events
        WHERE timestamp > '2024-01-01'
        GROUP BY user_id`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.name).toBe('user_summary_mv')
      expect(result.materializedView?.toTable).toBe('user_summary')
      expect(result.materializedView?.selectQuery).toContain('SELECT')
      expect(result.materializedView?.selectQuery).toContain('COUNT')
      expect(result.materializedView?.selectQuery).toContain('MAX')
      expect(result.materializedView?.selectQuery).toContain('WHERE')
      expect(result.materializedView?.selectQuery).toContain('GROUP')
    })

    it('parses CREATE MATERIALIZED VIEW with backtick identifiers', () => {
      const sql = `CREATE MATERIALIZED VIEW \`my-mv\` TO \`my-table\` AS SELECT id FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.name).toBe('my-mv')
      expect(result.materializedView?.toTable).toBe('my-table')
    })
  })

  describe('CREATE MATERIALIZED VIEW - system.tables format', () => {
    it('parses system.tables format with column definitions', () => {
      const sql = `CREATE MATERIALIZED VIEW analytics.daily_summary_mv
        TO analytics.daily_summary
        (\`snapshot_id\` UUID, \`user_id\` UInt64, \`entity_id\` String)`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.name).toBe('analytics.daily_summary_mv')
      expect(result.materializedView?.toTable).toBe('analytics.daily_summary')
      expect(result.materializedView?.columns).toBeDefined()
      expect(result.materializedView?.columns).toHaveLength(3)
      expect(result.materializedView?.columns?.[0].name).toBe('snapshot_id')
      expect(result.materializedView?.columns?.[0].type).toBe('UUID')
      expect(result.materializedView?.columns?.[1].name).toBe('user_id')
      expect(result.materializedView?.columns?.[1].type).toBe('UInt64')
      expect(result.materializedView?.columns?.[2].name).toBe('entity_id')
      expect(result.materializedView?.columns?.[2].type).toBe('String')
    })

    it('parses system.tables format with many columns', () => {
      const sql = `CREATE MATERIALIZED VIEW analytics.events_summary_mv
        TO analytics.events_summary
        (\`snapshot_id\` UUID, \`user_id\` UInt64, \`account_id\` String, \`account_slug\` String)`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.name).toBe('analytics.events_summary_mv')
      expect(result.materializedView?.toTable).toBe('analytics.events_summary')
      expect(result.materializedView?.columns).toHaveLength(4)
      expect(result.materializedView?.selectQuery).toBeUndefined() // system.tables format doesn't include SELECT
    })

    it('parses hybrid format with both columns and SELECT query', () => {
      const sql = `CREATE MATERIALIZED VIEW test_mv
        TO test_table
        (id UInt64, name String)
        AS SELECT id, name FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.name).toBe('test_mv')
      expect(result.materializedView?.toTable).toBe('test_table')
      expect(result.materializedView?.columns).toHaveLength(2)
      expect(result.materializedView?.selectQuery).toContain('SELECT')
    })

    it('parses system.tables format with complex types', () => {
      const sql = `CREATE MATERIALIZED VIEW test_mv
        TO test_table
        (tags Array(String), metadata Map(String, String), created_at DateTime)`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_MATERIALIZED_VIEW')
      expect(result.materializedView?.columns).toHaveLength(3)
      expect(result.materializedView?.columns?.[0].type).toBe('Array(String)')
      expect(result.materializedView?.columns?.[1].type).toBe('Map(String, String)')
      expect(result.materializedView?.columns?.[2].type).toBe('DateTime')
    })
  })

  describe('NOT expressions - Phase 8', () => {
    it('parses CREATE VIEW with NOT IN and tuple comparison (bug report case)', () => {
      const sql = `CREATE VIEW analytics.filtered_alerts_view AS
        SELECT
          column1,
          column2,
          alert_key,
          alert_status
        FROM analytics.alerts
        WHERE
          (
            column1,
            column2,
            alert_key
          ) NOT IN (
            SELECT
              column1,
              column2,
              alert_key
            FROM analytics.dismissed_alerts
          )`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.filtered_alerts_view')
      expect(result.view?.selectQuery).toContain('NOT')
      expect(result.view?.selectQuery).toContain('IN')
      expect(result.view?.selectQuery).toContain('column1')
      expect(result.view?.selectQuery).toContain('SELECT')
    })

    it('parses CREATE VIEW with IS NOT NULL', () => {
      const sql = `CREATE VIEW active_users AS
        SELECT id, name, email, phone
        FROM users
        WHERE email IS NOT NULL
          AND phone IS NOT NULL`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('IS')
      expect(result.view?.selectQuery).toContain('NOT')
      expect(result.view?.selectQuery).toContain('NULL')
      expect(result.view?.selectQuery).toContain('AND')
    })

    it('parses CREATE VIEW with NOT LIKE', () => {
      const sql = `CREATE VIEW filtered_products AS
        SELECT id, name, category
        FROM products
        WHERE name NOT LIKE '%test%'
          AND category NOT LIKE '%deprecated%'`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('NOT')
      expect(result.view?.selectQuery).toContain('LIKE')
      expect(result.view?.selectQuery).toContain('test')
    })

    it('parses CREATE VIEW with NOT BETWEEN', () => {
      const sql = `CREATE VIEW active_sessions AS
        SELECT session_id, user_id, created_at
        FROM sessions
        WHERE session_id NOT BETWEEN 1000 AND 2000`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('NOT')
      expect(result.view?.selectQuery).toContain('BETWEEN')
      expect(result.view?.selectQuery).toContain('AND')
    })

    it('parses CREATE VIEW with IN (without NOT)', () => {
      const sql = `CREATE VIEW privileged_users AS
        SELECT id, name, role
        FROM users
        WHERE role IN ('admin', 'moderator', 'editor')`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('IN')
      expect(result.view?.selectQuery).toContain('admin')
    })

    it('parses CREATE VIEW with AND/OR logical operators', () => {
      const sql = `CREATE VIEW complex_filter AS
        SELECT id, status, priority
        FROM tasks
        WHERE (status = 'active' AND priority > 5)
          OR (status = 'pending' AND priority > 8)`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('AND')
      expect(result.view?.selectQuery).toContain('OR')
    })
  })

  describe('CREATE OR REPLACE VIEW - Phase 9', () => {
    it('parses CREATE OR REPLACE VIEW', () => {
      const sql = `CREATE OR REPLACE VIEW test_view AS SELECT 1 AS value`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('test_view')
      expect(result.view?.selectQuery).toContain('SELECT')
    })

    it('parses CREATE OR REPLACE VIEW with IF NOT EXISTS', () => {
      const sql = `CREATE OR REPLACE VIEW IF NOT EXISTS analytics.summary_view AS
        SELECT id, name, status
        FROM analytics.data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.summary_view')
      expect(result.view?.selectQuery).toContain('SELECT')
    })

    it('parses CREATE OR REPLACE VIEW with schema qualification', () => {
      const sql = `CREATE OR REPLACE VIEW mydb.report_view AS
        SELECT user_id, COUNT(*) AS total
        FROM mydb.events
        GROUP BY user_id`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('mydb.report_view')
      expect(result.view?.selectQuery).toContain('COUNT')
    })
  })

  describe('UNION/UNION ALL - Phase 10', () => {
    it('parses CREATE VIEW with UNION ALL', () => {
      const sql = `CREATE VIEW combined_users AS
        SELECT id, name FROM active_users
        UNION ALL
        SELECT id, name FROM archived_users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('combined_users')
      expect(result.view?.selectQuery).toContain('UNION')
      expect(result.view?.selectQuery).toContain('ALL')
    })

    it('parses CREATE VIEW with UNION (without ALL)', () => {
      const sql = `CREATE VIEW unique_users AS
        SELECT user_id FROM table1
        UNION
        SELECT user_id FROM table2`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('UNION')
    })

    it('parses CREATE VIEW with multiple UNION ALL', () => {
      const sql = `CREATE VIEW all_events AS
        SELECT event_id, event_type FROM events_2023
        UNION ALL
        SELECT event_id, event_type FROM events_2024
        UNION ALL
        SELECT event_id, event_type FROM events_2025`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('UNION')
      expect(result.view?.selectQuery).toContain('ALL')
    })
  })

  describe('CAST expressions - Phase 11', () => {
    it('parses CREATE VIEW with CAST to Enum', () => {
      const sql = `CREATE VIEW status_view AS
        SELECT id, CAST('active' AS Enum('active', 'inactive', 'pending')) AS status
        FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('CAST')
      expect(result.view?.selectQuery).toContain('Enum')
    })

    it('parses CREATE VIEW with multiple CAST expressions', () => {
      const sql = `CREATE VIEW typed_data AS
        SELECT
          CAST(user_id AS String) AS user_str,
          CAST(created_at AS DateTime) AS created_datetime
        FROM raw_data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('CAST')
    })
  })

  describe('Lambda functions - Phase 12', () => {
    it('parses CREATE VIEW with lambda function (arrow operator)', () => {
      const sql = `CREATE VIEW filtered_data AS
        SELECT
          user_id,
          has(arrayMap(x -> toUInt64(x), ['1', '2', '3']), account_id) AS has_account
        FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('arrayMap')
      expect(result.view?.selectQuery).toContain('toUInt64')
    })

    it('parses CREATE VIEW with complex lambda', () => {
      const sql = `CREATE VIEW transformed AS
        SELECT arrayFilter(x -> x > 10, numbers) AS filtered
        FROM data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('arrayFilter')
    })
  })

  describe('INTERVAL arithmetic - Phase 13', () => {
    it('parses CREATE VIEW with INTERVAL DAYS', () => {
      const sql = `CREATE VIEW recent_data AS
        SELECT id, created_at
        FROM events
        WHERE created_at >= toStartOfDay(now()) - INTERVAL 7 DAYS`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('INTERVAL')
      expect(result.view?.selectQuery).toContain('DAYS')
    })

    it('parses CREATE VIEW with multiple INTERVAL units', () => {
      const sql = `CREATE VIEW time_ranges AS
        SELECT
          now() - INTERVAL 1 HOUR AS hour_ago,
          now() - INTERVAL 30 MINUTES AS minutes_ago,
          now() - INTERVAL 1 WEEK AS week_ago
        FROM system.numbers LIMIT 1`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('INTERVAL')
      expect(result.view?.selectQuery).toContain('HOUR')
      expect(result.view?.selectQuery).toContain('MINUTES')
      expect(result.view?.selectQuery).toContain('WEEK')
    })
  })

  describe('ARRAY JOIN - Phase 14', () => {
    it('parses CREATE VIEW with ARRAY JOIN', () => {
      const sql = `CREATE VIEW expanded_data AS
        SELECT t.1 AS value1, t.2 AS value2
        FROM (SELECT ['a', 'b', 'c'] AS arr) ARRAY JOIN arr AS t`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('ARRAY')
      expect(result.view?.selectQuery).toContain('JOIN')
    })

    it('parses CREATE VIEW with parameterized ARRAY JOIN', () => {
      const sql = `CREATE VIEW param_array AS
        SELECT t.*
        FROM (SELECT {data:Array(Tuple(String, UInt64))} AS arr) ARRAY JOIN arr AS t`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('ARRAY')
      expect(result.view?.selectQuery).toContain('JOIN')
    })
  })

  describe('WITH CTEs - Phase 15', () => {
    it('parses CREATE VIEW with WITH CTE', () => {
      const sql = `CREATE VIEW cte_view AS
        WITH active_users AS (
          SELECT user_id FROM users WHERE status = 'active'
        )
        SELECT * FROM active_users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('WITH')
      expect(result.view?.selectQuery).toContain('active_users')
    })

    it('parses CREATE VIEW with multiple CTEs', () => {
      const sql = `CREATE VIEW multi_cte AS
        WITH
          cte1 AS (SELECT 1 AS x),
          cte2 AS (SELECT x * 2 AS y FROM cte1)
        SELECT * FROM cte2`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('WITH')
      expect(result.view?.selectQuery).toContain('cte1')
      expect(result.view?.selectQuery).toContain('cte2')
    })
  })

  describe('JOIN keywords - Phase 16', () => {
    it('parses CREATE VIEW with INNER JOIN', () => {
      const sql = `CREATE VIEW joined_data AS
        SELECT u.id, u.name, o.order_id
        FROM users AS u
        INNER JOIN orders AS o ON u.id = o.user_id`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('INNER')
      expect(result.view?.selectQuery).toContain('JOIN')
      expect(result.view?.selectQuery).toContain('ON')
    })

    it('parses CREATE VIEW with LEFT JOIN', () => {
      const sql = `CREATE VIEW left_join_view AS
        SELECT a.id, b.value
        FROM table_a AS a
        LEFT JOIN table_b AS b ON a.id = b.id`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('LEFT')
      expect(result.view?.selectQuery).toContain('JOIN')
    })

    it('parses CREATE VIEW with multiple JOIN conditions', () => {
      const sql = `CREATE VIEW complex_join AS
        SELECT *
        FROM t1
        INNER JOIN t2 ON t1.col1 = t2.col1 AND t1.col2 = t2.col2
        LEFT JOIN t3 ON t2.col3 = t3.col3`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('INNER')
      expect(result.view?.selectQuery).toContain('LEFT')
      expect(result.view?.selectQuery).toContain('JOIN')
    })

    it('parses CREATE VIEW with RIGHT JOIN', () => {
      const sql = `CREATE VIEW right_join_view AS
        SELECT * FROM t1 RIGHT JOIN t2 ON t1.id = t2.id`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('RIGHT')
      expect(result.view?.selectQuery).toContain('JOIN')
    })

    it('parses CREATE VIEW with CROSS JOIN', () => {
      const sql = `CREATE VIEW cross_join_view AS
        SELECT * FROM t1 CROSS JOIN t2`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('CROSS')
      expect(result.view?.selectQuery).toContain('JOIN')
    })
  })

  describe('<> operator - Phase 17', () => {
    it('parses CREATE VIEW with <> not equals operator', () => {
      const sql = `CREATE VIEW filtered AS
        SELECT id, name
        FROM users
        WHERE status <> 'deleted' AND role <> 'guest'`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('status')
      expect(result.view?.selectQuery).toContain('deleted')
    })

    it('parses CREATE VIEW with both != and <> operators', () => {
      const sql = `CREATE VIEW mixed_operators AS
        SELECT *
        FROM data
        WHERE col1 != 'a' AND col2 <> 'b'`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('col1')
      expect(result.view?.selectQuery).toContain('col2')
    })
  })

  describe('Complex combinations - All phases', () => {
    it('parses CREATE VIEW with complex SQL combining multiple features', () => {
      const sql = `CREATE OR REPLACE VIEW analytics.comprehensive_view AS
        WITH filtered AS (
          SELECT
            if(user_id IS NULL, 0, user_id) AS user_id,
            created_at
          FROM events
          WHERE status NOT IN ('deleted', 'archived')
            AND created_at >= now() - INTERVAL 30 DAYS
        )
        SELECT
          f.user_id,
          COUNT(*) AS event_count,
          CAST(AVG(value) AS Float64) AS avg_value
        FROM filtered AS f
        INNER JOIN users AS u ON f.user_id = u.id
        WHERE u.role <> 'guest'
        GROUP BY f.user_id
        HAVING event_count > 10
        ORDER BY event_count DESC
        LIMIT 100`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('analytics.comprehensive_view')
      expect(result.view?.selectQuery).toContain('WITH')
      expect(result.view?.selectQuery).toContain('NOT')
      expect(result.view?.selectQuery).toContain('IN')
      expect(result.view?.selectQuery).toContain('INTERVAL')
      expect(result.view?.selectQuery).toContain('DAYS')
      expect(result.view?.selectQuery).toContain('CAST')
      expect(result.view?.selectQuery).toContain('INNER')
      expect(result.view?.selectQuery).toContain('JOIN')
      expect(result.view?.selectQuery).toContain('GROUP')
      expect(result.view?.selectQuery).toContain('HAVING')
      expect(result.view?.selectQuery).toContain('LIMIT')
    })
  })

  describe('Escaped quotes in string literals - Phase 18', () => {
    it('parses CREATE VIEW with backslash-escaped single quotes', () => {
      const sql = `CREATE VIEW escaped_quotes AS
        SELECT
          id,
          'string with \\'escaped\\' quotes' AS text1,
          'it\\'s working' AS text2
        FROM data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('escaped_quotes')
      expect(result.view?.selectQuery).toContain('string')
      expect(result.view?.selectQuery).toContain('escaped')
    })

    it('parses CREATE VIEW with doubled single quotes', () => {
      const sql = `CREATE VIEW doubled_quotes AS
        SELECT
          id,
          'string with ''doubled'' quotes' AS text1,
          'it''s working' AS text2
        FROM data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.name).toBe('doubled_quotes')
      expect(result.view?.selectQuery).toContain('doubled')
    })

    it('parses CREATE VIEW with escaped quotes in if() default values', () => {
      const sql = `CREATE VIEW defaults_with_escapes AS
        SELECT
          if(plan IS NULL, 'enterprise', plan) AS plan_name,
          if(repo IS NULL, '', repo) AS repo_id,
          if(status IS NULL, 'it\\'s active', status) AS status_text
        FROM users`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('enterprise')
      expect(result.view?.selectQuery).toContain('if')
    })

    it('parses CREATE VIEW with backslash-escaped double quotes', () => {
      const sql = `CREATE VIEW double_quoted AS
        SELECT
          id,
          "string with \\"escaped\\" quotes" AS text
        FROM data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('string')
    })

    it('parses CREATE VIEW with mixed escape styles', () => {
      const sql = `CREATE VIEW mixed_escapes AS
        SELECT
          'single with \\'escape\\'' AS text1,
          'single with ''doubled''' AS text2,
          "double with \\"escape\\"" AS text3,
          "double with ""doubled""" AS text4
        FROM data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('single')
      expect(result.view?.selectQuery).toContain('double')
    })

    it('parses CREATE VIEW with complex tupleElement defaults including escaped quotes', () => {
      const sql = `CREATE VIEW tuple_defaults AS
        WITH input_data AS (
          SELECT {data:Array(Tuple(Nullable(String), Nullable(UInt64)))} AS arr
        )
        SELECT
          if(isNull(tupleElement(t, 1)), 'default\\'s value', tupleElement(t, 1)) AS col1,
          if(isNull(tupleElement(t, 2)), 0, tupleElement(t, 2)) AS col2
        FROM input_data ARRAY JOIN arr AS t`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('tupleElement')
      expect(result.view?.selectQuery).toContain('if')
      expect(result.view?.selectQuery).toContain('isNull')
    })

    it('parses CREATE VIEW with empty string literals', () => {
      const sql = `CREATE VIEW empty_strings AS
        SELECT
          if(col IS NULL, '', col) AS value1,
          if(col2 IS NULL, "", col2) AS value2
        FROM data`

      const result = parseStatement(sql)
      expect(result.type).toBe('CREATE_VIEW')
      expect(result.view?.selectQuery).toContain('if')
    })
  })
})