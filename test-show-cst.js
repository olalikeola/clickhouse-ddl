// Show how SQL flows through the system
import { parseStatement } from './dist/esm/src/index.js'

const sql = 'CREATE VIEW my_view AS SELECT id FROM users'

console.log('Input SQL:')
console.log(sql)
console.log('\n=== STEP 1: TOKENIZATION ===\n')
console.log('The lexer breaks SQL into tokens:')
console.log('  1. CREATE')
console.log('  2. VIEW')
console.log('  3. Identifier("my_view")')
console.log('  4. AS')
console.log('  5. SELECT')
console.log('  6. Identifier("id")')
console.log('  7. FROM')
console.log('  8. Identifier("users")')

console.log('\n=== STEP 2: PARSE (happens internally) ===\n')
console.log('Parser uses tokens and applies grammar rules to build CST')
console.log('(CST is internal to Chevrotain, we don\'t see it directly)')

console.log('\n=== STEP 3: AST EXTRACTION ===\n')
const result = parseStatement(sql)

console.log('Our extraction functions walk the CST and build this AST:')
console.log(JSON.stringify(result.view.select, null, 2))

console.log('\n=== HOW IT MAPS ===\n')
console.log('Token "SELECT"     → selectQuery rule executed')
console.log('Token "id"         → selectColumn rule → AST: { type: "COLUMN", name: "id" }')
console.log('Token "FROM"       → fromClause rule executed')
console.log('Token "users"      → tableRef rule → AST: { type: "TABLE", name: "users" }')
