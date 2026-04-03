# video-mediainfo-playground

基于 **mediainfo.js** 的 Web 版媒体文件分析工具，可在浏览器中直接解析视频/音频文件的技术参数和元数据。

## ✨ 功能特性

- 🎯 **纯客户端分析** - 无需服务器，所有处理在本地完成，保护隐私
- 📦 **支持多种格式** - 支持 99% 的常见音视频格式（MP4、MKV、AVI、MOV 等）
- 🔍 **详细技术参数** - 分辨率、帧率、帧数、比特率、编码格式等
- 🎨 **现代化 UI** - 响应式设计，支持拖拽上传
- 📊 **多轨道分析** - 支持视频轨、音频轨、字幕轨信息
- 💾 **结果导出** - 支持 JSON 格式复制和查看

## 📦 MediaInfo 能力集

### 支持的容器格式

**视频容器:** MP4, MKV, AVI, MOV, MPEG-TS, MPEG-PS, WMV, FLV, MXF, GXF, LXF, WebM 等

### 支持的视频编码

**H.26x 系列:** H.264/AVC, H.265/HEVC

**MPEG 系列:** MPEG-1/2 Video, MPEG-4 Visual (DivX, XviD)

**其他编码:** VP9, FFV1 等

### 支持的音频编码

**主流音频:** AAC, MP3, AC-3, E-AC-3, DTS

**无损音频:** FLAC, PCM

**专业音频:** Dolby E

### 支持的字幕格式

SRT, ASS/SSA, SAMI, VobSub, PGS, WebVTT, CEA-608/708, DVB Subtitle 等

### 可探测的技术参数

**通用信息:** 文件格式、文件大小、时长、总比特率、编码库、元数据标签

**视频轨道:**
- ✅ 分辨率（宽×高）
- ✅ 帧率（fps）
- ✅ **总帧数（FrameCount）**
- ✅ 扫描方式（隔行/逐行）
- ✅ 宽高比
- ✅ 色彩空间、色度抽样、位深度
- ✅ 编码 Profile/Level
- ✅ HDR 信息

**音频轨道:**
- ✅ 采样率（Hz/kHz）
- ✅ 声道数及布局
- ✅ 位深度（16bit/24bit/32bit）
- ✅ 比特率（固定/可变）
- ✅ 语言信息

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```
