<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { store, newDoc, openWindow, focusWindow, updateTitle, openContextMenu } from '../store'
import { docMenuItems } from '../utils/contextMenus'

const q = ref('')
const editingId = ref(null)
const titleEdit = ref('')

watch(
  () => store.renameDocId,
  (id) => {
    if (id && store.docs[id]) {
      titleEdit.value = store.docs[id].title
      editingId.value = id
      store.renameDocId = null
      nextTick(() => {
        const el = document.querySelector('[data-rename-input]')
        if (el) {
          el.focus()
          el.select()
        }
      })
    }
  },
)

function commitRename(doc) {
  if (editingId.value !== doc.id) return
  updateTitle(doc.id, titleEdit.value)
  editingId.value = null
}
function cancelRename() {
  editingId.value = null
}
function onContext(e, doc) {
  e.preventDefault()
  e.stopPropagation()
  openContextMenu(e.clientX, e.clientY, docMenuItems(doc))
}

const list = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return store.docOrder
    .map((id) => store.docs[id])
    .filter(Boolean)
    .filter((d) => !kw || d.title.toLowerCase().includes(kw) || d.content.toLowerCase().includes(kw))
})

function displayTitle(doc) {
  if (doc.title && doc.title !== '未命名笺纸') return doc.title
  const line = (doc.content || '').split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean)
  return line ? line.slice(0, 24) : '未命名笺纸'
}

function snippet(doc) {
  const text = (doc.content || '').split('\n').filter((l) => l.trim()).find((l) => !/^\s*#/.test(l)) || ''
  return text.replace(/[*_`>#~[\]()!-]/g, '').trim().slice(0, 40)
}

function fmt(doc) {
  const d = new Date(doc.updatedAt)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function docState(id) {
  const ws = store.windows.filter((w) => w.docId === id)
  if (ws.some((w) => !w.minimized)) return 'open'
  if (ws.length) return 'min'
  return 'closed'
}

function isActive(id) {
  return store.windows.some((w) => w.docId === id && w.id === store.activeWindowId && !w.minimized)
}

function open(docId) {
  if (editingId.value === docId) return
  const win = store.windows.find((w) => w.docId === docId && w.kind !== 'preview')
  if (win) focusWindow(win.id)
  else openWindow(docId)
}

function handleNew() {
  const doc = newDoc()
  openWindow(doc.id)
}
</script>

<template>
  <aside
    class="relative z-40 h-full flex-shrink-0 select-none transition-[width] duration-200 ease-out"
    :style="{ width: store.sidebarOpen ? '236px' : '28px' }"
  >
    <!-- collapsed rail -->
    <button
      v-if="!store.sidebarOpen"
      class="w-full h-full flex flex-col items-center gap-3 bg-base/80 backdrop-blur-xl border-r border-hair/8 py-3 text-ink/50 hover:bg-ink/5 hover:text-ink/80 transition-colors duration-200"
      title="显示侧边栏"
      @click="store.sidebarOpen = true"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2.2" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    </button>

    <!-- panel -->
    <div v-else class="w-full h-full flex flex-col bg-base/80 backdrop-blur-xl border-r border-hair/8 transition-colors duration-200">
      <div class="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 class="font-serif font-semibold text-ink/90 text-[15px] tracking-wide">文稿</h2>
        <button
          class="w-6 h-6 rounded-md text-ink/55 hover:bg-ink/10 hover:text-ink/90 flex items-center justify-center transition-colors duration-200"
          title="收起侧边栏"
          @click="store.sidebarOpen = false"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div class="px-3 pb-2">
        <input
          v-model="q"
          class="w-full bg-inset border border-hair/10 rounded-lg text-[13px] text-ink/90 placeholder-ink/30 px-3 py-1.5 focus:outline-none focus:border-hair/25 transition-colors duration-200"
          placeholder="搜索文稿…"
        />
      </div>

      <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-px">
        <template v-if="list.length">
          <button
            v-for="doc in list"
            :key="doc.id"
            class="group relative w-full text-left rounded-lg px-3 py-2 transition-colors duration-200 border border-transparent"
            :class="isActive(doc.id) ? 'bg-ink/10' : 'hover:bg-ink/5'"
            @click="open(doc.id)"
            @contextmenu="onContext($event, doc)"
          >
            <span class="flex items-start gap-2">
              <span class="mt-1.5 flex-shrink-0">
                <span v-if="docState(doc.id) === 'open'" class="block w-2.5 h-2.5 rounded-lg bg-accent"></span>
                <span v-else-if="docState(doc.id) === 'min'" class="block w-2.5 h-2.5 rounded-lg border border-hair/30"></span>
                <span v-else class="block w-2.5 h-2.5"></span>
              </span>
              <span class="flex-1 min-w-0">
                <span class="flex items-baseline justify-between gap-2">
                  <input
                    v-if="editingId === doc.id"
                    v-model="titleEdit"
                    data-rename-input
                    class="flex-1 min-w-0 bg-inset border border-hair/25 rounded-md text-[13px] text-ink/95 px-1.5 py-0.5 outline-none"
                    @click.stop
                    @keydown.enter.prevent="commitRename(doc)"
                    @keydown.esc.prevent="cancelRename"
                    @blur="commitRename(doc)"
                  />
                  <span v-else class="text-[13px] text-ink/90 truncate">{{ displayTitle(doc) }}</span>
                  <span class="text-[10px] text-ink/35 flex-shrink-0">{{ fmt(doc) }}</span>
                </span>
                <span class="block text-[11px] text-ink/35 truncate pt-0.5 leading-none">{{ snippet(doc) || '空白笺纸' }}</span>
              </span>
            </span>
          </button>
        </template>
        <p v-else class="text-[12px] text-ink/35 text-center py-8 leading-6">没有找到匹配的文稿。</p>
      </div>

      <div class="p-3 border-t border-hair/8">
        <button
          class="w-full flex items-center justify-center gap-1.5 bg-surface text-ink/90 rounded-lg px-3 py-2 text-[13px] transition-colors duration-200 hover:bg-ink/10 active:opacity-80"
          @click="handleNew"
        >
          ＋ 新建笺纸
        </button>
        <div class="flex items-center justify-center mt-2.5">
          <span class="text-[10.5px] text-ink/35">{{ store.docOrder.length }} 张笺纸 · 自动保存</span>
        </div>
      </div>
    </div>
  </aside>
</template>
