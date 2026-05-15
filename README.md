# Arkme Demo

这是一个用于候选人笔试的移动端前端 Demo。候选人需要克隆本项目后，在 Codex 客户端中根据给定需求继续迭代。

## 候选人答题流程

候选人克隆项目后，请用 Codex 客户端打开本项目，并先输入：

```text
请先阅读 AGENTS.md 和 docs/candidate-rules.md，然后按其中的答题规范完成后续需求。
```

`docs/candidate-rules.md` 是本项目内的答题标准。候选人不需要额外安装本地 Skill，但需要让 Codex 按该文件完成需求分析、代码修改、验证和记录。

## 本地测试入口

默认测试入口：

移动端 Demo：
http://127.0.0.1:5173/

消息测试后台：
http://127.0.0.1:5173/sendtest

若你电脑上的 5173 端口被占用，系统会自动按递增的方式创建新端口开启服务。

## Codex 迭代记录要求

候选人每次在 AI 编程工具中输入新的需求后，AI 助手应先检查上一轮输入输出是否已经同步写入当前候选人的个人 Markdown 日志和 UI 数据源。若缺失，应先补齐上一轮记录，再继续处理新的需求。

AI 助手还需要检查 `.codex/candidate-session.json` 是否已经存在，并确认其中的日志路径指向当前候选人的个人日志。若缺失，应先引导候选人明确输入自己的真实姓名，再创建个人日志文件。候选人名称不能从 GitHub、Git 配置、本机用户名、邮箱或目录名推断。

候选人每次使用 Codex 对项目进行一次需求分析、代码修改或验证后，都需要让 Codex 把本轮过程追加写入：

```text
docs/codex-logs/candidate-<候选人明确输入的姓名>-<本机用户名>-<时间戳>-<短哈希>.md
src/data/aiConversationLog.ts
```

每条记录必须包含：

- 时间
- 候选人在 Codex 中输入的内容
- AI 最终输出的结果
- 本轮改动文件
- 验证结果

其中 `docs/codex-iteration-log.md` 只是共享格式模板；`docs/codex-logs/` 下的个人日志用于源码审阅；`src/data/aiConversationLog.ts` 用于应用侧边栏里的“和AI编程工具对话”展示，初始为空，后续只写入当前候选人的记录。

最终提交 GitHub 前，请运行：

```sh
pnpm verify:answer
```

面试官会结合最终代码、Git 提交历史和 `docs/codex-logs/` 下的候选人个人日志判断候选人使用 AI 迭代项目的过程。
