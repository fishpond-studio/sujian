import {
  store,
  openWindow,
  deleteDoc,
  duplicateDoc,
  detachPreview,
  mergePreview,
  hasPreview,
  closeWindow,
  toggleZoom,
  arrangeWindows,
  openExample,
  newWindow,
  setTheme,
  resolvedTheme,
  exportDoc,
  requestImport,
  canUndo,
  canRedo,
  undo,
  redo,
} from '../store'

function item(label, action, opts = {}) {
  return { label, action, ...opts }
}
const sep = { type: 'sep' }
function exportLabel() {
  const f = store.settings.exportFormat || 'md'
  return `导出为 .${f}`
}

export function docMenuItems(doc) {
  return [
    item('打开', () => openWindow(doc.id)),
    item('重命名', () => {
      store.renameDocId = doc.id
    }),
    item('复制一份', () => duplicateDoc(doc.id)),
    item('分离预览', () => detachPreview(doc.id)),
    item(exportLabel(), () => exportDoc(doc.id)),
    sep,
    item('删除', () => deleteDoc(doc.id), { danger: true }),
  ]
}

export function windowMenuItems(win) {
  const doc = store.docs[win.docId]
  if (!doc) return []
  const items = [
    item('撤回', () => undo(doc.id), { shortcut: '⌘Z', disabled: !canUndo(doc.id) }),
    item('重做', () => redo(doc.id), { shortcut: '⇧⌘Z', disabled: !canRedo(doc.id) }),
    sep,
    item('重命名', () => {
      store.renameWindowId = win.id
    }),
    item('复制一份', () => duplicateDoc(doc.id)),
    item(exportLabel(), () => exportDoc(doc.id)),
  ]
  items.push(sep)
  if (win.kind === 'preview') {
    items.push(item('回到编辑窗口', () => mergePreview(doc.id)))
  } else if (hasPreview(doc.id)) {
    items.push(item('合并预览窗口', () => mergePreview(doc.id)))
  } else {
    items.push(item('分离预览窗口', () => detachPreview(doc.id)))
  }
  items.push(item(win.zoom ? '还原窗口大小' : '放大窗口', () => toggleZoom(win.id)))
  items.push(sep)
  items.push(item('关闭窗口', () => closeWindow(win.id), { danger: true }))
  return items
}

export function desktopMenuItems() {
  return [
    item('新建窗口', () => newWindow(), { shortcut: '⌘N' }),
    item('导入文件…', () => requestImport(), { shortcut: '⌘O' }),
    item('打开示例文稿', () => openExample()),
    item('整理窗口布局', () => arrangeWindows()),
    sep,
    item(resolvedTheme() === 'dark' ? '切换到浅色外观' : '切换到深色外观', () =>
      setTheme(resolvedTheme() === 'dark' ? 'light' : 'dark'),
    ),
    item('偏好设置…', () => {
      store.showSettings = true
    }),
  ]
}
