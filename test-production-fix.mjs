// Test semantic equivalence - THE ACTUAL SOLUTION!
import { parseStatement } from './dist/esm/src/index.js'

console.log('=== SEMANTIC EQUIVALENCE TEST ===\n')

// Source code version
const sourceSQL = 'CREATE VIEW test AS SELECT id FROM t WHERE x IN {param:Array(String)}'

// Database version (reformatted by ClickHouse)
const dbSQL = 'CREATE VIEW test AS SELECT id FROM t WHERE x IN ({param : Array ( String )})'

console.log('Source SQL:')
console.log(sourceSQL)
console.log('\nDatabase SQL (reformatted):')
console.log(dbSQL)
console.log('\n---\n')

const sourceResult = parseStatement(sourceSQL)
const dbResult = parseStatement(dbSQL)

console.log('Source AST:')
console.log(JSON.stringify(sourceResult.view.select, null, 2))
console.log('\n---\n')

console.log('Database AST:')
console.log(JSON.stringify(dbResult.view.select, null, 2))
console.log('\n---\n')

// Deep equality check
const sourceJSON = JSON.stringify(sourceResult.view.select)
const dbJSON = JSON.stringify(dbResult.view.select)

if (sourceJSON === dbJSON) {
  console.log('✅ SUCCESS! ASTs are IDENTICAL!')
  console.log('Even though the SQL strings are formatted differently, the semantic meaning is the same.')
  console.log('\nThis solves the user\'s problem:')
  console.log('  - Can now compare DDL from source code vs database')
  console.log('  - Formatting differences don\'t cause false positives')
  console.log('  - Semantic comparison works perfectly')
} else {
  console.log('❌ ASTs differ')
  console.log('\nDifferences to investigate...')
}
