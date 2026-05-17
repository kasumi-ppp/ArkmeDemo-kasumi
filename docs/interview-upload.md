# Codex Interview Upload

本文件用于本地验证候选人 Codex 过程日志是否能按“每轮对话结束后触发一次”的准实时语义上传到线上 OSS。

## 实时定义

这里的“实时”不是每秒同步，也不是流式同步，而是：

```text
每次完整的用户输入 + AI 回复结束后，先写入本地日志，再触发一次上传。
```

每次上传会更新两个文件槽位：

- `codex.iteration_markdown`
- `codex.iteration_ui_data`

## 环境变量

默认服务 Host：

```text
https://team.jotmo.cc
```

真实上传前必须由外部面试平台、上层提示词或研发同事显式提供：

```sh
export CODEX_INTERVIEW_CANDIDATE_UID="cand_xxx"
export CODEX_INTERVIEW_EXAM_KEY="interview-YYYYMMDDHHmm"
```

可选覆盖服务 Host：

```sh
export CODEX_INTERVIEW_API_BASE="https://team.jotmo.cc"
```

可选 Codex 会话标识：

```sh
export CODEX_INTERVIEW_CODEX_SESSION_ID="<optional-codex-session-id>"
```

不要从候选人姓名、本机用户名、Git 信息、目录名或时间戳推断 `candidate_uid` 和 `exam_key`。

## 本地 dry-run

dry-run 只打印请求体，不调用线上接口：

```sh
pnpm codex:upload-interview -- --dry-run
```

## 真实上传

```sh
pnpm codex:upload-interview
```

脚本会执行：

1. `POST /api/public/v1/interview/sessions/register`
2. 对 `codex.iteration_markdown` 调用 `prepare-upload`
3. 对返回的 `upload_url` 执行 `PUT`
4. 对 `codex.iteration_ui_data` 调用 `prepare-upload`
5. 对返回的 `upload_url` 执行 `PUT`

成功后会在本地写入：

```text
.codex/interview-upload-last.json
```

研发同事可以用其中的 `object_key`、`prepare_uid`、`sha256` 和线上 latest 指针核对每轮是否产生了新上传。
