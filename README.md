# 数壹 Hitori

一个基于 Web 的数壹（Hitori）谜题游戏，原生 SVG 渲染，内置逻辑解题器。

## 在线体验

```bash
npm install
npm start
```

`npm start` 会等开发服务就绪后用默认浏览器打开 **http://127.0.0.1:5183/**。

> 也可以用 `npm run dev`，但不会自动打开浏览器。

## 游戏规则

- 每一行、每一列中，未涂黑的相同数字不能出现两次
- 黑格不能上下左右相邻
- 所有未涂黑的格子必须连通

## 操作

| 操作 | 说明 |
|------|------|
| 左键点格 | 循环：空 → 黑 → 白标记 → 空 |
| 右键点格 | 反向循环 / 清除 |
| 按住拖动 | 连续涂写 |
| 滚轮 / 中键拖拽 | 缩放 / 平移画布 |
| Z / Shift+Z / Y | 撤销 / 重做 |
| C / H / S / Esc | 检查 / 提示一格 / 显示解 / 清空 |
| R / L / P / M | 随机抽题 / 逻辑解题 / 暂停回放 / 音效开关 |
| 0 / + / - | 视图复位 / 放大 / 缩小 |

## 数据存放

运行 `npm start` / `npm run dev` 时，题库、进度和上次题目保存在项目内 `data/` 目录；静态部署时自动降级到浏览器 localStorage。

## 功能

- **题库**：内置多道题，题目均校验唯一解
- **自定义题板**：在侧边栏编辑题面，载入后即可游玩，支持保存、编辑、删除与唯一解校验
- **图片导入**：`npm run import-image` 可识别题面图片并写入题库
- **实时校验**：冲突与违规位置即时高亮，满足的条件同步变灰
- **逻辑解题**：规则引擎逐帧回放，显示每一步理由；回放中按钮变为停止，按 `P` 暂停/继续
- **提示一格 / 显示解**：提示优先揭示所有解一致的格子，显示解直接填入可行答案
- **撤销/重做**：按手势分组，一次拖拽只需一步撤销
- **进度保存**：自动保存当前题目进度，刷新不丢失
- **音效特效**：Web Audio 合成拨弦、水滴与落子动画，无外部音频资源
- **缩放/平移**：滚轮缩放，中键或 `Shift` 拖拽平移

## 技术栈

- Vite + TypeScript
- 原生 SVG（无框架）
- Web Audio 合成音效（无外部资源）
- localStorage / 项目内 `data/` 存储进度与题库

## 项目结构

```
src/
  main.ts
  core/
    app.ts / ui.ts / view.ts      界面、交互、缩放、回放控制
    store.ts / library.ts         题库、进度、上次题目存储
    audio.ts / fx.ts              音效与落子特效
  game/
    adapter.ts                    游戏规则接入
    rules.ts                      推理规则
    logic.ts                      逻辑解题回放
    render.ts / state.ts          SVG 渲染与盘面状态
    validate.ts / solver.ts       实时校验与回溯求解
    puzzles.ts / puzzles-data.ts  题库加载与静态题库
```

## 识图导入

```bash
# 预览：自动识别网格与 1–35 的数字，并打印数字网格
npm run import-image -- 题板.png

# 指定尺寸（默认自动识别，识别不准时可手动指定）
npm run import-image -- 题板.png --width 35 --height 35

# 写入题库；--verify 启动项目 solver 校验唯一解（大图较慢，超时只警告）
npm run import-image -- 题板.png --append --verify

# 某个字形簇数字识别错了：按打印出的「簇号=数字」人工覆盖
npm run import-image -- 题板.png --map 5=4,11=9
```

识别流程：投影暗像素找网格线 → 每格墨迹连通块切成 1–2 个数字字形 → 按字高归一化后聚类 → 多字体模板匹配定值 → 拼回每格数字 → 打印预览并可写入题库。

| 参数 | 说明 |
|------|------|
| `--width N` / `--height N` / `--size N` | 手动指定网格尺寸；默认自动识别 |
| `--name 名称` | 题库中显示的名称（默认 `识图 · 宽×高`） |
| `--series 系列` | 题库系列，默认 `human` |
| `--append` | 追加写入 `src/game/puzzles-data.ts` |
| `--verify` | 调 solver 校验唯一解并生成参考解；超时只警告，不写参考解 |
| `--map 簇号=数字,...` | 人工覆盖字形簇的识别结果 |
| `--dry` | 只识别预览，不校验、不写入 |

已知限制：

- 只支持格子内直接印数字的标准题图，不支持带额外标记/彩色的题图；
- 巨大棋盘（如 35×35）的 `--verify` 需要 ~30s，超时或搜索预算用尽时只写题面、不写参考解；
- `npm run gen` 会重写 `src/game/puzzles-data.ts`，识图导入的条目也会被覆盖，需要重新导入。

## 命令

```bash
npm run dev       # 开发服务
npm start         # 开发服务 + 自动打开浏览器
npm run build     # tsc --noEmit + vite build
npm run import-image -- 题板.png   # 识图导入（预览）
npm run gen       # 重新生成题库
npm run check     # 审计题库
npm run verify    # 参考解、逻辑回放与交互验证
npm run audit     # 逐题审计逻辑解题
```
