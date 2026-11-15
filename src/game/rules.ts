/**
 * 数壹（Hitori）—— 规则引擎
 *
 * 规则：
 *   R1 每一行、每一列中，未涂黑的相同数字不能出现两次；
 *   R2 黑格不能上下左右相邻；
 *   R3 所有未涂黑的格子必须连通。
 *
 * 传播规则都是必然结论，可用于唯一解证明、逻辑回放与提示。
 */

import { BLACK, EMPTY, WHITE } from './types.ts'

export type RuleKind = 'duplicate' | 'adj' | 'connect' | 'sandwich'

export type SetCallback = (index: number, value: number, rule: RuleKind) => void

const DX = [1, -1, 0, 0]
const DY = [0, 0, 1, -1]

export function neighborsOf(index: number, w: number, h: number): number[] {
  const x = index % w
  const y = (index / w) | 0
  const out: number[] = []
  if (x > 0) out.push(index - 1)
  if (x + 1 < w) out.push(index + 1)
  if (y > 0) out.push(index - w)
  if (y + 1 < h) out.push(index + w)
  return out
}

export function componentsOf(
  cells: ArrayLike<number>,
  w: number,
  h: number,
  color: number,
): number[][] {
  const n = w * h
  const seen = new Uint8Array(n)
  const out: number[][] = []
  for (let start = 0; start < n; start++) {
    if (cells[start] !== color || seen[start]) continue
    const comp: number[] = []
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      comp.push(i)
      const x = i % w
      const y = (i / w) | 0
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d]!
        const ny = y + DY[d]!
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const j = ny * w + nx
        if (!seen[j] && cells[j] === color) {
          seen[j] = 1
          stack.push(j)
        }
      }
    }
    out.push(comp)
  }
  return out
}

export function initialGrid(size: number): number[] {
  return new Array<number>(size).fill(EMPTY)
}

interface GroupHit {
  cells: number[]
  value: number
  orientation: 'row' | 'col'
}

/** 找出所有出现两次及以上的行列数字组（只统计非黑格） */
export function duplicateGroups(
  cells: ArrayLike<number>,
  numbers: ArrayLike<number>,
  w: number,
  h: number,
): GroupHit[] {
  const out: GroupHit[] = []

  for (let y = 0; y < h; y++) {
    const groups = new Map<number, number[]>()
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (cells[i] === BLACK) continue
      const v = numbers[i] ?? 0
      if (v <= 0) continue
      const list = groups.get(v) ?? []
      list.push(i)
      groups.set(v, list)
    }
    for (const [value, list] of groups) {
      if (list.length >= 2) out.push({ cells: list, value, orientation: 'row' })
    }
  }

  for (let x = 0; x < w; x++) {
    const groups = new Map<number, number[]>()
    for (let y = 0; y < h; y++) {
      const i = y * w + x
      if (cells[i] === BLACK) continue
      const v = numbers[i] ?? 0
      if (v <= 0) continue
      const list = groups.get(v) ?? []
      list.push(i)
      groups.set(v, list)
    }
    for (const [value, list] of groups) {
      if (list.length >= 2) out.push({ cells: list, value, orientation: 'col' })
    }
  }

  return out
}

export function propagate(
  cells: Int8Array | number[],
  numbers: ArrayLike<number>,
  w: number,
  h: number,
  onSet?: SetCallback,
): boolean {
  const n = w * h
  let changed = true

  const set = (i: number, value: number, kind: RuleKind): boolean => {
    if (cells[i] === value) return true
    if (cells[i] !== EMPTY) return false
    cells[i] = value
    onSet?.(i, value, kind)
    changed = true
    return true
  }

  while (changed) {
    changed = false

    // —— R1：行列重复数字 ——
    for (let y = 0; y < h; y++) {
      const groups = new Map<number, number[]>()
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (cells[i] === BLACK) continue
        const v = numbers[i] ?? 0
        if (v <= 0) continue
        const list = groups.get(v) ?? []
        list.push(i)
        groups.set(v, list)
      }
      for (const list of groups.values()) {
        if (list.length < 2) continue
        const whites = list.filter((i) => cells[i] === WHITE)
        if (whites.length >= 2) return false
        if (whites.length === 1) {
          for (const i of list) {
            if (i === whites[0]) continue
            if (cells[i] === WHITE) return false
            if (cells[i] === EMPTY && !set(i, BLACK, 'duplicate')) return false
          }
        }
      }
    }
    for (let x = 0; x < w; x++) {
      const groups = new Map<number, number[]>()
      for (let y = 0; y < h; y++) {
        const i = y * w + x
        if (cells[i] === BLACK) continue
        const v = numbers[i] ?? 0
        if (v <= 0) continue
        const list = groups.get(v) ?? []
        list.push(i)
        groups.set(v, list)
      }
      for (const list of groups.values()) {
        if (list.length < 2) continue
        const whites = list.filter((i) => cells[i] === WHITE)
        if (whites.length >= 2) return false
        if (whites.length === 1) {
          for (const i of list) {
            if (i === whites[0]) continue
            if (cells[i] === WHITE) return false
            if (cells[i] === EMPTY && !set(i, BLACK, 'duplicate')) return false
          }
        }
      }
    }

    // —— R2：黑格不能相邻 ——
    for (let i = 0; i < n; i++) {
      if (cells[i] !== BLACK) continue
      for (const j of neighborsOf(i, w, h)) {
        if (cells[j] === BLACK) return false
        if (cells[j] === EMPTY && !set(j, WHITE, 'adj')) return false
      }
    }

    // —— R3：白格连通 ——
    let firstWhite = -1
    for (let i = 0; i < n; i++) {
      if (cells[i] === WHITE) {
        firstWhite = i
        break
      }
    }
    if (firstWhite >= 0) {
      const possible = new Uint8Array(n)
      const stack = [firstWhite]
      possible[firstWhite] = 1
      while (stack.length) {
        const i = stack.pop()!
        const x = i % w
        const y = (i / w) | 0
        if (x > 0 && cells[i - 1] !== BLACK && !possible[i - 1]) {
          possible[i - 1] = 1
          stack.push(i - 1)
        }
        if (x + 1 < w && cells[i + 1] !== BLACK && !possible[i + 1]) {
          possible[i + 1] = 1
          stack.push(i + 1)
        }
        if (y > 0 && cells[i - w] !== BLACK && !possible[i - w]) {
          possible[i - w] = 1
          stack.push(i - w)
        }
        if (y + 1 < h && cells[i + w] !== BLACK && !possible[i + w]) {
          possible[i + w] = 1
          stack.push(i + w)
        }
      }
      for (let i = 0; i < n; i++) {
        if (cells[i] === WHITE && !possible[i]) return false
        if (cells[i] === EMPTY && !possible[i]) {
          if (!set(i, BLACK, 'connect')) return false
        }
      }
    }

    // —— 三连夹心：A ? A → ? 必为白 ——
    for (let y = 0; y < h; y++) {
      for (let x = 0; x + 2 < w; x++) {
        const a = y * w + x
        const b = a + 1
        const c = a + 2
        const v = numbers[a] ?? 0
        if (v > 0 && numbers[c] === v) {
          if (cells[b] === BLACK) return false
          if (cells[b] === EMPTY && !set(b, WHITE, 'sandwich')) return false
        }
      }
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y + 2 < h; y++) {
        const a = y * w + x
        const b = a + w
        const c = a + 2 * w
        const v = numbers[a] ?? 0
        if (v > 0 && numbers[c] === v) {
          if (cells[b] === BLACK) return false
          if (cells[b] === EMPTY && !set(b, WHITE, 'sandwich')) return false
        }
      }
    }
  }

  return true
}

export function isValidSolution(
  cells: ArrayLike<number>,
  numbers: ArrayLike<number>,
  w: number,
  h: number,
): boolean {
  const n = w * h
  let white = 0
  for (let i = 0; i < n; i++) {
    if (cells[i] !== BLACK && cells[i] !== WHITE) return false
    if (cells[i] === WHITE) white++
  }
  if (white === 0) return false

  for (let y = 0; y < h; y++) {
    const seen = new Set<number>()
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (cells[i] !== WHITE) continue
      const v = numbers[i] ?? 0
      if (v > 0) {
        if (seen.has(v)) return false
        seen.add(v)
      }
    }
  }
  for (let x = 0; x < w; x++) {
    const seen = new Set<number>()
    for (let y = 0; y < h; y++) {
      const i = y * w + x
      if (cells[i] !== WHITE) continue
      const v = numbers[i] ?? 0
      if (v > 0) {
        if (seen.has(v)) return false
        seen.add(v)
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (cells[i] !== BLACK) continue
      if (x + 1 < w && cells[i + 1] === BLACK) return false
      if (y + 1 < h && cells[i + w] === BLACK) return false
    }
  }

  return componentsOf(cells, w, h, WHITE).length === 1
}

export interface RuleSolveResult {
  ok: boolean
  solution: number[] | null
  contradiction: boolean
  saturated: boolean
  usedProbing: boolean
}

export function solveByRules(
  numbers: ArrayLike<number>,
  size: number,
  w: number,
  h: number,
  probing = true,
  maxRounds = 400,
): RuleSolveResult {
  const grid = initialGrid(size)
  let usedProbing = false

  for (let round = 0; round < maxRounds; round++) {
    if (!propagate(grid, numbers, w, h)) {
      return { ok: false, solution: null, contradiction: true, saturated: false, usedProbing }
    }

    let unknown = -1
    for (let i = 0; i < size; i++) {
      if (grid[i] === EMPTY) {
        unknown = i
        break
      }
    }
    if (unknown < 0) {
      const solution = Array.from(grid)
      const ok = isValidSolution(solution, numbers, w, h)
      return {
        ok,
        solution: ok ? solution : null,
        contradiction: false,
        saturated: ok,
        usedProbing,
      }
    }

    if (!probing) {
      return { ok: false, solution: null, contradiction: false, saturated: false, usedProbing }
    }

    usedProbing = true
    const forced: Array<{ index: number; value: number }> = []
    for (let i = 0; i < size; i++) {
      if (grid[i] !== EMPTY) continue
      let blackImpossible = false
      let whiteImpossible = false
      {
        const trial = Int8Array.from(grid)
        trial[i] = BLACK
        if (!propagate(trial, numbers, w, h)) blackImpossible = true
      }
      {
        const trial = Int8Array.from(grid)
        trial[i] = WHITE
        if (!propagate(trial, numbers, w, h)) whiteImpossible = true
      }
      if (blackImpossible && whiteImpossible) {
        return { ok: false, solution: null, contradiction: true, saturated: false, usedProbing }
      }
      if (blackImpossible !== whiteImpossible) {
        forced.push({ index: i, value: blackImpossible ? WHITE : BLACK })
      }
    }

    if (!forced.length) {
      return { ok: false, solution: null, contradiction: false, saturated: false, usedProbing }
    }
    for (const { index, value } of forced) {
      if (grid[index] === EMPTY) grid[index] = value
    }
  }

  return { ok: false, solution: null, contradiction: false, saturated: false, usedProbing }
}
