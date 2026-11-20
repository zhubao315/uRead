---
type: docs
title: uRead Listen 架构
description: "三类 SpeechEngine + 统一播放状态机，按用户点击按需朗读。"
---

## 引擎

| 引擎 | 数据来源 | 网络 | 文件 | 定位 |
| --- | --- | --- | --- | --- |
| CachedAudioEngine | 已存在且 content_hash 匹配的 WAV | 仅取静态文件 | 已存在，不新增 | 优先播放 |
| NativeSpeechEngine | 浏览器 `speechSynthesis` | 无 | 不生成 | V1 默认，任意笔记可听 |
| StreamingSpeechEngine | TTS Gateway（未来） | HTTPS | 内存暂存 | V3，需独立服务端 |

优先级：缓存 WAV → 用户选择 / 设备原生 → 在线高质量 → 失败回退原生。

## 播放状态

`idle → loading → ready → playing → paused → buffering → completed → error`

同一时刻只允许一个会话；切换内容必须先 `stop()`，并清理 utterance 队列、fetch、AbortController、timer、object URL。

## 文本层

Markdown 不直接送语音引擎：去 frontmatter / wikilink 语法 / 图片 / 代码块 / 表格竖线，保留作者原意；
按标题→段落→句子分级切分，每段有稳定 id，保留原文映射用于高亮与点击续读。

## 进度

键：`uread:listen:${content_hash}`（兼容 `uread:audio:${content_hash}`）。
保存 segment_index / sentence_index / rate / voice_id / last_played_at / completed。
只存本机，不宣称跨设备同步。
