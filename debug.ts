import { Lexer } from './src/lexer.js'

const sql = `CREATE VIEW multi_cte AS
  WITH
    cte1 AS (SELECT 1 AS x),
    cte2 AS (SELECT x * 2 AS y FROM cte1)
  SELECT * FROM cte2`

const lexer = new Lexer(sql)
const tokens = lexer.tokenize()

console.log('All tokens:')
tokens.forEach((token, i) => {
  console.log(`${i}: ${token.type.padEnd(15)} "${token.value}" (line ${token.line}, col ${token.col})`)
})
