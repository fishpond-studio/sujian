import { store } from '../store'

export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '')

export const SHORTCUTS = [
  { id: 'app.newWindow', label: '新建窗口', group: '文件', scope: 'app', key: 'mod+n' },
  { id: 'app.closeWindow', label: '关闭窗口', group: '文件', scope: 'app', key: 'mod+w' },
  { id: 'app.closeAll', label: '关闭全部窗口', group: '文件', scope: 'app', key: 'mod+shift+w' },
  { id: 'app.import', label: '导入文件', group: '文件', scope: 'app', key: 'mod+o' },
  { id: 'app.export', label: '导出当前文稿', group: '文件', scope: 'app', key: 'mod+e' },
  { id: 'app.save', label: '立即保存', group: '文件', scope: 'app', key: 'mod+s' },

  { id: 'app.minimize', label: '最小化窗口', group: '窗口', scope: 'app', key: 'mod+m' },
  { id: 'app.restoreAll', label: '展开全部窗口', group: '窗口', scope: 'app', key: 'mod+shift+m' },
  { id: 'app.nextWindow', label: '下一个窗口', group: '窗口', scope: 'app', key: 'mod+alt+arrowright' },
  { id: 'app.prevWindow', label: '上一个窗口', group: '窗口', scope: 'app', key: 'mod+alt+arrowleft' },
  { id: 'app.detachPreview', label: '分离预览窗口', group: '窗口', scope: 'app', key: 'mod+shift+d' },
  { id: 'app.duplicate', label: '复制当前文稿', group: '窗口', scope: 'app', key: 'mod+d' },

  { id: 'app.modeEdit', label: '切到编辑模式', group: '视图', scope: 'app', key: 'mod+1' },
  { id: 'app.modeSplit', label: '切到分屏模式', group: '视图', scope: 'app', key: 'mod+2' },
  { id: 'app.modePreview', label: '切到预览模式', group: '视图', scope: 'app', key: 'mod+3' },
  { id: 'app.toggleSidebar', label: '显示 / 隐藏侧边栏', group: '视图', scope: 'app', key: 'mod+shift+s' },
  { id: 'app.themeToggle', label: '切换深色 / 浅色', group: '视图', scope: 'app', key: 'mod+shift+t' },
  { id: 'app.fontUp', label: '增大字号', group: '视图', scope: 'app', key: 'mod+=' },
  { id: 'app.fontDown', label: '减小字号', group: '视图', scope: 'app', key: 'mod+-' },
  { id: 'app.fontReset', label: '重置字号', group: '视图', scope: 'app', key: 'mod+0' },

  { id: 'app.settings', label: '打开设置', group: '其他', scope: 'app', key: 'mod+,' },
  { id: 'app.shortcuts', label: '查看 / 设置快捷键', group: '其他', scope: 'app', key: 'mod+/' },

  { id: 'editor.undo', label: '撤回', group: '编辑', scope: 'editor', key: 'mod+z' },
  { id: 'editor.redo', label: '重做', group: '编辑', scope: 'editor', key: 'mod+shift+z' },
  { id: 'editor.bold', label: '加粗', group: '编辑', scope: 'editor', key: 'mod+b' },
  { id: 'editor.italic', label: '斜体', group: '编辑', scope: 'editor', key: 'mod+i' },
  { id: 'editor.link', label: '链接', group: '编辑', scope: 'editor', key: 'mod+k' },
  { id: 'editor.strike', label: '删除线', group: '编辑', scope: 'editor', key: 'mod+shift+x' },
  { id: 'editor.header', label: '标题', group: '编辑', scope: 'editor', key: 'mod+shift+h' },
  { id: 'editor.quote', label: '引用', group: '编辑', scope: 'editor', key: 'mod+shift+q' },
]

const BY_ID = Object.fromEntries(SHORTCUTS.map((s) => [s.id, s]))

export function defaultKey(id) {
  return BY_ID[id] ? BY_ID[id].key : ''
}

export function getBinding(id) {
  const custom = store.settings.shortcuts || {}
  return Object.prototype.hasOwnProperty.call(custom, id) ? custom[id] : defaultKey(id)
}

export function setBinding(id, key) {
  if (!store.settings.shortcuts) store.settings.shortcuts = {}
  store.settings.shortcuts[id] = key || ''
}

export function resetBinding(id) {
  if (store.settings.shortcuts) delete store.settings.shortcuts[id]
}

export function resetAllBindings() {
  store.settings.shortcuts = {}
}

const MOD_KEYS = ['Meta', 'Control', 'Shift', 'Alt', 'CapsLock', 'OS']

export function eventToBinding(e) {
  if (MOD_KEYS.includes(e.key)) return ''
  const parts = []
  if (isMac ? e.metaKey : e.ctrlKey) parts.push('mod')
  if (isMac && e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  let k = e.key
  if (k === ' ') k = 'space'
  parts.push(k.length === 1 ? k.toLowerCase() : k.toLowerCase())
  return parts.join('+')
}

export function resolveAction(e) {
  if (MOD_KEYS.includes(e.key)) return null
  const binding = eventToBinding(e)
  if (!binding) return null
  for (const s of SHORTCUTS) {
    if (getBinding(s.id) === binding) return s
  }
  return null
}

export function formatBinding(b) {
  if (!b) return '未设置'
  const named = { mod: isMac ? '⌘' : 'Ctrl', ctrl: '⌃', alt: isMac ? '⌥' : 'Alt', shift: isMac ? '⇧' : 'Shift' }
  const glyph = { arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', space: 'Space', escape: 'Esc', enter: '↵', backspace: '⌫', delete: '⌦' }
  return b
    .split('+')
    .map((p) => {
      if (named[p]) return named[p]
      if (glyph[p]) return glyph[p]
      return p.toUpperCase()
    })
    .join(isMac ? '' : '+')
}

export function conflictingIds() {
  const map = {}
  for (const s of SHORTCUTS) {
    const b = getBinding(s.id)
    if (!b) continue
    ;(map[b] = map[b] || []).push(s.id)
  }
  const set = new Set()
  for (const k in map) if (map[k].length > 1) map[k].forEach((id) => set.add(id))
  return set
}
