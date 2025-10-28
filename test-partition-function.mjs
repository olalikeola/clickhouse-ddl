import { parse } from './dist/src/index.js'

const sql = `CREATE TABLE test (
  id UInt64,
  timestamp DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY id`

try {
  const result = parse(sql)
  console.log('✅ Parse successful!')
  console.log('Partition BY:', result.partitionBy)
  console.log('Expected: toYYYYMMDD(timestamp)')
  console.log('Match:', result.partitionBy === 'toYYYYMMDD(timestamp)' ? '✅ YES' : '❌ NO')
} catch (error) {
  console.error('❌ Parse failed:', error.message)
  process.exit(1)
}
