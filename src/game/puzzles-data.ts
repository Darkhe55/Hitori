/* 自动生成，勿手改。运行 npm run gen 重新生成。 */
export interface RawPuzzle {
  id: string
  name: string
  width: number
  height: number
  difficulty: 'easy' | 'medium' | 'hard' | 'custom'
  series: string
  /** 题面编码串（格式由 src/game/puzzles.ts 解析） */
  board: string
  /** 参考解编码串（没有则留空） */
  solution?: string
}

export const RAW_PUZZLES: RawPuzzle[] = [
  { id: "hitori-6x6-k21rlt", name: "初见数壹", width: 6, height: 6, difficulty: 'easy', series: "入门", board: "0d040e0b0e04010b0e06080g06050h0f0e07010g0d060604080c0h0c0f08040e02080206", solution: "221221122222221212222122212221221222" },
  { id: "hitori-7x7-k21rlu", name: "行列初分", width: 7, height: 7, difficulty: 'easy', series: "入门", board: "020b0j0h0g0g010e0b03030d0b06070g030k0b0b0907060b0f080f0f0d03050f080j020e0e05040j050902090103040i03", solution: "1222212212122222122121221221222212212122212221222" },
  { id: "hitori-8x8-k21rlv", name: "影格回廊", width: 8, height: 8, difficulty: 'medium', series: "进阶", board: "04090b060b090i0i0h0h0b0e0b0j080i0a0e0b0f0c0m080j0d0d070b0a020g0f0j06090b0h040f0d0j05090g0g0c070d0b0k0k0k010208080k0k0j0l080h0606", solution: "2212212112221222221222122121212212222221221212222121221212222221" },
  { id: "hitori-9x9-k21rlw", name: "涂黑之环", width: 9, height: 9, difficulty: 'medium', series: "进阶", board: "0404070808050j0j0b0n0e0e030d0d020106040k0h040g070a0a060i010l060203090g030o0e09060a030c0d0f020j0d0h0f030h0e0m0o0o0h050f0k0c0f0i0103060d0e0e0a0f030l0k0m0e0e0h060c03", solution: "122122122221212221122222122222121221212222122222121222121212212222221221212212222" },
  { id: "hitori-10x10-k21rlx", name: "黑潮涌动", width: 10, height: 10, difficulty: 'hard', series: "挑战", board: "0l010n040g0g0o0a0a0a0i0l0e020a020e0j0i0b070l0q09030g0d0j0e0j060d050o0g0c090h0k0k060k0e0a0307020204060h0e0d0d010k0e0309010h0b0e020o0k070q0905040i09020n0m050q0d0p080l0l0n0c0c0m0g0k010509090j0c080e0p0d0h", solution: "2222122121122122122221222121222222222212121212212222212212211212212212222122212221222122222212122212" },
  { id: "hitori-10x10-k21rly", name: "壹线天", width: 10, height: 10, difficulty: 'hard', series: "挑战", board: "0n08020b0i0d0a0h0707070o09040i060e0h0e0c070j09040e020m0e0d0c020q0g0i0608020n090o0b0c0l0o0608040j0f0m0c0d0h070808010p0p0p0l0l0h070p010j0n0m0e0j030h06010l0j0a050g0g030f0202040e0m0m03080a0g0g0d0a0n0d0m05", solution: "2222122121122122122222121222211222212122222212222222122121211221222212221222122221221222122212212122" },
]
