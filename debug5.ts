import { parseStatement } from './src/parser.js'

// Add some logging to understand the parse flow
const originalConsoleLog = console.log

// Test what works
console.log('=== Test: Main SELECT with arithmetic ===\n')
try {
  const result = parseStatement(`CREATE VIEW test AS SELECT x * 2 AS y FROM t`)
  console.log('✓ Parsing succeeded!\n')
  console.log('AST:', JSON.stringify(result, null, 2))
} catch (e: any) {
  console.log(`✗ Parsing failed: ${e.message}`)
}
