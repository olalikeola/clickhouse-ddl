// Test the ACTUAL use case from the feature request
import { parseStatement } from './dist/esm/src/index.js'

console.log('=== TESTING: The Original Problem ===\n')

// Simulate what the user wrote in source code
const sourceSQL = 'CREATE VIEW test AS SELECT id FROM t WHERE x IN {param:Array(String)}'

// Simulate what ClickHouse returns (reformatted)
const dbSQL = 'CREATE VIEW test AS SELECT id FROM t WHERE x IN ({param : Array ( String )})'

console.log('Source code SQL:')
console.log(sourceSQL)
console.log('\nDatabase SQL (reformatted by ClickHouse):')
console.log(dbSQL)
console.log('\n---\n')

// Try to parse both
console.log('Parsing source SQL...')
try {
  const sourceResult = parseStatement(sourceSQL)
  console.log('✅ Parsed successfully')
  console.log('  selectQuery:', sourceResult.view.selectQuery)
  if (sourceResult.view.select) {
    console.log('  AST exists:', 'YES')
  }
} catch (e) {
  console.log('❌ Parse failed:', e.message)
}

console.log('\nParsing database SQL...')
try {
  const dbResult = parseStatement(dbSQL)
  console.log('✅ Parsed successfully')
  console.log('  selectQuery:', dbResult.view.selectQuery)
  if (dbResult.view.select) {
    console.log('  AST exists:', 'YES')
  }
} catch (e) {
  console.log('❌ Parse failed:', e.message)
}

console.log('\n=== WHAT WE NEED TO IMPLEMENT ===\n')
console.log('To solve the user\'s problem, we need:')
console.log('  1. WHERE clause parsing')
console.log('  2. IN expression parsing')
console.log('  3. Parameter syntax: {param:Type}')
console.log('  4. Handle parentheses in expressions')
console.log('\nCurrent status: Basic SELECT col FROM table works ✅')
console.log('Next step: Add WHERE clause support')
