import { Lexer, Token } from './src/lexer.js'

// Test the case that WORKS
console.log('=== TEST 1: Main SELECT (WORKS) ===\n')
const sql1 = `CREATE VIEW test AS SELECT x * 2 AS y FROM t`
const tokens1 = new Lexer(sql1).tokenize()

console.log('Tokens for main SELECT:')
tokens1.forEach((t, i) => {
  if (i >= 4) { // After "CREATE VIEW test AS"
    console.log(`${i}: ${t.type.padEnd(12)} "${t.value}"`)
  }
})

// Test the case that FAILS
console.log('\n\n=== TEST 2: CTE SELECT (FAILS) ===\n')
const sql2 = `CREATE VIEW test AS
  WITH cte AS (SELECT x * 2 AS y FROM t)
  SELECT * FROM cte`
const tokens2 = new Lexer(sql2).tokenize()

console.log('Tokens for CTE SELECT:')
let inCTE = false
tokens2.forEach((t, i) => {
  if (t.type === 'LPAREN' && tokens2[i-1]?.type === 'AS' && tokens2[i-2]?.type === 'IDENTIFIER') {
    inCTE = true
    console.log(`${i}: ${t.type.padEnd(12)} "${t.value}" <-- CTE starts here`)
  } else if (inCTE && t.type === 'RPAREN') {
    console.log(`${i}: ${t.type.padEnd(12)} "${t.value}" <-- CTE should end here`)
    inCTE = false
  } else if (inCTE) {
    console.log(`${i}: ${t.type.padEnd(12)} "${t.value}"`)
  }
})

console.log('\n\n=== ANALYSIS ===')
console.log('Both use the same tokens for SELECT x * 2.')
console.log('The difference must be in how parseSelect() is called.')
console.log('\nLet me check if parseSelect() handles the end condition differently...')
