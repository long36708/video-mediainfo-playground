import mediaInfoFactory, {
  type AudioTrack,
  type FormatType,
  type GeneralTrack,
  type ImageTrack,
  type MediaInfo,
  type MediaInfoResult,
  type MenuTrack,
  type OtherTrack,
  type TextTrack,
  type Track,
  type VideoTrack,
} from 'mediainfo.js'

export type {
  MediaInfoResult,
  Track,
  GeneralTrack,
  VideoTrack,
  AudioTrack,
  TextTrack,
  ImageTrack,
  MenuTrack,
  OtherTrack,
}

export interface GetMediaInfoOptions {
  /** 结果格式，默认为 'object' */
  format?: FormatType
  /** 是否显示完整信息 */
  full?: boolean
  /** 是否输出封面数据为 base64 */
  coverData?: boolean
  /** 块大小（字节），默认 256KB */
  chunkSize?: number
}

/** 缓存的 MediaInfo 实例 */
let cachedMediaInfo: MediaInfo<FormatType> | null = null

/** WASM 文件的 CDN 路径 */
const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/mediainfo.js@0.3.7/dist/'

/**
 * 获取或创建 MediaInfo 实例（单例模式）
 */
async function getMediaInfo(options: GetMediaInfoOptions = {}): Promise<MediaInfo<FormatType> | null> {
  if (cachedMediaInfo) {
    cachedMediaInfo.reset()
    return cachedMediaInfo
  }

  const {format = 'object', full = false, coverData = false, chunkSize = 256 * 1024} = options

  cachedMediaInfo = await mediaInfoFactory({
    format,
    full,
    coverData,
    chunkSize,
    locateFile: (path: string) => {
      // 使用 CDN 加载 WASM 文件
      if (path.endsWith('.wasm')) {
        // return WASM_CDN_URL + path
        return `${import.meta.env.BASE_URL}${path}`
        // return `${import.meta.env.BASE_URL}MediaInfoWasm-26.01.wasm`
      }
      return path
    },
  })

  return cachedMediaInfo
}

/**
 * 从 File 对象获取媒体信息
 * @param file 文件对象
 * @param options 配置选项
 * @returns 媒体信息
 */
export async function getMediaInfoFromFile(
  file: File,
  options: GetMediaInfoOptions = {},
): Promise<MediaInfoResult> {
  const mediainfo = await getMediaInfo(options)
  if (!mediainfo) {
    throw new Error('MediaInfo instance not found')
  }

  const getSize = () => file.size

  const readChunk = async (size: number, offset: number): Promise<Uint8Array> => {
    const blob = file.slice(offset, offset + size)
    const buffer = await blob.arrayBuffer()
    return new Uint8Array(buffer)
  }

  const result = await mediainfo.analyzeData(getSize, readChunk)
  return result as MediaInfoResult
}

/**
 * 从 URL 获取媒体信息
 * @param url 媒体文件 URL
 * https://192.168.179.1:3000/videos/avc1_18s.mp4
 * @param options 配置选项
 * @returns 媒体信息
 */
export async function getMediaInfoFromUrl(
  url: string,
  options: GetMediaInfoOptions = {},
): Promise<MediaInfoResult> {
  const response = await fetch(url, {method: 'HEAD'})
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
  }

  const contentLength = response.headers.get('Content-Length')
  if (!contentLength) {
    throw new Error('Content-Length header is missing')
  }

  const fileSize = Number.parseInt(contentLength, 10)

  const mediainfo = await getMediaInfo(options)

  if (!mediainfo) {
    throw new Error('MediaInfo instance not found')
  }

  const getSize = () => fileSize

  const readChunk = async (size: number, offset: number): Promise<Uint8Array> => {
    // 边界检查：如果 offset 超出文件大小，返回空数组
    if (offset >= fileSize) {
      return new Uint8Array(0)
    }

    const end = Math.min(offset + size - 1, fileSize - 1)
    const rangeResponse = await fetch(url, {
      headers: {Range: `bytes=${offset}-${end}`},
    })

    if (!rangeResponse.ok) {
      throw new Error(`Failed to fetch chunk: ${rangeResponse.status} ${rangeResponse.statusText}`)
    }

    const buffer = await rangeResponse.arrayBuffer()
    return new Uint8Array(buffer)
  }

  const result = await mediainfo.analyzeData(getSize, readChunk)
  return result as MediaInfoResult
}

/**
 * 从 ArrayBuffer 获取媒体信息
 * @param buffer ArrayBuffer 数据
 * @param options 配置选项
 * @returns 媒体信息
 */
export async function getMediaInfoFromBuffer(
  buffer: ArrayBuffer,
  options: GetMediaInfoOptions = {},
): Promise<MediaInfoResult> {
  const mediainfo = await getMediaInfo(options)
  if (!mediainfo) {
    throw new Error('MediaInfo instance not found')
  }

  const uint8Array = new Uint8Array(buffer)
  const getSize = () => uint8Array.length

  const readChunk = (size: number, offset: number): Uint8Array => {
    return uint8Array.slice(offset, offset + size)
  }

  const result = await mediainfo.analyzeData(getSize, readChunk)
  return result as MediaInfoResult
}

/**
 * 从 Blob 对象获取媒体信息
 * @param blob Blob 对象
 * @param options 配置选项
 * @returns 媒体信息
 */
export async function getMediaInfoFromBlob(
  blob: Blob,
  options: GetMediaInfoOptions = {},
): Promise<MediaInfoResult> {
  const mediainfo = await getMediaInfo(options)
  if (!mediainfo) {
    throw new Error('MediaInfo instance not found')
  }

  const getSize = () => blob.size

  const readChunk = async (size: number, offset: number): Promise<Uint8Array> => {
    const chunk = blob.slice(offset, offset + size)
    const buffer = await chunk.arrayBuffer()
    return new Uint8Array(buffer)
  }

  const result = await mediainfo.analyzeData(getSize, readChunk)
  return result as MediaInfoResult
}

/**
 * 关闭 MediaInfo 实例，释放资源
 */
export function closeMediaInfo(): void {
  if (cachedMediaInfo) {
    cachedMediaInfo.close()
    cachedMediaInfo = null
  }
}

/**
 * 获取视频轨道信息
 */
export function getVideoTracks(result: MediaInfoResult): VideoTrack[] {
  return result.media?.track?.filter((t): t is VideoTrack => t['@type'] === 'Video') ?? []
}

/**
 * 获取音频轨道信息
 */
export function getAudioTracks(result: MediaInfoResult): AudioTrack[] {
  return result.media?.track?.filter((t): t is AudioTrack => t['@type'] === 'Audio') ?? []
}

/**
 * 获取通用轨道信息（容器信息）
 */
export function getGeneralTrack(result: MediaInfoResult): GeneralTrack | undefined {
  return result.media?.track?.find((t): t is GeneralTrack => t['@type'] === 'General')
}

/**
 * 获取文本轨道信息（字幕等）
 */
export function getTextTracks(result: MediaInfoResult): TextTrack[] {
  return result.media?.track?.filter((t): t is TextTrack => t['@type'] === 'Text') ?? []
}

/**
 * 格式化时长（秒转 HH:MM:SS.mmm）
 */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return 'N/A'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const pad = (n: number, decimals = 0) => n.toFixed(decimals).padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs, 3)}`
  }
  return `${pad(minutes)}:${pad(secs, 3)}`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number | string | undefined): string {
  if (bytes === undefined) return 'N/A'
  const size = typeof bytes === 'string' ? Number.parseInt(bytes, 10) : bytes

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let sizeNum = size

  while (sizeNum >= 1024 && i < units.length - 1) {
    sizeNum /= 1024
    i++
  }

  return `${sizeNum.toFixed(2)} ${units[i]}`
}

/**
 * 格式化比特率
 */
export function formatBitRate(bitRate: number | undefined): string {
  if (bitRate === undefined) return 'N/A'

  if (bitRate >= 1_000_000) {
    return `${(bitRate / 1_000_000).toFixed(2)} Mbps`
  }
  if (bitRate >= 1_000) {
    return `${(bitRate / 1_000).toFixed(2)} Kbps`
  }
  return `${bitRate} bps`
}
