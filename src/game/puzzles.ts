/**
 * 数壹 —— 题库加载
 */

import { RAW_PUZZLES } from './puzzles-data'
import {
  asHitoriPuzzle,
  decodeCells,
  decodeNumbers,
  EMPTY,
  type HitoriPuzzle,
  type HitoriState,
} from './types'

export const builtinPuzzles: HitoriPuzzle[] = []
const solutions = new Map<string, number[]>()

for (const raw of RAW_PUZZLES) {
  const size = raw.width * raw.height
  const numbers = decodeNumbers(raw.board, size)
  if (!numbers) {
    console.warn(`[数壹] 数字解码失败：${raw.id}`)
    continue
  }
  let hasNumber = false
  for (const n of numbers) if (n > 0) hasNumber = true
  if (!hasNumber) {
    console.warn(`[数壹] 题目没有数字：${raw.id}`)
    continue
  }

  const puzzle: HitoriPuzzle = {
    id: raw.id,
    name: raw.name,
    width: raw.width,
    height: raw.height,
    difficulty: raw.difficulty,
    numbers,
  }
  builtinPuzzles.push(puzzle)

  if (raw.solution) {
    const solution = decodeCells(raw.solution, size)
    if (solution) {
      let valid = true
      for (const v of solution) {
        if (v !== 1 && v !== 2) {
          valid = false
          break
        }
      }
      if (valid) {
        puzzle.solution = solution
        solutions.set(raw.id, solution)
      } else {
        console.warn(`[数壹] 参考解编码非法：${raw.id}`)
      }
    }
  }
}

export function getReferenceSolution(id: string): HitoriState | null {
  const cells = solutions.get(id)
  if (!cells) return null
  const puzzle = builtinPuzzles.find((p) => p.id === id)
  if (!puzzle) return null
  return {
    puzzleId: puzzle.id,
    width: puzzle.width,
    height: puzzle.height,
    cells: cells.slice(),
    givens: new Array<number>(puzzle.width * puzzle.height).fill(EMPTY),
  }
}

export function puzzleById(id: string): HitoriPuzzle | undefined {
  return builtinPuzzles.find((p) => p.id === id)
}

export function referenceFor(puzzle: HitoriPuzzle): number[] | null {
  return asHitoriPuzzle(puzzle).solution ?? solutions.get(puzzle.id) ?? null
}
