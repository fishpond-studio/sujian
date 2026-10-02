<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { store, closeContextMenu } from '../store'

const menuEl = ref(null)
const pos = ref({ x: 0, y: 0 })

watch(
  () => store.contextMenu.open,
  async (open) => {
    if (!open) return
    pos.value = { x: store.contextMenu.x, y: store.contextMenu.y }
    await nextTick()
    clamp()
  },
)

function clamp() {
  const m = menuEl.value
  if (!m) return
  const r = m.getBoundingClientRect()
  let x = store.contextMenu.x
  let y = store.contextMenu.y
  if (x + r.width > window.innerWidth - 6) x = Math.max(6, window.innerWidth - r.width - 6)
  if (y + r.height > window.innerHeight - 6) y = Math.max(6, window.innerHeight - r.height - 6)
  pos.value = { x, y }
}

function run(it) {
  if (it.disabled) return
  closeContextMenu()
  if (it.action) it.action()
}

function onDocClick(e) {
  if (!store.contextMenu.open) return
  if (menuEl.value && menuEl.value.contains(e.target)) return
  closeContextMenu()
}
function onDocContext(e) {
  if (!store.contextMenu.open) return
  if (menuEl.value && menuEl.value.contains(e.target)) return
  closeContextMenu()
}
function onKey(e) {
  if (e.key === 'Escape') closeContextMenu()
}
function onScroll() {
  closeContextMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('contextmenu', onDocContext)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('contextmenu', onDocContext)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div
    v-if="store.contextMenu.open"
    ref="menuEl"
    class="fixed z-[120] min-w-[196px] bg-base/95 backdrop-blur-xl border border-hair/10 rounded-xl p-1 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
    @click.stop
    @contextmenu.prevent.stop
  >
    <template v-for="(it, i) in store.contextMenu.items" :key="i">
      <div v-if="it.type === 'sep'" class="mx-2 my-1 border-t border-hair/8"></div>
      <button
        v-else
        class="w-full flex items-center justify-between gap-6 px-2.5 py-[5px] rounded-lg text-[13px] text-left transition-colors duration-200"
        :class="
          it.disabled
            ? 'text-ink/25 cursor-default'
            : it.danger
              ? 'text-[#ff5f57] hover:bg-[#ff5f57]/10'
              : 'text-ink/80 hover:bg-ink/10 hover:text-ink/95'
        "
        @click="run(it)"
      >
        <span>{{ it.label }}</span>
        <span v-if="it.shortcut" class="text-ink/35 text-xs">{{ it.shortcut }}</span>
      </button>
    </template>
  </div>
</template>
