import { parseStatement } from './dist/esm/src/index.js'

console.log('Testing simple SELECT with function call...')

const sql = `CREATE VIEW test_view AS SELECT COUNT(*) FROM users`

try {
  const result = parseStatement(sql)
  console.log('\n✅ Parse successful!')
  console.log('View name:', result.view?.name)
  console.log('SELECT columns:', result.view?.select.columns.length)

  if (result.view?.select.columns[0]) {
    const col = result.view.select.columns[0]
    console.log('First column expression type:', col.expression.type)
    if (col.expression.type === 'FUNCTION_CALL') {
      console.log('  Function name:', col.expression.name)
      console.log('  Function args:', col.expression.args.length)
      console.log('\n✅ SUCCESS: Function calls work!')
    } else {
      console.log('\n❌ FAIL: Expected FUNCTION_CALL, got:', col.expression.type)
    }
  }
} catch (error) {
  console.error('\n❌ Parse failed:', error.message)
  if (error.token) {
    console.error('At token:', error.token)
  }
}
