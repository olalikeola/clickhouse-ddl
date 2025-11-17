import { describe, it, expect } from 'vitest'
import { parseStatement } from '../src'
import {
  compareViews
} from '../src/normalizer'

describe('AST Normalization for Schema Diffing', () => {
  describe('Tuple Element Access Normalization', () => {
    it('should treat t.1 and tupleElement(t, 1) as equivalent', () => {
      const shorthandSQL = `CREATE VIEW v AS SELECT t.1 FROM (SELECT {arr:Array(Tuple(Int32))} AS a) ARRAY JOIN a AS t`
      const functionSQL = `CREATE VIEW v AS SELECT tupleElement(t, 1) FROM (SELECT {arr:Array(Tuple(Int32))} AS a) ARRAY JOIN a AS t`

      const ast1 = parseStatement(shorthandSQL) as any
      const ast2 = parseStatement(functionSQL) as any

      expect(compareViews(ast1.view, ast2.view)).toBe(true)
    })

    it('should normalize multiple tuple accesses', () => {
      const shorthandSQL = `CREATE VIEW v AS SELECT t.1, t.2, t.3 FROM (SELECT {arr:Array(Tuple(Int32,String,Bool))} AS a) ARRAY JOIN a AS t`
      const functionSQL = `CREATE VIEW v AS SELECT tupleElement(t, 1), tupleElement(t, 2), tupleElement(t, 3) FROM (SELECT {arr:Array(Tuple(Int32,String,Bool))} AS a) ARRAY JOIN a AS t`

      const ast1 = parseStatement(shorthandSQL) as any
      const ast2 = parseStatement(functionSQL) as any

      expect(compareViews(ast1.view, ast2.view)).toBe(true)
    })
  })

  describe('IS NULL Operator Normalization', () => {
    it('should treat expr IS NULL and isNull(expr) as equivalent', () => {
      const operatorSQL = `CREATE VIEW v AS SELECT col FROM t WHERE col IS NULL`
      const functionSQL = `CREATE VIEW v AS SELECT col FROM t WHERE isNull(col)`

      const ast1 = parseStatement(operatorSQL) as any
      const ast2 = parseStatement(functionSQL) as any

      expect(compareViews(ast1.view, ast2.view)).toBe(true)
    })

    it('should treat (t.1) IS NULL and isNull(tupleElement(t, 1)) as equivalent', () => {
      const shorthandSQL = `CREATE VIEW v AS SELECT col FROM (SELECT {arr:Array(Tuple(Int32))} AS a) ARRAY JOIN a AS t WHERE (t.1) IS NULL`
      const functionSQL = `CREATE VIEW v AS SELECT col FROM (SELECT {arr:Array(Tuple(Int32))} AS a) ARRAY JOIN a AS t WHERE isNull(tupleElement(t, 1))`

      const ast1 = parseStatement(shorthandSQL) as any
      const ast2 = parseStatement(functionSQL) as any

      expect(compareViews(ast1.view, ast2.view)).toBe(true)
    })
  })

  describe('Combined Production Patterns', () => {
    it('should normalize complex if statements with tuple access and IS NULL', () => {
      const shorthandSQL = `CREATE VIEW v AS
        SELECT
          if((t.1) IS NULL, 'default', t.1) AS col1,
          if((t.2) IS NULL, 0, t.2) AS col2
        FROM (SELECT {arr:Array(Tuple(String,Int32))} AS a) ARRAY JOIN a AS t`

      const functionSQL = `CREATE VIEW v AS
        SELECT
          if(isNull(tupleElement(t, 1)), 'default', tupleElement(t, 1)) AS col1,
          if(isNull(tupleElement(t, 2)), 0, tupleElement(t, 2)) AS col2
        FROM (SELECT {arr:Array(Tuple(String,Int32))} AS a) ARRAY JOIN a AS t`

      const ast1 = parseStatement(shorthandSQL) as any
      const ast2 = parseStatement(functionSQL) as any

      expect(compareViews(ast1.view, ast2.view)).toBe(true)
    })

    it('should handle production-style queries with multiple tuple accesses', () => {
      const shorthandSQL = `CREATE VIEW v AS
        SELECT
          if((t.1) IS NULL, generateUUIDv4(), t.1) AS id,
          t.2 AS name,
          if((t.3) IS NULL, '', t.3) AS description
        FROM (SELECT {data:Array(Tuple(UUID,String,String))} AS arr) ARRAY JOIN arr AS t`

      const functionSQL = `CREATE VIEW v AS
        SELECT
          if(isNull(tupleElement(t, 1)), generateUUIDv4(), tupleElement(t, 1)) AS id,
          tupleElement(t, 2) AS name,
          if(isNull(tupleElement(t, 3)), '', tupleElement(t, 3)) AS description
        FROM (SELECT {data:Array(Tuple(UUID,String,String))} AS arr) ARRAY JOIN arr AS t`

      const ast1 = parseStatement(shorthandSQL) as any
      const ast2 = parseStatement(functionSQL) as any

      expect(compareViews(ast1.view, ast2.view)).toBe(true)
    })
  })

  describe('CAST Expression Equivalence', () => {
    it('should treat CAST with AS and comma syntax as equivalent', () => {
      const asSyntax = `CREATE VIEW v AS SELECT CAST('value' AS Enum8('a' = 0, 'b' = 1)) AS col FROM t`
      const commaSyntax = `CREATE VIEW v AS SELECT CAST('value', 'Enum8(\\'a\\' = 0, \\'b\\' = 1)') AS col FROM t`

      const ast1 = parseStatement(asSyntax) as any
      const ast2 = parseStatement(commaSyntax) as any

      expect(compareViews(ast1.view, ast2.view)).toBe(true)
    })
  })
})
