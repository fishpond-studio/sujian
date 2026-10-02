<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  store,
  newDoc,
  openWindow,
  closeWindow,
  setMode,
  arrangeWindows,
  openExample,
  detachPreview,
  mergePreview,
  setTheme,
  requestImport,
} from '../store'

const openMenu = ref(null)

const activeWin = computed(() => store.windows.find((w) => w.id === store.activeWindowId && !w.minimized))

const menus = computed(() => [
  {
    key: 'sujian',
    label: '素笺',
    serif: true,
    items: [
      { label: '打开示例文稿', action: openExample },
      { label: '导出当前文稿…', shortcut: '⌘S', action: exportActive },
    ],
  },
  {
    key: 'file',
    label: '文件',
    items: [
      { label: '新建窗口', shortcut: '⌘N', action: handleNew },
      { label: '导入文件…', shortcut: '⌘O', action: requestImport },
      { type: 'sep' },
      { label: '关闭窗口', shortcut: '⌘W', action: closeActive },
    ],
  },
  {
    key: 'view',
    label: '视图',
    items: [
      { label: '编辑模式', action: () => setActive('edit'), radio: true, value: 'edit' },
      { label: '分屏模式', action: () => setActive('split'), radio: true, value: 'split' },
      { label: '预览模式', action: () => setActive('preview'), radio: true, value: 'preview' },
    ],
  },
  {
    key: 'window',
    label: '窗口',
    items: [
      { label: '分离预览窗格', action: () => activeWin.value && detachPreview(activeWin.value.docId) },
      { label: '合并回编辑窗口', action: () => activeWin.value && mergePreview(activeWin.value.docId) },
      { type: 'sep' },
      { label: '整理窗口布局', action: arrangeWindows },
    ],
  },
  {
    key: 'help',
    label: '帮助',
    items: [
      { label: '使用入门', action: () => { store.showHelp = true } },
      {
        label: '键盘快捷键',
        action: () => {
          store.settingsTab = '快捷键'
          store.showSettings = true
        },
      },
    ],
  },
])

const nowText = computed(() => {
  const d = store.now
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 · 周${week} ${hh}:${mm}`
})

const themeIcon = computed(() => (store.settings.theme === 'light' ? 'light' : store.settings.theme === 'system' ? 'system' : 'dark'))

function handleNew() {
  const doc = newDoc()
  const win = openWindow(doc.id)
  store.activeWindowId = win.id
  closeMenus()
}

function exportActive() {
  const doc = activeWin.value && store.docs[activeWin.value.docId]
  if (!doc) return
  const blob = new Blob([doc.content || ''], { type: 'text/markdown;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${doc.title}.md`
  a.click()
  URL.revokeObjectURL(a.href)
  closeMenus()
}

function closeActive() {
  if (store.activeWindowId) closeWindow(store.activeWindowId)
  closeMenus()
}

function setActive(mode) {
  if (activeWin.value) setMode(activeWin.value.id, mode)
  closeMenus()
}

function cycleTheme() {
  const order = ['dark', 'light', 'system']
  const i = order.indexOf(store.settings.theme)
  setTheme(order[(i + 1) % order.length])
}

function toggle(key) {
  openMenu.value = openMenu.value === key ? null : key
}
function hover(key) {
  if (openMenu.value && openMenu.value !== key) openMenu.value = key
}
function run(item) {
  item.action && item.action()
  closeMenus()
}
function closeMenus() {
  openMenu.value = null
}
function onDocClick() {
  closeMenus()
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <header
    class="h-7 border-b border-hair/8 bg-base/80 backdrop-blur-xl px-2 flex items-center gap-0.5 text-[13px] transition-colors duration-200"
    @click.stop
  >
    <template v-for="menu in menus" :key="menu.key">
      <div class="relative" @mouseenter="hover(menu.key)">
        <button
          class="h-6 px-2.5 rounded-md text-ink/80 hover:bg-ink/10 hover:text-ink/95 transition-colors duration-200 outline-none focus-visible:bg-ink/10"
          :class="[menu.serif ? 'font-serif font-semibold text-sm' : '']"
          @click="toggle(menu.key)"
        >
          {{ menu.label }}
        </button>

        <div
          v-if="openMenu === menu.key"
          class="absolute top-full left-0 mt-0.5 min-w-[220px] bg-base/95 backdrop-blur-xl border border-hair/10 rounded-xl p-1 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          @click.stop
        >
          <template v-for="(item, i) in menu.items" :key="i">
            <div v-if="item.type === 'sep'" class="mx-2 my-1 border-t border-hair/8"></div>
            <button
              v-else
              class="w-full flex items-center justify-between gap-6 px-2.5 py-[5px] rounded-lg text-ink/80 hover:bg-ink/10 hover:text-ink/95 text-[13px] transition-colors duration-200 text-left"
              @click="run(item)"
            >
              <span class="flex items-center gap-2">
                <span class="w-3 inline-block text-center text-accent">
                  <span v-if="item.radio && activeWin?.mode === item.value">●</span>
                </span>
                {{ item.label }}
              </span>
              <span v-if="item.shortcut" class="text-ink/35 text-xs">{{ item.shortcut }}</span>
            </button>
          </template>
        </div>
      </div>
    </template>

    <div class="flex-1"></div>

    <!-- theme quick toggle -->
    <button
      class="h-6 w-7 rounded-md text-ink/70 hover:bg-ink/10 hover:text-ink/95 transition-colors duration-200 flex items-center justify-center"
      :title="'外观：' + (store.settings.theme === 'dark' ? '深色' : store.settings.theme === 'light' ? '浅色' : '跟随系统')"
      @click="cycleTheme(); closeMenus()"
    >
      <svg v-if="themeIcon === 'light'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
      <svg v-else-if="themeIcon === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
      </svg>
    </button>

    <!-- settings -->
    <button
      class="h-6 w-7 rounded-md text-ink/70 hover:bg-ink/10 hover:text-ink/95 transition-colors duration-200 flex items-center justify-center"
      title="偏好设置 (⌘,)"
      @click="store.showSettings = true; closeMenus()"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </button>

    <!-- sidebar -->
    <button
      class="h-6 w-7 rounded-md text-ink/70 hover:bg-ink/10 hover:text-ink/95 transition-colors duration-200 flex items-center justify-center"
      title="显示 / 隐藏侧边栏"
      @click="store.sidebarOpen = !store.sidebarOpen; closeMenus()"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2.2" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    </button>

    <button
      class="h-6 pl-2 pr-2.5 rounded-md text-ink/65 hover:bg-ink/10 hover:text-ink/90 transition-colors duration-200 text-xs tabular-nums"
      @click="closeMenus"
    >
      {{ nowText }}
    </button>
  </header>
</template>
