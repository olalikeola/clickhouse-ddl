import { parseStatement } from './dist/esm/src/index.js'

console.log('Testing window function support...\n')

// Test 1: Simple window function with ORDER BY
const sql1 = `CREATE VIEW test AS SELECT
  id,
  rank() OVER (PARTITION BY category ORDER BY score DESC) as rank
FROM events`

console.log('Test 1: Window function with PARTITION BY and ORDER BY')
try {
  const result1 = parseStatement(sql1)
  console.log('✅ Parse successful!')
  console.log('Columns:', result1.view.select.columns.length)
  const windowCol = result1.view.select.columns[1]
  console.log('Window function type:', windowCol.expression.type)
  if (windowCol.expression.type === 'WINDOW_FUNCTION') {
    console.log('  Function name:', windowCol.expression.name)
    console.log('  Has PARTITION BY:', !!windowCol.expression.over.partitionBy)
    console.log('  Has ORDER BY:', !!windowCol.expression.over.orderBy)
  }
} catch (e) {
  console.log('❌ FAILED:', e.message)
  console.log(e.stack)
}

console.log('\n---\n')

// Test 2: Multiple window functions
const sql2 = `CREATE VIEW test AS SELECT
  rank() OVER (PARTITION BY category ORDER BY score DESC) as rank,
  row_number() OVER (PARTITION BY category ORDER BY created_at) as row_num
FROM events`

console.log('Test 2: Multiple window functions')
try {
  const result2 = parseStatement(sql2)
  console.log('✅ Parse successful!')
  console.log('Columns:', result2.view.select.columns.length)
  console.log('Column 1 type:', result2.view.select.columns[0].expression.type)
  console.log('Column 2 type:', result2.view.select.columns[1].expression.type)
} catch (e) {
  console.log('❌ FAILED:', e.message)
}

console.log('\n---\n')

// Test 3: Window function with only ORDER BY (no PARTITION BY)
const sql3 = `CREATE VIEW test AS SELECT
  row_number() OVER (ORDER BY id) as row_num
FROM users`

console.log('Test 3: Window function with only ORDER BY')
try {
  const result3 = parseStatement(sql3)
  console.log('✅ Parse successful!')
  const windowCol = result3.view.select.columns[0]
  if (windowCol.expression.type === 'WINDOW_FUNCTION') {
    console.log('  Function name:', windowCol.expression.name)
    console.log('  Has PARTITION BY:', !!windowCol.expression.over.partitionBy)
    console.log('  Has ORDER BY:', !!windowCol.expression.over.orderBy)
  }
} catch (e) {
  console.log('❌ FAILED:', e.message)
}

console.log('\n=== Summary ===')
console.log('Window function support tested!')
