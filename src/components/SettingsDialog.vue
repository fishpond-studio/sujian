<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import {
  store,
  WALLPAPERS,
  setTheme,
  setWallpaper,
  resetSettings,
  exportAll,
  importAll,
  clearAllData,
  storageSize,
  resolvedTheme,
  importFiles,
} from '../store'
import {
  SHORTCUTS,
  getBinding,
  setBinding,
  resetBinding,
  resetAllBindings,
  formatBinding,
  conflictingIds,
  eventToBinding,
} from '../utils/shortcuts'

const importInput = ref(null)
const backupInput = ref(null)
const confirmClear = ref(false)
const imageUrl = ref('')
const recordingId = ref(null)
let recHandler = null

const tabs = ['外观', '写作', 'Markdown', '文件', '快捷键']

const grouped = computed(() => {
  const g = {}
  for (const s of SHORTCUTS) {
    ;(g[s.group] = g[s.group] || []).push(s)
  }
  return g
})
const conflicts = computed(() => {
  store.settings.shortcuts
  return conflictingIds()
})

function startRecording(id) {
  stopRecording()
  recordingId.value = id
  store.shortcutRecording = true
  recHandler = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') {
      stopRecording()
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      setBinding(id, '')
      stopRecording()
      return
    }
    const b = eventToBinding(e)
    if (!b) return
    setBinding(id, b)
    stopRecording()
  }
  window.addEventListener('keydown', recHandler, true)
}
function stopRecording() {
  if (recHandler) {
    window.removeEventListener('keydown', recHandler, true)
    recHandler = null
  }
  recordingId.value = null
  store.shortcutRecording = false
}
watch(
  () => store.showSettings,
  (v) => {
    if (!v) stopRecording()
  },
)
onBeforeUnmount(stopRecording)

const themes = [
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
  { key: 'system', label: '跟随系统' },
]
const fonts = [
  { key: 'sans', label: '无衬线' },
  { key: 'serif', label: '衬线' },
  { key: 'mono', label: '等宽' },
]
const modes = [
  { key: 'edit', label: '编辑' },
  { key: 'split', label: '分屏' },
  { key: 'preview', label: '预览' },
]
const formats = [
  { key: 'md', label: 'Markdown' },
  { key: 'txt', label: '纯文本' },
  { key: 'html', label: 'HTML' },
]

const mdToggles = [
  { key: 'gfm', label: 'GFM 扩展（表格 / 任务列表 / 删除线 / 自动链接）' },
  { key: 'breaks', label: '单个换行即换行' },
  { key: 'highlight', label: '高亮 ==文字==' },
  { key: 'sup', label: '上标 ^文字^' },
  { key: 'sub', label: '下标 ~文字~' },
  { key: 'emoji', label: 'Emoji :smile:' },
]

const sizeText = computed(() => {
  const b = storageSize()
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
})

function swatch(p) {
  return resolvedTheme() === 'dark' ? p.dark : p.light
}
function pickWallpaper(id) {
  setWallpaper(id)
}
function onCustomColor() {
  store.settings.wallpaper = 'custom'
  store.settings.wallpaperImage = ''
}
function applyImage() {
  const url = imageUrl.value.trim()
  if (url) store.settings.wallpaperImage = url
}
function clearImage() {
  imageUrl.value = ''
  store.settings.wallpaperImage = ''
  setWallpaper('graphite')
}
function onImportFile(e) {
  importFiles(e.target.files)
  e.target.value = ''
}
function onBackup(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    importAll(reader.result)
    store.showSettings = false
  }
  reader.readAsText(file)
  e.target.value = ''
}
function doClear() {
  if (confirmClear.value) {
    clearAllData()
    confirmClear.value = false
  } else {
    confirmClear.value = true
    setTimeout(() => (confirmClear.value = false), 2600)
  }
}
</script>

<template>
  <div
    v-if="store.showSettings"
    class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-xl px-4 py-6"
    @click.self="store.showSettings = false"
  >
    <div
      class="w-full max-w-lg max-h-full flex flex-col bg-panel border border-hair/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden select-text"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-hair/8">
        <h2 class="font-serif font-semibold text-ink/95 text-lg">偏好设置</h2>
        <button
          class="w-7 h-7 rounded-md text-ink/55 hover:bg-ink/10 hover:text-ink/90 flex items-center justify-center transition-colors duration-200"
          title="关闭"
          @click="store.showSettings = false"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </div>

      <!-- tabs -->
      <div class="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-hair/8 overflow-x-auto">
        <button
          v-for="t in tabs"
          :key="t"
          class="px-3 h-7 rounded-md text-[12.5px] whitespace-nowrap transition-colors duration-200"
          :class="store.settingsTab === t ? 'bg-ink/12 text-ink/95' : 'text-ink/55 hover:bg-ink/5 hover:text-ink/90'"
          @click="store.settingsTab = t"
        >
          {{ t }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <!-- ============ 外观 ============ -->
        <template v-if="store.settingsTab === '外观'">
          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-2.5">主题</h3>
            <div class="flex items-center bg-inset border border-hair/10 rounded-lg p-px">
              <button
                v-for="t in themes"
                :key="t.key"
                class="flex-1 h-7 rounded-md text-[12.5px] transition-colors duration-200"
                :class="store.settings.theme === t.key ? 'bg-ink/12 text-ink/95' : 'text-ink/55 hover:text-ink/90'"
                @click="setTheme(t.key)"
              >
                {{ t.label }}
              </button>
            </div>
          </section>

          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-2.5">背景颜色</h3>
            <div class="grid grid-cols-6 gap-2 mb-3">
              <button
                v-for="p in WALLPAPERS"
                :key="p.id"
                class="aspect-square rounded-lg border transition-colors duration-200"
                :class="store.settings.wallpaper === p.id && !store.settings.wallpaperImage ? 'border-accent' : 'border-hair/12 hover:border-hair/25'"
                :style="{ backgroundColor: swatch(p) }"
                :title="p.name"
                @click="pickWallpaper(p.id)"
              ></button>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-[12px] text-ink/70">
                自定义
                <input type="color" v-model="store.settings.wallpaperColor" class="w-8 h-7 rounded-lg" @input="onCustomColor" />
              </label>
              <input
                v-model="store.settings.wallpaperColor"
                class="w-24 bg-inset border border-hair/10 rounded-lg text-[12px] text-ink/90 px-2 py-1.5 outline-none focus:border-hair/25"
                spellcheck="false"
                @input="onCustomColor"
              />
              <label class="flex items-center gap-2 text-[12px] text-ink/70 ml-auto">
                <input v-model="store.settings.showWatermark" type="checkbox" class="accent-accent w-3.5 h-3.5" />
                水印
              </label>
            </div>
          </section>

          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-1">壁纸图片（可选）</h3>
            <p class="text-[11.5px] text-ink/45 mb-2">粘贴图片链接，可调节下方的模糊、明亮度等。</p>
            <div class="flex gap-2">
              <input
                v-model="imageUrl"
                class="flex-1 min-w-0 bg-inset border border-hair/10 rounded-lg text-[12.5px] text-ink/90 placeholder-ink/30 px-3 py-1.5 outline-none focus:border-hair/25"
                placeholder="https://…"
              />
              <button class="shrink-0 bg-surface text-ink/90 rounded-lg px-3 text-[12.5px] hover:bg-ink/10 transition-colors duration-200" @click="applyImage">应用</button>
              <button v-if="store.settings.wallpaperImage" class="shrink-0 text-ink/60 border border-hair/12 rounded-lg px-3 text-[12.5px] hover:bg-ink/5 transition-colors duration-200" @click="clearImage">清除</button>
            </div>
          </section>

          <section class="space-y-3">
            <h3 class="font-serif font-semibold text-ink/90 text-[13px]">画面调节</h3>
            <div class="flex items-center gap-3">
              <span class="text-[12px] text-ink/60 w-14 shrink-0">明亮度</span>
              <input v-model.number="store.settings.wallpaperBrightness" type="range" min="40" max="160" step="5" class="flex-1" />
              <span class="text-[11px] text-ink/40 w-9 text-right tabular-nums">{{ store.settings.wallpaperBrightness }}%</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[12px] text-ink/60 w-14 shrink-0">模糊</span>
              <input v-model.number="store.settings.wallpaperBlur" type="range" min="0" max="40" step="1" class="flex-1" />
              <span class="text-[11px] text-ink/40 w-9 text-right tabular-nums">{{ store.settings.wallpaperBlur }}px</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[12px] text-ink/60 w-14 shrink-0">饱和度</span>
              <input v-model.number="store.settings.wallpaperSaturation" type="range" min="0" max="200" step="5" class="flex-1" />
              <span class="text-[11px] text-ink/40 w-9 text-right tabular-nums">{{ store.settings.wallpaperSaturation }}%</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[12px] text-ink/60 w-14 shrink-0">暗度</span>
              <input v-model.number="store.settings.wallpaperDim" type="range" min="0" max="85" step="5" class="flex-1" />
              <span class="text-[11px] text-ink/40 w-9 text-right tabular-nums">{{ store.settings.wallpaperDim }}%</span>
            </div>
          </section>
        </template>

        <!-- ============ 写作 ============ -->
        <template v-else-if="store.settingsTab === '写作'">
          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-2.5">正文字体</h3>
            <div class="flex items-center bg-inset border border-hair/10 rounded-lg p-px">
              <button
                v-for="f in fonts"
                :key="f.key"
                class="flex-1 h-7 rounded-md text-[12.5px] transition-colors duration-200"
                :class="store.settings.font === f.key ? 'bg-ink/12 text-ink/95' : 'text-ink/55 hover:text-ink/90'"
                @click="store.settings.font = f.key"
              >
                {{ f.label }}
              </button>
            </div>
          </section>
          <section class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-[12px] text-ink/60 w-14 shrink-0">字号</span>
              <input v-model.number="store.settings.fontSize" type="range" min="13" max="20" step="1" class="flex-1" />
              <span class="text-[11px] text-ink/40 w-9 text-right tabular-nums">{{ store.settings.fontSize }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[12px] text-ink/60 w-14 shrink-0">行高</span>
              <input v-model.number="store.settings.lineHeight" type="range" min="1.5" max="2.2" step="0.05" class="flex-1" />
              <span class="text-[11px] text-ink/40 w-9 text-right tabular-nums">{{ store.settings.lineHeight.toFixed(2) }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[12px] text-ink/60 w-14 shrink-0">行宽</span>
              <input v-model.number="store.settings.maxWidth" type="range" min="50" max="90" step="2" class="flex-1" />
              <span class="text-[11px] text-ink/40 w-9 text-right tabular-nums">{{ store.settings.maxWidth }}ch</span>
            </div>
          </section>
          <section>
            <span class="block text-[12px] text-ink/60 mb-1.5">新窗口默认打开</span>
            <div class="flex items-center bg-inset border border-hair/10 rounded-lg p-px">
              <button
                v-for="m in modes"
                :key="m.key"
                class="flex-1 h-7 rounded-md text-[12.5px] transition-colors duration-200"
                :class="store.settings.defaultMode === m.key ? 'bg-ink/12 text-ink/95' : 'text-ink/55 hover:text-ink/90'"
                @click="store.settings.defaultMode = m.key"
              >
                {{ m.label }}
              </button>
            </div>
          </section>
          <label class="flex items-center gap-2 text-[12px] text-ink/70">
            <input v-model="store.settings.showStats" type="checkbox" class="accent-accent w-3.5 h-3.5" />
            在窗口底部显示字数统计
          </label>
        </template>

        <!-- ============ Markdown ============ -->
        <template v-else-if="store.settingsTab === 'Markdown'">
          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-1">语法扩展</h3>
            <p class="text-[11.5px] text-ink/45 mb-2.5">按需开启，让预览支持更多 Markdown 写法。</p>
            <div class="space-y-1">
              <label
                v-for="t in mdToggles"
                :key="t.key"
                class="flex items-center justify-between gap-3 py-1.5 cursor-pointer"
              >
                <span class="text-[12.5px] text-ink/75">{{ t.label }}</span>
                <input v-model="store.settings.markdown[t.key]" type="checkbox" class="accent-accent w-3.5 h-3.5 shrink-0" />
              </label>
            </div>
          </section>
          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-1">自定义替换规则</h3>
            <p class="text-[11.5px] text-ink/45 mb-2">
              每行一条，格式 <code class="font-mono text-ink/70">查找 =&gt; 替换</code>。例如
              <code class="font-mono text-ink/70">++ =&gt; &lt;u&gt;</code> 之类，可自行扩展语法（在解析前替换）。
            </p>
            <textarea
              v-model="store.settings.markdown.customRules"
              rows="4"
              spellcheck="false"
              class="w-full bg-inset border border-hair/10 rounded-lg text-[12.5px] text-ink/90 placeholder-ink/30 px-3 py-2 outline-none focus:border-hair/25 font-mono"
              placeholder="==高亮== => <mark>高亮</mark>&#10;[center] => "
            ></textarea>
          </section>
        </template>

        <!-- ============ 文件 ============ -->
        <template v-else-if="store.settingsTab === '文件'">
          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-1">导入文件</h3>
            <p class="text-[11.5px] text-ink/45 mb-2.5 leading-5">
              支持 .md .markdown .txt .text .log .csv .json 等文本文件，也可直接把文件拖到页面上。
            </p>
            <button class="bg-surface text-ink/90 rounded-lg px-3 py-1.5 text-[12.5px] hover:bg-ink/10 transition-colors duration-200" @click="importInput.click()">
              选择文件导入…
            </button>
            <input ref="importInput" type="file" multiple class="hidden" accept=".md,.markdown,.mdown,.mkd,.mdx,.txt,.text,.log,.csv,.tsv,.json,.yml,.yaml,.ini,.conf,.rst,text/*" @change="onImportFile" />
          </section>
          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-1">默认导出格式</h3>
            <p class="text-[11.5px] text-ink/45 mb-2.5">窗口右上角“导出”和右键菜单使用的格式。</p>
            <div class="flex items-center bg-inset border border-hair/10 rounded-lg p-px">
              <button
                v-for="f in formats"
                :key="f.key"
                class="flex-1 h-7 rounded-md text-[12.5px] transition-colors duration-200"
                :class="store.settings.exportFormat === f.key ? 'bg-ink/12 text-ink/95' : 'text-ink/55 hover:text-ink/90'"
                @click="store.settings.exportFormat = f.key"
              >
                {{ f.label }}
              </button>
            </div>
          </section>
          <section>
            <h3 class="font-serif font-semibold text-ink/90 text-[13px] mb-1">数据与隐私</h3>
            <p class="text-[11.5px] text-ink/50 leading-5 mb-3">
              所有内容仅保存在这台设备的浏览器里，不会上传服务器。当前占用 {{ sizeText }}。
            </p>
            <div class="flex flex-wrap gap-2">
              <button class="bg-surface text-ink/90 rounded-lg px-3 py-1.5 text-[12.5px] hover:bg-ink/10 transition-colors duration-200" @click="exportAll">导出全部数据</button>
              <button class="text-ink/75 border border-hair/12 rounded-lg px-3 py-1.5 text-[12.5px] hover:bg-ink/5 transition-colors duration-200" @click="backupInput.click()">导入备份</button>
              <button
                class="rounded-lg px-3 py-1.5 text-[12.5px] transition-colors duration-200 border"
                :class="confirmClear ? 'border-[#ff5f57]/60 text-[#ff5f57] hover:bg-[#ff5f57]/10' : 'border-hair/12 text-ink/60 hover:bg-ink/5'"
                @click="doClear"
              >
                {{ confirmClear ? '再点一次：清空并重新开始' : '清空所有数据' }}
              </button>
              <input ref="backupInput" type="file" accept="application/json,.json" class="hidden" @change="onBackup" />
            </div>
          </section>
        </template>

        <!-- ============ 快捷键 ============ -->
        <template v-else>
          <section>
            <div class="flex items-center justify-between mb-1">
              <h3 class="font-serif font-semibold text-ink/90 text-[13px]">键盘快捷键</h3>
              <button
                class="text-ink/55 border border-hair/12 rounded-lg px-2.5 py-1 text-[11.5px] hover:bg-ink/5 transition-colors duration-200"
                @click="resetAllBindings()"
              >
                全部恢复默认
              </button>
            </div>
            <p class="text-[11.5px] text-ink/45 mb-3 leading-5">
              点击右侧按键重新录制；录制时按 <kbd class="font-mono">Esc</kbd> 取消，按 <kbd class="font-mono">Delete</kbd> 清除该项。
            </p>
            <div v-for="(list, g) in grouped" :key="g" class="mb-4">
              <p class="text-[11px] text-ink/40 tracking-wider mb-1.5">{{ g }}</p>
              <div class="space-y-0.5">
                <div
                  v-for="s in list"
                  :key="s.id"
                  class="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-ink/5"
                >
                  <span class="text-[12.5px] text-ink/75">{{ s.label }}</span>
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      class="min-w-[72px] text-center font-mono text-[11.5px] rounded-md px-2 py-1 border transition-colors duration-200"
                      :class="
                        recordingId === s.id
                          ? 'border-accent text-accent bg-accent/10'
                          : conflicts.has(s.id)
                            ? 'border-[#ff5f57]/60 text-[#ff5f57] hover:bg-ink/5'
                            : 'border-hair/12 text-ink/60 hover:bg-ink/5'
                      "
                      @click="startRecording(s.id)"
                    >
                      {{ recordingId === s.id ? '按下按键…' : formatBinding(getBinding(s.id)) }}
                    </button>
                    <button
                      class="w-5 h-5 rounded-md text-ink/35 hover:bg-ink/10 hover:text-ink/80 flex items-center justify-center transition-colors duration-200"
                      title="恢复默认"
                      @click="resetBinding(s.id)"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="conflicts.size" class="text-[11.5px] text-[#ff5f57]">有快捷键冲突（红色标出），建议修改其一。</p>
          </section>
        </template>
      </div>

      <div class="flex items-center justify-between px-5 py-3.5 border-t border-hair/8">
        <span class="text-[11.5px] text-ink/40">素笺 · 0.3 · 本地保存</span>
        <button class="text-ink/60 border border-hair/12 rounded-lg px-3 py-1.5 text-[12px] hover:bg-ink/5 transition-colors duration-200" @click="resetSettings">
          恢复默认设置
        </button>
      </div>
    </div>
  </div>
</template>
