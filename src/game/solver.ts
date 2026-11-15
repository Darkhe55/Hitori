/**
 * 数壹 —— 回溯求解器
 */

import type { Puzzle, SolveResult } from '../core/types'
import { initialGrid, isValidSolution, propagate, solveByRules } from './rules.ts'
import { BLACK, EMPTY, WHITE, type HitoriState } from './types.ts'

export interface CountOutcome {
  count: number
  nodes: number
  timedOut: boolean
}

function search(
  numbers: ArrayLike<number>,
  size: number,
  w: number,
  h: number,
  limit: number,
  maxNodes: number,
): { solutions: number[][]; nodes: number; timedOut: boolean } {
  const grid = initialGrid(size)
  const solutions: number[][] = []
  let nodes = 0
  let timedOut = false

  const scoreOf = (i: number): number => {
    let score = 0
    const x = i % w
    const y = (i / w) | 0
    if (x > 0 && grid[i - 1] !== EMPTY) score++
    if (x + 1 < w && grid[i + 1] !== EMPTY) score++
    if (y > 0 && grid[i - w] !== EMPTY) score++
    if (y + 1 < h && grid[i + w] !== EMPTY) score++
    const v = numbers[i] ?? 0
    if (v > 0) {
      for (let k = 0; k < w; k++) {
        const j = y * w + k
        if (j !== i && (numbers[j] ?? 0) === v) {
          score += 3
          break
        }
      }
      for (let k = 0; k < h; k++) {
        const j = k * w + x
        if (j !== i && (numbers[j] ?? 0) === v) {
          score += 3
          break
        }
      }
    }
    return score
  }

  const dfs = (): void => {
    if (solutions.length >= limit || timedOut) return
    nodes++
    if (nodes > maxNodes) {
      timedOut = true
      return
    }
    if (!propagate(grid, numbers, w, h)) return

    let choice = -1
    let best = -1
    for (let i = 0; i < size; i++) {
      if (grid[i] !== EMPTY) continue
      const score = scoreOf(i)
      if (score > best) {
        best = score
        choice = i
      }
    }

    if (choice < 0) {
      if (isValidSolution(grid, numbers, w, h)) solutions.push(Array.from(grid))
      return
    }

    const backup = Array.from(grid)
    for (const value of [WHITE, BLACK] as const) {
      if (solutions.length >= limit || timedOut) return
      grid[choice] = value
      dfs()
      for (let i = 0; i < size; i++) grid[i] = backup[i]!
    }
  }

  dfs()
  return { solutions, nodes, timedOut }
}

export function countSolutions(
  numbers: ArrayLike<number>,
  size: number,
  w: number,
  h: number,
  limit = 2,
  maxNodes = 400_000,
): CountOutcome {
  const out = search(numbers, size, w, h, limit, maxNodes)
  return { count: out.solutions.length, nodes: out.nodes, timedOut: out.timedOut }
}

/** 收集最多 limit 个解（用于生成器消除替代解） */
export function collectSolutions(
  numbers: ArrayLike<number>,
  size: number,
  w: number,
  h: number,
  limit = 3,
  maxNodes = 400_000,
): { solutions: number[][]; nodes: number; timedOut: boolean } {
  return search(numbers, size, w, h, limit, maxNodes)
}

export function findSolution(
  numbers: ArrayLike<number>,
  size: number,
  w: number,
  h: number,
  maxNodes = 1_500_000,
): { solution: number[] | null; nodes: number; timedOut: boolean } {
  const out = search(numbers, size, w, h, 1, maxNodes)
  return { solution: out.solutions[0] ?? null, nodes: out.nodes, timedOut: out.timedOut }
}

export function solvePuzzle(puzzle: Puzzle, maxNodes = 1_500_000): SolveResult {
  const numbers = (puzzle as { numbers?: number[] }).numbers ?? []
  const size = puzzle.width * puzzle.height
  if (numbers.length !== size) {
    return { solved: false, solution: null, nodes: 0, timedOut: false }
  }

  const byRules = solveByRules(numbers, size, puzzle.width, puzzle.height, true, 240)
  if (byRules.ok && byRules.solution) {
    return {
      solved: true,
      solution: makeState(puzzle.id, puzzle.width, puzzle.height, byRules.solution),
      nodes: 0,
      timedOut: false,
    }
  }
  if (byRules.contradiction) {
    return { solved: false, solution: null, nodes: 0, timedOut: false }
  }

  const result = findSolution(numbers, size, puzzle.width, puzzle.height, maxNodes)
  if (!result.solution) {
    return { solved: false, solution: null, nodes: result.nodes, timedOut: result.timedOut }
  }
  return {
    solved: true,
    solution: makeState(puzzle.id, puzzle.width, puzzle.height, result.solution),
    nodes: result.nodes,
    timedOut: false,
  }
}

export function makeState(
  puzzleId: string,
  width: number,
  height: number,
  cells: number[],
): HitoriState {
  return {
    puzzleId,
    width,
    height,
    cells: cells.slice(),
    givens: new Array<number>(width * height).fill(EMPTY),
  }
}
