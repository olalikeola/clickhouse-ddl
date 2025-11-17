// Test multiple columns
import { parseStatement } from './dist/esm/src/index.js'

const sql = 'CREATE VIEW my_view AS SELECT id, name, email FROM users'

console.log('Input SQL:')
console.log(sql)
console.log('\n---\n')

const result = parseStatement(sql)

console.log('AST Output:')
console.log(JSON.stringify(result.view.select, null, 2))
console.log('\n---\n')

console.log('Extracted columns:')
result.view.select.columns.forEach((col, i) => {
  console.log(`  ${i + 1}. ${col.expression.name}`)
})

console.log('\nExtracted table:')
console.log(`  ${result.view.select.from.table.name}`)
