// Test CommonJS import
const { parse } = require('./dist/cjs/src/index.js');

console.log('Testing CommonJS import...');
try {
  const result = parse('CREATE TABLE test (id UInt32) ENGINE = MergeTree() ORDER BY id');
  console.log('✓ CommonJS import successful');
  console.log('Parse result:', JSON.stringify(result, null, 2));
  process.exit(0);
} catch (error) {
  console.error('✗ CommonJS import failed:', error.message);
  process.exit(1);
}
