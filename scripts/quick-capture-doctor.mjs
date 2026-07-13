import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const source = readFileSync(join(root, 'src', 'quickCapture.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2023,
  },
})

const module = { exports: {} }
vm.runInNewContext(compiled.outputText, { module, exports: module.exports }, { filename: 'quickCapture.js' })

const {
  parseQuickEvent,
  parseQuickLedger,
  parseQuickTask,
} = module.exports

const selectedDate = '2026-07-07'
const cases = [
  {
    label: '午饭支出',
    actual: parseQuickLedger('午饭23元', selectedDate),
    expected: { title: '午饭', amount: 23, type: 'expense', category: '餐饮', date: selectedDate },
  },
  {
    label: '金额在前支出',
    actual: parseQuickLedger('23奶茶', selectedDate),
    expected: { title: '奶茶', amount: 23, type: 'expense', category: '餐饮', date: selectedDate },
  },
  {
    label: '金额空格支出',
    actual: parseQuickLedger('23 元 午饭', selectedDate),
    expected: { title: '午饭', amount: 23, type: 'expense', category: '餐饮', date: selectedDate },
  },
  {
    label: '工资收入',
    actual: parseQuickLedger('工资5000', selectedDate),
    expected: { title: '工资', amount: 5000, type: 'income', category: '工资', date: selectedDate },
  },
  {
    label: '中文金额学习用品',
    actual: parseQuickLedger('尺子五元', selectedDate),
    expected: { title: '尺子', amount: 5, type: 'expense', category: '学习', date: selectedDate },
  },
  {
    label: '购物词库支出',
    actual: parseQuickLedger('手机壳18元', selectedDate),
    expected: { title: '手机壳', amount: 18, type: 'expense', category: '购物', date: selectedDate },
  },
  {
    label: '明早日程',
    actual: parseQuickEvent('明早跑步', selectedDate),
    expected: { title: '跑步', date: '2026-07-08', start: '08:30', category: '健康' },
  },
  {
    label: '今晚时间补正',
    actual: parseQuickEvent('今晚8点开会', selectedDate),
    expected: { title: '开会', date: selectedDate, start: '20:00', category: '工作' },
  },
  {
    label: '下周清单',
    actual: parseQuickTask('下周二交作业', selectedDate),
    expected: { title: '交作业', due: '2026-07-14', list: '快捷', urgent: false },
  },
  {
    label: '普通清单',
    actual: parseQuickTask('买牛奶', selectedDate),
    expected: { title: '买牛奶', due: selectedDate, list: '快捷' },
  },
]

let failed = false
console.log('快捷记录行为自检')
console.log('----------------')

for (const item of cases) {
  const missing = item.actual == null
  const mismatches = missing
    ? ['未识别']
    : Object.entries(item.expected)
      .filter(([key, value]) => item.actual[key] !== value)
      .map(([key, value]) => `${key}: ${item.actual[key]} != ${value}`)

  if (mismatches.length) {
    failed = true
    console.log(`[!!] ${item.label} - ${mismatches.join('; ')}`)
  } else {
    console.log(`[OK] ${item.label}`)
  }
}

console.log('----------------')
if (failed) {
  console.log('快捷记录解析存在回归，请先修复。')
  process.exit(1)
}

console.log('快捷记录行为自检通过。')
