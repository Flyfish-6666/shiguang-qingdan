export type QuickLedgerType = 'expense' | 'income'
export type QuickPriority = 'low' | 'medium' | 'high'
type QuickTimeHint = 'morning' | 'noon' | 'afternoon' | 'evening'

export type QuickLedgerDraft = {
  title: string
  amount: number
  type: QuickLedgerType
  category: string
  date: string
  note: string
}

export type QuickTaskDraft = {
  title: string
  due: string
  priority: QuickPriority
  list: string
  important: boolean
  urgent: boolean
}

export type QuickEventDraft = {
  title: string
  date: string
  start: string
  end: string
  category: string
  note: string
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toIsoDate(next)
}

function quickTimeHintFromLabel(label: string): QuickTimeHint {
  if (/中午/.test(label)) return 'noon'
  if (/下午/.test(label)) return 'afternoon'
  if (/晚上|今晚|明晚|后晚/.test(label)) return 'evening'
  return 'morning'
}

function splitLeadingTimeHint(value: string): { body: string; timeHint?: QuickTimeHint } {
  const match = value.trim().match(/^(早上|上午|中午|下午|晚上)\s*(.+)$/)
  if (!match?.[2]?.trim()) return { body: value.trim() }
  return {
    body: match[2].trim(),
    timeHint: quickTimeHintFromLabel(match[1]),
  }
}

function quickTimeRangeFromHint(hint?: QuickTimeHint) {
  switch (hint) {
    case 'morning':
      return { start: '08:30', end: '09:15' }
    case 'noon':
      return { start: '12:15', end: '13:00' }
    case 'afternoon':
      return { start: '15:00', end: '15:45' }
    case 'evening':
      return { start: '19:30', end: '20:15' }
    default:
      return null
  }
}

function resolveQuickDatePrefix(input: string, selectedDate: string) {
  const value = input.trim()
  const timedRelativeMatch = value.match(/^(今天早上|今天上午|今天中午|今天下午|今天晚上|今早|今晚|明天早上|明天上午|明天中午|明天下午|明天晚上|明早|明晚|后天早上|后天上午|后天中午|后天下午|后天晚上|后早|后晚|早上|上午|中午|下午|晚上)\s*(.+)$/)
  if (timedRelativeMatch?.[2]?.trim()) {
    const label = timedRelativeMatch[1]
    const offset = /明/.test(label) ? 1 : /后天|后早|后晚/.test(label) ? 2 : 0
    return {
      body: timedRelativeMatch[2].trim(),
      date: addDays(new Date(`${selectedDate}T12:00:00`), offset),
      offset,
      matched: true,
      timeHint: quickTimeHintFromLabel(label),
    }
  }

  const daysMatch = value.match(/^([0-9]+)\s*天后\s*(.+)$/)
  if (daysMatch?.[2]?.trim()) {
    const offset = Number(daysMatch[1])
    const detail = splitLeadingTimeHint(daysMatch[2])
    return {
      body: detail.body,
      date: addDays(new Date(`${selectedDate}T12:00:00`), offset),
      offset,
      matched: true,
      timeHint: detail.timeHint,
    }
  }

  const weekMatch = value.match(/^(下周|本周|这周|周|星期|礼拜)([一二三四五六日天1-7])\s*(.+)$/)
  if (weekMatch?.[3]?.trim()) {
    const weekMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 0 }
    const targetDay = weekMap[weekMatch[2]]
    const base = new Date(`${selectedDate}T12:00:00`)
    const currentDay = base.getDay()
    const forceNextWeek = weekMatch[1] === '下周'
    let offset = (targetDay - currentDay + 7) % 7
    if (forceNextWeek || offset === 0) offset += 7
    const detail = splitLeadingTimeHint(weekMatch[3])
    return {
      body: detail.body,
      date: addDays(base, offset),
      offset,
      matched: true,
      timeHint: detail.timeHint,
    }
  }

  const relativeMatch = value.match(/^(今天|明天|后天|大后天|下周)\s*(.+)$/)
  if (relativeMatch?.[2]?.trim()) {
    const offset = relativeMatch[1] === '明天' ? 1 : relativeMatch[1] === '后天' ? 2 : relativeMatch[1] === '大后天' ? 3 : relativeMatch[1] === '下周' ? 7 : 0
    const detail = splitLeadingTimeHint(relativeMatch[2])
    return {
      body: detail.body,
      date: addDays(new Date(`${selectedDate}T12:00:00`), offset),
      offset,
      matched: true,
      timeHint: detail.timeHint,
    }
  }

  return {
    body: value,
    date: selectedDate,
    offset: 0,
    matched: false,
  }
}

export function parseQuickLedger(text: string, date: string): QuickLedgerDraft | null {
  const input = text.trim().replace(/[，,。.]$/, '')
  const amountPattern = '([0-9]+(?:\\.[0-9]{1,2})?|[零〇一二两三四五六七八九十百千万]+)'
  const trailingAmount = input.match(new RegExp(`(.+?)[\\s：:]*${amountPattern}\\s*(元|块|块钱|圆|￥|¥)?$`))
  const leadingAmount = input.match(new RegExp(`^(?:￥|¥)?\\s*${amountPattern}\\s*(元|块|块钱|圆)?\\s*(.+)$`))
  if (!trailingAmount && !leadingAmount) return null
  const title = (trailingAmount ? trailingAmount[1] : leadingAmount?.[3] ?? '').trim().replace(/[，,。.]$/, '') || '日常支出'
  const amount = parseAmountValue(trailingAmount ? trailingAmount[2] : leadingAmount?.[1])
  if (!Number.isFinite(amount) || amount <= 0) return null
  const isIncome = /工资|奖金|报销|收入|兼职|退款|转入|红包|补贴|薪水/.test(title)
  return {
    title,
    amount,
    type: isIncome ? 'income' : 'expense',
    category: isIncome ? guessIncomeCategory(title) : guessExpenseCategory(title),
    date,
    note: '快速记账',
  }
}

function parseAmountValue(value?: string) {
  if (!value) return Number.NaN
  if (/^[0-9]+(?:\.[0-9]{1,2})?$/.test(value)) return Number(value)
  return chineseNumberToAmount(value)
}

function chineseNumberToAmount(value: string) {
  const digits: Record<string, number> = {
    零: 0,
    '〇': 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }
  const units: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 }
  if ([...value].every((char) => char in digits)) {
    return [...value].reduce((sum, char) => sum * 10 + digits[char], 0)
  }
  let result = 0
  let section = 0
  let number = 0
  for (const char of value) {
    if (char in digits) {
      number = digits[char]
      continue
    }
    const unit = units[char]
    if (!unit) return Number.NaN
    if (unit === 10000) {
      section = (section + number) * unit
      result += section
      section = 0
    } else {
      section += (number || 1) * unit
    }
    number = 0
  }
  return result + section + number
}

export function parseQuickTask(text: string, date: string): QuickTaskDraft | null {
  const input = text.trim()
  if (!input) return null
  const quickDate = resolveQuickDatePrefix(input, date)
  if (quickDate.matched) {
    return {
      title: quickDate.body,
      due: quickDate.date,
      priority: quickDate.offset === 0 ? 'high' : 'medium',
      list: '快捷',
      important: true,
      urgent: quickDate.offset === 0,
    }
  }
  const taskMatch = input.match(/^(待办|清单|todo|任务|记得|提醒我)\s*[:：]?\s*(.+)$/i)
  if (taskMatch?.[2]?.trim()) {
    return {
      title: taskMatch[2].trim(),
      due: date,
      priority: 'medium',
      list: '快捷',
      important: true,
      urgent: false,
    }
  }
  if (/^(买|整理|复习|完成|打扫|取|交|发|写|看|读|背|练|预约|提交|准备|带|还)\S{1,28}$/.test(input)) {
    return {
      title: input,
      due: date,
      priority: 'medium',
      list: '快捷',
      important: true,
      urgent: false,
    }
  }
  return null
}

export function parseQuickEvent(text: string, selectedDate: string): QuickEventDraft | null {
  const input = text.trim().replace(/[，。,.]$/, '')
  if (!input) return null
  const quickDate = resolveQuickDatePrefix(input, selectedDate)
  const body = quickDate.body
  const eventPattern = /(开会|会议|课|上课|约|见|面试|复习|考试|运动|跑步|健身|散步|自习|补课|提醒|电话)/
  const timeMatch = body.match(/(上午|早上|中午|下午|晚上)?\s*([0-2]?[0-9])(?:[:：点时]([0-5][0-9])?)?\s*(.+)/)
  if (!eventPattern.test(body)) return null
  if (!timeMatch) {
    const hintedRange = quickTimeRangeFromHint(quickDate.timeHint)
    if (!hintedRange) return null
    return {
      title: body,
      date: quickDate.date,
      start: hintedRange.start,
      end: hintedRange.end,
      category: guessEventCategory(body),
      note: '快捷记录',
    }
  }
  const period = timeMatch[1] ?? ''
  const rawHour = Number(timeMatch[2])
  const rawMinute = Number(timeMatch[3] ?? 0)
  const hasAfternoon = /下午|晚上/.test(period) || (!period && (quickDate.timeHint === 'afternoon' || quickDate.timeHint === 'evening'))
  const hasNoon = /中午/.test(period) || (!period && quickDate.timeHint === 'noon')
  const hour = hasAfternoon && rawHour < 12 ? rawHour + 12 : rawHour
  const normalizedHour = hasNoon && rawHour < 11 ? rawHour + 12 : hour
  if (!Number.isFinite(normalizedHour) || normalizedHour > 23 || rawMinute > 59) return null
  const start = `${String(normalizedHour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')}`
  const endDate = new Date(`2026-01-01T${start}:00`)
  endDate.setMinutes(endDate.getMinutes() + 45)
  const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  const title = timeMatch[4].trim() || '日程提醒'
  return {
    title,
    date: quickDate.date,
    start,
    end,
    category: guessEventCategory(title),
    note: '快捷记录',
  }
}

function guessEventCategory(title: string) {
  if (/课|上课|复习|考试|自习|补课/.test(title)) return '学习'
  if (/运动|跑步|健身|散步/.test(title)) return '健康'
  if (/开会|会议|面试|电话/.test(title)) return '工作'
  return '生活'
}

function guessExpenseCategory(title: string) {
  if (/饭|餐|面|粉|米线|饺|包子|馄饨|粥|烧烤|火锅|麻辣烫|汉堡|披萨|咖啡|奶茶|茶饮|早餐|早饭|午餐|午饭|晚餐|晚饭|夜宵|外卖|水果|蔬菜|菜|零食|饮料|可乐|酸奶|蛋糕|面包|甜品|便利店|食堂|餐厅|饭店|麦当劳|肯德基|瑞幸|星巴克|蜜雪|喜茶/.test(title)) return '餐饮'
  if (/地铁|公交|巴士|打车|出租|网约车|滴滴|高铁|火车|动车|机票|飞机|航班|车票|船票|共享单车|单车|电动车|停车|过路费|高速|加油|油费|充电|洗车|修车|保养|驾照|驾校/.test(title)) return '交通'
  if (/书|课本|教材|资料|试卷|本子|笔记本|练习册|文具|尺|尺子|圆规|橡皮|铅笔|钢笔|中性笔|签字笔|笔芯|墨水|书包|文件夹|订书机|便利贴|便签|打印|复印|课程|网课|补课|学费|考试|报名费|四六级|考研|雅思|托福|证书|会员课/.test(title)) return '学习'
  if (/药|医院|体检|牙|牙医|看病|挂号|门诊|感冒|发烧|咳嗽|疫苗|医保|眼镜|隐形|护理液|保健|健身|瑜伽|运动|跑步|游泳|球馆/.test(title)) return '健康'
  if (/房租|租房|水费|电费|水电|燃气|煤气|物业|宽带|网费|话费|手机费|流量|家政|维修|家具|床|桌|椅|灯|收纳|纸巾|洗衣液|沐浴露|洗发水|牙膏|牙刷|日用品/.test(title)) return '住房'
  if (/衣|鞋|包|服|裤|裙|帽|袜|内衣|外套|羽绒服|化妆|护肤|口红|香水|美甲|理发|剪发|超市|商场|淘宝|天猫|京东|拼多多|得物|买|购物|快递|耳机|手机壳|充电器|数据线|电脑|平板|数码|礼物|玩具|杂货/.test(title)) return '购物'
  if (/电影|游戏|会员|音乐|视频|演唱会|门票|景区|旅游|酒店|民宿|KTV|密室|剧本杀|桌游|娱乐|订阅|App|软件|皮肤|充值/.test(title)) return '娱乐'
  return '其他'
}

function guessIncomeCategory(title: string) {
  if (/工资|薪水|薪资/.test(title)) return '工资'
  if (/兼职|外快/.test(title)) return '兼职'
  if (/奖金|红包|补贴|报销|退款|转入/.test(title)) return '收入'
  return '收入'
}
