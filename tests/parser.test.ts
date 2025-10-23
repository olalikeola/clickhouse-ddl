import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser'

describe('basic parse', () => {
  it('parses simple create table', () => {
    const sql = `CREATE TABLE IF NOT EXISTS users (\n  id UInt64,\n  name String DEFAULT 'anon'\n) ENGINE = MergeTree()`
    const ast = parse(sql)
    expect(ast.name).toBe('users')
    expect(ast.columns.length).toBe(2)
  })
})
