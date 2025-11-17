import { Lexer, Token } from './src/lexer.js'

const sql = `CREATE VIEW multi_cte AS
  WITH
    cte1 AS (SELECT 1 AS x),
    cte2 AS (SELECT x * 2 AS y FROM cte1)
  SELECT * FROM cte2`

const lexer = new Lexer(sql)
const tokens = lexer.tokenize()

console.log('=== MANUAL TRACE ===\n')

// Simulate parser execution
let pos = 0

function advance() {
  console.log(`  advance() from pos ${pos} (${tokens[pos].type} "${tokens[pos].value}")`)
  pos++
}

function check(type: string) {
  return tokens[pos].type === type
}

function expect(type: string) {
  console.log(`  expect(${type}) at pos ${pos} (${tokens[pos].type} "${tokens[pos].value}")`)
  if (tokens[pos].type !== type) {
    console.log(`  ERROR: Expected ${type} but got ${tokens[pos].type} ("${tokens[pos].value}") at line ${tokens[pos].line}, col ${tokens[pos].col}`)
    throw new Error('Parse error')
  }
  advance()
}

// Start parsing: CREATE VIEW multi_cte AS
console.log('\n1. parseCreateView():')
expect('CREATE')
expect('VIEW')
console.log(`  view name: ${tokens[pos].value}`)
advance() // multi_cte
expect('AS')

// parseSelect()
console.log('\n2. parseSelect():')

// parseWithClause()
console.log('\n3. parseWithClause():')
if (check('WITH')) {
  advance() // WITH

  console.log('\n4. Parsing CTE #1: cte1')
  console.log(`  CTE name: ${tokens[pos].value}`)
  advance() // cte1
  expect('AS')
  expect('LPAREN')

  console.log('\n5. Parsing SELECT for cte1:')
  console.log('  Calling parseSelect() recursively...')

  // Recursive parseSelect() for cte1
  console.log('\n6. parseSelect() for cte1:')
  console.log('  Calling parseWithClause()...')

  // parseWithClause() - no WITH here, so returns undefined
  console.log('  No WITH clause, continuing...')

  expect('SELECT')
  console.log('  Parsing select list...')

  // parseSelectList() for cte1: SELECT 1 AS x
  console.log('  Parsing expression: 1')
  advance() // 1
  expect('AS')
  console.log(`  Alias: ${tokens[pos].value}`)
  advance() // x

  console.log('\n7. Back to parseWithClause() after parseSelect() for cte1')
  expect('RPAREN') // This should succeed for cte1

  console.log('\n8. Check for more CTEs...')
  if (check('COMMA')) {
    advance() // COMMA

    console.log('\n9. Parsing CTE #2: cte2')
    console.log(`  CTE name: ${tokens[pos].value}`)
    advance() // cte2
    expect('AS')
    expect('LPAREN')

    console.log('\n10. Parsing SELECT for cte2:')
    console.log('  Calling parseSelect() recursively...')

    // Recursive parseSelect() for cte2
    console.log('\n11. parseSelect() for cte2:')
    console.log('  Calling parseWithClause()...')

    // parseWithClause() - no WITH here, so returns undefined
    console.log('  No WITH clause, continuing...')

    expect('SELECT')
    console.log('  Parsing select list...')

    // parseSelectList() for cte2: SELECT x * 2 AS y FROM cte1
    console.log('  Parsing expression starting with x...')
    console.log(`  Current token: ${tokens[pos].type} "${tokens[pos].value}"`)
    advance() // x

    // Now we're at STAR - parseExpression should handle this as binary op
    console.log(`  Current token: ${tokens[pos].type} "${tokens[pos].value}"`)
    console.log('  This should be part of a binary expression (x * 2)')
    console.log('  But parseSelect needs to return to parseWithClause first!')
    console.log('  The issue is that parseSelectList might not be handling this correctly...')
  }
}

console.log('\n=== ANALYSIS ===')
console.log('The problem is likely in how parseSelectList() handles expressions.')
console.log('When parsing cte2\'s SELECT, it needs to parse "x * 2" as a full expression.')
console.log('But something is causing it to return early or not consume all tokens.')
