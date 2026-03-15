# MediaInfo.js chunkSize 参数缺失导致的 size NaN 问题

## 问题描述

在使用 MediaInfo.js 解析本地视频文件时，遇到 `readChunk` 回调中 `size` 参数为 `NaN` 的问题：

```
readChunk: (size, offset) => {
  // size 为 NaN，导致文件读取失败
}
```

## 问题原因

### 1. chunkSize 参数没有默认值

`getMediaInfo` 函数的 `options` 参数中，`chunkSize` 没有设置默认值：

```typescript
async function getMediaInfo(options: GetMediaInfoOptions = {}) {
  // chunkSize 可能为 undefined
  const { chunkSize } = options
  
  cachedMediaInfo = await mediaInfoFactory({
    chunkSize,  // undefined 被传递给 MediaInfo.js
    // ...
  })
}
```

### 2. 单例缓存机制导致配置被忽略

`getMediaInfo` 使用了单例模式缓存 MediaInfo 实例：

```typescript
if (cachedMediaInfo) {
  cachedMediaInfo.reset()
  return cachedMediaInfo  // ⚠️ 直接返回缓存的实例，options 被忽略
}
```

这意味着第一次调用时设置的参数会一直被使用，后续调用传入的参数会被忽略。

## 为什么 URL 方法能正常工作？

使用 `getMediaInfoFromUrl` 解析网络视频时没有问题，原因如下：

1. **HTTP HEAD 请求获取 Content-Length**：提供了准确的文件大小
2. **Range 请求特性**：与 MediaInfo.js 的读取模式更匹配
3. **网络请求的异步特性**：给了 MediaInfo.js 更多的缓冲时间
4. **MediaInfo.js 内部容错**：对网络请求场景的 `chunkSize: undefined` 有更好的容错处理

## 解决方案

为 `chunkSize` 参数设置默认值：

```typescript
async function getMediaInfo(options: GetMediaInfoOptions = {}) {
  const { 
    format = 'object', 
    full = false, 
    coverData = false, 
    chunkSize = 256 * 1024  // ✅ 默认 256KB
  } = options

  cachedMediaInfo = await mediaInfoFactory({
    format,
    full,
    coverData,
    chunkSize,  // 确保始终有值
    locateFile: (path, prefix) => {
      if (path.endsWith('.wasm')) {
        return '/MediaInfoModule.wasm'
      }
      return prefix + path
    },
  })

  return cachedMediaInfo
}
```

## 最佳实践

1. **始终为可选参数设置默认值**：避免 `undefined` 传递给底层库
2. **考虑单例模式的副作用**：缓存实例时，确保首次调用使用正确的配置
3. **本地文件和网络文件处理差异**：注意不同数据源可能需要不同的容错策略

## 相关代码文件

- `src/utils/mediaInfo.ts` - MediaInfo 工具函数

## 参考

- [MediaInfo.js 官方文档](https://github.com/buzz/mediainfo.js)
