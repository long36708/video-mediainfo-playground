# MediaInfo.js 内存管理

## 内存占用分析

### 视频数据 vs MediaInfo 实例

| 内容 | 是否驻留内存 | 说明 |
|------|-------------|------|
| **视频数据** | ❌ 不会 | `readChunk` 返回的 `Uint8Array` 是临时的，每次调用后由 GC 回收 |
| **MediaInfo 实例** | ✅ 会 | 单例缓存，持有解析后的元数据 |
| **WASM 堆内存** | ✅ 会 | Emscripten 分配的内存，需要显式释放 |

### 不调用 `closeMediaInfo()` 的后果

1. **WASM 内存不释放** - 这是主要问题。MediaInfo.js 底层是 C++ 编译的 WASM，有自己的堆内存管理，需要显式调用 `close()` 释放。

2. **元数据缓存** - 解析后的轨道信息、格式信息等会一直保留。

3. **单例模式问题** - 由于使用了单例，即使重新调用 `getMediaInfo`，旧的实例也不会被释放。

## 当前实现

```typescript
/** 缓存的 MediaInfo 实例 */
let cachedMediaInfo: MediaInfo<FormatType> | null = null

/**
 * 关闭 MediaInfo 实例，释放资源
 */
export function closeMediaInfo(): void {
  if (cachedMediaInfo) {
    cachedMediaInfo.close()
    cachedMediaInfo = null
  }
}
```

## 优化方案

### 方案1: 页面卸载时自动清理

```typescript
// 在应用入口或模块初始化时注册
window.addEventListener('beforeunload', () => {
  closeMediaInfo()
})
```

### 方案2: 超时自动释放

```typescript
let cachedMediaInfo: MediaInfo<FormatType> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

async function getMediaInfo(options: GetMediaInfoOptions = {}) {
  // 清除之前的定时器
  if (closeTimer) clearTimeout(closeTimer)
  
  if (cachedMediaInfo) {
    cachedMediaInfo.reset()
    return cachedMediaInfo
  }

  // ... 创建实例 ...

  // 5 分钟无使用自动释放
  closeTimer = setTimeout(() => {
    closeMediaInfo()
  }, 5 * 60 * 1000)

  return cachedMediaInfo
}
```

### 方案3: 引用计数管理

```typescript
let cachedMediaInfo: MediaInfo<FormatType> | null = null
let refCount = 0

async function getMediaInfo(options: GetMediaInfoOptions = {}) {
  refCount++
  
  // ... 创建或返回实例 ...
}

export function releaseMediaInfo(): void {
  refCount--
  if (refCount <= 0) {
    closeMediaInfo()
    refCount = 0
  }
}
```

## 使用场景建议

| 场景 | 建议 |
|------|------|
| 单页短暂使用 | 可以不调用，页面关闭时浏览器自动清理 |
| 长期运行 SPA | 在适当时机调用 `closeMediaInfo()` |
| 频繁解析多个文件 | 使用超时自动释放或引用计数 |
| 组件化使用 | 在组件 `onUnmounted` 中调用 |

## 内存占用估算

- **MediaInfo 实例**: 通常几 KB
- **解析后的元数据**: 几 KB 到几十 KB
- **WASM 堆内存**: 几 MB（取决于解析的文件复杂度）

**总计**: 通常在 10MB 以内，不会造成严重的内存问题。

## 最佳实践

1. **长期运行的 SPA 应用**建议在适当时机调用 `closeMediaInfo()`
2. **单页短暂使用**可以不调用，页面关闭时浏览器会自动清理
3. **视频数据本身不会驻留内存**，不用担心大文件问题
4. **WASM 内存是主要关注点**，需要在合适的生命周期释放

## 相关代码文件

- `src/utils/mediaInfo.ts` - MediaInfo 工具函数

## 参考

- [MediaInfo.js 官方文档](https://github.com/buzz/mediainfo.js)
- [Emscripten 内存管理](https://emscripten.org/docs/porting/memory_model.html)
