<script setup>
import { store } from '../store'

const items = [
  { t: '摆放窗口', d: '按住窗口标题栏拖动，右下角拖拽调整大小，像整理桌面一样自然。双击标题栏可放大。' },
  { t: '分离预览', d: '工具栏点「分离」，编辑窗口放左边、预览窗口放右边，边写边看。点「合并」还原。' },
  { t: '三种模式', d: '每个窗口底部可切换 编辑 / 分屏 / 预览，也可以拖动中间的细线调整左右比例。' },
  { t: '撤回与重做', d: '⌘Z 撤回，⇧⌘Z 重做；工具栏最左侧也有对应按钮。文字输入和格式操作都能撤回。' },
  { t: '右键菜单', d: '在文稿列表、窗口标题栏或桌面空白处点右键，可以重命名、复制一份、分离预览、导入导出、删除等。' },
  { t: '个性背景', d: '设置 → 外观里可自定义背景颜色或壁纸图片，并调节明亮度、模糊、饱和度与暗度。' },
  { t: '更多格式', d: '设置 → Markdown 可开启 GFM、高亮 ==文字==、上下标、Emoji 等语法，也能自定义替换规则；设置 → 文件可导入 .md/.txt 等文本，导出支持 md / txt / html。' },
  { t: '快捷键', d: '⌘N 新建 · ⌘W 关闭 · ⌘M 最小化 · ⌘1/2/3 切换模式 · ⌘D 复制 · ⌘E 导出 · ⌘O 导入 · ⌘/ 查看全部。' },
  { t: '自动保存', d: '所有内容实时保存在本地浏览器，关掉页面也不会丢。写作时不必手动保存。' },
  { t: '导出文稿', d: '标题栏右侧的「导出」把当前文稿保存成 .md 文件，随时带走。' },
  { t: '快捷键', d: '⌘N 新建窗口 · ⌘W 关闭窗口 · ⌘, 设置 · ⌘S 立即保存 · ⌘B 加粗 · ⌘I 斜体 · ⌘K 链接' },
]

function close() {
  store.showHelp = false
}
</script>

<template>
  <div
    v-if="store.showHelp"
    class="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-xl px-4 py-6"
    @click.self="close"
  >
    <div
      class="w-full max-w-md max-h-full flex flex-col bg-panel border border-hair/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.3)] overflow-hidden select-text"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 class="font-serif font-semibold text-ink/95 text-lg">素笺 · 使用入门</h2>
          <p class="text-ink/45 text-xs mt-0.5">安安静静写字的地方</p>
        </div>
        <button
          class="w-7 h-7 rounded-md text-ink/55 hover:bg-ink/10 hover:text-ink/90 flex items-center justify-center transition-colors duration-200"
          title="关闭"
          @click="close"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </div>

      <div class="px-5 pb-4 space-y-2 overflow-y-auto">
        <div v-for="it in items" :key="it.t" class="bg-base border border-hair/8 rounded-xl px-4 py-3">
          <p class="font-serif font-semibold text-ink/90 text-[13px]">{{ it.t }}</p>
          <p class="text-ink/60 text-[12.5px] leading-6 mt-1">{{ it.d }}</p>
        </div>
      </div>

      <div class="flex justify-end px-5 py-4 border-t border-hair/8">
        <button
          class="bg-surface text-ink/90 rounded-lg px-4 py-1.5 text-[13px] transition-colors duration-200 hover:bg-ink/10 active:opacity-80"
          @click="close"
        >
          开始写字
        </button>
      </div>
    </div>
  </div>
</template>
