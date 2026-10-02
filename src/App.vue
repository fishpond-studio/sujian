<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import {
  store,
  newWindow,
  closeWindow,
  clampWindows,
  saveNow,
  restoreAll,
  toggleMinimize,
  setMode,
  exportDoc,
  duplicateDoc,
  detachPreview,
  setTheme,
  resolvedTheme,
  importFiles,
  openContextMenu,
  emitCommand,
} from './store'
import { resolveAction } from './utils/shortcuts'
import { desktopMenuItems } from './utils/contextMenus'
import MenuBar from './components/MenuBar.vue'
import Sidebar from './components/Sidebar.vue'
import EditorWindow from './components/EditorWindow.vue'
import HelpDialog from './components/HelpDialog.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import OnboardingDialog from './components/OnboardingDialog.vue'
import ContextMenu from './components/ContextMenu.vue'

const importInput = ref(null)
const dropActive = ref(false)

const hasWindows = computed(() => store.windows.some((w) => !w.minimized))

const rootStyle = computed(() => ({
  backgroundColor: store.settings.wallpaperColor,
  '--editor-font-size': store.settings.fontSize + 'px',
  '--editor-line-height': String(store.settings.lineHeight),
  '--content-max': store.settings.maxWidth + 'ch',
}))

const bgLayerStyle = computed(() => {
  const s = store.settings
  return {
    inset: '-48px',
    backgroundColor: s.wallpaperColor,
    backgroundImage: s.wallpaperImage ? `url(${s.wallpaperImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: `brightness(${s.wallpaperBrightness}%) blur(${s.wallpaperBlur}px) saturate(${s.wallpaperSaturation}%)`,
  }
})

function handleNew() {
  const win = newWindow()
  store.activeWindowId = win.id
  return win
}

function onRootContext(e) {
  if (e.target.closest('[data-window], aside, header')) return
  e.preventDefault()
  e.stopPropagation()
  openContextMenu(e.clientX, e.clientY, desktopMenuItems())
}

function activeEditorWindow() {
  return store.windows.find((x) => x.id === store.activeWindowId && !x.minimized && x.kind !== 'preview')
}
function activeAnyWindow() {
  return store.windows.find((x) => x.id === store.activeWindowId && !x.minimized)
}
function bumpFont(d) {
  store.settings.fontSize = Math.max(13, Math.min(20, store.settings.fontSize + d))
}
function cycleWindow(dir) {
  const list = store.windows.filter((w) => !w.minimized)
  if (list.length < 2) return
  const i = list.findIndex((w) => w.id === store.activeWindowId)
  const next = list[(i + dir + list.length) % list.length]
  store.activeWindowId = next.id
}
function openImportPicker() {
  importInput.value && importInput.value.click()
}
function onImportFile(e) {
  importFiles(e.target.files)
  e.target.value = ''
}
function onDrop(e) {
  dropActive.value = false
  const files = e.dataTransfer && e.dataTransfer.files
  if (files && files.length) importFiles(files)
}

const APP_ACTIONS = {
  'app.newWindow': () => handleNew(),
  'app.closeWindow': () => store.activeWindowId && closeWindow(store.activeWindowId),
  'app.closeAll': () => store.windows.filter((w) => !w.minimized).forEach((w) => closeWindow(w.id)),
  'app.import': () => openImportPicker(),
  'app.export': () => { const w = activeAnyWindow(); if (w) exportDoc(w.docId) },
  'app.save': () => saveNow(),
  'app.minimize': () => store.activeWindowId && toggleMinimize(store.activeWindowId),
  'app.restoreAll': () => restoreAll(),
  'app.nextWindow': () => cycleWindow(1),
  'app.prevWindow': () => cycleWindow(-1),
  'app.detachPreview': () => { const w = activeEditorWindow(); if (w) detachPreview(w.docId) },
  'app.duplicate': () => { const w = activeEditorWindow(); if (w) duplicateDoc(w.docId) },
  'app.modeEdit': () => { const w = activeEditorWindow(); if (w) setMode(w.id, 'edit') },
  'app.modeSplit': () => { const w = activeEditorWindow(); if (w) setMode(w.id, 'split') },
  'app.modePreview': () => { const w = activeEditorWindow(); if (w) setMode(w.id, 'preview') },
  'app.toggleSidebar': () => { store.sidebarOpen = !store.sidebarOpen },
  'app.themeToggle': () => setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark'),
  'app.fontUp': () => bumpFont(1),
  'app.fontDown': () => bumpFont(-1),
  'app.fontReset': () => { store.settings.fontSize = 15 },
  'app.settings': () => { store.settingsTab = '外观'; store.showSettings = true },
  'app.shortcuts': () => { store.settingsTab = '快捷键'; store.showSettings = true },
}
const EDITOR_ACTIONS = new Set([
  'editor.undo', 'editor.redo', 'editor.bold', 'editor.italic',
  'editor.link', 'editor.strike', 'editor.header', 'editor.quote',
])

function runAction(id) {
  if (EDITOR_ACTIONS.has(id)) {
    emitCommand(id)
    return
  }
  if (APP_ACTIONS[id]) APP_ACTIONS[id]()
}

function onKeydown(e) {
  if (store.shortcutRecording) return
  const ae = document.activeElement
  const k = (e.key || '').toLowerCase()
  if (!(e.metaKey || e.ctrlKey) && k === 'escape') {
    if (store.showSettings || store.showHelp) {
      store.showSettings = false
      store.showHelp = false
    }
    return
  }
  const action = resolveAction(e)
  if (!action) return
  const editable = ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)
  const isEditor = ae && ae.classList && ae.classList.contains('editor-input')
  if (action.scope === 'editor' && editable && !isEditor) return
  e.preventDefault()
  runAction(action.id)
}

let resizeHandler = null
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('sujian:import', openImportPicker)
  resizeHandler = () => clampWindows()
  window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('sujian:import', openImportPicker)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<template>
  <div
    class="h-screen w-screen overflow-hidden text-ink/90 select-none relative font-sans transition-colors duration-200"
    :style="rootStyle"
    @contextmenu="onRootContext"
    @dragenter.prevent="dropActive = true"
    @dragover.prevent
    @dragleave.prevent="dropActive = false"
    @drop.prevent="onDrop"
  >
    <!-- wallpaper layer (color + optional image, with filters) -->
    <div class="absolute pointer-events-none" :style="bgLayerStyle" aria-hidden="true"></div>
    <div
      v-if="store.settings.wallpaperImage"
      class="absolute inset-0 bg-black pointer-events-none"
      :style="{ opacity: store.settings.wallpaperDim / 100 }"
      aria-hidden="true"
    ></div>

    <!-- desktop watermark for vibrancy -->
    <div
      v-if="store.settings.showWatermark"
      class="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <span
        class="absolute font-serif font-semibold leading-none text-ink/[0.045]"
        style="font-size: min(38vw, 560px); right: -3%; top: 6%; transform: rotate(-6deg)"
      >素</span>
      <span
        class="absolute font-serif leading-none text-ink/[0.03] tracking-[0.6em]"
        style="font-size: min(4vw, 42px); left: 6%; bottom: 10%"
      >安安静静写字</span>
    </div>

    <MenuBar class="relative z-50" />

    <div class="relative flex" style="height: calc(100vh - 28px)">
      <Sidebar class="z-40 h-full" />

      <main data-main class="relative isolate z-0 flex-1 min-w-0 overflow-hidden h-full">
        <EditorWindow
          v-for="w in store.windows.filter((x) => !x.minimized)"
          :key="w.id"
          :win="w"
          :doc="store.docs[w.docId]"
          :active="w.id === store.activeWindowId"
        />

        <div v-if="!hasWindows && !store.showOnboarding" class="absolute inset-0 flex items-center justify-center z-10">
          <div v-if="store.windows.length" class="text-center max-w-md px-6">
            <h1 class="font-serif font-semibold text-ink/95 text-xl mb-3">窗口都收起来了</h1>
            <p class="text-ink/55 text-sm leading-7 mb-6">
              文稿还在。点左侧的文稿，或者把窗口全部展开。
            </p>
            <button
              class="bg-surface text-ink/90 rounded-lg px-5 py-2 text-sm transition-colors duration-200 hover:bg-ink/10 active:opacity-80"
              @click="restoreAll"
            >
              全部展开
            </button>
          </div>
          <div v-else class="text-center max-w-md px-6">
            <h1 class="font-serif font-semibold text-ink/95 text-2xl md:text-3xl mb-3">素笺</h1>
            <p class="text-ink/55 text-sm leading-7 mb-8">
              一张安静的纸。没有打扰，只有你的文字。<br />
              点下面，开一个窗口，慢慢写。
            </p>
            <button
              class="bg-surface text-ink/90 rounded-lg px-5 py-2 text-sm transition-colors duration-200 hover:bg-ink/10 active:opacity-80"
              @click="handleNew"
            >
              ＋ 新建窗口
            </button>
            <p class="text-ink/30 text-xs mt-6">⌘N 新建窗口 · ⌘, 设置 · ⌘/ 快捷键 · 外部文件可直接拖进来</p>
          </div>
        </div>
      </main>
    </div>

    <!-- drag & drop hint -->
    <div
      v-if="dropActive"
      class="absolute inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none"
    >
      <div class="bg-panel border border-hair/15 rounded-xl px-8 py-6 text-center">
        <p class="font-serif font-semibold text-ink/95 text-lg mb-1">松开即可导入</p>
        <p class="text-ink/55 text-[12.5px]">支持 .md .markdown .txt .text .log 等文本文件</p>
      </div>
    </div>

    <input ref="importInput" type="file" multiple class="hidden" accept=".md,.markdown,.mdown,.mkd,.mdx,.txt,.text,.log,.csv,.tsv,.json,.yml,.yaml,.ini,.conf,.rst,text/*" @change="onImportFile" />

    <OnboardingDialog />
    <SettingsDialog />
    <HelpDialog />
    <ContextMenu />
  </div>
</template>
