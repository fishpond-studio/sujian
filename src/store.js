import { reactive, watch } from 'vue'
import { renderMarkdown } from './utils/markdown'

const DOC_KEY = 'sujian.docs.v1'
const UI_KEY = 'sujian.ui.v2'
const UI_KEY_OLD = 'sujian.ui.v1'
const SET_KEY = 'sujian.settings.v1'
const ONBOARD_KEY = 'sujian.onboarded.v1'

export function uid(prefix = 'id') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export const WALLPAPERS = [
  { id: 'graphite', name: '石墨', dark: '#1c1c1e', light: '#eeeef1' },
  { id: 'midnight', name: '午夜', dark: '#0e0e10', light: '#f6f6f8' },
  { id: 'charcoal', name: '炭灰', dark: '#2a2a2c', light: '#e3e3e8' },
  { id: 'slate', name: '青岩', dark: '#20262b', light: '#e6ebef' },
  { id: 'ink', name: '墨蓝', dark: '#141a24', light: '#e7edf6' },
  { id: 'ocean', name: '深海', dark: '#101d26', light: '#e4eef4' },
  { id: 'forest', name: '松林', dark: '#15211c', light: '#e7efe9' },
  { id: 'moss', name: '苔原', dark: '#1e2418', light: '#ebeee4' },
  { id: 'sepia', name: '暖褐', dark: '#241d18', light: '#efe6d8' },
  { id: 'sand', name: '沙丘', dark: '#26211a', light: '#f2ecdf' },
  { id: 'plum', name: '暗梅', dark: '#221a22', light: '#f0e8ef' },
  { id: 'berry', name: '莓紫', dark: '#241a24', light: '#f1e8f0' },
]

const DEFAULT_SETTINGS = {
  theme: 'dark', // dark | light | system
  wallpaper: 'graphite', // preset id | 'custom'
  wallpaperColor: '#1c1c1e',
  wallpaperImage: '',
  wallpaperDim: 40,
  wallpaperBrightness: 100,
  wallpaperBlur: 0,
  wallpaperSaturation: 100,
  showWatermark: true,
  font: 'sans', // sans | serif | mono
  fontSize: 15,
  lineHeight: 1.85,
  maxWidth: 70,
  defaultMode: 'split', // edit | split | preview
  showStats: true,
  exportFormat: 'md', // md | txt | html
  markdown: {
    gfm: true,
    breaks: true,
    highlight: true,
    sup: false,
    sub: false,
    emoji: false,
    customRules: '',
  },
  shortcuts: {},
}

const WELCOME = `# 素笺 · 安安静静写字

这是一个**网页版 Markdown 编辑器**。

把这里当作一张素净的纸。左边写，右边看；写累了，窗口随手拖到旁边。

## 你会用到的

- 顶部**菜单栏**：新建窗口、导出文稿、设置、打开示例
- 左侧**文稿栏**：点一下打开窗口，底部按钮新建一张纸
- 窗口**标题栏**：可以拖动摆放，红点关闭、黄点收起、绿点放大
- 右下角**拖拽角**：随意调整窗口大小
- 工具栏的**分离**按钮：把预览拆成独立窗口，左右分开看
- **编辑 / 分屏 / 预览**：三种看稿方式随意切换

## 试试这些语法

> 引用一行话，像是纸张的边注。

\`\`\`js
const quiet = () => '此刻，只有文字'
\`\`\`

- [x] 写下第一行字
- [ ] 安安静静写完一整篇

---

所有内容都**自动保存在本地**，关闭浏览器也不会丢。用菜单里的"导出"可以下载成 \`.md\` 文件。

愿你在这里，写下想写的东西。
`

/* ---------------- state ---------------- */
export const store = reactive({
  docs: {},
  docOrder: [],
  windows: [],
  activeWindowId: null,
  sidebarOpen: true,
  settings: { ...DEFAULT_SETTINGS, markdown: { ...DEFAULT_SETTINGS.markdown }, shortcuts: {} },
  lastSavedAt: null,
  dirty: false,
  now: new Date(),
  showHelp: false,
  showSettings: false,
  showOnboarding: false,
  settingsTab: '外观',
  shortcutRecording: false,
  renameDocId: null,
  renameWindowId: null,
  contextMenu: { open: false, x: 0, y: 0, items: [] },
  histTick: 0,
})

/* per-document undo/redo histories (kept out of reactivity for speed) */
const histories = {}

/* ---------------- storage ---------------- */
function loadDocs() {
  try {
    const raw = localStorage.getItem(DOC_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.docs && data.docOrder) {
        store.docs = data.docs
        store.docOrder = data.docOrder
      }
    }
  } catch (e) {
    /* ignore */
  }
  if (!store.docOrder.length) {
    const doc = {
      id: uid('doc'),
      title: '第一张笺纸',
      content: WELCOME,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    store.docs[doc.id] = doc
    store.docOrder = [doc.id]
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SET_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      const md = { ...DEFAULT_SETTINGS.markdown, ...(saved.markdown || {}) }
      Object.assign(store.settings, saved)
      store.settings.markdown = md
    }
  } catch (e) {
    /* ignore */
  }
}

function loadUI() {
  let ui = null
  try {
    const raw = localStorage.getItem(UI_KEY) || localStorage.getItem(UI_KEY_OLD)
    if (raw) ui = JSON.parse(raw)
  } catch (e) {
    /* ignore */
  }
  if (!ui) return
  if (Array.isArray(ui.windows)) {
    store.windows = ui.windows.map((w) => ({
      id: w.id || uid('win'),
      docId: w.docId,
      kind: w.kind === 'preview' ? 'preview' : 'editor',
      x: w.x ?? 80,
      y: w.y ?? 60,
      w: w.w ?? 640,
      h: w.h ?? 480,
      z: w.z ?? 1,
      mode: w.mode || store.settings.defaultMode,
      ratio: typeof w.ratio === 'number' ? w.ratio : 0.5,
      minimized: false,
      zoom: false,
    }))
    store.windows = store.windows.filter((w) => store.docs[w.docId])
  }
  if (ui.sidebarOpen !== undefined) store.sidebarOpen = ui.sidebarOpen
  if (ui.fontPref) store.settings.font = ui.fontPref
}

/* ---------------- persistence ---------------- */
let saveTimer = null
watch(
  () => ({ docs: store.docs, docOrder: store.docOrder, windows: store.windows }),
  () => {
    store.dirty = true
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 500)
  },
  { deep: true },
)

watch(() => store.settings, persist, { deep: true })

function persist() {
  if (resetting) return
  try {
    localStorage.setItem(DOC_KEY, JSON.stringify({ docs: store.docs, docOrder: store.docOrder }))
    localStorage.setItem(
      UI_KEY,
      JSON.stringify({
        windows: store.windows.map((w) => ({
          id: w.id,
          docId: w.docId,
          kind: w.kind,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          z: w.z,
          mode: w.mode,
          ratio: w.ratio,
        })),
        sidebarOpen: store.sidebarOpen,
      }),
    )
    store.lastSavedAt = new Date()
    store.dirty = false
  } catch (e) {
    /* ignore */
  }
}

export function saveNow() {
  if (resetting) return
  clearTimeout(saveTimer)
  persist()
}

let resetting = false

window.addEventListener('beforeunload', () => {
  if (resetting) return
  clearTimeout(saveTimer)
  persist()
})
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (!resetting) {
      clearTimeout(saveTimer)
      persist()
    }
  } else {
    store.now = new Date()
  }
})

/* ---------------- theme & background ---------------- */
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function resolvedTheme() {
  if (store.settings.theme === 'system') return media && media.matches ? 'dark' : 'light'
  return store.settings.theme
}

export function applyTheme() {
  const t = resolvedTheme()
  document.documentElement.dataset.theme = t
  document.documentElement.style.colorScheme = t
  document.body.style.background = store.settings.wallpaperColor
}

export function setTheme(theme) {
  store.settings.theme = theme
  // if a preset wallpaper is active, swap to the variant matching the new theme
  const preset = WALLPAPERS.find(
    (p) => p.dark.toLowerCase() === store.settings.wallpaperColor.toLowerCase() || p.light.toLowerCase() === store.settings.wallpaperColor.toLowerCase(),
  )
  if (preset && !store.settings.wallpaperImage) {
    store.settings.wallpaper = preset.id
    store.settings.wallpaperColor = resolvedTheme() === 'dark' ? preset.dark : preset.light
  }
  applyTheme()
}

if (media) {
  const onChange = () => {
    if (store.settings.theme === 'system') applyTheme()
  }
  media.addEventListener ? media.addEventListener('change', onChange) : media.addListener(onChange)
}

watch(
  () => [store.settings.wallpaperColor, store.settings.wallpaperImage],
  () => applyTheme(),
)

export function setWallpaper(id) {
  const p = WALLPAPERS.find((x) => x.id === id)
  if (!p) return
  store.settings.wallpaper = id
  store.settings.wallpaperImage = ''
  store.settings.wallpaperColor = resolvedTheme() === 'dark' ? p.dark : p.light
  applyTheme()
}

export function setSetting(key, value) {
  store.settings[key] = value
}

export function resetSettings() {
  const theme = store.settings.theme
  Object.assign(store.settings, DEFAULT_SETTINGS, { markdown: { ...DEFAULT_SETTINGS.markdown }, shortcuts: {} })
  store.settings.theme = theme
  applyTheme()
}

export function emitCommand(id) {
  window.dispatchEvent(new CustomEvent('sujian:cmd', { detail: id }))
}

/* ---------------- docs ---------------- */
export function newDoc(title = '未命名笺纸') {
  const doc = {
    id: uid('doc'),
    title,
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  store.docs[doc.id] = doc
  store.docOrder.unshift(doc.id)
  return doc
}

export function deleteDoc(id) {
  delete store.docs[id]
  delete histories[id]
  store.docOrder = store.docOrder.filter((d) => d !== id)
  store.windows = store.windows.filter((w) => w.docId !== id)
  if (store.activeWindowId && !store.windows.find((w) => w.id === store.activeWindowId)) {
    store.activeWindowId = store.windows.length ? store.windows[store.windows.length - 1].id : null
  }
}

export function getDoc(id) {
  return store.docs[id]
}

export function updateContent(id, content) {
  const d = store.docs[id]
  if (d) {
    d.content = content
    d.updatedAt = Date.now()
  }
}

export function updateTitle(id, title) {
  const d = store.docs[id]
  if (d) {
    d.title = title.trim() || '未命名笺纸'
    d.updatedAt = Date.now()
  }
}

/* ---------------- undo / redo ---------------- */
const HISTORY_LIMIT = 300

export function recordHistory(docId, oldContent, force = false) {
  const h = histories[docId] || (histories[docId] = { past: [], future: [], lastAt: 0 })
  const now = Date.now()
  if (force || now - h.lastAt > 800) {
    if (h.past[h.past.length - 1] !== oldContent) h.past.push(oldContent)
    if (h.past.length > HISTORY_LIMIT) h.past.shift()
    h.future.length = 0
  }
  h.lastAt = now
  store.histTick++
}

export function canUndo(docId) {
  const h = histories[docId]
  return !!(h && h.past.length)
}
export function canRedo(docId) {
  const h = histories[docId]
  return !!(h && h.future.length)
}

export function undo(docId) {
  const h = histories[docId]
  const d = store.docs[docId]
  if (!h || !h.past.length || !d) return false
  h.future.push(d.content)
  if (h.future.length > HISTORY_LIMIT) h.future.shift()
  d.content = h.past.pop()
  d.updatedAt = Date.now()
  h.lastAt = 0
  store.histTick++
  return true
}

export function redo(docId) {
  const h = histories[docId]
  const d = store.docs[docId]
  if (!h || !h.future.length || !d) return false
  h.past.push(d.content)
  if (h.past.length > HISTORY_LIMIT) h.past.shift()
  d.content = h.future.pop()
  d.updatedAt = Date.now()
  h.lastAt = 0
  store.histTick++
  return true
}

/* ---------------- document actions ---------------- */
export function duplicateDoc(id) {
  const src = store.docs[id]
  if (!src) return null
  const copy = {
    id: uid('doc'),
    title: src.title + ' 副本',
    content: src.content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  store.docs[copy.id] = copy
  const i = store.docOrder.indexOf(id)
  store.docOrder.splice(i < 0 ? 0 : i + 1, 0, copy.id)
  return copy
}

export function newWindow() {
  const doc = newDoc()
  return openWindow(doc.id)
}

export function exportDoc(idOrDoc, format) {
  const doc = typeof idOrDoc === 'string' ? store.docs[idOrDoc] : idOrDoc
  if (!doc) return
  const fmt = format || store.settings.exportFormat || 'md'
  const title = doc.title || '未命名笺纸'
  let data = doc.content || ''
  let mime = 'text/markdown;charset=utf-8'
  let ext = 'md'
  if (fmt === 'txt') {
    mime = 'text/plain;charset=utf-8'
    ext = 'txt'
  } else if (fmt === 'html') {
    const body = renderMarkdown(data, store.settings.markdown)
    data = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<style>
body{max-width:44rem;margin:3rem auto;padding:0 1.25rem;font:16px/1.9 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1d1d1f}
h1,h2,h3,h4{font-family:Georgia,"Songti SC",serif;line-height:1.45}
pre{background:#f5f5f7;border-radius:8px;padding:1rem;overflow:auto}
code{font-family:"SF Mono",Menlo,monospace;font-size:.9em}
blockquote{border-left:1px solid #d2d2d7;margin:1em 0;padding-left:1em;color:#6e6e73}
a{color:#0a84ff}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d2d2d7;padding:.4em .7em}
mark{background:#fff3b0}
</style>
</head>
<body>
${body}
</body>
</html>`
    mime = 'text/html;charset=utf-8'
    ext = 'html'
  }
  const blob = new Blob([data], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${title}.${ext}`
  a.click()
  URL.revokeObjectURL(a.href)
}

const TEXT_EXT = ['md', 'markdown', 'mdown', 'mkd', 'mdx', 'txt', 'text', 'log', 'csv', 'tsv', 'json', 'yml', 'yaml', 'ini', 'conf', 'rst']

export function isTextFile(file) {
  const name = (file.name || '').toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop() : ''
  return TEXT_EXT.includes(ext) || (file.type && file.type.startsWith('text/'))
}

export function requestImport() {
  window.dispatchEvent(new Event('sujian:import'))
}

export function importFiles(fileList) {
  const files = [...(fileList || [])].filter(isTextFile)
  if (!files.length) return 0
  let opened = false
  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      const name = (file.name || '导入的文稿').replace(/\.[^.]+$/, '') || '导入的文稿'
      const doc = newDoc(name)
      store.docs[doc.id] = doc
      doc.content = String(reader.result || '')
      if (!opened) {
        opened = true
        openWindow(doc.id)
      }
    }
    reader.readAsText(file)
  })
  return files.length
}

/* ---------------- context menu ---------------- */
export function openContextMenu(x, y, items) {
  store.contextMenu.x = x
  store.contextMenu.y = y
  store.contextMenu.items = items
  store.contextMenu.open = true
}
export function closeContextMenu() {
  if (!store.contextMenu.open) return
  store.contextMenu.open = false
  store.contextMenu.items = []
}

export function openExample() {
  const doc = newDoc('示例 · 素笺的使用')
  doc.content = WELCOME
  openWindow(doc.id)
  return doc
}

/* ---------------- windows ---------------- */
function nextZ() {
  const max = store.windows.reduce((m, w) => Math.max(m, w.z || 0), 0)
  if (max > 400) {
    const sorted = [...store.windows].sort((a, b) => (a.z || 0) - (b.z || 0))
    sorted.forEach((w, i) => (w.z = i + 1))
    return sorted.length + 1
  }
  return max + 1
}

function area() {
  const sidebarW = store.sidebarOpen ? 236 : 28
  return {
    left: 0,
    top: 0,
    width: Math.max(360, window.innerWidth - sidebarW),
    height: Math.max(300, window.innerHeight - 28),
  }
}

function windowDims(index = 0) {
  const a = area()
  const w = Math.min(Math.max(560, a.width * 0.6), a.width - 32)
  const h = Math.min(Math.max(380, a.height * 0.78), a.height - 24)
  const x = Math.max(12, Math.round(a.width * 0.12) + (index % 4) * 26)
  const y = Math.max(10, Math.round(a.height * 0.07) + (index % 4) * 26)
  return { x, y, w: Math.round(w), h: Math.round(h) }
}

export function openWindow(docId, opts = {}) {
  const kind = opts.kind || 'editor'
  if (kind === 'editor') {
    const existing = store.windows.find((w) => w.docId === docId && w.kind !== 'preview')
    if (existing) {
      focusWindow(existing.id)
      return existing
    }
  } else {
    const existingP = store.windows.find((w) => w.docId === docId && w.kind === 'preview')
    if (existingP) {
      focusWindow(existingP.id)
      return existingP
    }
  }
  const dims = windowDims(store.windows.length)
  const win = {
    id: uid('win'),
    docId,
    kind,
    x: opts.x ?? dims.x,
    y: opts.y ?? dims.y,
    w: opts.w ?? dims.w,
    h: opts.h ?? dims.h,
    z: nextZ(),
    mode: kind === 'preview' ? 'preview' : store.settings.defaultMode,
    ratio: 0.5,
    minimized: false,
    zoom: false,
    restore: null,
  }
  store.windows.push(win)
  store.activeWindowId = win.id
  return win
}

export function focusWindow(id) {
  const w = store.windows.find((x) => x.id === id)
  if (!w) return
  store.activeWindowId = id
  w.minimized = false
  w.z = nextZ()
}

export function restoreAll() {
  store.windows.forEach((w) => (w.minimized = false))
  const top = [...store.windows].sort((a, b) => (b.z || 0) - (a.z || 0))[0]
  if (top) focusWindow(top.id)
}

export function closeWindow(id) {
  const i = store.windows.findIndex((w) => w.id === id)
  if (i > -1) store.windows.splice(i, 1)
  if (store.activeWindowId === id) {
    const top = [...store.windows].sort((a, b) => (b.z || 0) - (a.z || 0))[0]
    store.activeWindowId = top ? top.id : null
  }
}

export function toggleMinimize(id) {
  const w = store.windows.find((x) => x.id === id)
  if (!w) return
  w.minimized = !w.minimized
  if (!w.minimized) focusWindow(id)
  else if (store.activeWindowId === id) {
    const top = [...store.windows].filter((x) => !x.minimized).sort((a, b) => (b.z || 0) - (a.z || 0))[0]
    store.activeWindowId = top ? top.id : null
  }
}

export function toggleZoom(id) {
  const w = store.windows.find((x) => x.id === id)
  if (!w) return
  focusWindow(id)
  if (!w.zoom) {
    w.restore = { x: w.x, y: w.y, w: w.w, h: w.h }
    w.zoom = true
  } else {
    if (w.restore) {
      w.x = w.restore.x
      w.y = w.restore.y
      w.w = w.restore.w
      w.h = w.restore.h
    }
    w.zoom = false
  }
}

export function unzoom(id) {
  const w = store.windows.find((x) => x.id === id)
  if (w) w.zoom = false
}

export function setMode(id, mode) {
  const w = store.windows.find((x) => x.id === id)
  if (w) w.mode = mode
}

export function setRatio(id, ratio) {
  const w = store.windows.find((x) => x.id === id)
  if (w) w.ratio = Math.min(0.8, Math.max(0.2, ratio))
}

export function detachPreview(docId) {
  const editor = store.windows.find((w) => w.docId === docId && w.kind !== 'preview')
  const existing = store.windows.find((w) => w.docId === docId && w.kind === 'preview')
  if (existing) {
    focusWindow(existing.id)
    return existing
  }
  const a = area()
  const base = editor || { x: 60, y: 40, w: Math.round(a.width * 0.5), h: Math.round(a.height * 0.7) }
  const w = Math.max(360, Math.round(base.w * 0.82))
  let x = base.x + base.w + 14
  if (x + w > a.width) x = Math.max(8, base.x - w - 14)
  if (x < 8) x = Math.max(8, a.width - w - 12)
  const win = {
    id: uid('win'),
    docId,
    kind: 'preview',
    x,
    y: Math.max(8, base.y),
    w,
    h: base.h,
    z: nextZ(),
    mode: 'preview',
    ratio: 0.5,
    minimized: false,
    zoom: false,
    restore: null,
  }
  store.windows.push(win)
  if (editor) setMode(editor.id, 'edit')
  store.activeWindowId = win.id
  return win
}

export function mergePreview(docId) {
  store.windows.filter((w) => w.docId === docId && w.kind === 'preview').forEach((w) => closeWindow(w.id))
  const editor = store.windows.find((w) => w.docId === docId && w.kind !== 'preview')
  if (editor) {
    setMode(editor.id, 'split')
    focusWindow(editor.id)
  }
}

export function hasPreview(docId) {
  return store.windows.some((w) => w.docId === docId && w.kind === 'preview')
}

export function arrangeWindows() {
  const list = store.windows.filter((w) => !w.minimized)
  if (!list.length) return
  const a = area()
  const gap = 12
  const pad = 12
  const cols = list.length === 1 ? 1 : list.length === 2 ? 2 : 2
  const rows = Math.ceil(list.length / cols)
  const cw = (a.width - pad * 2 - gap * (cols - 1)) / cols
  const ch = (a.height - pad * 2 - gap * (rows - 1)) / rows
  list.forEach((w, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    w.minimized = false
    w.zoom = false
    w.x = Math.round(pad + c * (cw + gap))
    w.y = Math.round(pad + r * (ch + gap))
    w.w = Math.round(cw)
    w.h = Math.round(ch)
    w.z = nextZ()
  })
}

export function clampWindows() {
  const a = area()
  store.windows.forEach((w) => {
    w.w = Math.max(360, Math.min(w.w, a.width - 16))
    w.h = Math.max(240, Math.min(w.h, a.height - 16))
    w.x = Math.max(4, Math.min(w.x, a.width - w.w - 4))
    w.y = Math.max(4, Math.min(w.y, a.height - w.h - 4))
  })
}

watch(
  () => store.sidebarOpen,
  () => {
    setTimeout(clampWindows, 230)
  },
)

/* ---------------- data management ---------------- */
export function storageSize() {
  try {
    const docs = localStorage.getItem(DOC_KEY) || ''
    const ui = localStorage.getItem(UI_KEY) || ''
    const set = localStorage.getItem(SET_KEY) || ''
    return new Blob([docs + ui + set]).size
  } catch (e) {
    return 0
  }
}

export function exportAll() {
  const payload = {
    app: 'sujian',
    version: 1,
    exportedAt: new Date().toISOString(),
    docs: store.docs,
    docOrder: store.docOrder,
    settings: store.settings,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `素笺备份-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function importAll(json) {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    if (data.docs && data.docOrder) {
      store.docs = data.docs
      store.docOrder = data.docOrder
      store.windows = []
      Object.keys(histories).forEach((k) => delete histories[k])
      if (data.settings) Object.assign(store.settings, data.settings)
      if (store.docOrder.length) openWindow(store.docOrder[0])
      applyTheme()
      persist()
      return true
    }
  } catch (e) {
    /* ignore */
  }
  return false
}

export function clearAllData() {
  resetting = true
  clearTimeout(saveTimer)
  try {
    ;[DOC_KEY, UI_KEY, UI_KEY_OLD, SET_KEY, ONBOARD_KEY].forEach((k) => localStorage.removeItem(k))
    sessionStorage.clear()
  } catch (e) {
    /* ignore */
  }
  hardReload()
}

function hardReload() {
  const go = () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('_r', Date.now().toString(36))
      window.location.replace(url.toString())
    } catch (e) {
      window.location.reload()
    }
  }
  if (window.caches && caches.keys) {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(go)
      .catch(go)
  } else {
    go()
  }
}

/* ---------------- onboarding ---------------- */
export function shouldShowOnboarding() {
  try {
    return !localStorage.getItem(ONBOARD_KEY)
  } catch (e) {
    return true
  }
}
export function finishOnboarding() {
  try {
    localStorage.setItem(ONBOARD_KEY, '1')
  } catch (e) {
    /* ignore */
  }
  store.showOnboarding = false
  if (!store.windows.length && store.docOrder.length) openWindow(store.docOrder[0])
}

export { renderMarkdown }

setInterval(() => {
  store.now = new Date()
}, 10000)

/* ---------------- boot ---------------- */
if (window.location.search.includes('_r=')) {
  try {
    const u = new URL(window.location.href)
    u.searchParams.delete('_r')
    window.history.replaceState(null, '', u.pathname + u.search + u.hash)
  } catch (e) {
    /* ignore */
  }
}
loadDocs()
loadSettings()
loadUI()
applyTheme()
if (shouldShowOnboarding()) {
  store.showOnboarding = true
} else if (!store.windows.length) {
  openWindow(store.docOrder[0])
}
// ensure at least one window when onboarding is dismissed without opening one
