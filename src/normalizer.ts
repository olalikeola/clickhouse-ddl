/**
 * AST Normalization Utilities
 *
 * This module provides functions to normalize ClickHouse SQL ASTs into canonical forms.
 * This is particularly useful for schema diffing where functionally equivalent SQL
 * may use different syntactic forms that produce different AST structures.
 *
 * Example normalizations:
 * - `t.1` → `tupleElement(t, 1)`
 * - `expr IS NULL` → `isNull(expr)`
 * - `expr IS NOT NULL` → `NOT isNull(expr)`
 */

import type {
  Expression,
  BinaryOp as BinaryOpExpression,
  ColumnRef as ColumnExpression,
  FunctionCall as FunctionCallExpression,
  Literal as LiteralExpression,
  SelectStatement,
  DDLView as CreateViewStatement,
  DDLTable as CreateTableStatement,
  DDLColumn,
  SelectColumn,
  OrderByItem,
  CTEDefinition
} from './ast.js'

/**
 * Normalizes an expression to a canonical form for comparison.
 *
 * Handles:
 * - Tuple element access: t.N → tupleElement(t, N)
 * - Null checks: expr IS NULL → isNull(expr)
 * - Not null checks: expr IS NOT NULL → NOT isNull(expr)
 * - Recursively normalizes all nested expressions
 */
export function normalizeExpression(expr: any): any {
  if (!expr || typeof expr !== 'object') {
    return expr
  }

  switch (expr.type) {
    case 'COLUMN':
      return normalizeColumnExpression(expr)

    case 'BINARY_OP':
      return normalizeBinaryOp(expr)

    case 'UNARY_OP':
      return normalizeUnaryOp(expr)

    case 'FUNCTION_CALL':
      return normalizeFunctionCall(expr)

    case 'LITERAL':
    case 'PARAMETER':
      // These don't need normalization
      return expr

    case 'CAST':
      return {
        ...expr,
        expression: normalizeExpression(expr.expression)
      }

    case 'SUBQUERY':
      return {
        ...expr,
        query: normalizeSelect(expr.query)
      }

    default:
      // For any other expression types, try to recursively normalize
      return expr
  }
}

/**
 * Normalizes column expressions.
 * Converts tuple element shorthand (t.1) to function call (tupleElement(t, 1))
 */
function normalizeColumnExpression(expr: any): any {
  // Check if this is tuple element access like t.1, t.2, etc.
  if (expr.table && /^\d+$/.test(expr.name)) {
    // Convert to tupleElement(t, N) function call
    return {
      type: 'FUNCTION_CALL',
      name: 'tupleElement',
      args: [
        {
          type: 'COLUMN',
          name: expr.table,
          table: undefined
        },
        {
          type: 'LITERAL',
          valueType: 'NUMBER',
          value: parseInt(expr.name, 10)
        }
      ]
    }
  }

  return expr
}

/**
 * Normalizes binary operations.
 * Converts IS NULL / IS NOT NULL operators to function calls
 */
function normalizeBinaryOp(expr: any): any {
  const normalizedLeft = normalizeExpression(expr.left)
  const normalizedRight = expr.right ? normalizeExpression(expr.right) : undefined

  // Convert IS NULL to isNull() function
  if (expr.operator === 'IS NULL') {
    return {
      type: 'FUNCTION_CALL',
      name: 'isNull',
      args: [normalizedLeft]
    }
  }

  // Convert IS NOT NULL to NOT isNull()
  if (expr.operator === 'IS NOT NULL') {
    return {
      type: 'UNARY_OP',
      operator: 'NOT',
      operand: {
        type: 'FUNCTION_CALL',
        name: 'isNull',
        args: [normalizedLeft]
      }
    }
  }

  // For all other binary operations, just normalize the operands
  return {
    ...expr,
    left: normalizedLeft,
    right: normalizedRight
  }
}

/**
 * Normalizes unary operations.
 * Recursively normalizes the operand.
 */
function normalizeUnaryOp(expr: any): any {
  return {
    ...expr,
    operand: normalizeExpression(expr.operand)
  }
}

/**
 * Normalizes function calls.
 * Recursively normalizes all arguments.
 */
function normalizeFunctionCall(expr: any): any {
  return {
    ...expr,
    args: expr.args?.map((arg: any) => normalizeExpression(arg))
  }
}

/**
 * Normalizes a SELECT statement.
 * Recursively normalizes all expressions in the SELECT.
 */
export function normalizeSelect(select: any): any {
  return {
    ...select,
    columns: select.columns?.map((col: any) => ({
      ...col,
      expression: normalizeExpression(col.expression)
    })),
    from: select.from ? normalizeTableReference(select.from) : undefined,
    where: select.where ? normalizeExpression(select.where) : undefined,
    groupBy: select.groupBy?.map((expr: any) => normalizeExpression(expr)),
    having: select.having ? normalizeExpression(select.having) : undefined,
    orderBy: select.orderBy?.map((order: any) => ({
      ...order,
      expression: normalizeExpression(order.expression)
    })),
    with: select.with?.map((cte: any) => ({
      ...cte,
      query: normalizeSelect(cte.query)
    }))
  }
}

/**
 * Normalizes table references in FROM clauses
 */
function normalizeTableReference(from: any): any {
  if (!from) return from

  if (from.type === 'SUBQUERY') {
    return {
      ...from,
      query: normalizeSelect(from.query)
    }
  }

  if (from.joins) {
    return {
      ...from,
      joins: from.joins.map((join: any) => ({
        ...join,
        table: normalizeTableReference(join.table),
        condition: join.condition ? normalizeExpression(join.condition) : undefined
      }))
    }
  }

  if (from.arrayJoin) {
    return {
      ...from,
      arrayJoin: {
        ...from.arrayJoin,
        expression: normalizeExpression(from.arrayJoin.expression)
      }
    }
  }

  return from
}

/**
 * Normalizes a CREATE VIEW statement.
 * Recursively normalizes the view's SELECT query.
 */
export function normalizeCreateView(view: any): any {
  return {
    ...view,
    select: normalizeSelect(view.select)
  }
}

/**
 * Normalizes a CREATE TABLE statement.
 * Note: Table structures don't typically need normalization,
 * but we normalize any default expressions in column definitions.
 */
export function normalizeCreateTable(table: any): any {
  return {
    ...table,
    columns: table.columns.map((col: any) => ({
      ...col,
      default: col.default  // Keep default as-is (it's a string in the DDL schema)
    }))
  }
}

/**
 * Compares two expressions for semantic equality after normalization.
 * Returns true if the expressions are functionally equivalent.
 */
export function compareExpressions(expr1: any, expr2: any): boolean {
  const normalized1 = normalizeExpression(expr1)
  const normalized2 = normalizeExpression(expr2)
  return JSON.stringify(normalized1) === JSON.stringify(normalized2)
}

/**
 * Compares two SELECT statements for semantic equality after normalization.
 * Returns true if the SELECT statements are functionally equivalent.
 */
export function compareSelects(select1: any, select2: any): boolean {
  const normalized1 = normalizeSelect(select1)
  const normalized2 = normalizeSelect(select2)
  return JSON.stringify(normalized1) === JSON.stringify(normalized2)
}

/**
 * Compares two CREATE VIEW statements for semantic equality after normalization.
 * Returns true if the views are functionally equivalent.
 */
export function compareViews(view1: any, view2: any): boolean {
  const normalized1 = normalizeCreateView(view1)
  const normalized2 = normalizeCreateView(view2)

  // Compare view names
  if (view1.name !== view2.name) {
    return false
  }

  // Compare SELECT queries
  return JSON.stringify(normalized1.select) === JSON.stringify(normalized2.select)
}
