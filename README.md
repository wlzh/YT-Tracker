# YouTube Channel Tracker

**实时追踪你关注的 YouTube 频道，订阅数变化、新视频上传，一个都不错过。**

---

## v2.0.0 - RSS 模式（2026-03-17）

**重大更新**：现在默认使用 RSS 模式，无需 API Key，无配额限制！

### 为什么改用 RSS？
- YouTube API 免费配额：10,000 单位/天
- API 模式下，56 个频道每次检查消耗 5,600 单位
- 每天只能检查 1-2 次就超限了
- RSS 是官方提供的免费接口，无限制！

### RSS 模式特点
- ✅ 无需 API Key
- ✅ 无配额限制
- ✅ 想检查多频繁都可以
- ✅ 官方接口，完全合规
- ⏱️ 5-30 分钟延迟（对于定时检查可忽略）

### API 模式（可选）
如果需要订阅数追踪功能，仍可切换到 API 模式：
- 近实时更新
- 支持订阅数变化通知
- 需要 API Key
- 受 10,000 单位/天配额限制

---

## 这个插件能做什么？

YouTube Channel Tracker 是一款 Chrome 浏览器扩展，帮你集中监控多个 YouTube 频道的核心数据。不需要打开 YouTube，不需要逐个翻看频道页面——点开插件弹窗，所有信息一目了然。

### 订阅数实时追踪

添加频道后，插件会自动定时拉取最新订阅数，并记录每日变化。你可以直接看到：

- 当前订阅人数
- 相比上次检查的增减（绿色增长 / 红色下降）
- 过去 30 天的订阅趋势迷你折线图（Sparkline）

### 新视频即时通知

插件会定期检查每个频道是否发布了新视频。一旦检测到：

- 浏览器右下角弹出桌面通知，显示频道名和视频标题
- 点击通知直接跳转到视频页面
- 插件图标上显示红色角标，标注未读新视频数量
- 弹窗顶部的「New Videos」区域列出所有新视频，附带缩略图和发布时间

### 频道详情页

点击任意频道卡片，打开独立的详情页面，查看该频道最近 5 个视频的完整数据：

- 播放量、点赞数、评论数
- 发布时间
- 缩略图预览，点击直达视频

---

## 核心功能一览

| 功能 | 说明 |
|------|------|
| 多频道管理 | 同时追踪任意数量的 YouTube 频道 |
| 智能识别输入 | 支持 YouTube URL、@handle、/c/ 自定义链接、/user/ 链接、频道 ID，粘贴即识别 |
| 订阅趋势图 | 30 天订阅数历史记录，Sparkline 可视化展示涨跌趋势 |
| 新视频检测 | 自动检测关注频道的新上传，推送桌面通知 |
| 自定义检查频率 | 5 / 10 / 15 / 30 / 60 分钟可选，按需调整 |
| API 配额估算 | 设置页实时显示每日预计消耗配额，避免超限 |
| 数据导出 | 一键导出所有追踪数据为 JSON 文件，方便备份和迁移 |
| API Key 验证 | 内置一键验证功能，粘贴 Key 后立即确认是否可用 |

---

## 使用方法

### 1. 安装插件

- 下载插件文件夹
- 打开 Chrome，访问 `chrome://extensions`
- 开启右上角「开发者模式」
- 点击「加载已解压的扩展程序」，选择插件文件夹

### 2. 配置 API Key

- 点击插件弹窗右上角的齿轮图标，进入设置页
- 输入你的 [YouTube Data API v3](https://console.cloud.google.com/apis/credentials) 密钥
- 点击「Validate」验证密钥是否有效

### 3. 添加频道

在插件弹窗的输入框中，粘贴以下任意格式：

```
https://www.youtube.com/@gxjdian
https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA
@gxjdian
UCX6OQ3DkcsbYNE6H8uQQuVA
```

点击「Add」，频道信息自动加载并开始追踪。

---

## 批量导入：从「订阅频道」一次性导入到插件

> 目标：把你 YouTube 账号里「订阅 → 频道」页面的所有订阅，批量导入到本插件的追踪列表。
>
> 说明：插件 UI 的输入框一次只能添加 1 个频道（这是设计如此）。因此批量导入推荐走 **DevTools Console 批处理**，不需要改插件代码。

### A. 导出订阅页面 HTML

1. 用 Chrome 登录你的 YouTube 账号
2. 进入：左侧「订阅内容」→「频道」（URL 通常是 `https://www.youtube.com/feed/channels`）
3. 滚动到底（确保所有订阅频道都已加载出来）
4. 保存页面 HTML（任选一种方式）：
   - 方式 1：`Ctrl/Cmd + S` → “网页，全部” 保存成 `.html`
   - 方式 2：安装 SingleFile 扩展保存（也可以）

### B. 从 HTML 提取所有 @handle

仓库内提供脚本：`tools/extract_handles_from_channels_html.py`

```bash
python3 tools/extract_handles_from_channels_html.py \
  "/path/to/所有订阅频道 - YouTube (...).html" \
  -o handles.txt
```

输出 `handles.txt`：每行一个 `@handle`（已去重）。

### C. 转成 Console 可用的 JSON 数组字符串

仓库内提供脚本：`tools/handles_to_console_json.py`

```bash
python3 tools/handles_to_console_json.py handles.txt -o handles.json
```

输出 `handles.json`（内容是一行 JSON 数组字符串），例如：

```json
["@gxjdian","@gxjdian", "@gxjdian"]
```

### D. 在插件里一键批量加入

1. 先在插件 Settings 里配置好 **YouTube Data API Key**（否则添加会报错：API key not set）
2. 打开插件弹窗（有输入框和 Add 按钮的那个）
3. 在弹窗里右键空白处 → **Inspect** → Console
4. 把下面脚本粘贴进去：

```js
// 1) 把 handles 替换成 handles.json 的内容（JSON 数组字符串）
const handles = ["@gxjdian","@gxjdian","@gxjdian"]; // ← 替换这里

// 2) 批量添加
(async () => {
  for (const h of handles) {
    try {
      const res = await chrome.runtime.sendMessage({ type: "addChannel", input: h });
      console.log("added", h, res);
    } catch (e) {
      console.warn("failed", h, e?.message || e);
    }
    // 小延迟，避免打太快
    await new Promise(r => setTimeout(r, 250));
  }
})();
```

运行后你会在 Console 里看到逐条 added/failed 的日志；插件列表也会逐渐出现新加入的频道。

### 4. 查看数据

- **弹窗主页**：查看所有频道的订阅数、增长趋势、新视频提醒
- **频道详情**：点击频道卡片，查看最近 5 个视频的播放/点赞/评论数据
- **桌面通知**：有新视频时自动弹出，点击直达

---

## 技术细节

- **Chrome Extension Manifest V3**，遵循最新的扩展标准
- 使用 Chrome Alarms API 实现后台定时检查，不依赖持久后台页面，省内存
- 调用 YouTube Data API v3，批量请求优化（每次最多 50 个频道合并查询），降低 API 配额消耗
- 所有数据存储在本地 `chrome.storage.local`，不上传任何信息到第三方服务器
- 纯原生 JavaScript，零依赖，零构建步骤

---

## 隐私说明

- 你的 YouTube API Key 仅存储在浏览器本地，不会发送到除 Google API 以外的任何服务器
- 插件不收集任何用户行为数据
- 所有网络请求仅发往 `googleapis.com`

---

## 获取 YouTube API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目（或选择已有项目）
3. 进入「API 和服务」→「库」，搜索并启用 **YouTube Data API v3**
4. 进入「凭据」→「创建凭据」→「API 密钥」
5. 复制密钥，粘贴到插件设置页

免费额度为每日 10,000 单位，追踪 10 个频道、每 15 分钟检查一次，每日约消耗 960 单位，完全够用。

---

## 常见问题

**Q: 免费额度够用吗？**

绰绰有余。默认设置下（15 分钟检查一次），追踪 10 个频道每天消耗不到 1,000 单位，远低于 10,000 的免费上限。设置页有实时配额估算，方便你调整。

**Q: 添加频道后为什么没有立即收到新视频通知？**

这是设计行为。首次添加频道时，插件会记录当前最新视频作为基线，避免已有视频被误报为「新视频」。之后该频道发布的视频才会触发通知。

**Q: 支持哪些浏览器？**

目前支持 Chrome 和所有基于 Chromium 的浏览器（Edge、Brave、Arc 等）。

**Q: 数据存在哪里？**

全部存在浏览器本地存储中。你可以通过设置页的「Export Data」按钮导出 JSON 备份。
