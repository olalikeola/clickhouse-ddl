// Quick test of new expression parser
import { parseStatement } from './dist/esm/src/index.js'

console.log('=== Testing New Expression Parser ===\n')

// Test 1: Simple WHERE with string literal
try {
  const sql1 = `CREATE VIEW test AS SELECT user_id FROM users WHERE status = 'active'`
  const result1 = parseStatement(sql1)
  console.log('✅ Test 1: WHERE with string literal')
  console.log('   WHERE AST:', JSON.stringify(result1.view.select.where, null, 2))
} catch (e) {
  console.log('❌ Test 1 FAILED:', e.message)
}

console.log('\n---\n')

// Test 2: Function call in SELECT
try {
  const sql2 = `CREATE VIEW test AS SELECT COUNT(*) FROM users`
  const result2 = parseStatement(sql2)
  console.log('✅ Test 2: Function call COUNT(*)')
  console.log('   Column AST:', JSON.stringify(result2.view.select.columns[0], null, 2))
} catch (e) {
  console.log('❌ Test 2 FAILED:', e.message)
}

console.log('\n---\n')

// Test 3: Complex expression with AND
try {
  const sql3 = `CREATE VIEW test AS SELECT id FROM users WHERE age > 18 AND status = 'active'`
  const result3 = parseStatement(sql3)
  console.log('✅ Test 3: Complex WHERE with AND')
  console.log('   WHERE AST:', JSON.stringify(result3.view.select.where, null, 2))
} catch (e) {
  console.log('❌ Test 3 FAILED:', e.message)
}

console.log('\n---\n')

// Test 4: CTE (WITH clause)
try {
  const sql4 = `CREATE VIEW test AS
    WITH active_users AS (
      SELECT user_id FROM users WHERE status = 'active'
    )
    SELECT * FROM active_users`
  const result4 = parseStatement(sql4)
  console.log('✅ Test 4: CTE (WITH clause)')
  console.log('   CTE name:', result4.view.select.with?.[0]?.name)
  console.log('   CTE has query:', !!result4.view.select.with?.[0]?.query)
} catch (e) {
  console.log('❌ Test 4 FAILED:', e.message)
}

console.log('\n=== Summary ===')
console.log('All major expression features tested!')
