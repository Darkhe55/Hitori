/**
 * 数壹 —— 实时校验
 */

import type { GameState, Puzzle, ValidationResult } from '../core/types'
import { duplicateGroups } from './rules'
import {
  asHitoriPuzzle,
  asHitoriState,
  BLACK,
  EMPTY,
  WHITE,
  type HitoriResult,
} from './types'

/** 未涂黑格（0 或 2）的连通块 */
function whiteComponents(
  cells: ArrayLike<number>,
  w: number,
  h: number,
): number[][] {
  const n = w * h
  const seen = new Uint8Array(n)
  const out: number[][] = []
  for (let start = 0; start < n; start++) {
    if (cells[start] === BLACK || seen[start]) continue
    const comp: number[] = []
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      comp.push(i)
      const x = i % w
      const y = (i / w) | 0
      if (x > 0 && cells[i - 1] !== BLACK && !seen[i - 1]) {
        seen[i - 1] = 1
        stack.push(i - 1)
      }
      if (x + 1 < w && cells[i + 1] !== BLACK && !seen[i + 1]) {
        seen[i + 1] = 1
        stack.push(i + 1)
      }
      if (y > 0 && cells[i - w] !== BLACK && !seen[i - w]) {
        seen[i - w] = 1
        stack.push(i - w)
      }
      if (y + 1 < h && cells[i + w] !== BLACK && !seen[i + w]) {
        seen[i + w] = 1
        stack.push(i + w)
      }
    }
    out.push(comp)
  }
  return out
}

export function validate(state: GameState, puzzle: Puzzle): HitoriResult {
  const s = asHitoriState(state)
  const p = asHitoriPuzzle(puzzle)
  const w = s.width
  const h = s.height
  const size = w * h
  const cells = s.cells
  const numbers = p.numbers ?? []

  let empty = 0
  let blackCount = 0
  let whiteCount = 0
  for (let i = 0; i < size; i++) {
    if (cells[i] === EMPTY) empty++
    else if (cells[i] === BLACK) blackCount++
    else if (cells[i] === WHITE) whiteCount++
  }

  const bad = new Set<number>()
  const groups = duplicateGroups(cells, numbers, w, h)
  const duplicateCells: number[] = []
  for (const g of groups) {
    for (const i of g.cells) {
      duplicateCells.push(i)
      bad.add(i)
    }
  }

  let adjacentBlackPairs = 0
  const blackNeighborCells = new Set<number>()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (cells[i] !== BLACK) continue
      if (x + 1 < w && cells[i + 1] === BLACK) {
        adjacentBlackPairs++
        blackNeighborCells.add(i)
        blackNeighborCells.add(i + 1)
      }
      if (y + 1 < h && cells[i + w] === BLACK) {
        adjacentBlackPairs++
        blackNeighborCells.add(i)
        blackNeighborCells.add(i + w)
      }
    }
  }
  for (const i of blackNeighborCells) bad.add(i)

  const comps = whiteComponents(cells, w, h)
  const trapped: number[] = []
  if (comps.length > 1) {
    let largest = 0
    for (let i = 1; i < comps.length; i++) {
      if (comps[i]!.length > comps[largest]!.length) largest = i
    }
    for (let i = 0; i < comps.length; i++) {
      if (i === largest) continue
      for (const idx of comps[i]!) {
        trapped.push(idx)
        bad.add(idx)
      }
    }
  }

  const solved =
    groups.length === 0 &&
    adjacentBlackPairs === 0 &&
    comps.length === 1

  return {
    solved,
    empty,
    blackCount,
    whiteCount,
    duplicateCount: groups.length,
    duplicateCells: Array.from(new Set(duplicateCells)),
    duplicateGroups: groups,
    adjacentBlackPairs,
    blackNeighborCells: Array.from(blackNeighborCells),
    whiteParts: comps.length,
    trapped: Array.from(new Set(trapped)),
    badCells: Array.from(bad),
    changedGivens: [],
  }
}

export function statusBits(result: ValidationResult): string[] {
  const r = result as HitoriResult
  if (r.solved) return ['完成']

  const bits: string[] = []
  if (r.duplicateCount > 0) bits.push(`${r.duplicateCount} 处行列重复数字`)
  if (r.adjacentBlackPairs > 0) bits.push(`${r.adjacentBlackPairs} 处黑格相邻`)
  if (r.whiteParts > 1) bits.push(`白格分成 ${r.whiteParts} 块未连通`)
  if (bits.length === 0) {
    if (r.blackCount === 0) bits.push('开始涂黑重复数字')
    else bits.push('继续涂黑')
  }
  return bits
}
