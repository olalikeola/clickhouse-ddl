import { parseStatement } from './src/parser.js'

// Simple test: does SELECT x * 2 work in a standalone query?
try {
  console.log('Test 1: Simple arithmetic in main SELECT')
  const result1 = parseStatement(`CREATE VIEW test AS SELECT x * 2 AS y FROM t`)
  console.log('✓ SUCCESS\n')
} catch (e: any) {
  console.log(`✗ FAILED: ${e.message}\n`)
}

// Test: does it work in a simple CTE?
try {
  console.log('Test 2: Single CTE with arithmetic')
  const result2 = parseStatement(`CREATE VIEW test AS
    WITH cte AS (SELECT x * 2 AS y FROM t)
    SELECT * FROM cte`)
  console.log('✓ SUCCESS\n')
} catch (e: any) {
  console.log(`✗ FAILED: ${e.message}\n`)
}

// Test: does it work in the second CTE?
try {
  console.log('Test 3: Multiple CTEs with arithmetic in second CTE')
  const result3 = parseStatement(`CREATE VIEW test AS
    WITH
      cte1 AS (SELECT 1 AS x),
      cte2 AS (SELECT x * 2 AS y FROM cte1)
    SELECT * FROM cte2`)
  console.log('✓ SUCCESS\n')
} catch (e: any) {
  console.log(`✗ FAILED: ${e.message}\n`)
}

// Test: does it work without the FROM clause?
try {
  console.log('Test 4: Multiple CTEs with arithmetic but no FROM in second CTE')
  const result4 = parseStatement(`CREATE VIEW test AS
    WITH
      cte1 AS (SELECT 1 AS x),
      cte2 AS (SELECT 2 * 3 AS y)
    SELECT * FROM cte2`)
  console.log('✓ SUCCESS\n')
} catch (e: any) {
  console.log(`✗ FAILED: ${e.message}\n`)
}

// Test: first CTE with arithmetic
try {
  console.log('Test 5: Multiple CTEs with arithmetic in first CTE')
  const result5 = parseStatement(`CREATE VIEW test AS
    WITH
      cte1 AS (SELECT 1 * 2 AS x),
      cte2 AS (SELECT x AS y FROM cte1)
    SELECT * FROM cte2`)
  console.log('✓ SUCCESS\n')
} catch (e: any) {
  console.log(`✗ FAILED: ${e.message}\n`)
}
