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
})