<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  store,
  updateContent,
  updateTitle,
  closeWindow,
  toggleMinimize,
  toggleZoom,
  focusWindow,
  setMode,
  setRatio,
  detachPreview,
  mergePreview,
  hasPreview,
  recordHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  openContextMenu,
  exportDoc,
} from '../store'
import { renderMarkdown, statsOf } from '../utils/markdown'
import { windowMenuItems } from '../utils/contextMenus'

const props = defineProps({
  win: { type: Object, required: true },
  doc: { type: Object, default: null },
  active: { type: Boolean, default: false },
})

const rootEl = ref(null)
const bodyEl = ref(null)
const editorRef = ref(null)
const previewRef = ref(null)
const titleRef = ref('')
const titleInputRef = ref(null)
const fontOpen = ref(false)
const editingTitle = ref(false)
const dragMoved = ref(false)

const isPreviewKind = computed(() => props.win.kind === 'preview')
const showEditor = computed(() => !isPreviewKind.value && props.win.mode !== 'preview')
const showPreview = computed(() => isPreviewKind.value || props.win.mode !== 'edit')
const split = computed(() => !isPreviewKind.value && props.win.mode === 'split')
const previewOpen = computed(() => props.doc && hasPreview(props.doc.id))

watch(
  () => props.doc?.title,
  (t) => {
    if (!editingTitle.value) titleRef.value = t || ''
  },
  { immediate: true },
)

const html = computed(() => (props.doc ? renderMarkdown(props.doc.content, store.settings.markdown) : ''))
const stats = computed(() => statsOf(props.doc?.content))
const undoable = computed(() => {
  store.histTick
  return !!props.doc && canUndo(props.doc.id)
})
const redoable = computed(() => {
  store.histTick
  return !!props.doc && canRedo(props.doc.id)
})

watch(
  () => store.renameWindowId,
  (id) => {
    if (id === props.win.id && !isPreviewKind.value) {
      store.renameWindowId = null
      startEditTitle()
    }
  },
)

function onInput(e) {
  const val = e.target.value
  const doc = props.doc
  if (!doc) return
  const old = doc.content || ''
  const force =
    e.inputType === 'insertFromPaste' ||
    e.inputType === 'insertFromDrop' ||
    Math.abs(val.length - old.length) > 3
  recordHistory(doc.id, old, force)
  updateContent(doc.id, val)
}

function doUndo() {
  if (!props.doc) return
  if (undo(props.doc.id)) {
    nextTick(() => {
      const ta = editorRef.value
      if (ta) {
        ta.focus()
        const p = ta.value.length
        ta.setSelectionRange(p, p)
      }
    })
  }
}
function doRedo() {
  if (!props.doc) return
  if (redo(props.doc.id)) {
    nextTick(() => {
      const ta = editorRef.value
      if (ta) {
        ta.focus()
        const p = ta.value.length
        ta.setSelectionRange(p, p)
      }
    })
  }
}

function onWindowContext(e) {
  if (e.target.closest('textarea, .md-preview, input')) return
  e.preventDefault()
  e.stopPropagation()
  focusWindow(props.win.id)
  openContextMenu(e.clientX, e.clientY, windowMenuItems(props.win))
}

function posStyle() {
  if (props.win.zoom) {
    return {
      zIndex: props.win.z,
      position: 'absolute',
      top: '6px',
      left: '6px',
      right: '6px',
      bottom: '6px',
      width: 'auto',
      height: 'auto',
      transform: 'none',
    }
  }
  return {
    zIndex: props.win.z,
    width: props.win.w + 'px',
    height: props.win.h + 'px',
    transform: `translate(${props.win.x}px, ${props.win.y}px)`,
  }
}

function parentRect() {
  const el = rootEl.value && rootEl.value.parentElement
  if (el) return el.getBoundingClientRect()
  return { width: window.innerWidth, height: window.innerHeight }
}

function onTitlebarDbl(e) {
  if (e.target.closest('input, button')) return
  toggleZoom(props.win.id)
}

onMounted(() => {
  if (props.active && !isPreviewKind.value && props.win.mode === 'edit') {
    nextTick(() => editorRef.value && editorRef.value.focus())
  }
  window.addEventListener('sujian:cmd', onCommand)
})
onBeforeUnmount(() => {
  window.removeEventListener('sujian:cmd', onCommand)
})

/* ---------------- drag ---------------- */
const SNAP = 12
function onTitleDown(e) {
  if (e.target.closest('[data-nodrag]')) return
  focusWindow(props.win.id)
  if (props.win.zoom) return
  if (editingTitle.value) commitTitle()
  const w = props.win
  const pr = parentRect()
  const startX = e.clientX
  const startY = e.clientY
  const ox = w.x
  const oy = w.y
  dragMoved.value = false
  const move = (ev) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved.value = true
    let nx = ox + dx
    let ny = oy + dy
    const maxX = Math.max(0, pr.width - w.w)
    const maxY = Math.max(0, pr.height - w.h)
    if (nx < SNAP) nx = 0
    else if (nx > maxX - SNAP) nx = maxX
    if (ny < SNAP) ny = 0
    else if (ny > maxY - SNAP) ny = maxY
    w.x = Math.round(Math.max(0, Math.min(nx, maxX)))
    w.y = Math.round(Math.max(0, Math.min(ny, maxY)))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/* ---------------- resize ---------------- */
function onResizeStart(e, dir) {
  e.preventDefault()
  e.stopPropagation()
  focusWindow(props.win.id)
  if (props.win.zoom) return
  const w = props.win
  const pr = parentRect()
  const startX = e.clientX
  const startY = e.clientY
  const { x: ox, y: oy, w: ow, h: oh } = w
  const move = (ev) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    if (dir.includes('e')) w.w = Math.max(360, Math.min(ow + dx, pr.width - ox))
    if (dir.includes('s')) w.h = Math.max(240, Math.min(oh + dy, pr.height - oy))
    if (dir.includes('w')) {
      const nw = Math.max(360, Math.min(ow - dx, ox + ow))
      w.x = ox + ow - nw
      w.w = nw
    }
    if (dir.includes('n')) {
      const nh = Math.max(240, Math.min(oh - dy, oy + oh))
      w.y = oy + oh - nh
      w.h = nh
    }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/* ---------------- split divider ---------------- */
function onDividerDown(e) {
  e.preventDefault()
  const rect = bodyEl.value.getBoundingClientRect()
  const move = (ev) => setRatio(props.win.id, (ev.clientX - rect.left) / rect.width)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function commitTitle() {
  editingTitle.value = false
  if (props.doc) updateTitle(props.doc.id, titleRef.value)
}

function cancelTitle() {
  editingTitle.value = false
  titleRef.value = props.doc?.title || ''
}

function startEditTitle() {
  if (!props.doc) return
  titleRef.value = props.doc.title || ''
  editingTitle.value = true
  nextTick(() => {
    if (titleInputRef.value) {
      titleInputRef.value.focus()
      titleInputRef.value.select()
    }
  })
}

function onTitleClick() {
  if (dragMoved.value) {
    dragMoved.value = false
    return
  }
  startEditTitle()
}

/* ---------------- formatting ---------------- */
function insertText(open, close, placeholder) {
  const ta = editorRef.value
  if (!ta || !props.doc) return
  const { selectionStart: s, selectionEnd: e } = ta
  const selected = props.doc.content.slice(s, e)
  const body = selected || placeholder || ''
  recordHistory(props.doc.id, props.doc.content, true)
  updateContent(props.doc.id, props.doc.content.slice(0, s) + open + body + close + props.doc.content.slice(e))
  nextTick(() => {
    ta.focus()
    const ns = s + open.length
    ta.setSelectionRange(ns, ns + body.length)
  })
}

function blockWrap(prefix) {
  const ta = editorRef.value
  if (!ta || !props.doc) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  const content = props.doc.content
  const lineStart = content.lastIndexOf('\n', s - 1) + 1
  const lineEnd = content.indexOf('\n', e)
  const sliceEnd = lineEnd === -1 ? content.length : lineEnd
  const replaced = content
    .slice(lineStart, sliceEnd)
    .split('\n')
    .map((l) => prefix + l)
    .join('\n')
  recordHistory(props.doc.id, content, true)
  updateContent(props.doc.id, content.slice(0, lineStart) + replaced + content.slice(sliceEnd))
  nextTick(() => {
    ta.focus()
    ta.setSelectionRange(lineStart + prefix.length, lineStart + replaced.length)
  })
}

function insertPlain(text) {
  const ta = editorRef.value
  if (!ta || !props.doc) return
  const s = ta.selectionStart
  const e = ta.selectionEnd
  const content = props.doc.content
  recordHistory(props.doc.id, content, true)
  updateContent(props.doc.id, content.slice(0, s) + '\n' + text + '\n' + content.slice(e))
  nextTick(() => {
    ta.focus()
    const pos = s + 1 + text.length + 1
    ta.setSelectionRange(pos, pos)
  })
}

const ICON = {
  bold: '<text x="12" y="16" font-family="Georgia,serif" font-weight="700" font-size="15" fill="currentColor" text-anchor="middle">B</text>',
  italic: '<text x="12" y="16" font-family="Georgia,serif" font-style="italic" font-size="15" fill="currentColor" text-anchor="middle">I</text>',
  strike: '<text x="12" y="15.5" font-family="Georgia,serif" font-size="14" fill="currentColor" text-anchor="middle">S<tspan dy="3.5" x="12">─</tspan></text>',
  header: '<text x="12" y="16" font-family="Georgia,serif" font-size="15" fill="currentColor" text-anchor="middle">H</text>',
  quote: '<path d="M10.5 6.5q-3 2.5-3 5h2.6a1.9 1.9 0 1 1-1.8 2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17 6.5q-3 2.5-3 5h2.6a1.9 1.9 0 1 1-1.8 2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  code: '<polyline points="9 18 5 12 9 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15 6 19 12 15 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  link: '<path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  ulist: '<circle cx="7" cy="12" r="1.6" fill="currentColor"/><line x1="11" y1="6.6" x2="19" y2="6.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="17.4" x2="19" y2="17.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  olist: '<text x="7" y="15.5" font-family="sans-serif" font-size="11" fill="currentColor" text-anchor="middle">1</text><line x1="11" y1="6.6" x2="19" y2="6.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="11" y1="17.4" x2="19" y2="17.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  img: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9.5" r="1.5" fill="currentColor"/><path d="m4.5 17 4-4.5 3 3 3-3.5 5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  hr: '<line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
}

const tools = [
  { key: 'bold', fn: () => insertText('**', '**', '加粗文字') },
  { key: 'italic', fn: () => insertText('*', '*', '斜体文字') },
  { key: 'strike', fn: () => insertText('~~', '~~', '删除的文字') },
  { key: 'header', fn: () => blockWrap('## ') },
  { key: 'quote', fn: () => blockWrap('> ') },
  { key: 'code', fn: () => insertText('`', '`', '代码') },
  { key: 'link', fn: () => insertText('[', '](https://)', '链接文字') },
  { key: 'ulist', fn: () => blockWrap('- ') },
  { key: 'olist', fn: () => blockWrap('1. ') },
  { key: 'img', fn: () => insertPlain('![图片说明](https://)') },
  { key: 'hr', fn: () => insertPlain('---') },
]

const toolTip = {
  bold: '加粗 ⌘B', italic: '斜体 ⌘I', strike: '删除线 ⌘⇧X', header: '标题 ⌘⇧H',
  quote: '引用 ⌘⇧Q', code: '行内代码', link: '链接 ⌘K', ulist: '无序列表',
  olist: '有序列表', img: '图片', hr: '分割线',
}

const fonts = [
  { key: 'sans', label: '无衬线', cls: 'font-sans' },
  { key: 'serif', label: '衬线 · 宋', cls: 'font-serif' },
  { key: 'mono', label: '等宽 · 代码', cls: 'font-mono' },
]

const COMMANDS = {
  'editor.undo': () => doUndo(),
  'editor.redo': () => doRedo(),
  'editor.bold': () => insertText('**', '**', '加粗文字'),
  'editor.italic': () => insertText('*', '*', '斜体文字'),
  'editor.link': () => insertText('[', '](https://)', '链接文字'),
  'editor.strike': () => insertText('~~', '~~', '删除的文字'),
  'editor.header': () => blockWrap('## '),
  'editor.quote': () => blockWrap('> '),
}

function onCommand(e) {
  if (props.win.minimized || props.win.id !== store.activeWindowId) return
  const fn = COMMANDS[e.detail]
  if (fn) fn()
}

/* ---------------- scroll sync ---------------- */
let syncing = 0
function syncFrom(src, dst) {
  const maxS = src.scrollHeight - src.clientHeight
  const maxD = dst.scrollHeight - dst.clientHeight
  if (maxS <= 0 || maxD <= 0) return
  syncing = 1
  dst.scrollTop = (src.scrollTop / maxS) * maxD
  setTimeout(() => (syncing = 0), 30)
}
function onEditorScroll() {
  if (split.value && editorRef.value && previewRef.value && !syncing) syncFrom(editorRef.value, previewRef.value)
}
function onPreviewScroll() {
  if (split.value && editorRef.value && previewRef.value && !syncing) syncFrom(previewRef.value, editorRef.value)
}

function exportFile() {
  if (props.doc) exportDoc(props.doc.id)
}

const saveText = computed(() => {
  if (store.dirty) return '正在保存…'
  if (store.lastSavedAt) {
    const hh = store.lastSavedAt.getHours()
    const mm = String(store.lastSavedAt.getMinutes()).padStart(2, '0')
    return `已自动保存 ${hh}:${mm}`
  }
  return '自动保存已开启'
})

const fontClass = computed(() =>
  store.settings.font === 'serif' ? 'editor-serif' : store.settings.font === 'mono' ? 'editor-mono' : '',
)
const previewFontClass = computed(() =>
  store.settings.font === 'serif' ? 'preview-serif' : store.settings.font === 'mono' ? 'preview-mono' : '',
)
</script>

<template>
  <div
    ref="rootEl"
    data-window
    class="absolute top-0 left-0 transition-colors duration-200"
    style="will-change: transform"
    :style="posStyle()"
    @pointerdown="focusWindow(win.id)"
  >
    <div
      class="absolute inset-0 flex flex-col bg-panel/85 backdrop-blur-xl border border-hair/10 rounded-xl overflow-hidden"
      :class="active ? 'shadow-[0_2px_8px_rgba(0,0,0,0.3)]' : 'shadow-none'"
      @contextmenu="onWindowContext"
    >
    <!-- title bar -->
    <div class="relative h-10 flex-shrink-0 flex items-center border-b border-hair/8 px-3" @pointerdown="onTitleDown" @dblclick="onTitlebarDbl">
      <div class="flex items-center gap-2 w-[68px] flex-shrink-0" data-nodrag>
        <button
          class="group w-3 h-3 rounded-lg bg-[#ff5f57] ring-1 ring-black/20 flex items-center justify-center transition-colors duration-200 hover:brightness-90"
          title="关闭窗口"
          @click.stop="closeWindow(win.id)"
        >
          <svg class="hidden group-hover:block text-black/60" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
        <button
          class="group w-3 h-3 rounded-lg bg-[#febc2e] ring-1 ring-black/20 flex items-center justify-center transition-colors duration-200 hover:brightness-90"
          title="最小化"
          @click.stop="toggleMinimize(win.id)"
        >
          <svg class="hidden group-hover:block text-black/60" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M5 12h14" /></svg>
        </button>
        <button
          class="group w-3 h-3 rounded-lg bg-[#28c840] ring-1 ring-black/20 flex items-center justify-center transition-colors duration-200 hover:brightness-90"
          title="缩放 / 还原"
          @click.stop="toggleZoom(win.id)"
        >
          <svg class="hidden group-hover:block text-black/60" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
        </button>
      </div>

      <div class="flex-1 min-w-0 flex justify-center px-2">
        <div v-if="isPreviewKind" class="flex items-center gap-2" data-nodrag>
          <span class="font-serif text-[14px] text-ink/75 truncate max-w-[32ch]">{{ doc?.title || '未命名笺纸' }}</span>
          <span class="text-[10px] text-ink/40 border border-hair/12 rounded px-1.5 py-px">预览</span>
        </div>
        <input
          v-else-if="editingTitle"
          ref="titleInputRef"
          v-model="titleRef"
          class="w-full max-w-[38ch] bg-transparent text-center font-serif text-[14px] text-ink/90 placeholder-ink/30 rounded-md px-2 py-1 outline-none bg-ink/5 transition-colors duration-200"
          placeholder="未命名笺纸"
          spellcheck="false"
          data-nodrag
          @blur="commitTitle"
          @keydown.enter.prevent="commitTitle"
          @keydown.esc.prevent="cancelTitle"
        />
        <button
          v-else
          class="max-w-[38ch] px-2 py-1 rounded-md font-serif text-[14px] text-ink/75 hover:bg-ink/5 hover:text-ink/95 transition-colors duration-200 truncate cursor-text"
          :title="'点击重命名'"
          @click.stop="onTitleClick"
          @dblclick.stop
        >
          {{ doc?.title || '未命名笺纸' }}
        </button>
      </div>

      <div class="w-[68px] flex-shrink-0 flex justify-end" data-nodrag>
        <button
          class="flex items-center gap-1 px-2 h-6 rounded-md text-ink/45 hover:bg-ink/10 hover:text-ink/85 transition-colors duration-200 text-[11px]"
          :title="'导出为 .' + store.settings.exportFormat"
          @click.stop="exportFile"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出
        </button>
      </div>
    </div>

    <!-- toolbar -->
    <div class="h-9 flex-shrink-0 flex items-center border-b border-hair/8 px-2">
      <div class="flex items-center gap-0.5 min-w-0 flex-1 overflow-x-auto">
        <template v-if="!isPreviewKind && win.mode !== 'preview'">
          <button
            class="w-7 h-7 flex-shrink-0 rounded-md flex items-center justify-center transition-colors duration-200"
            :class="undoable ? 'text-ink/60 hover:bg-ink/10 hover:text-ink/95' : 'text-ink/20 cursor-default'"
            :disabled="!undoable"
            title="撤回 ⌘Z"
            @mousedown.prevent
            @click="doUndo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-4" />
            </svg>
          </button>
          <button
            class="w-7 h-7 flex-shrink-0 rounded-md flex items-center justify-center transition-colors duration-200"
            :class="redoable ? 'text-ink/60 hover:bg-ink/10 hover:text-ink/95' : 'text-ink/20 cursor-default'"
            :disabled="!redoable"
            title="重做 ⇧⌘Z"
            @mousedown.prevent
            @click="doRedo"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h4" />
            </svg>
          </button>
          <div class="w-px h-4 bg-hair/12 mx-0.5 flex-shrink-0"></div>
          <button
            v-for="t in tools"
            :key="t.key"
            class="w-7 h-7 flex-shrink-0 rounded-md text-ink/60 hover:bg-ink/10 hover:text-ink/95 transition-colors duration-200 flex items-center justify-center"
            :title="toolTip[t.key]"
            @mousedown.prevent
            @click="t.fn(); focusWindow(win.id)"
          >
            <svg width="17" height="17" viewBox="0 0 24 24"><g v-html="ICON[t.key]"></g></svg>
          </button>
        </template>
      </div>

      <div class="flex items-center gap-0.5 flex-shrink-0 pl-1">
      <!-- font selector (editor only) -->
      <div v-if="!isPreviewKind" class="relative" @mousedown.stop>
        <button
          class="h-7 px-2 rounded-md text-[11px] text-ink/55 hover:bg-ink/10 hover:text-ink/90 transition-colors duration-200 font-serif"
          title="正文字体"
          @click="fontOpen = !fontOpen"
        >
          字
        </button>
        <div v-if="fontOpen" class="absolute right-0 top-full mt-1 w-[140px] bg-base/95 backdrop-blur-xl border border-hair/10 rounded-xl p-1 shadow-[0_2px_8px_rgba(0,0,0,0.3)] z-20">
          <button
            v-for="f in fonts"
            :key="f.key"
            class="w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors duration-200"
            :class="[store.settings.font === f.key ? 'bg-ink/10 text-ink/95' : 'text-ink/75 hover:bg-ink/5', f.cls]"
            @click="store.settings.font = f.key; fontOpen = false"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- detach / merge -->
      <button
        v-if="doc && !isPreviewKind"
        class="h-7 px-2 rounded-md text-[11px] text-ink/55 hover:bg-ink/10 hover:text-ink/90 transition-colors duration-200 flex items-center gap-1"
        :title="previewOpen ? '合并回编辑窗口' : '把预览分离成独立窗口'"
        @click="previewOpen ? mergePreview(doc.id) : detachPreview(doc.id)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
        {{ previewOpen ? '合并' : '分离' }}
      </button>

      <!-- preview-kind controls -->
      <button
        v-if="isPreviewKind"
        class="h-7 px-2.5 rounded-md text-[12px] text-ink/55 hover:bg-ink/10 hover:text-ink/90 transition-colors duration-200"
        title="回到编辑窗口"
        @click="mergePreview(doc.id)"
      >
        回到编辑
      </button>

      <!-- mode segmented (editor only) -->
      <div v-if="!isPreviewKind" class="flex items-center bg-inset/70 border border-hair/10 rounded-lg p-px ml-1">
        <button
          v-for="m in [['edit', '编辑'], ['split', '分屏'], ['preview', '预览']]"
          :key="m[0]"
          class="px-2.5 h-6 rounded-md text-[12px] transition-colors duration-200"
          :class="win.mode === m[0] ? 'bg-ink/12 text-ink/95' : 'text-ink/50 hover:text-ink/85'"
          @click="setMode(win.id, m[0])"
        >
          {{ m[1] }}
        </button>
      </div>
      </div>
    </div>

    <!-- body -->
    <div ref="bodyEl" class="relative flex-1 min-h-0 flex select-text">
      <!-- editor pane -->
      <div
        v-if="showEditor"
        class="min-w-0 flex-shrink-0"
        :style="split ? { flexBasis: win.ratio * 100 + '%' } : { flex: '1 1 0%' }"
      >
        <textarea
          ref="editorRef"
          class="editor-input"
          :class="fontClass"
          :value="doc?.content"
          placeholder="在这里，安静地写下你想写的东西……"
          spellcheck="false"
          @input="onInput"
          @scroll="onEditorScroll"
        ></textarea>
      </div>

      <!-- split divider -->
      <div
        v-if="split"
        class="w-[3px] flex-shrink-0 cursor-col-resize relative group"
        title="拖动调整左右比例"
        @pointerdown="onDividerDown"
      >
        <div class="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-hair/8 group-hover:bg-accent/60 transition-colors duration-200"></div>
      </div>

      <!-- preview pane -->
      <div
        v-if="showPreview"
        ref="previewRef"
        class="flex-1 min-w-0 overflow-y-auto bg-panel"
        @scroll="onPreviewScroll"
      >
        <div class="content-measure px-6 md:px-8 py-8">
          <div v-if="html" class="md-preview" :class="previewFontClass" v-html="html"></div>
          <p v-else class="md-empty text-center py-16 text-sm">预览会在这里显示</p>
        </div>
      </div>
    </div>

    <!-- status bar -->
    <div class="h-7 flex-shrink-0 flex items-center justify-between px-3 border-t border-hair/8 text-[11px] text-ink/40 select-none">
      <span class="flex items-center gap-1.5">
        <template v-if="!isPreviewKind">
          <span class="inline-block w-1.5 h-1.5 rounded-lg" :class="store.dirty ? 'bg-[#febc2e]' : 'bg-accent'"></span>
          {{ saveText }}
        </template>
        <template v-else>
          <span class="inline-block w-1.5 h-1.5 rounded-lg bg-accent"></span>
          实时预览 · 随编辑更新
        </template>
      </span>
      <span v-if="store.settings.showStats" class="tabular-nums">
        {{ stats.cjk || '-' }} 字 · {{ stats.words || '-' }} 词 · {{ stats.lines || 0 }} 行 · 约 {{ stats.minutes }} 分钟
      </span>
    </div>
    </div>

    <!-- resize handles (outside the clipped panel so corners are grabbable) -->
    <div class="absolute -right-0.5 top-2 bottom-2 w-2 cursor-ew-resize" @pointerdown="onResizeStart($event, 'e')"></div>
    <div class="absolute -bottom-0.5 left-2 right-2 h-2 cursor-ns-resize" @pointerdown="onResizeStart($event, 's')"></div>
    <div class="absolute -left-0.5 top-2 bottom-2 w-2 cursor-ew-resize" @pointerdown="onResizeStart($event, 'w')"></div>
    <div class="absolute -top-0.5 left-2 right-2 h-2 cursor-ns-resize" @pointerdown="onResizeStart($event, 'n')"></div>
    <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 cursor-nwse-resize flex items-end justify-end" @pointerdown="onResizeStart($event, 'se')">
      <svg class="text-ink/25 mb-0.5 mr-0.5" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <path d="M4 14l16-10M4 20l16-10" />
      </svg>
    </div>
  </div>
</template>
