<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  getMediaInfoFromFile,
  getMediaInfoFromUrl,
  getGeneralTrack,
  getVideoTracks,
  getAudioTracks,
  formatDuration,
  formatFileSize,
  formatBitRate,
  type MediaInfoResult,
  type GeneralTrack,
  type VideoTrack,
  type AudioTrack,
} from '@/utils/mediaInfo'

const fileInput = ref<HTMLInputElement>()
const urlInput = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<MediaInfoResult | null>(null)
const copied = ref(false)
const jsonCollapsed = ref(true)
const isDragOver = ref(false)

const generalInfo = ref<GeneralTrack | undefined>()
const videoTracks = ref<VideoTrack[]>([])
const audioTracks = ref<AudioTrack[]>([])

const hasResult = computed(() => !!result.value && !!generalInfo.value)

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
  loading.value = true
  error.value = ''
  result.value = null
  isDragOver.value = false
  try {
    result.value = await getMediaInfoFromFile(file)
    extractInfo()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解析失败'
  } finally {
    loading.value = false
  }
}

async function handleUrlSubmit() {
  if (!urlInput.value.trim()) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await getMediaInfoFromUrl(urlInput.value.trim())
    extractInfo()
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

function toggleJson() {
  jsonCollapsed.value = !jsonCollapsed.value
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="3"/>
            <path d="M10 8l6 4-6 4V8z"/>
          </svg>
        </div>
        <h1>MediaInfo</h1>
        <p class="subtitle">媒体信息解析工具</p>
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
            accept="video/*,audio/*"
            @change="handleFileSelect"
          />
          <div class="drop-zone-content">
            <svg class="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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
            <svg class="url-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <svg v-if="loading" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              <span v-else>解析</span>
            </button>
          </div>
        </div>

        <!-- 状态信息 -->
        <transition name="fade">
          <div v-if="error" class="status error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{{ error }}</span>
          </div>
        </transition>
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <h3>等待解析</h3>
        <p>选择本地文件或输入 URL 开始</p>
      </div>

      <!-- Results -->
      <template v-else>
        <!-- 通用信息 -->
        <section class="info-section general-section">
          <div class="section-header">
            <div class="section-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              <span class="value format-badge">{{ generalInfo.Format || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">文件大小</span>
              <span class="value">{{ formatFileSize(generalInfo.FileSize) }}</span>
            </div>
            <div class="info-item">
              <span class="label">时长</span>
              <span class="value">{{ formatDuration(generalInfo.Duration) }}</span>
            </div>
            <div class="info-item">
              <span class="label">总比特率</span>
              <span class="value">{{ formatBitRate(generalInfo.OverallBitRate) }}</span>
            </div>
            <div class="info-item">
              <span class="label">编码应用</span>
              <span class="value">{{ generalInfo.Encoded_Library || 'N/A' }}</span>
            </div>
          </div>
        </section>

        <!-- 视频轨道 -->
        <section v-if="videoTracks.length > 0" class="info-section">
          <div class="section-header">
            <div class="section-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <span class="value">{{ track.FrameCount ? Number(track.FrameCount).toLocaleString() : 'N/A' }}</span>
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
                <span class="value">{{ [track.ColorSpace, track.BitDepth ? `${track.BitDepth}bit` : ''].filter(Boolean).join(' / ') || 'N/A' }}</span>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <span class="value">{{ track.SamplingRate ? `${(track.SamplingRate / 1000).toFixed(1)} kHz` : 'N/A' }}</span>
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

        <!-- 原始 JSON -->
        <section class="info-section json-section">
          <div class="json-toggle" @click="toggleJson">
            <svg class="collapse-icon" :class="{ rotated: !jsonCollapsed }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <h3>原始 JSON</h3>
            <button
              class="copy-btn"
              :class="{ copied }"
              @click.stop="copyToClipboard(JSON.stringify(result, null, 2))"
            >
              <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {{ copied ? '已复制' : '复制' }}
            </button>
          </div>
          <transition name="collapse">
            <pre v-if="!jsonCollapsed" class="json-content">{{ JSON.stringify(result, null, 2) }}</pre>
          </transition>
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
  to { transform: rotate(360deg); }
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

/* ===== JSON Section ===== */
.json-section {
  padding: 0;
  overflow: hidden;
}

.json-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 24px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;
}

.json-toggle:hover {
  background: #fafbfc;
}

.json-toggle h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  flex: 1;
}

.collapse-icon {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  transition: transform 0.25s ease;
}

.collapse-icon.rotated {
  transform: rotate(180deg);
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

/* ===== Transitions ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  margin: 0 12px;
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
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
</style>
