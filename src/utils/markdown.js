import { marked } from 'marked'
import DOMPurify from 'dompurify'

const EMOJI = {
  smile: '😄', grin: '😁', joy: '😂', heart: '❤️', thumbsup: '👍', '+1': '👍',
  tada: '🎉', fire: '🔥', rocket: '🚀', star: '⭐', check: '✅', x: '❌',
  warning: '⚠️', bulb: '💡', book: '📖', pencil: '✏️', wave: '👋', eyes: '👀',
  clap: '👏', ok: '👌', pray: '🙏', coffee: '☕', sun: '☀️', moon: '🌙',
  cat: '🐱', dog: '🐶', apple: '🍎', music: '🎵', idea: '💡', sparkles: '✨',
}

const CODE_RE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g

function applyExtensions(text, md) {
  if (md.customRules && typeof md.customRules === 'string') {
    for (const line of md.customRules.split('\n')) {
      const i = line.indexOf('=>')
      if (i > 0) {
        const from = line.slice(0, i).trim()
        const to = line.slice(i + 2).trim()
        if (from) text = text.split(from).join(to)
      }
    }
  }
  if (md.highlight !== false) text = text.replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
  if (md.sup) text = text.replace(/\^([^\^\s][^\^\n]*?)\^/g, '<sup>$1</sup>')
  if (md.sub) text = text.replace(/(^|[^~])~([^~\s][^~\n]*?)~/g, '$1<sub>$2</sub>')
  if (md.emoji) text = text.replace(/:([a-z0-9_+-]+):/gi, (m, n) => EMOJI[n.toLowerCase()] || m)
  return text
}

/* apply custom extensions only to the parts that are NOT code, then let
   marked parse the whole thing so code blocks still render correctly */
function transformOutsideCode(text, fn) {
  let out = ''
  let last = 0
  let m
  CODE_RE.lastIndex = 0
  while ((m = CODE_RE.exec(text)) !== null) {
    out += fn(text.slice(last, m.index))
    out += m[0]
    last = CODE_RE.lastIndex
  }
  out += fn(text.slice(last))
  return out
}

export function renderMarkdown(src, md = {}) {
  const text = src || ''
  const withExt = transformOutsideCode(text, (seg) => applyExtensions(seg, md || {}))
  const opts = { gfm: md.gfm !== false, breaks: md.breaks !== false }
  let raw = ''
  try {
    raw = marked.parse(withExt, opts)
  } catch (e) {
    raw = '<p>' + String(e.message) + '</p>'
  }
  return DOMPurify.sanitize(raw)
}

export function statsOf(text) {
  const t = text || ''
  const cjk = (t.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length
  const words = (t.match(/[a-zA-Z0-9]+(?:['-][a-zA-Z0-9]+)*/g) || []).length
  const chars = cjk + words
  const lines = t ? t.split('\n').length : 0
  const minutes = Math.max(1, Math.round(chars / 400))
  return { cjk, words, chars, lines, minutes }
}
