# MediaInfo.js 网络大文件解析优化

## 核心原理

MediaInfo 解析**只需要读取文件的关键部分**（头部、尾部、索引区域），不会下载整个文件。优化重点在于**减少网络请求次数和延迟**。

## 通用优化策略

### 1. 增大 chunkSize

```typescript
// 默认 256KB，可增大到 512KB~1MB 减少请求次数
getMediaInfoFromUrl(url, { chunkSize: 512 * 1024 })
```

### 2. 服务器端配置

确保服务器支持：
- **Accept-Ranges: bytes** 响应头（支持 Range 请求）
- **CORS 头** 允许跨域 Range 请求
- **CDN 加速** 减少网络延迟

### 3. 快速失败检测

```typescript
const response = await fetch(url, { method: 'HEAD' })
const acceptRanges = response.headers.get('Accept-Ranges')
if (acceptRanges !== 'bytes') {
  console.warn('服务器不支持 Range 请求，解析大文件会很慢')
}
```

## PS 封装格式的特殊性

### PS vs MP4/MKV 对比

| 特性 | MP4/MKV | PS (MPEG-2 PS) |
|------|---------|----------------|
| 索引位置 | 文件头部 | **无全局索引** |
| 时长获取 | 读取 moov 即可 | **需要扫描整个文件** |
| 解析数据量 | 几 MB | **可能需要大量扫描** |

### PS 格式特点

- **Pack Header** (0x000001BA) - 基本参数
- **System Header** (0x000001BB) - 流信息
- **PES packets** - 音视频数据

MediaInfo 通过读取前几 MB 通常能获取编码格式、分辨率、帧率、音频采样率，但**精确时长需要扫描到文件末尾**。

### PS 格式优化策略

| 场景 | 优化建议 |
|------|----------|
| 快速预览 | `full: false`，接受估算时长 |
| 精确时长 | 服务端预处理，或设置超时限制 |
| 直播流 PS | 只解析头部，不依赖时长信息 |
| 大文件 PS | 考虑服务端预处理 + 缓存 |

### PS 格式检测与优化代码

```typescript
export async function getMediaInfoFromUrlOptimized(
  url: string,
  options: GetMediaInfoOptions & { 
    /** PS 格式时，是否扫描全文件获取精确时长 */
    scanFullForDuration?: boolean 
  } = {},
): Promise<MediaInfoResult> {
  const { scanFullForDuration = false, ...mediaOptions } = options
  
  // 检测是否为 PS 格式
  const headResponse = await fetch(url, {
    headers: { Range: 'bytes=0-3' }
  })
  const header = await headResponse.arrayBuffer()
  const view = new DataView(header)
  const magic = view.getUint32(0, false)
  
  // PS 的 Pack Header 起始码: 0x000001BA
  const isPS = magic === 0x000001BA
  
  if (isPS && !scanFullForDuration) {
    console.warn('PS 格式检测到，时长信息可能不准确。设置 scanFullForDuration: true 获取精确时长')
  }
  
  // PS 格式增大 chunkSize 加速头部解析
  const chunkSize = isPS 
    ? Math.max(mediaOptions.chunkSize ?? 0, 2 * 1024 * 1024) 
    : mediaOptions.chunkSize
  
  return getMediaInfoFromUrl(url, { ...mediaOptions, chunkSize })
}
```

## 实际效果

MediaInfo 解析一个 1GB 视频文件通常只需读取 **几 MB 到几十 MB** 的数据：

- **MP4/MKV**：主要集中在文件头部（ftyp, moov 原子）和尾部
- **PS**：需要更多扫描，无索引限制

## 最佳实践总结

1. **增大 chunkSize** 减少请求次数（512KB~1MB）
2. **确保服务器支持 Range 请求**
3. **PS 格式特殊处理**：接受不精确时长或服务端预处理
4. **服务端预处理** 是 PS 大文件的最优解

## 相关代码文件

- `src/utils/mediaInfo.ts` - MediaInfo 工具函数

## 参考

- [MediaInfo.js 官方文档](https://github.com/buzz/mediainfo.js)
