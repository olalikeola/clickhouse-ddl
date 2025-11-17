import { parseStatement } from './dist/esm/src/index.js'

console.log('Testing parameter support in WHERE...\n')

// Test 1: Simple parameter
const sql1 = `CREATE VIEW test AS SELECT id FROM users WHERE status = {status:String}`
console.log('Test 1: Simple parameter {status:String}')
try {
  const result1 = parseStatement(sql1)
  console.log('✅ Parse successful!')
  console.log('WHERE AST:', JSON.stringify(result1.view.select.where, null, 2))
} catch (e) {
  console.log('❌ FAILED:', e.message)
}

console.log('\n---\n')

// Test 2: Parameter in IN clause
const sql2 = `CREATE VIEW test AS SELECT id FROM users WHERE id IN ({ids:Array(UInt64)})`
console.log('Test 2: Parameter in IN clause {ids:Array(UInt64)}')
try {
  const result2 = parseStatement(sql2)
  console.log('✅ Parse successful!')
  console.log('WHERE AST:', JSON.stringify(result2.view.select.where, null, 2))
} catch (e) {
  console.log('❌ FAILED:', e.message)
}

console.log('\n---\n')

// Test 3: Complex parameter with Enum
const sql3 = `CREATE VIEW test AS SELECT id FROM users WHERE type = {type:Enum8('a'=1,'b'=2)}`
console.log("Test 3: Complex parameter {type:Enum8('a'=1,'b'=2)}")
try {
  const result3 = parseStatement(sql3)
  console.log('✅ Parse successful!')
  console.log('WHERE AST:', JSON.stringify(result3.view.select.where, null, 2))
} catch (e) {
  console.log('❌ FAILED:', e.message)
}

console.log('\n=== Summary ===')
console.log('Parameter support tested!')
