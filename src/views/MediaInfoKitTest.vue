<script setup lang="ts">
import {computed, ref} from 'vue'
import {
  type AudioTrack,
  formatBitRate,
  formatDuration,
  formatFileSize,
  type GeneralTrack,
  getAudioTracks,
  getGeneralTrack,
  getMediaInfoFromFile,
  getMediaInfoFromUrl,
  getVideoTracks,
  type MediaInfoResult,
  type VideoTrack,
} from 'mediainfo-kit'

const fileInput = ref<HTMLInputElement>()
const urlInput = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<MediaInfoResult | null>(null)
const copied = ref(false)
const isDragOver = ref(false)
const infoViewTab = ref<'structured' | 'json'>('structured')
const searchQuery = ref('')
const expandedTracks = ref<Set<number>>(new Set())

// 性能统计
const parseTime = ref(0) // 总耗时（毫秒）

const generalInfo = ref<GeneralTrack | undefined>()
const videoTracks = ref<VideoTrack[]>([])
const audioTracks = ref<AudioTrack[]>([])

// 完整信息 - 所有轨道（原始数据）
interface TrackGroup {
  type: string
  color: string
  tracks: Record<string, unknown>[]
}

const allTrackGroups = ref<TrackGroup[]>([])
const allTrackCount = ref(0)
const allFieldCount = ref(0)

const trackTypeOrder = ['General', 'Video', 'Audio', 'Text', 'Image', 'Menu', 'Other']

const typeColorMap: Record<string, string> = {
  General: '#6d28d9',
  Video: '#059669',
  Audio: '#7c3aed',
  Text: '#d97706',
  Image: '#2563eb',
  Menu: '#4b5563',
  Other: '#6b7280',
}

const hasResult = computed(() => !!result.value && !!generalInfo.value)

// 所有轨道扁平列表（用于 indexOf 查找）
const allTracksFlat = computed(() => allTrackGroups.value.flatMap(g => g.tracks))

const filteredTrackGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return allTrackGroups.value
  return allTrackGroups.value
    .map(group => ({
      ...group,
      tracks: group.tracks.filter(track =>
        Object.entries(track).some(([key, value]) =>
          key.toLowerCase().includes(query) || String(value).toLowerCase().includes(query),
        ),
      ),
    }))
    .filter(group => group.tracks.length > 0)
})

function getTrackEntries(track: Record<string, unknown>) {
  return Object.entries(track).filter(([key]) => key !== '@type')
}

function toggleTrack(index: number) {
  const next = new Set(expandedTracks.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  expandedTracks.value = next
}

function isTrackExpanded(index: number) {
  return expandedTracks.value.has(index)
}

function getTrackIndex(track: Record<string, unknown>) {
  return allTracksFlat.value.indexOf(track)
}

const fileName = computed(() => {
  if (!generalInfo.value?.FileName) return ''
  return generalInfo.value.FileName.length > 30
    ? generalInfo.value.FileName.slice(0, 27) + '...'
    : generalInfo.value.FileName
})

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  await parseFile(file)
}

async function parseFile(file: File) {
  const startTime = performance.now()
  loading.value = true
  error.value = ''
  result.value = null
  isDragOver.value = false
  allTrackGroups.value = []
  allTrackCount.value = 0
  allFieldCount.value = 0
  expandedTracks.value = new Set()
  searchQuery.value = ''
  try {
    result.value = await getMediaInfoFromFile(file, {full: true})
    extractInfo()
    parseTime.value = Math.round(performance.now() - startTime)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解析失败'
  } finally {
    loading.value = false
  }
}

async function handleUrlSubmit() {
  if (!urlInput.value.trim()) return
  const startTime = performance.now()
  loading.value = true
  error.value = ''
  result.value = null
  allTrackGroups.value = []
  allTrackCount.value = 0
  allFieldCount.value = 0
  expandedTracks.value = new Set()
  searchQuery.value = ''
  try {
    result.value = await getMediaInfoFromUrl(urlInput.value.trim())
    extractInfo()
    parseTime.value = Math.round(performance.now() - startTime)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解析失败'
  } finally {
    loading.value = false
  }
}

function extractInfo() {
  if (!result.value) return
  generalInfo.value = getGeneralTrack(result.value)
  videoTracks.value = getVideoTracks(result.value)
  audioTracks.value = getAudioTracks(result.value)

  // 提取所有轨道用于完整信息展示
  const tracks = result.value.media?.track
  if (Array.isArray(tracks)) {
    const map = new Map<string, Record<string, unknown>[]>()
    for (const track of tracks) {
      const type = (track as Record<string, unknown>)['@type'] as string || 'Unknown'
      if (!map.has(type)) map.set(type, [])
      map.get(type)!.push(track as Record<string, unknown>)
    }

    const groups: TrackGroup[] = []
    for (const [type, typeTracks] of map) {
      groups.push({type, color: typeColorMap[type] || '#6b7280', tracks: typeTracks})
    }
    groups.sort((a, b) => {
      const ai = trackTypeOrder.indexOf(a.type)
      const bi = trackTypeOrder.indexOf(b.type)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

    allTrackGroups.value = groups
    allTrackCount.value = tracks.length
    allFieldCount.value = tracks.reduce((sum, t) => sum + Object.keys(t).length, 0)
  } else {
    allTrackGroups.value = []
    allTrackCount.value = 0
    allFieldCount.value = 0
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) parseFile(file)
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // fallback
  }
}
</script>

<template>
  <div class="page-container">
    <!-- 左侧输入面板 -->
    <aside class="input-panel">
      <div class="panel-header">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="3"/>
            <path d="M10 8l6 4-6 4V8z"/>
          </svg>
        </div>
        <h1>MediaInfo Kit</h1>
        <p class="subtitle">基于 mediainfo-kit 的媒体信息解析工具</p>
      </div>

      <div class="panel-body">
        <!-- 文件拖拽区域 -->
        <div
          class="drop-zone"
          :class="{ 'drag-over': isDragOver }"
          @click="openFilePicker"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept="*/*"
            @change="handleFileSelect"
          />
          <div class="drop-zone-content">
            <svg class="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="drop-text">拖拽文件到此处，或<span class="link">点击选择</span></span>
            <span class="drop-hint">支持视频和音频文件</span>
          </div>
        </div>

        <div class="divider">
          <span>或输入 URL</span>
        </div>

        <!-- URL 输入 -->
        <div class="url-group">
          <div class="url-input-wrapper">
            <svg class="url-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
            <input
              v-model="urlInput"
              type="url"
              placeholder="https://example.com/video.mp4"
              @keyup.enter="handleUrlSubmit"
            />
            <button
              class="parse-btn"
              :disabled="loading || !urlInput.trim()"
              @click="handleUrlSubmit"
            >
              <svg v-if="loading" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              <span v-else>解析</span>
            </button>
          </div>
        </div>

        <!-- 状态信息 -->
        <transition name="fade">
          <div v-if="error" class="status error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{{ error }}</span>
          </div>
        </transition>

        <!-- 能力说明 -->
        <div class="capabilities-info">
          <div class="info-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>支持格式</span>
          </div>

          <!-- 封装格式 -->
          <div class="capability-section">
            <div class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="10" y1="16" x2="10" y2="16"/>
              </svg>
              <span>封装格式</span>
            </div>
            <div class="capability-tags">
              <span class="tag blue">MP4</span>
              <span class="tag blue">MKV</span>
              <span class="tag blue">AVI</span>
              <span class="tag blue">MOV</span>
              <span class="tag blue">MPEG-TS</span>
              <span class="tag blue">MPEG-PS</span>
              <span class="tag blue">WMV</span>
              <span class="tag blue">FLV</span>
              <span class="tag blue">MXF</span>
              <span class="tag blue">GXF</span>
              <span class="tag blue">LXF</span>
              <span class="tag blue">WebM</span>
            </div>
          </div>

          <!-- 视频编码 -->
          <div class="capability-section">
            <div class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span>视频编码</span>
            </div>
            <div class="capability-tags">
              <span class="tag green">H.264/AVC</span>
              <span class="tag green">H.265/HEVC</span>
              <span class="tag green">MPEG-2</span>
              <span class="tag green">MPEG-4</span>
              <span class="tag green">DivX</span>
              <span class="tag green">XviD</span>
              <span class="tag green">VP9</span>
              <span class="tag green">FFV1</span>
            </div>
          </div>

          <!-- 音频编码 -->
          <div class="capability-section">
            <div class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              <span>音频编码</span>
            </div>
            <div class="capability-tags">
              <span class="tag purple">AAC</span>
              <span class="tag purple">MP3</span>
              <span class="tag purple">AC-3</span>
              <span class="tag purple">E-AC-3</span>
              <span class="tag purple">DTS</span>
              <span class="tag purple">FLAC</span>
              <span class="tag purple">PCM</span>
              <span class="tag purple">Dolby E</span>
            </div>
          </div>

          <p class="capability-desc">基于 mediainfo-kit 提供更稳定的解析能力和重试机制</p>
        </div>
      </div>
    </aside>

    <!-- 右侧结果面板 -->
    <main class="result-panel">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>正在解析媒体信息...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="!hasResult" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"
             stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <h3>等待解析</h3>
        <p>选择本地文件或输入 URL 开始</p>

        <div class="capabilities-showcase">
          <h4>可探测的参数</h4>
          <div class="param-grid">
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="10" y1="16" x2="10" y2="16"/>
              </svg>
              <span>容器格式</span>
            </div>
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <span>视频编码</span>
            </div>
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              <span>音频编码</span>
            </div>
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>时长/帧数</span>
            </div>
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              <span>文件大小</span>
            </div>
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="20" rx="2" ry="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              <span>分辨率</span>
            </div>
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span>帧率/比特率</span>
            </div>
            <div class="param-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h5l3 5 4-10 3 5h5"/>
              </svg>
              <span>采样率</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Results -->
      <template v-else>
        <!-- 通用信息 -->
        <section class="info-section general-section">
          <div class="section-header">
            <div class="section-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <h3>通用信息</h3>
              <p class="section-desc" v-if="fileName">{{ fileName }}</p>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">格式</span>
              <span class="value format-badge">{{ generalInfo?.Format || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">文件大小</span>
              <span class="value">{{ formatFileSize(generalInfo?.FileSize) }}</span>
            </div>
            <div class="info-item">
              <span class="label">时长</span>
              <span class="value">{{ formatDuration(generalInfo?.Duration) }}</span>
            </div>
            <div class="info-item">
              <span class="label">总比特率</span>
              <span class="value">{{ formatBitRate(generalInfo?.OverallBitRate) }}</span>
            </div>
            <div class="info-item">
              <span class="label">编码应用</span>
              <span class="value">{{ generalInfo?.Encoded_Library || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">解析耗时</span>
              <span class="value performance-time">{{ parseTime }} ms</span>
            </div>
          </div>
        </section>

        <!-- 视频轨道 -->
        <section v-if="videoTracks.length > 0" class="info-section">
          <div class="section-header">
            <div class="section-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <div>
              <h3>视频轨道</h3>
              <p class="section-desc">{{ videoTracks.length }} 个视频流</p>
            </div>
          </div>
          <div v-for="(track, index) in videoTracks" :key="index" class="track-card">
            <div class="track-title">Stream #{{ index + 1 }}</div>
            <div class="info-grid compact">
              <div class="info-item">
                <span class="label">编码</span>
                <span class="value format-badge">{{ track.Format || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">分辨率</span>
                <span class="value">{{ track.Width }} x {{ track.Height }}</span>
              </div>
              <div class="info-item">
                <span class="label">帧率</span>
                <span class="value">{{ track.FrameRate?.toFixed(2) || 'N/A' }} fps</span>
              </div>
              <div class="info-item">
                <span class="label">总帧数</span>
                <span class="value">{{
                    track.FrameCount ? Number(track.FrameCount).toLocaleString() : 'N/A'
                  }}</span>
              </div>
              <div class="info-item">
                <span class="label">比特率</span>
                <span class="value">{{ formatBitRate(track.BitRate) }}</span>
              </div>
              <div class="info-item">
                <span class="label">宽高比</span>
                <span class="value">{{ track.DisplayAspectRatio?.toFixed(2) || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">色彩</span>
                <span class="value">{{
                    [track.ColorSpace, track.BitDepth ? `${track.BitDepth}bit` : ''].filter(Boolean).join(' / ') || 'N/A'
                  }}</span>
              </div>
              <div class="info-item">
                <span class="label">编码器</span>
                <span class="value">{{ track.Encoded_Library || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 音频轨道 -->
        <section v-if="audioTracks.length > 0" class="info-section">
          <div class="section-header">
            <div class="section-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div>
              <h3>音频轨道</h3>
              <p class="section-desc">{{ audioTracks.length }} 个音频流</p>
            </div>
          </div>
          <div v-for="(track, index) in audioTracks" :key="index" class="track-card">
            <div class="track-title">Stream #{{ index + 1 }}</div>
            <div class="info-grid compact">
              <div class="info-item">
                <span class="label">编码</span>
                <span class="value format-badge">{{ track.Format || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">采样率</span>
                <span class="value">{{
                    track.SamplingRate ? `${(track.SamplingRate / 1000).toFixed(1)} kHz` : 'N/A'
                  }}</span>
              </div>
              <div class="info-item">
                <span class="label">声道</span>
                <span class="value">{{ track.Channels || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">比特率</span>
                <span class="value">{{ formatBitRate(track.BitRate) }}</span>
              </div>
              <div class="info-item">
                <span class="label">位深度</span>
                <span class="value">{{ track.BitDepth ? `${track.BitDepth} bit` : 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">语言</span>
                <span class="value">{{ track.Language || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">标题</span>
                <span class="value">{{ track.Title || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 完整信息 -->
        <section class="info-section full-info-section">
          <div class="full-info-header">
            <div class="section-header" style="margin-bottom: 0;">
              <div class="section-icon blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div>
                <h3>完整信息</h3>
                <p class="section-desc">{{ allTrackCount }} 个轨道，{{ allFieldCount }} 个字段</p>
              </div>
            </div>
            <div class="header-actions">
              <button
                class="copy-btn"
                :class="{ copied }"
                @click="copyToClipboard(JSON.stringify(result, null, 2))"
              >
                <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {{ copied ? '已复制' : '复制 JSON' }}
              </button>
            </div>
          </div>

          <!-- Tab 切换 -->
          <div class="view-tabs">
            <button
              class="view-tab"
              :class="{ active: infoViewTab === 'structured' }"
              @click="infoViewTab = 'structured'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              结构化
            </button>
            <button
              class="view-tab"
              :class="{ active: infoViewTab === 'json' }"
              @click="infoViewTab = 'json'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              JSON
            </button>
          </div>

          <!-- 结构化视图 -->
          <div v-if="infoViewTab === 'structured'" class="structured-view">
            <!-- 搜索 -->
            <div class="search-bar">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索字段名或值..."
                class="search-input"
              />
              <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- 轨道类型分组 -->
            <div v-if="filteredTrackGroups.length === 0" class="no-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              <span>没有匹配的字段</span>
            </div>

            <div v-for="group in filteredTrackGroups" :key="group.type" class="track-group">
              <div class="track-group-header">
                <span class="track-type-dot" :style="{ background: group.color }"></span>
                <span class="track-type-label">{{ group.type }}</span>
                <span class="track-type-count">{{ group.tracks.length }}</span>
              </div>

              <div v-for="(track, tIdx) in group.tracks" :key="tIdx" class="track-detail-card">
                <div class="track-detail-toggle"
                     @click="toggleTrack(getTrackIndex(track as Record<string, unknown>))">
                  <svg
                    class="toggle-arrow"
                    :class="{ expanded: isTrackExpanded(getTrackIndex(track as Record<string, unknown>)) }"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span class="track-detail-title">
                    {{ group.type }} #{{ tIdx + 1 }}
                    <span v-if="(track as Record<string, unknown>).Format" class="track-format-tag"
                          :style="{ color: group.color, borderColor: group.color + '33', background: group.color + '0d' }">
                      {{
                        (track as Record<string, unknown>).Format }}
                    </span>
                  </span>
                  <span class="field-count">{{
                      getTrackEntries(track as Record<string, unknown>).length }} 个字段</span>
                </div>

                <transition name="slide-fade">
                  <div v-if="isTrackExpanded(getTrackIndex(track as Record<string, unknown>))"
                       class="track-fields">
                    <div
                      v-for="([key, value], fIdx) in getTrackEntries(track as Record<string, unknown>)"
                      :key="fIdx"
                      class="field-row"
                    >
                      <span class="field-key" :title="key">{{ key }}</span>
                      <span class="field-value" :title="String(value)">{{ value ?? 'N/A' }}</span>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>

          <!-- JSON 原始视图 -->
          <div v-else class="json-view">
            <pre class="json-content">{{ JSON.stringify(result, null, 2) }}</pre>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
/* ===== 布局 ===== */
.page-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #1a1a2e;
}

/* ===== 左侧面板 ===== */
.input-panel {
  width: 380px;
  min-width: 380px;
  background: linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 32px 24px;
}

.panel-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.logo-icon svg {
  width: 26px;
  height: 26px;
  color: #a78bfa;
}

.panel-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}

.subtitle {
  margin-top: 4px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== 能力说明 ===== */
.capabilities-info {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
}

.info-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.info-badge svg {
  width: 18px;
  height: 18px;
  color: #a78bfa;
}

.info-badge span {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.capability-section {
  margin-bottom: 14px;
}

.capability-section:last-child {
  margin-bottom: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.section-title svg {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.5);
}

.section-title span {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.capability-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.73rem;
  font-weight: 500;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.tag:hover {
  transform: translateY(-1px);
}

/* 封装格式 - 蓝色 */
.tag.blue {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.3);
}

.tag.blue:hover {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.5);
}

/* 视频编码 - 绿色 */
.tag.green {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.3);
}

.tag.green:hover {
  background: rgba(34, 197, 94, 0.25);
  border-color: rgba(34, 197, 94, 0.5);
}

/* 音频编码 - 紫色 */
.tag.purple {
  background: rgba(167, 139, 250, 0.15);
  color: #c4b5fd;
  border-color: rgba(167, 139, 250, 0.3);
}

.tag.purple:hover {
  background: rgba(167, 139, 250, 0.25);
  border-color: rgba(167, 139, 250, 0.5);
}

.capability-desc {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.5;
}

/* ===== 拖拽区域 ===== */
.drop-zone {
  position: relative;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s ease;
  background: rgba(255, 255, 255, 0.04);
}

.drop-zone:hover {
  border-color: rgba(167, 139, 250, 0.5);
  background: rgba(167, 139, 250, 0.06);
}

.drop-zone.drag-over {
  border-color: #a78bfa;
  background: rgba(167, 139, 250, 0.12);
  transform: scale(1.02);
}

.drop-zone input[type='file'] {
  display: none;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.drop-icon {
  width: 36px;
  height: 36px;
  color: rgba(255, 255, 255, 0.35);
}

.drop-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}

.drop-text .link {
  color: #a78bfa;
  font-weight: 500;
}

.drop-hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
}

/* ===== 分隔线 ===== */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

/* ===== URL 输入 ===== */
.url-group {
  display: flex;
  flex-direction: column;
}

.url-input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 4px;
  transition: all 0.2s ease;
}

.url-input-wrapper:focus-within {
  border-color: rgba(167, 139, 250, 0.5);
  background: rgba(255, 255, 255, 0.1);
}

.url-icon {
  width: 18px;
  height: 18px;
  margin-left: 12px;
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.url-input-wrapper input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 0.88rem;
  padding: 10px 12px;
  min-width: 0;
}

.url-input-wrapper input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.parse-btn {
  background: #a78bfa;
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 36px;
}

.parse-btn:hover:not(:disabled) {
  background: #8b5cf6;
}

.parse-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== 错误状态 ===== */
.status.error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.83rem;
}

.status.error svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ===== 右侧结果面板 ===== */
.result-panel {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  background: #f8f9fc;
}

/* ===== Loading ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-state p {
  font-size: 0.9rem;
  color: #999;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spin {
  width: 18px;
  height: 18px;
  animation: spin 0.8s linear infinite;
}

/* ===== Empty ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #d1d5db;
  margin-bottom: 8px;
}

.empty-state h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #9ca3af;
  margin: 0;
}

.empty-state p {
  font-size: 0.88rem;
  color: #c4c8cf;
  margin: 0;
}

/* ===== 能力展示 ===== */
.capabilities-showcase {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.capabilities-showcase h4 {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  margin: 0 0 16px;
  letter-spacing: 0.05em;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.param-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.param-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(167, 139, 250, 0.3);
  transform: translateY(-2px);
}

.param-item svg {
  width: 22px;
  height: 22px;
  color: #a78bfa;
}

.param-item span {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  font-weight: 500;
}

/* ===== Info Section ===== */
.info-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  border: 1px solid #f0f0f4;
}

.general-section {
  background: linear-gradient(135deg, #faf5ff 0%, #fff 50%);
  border-color: #ede9fe;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 20px;
  height: 20px;
}

.section-icon.blue {
  background: #ede9fe;
  color: #7c3aed;
}

.section-icon.green {
  background: #d1fae5;
  color: #059669;
}

.section-icon.purple {
  background: #ede9fe;
  color: #7c3aed;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.section-desc {
  font-size: 0.78rem;
  color: #9ca3af;
  margin-top: 2px;
}

/* ===== Info Grid ===== */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.info-grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.info-item {
  background: #f8f9fc;
  padding: 12px 14px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.info-item:hover {
  background: #f0f1f6;
}

.info-item .label {
  display: block;
  font-size: 0.72rem;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.info-item .value {
  font-size: 0.88rem;
  color: #1a1a2e;
  font-weight: 500;
  word-break: break-all;
}

.format-badge {
  display: inline-block;
  background: #ede9fe;
  color: #6d28d9;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.performance-time {
  display: inline-block;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 2px rgba(245, 158, 11, 0.1);
}

/* ===== Track Card ===== */
.track-card {
  background: #fafbfe;
  border: 1px solid #f0f1f5;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
}

.track-card:last-child {
  margin-bottom: 0;
}

.track-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f1f5;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #e5e7eb;
}

.copy-btn.copied {
  background: #d1fae5;
  border-color: #a7f3d0;
  color: #059669;
}

.copy-btn svg {
  width: 14px;
  height: 14px;
}

.json-content {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 20px 24px;
  font-size: 0.8rem;
  line-height: 1.6;
  overflow: auto;
  max-height: 500px;
  margin: 0 12px 12px;
  border-radius: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

/* ===== 完整信息区域 ===== */
.full-info-section {
  padding: 0;
  overflow: hidden;
}

.full-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Tab 切换 */
.view-tabs {
  display: flex;
  gap: 2px;
  margin: 0 24px;
  padding: 3px;
  background: #f3f4f6;
  border-radius: 10px;
  width: fit-content;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-tab svg {
  width: 14px;
  height: 14px;
}

.view-tab:hover {
  color: #374151;
}

.view-tab.active {
  background: #fff;
  color: #1a1a2e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 结构化视图 */
.structured-view {
  padding: 0 24px 20px;
}

/* 搜索栏 */
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: #9ca3af;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 9px 36px 9px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.84rem;
  color: #1a1a2e;
  background: #fff;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #a78bfa;
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.1);
}

.search-input::placeholder {
  color: #c4c8cf;
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease;
}

.search-clear:hover {
  background: #e5e7eb;
}

.search-clear svg {
  width: 12px;
  height: 12px;
  color: #6b7280;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0;
  color: #9ca3af;
}

.no-results svg {
  width: 32px;
  height: 32px;
}

.no-results span {
  font-size: 0.85rem;
}

/* 轨道类型分组 */
.track-group {
  margin-bottom: 16px;
}

.track-group:last-child {
  margin-bottom: 0;
}

.track-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f1f5;
}

.track-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.track-type-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
}

.track-type-count {
  font-size: 0.7rem;
  font-weight: 500;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 1px 7px;
  border-radius: 8px;
}

/* 轨道详情卡片 */
.track-detail-card {
  background: #fafbfe;
  border: 1px solid #f0f1f5;
  border-radius: 10px;
  margin-bottom: 6px;
  overflow: hidden;
}

.track-detail-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.track-detail-toggle:hover {
  background: #f5f6fa;
}

.toggle-arrow {
  width: 14px;
  height: 14px;
  color: #9ca3af;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.toggle-arrow.expanded {
  transform: rotate(90deg);
}

.track-detail-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-format-tag {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  border: 1px solid;
}

.field-count {
  font-size: 0.7rem;
  color: #9ca3af;
  white-space: nowrap;
}

/* 字段列表 */
.track-fields {
  border-top: 1px solid #f0f1f5;
}

.field-row {
  display: flex;
  padding: 6px 14px;
  transition: background 0.1s ease;
  border-bottom: 1px solid #f8f9fc;
}

.field-row:last-child {
  border-bottom: none;
}

.field-row:hover {
  background: #f0f1f6;
}

.field-row:nth-child(even) {
  background: #fcfcfe;
}

.field-row:nth-child(even):hover {
  background: #f0f1f6;
}

.field-key {
  width: 200px;
  min-width: 200px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 12px;
  flex-shrink: 0;
}

.field-value {
  flex: 1;
  font-size: 0.78rem;
  color: #1a1a2e;
  word-break: break-all;
  line-height: 1.5;
}

/* JSON 视图 */
.json-view {
  padding: 0 24px 20px;
}

.json-view .json-content {
  margin: 0;
}

/* slide-fade transition */
.slide-fade-enter-active {
  transition: all 0.25s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  max-height: 0;
}

.slide-fade-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ===== Transitions ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Scrollbar ===== */
.result-panel::-webkit-scrollbar,
.json-content::-webkit-scrollbar {
  width: 6px;
}

.result-panel::-webkit-scrollbar-track,
.json-content::-webkit-scrollbar-track {
  background: transparent;
}

.result-panel::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.json-content::-webkit-scrollbar-thumb {
  background: #45475a;
  border-radius: 3px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .page-container {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }

  .input-panel {
    width: 100%;
    min-width: auto;
    padding: 24px 20px;
  }

  .result-panel {
    padding: 20px;
  }
}

@media (max-width: 600px) {
  .param-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .capability-tags {
    justify-content: center;
  }
}
</style>
