// Test ESM import
import { parse } from './dist/esm/src/index.js';

console.log('Testing ESM import...');
try {
  const result = parse('CREATE TABLE test (id UInt32) ENGINE = MergeTree() ORDER BY id');
  console.log('✓ ESM import successful');
  console.log('Parse result:', JSON.stringify(result, null, 2));
  process.exit(0);
} catch (error) {
  console.error('✗ ESM import failed:', error.message);
  process.exit(1);
}
