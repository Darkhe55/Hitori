/**
 * 数壹 —— 逻辑解题回放计划
 */

import type { GameState, LogicPlan, PlaybackFrame, Puzzle } from '../core/types'
import { findSolution } from './solver'
import { propagate, type RuleKind } from './rules'
import {
  asHitoriPuzzle,
  asHitoriState,
  BLACK,
  EMPTY,
  WHITE,
  type HitoriState,
} from './types'

const RULE_INFO: Record<RuleKind | 'probe' | 'search', { rule: number; label: string }> = {
  duplicate: { rule: 1, label: '行列重复：另一个同数字格必须涂黑' },
  adj: { rule: 2, label: '黑格不能相邻，四周必须是白格' },
  connect: { rule: 3, label: '白格连通性' },
  sandwich: { rule: 4, label: '夹心规则：A ? A 中间必为白格' },
  probe: { rule: 5, label: '反证：另一种状态会立刻矛盾' },
  search: { rule: 6, label: '回溯试探：该格最终是这一状态' },
}

export function planLogicSolve(puzzle: Puzzle, initialState: GameState): LogicPlan {
  const p = asHitoriPuzzle(puzzle)
  const s = asHitoriState(initialState)
  const w = s.width
  const h = s.height
  const size = w * h
  const numbers = p.numbers ?? []

  const emptyPlan: LogicPlan = {
    puzzleId: p.id,
    frames: [],
    finalState: null,
    ruleSteps: 0,
    saturated: false,
  }
  if (numbers.length !== size) return emptyPlan

  const grid = s.cells.slice()
  const displayed = s.cells.slice()
  const frames: PlaybackFrame[] = []
  let lastKind = ''
  let streak = 0

  const emit = (index: number, to: number, kind: RuleKind | 'probe' | 'search'): void => {
    const from = displayed[index] ?? EMPTY
    if (from === to) return
    displayed[index] = to
    if (kind === lastKind) streak++
    else {
      lastKind = kind
      streak = 1
    }
    const info = RULE_INFO[kind]
    frames.push({ rule: info.rule, label: info.label, move: { index, from, to }, streak })
  }

  const onSet = (index: number, value: number, kind: RuleKind): void => {
    emit(index, value, kind)
  }

  if (!propagate(grid, numbers, w, h, onSet)) return emptyPlan

  let saturated = true
  for (let round = 0; round < size * 2; round++) {
    let unknown = -1
    for (let i = 0; i < size; i++) {
      if (grid[i] === EMPTY) {
        unknown = i
        break
      }
    }
    if (unknown < 0) break
    if (frames.length > 8000) {
      saturated = false
      break
    }

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
      if (blackImpossible && whiteImpossible) return emptyPlan
      if (blackImpossible !== whiteImpossible) {
        forced.push({ index: i, value: blackImpossible ? WHITE : BLACK })
      }
    }

    if (!forced.length) {
      saturated = false
      break
    }
    for (const { index, value } of forced) {
      if (grid[index] === EMPTY) {
        grid[index] = value
        emit(index, value, 'probe')
      }
    }
    if (!propagate(grid, numbers, w, h, onSet)) return emptyPlan
  }

  let stillUnknown = false
  for (let i = 0; i < size; i++) {
    if (grid[i] === EMPTY) {
      stillUnknown = true
      break
    }
  }

  if (stillUnknown) {
    const found = findSolution(numbers, size, w, h, 800_000)
    if (!found.solution) return emptyPlan
    for (let i = 0; i < size; i++) {
      if (grid[i] === found.solution[i]) continue
      grid[i] = found.solution[i]!
      emit(i, found.solution[i]!, 'search')
    }
    saturated = false
  }

  const finalState: HitoriState = {
    puzzleId: s.puzzleId,
    width: w,
    height: h,
    cells: Array.from(grid),
    givens: s.givens.slice(),
  }

  return {
    puzzleId: p.id,
    frames,
    finalState,
    ruleSteps: frames.length,
    saturated,
  }
}
