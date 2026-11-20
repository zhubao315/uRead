---
type: docs
title: uRead Listen 现状审计
description: "听读能力的真实代码审计与可复用/需替换清单。"
---

审计时间：2026-11-20

## 当前实现

- `scripts/sync-notes.mjs` 的 `maybeAudio()` 在同步时调用 TTS 预生成 WAV，写到 `public/audio/`；TTS 服务为内网 `192.168.1.3:40000`，当前停机。
- `public/notes/manifest.json`：1595 篇笔记，其中仅 2 篇仍与音频哈希匹配，8 个音频文件成为孤儿。
- `PublicNoteDetailView.tsx`：仅当 `note.audio === true` 显示 `<audio controls>`；否则显示「这篇笔记目前没有音频。」——任意笔记无法即时朗读。
- `ReaderHubView.tsx`：只聚合有 WAV 的笔记 + 2 本电子书，无音频笔记完全缺失。
- `book-library/reader.html`：EPUB 用 foliate-js，PDF 用浏览器原生阅读器，均无朗读能力。
- 仓库无 `speechSynthesis` / `SpeechSynthesisUtterance` 使用。
- 无播放会话状态机、无段落跟随、无语音设置、无睡眠定时。

## 可复用

- 笔记正文与 `content_hash`（按需加载，按内容版本定位）。
- 已分区的笔记正文结构（原文 / 理解 / 延伸）。
- `uread:audio:${content_hash}` 的旧进度键需兼容。
- 本机阅读进度 `uread:book:${id}`。
- 审核后的公开范围与内容基线，不受听读改造影响。

## 需替换 / 新增

- 把「同步时预生成音频」与「用户点击时朗读」解耦。
- 新增 NativeSpeechEngine（Web Speech API），零文件、零网络、不上传正文。
- 新增统一文本清理与分段层（Markdown → 朗读段落）。
- 新增播放状态机、段落高亮/滚动、音速/音色选择、进度保存。
- 保留 CachedAudioEngine 播放已有 WAV（内容哈希匹配才用）。
- StreamingSpeechEngine 留接口，等公网 TTS Gateway 具备后再接，不伪称已流式。

## 边界

原生语音是设备能力，不保证后台锁屏连续播放、逐字高亮或统一音色；
不得把它包装成音频文件播放器，也不得虚构秒级时间轴。
