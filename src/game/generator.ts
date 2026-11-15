/**
 * 数壹题库生成器
 *
 * 1. 随机涂黑一组互不相邻的格子，保持白格连通；
 * 2. 给白格染上行列内互不相同的数字；
 * 3. 每个黑格复制同一行/列（优先相邻）某个白格的数字；
 * 4. 用局部搜索消灭替代解：找出替代解后，修改「本解为黑、替代解为白」
 *    格子的数字，让替代解出现行列重复，同时不影响本解；
 * 5. 只保留恰好一解的题面。
 */

import type { Difficulty } from '../core/types'
import { BLACK, encodeCells, encodeNumbers, WHITE } from './types.ts'
import { componentsOf, solveByRules } from './rules.ts'
import { collectSolutions, countSolutions } from './solver.ts'

export interface RawPuzzleOut {
  id: string
  name: string
  width: number
  height: number
  difficulty: Difficulty
  series: string
  board: string
  solution: string
}

interface GenSpec {
  w: number
  h: number
  blackRatio: number
  seed: number
  difficulty: Difficulty
  name: string
  series: string
  attempts: number
  maxNodes: number
  requireLogic: boolean
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], rng: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = list[i]!
    list[i] = list[j]!
    list[j] = tmp
  }
  return list
}

function hasBlackNeighbor(cells: ArrayLike<number>, w: number, h: number, i: number): boolean {
  const x = i % w
  const y = (i / w) | 0
  return (
    (x > 0 && cells[i - 1] === BLACK) ||
    (x + 1 < w && cells[i + 1] === BLACK) ||
    (y > 0 && cells[i - w] === BLACK) ||
    (y + 1 < h && cells[i + w] === BLACK)
  )
}

function whiteConnected(cells: ArrayLike<number>, w: number, h: number): boolean {
  return componentsOf(cells, w, h, WHITE).length <= 1
}

function generatePattern(
  w: number,
  h: number,
  blackRatio: number,
  rng: () => number,
): { cells: number[]; blackCount: number } {
  const n = w * h
  const cells = new Array<number>(n).fill(WHITE)
  const target = Math.max(1, Math.round(n * blackRatio))
  const order = shuffle(
    Array.from({ length: n }, (_, i) => i),
    rng,
  )
  let blackCount = 0

  for (const i of order) {
    if (blackCount >= target) break
    if (cells[i] !== WHITE) continue
    if (hasBlackNeighbor(cells, w, h, i)) continue
    cells[i] = BLACK
    if (!whiteConnected(cells, w, h)) {
      cells[i] = WHITE
      continue
    }
    blackCount++
  }
  return { cells, blackCount }
}

/**
 * 把黑格补到极大：任何还能涂黑且不破坏白格连通的格子都涂黑。
 * 这样求解器无法通过「再多涂黑几格」构造替代解。
 */
function maximizeBlacks(cells: number[], w: number, h: number, rng: () => number): number {
  const n = w * h
  let changed = true
  while (changed) {
    changed = false
    const order = shuffle(
      Array.from({ length: n }, (_, i) => i),
      rng,
    )
    for (const i of order) {
      if (cells[i] !== WHITE) continue
      if (hasBlackNeighbor(cells, w, h, i)) continue
      cells[i] = BLACK
      if (!whiteConnected(cells, w, h)) {
        cells[i] = WHITE
        continue
      }
      changed = true
    }
  }
  let count = 0
  for (const v of cells) if (v === BLACK) count++
  return count
}

/** 给白格染色：同一行/列的白格数字互不相同 */
function colorWhites(cells: ArrayLike<number>, w: number, h: number, rng: () => number): number[] {
  const n = w * h
  const numbers = new Array<number>(n).fill(0)
  const palette = w + h + 6
  const order = shuffle(
    Array.from({ length: n }, (_, i) => i).filter((i) => cells[i] === WHITE),
    rng,
  )

  for (const i of order) {
    const used = new Set<number>()
    const x = i % w
    const y = (i / w) | 0
    for (let k = 0; k < w; k++) {
      const j = y * w + k
      if (cells[j] === WHITE && numbers[j]! > 0) used.add(numbers[j]!)
    }
    for (let k = 0; k < h; k++) {
      const j = k * w + x
      if (cells[j] === WHITE && numbers[j]! > 0) used.add(numbers[j]!)
    }
    const available: number[] = []
    for (let v = 1; v <= palette; v++) if (!used.has(v)) available.push(v)
    numbers[i] = available[Math.floor(rng() * available.length)] ?? 1
  }
  return numbers
}

/** 每个黑格复制同行/列（优先相邻）白格的数字 */
function assignBlackNumbers(
  cells: ArrayLike<number>,
  numbers: number[],
  w: number,
  h: number,
  rng: () => number,
): boolean {
  for (let i = 0; i < w * h; i++) {
    if (cells[i] !== BLACK) continue
    const x = i % w
    const y = (i / w) | 0

    const adjacent: number[] = []
    const along: number[] = []
    if (x > 0 && cells[i - 1] === WHITE) adjacent.push(i - 1)
    if (x + 1 < w && cells[i + 1] === WHITE) adjacent.push(i + 1)
    if (y > 0 && cells[i - w] === WHITE) adjacent.push(i - w)
    if (y + 1 < h && cells[i + w] === WHITE) adjacent.push(i + w)

    for (let k = 0; k < w; k++) {
      const j = y * w + k
      if (j !== i && cells[j] === WHITE) along.push(j)
    }
    for (let k = 0; k < h; k++) {
      const j = k * w + x
      if (j !== i && cells[j] === WHITE) along.push(j)
    }

    const pool = adjacent.length > 0 && rng() < 0.8 ? adjacent : along
    if (pool.length === 0) return false
    const src = pool[Math.floor(rng() * pool.length)]!
    numbers[i] = numbers[src]!
  }
  return true
}

function sameSolution(a: ArrayLike<number>, b: ArrayLike<number>, size: number): boolean {
  for (let i = 0; i < size; i++) if (a[i] !== b[i]) return false
  return true
}

interface AttemptStats {
  patternFail: number
  assignFail: number
  notUnique: number
  timeout: number
  logicFail: number
}

function attemptPuzzle(
  spec: GenSpec,
  rng: () => number,
  stats: AttemptStats,
): { numbers: number[]; solution: number[] } | null {
  const { w, h } = spec
  const size = w * h

  const { cells } = generatePattern(w, h, spec.blackRatio, rng)
  const blackCount = maximizeBlacks(cells, w, h, rng)
  if (blackCount < Math.max(1, Math.round(size * spec.blackRatio * 0.5))) {
    stats.patternFail++
    return null
  }

  const numbers = colorWhites(cells, w, h, rng)
  if (!assignBlackNumbers(cells, numbers, w, h, rng)) {
    stats.assignFail++
    return null
  }

  // —— 局部搜索：不断修改「本解为黑、替代解为白」格子的数字，消灭替代解 ——
  let refined = false
  for (let iter = 0; iter < 600; iter++) {
    const out = collectSolutions(numbers, size, w, h, 3, spec.maxNodes)
    if (out.timedOut) {
      stats.timeout++
      return null
    }
    if (out.solutions.length === 1) {
      refined = true
      break
    }

    let alt: number[] | null = null
    for (const sol of out.solutions) {
      if (!sameSolution(sol, cells, size)) {
        alt = sol
        break
      }
    }
    if (!alt) break

    // 只改「本解是黑、替代解是白」的格子：不会影响本解，却能让替代解出现重复数字
    const candidates: number[] = []
    for (let i = 0; i < size; i++) {
      if (cells[i] === BLACK && alt[i] === WHITE) candidates.push(i)
    }
    shuffle(candidates, rng)

    let changed = false
    for (const x of candidates) {
      const xr = x % w
      const xy = (x / w) | 0
      const pool: number[] = []
      for (let k = 0; k < w; k++) {
        const j = xy * w + k
        if (j !== x && alt[j] === WHITE && numbers[j]! > 0) pool.push(j)
      }
      for (let k = 0; k < h; k++) {
        const j = k * w + xr
        if (j !== x && alt[j] === WHITE && numbers[j]! > 0) pool.push(j)
      }
      if (pool.length === 0) continue
      const src = pool[Math.floor(rng() * pool.length)]!
      numbers[x] = numbers[src]!
      changed = true
      break
    }
    if (!changed) break
  }

  if (!refined) {
    stats.notUnique++
    return null
  }

  const counted = countSolutions(numbers, size, w, h, 2, spec.maxNodes)
  if (counted.timedOut) {
    stats.timeout++
    return null
  }
  if (counted.count !== 1) {
    stats.notUnique++
    return null
  }

  if (spec.requireLogic) {
    const rules = solveByRules(numbers, size, w, h, true, 240)
    if (!rules.ok || !rules.saturated) {
      stats.logicFail++
      return null
    }
  }

  return { numbers, solution: cells }
}

const SPECS: GenSpec[] = [
  {
    w: 6,
    h: 6,
    blackRatio: 0.22,
    seed: 0x48495401,
    difficulty: 'easy',
    name: '初见数壹',
    series: '入门',
    attempts: 300,
    maxNodes: 60_000,
    requireLogic: true,
  },
  {
    w: 7,
    h: 7,
    blackRatio: 0.24,
    seed: 0x48495402,
    difficulty: 'easy',
    name: '行列初分',
    series: '入门',
    attempts: 400,
    maxNodes: 80_000,
    requireLogic: true,
  },
  {
    w: 8,
    h: 8,
    blackRatio: 0.25,
    seed: 0x48495403,
    difficulty: 'medium',
    name: '影格回廊',
    series: '进阶',
    attempts: 500,
    maxNodes: 100_000,
    requireLogic: false,
  },
  {
    w: 9,
    h: 9,
    blackRatio: 0.26,
    seed: 0x48495404,
    difficulty: 'medium',
    name: '涂黑之环',
    series: '进阶',
    attempts: 600,
    maxNodes: 130_000,
    requireLogic: false,
  },
  {
    w: 10,
    h: 10,
    blackRatio: 0.27,
    seed: 0x48495405,
    difficulty: 'hard',
    name: '黑潮涌动',
    series: '挑战',
    attempts: 700,
    maxNodes: 160_000,
    requireLogic: false,
  },
  {
    w: 10,
    h: 10,
    blackRatio: 0.3,
    seed: 0x48495406,
    difficulty: 'hard',
    name: '壹线天',
    series: '挑战',
    attempts: 800,
    maxNodes: 180_000,
    requireLogic: false,
  },
]

export function generatePuzzles(): RawPuzzleOut[] {
  const out: RawPuzzleOut[] = []
  for (const spec of SPECS) {
    const rng = mulberry32(spec.seed)
    const stats: AttemptStats = {
      patternFail: 0,
      assignFail: 0,
      notUnique: 0,
      timeout: 0,
      logicFail: 0,
    }
    let made: { numbers: number[]; solution: number[] } | null = null
    const t0 = Date.now()
    for (let attempt = 0; attempt < spec.attempts; attempt++) {
      made = attemptPuzzle(spec, rng, stats)
      if (made) break
    }
    if (!made) {
      console.error(`[数壹 gen] ${spec.name} 失败统计：`, stats)
      throw new Error(`[数壹 gen] ${spec.name} 在 ${spec.attempts} 次尝试内没有生成合法题`)
    }
    const black = made.solution.filter((v) => v === BLACK).length
    console.log(`[数壹 gen] ${spec.name} ${spec.w}×${spec.h}：黑格 ${black}，${Date.now() - t0}ms`)
    out.push({
      id: `hitori-${spec.w}x${spec.h}-${spec.seed.toString(36)}`,
      name: spec.name,
      width: spec.w,
      height: spec.h,
      difficulty: spec.difficulty,
      series: spec.series,
      board: encodeNumbers(made.numbers),
      solution: encodeCells(made.solution),
    })
  }
  return out
}
