<script setup lang="ts">
import { ref } from 'vue'
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

// 提取的信息
const generalInfo = ref<GeneralTrack | undefined>()
const videoTracks = ref<VideoTrack[]>([])
const audioTracks = ref<AudioTrack[]>([])

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  loading.value = true
  error.value = ''
  result.value = null

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

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="container">
    <h1>视频媒体信息解析器</h1>

    <!-- 输入区域 -->
    <div class="input-section">
      <h2>选择文件或输入 URL</h2>

      <!-- 文件选择 -->
      <div class="file-input">
        <input
          ref="fileInput"
          type="file"
          accept="video/*,audio/*"
          @change="handleFileSelect"
        />
        <button @click="openFilePicker">选择本地文件</button>
      </div>

      <div class="divider">或</div>

      <!-- URL 输入 -->
      <div class="url-input">
        <input
          v-model="urlInput"
          type="url"
          placeholder="输入视频/音频 URL"
          @keyup.enter="handleUrlSubmit"
        />
        <button @click="handleUrlSubmit" :disabled="loading">解析 URL</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">正在解析...</div>

    <!-- 错误提示 -->
    <div v-if="error" class="error">{{ error }}</div>

    <!-- 结果展示 -->
    <div v-if="result && generalInfo" class="result">
      <!-- 通用信息 -->
      <section class="info-section">
        <h3>通用信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">文件名</span>
            <span class="value">{{ generalInfo.FileName || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="label">格式</span>
            <span class="value">{{ generalInfo.Format || 'N/A' }}</span>
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
        <h3>视频轨道 ({{ videoTracks.length }})</h3>
        <div v-for="(track, index) in videoTracks" :key="index" class="track-card">
          <h4>视频 #{{ index + 1 }}</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">编码格式</span>
              <span class="value">{{ track.Format || 'N/A' }}</span>
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
              <span class="label">比特率</span>
              <span class="value">{{ formatBitRate(track.BitRate) }}</span>
            </div>
            <div class="info-item">
              <span class="label">宽高比</span>
              <span class="value">{{ track.DisplayAspectRatio?.toFixed(2) || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">色彩空间</span>
              <span class="value">{{ track.ColorSpace || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">位深度</span>
              <span class="value">{{ track.BitDepth ? `${track.BitDepth} bit` : 'N/A' }}</span>
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
        <h3>音频轨道 ({{ audioTracks.length }})</h3>
        <div v-for="(track, index) in audioTracks" :key="index" class="track-card">
          <h4>音频 #{{ index + 1 }}</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">编码格式</span>
              <span class="value">{{ track.Format || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">采样率</span>
              <span class="value">{{ track.SamplingRate ? `${(track.SamplingRate / 1000).toFixed(1)} kHz` : 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">声道数</span>
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
      <section class="info-section">
        <div class="json-header">
          <h3>原始 JSON</h3>
          <button @click="copyToClipboard(JSON.stringify(result, null, 2))">复制</button>
        </div>
        <pre class="json-content">{{ JSON.stringify(result, null, 2) }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  text-align: center;
  color: #1a1a1a;
  margin-bottom: 32px;
}

h2 {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 16px;
}

h3 {
  font-size: 1rem;
  color: #333;
  margin-bottom: 12px;
  border-bottom: 2px solid #4a90d9;
  padding-bottom: 8px;
}

h4 {
  font-size: 0.95rem;
  color: #555;
  margin-bottom: 8px;
}

.input-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.file-input input[type='file'] {
  display: none;
}

.file-input button,
.url-input button {
  background: #4a90d9;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.file-input button:hover,
.url-input button:hover {
  background: #357abd;
}

.file-input button:disabled,
.url-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  color: #999;
  margin: 20px 0;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #ddd;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.url-input {
  display: flex;
  gap: 12px;
}

.url-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.url-input input:focus {
  outline: none;
  border-color: #4a90d9;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.error {
  background: #fee;
  color: #c00;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.result {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.info-section {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.info-section:last-child {
  border-bottom: none;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.info-item {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
}

.info-item .label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.info-item .value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  word-break: break-all;
}

.track-card {
  background: #fafbfc;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.track-card:last-child {
  margin-bottom: 0;
}

.json-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.json-header button {
  background: #f0f0f0;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.json-header button:hover {
  background: #e0e0e0;
}

.json-content {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}
</style>
