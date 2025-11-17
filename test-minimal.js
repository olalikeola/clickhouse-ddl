import { parseStatement } from './dist/esm/src/index.js'

console.log('Test 1: Simple SELECT')
try {
  const r1 = parseStatement(`CREATE VIEW v AS SELECT id FROM users`)
  console.log('✅ Test 1 passed')
} catch (e) {
  console.log('❌ Test 1 failed:', e.message)
}

console.log('\nTest 2: SELECT *')
try {
  const r2 = parseStatement(`CREATE VIEW v AS SELECT * FROM users`)
  console.log('✅ Test 2 passed')
} catch (e) {
  console.log('❌ Test 2 failed:', e.message)
}
