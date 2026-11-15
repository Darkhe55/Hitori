/**
 * 数壹（Hitori）—— 游戏专用类型
 *
 * 盘面每一格都有一个数字，玩家把部分格子涂黑：
 *   - 每一行、每一列中，未涂黑的相同数字不能出现两次；
 *   - 黑格不能上下左右相邻；
 *   - 所有未涂黑的格子必须连通。
 *
 * 状态约定：
 *   0 = 未标记（视为白格）
 *   1 = 黑格
 *   2 = 圈定白格（可选，仍视为白格）
 */

import type { GameState, Puzzle, ValidationResult } from '../core/types'

export const EMPTY = 0
export const BLACK = 1
export const WHITE = 2

export type CellValue = 0 | 1 | 2

export interface DuplicateGroup {
  cells: number[]
  value: number
  orientation: 'row' | 'col'
}

export interface HitoriPuzzle extends Puzzle {
  /** 每格的数字；0 表示该格没有数字（自定义空题） */
  numbers: number[]
  /** 参考解：1 黑 / 2 白 */
  solution?: number[]
}

export interface HitoriState extends GameState {
  cells: number[]
  givens: number[]
}

export interface HitoriResult extends ValidationResult {
  /** 未标记格数 */
  empty: number
  blackCount: number
  whiteCount: number
  /** 行列中重复出现的数字组数 */
  duplicateCount: number
  duplicateCells: number[]
  duplicateGroups: DuplicateGroup[]
  /** 相邻黑格对数 */
  adjacentBlackPairs: number
  blackNeighborCells: number[]
  /** 白格连通块数量 */
  whiteParts: number
  trapped: number[]
  badCells: number[]
  changedGivens: number[]
}

export function asHitoriPuzzle(p: Puzzle): HitoriPuzzle {
  return p as HitoriPuzzle
}

export function asHitoriState(s: GameState): HitoriState {
  return s as HitoriState
}

const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz'

/** 编码数字：每格固定 2 个 base36 字符（0..1295） */
export function encodeNumbers(numbers: ArrayLike<number>): string {
  let out = ''
  for (let i = 0; i < numbers.length; i++) {
    let v = numbers[i]! | 0
    if (v < 0) v = 0
    if (v >= BASE36.length * BASE36.length) v = BASE36.length * BASE36.length - 1
    out += BASE36[Math.floor(v / BASE36.length)]! + BASE36[v % BASE36.length]!
  }
  return out
}

export function decodeNumbers(text: string, expected: number): number[] | null {
  if (typeof text !== 'string' || text.length !== expected * 2) return null
  const out = new Array<number>(expected).fill(0)
  for (let i = 0; i < expected; i++) {
    const hi = BASE36.indexOf(text[i * 2]!.toLowerCase())
    const lo = BASE36.indexOf(text[i * 2 + 1]!.toLowerCase())
    if (hi < 0 || lo < 0) return null
    out[i] = hi * BASE36.length + lo
  }
  return out
}

export function encodeCells(cells: ArrayLike<number>): string {
  let out = ''
  for (let i = 0; i < cells.length; i++) out += String(cells[i]! | 0)
  return out
}

export function decodeCells(text: string, expected: number): number[] | null {
  if (typeof text !== 'string' || text.length !== expected) return null
  const out = new Array<number>(expected)
  for (let i = 0; i < expected; i++) {
    const ch = text[i]!
    if (ch === '0' || ch === '.') out[i] = EMPTY
    else if (ch === '1' || ch === 'B' || ch === 'b' || ch === '#') out[i] = BLACK
    else if (ch === '2' || ch === 'W' || ch === 'w' || ch === 'o' || ch === 'O') out[i] = WHITE
    else return null
  }
  return out
}
