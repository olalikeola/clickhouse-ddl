// Simple test to understand current behavior
import { parseStatement } from './dist/esm/src/index.js'

const sql = 'CREATE VIEW my_view AS SELECT id FROM users'

console.log('Input SQL:')
console.log(sql)
console.log('\n---\n')

const result = parseStatement(sql)

console.log('Current output:')
console.log(JSON.stringify(result, null, 2))
console.log('\n---\n')

console.log('The selectQuery field (OLD - string):')
console.log(result.view.selectQuery)
console.log('\n---\n')

console.log('The select field (NEW - AST):')
console.log(JSON.stringify(result.view.select, null, 2))
