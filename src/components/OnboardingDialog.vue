<script setup>
import { ref, computed } from 'vue'
import { store, WALLPAPERS, setTheme, setWallpaper, finishOnboarding, resolvedTheme } from '../store'

const step = ref(0)
const total = 4

const themeCards = [
  { key: 'light', label: '浅色', base: '#eeeef1', panel: '#ffffff', ink: '#1d1d1f' },
  { key: 'dark', label: '深色', base: '#1c1c1e', panel: '#2c2c2e', ink: '#ffffff' },
  { key: 'system', label: '跟随系统', base: '#3a3a3c', panel: '#2c2c2e', ink: '#dddddd' },
]

const fonts = [
  { key: 'sans', label: '无衬线' },
  { key: 'serif', label: '衬线 · 宋' },
  { key: 'mono', label: '等宽' },
]
const modes = [
  { key: 'edit', label: '纯编辑' },
  { key: 'split', label: '左右分屏' },
  { key: 'preview', label: '纯预览' },
]

const isLast = computed(() => step.value === total - 1)

function swatch(p) {
  return resolvedTheme() === 'dark' ? p.dark : p.light
}

function next() {
  if (step.value < total) step.value++
}
function back() {
  if (step.value > 0) step.value--
}
function skip() {
  finishOnboarding()
}
</script>

<template>
  <div v-if="store.showOnboarding" class="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 backdrop-blur-xl px-4 py-6">
    <div class="w-full max-w-md bg-panel border border-hair/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden">
      <div class="flex items-center justify-between px-5 pt-4">
        <div class="flex items-center gap-1.5">
          <span
            v-for="i in total"
            :key="i"
            class="h-1 rounded-md transition-colors duration-200"
            :class="i <= step ? 'bg-accent w-5' : 'bg-hair/15 w-5'"
          ></span>
        </div>
        <button
          class="text-[12px] text-ink/45 hover:text-ink/80 transition-colors duration-200"
          @click="skip"
        >
          跳过
        </button>
      </div>

      <div class="px-6 py-5 min-h-[236px]">
        <!-- step 0 -->
        <div v-if="step === 0" class="text-center pt-2">
          <h1 class="font-serif font-semibold text-ink/95 text-3xl mb-2">素笺</h1>
          <p class="text-ink/55 text-[13px] leading-6 mb-6">安安静静写字的地方</p>
          <ul class="text-left text-[13px] text-ink/70 space-y-2.5 max-w-[19rem] mx-auto">
            <li class="flex gap-2.5"><span class="text-accent">·</span>窗口化书写，随意拖动摆放</li>
            <li class="flex gap-2.5"><span class="text-accent">·</span>预览可分离成独立窗口，左右对照</li>
            <li class="flex gap-2.5"><span class="text-accent">·</span>内容自动保存在本地，安心书写</li>
          </ul>
        </div>

        <!-- step 1 -->
        <div v-else-if="step === 1">
          <h2 class="font-serif font-semibold text-ink/95 text-lg mb-1">选择外观</h2>
          <p class="text-ink/50 text-[12.5px] mb-4">随时可以在设置里更改。</p>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="t in themeCards"
              :key="t.key"
              class="rounded-xl border p-1.5 transition-colors duration-200"
              :class="store.settings.theme === t.key ? 'border-accent' : 'border-hair/12 hover:border-hair/25'"
              @click="setTheme(t.key)"
            >
              <div class="rounded-lg overflow-hidden border border-black/10" :style="{ backgroundColor: t.base }">
                <div class="h-2.5" :style="{ backgroundColor: t.panel }"></div>
                <div class="h-12 p-1.5 space-y-1">
                  <div class="h-1.5 rounded w-3/4" :style="{ backgroundColor: t.panel }"></div>
                  <div class="h-1.5 rounded w-1/2" :style="{ backgroundColor: t.panel }"></div>
                  <div class="h-1.5 rounded w-2/3" :style="{ backgroundColor: t.panel }"></div>
                </div>
              </div>
              <span class="block text-center text-[12px] text-ink/75 mt-1.5">{{ t.label }}</span>
            </button>
          </div>
        </div>

        <!-- step 2 -->
        <div v-else-if="step === 2">
          <h2 class="font-serif font-semibold text-ink/95 text-lg mb-1">挑一张纸</h2>
          <p class="text-ink/50 text-[12.5px] mb-4">桌面背景的底色，会透出毛玻璃的质感。</p>
          <div class="grid grid-cols-4 gap-3">
            <button
              v-for="p in WALLPAPERS"
              :key="p.id"
              class="aspect-square rounded-xl border transition-colors duration-200"
              :class="store.settings.wallpaper === p.id ? 'border-accent' : 'border-hair/12 hover:border-hair/25'"
              :style="{ backgroundColor: swatch(p) }"
              :title="p.name"
              @click="setWallpaper(p.id)"
            ></button>
          </div>
          <p class="text-ink/40 text-[11.5px] mt-3">也可以稍后在设置里用自定义颜色或图片。</p>
        </div>

        <!-- step 3 -->
        <div v-else>
          <h2 class="font-serif font-semibold text-ink/95 text-lg mb-1">写作习惯</h2>
          <p class="text-ink/50 text-[12.5px] mb-4">选好字体和打开方式，就可以开始了。</p>
          <div class="mb-3">
            <span class="block text-[12px] text-ink/60 mb-1.5">正文字体</span>
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
          </div>
          <div>
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
          </div>
          <p class="text-ink/40 text-[11.5px] leading-5 mt-4">
            提示：拖动窗口标题栏摆放位置；工具栏的「分离」可以把预览拆到另一个窗口，左右对照。
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between px-6 py-4 border-t border-hair/8">
        <button
          class="text-[13px] text-ink/55 hover:text-ink/90 transition-colors duration-200 disabled:opacity-0"
          :disabled="step === 0"
          @click="back"
        >
          ← 上一步
        </button>
        <button
          class="bg-surface text-ink/90 rounded-lg px-5 py-1.5 text-[13px] transition-colors duration-200 hover:bg-ink/10 active:opacity-80"
          @click="isLast ? finishOnboarding() : next()"
        >
          {{ isLast ? '开始写字' : step === 0 ? '开始设置' : '下一步 →' }}
        </button>
      </div>
    </div>
  </div>
</template>
