/**
 * ════════════════════════════════════════════════════════════════════
 *  数壹（Hitori）—— 游戏适配器
 * ════════════════════════════════════════════════════════════════════
 *
 * 规则：
 *   1. 每一行、每一列中，未涂黑的相同数字不能出现两次；
 *   2. 黑格不能上下左右相邻；
 *   3. 所有未涂黑的格子必须连通。
 *
 * 状态用 0/1/2：0 = 未标记（白），1 = 黑，2 = 圈定白。
 */

import { playDrop, playPluck } from '../core/audio'
import type { CustomSupport, GameAdapter, Move, Puzzle, SolveResult } from '../core/types'
import { planLogicSolve } from './logic'
import { builtinPuzzles, getReferenceSolution } from './puzzles'
import { hitTest, metricsFor, renderBoard } from './render'
import { solvePuzzle } from './solver'
import {
  applyMove,
  cloneState,
  createEmptyState,
  cycleValue,
  deserializeState,
  firstHintMove,
  invertMove,
  rightClickValue,
  serializeState,
  valueAt,
} from './state'
import { statusBits, validate } from './validate'
import { BLACK, decodeNumbers, encodeNumbers, type HitoriPuzzle } from './types'

const meta = {
  title: '数壹',
  tagline: '涂黑重复的数字，让每一行每一列都只留下一份',
  footerNote:
    '规则：每一行、每一列中，未涂黑的相同数字不能出现两次；黑格不能上下左右相邻；所有未涂黑的格子必须连通。数字只是线索，涂黑后即被遮住。',
  storageKeyPrefix: 'hitori',
  customIdPrefix: 'hitori-custom-',
  customMinW: 5,
  customMinH: 5,
  customMaxW: 40,
  customMaxH: 40,
}

const VALUE_CYCLE: Array<number | null> = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function readNumbers(value: unknown, size: number): number[] | null {
  if (typeof value === 'string') return decodeNumbers(value, size)
  if (Array.isArray(value)) {
    if (value.length !== size) return null
    const out: number[] = []
    for (const v of value) {
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0 || n > 1295) return null
      out.push(n)
    }
    return out
  }
  return null
}

const custom: CustomSupport = {
  valueCycle: VALUE_CYCLE,

  keyForDigit: (digit) => {
    if (digit === 0) return null
    if (digit >= 1 && digit <= 9) return digit
    return undefined
  },

  cellLabel: (v) => (v == null ? '' : String(v)),

  cellClass: (v) => (v == null ? '' : `r${v}`),

  hint: '每格填入一个数字：点击格子输入 1-9，0 清空。载入后可用「求解」检查是否恰好一解。',

  toGrid: (p) => {
    const numbers = (p as HitoriPuzzle).numbers
    if (!Array.isArray(numbers) || numbers.length !== p.width * p.height) return null
    return {
      width: p.width,
      height: p.height,
      grid: numbers.map((v) => (typeof v === 'number' && v >= 1 ? v : null)),
    }
  },

  makePuzzle: (w, h, grid, existingId) => {
    const numbers = grid.map((v) => (typeof v === 'number' && v >= 1 ? v : 0))
    return {
      id: existingId ?? `${meta.customIdPrefix}${w}x${h}-${Date.now()}`,
      name: `自定义 · ${w}×${h}`,
      width: w,
      height: h,
      difficulty: 'custom',
      numbers,
    } satisfies HitoriPuzzle
  },

  encodePuzzle: (p) => ({
    numbers: encodeNumbers((p as HitoriPuzzle).numbers ?? []),
  }),

  decodePuzzle: (record) => {
    if (typeof record.id !== 'string') return null
    if (typeof record.width !== 'number' || typeof record.height !== 'number') return null
    const w = record.width
    const h = record.height
    if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) return null
    const numbers = readNumbers(record.numbers, w * h)
    if (!numbers) return null
    return {
      id: record.id,
      name: typeof record.name === 'string' ? record.name : `自定义 · ${w}×${h}`,
      width: w,
      height: h,
      difficulty: 'custom',
      numbers,
    } satisfies HitoriPuzzle
  },
}

function playForMove(move: Move, streak: number): void {
  if (move.to === BLACK) playDrop(streak)
  else playPluck(streak)
}

export const adapter: GameAdapter = {
  meta,
  builtinPuzzles,
  getReferenceSolution,
  createEmptyState,
  cloneState,
  cycleValue,
  rightClickValue,
  applyMove,
  invertMove,
  valueAt,
  serializeState,
  deserializeState,
  validate,
  statusBits,
  metricsFor,
  renderBoard,
  hitTest,
  planLogicSolve,
  solvePuzzle: (puzzle: Puzzle, maxNodes?: number): SolveResult => solvePuzzle(puzzle, maxNodes),
  firstHintMove,
  custom,
  playForMove,
}
