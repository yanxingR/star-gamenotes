# 星GN · 游戏手札

## 入口

- 新版：`/v2/`
- 根路径 `/`：自动跳转 `/v2/`
- 经典旧版：`/old.html`

v2 右上角「旧版」直接跳 `old.html`；old.html 的「新版」跳 `v2/`。

## 数据

1. Supabase `games` 表（实时）
2. localStorage 缓存 `starGN_games`
3. 静态兜底：`v2/data.js`

`data.json` 是导出源文件；`build_data.py` 读取它并生成 `v2/data.js`。

`.github/workflows/sync-data.yml` 每 6 小时从 Supabase 导出 `data.json`，有变化时重建并提交 `v2/data.js`。

## 字段与标签

- `games.name_en`：英文名，不显示，只参与搜索；执行 `v2/add-name-en.sql` 添加并填 75 款。
- `games.genre`：类型；`v2/add-indie-tag.sql` 追加「独立」，`v2/add-turnbased-tag.sql` 追加「回合制」。
- 旧版 `old.html` 已移除类型 tag 和简介，只保留封面、标题、分数、维度、档位；简介和类型只在 v2 使用。

## GitHub Pages

Settings → Pages → Deploy from a branch → `main` / `(root)`

- 新版：`https://<用户名>.github.io/<仓库名>/v2/`
- 经典旧版：`https://<用户名>.github.io/<仓库名>/old.html`

## 目录

- `v2/`：新版站点（含本地 `supabase.js`、奖项与投票）
- `old.html`：经典旧版
- `generator.html`：评分生成器（old.html 内链接）
- `data.json` / `build_data.py`：数据导出与静态兜底生成
- `.github/workflows/sync-data.yml`：每 6 小时同步数据
- `admin.html`：本地后台，已 gitignore，不部署
- `星GN.xlsx` / `星GN.csv`：本地原始表格，已 gitignore，不部署

## 注意

- `v2/supabase.js` 是本地 Supabase SDK，必须随 v2 一起上传；缺失时会回退 unpkg，国内网络可能打不开。
- 投票后端更新后需在 Supabase SQL Editor 执行 `v2/supabase-votes.sql`；独立游戏标签执行 `v2/add-indie-tag.sql`，回合制执行 `v2/add-turnbased-tag.sql`，英文名执行 `v2/add-name-en.sql`。
- `admin.html` 现在优先加载 `v2/supabase.js`，带 8 秒超时、连接状态和重试按钮；建议用本地 HTTP 打开，而不是 file://。
- `admin.html` 仅本地使用，不要部署。保存前必须先执行 `v2/add-name-en.sql`，否则 `name_en` 列不存在会导致保存失败。
