/**
 * 数壹 —— 棋盘状态
 */

import type { GameState, HitTarget, Move, Puzzle } from '../core/types'
import {
  asHitoriPuzzle,
  asHitoriState,
  BLACK,
  decodeCells,
  EMPTY,
  encodeCells,
  WHITE,
  type HitoriState,
} from './types'

export function createEmptyState(puzzle: Puzzle): HitoriState {
  const p = asHitoriPuzzle(puzzle)
  const size = p.width * p.height
  return {
    puzzleId: p.id,
    width: p.width,
    height: p.height,
    cells: new Array<number>(size).fill(EMPTY),
    givens: new Array<number>(size).fill(EMPTY),
  }
}

export function cloneState(state: GameState): HitoriState {
  const s = asHitoriState(state)
  return {
    puzzleId: s.puzzleId,
    width: s.width,
    height: s.height,
    cells: s.cells.slice(),
    givens: s.givens.slice(),
  }
}

export function cycleValue(state: GameState, target: HitTarget): number {
  const s = asHitoriState(state)
  const v = s.cells[target.index] ?? EMPTY
  // 左键：空/负面(白) → 正面(黑)；正面 → 空
  if (v === EMPTY || v === WHITE) return BLACK
  return EMPTY
}

export function rightClickValue(state: GameState, target: HitTarget): number {
  const s = asHitoriState(state)
  return s.cells[target.index] === WHITE ? EMPTY : WHITE
}

export function applyMove(state: GameState, move: Move): void {
  const s = asHitoriState(state)
  if (move.index < 0 || move.index >= s.cells.length) return
  s.cells[move.index] =
    move.to === BLACK || move.to === WHITE ? move.to : EMPTY
}

export function invertMove(move: Move): Move {
  return { index: move.index, from: move.to, to: move.from }
}

export function valueAt(state: GameState, index: number): number {
  return asHitoriState(state).cells[index] ?? EMPTY
}

export function serializeState(state: GameState): Record<string, unknown> {
  const s = asHitoriState(state)
  return {
    version: 1,
    puzzleId: s.puzzleId,
    width: s.width,
    height: s.height,
    cells: encodeCells(s.cells),
  }
}

function readCells(value: unknown, size: number): number[] | null {
  if (typeof value === 'string') return decodeCells(value, size)
  if (Array.isArray(value)) {
    if (value.length !== size) return null
    const out: number[] = []
    for (const v of value) {
      const n = Number(v)
      if (n !== EMPTY && n !== BLACK && n !== WHITE) return null
      out.push(n)
    }
    return out
  }
  return null
}

export function deserializeState(data: Record<string, unknown>): HitoriState | null {
  if (typeof data.puzzleId !== 'string') return null
  if (typeof data.width !== 'number' || typeof data.height !== 'number') return null
  const w = data.width
  const h = data.height
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) return null
  const size = w * h
  const cells = readCells(data.cells, size)
  if (!cells) return null
  return {
    puzzleId: data.puzzleId,
    width: w,
    height: h,
    cells,
    givens: new Array<number>(size).fill(EMPTY),
  }
}

export function firstHintMove(state: GameState, solution: GameState): Move | null {
  const s = asHitoriState(state)
  const sol = asHitoriState(solution)
  const size = Math.min(s.cells.length, sol.cells.length)
  for (let i = 0; i < size; i++) {
    if (sol.cells[i] === BLACK && s.cells[i] !== BLACK) {
      return { index: i, from: s.cells[i]!, to: BLACK }
    }
  }
  for (let i = 0; i < size; i++) {
    if (sol.cells[i] === WHITE && s.cells[i] === BLACK) {
      return { index: i, from: BLACK, to: WHITE }
    }
  }
  return null
}
