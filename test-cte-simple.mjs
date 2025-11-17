import { parseStatement } from './dist/esm/src/index.js'

console.log('Testing simple CTE...\n')

// Simple CTE test
const sql = `CREATE VIEW test AS WITH cte AS (SELECT id FROM users) SELECT * FROM cte`

try {
  console.log('SQL:', sql)
  console.log('\nParsing...')
  const result = parseStatement(sql)

  if (result.errors && result.errors.length > 0) {
    console.log('\n❌ Parse errors:')
    console.log(JSON.stringify(result.errors, null, 2))
  } else {
    console.log('\n✅ Parse successful!')
    console.log('View:', result.view?.name)
    console.log('Has WITH:', !!result.view?.select.with)
    if (result.view?.select.with) {
      console.log('CTE count:', result.view.select.with.length)
      console.log('CTE[0] name:', result.view.select.with[0].name)
      console.log('CTE[0] query:', result.view.select.with[0].query)
    }
  }
} catch (e) {
  console.log('\n❌ Exception:', e.message)
  console.log(e.stack)
}
