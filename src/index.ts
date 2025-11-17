export { parse, parseStatement } from './parser.js'
export type { DDLTable, DDLColumn, DDLStatement, DDLView, DDLMaterializedView, SelectStatement, Expression, FunctionCall, WindowFunction } from './ast.js'

// AST Normalization utilities for schema comparison
export {
  normalizeExpression,
  normalizeSelect,
  normalizeCreateView,
  normalizeCreateTable,
  compareExpressions,
  compareSelects,
  compareViews
} from './normalizer.js'
