import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from 'react'
import {
  AlarmClock,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  CloudSun,
  Grid2X2,
  Heart,
  Home,
  LayoutGrid,
  Leaf,
  ListChecks,
  LockKeyhole,
  Moon,
  NotebookTabs,
  Palette,
  PanelBottom,
  PenLine,
  RotateCcw,
  Settings,
  SmilePlus,
  Sparkles,
  StickyNote,
  SunMedium,
  TimerReset,
  Type,
  WalletCards,
  Wand2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Preferences } from '@capacitor/preferences'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { parseQuickEvent, parseQuickLedger, parseQuickTask } from './quickCapture'
import type { QuickLedgerType } from './quickCapture'
import { dailyQuotes, getDailyQuote } from './dailyQuotes'
import './App.css'

type ModuleKey =
  | 'calendar'
  | 'ledger'
  | 'tasks'
  | 'habits'
  | 'timetable'
  | 'matrix'
  | 'countdown'
  | 'focus'
  | 'journal'
  | 'notes'
  | 'reports'
type ViewKey = 'today' | ModuleKey | 'settings'
type QuickCaptureTarget = 'ledger' | 'calendar' | 'tasks' | 'notes'
type Priority = 'low' | 'medium' | 'high'
type LedgerType = 'expense' | 'income'
type AppearanceKey = 'journal' | 'clean' | 'dark'
type ThemeKey = 'cream' | 'cherry' | 'matcha' | 'moon'
type FontSizeKey = 'small' | 'normal' | 'large'
type ModuleMode = 'off' | 'home' | 'nav' | 'both'
type Quadrant = 'urgentImportant' | 'important' | 'urgent' | 'later'
type HapticKind = 'tap' | 'success' | 'warning'
type IconName =
  | 'appearance'
  | 'back'
  | 'balance'
  | 'bell'
  | 'book'
  | 'calendar'
  | 'check'
  | 'chevron'
  | 'clean'
  | 'countdown'
  | 'dark'
  | 'focus'
  | 'habit'
  | 'heart'
  | 'home'
  | 'income'
  | 'journal'
  | 'layout'
  | 'ledger'
  | 'lock'
  | 'matrix'
  | 'mood'
  | 'modules'
  | 'motion'
  | 'notes'
  | 'pen'
  | 'reports'
  | 'reset'
  | 'settings'
  | 'sparkles'
  | 'sun'
  | 'tasks'
  | 'type'
  | 'wand'
  | 'weather'

type EventItem = {
  id: string
  title: string
  date: string
  start: string
  end: string
  category: string
  note: string
}

type LedgerItem = {
  id: string
  title: string
  amount: number
  type: LedgerType
  category: string
  date: string
  note: string
}

type TaskItem = {
  id: string
  title: string
  due: string
  priority: Priority
  list: string
  done: boolean
  important: boolean
  urgent: boolean
}
type TaskDraft = Omit<TaskItem, 'id' | 'done'>

type HabitItem = {
  id: string
  title: string
  color: string
  days: string[]
}

type TimetableSlot = {
  index: number
  label?: string
  group?: 'morning' | 'afternoon' | 'evening' | 'custom'
  start: string
  end: string
}

type TimetableProfile = {
  id: string
  name: string
  slots: TimetableSlot[]
  showWeekend: boolean
}

type SemesterConfig = {
  code: string
  name: string
  startDate: string
  totalWeeks: number
  profileId: string
  visibleDays: number[]
  currentWeek?: number
}

type WeekRule = 'all' | 'odd' | 'even' | 'range' | 'custom'

type CourseItem = {
  id: string
  title: string
  shortTitle: string
  semester: string
  day: number
  slot: number
  slotSpan: number
  start: string
  end: string
  startWeek: number
  endWeek: number
  weekRule: WeekRule
  weeks: number[]
  customTime: boolean
  place: string
  teacher: string
  color: string
}

type CountdownItem = {
  id: string
  title: string
  date: string
  type: string
  color: string
}

type FocusSession = {
  id: string
  date: string
  focusMinutes: number
  breakMinutes: number
  scholarMode: boolean
  completed: boolean
  note: string
}

type JournalEntry = {
  id: string
  date: string
  mood: string
  title: string
  body: string
  weather: string
}

type NoteItem = {
  id: string
  title: string
  body: string
  color: string
  pinned: boolean
  updatedAt: string
}

type AppSettings = {
  appearance: AppearanceKey
  theme: ThemeKey
  fontSize: FontSizeKey
  reduceMotion: boolean
  quickPreview: boolean
  monthlyBudget: number
  moduleModes: Record<ModuleKey, ModuleMode>
  homeModules: ModuleKey[]
}

type AppData = {
  events: EventItem[]
  ledger: LedgerItem[]
  tasks: TaskItem[]
  habits: HabitItem[]
  timetableSlots: TimetableSlot[]
  timetableProfiles: TimetableProfile[]
  semesters: SemesterConfig[]
  courses: CourseItem[]
  countdowns: CountdownItem[]
  focusSessions: FocusSession[]
  journalEntries: JournalEntry[]
  notes: NoteItem[]
  settings: AppSettings
}

type StoredAppData = {
  version: number
  data: Partial<AppData>
}

type UpdateManifest = {
  version: string
  versionCode?: number
  apkUrl: string
  releaseUrl?: string
  releasesUrl?: string
  forceUpdate?: boolean
  notes?: string[]
  publishedAt?: string
  minSupportedVersion?: string
}

type CollectionKey = 'events' | 'ledger' | 'tasks' | 'habits' | 'courses' | 'countdowns' | 'focusSessions' | 'journalEntries' | 'notes'
type AppRecord = EventItem | LedgerItem | TaskItem | HabitItem | CourseItem | CountdownItem | FocusSession | JournalEntry | NoteItem
type PendingDelete = {
  key: CollectionKey
  id: string
  title: string
  detail?: string
  icon: IconName
  tone: string
} | null
type DeletedSnapshot = NonNullable<PendingDelete> & {
  item: AppRecord
}

type ModuleMeta = {
  key: ModuleKey
  title: string
  shortTitle: string
  desc: string
  icon: IconName
  tone: string
}

const STORAGE_KEY = 'shiguang-list-app-v2'
const STORAGE_VERSION = 3
const APP_VERSION = '1.0'
const UPDATE_MANIFEST_URL = 'https://raw.githubusercontent.com/Flyfish-6666/shiguang-qingdan/main/update.json'
const UPDATE_RELEASES_URL = 'https://github.com/Flyfish-6666/shiguang-qingdan/releases/latest'
const UPDATE_HISTORY_URL = 'https://github.com/Flyfish-6666/shiguang-qingdan/releases'
const MAX_NAV_MODULES = 3
const MAX_HOME_MODULES = 6
const defaultHomeModules: ModuleKey[] = ['ledger', 'calendar', 'tasks', 'journal', 'notes', 'focus']
const today = new Date()
const todayIso = toIsoDate(today)
const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
})

function triggerHaptic(kind: HapticKind = 'tap') {
  if (kind === 'tap') {
    navigator.vibrate?.(6)
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
    return
  }

  if (kind === 'warning') {
    navigator.vibrate?.(16)
    void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined)
    return
  }

  navigator.vibrate?.(12)
  void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined)
}

const modules: ModuleMeta[] = [
  { key: 'calendar', title: '日程', shortTitle: '日程', desc: '安排提醒和当天事项', icon: 'calendar', tone: 'sun' },
  { key: 'ledger', title: '记账', shortTitle: '记账', desc: '快速记录收支和预算', icon: 'ledger', tone: 'leaf' },
  { key: 'tasks', title: '清单', shortTitle: '清单', desc: '待办、重要和完成记录', icon: 'tasks', tone: 'peach' },
  { key: 'habits', title: '习惯', shortTitle: '习惯', desc: '每日打卡和进度追踪', icon: 'habit', tone: 'violet' },
  { key: 'timetable', title: '课表', shortTitle: '课表', desc: '学期课程和本周视图', icon: 'book', tone: 'blue' },
  { key: 'matrix', title: '四象限', shortTitle: '象限', desc: '按重要紧急管理事项', icon: 'matrix', tone: 'amber' },
  { key: 'countdown', title: '倒数日', shortTitle: '倒数', desc: '纪念日和考试倒计时', icon: 'countdown', tone: 'rose' },
  { key: 'focus', title: '番茄专注', shortTitle: '专注', desc: '专注休息循环和锁定', icon: 'focus', tone: 'blue' },
  { key: 'journal', title: '日记心情', shortTitle: '心情', desc: '一句话日记和情绪统计', icon: 'journal', tone: 'violet' },
  { key: 'notes', title: '备忘便签', shortTitle: '便签', desc: '随手记录灵感碎片', icon: 'notes', tone: 'sun' },
  { key: 'reports', title: '年月报告', shortTitle: '报告', desc: '月度复盘和年度趋势', icon: 'reports', tone: 'amber' },
]

function getInitialView(): ViewKey {
  const viewParam = new URLSearchParams(window.location.search).get('view')
  if (viewParam === 'today' || viewParam === 'settings') return viewParam
  const module = modules.find((item) => item.key === viewParam)
  return module?.key ?? 'today'
}

function getInitialAction() {
  return new URLSearchParams(window.location.search).get('action') === 'new' ? 'new' : null
}

function syncViewUrl(nextView: ViewKey, action?: 'new') {
  const url = new URL(window.location.href)
  if (nextView === 'today') {
    url.searchParams.delete('view')
  } else {
    url.searchParams.set('view', nextView)
  }
  if (action) {
    url.searchParams.set('action', action)
  } else {
    url.searchParams.delete('action')
  }
  const nextUrl = `${url.pathname}${url.search}${url.hash}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (nextUrl !== currentUrl) window.history.replaceState({}, '', nextUrl)
}

const iconMap: Record<IconName, LucideIcon> = {
  appearance: Palette,
  back: ArrowLeft,
  balance: WalletCards,
  bell: Bell,
  book: BookOpen,
  calendar: CalendarDays,
  check: Check,
  chevron: ChevronRight,
  clean: LayoutGrid,
  countdown: AlarmClock,
  dark: Moon,
  focus: TimerReset,
  habit: Leaf,
  heart: Heart,
  home: Home,
  income: CircleDollarSign,
  journal: NotebookTabs,
  layout: LayoutGrid,
  ledger: CircleDollarSign,
  lock: LockKeyhole,
  matrix: Grid2X2,
  mood: SmilePlus,
  modules: PanelBottom,
  motion: Sparkles,
  notes: StickyNote,
  pen: PenLine,
  reports: BarChart3,
  reset: RotateCcw,
  settings: Settings,
  sparkles: Sparkles,
  sun: SunMedium,
  tasks: ListChecks,
  type: Type,
  wand: Wand2,
  weather: CloudSun,
}

function Icon({ name, className }: { name: IconName; className?: string }) {
  const Component = iconMap[name]
  return <Component aria-hidden="true" className={className} strokeWidth={1.85} />
}

function BrandGlyph() {
  return (
    <svg className="brand-glyph" viewBox="0 0 48 48" aria-hidden="true" role="img">
      <defs>
        <linearGradient id="brand-page-gradient" x1="12" y1="9" x2="36" y2="39" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff9ed" />
          <stop offset="1" stopColor="#f5e6d3" />
        </linearGradient>
        <linearGradient id="brand-leaf-gradient" x1="22" y1="33" x2="35" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f8d73" />
          <stop offset="1" stopColor="#7fc79d" />
        </linearGradient>
      </defs>
      <rect className="brand-app-tile" x="5.5" y="5.5" width="37" height="37" rx="13" />
      <rect className="brand-page" x="13" y="10" width="23" height="29" rx="7.5" />
      <path className="brand-fold" d="M29.5 10v6.3c0 1.6 1.3 2.9 2.9 2.9H36" />
      <circle className="brand-dot dot-sun" cx="18.8" cy="18.7" r="2.1" />
      <circle className="brand-dot dot-leaf" cx="18.8" cy="25.4" r="2.1" />
      <path className="brand-ribbon" d="M24 18.8h5.7M24 25.4h7.8" />
      <path className="brand-check" d="M17.7 32l4.1 3.9 9.2-11.1" />
      <path className="brand-leaf" d="M33.5 29.4c4.4-1.2 6.8-4.7 6.5-9.2-4.8.2-8.2 2.7-9.4 7.2 1.1.4 2.1 1.1 2.9 2z" />
    </svg>
  )
}

const appearanceOptions: { key: AppearanceKey; label: string; desc: string; icon: IconName }[] = [
  { key: 'journal', label: '晨雾手账', desc: '纸感、贴纸、温柔留白', icon: 'journal' },
  { key: 'clean', label: '城市极简', desc: '细线、紧凑、效率工具', icon: 'clean' },
  { key: 'dark', label: '暮色收藏', desc: '低亮、深色、情绪仪表盘', icon: 'dark' },
]

const themeOptions: { key: ThemeKey; label: string }[] = [
  { key: 'cream', label: '奶油' },
  { key: 'cherry', label: '莓粉' },
  { key: 'matcha', label: '鼠尾草' },
  { key: 'moon', label: '月蓝' },
]

const fontOptions: { key: FontSizeKey; label: string }[] = [
  { key: 'small', label: '小' },
  { key: 'normal', label: '标准' },
  { key: 'large', label: '大' },
]

const validAppearanceKeys = new Set<AppearanceKey>(appearanceOptions.map((item) => item.key))
const validThemeKeys = new Set<ThemeKey>(themeOptions.map((item) => item.key))
const validFontSizeKeys = new Set<FontSizeKey>(fontOptions.map((item) => item.key))
const validModuleModes = new Set<ModuleMode>(['off', 'home', 'nav', 'both'])
const validPriorities = new Set<Priority>(['low', 'medium', 'high'])
const validLedgerTypes = new Set<LedgerType>(['expense', 'income'])

function normalizeHomeModules(value: unknown): ModuleKey[] {
  const validKeys = new Set(modules.map((module) => module.key))
  const picked = Array.isArray(value)
    ? value.filter((key): key is ModuleKey => typeof key === 'string' && validKeys.has(key as ModuleKey))
    : []
  const merged = [...picked, ...defaultHomeModules, ...modules.map((module) => module.key)]
  return Array.from(new Set(merged)).slice(0, MAX_HOME_MODULES)
}

const defaultTimetableSlots: TimetableSlot[] = [
  { index: 1, label: '1', group: 'morning', start: '08:00', end: '08:45' },
  { index: 2, label: '2', group: 'morning', start: '08:55', end: '09:40' },
  { index: 3, label: '3', group: 'morning', start: '10:00', end: '10:45' },
  { index: 4, label: '4', group: 'morning', start: '10:55', end: '11:40' },
  { index: 5, label: '5', group: 'afternoon', start: '14:00', end: '14:45' },
  { index: 6, label: '6', group: 'afternoon', start: '14:55', end: '15:40' },
  { index: 7, label: '7', group: 'afternoon', start: '16:00', end: '16:45' },
  { index: 8, label: '8', group: 'afternoon', start: '16:55', end: '17:40' },
  { index: 9, label: '9', group: 'evening', start: '19:00', end: '19:45' },
  { index: 10, label: '10', group: 'evening', start: '19:55', end: '20:40' },
]

const timetableSlotPresets: { key: string; label: string; slots: TimetableSlot[] }[] = [
  {
    key: 'school',
    label: '中学 45 分钟',
    slots: defaultTimetableSlots,
  },
  {
    key: 'college',
    label: '大学 50 分钟',
    slots: [
      { index: 1, label: '1', group: 'morning', start: '08:00', end: '08:50' },
      { index: 2, label: '2', group: 'morning', start: '09:00', end: '09:50' },
      { index: 3, label: '3', group: 'morning', start: '10:10', end: '11:00' },
      { index: 4, label: '4', group: 'morning', start: '11:10', end: '12:00' },
      { index: 5, label: '5', group: 'afternoon', start: '14:00', end: '14:50' },
      { index: 6, label: '6', group: 'afternoon', start: '15:00', end: '15:50' },
      { index: 7, label: '7', group: 'afternoon', start: '16:10', end: '17:00' },
      { index: 8, label: '8', group: 'afternoon', start: '17:10', end: '18:00' },
      { index: 9, label: '9', group: 'evening', start: '19:00', end: '19:50' },
      { index: 10, label: '10', group: 'evening', start: '20:00', end: '20:50' },
    ],
  },
  {
    key: 'compact',
    label: '紧凑 40 分钟',
    slots: [
      { index: 1, label: '1', group: 'morning', start: '08:00', end: '08:40' },
      { index: 2, label: '2', group: 'morning', start: '08:50', end: '09:30' },
      { index: 3, label: '3', group: 'morning', start: '09:40', end: '10:20' },
      { index: 4, label: '4', group: 'morning', start: '10:30', end: '11:10' },
      { index: 5, label: '5', group: 'afternoon', start: '13:30', end: '14:10' },
      { index: 6, label: '6', group: 'afternoon', start: '14:20', end: '15:00' },
      { index: 7, label: '7', group: 'afternoon', start: '15:10', end: '15:50' },
      { index: 8, label: '8', group: 'afternoon', start: '16:00', end: '16:40' },
      { index: 9, label: '9', group: 'evening', start: '18:30', end: '19:10' },
      { index: 10, label: '10', group: 'evening', start: '19:20', end: '20:00' },
    ],
  },
]

const defaultTimetableProfiles: TimetableProfile[] = [
  { id: 'standard', name: '标准作息', slots: defaultTimetableSlots.map((slot) => ({ ...slot })), showWeekend: false },
  { id: 'college', name: '大学 50 分钟', slots: timetableSlotPresets[1].slots.map((slot) => ({ ...slot })), showWeekend: false },
  {
    id: 'summer',
    name: '夏季作息',
    showWeekend: false,
    slots: [
      { index: 1, label: '1', group: 'morning', start: '08:10', end: '08:55' },
      { index: 2, label: '2', group: 'morning', start: '09:05', end: '09:50' },
      { index: 3, label: '3', group: 'morning', start: '10:10', end: '10:55' },
      { index: 4, label: '4', group: 'morning', start: '11:05', end: '11:50' },
      { index: 5, label: '5', group: 'afternoon', start: '14:30', end: '15:15' },
      { index: 6, label: '6', group: 'afternoon', start: '15:25', end: '16:10' },
      { index: 7, label: '7', group: 'afternoon', start: '16:30', end: '17:15' },
      { index: 8, label: '8', group: 'afternoon', start: '17:25', end: '18:10' },
      { index: 9, label: '9', group: 'evening', start: '19:20', end: '20:05' },
      { index: 10, label: '10', group: 'evening', start: '20:15', end: '21:00' },
    ],
  },
]

const defaultSemesterCode = getSemesterCode(todayIso)
const defaultSemesters: SemesterConfig[] = [
  {
    code: defaultSemesterCode,
    name: `${defaultSemesterCode.slice(0, 4)}-${defaultSemesterCode.endsWith('01') ? '春' : '秋'}季学期`,
    startDate: getSemesterStartDate(todayIso),
    totalWeeks: 18,
    profileId: 'standard',
    visibleDays: [1, 2, 3, 4, 5],
  },
]

const defaultSettings: AppSettings = {
  appearance: 'journal',
  theme: 'cream',
  fontSize: 'normal',
  reduceMotion: false,
  quickPreview: true,
  monthlyBudget: 0,
  moduleModes: {
    calendar: 'home',
    ledger: 'both',
    tasks: 'both',
    habits: 'home',
    timetable: 'home',
    matrix: 'home',
    countdown: 'home',
    focus: 'home',
    journal: 'home',
    notes: 'home',
    reports: 'home',
  },
  homeModules: defaultHomeModules,
}

const seedData: AppData = {
  events: [],
  ledger: [],
  tasks: [],
  habits: [],
  timetableSlots: defaultTimetableSlots.map((slot) => ({ ...slot })),
  timetableProfiles: defaultTimetableProfiles.map((profile) => ({
    ...profile,
    slots: profile.slots.map((slot) => ({ ...slot })),
  })),
  semesters: defaultSemesters.map((semester) => ({ ...semester, visibleDays: [...semester.visibleDays] })),
  courses: [],
  countdowns: [],
  focusSessions: [],
  journalEntries: [],
  notes: [],
  settings: defaultSettings,
}

function App() {
  const [data, setData] = useLocalData()
  const [view, setView] = useState<ViewKey>(() => getInitialView())
  const [launchAction, setLaunchAction] = useState<'new' | null>(() => getInitialAction())
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [updateReady, setUpdateReady] = useState(false)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [undoDelete, setUndoDelete] = useState<DeletedSnapshot | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)
  const historyRef = useRef<ViewKey[]>([])

  const settings = data.settings
  const navModules = modules
    .filter((module) => ['nav', 'both'].includes(settings.moduleModes[module.key]))

  const dayEvents = useMemo(
    () =>
      data.events
        .filter((item) => item.date === selectedDate)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [data.events, selectedDate],
  )
  const monthLedger = useMemo(
    () => data.ledger.filter((item) => item.date.startsWith(selectedDate.slice(0, 7))),
    [data.ledger, selectedDate],
  )
  const ledgerStats = useMemo(() => getLedgerStats(monthLedger), [monthLedger])
  const dueTasks = data.tasks.filter((task) => !task.done && task.due <= selectedDate)
  const reminders = useMemo(
    () => buildDailyReminders(data, selectedDate, ledgerStats, dayEvents),
    [data, selectedDate, ledgerStats, dayEvents],
  )

  useEffect(() => {
    void SplashScreen.hide().catch(() => undefined)
  }, [])

  useEffect(() => {
    const isDarkAppearance = settings.appearance === 'dark'
    const themeColor = settings.appearance === 'dark' ? '#15172c' : settings.appearance === 'clean' ? '#eef3f8' : '#efd8c3'
    document.querySelector<HTMLMetaElement>("meta[name='theme-color']")?.setAttribute('content', themeColor)
    void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined)
    void StatusBar.setStyle({ style: isDarkAppearance ? Style.Light : Style.Dark }).catch(() => undefined)
    void StatusBar.setBackgroundColor({ color: themeColor }).catch(() => undefined)
  }, [settings.appearance])

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: settings.reduceMotion ? 'auto' : 'smooth' })
  }, [settings.reduceMotion, view])

  useEffect(() => {
    function handlePopState() {
      historyRef.current = []
      setView(getInitialView())
      setLaunchAction(getInitialAction())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => {
      setToast(null)
      setUndoDelete(null)
    }, undoDelete ? 4200 : 1800)
    return () => window.clearTimeout(timeout)
  }, [toast, undoDelete])

  useEffect(() => {
    const removers: Array<() => void> = []
    import('@capacitor/keyboard')
      .then(async ({ Keyboard }) => {
        const show = await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight || 0)
        })
        const hide = await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0)
        })
        removers.push(() => void show.remove(), () => void hide.remove())
      })
      .catch(() => undefined)

    return () => {
      removers.forEach((remove) => remove())
    }
  }, [])

  const notify = useCallback((message: string, haptic: HapticKind = 'success') => {
    setToast(message)
    setUndoDelete(null)
    triggerHaptic(haptic)
  }, [])

  useEffect(() => {
    function handleUpdateReady() {
      setUpdateReady(true)
      setToast(null)
      triggerHaptic('warning')
    }

    window.addEventListener('shiguang:update-ready', handleUpdateReady)
    return () => window.removeEventListener('shiguang:update-ready', handleUpdateReady)
  }, [])

  useEffect(() => {
    function handleOffline() {
      setIsOnline(false)
      setToast(null)
      setUndoDelete(null)
      triggerHaptic('warning')
    }

    function handleOnline() {
      setIsOnline(true)
      setToast('网络已恢复')
      triggerHaptic('success')
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const navigate = useCallback((nextView: ViewKey, options: { replace?: boolean } = {}) => {
    if (nextView === view) {
      syncViewUrl(nextView)
      return
    }
    if (options.replace) {
      historyRef.current = []
    } else {
      historyRef.current = [...historyRef.current, view].slice(-12)
    }
    setView(nextView)
    syncViewUrl(nextView)
    triggerHaptic('tap')
  }, [view])

  const openQuickCreate = useCallback((nextView: ViewKey) => {
    setLaunchAction('new')
    triggerHaptic('tap')
    if (nextView === view) {
      syncViewUrl(nextView, 'new')
      return
    }
    navigate(nextView)
  }, [navigate, view])

  const goBack = useCallback(() => {
    const backEvent = new Event('shiguang:back-request', { cancelable: true })
    if (!window.dispatchEvent(backEvent)) return
    const previous = historyRef.current.pop()
    if (previous) {
      setView(previous)
      syncViewUrl(previous)
    } else if (view !== 'today') {
      setView('today')
      syncViewUrl('today')
    } else {
      notify('已在今日页')
    }
    triggerHaptic('tap')
  }, [notify, view])

  useEffect(() => {
    let removeListener: (() => void) | undefined
    import('@capacitor/app')
      .then(({ App: CapacitorApp }) =>
        CapacitorApp.addListener('backButton', () => {
          goBack()
        }),
      )
      .then((listener) => {
        removeListener = () => {
          void listener.remove()
        }
      })
      .catch(() => undefined)

    return () => removeListener?.()
  }, [goBack])

  function updateSettings(next: Partial<AppSettings>) {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...next },
    }))
  }

  function setModuleMode(key: ModuleKey, mode: ModuleMode) {
    setData((current) => {
      const moduleModes = { ...current.settings.moduleModes }
      const currentMode = moduleModes[key]
      const isPinned = currentMode === 'nav' || currentMode === 'both'
      const willPin = mode === 'nav' || mode === 'both'
      const pinnedCount = modules.filter((module) => {
        const itemMode = moduleModes[module.key]
        return itemMode === 'nav' || itemMode === 'both'
      }).length

      if (!isPinned && willPin && pinnedCount >= MAX_NAV_MODULES) {
        notify(`底栏最多固定 ${MAX_NAV_MODULES} 个功能`)
        return current
      }

      moduleModes[key] = mode

      return {
        ...current,
        settings: {
          ...current.settings,
          moduleModes,
        },
      }
    })
  }

  function setHomeModuleSlot(index: number, key: ModuleKey) {
    setData((current) => {
      const currentHomeModules = normalizeHomeModules(current.settings.homeModules)
      const nextHomeModules = [...currentHomeModules]
      const duplicateIndex = nextHomeModules.indexOf(key)
      if (duplicateIndex >= 0 && duplicateIndex !== index) {
        nextHomeModules[duplicateIndex] = nextHomeModules[index]
      }
      nextHomeModules[index] = key
      return {
        ...current,
        settings: {
          ...current.settings,
          homeModules: normalizeHomeModules(nextHomeModules),
        },
      }
    })
    triggerHaptic('success')
  }

  const exportData = useCallback(async () => {
    const payload = {
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    }
    const fileName = `拾光清单-${todayIso}-backup.json`
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const file = new File([blob], fileName, { type: 'application/json' })

    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: '拾光清单备份',
          text: '导出当前拾光清单数据备份。',
          files: [file],
        })
        notify('备份已交给系统分享')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          notify('已取消分享备份')
          return
        }
      }
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notify('备份已导出')
  }, [data, notify])

  const importData = useCallback(async (file: File) => {
    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw) as Partial<AppData> | StoredAppData
      const storedVersion = isStoredAppData(parsed) ? parsed.version : 0
      const nextData = migrateAppData(isStoredAppData(parsed) ? parsed.data : parsed, storedVersion)
      setData(nextData)
      setPendingDelete(null)
      notify('备份已导入')
    } catch {
      notify('备份文件无法识别', 'warning')
    }
  }, [notify, setData])

  const resetAllData = useCallback(() => {
    setData(migrateAppData({}, 0))
    setPendingDelete(null)
    notify('已恢复初始数据')
  }, [notify, setData])

  function addEvent(event: Omit<EventItem, 'id'>) {
    setData((current) => ({
      ...current,
      events: [{ ...event, id: cryptoId() }, ...current.events],
    }))
    notify('日程已放进这一天')
  }

  function updateEvent(nextEvent: EventItem) {
    setData((current) => ({
      ...current,
      events: current.events.map((event) => (event.id === nextEvent.id ? nextEvent : event)),
    }))
    notify('日程已更新')
  }

  function addLedger(item: Omit<LedgerItem, 'id'>) {
    setData((current) => ({
      ...current,
      ledger: [{ ...item, id: cryptoId() }, ...current.ledger],
    }))
    notify(`${item.type === 'expense' ? '支出' : '收入'}已记好`)
  }

  function updateLedger(nextItem: LedgerItem) {
    setData((current) => ({
      ...current,
      ledger: current.ledger.map((item) => (item.id === nextItem.id ? nextItem : item)),
    }))
    notify('账目已更新')
  }

  function addTask(task: Omit<TaskItem, 'id' | 'done'>) {
    setData((current) => ({
      ...current,
      tasks: [{ ...task, id: cryptoId(), done: false }, ...current.tasks],
    }))
    notify('清单已加入')
  }

  function updateTask(nextTask: TaskItem) {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === nextTask.id ? nextTask : task)),
    }))
    notify('清单已更新')
  }

  function addHabit(title: string, color?: string) {
    setData((current) => ({
      ...current,
      habits: [
        {
          id: cryptoId(),
          title,
          color: color || ['mint', 'rose', 'amber', 'blue'][current.habits.length % 4],
          days: [],
        },
        ...current.habits,
      ],
    }))
    notify('习惯已添加')
  }

  function updateHabit(nextHabit: HabitItem) {
    setData((current) => ({
      ...current,
      habits: current.habits.map((habit) => (habit.id === nextHabit.id ? nextHabit : habit)),
    }))
    notify('习惯已更新')
  }

  function addCourse(course: Omit<CourseItem, 'id'>) {
    setData((current) => ({
      ...current,
      courses: [{ ...course, id: cryptoId() }, ...current.courses],
    }))
    notify('课程已加入课表')
  }

  function updateCourse(nextCourse: CourseItem) {
    setData((current) => ({
      ...current,
      courses: current.courses.map((course) => (course.id === nextCourse.id ? nextCourse : course)),
    }))
    notify('课程已更新')
  }

  function updateTimetableSlots(nextSlots: TimetableSlot[]) {
    const timetableSlots = normalizeTimetableSlots(nextSlots)
    setData((current) => ({
      ...current,
      timetableSlots,
      courses: current.courses.map((course) => {
        const slotIndex = course.slot || getSlotFromTime(course.start, current.timetableSlots)
        const time = getCourseSlotTime(slotIndex, course.slotSpan || 1, timetableSlots)
        return { ...course, slot: slotIndex, start: time.start, end: time.end }
      }),
    }))
    notify('课时设置已保存')
  }

function updateTimetableProfiles(nextProfiles: TimetableProfile[]) {
    const timetableProfiles = normalizeTimetableProfiles(nextProfiles, data.timetableSlots)
    setData((current) => ({
      ...current,
      timetableProfiles,
      timetableSlots: timetableProfiles[0]?.slots.map((slot: TimetableSlot) => ({ ...slot })) ?? current.timetableSlots,
    }))
    notify('作息方案已保存')
  }

  function updateSemesters(nextSemesters: SemesterConfig[]) {
    setData((current) => ({
      ...current,
      semesters: normalizeSemesters(nextSemesters, current.timetableProfiles, current.courses),
    }))
    notify('学期设置已保存')
  }

  function addCountdown(item: Omit<CountdownItem, 'id'>) {
    setData((current) => ({
      ...current,
      countdowns: [{ ...item, id: cryptoId() }, ...current.countdowns],
    }))
    notify('倒数日已添加')
  }

  function updateCountdown(nextItem: CountdownItem) {
    setData((current) => ({
      ...current,
      countdowns: current.countdowns.map((item) => (item.id === nextItem.id ? nextItem : item)),
    }))
    notify('倒数日已更新')
  }

  function addFocusSession(session: Omit<FocusSession, 'id'>) {
    setData((current) => ({
      ...current,
      focusSessions: [{ ...session, id: cryptoId() }, ...current.focusSessions],
    }))
    notify('番茄钟开始了')
  }

  function saveJournalEntry(entry: Omit<JournalEntry, 'id'>) {
    const existing = data.journalEntries.find((item) => item.date === entry.date)
    setData((current) => {
      const currentExisting = current.journalEntries.find((item) => item.date === entry.date)
      return {
        ...current,
        journalEntries: currentExisting
          ? current.journalEntries.map((item) => (item.id === currentExisting.id ? { ...item, ...entry } : item))
          : [{ ...entry, id: cryptoId() }, ...current.journalEntries],
      }
    })
    notify(existing ? '日记已更新' : '日记已保存')
  }

  function addNote(note: Omit<NoteItem, 'id' | 'updatedAt'>) {
    setData((current) => ({
      ...current,
      notes: [{ ...note, id: cryptoId(), updatedAt: todayIso }, ...current.notes],
    }))
    notify('便签已贴上')
  }

  function updateNote(note: NoteItem) {
    setData((current) => ({
      ...current,
      notes: current.notes.map((item) => (item.id === note.id ? { ...note, updatedAt: todayIso } : item)),
    }))
    notify('便签已更新')
  }

  function removeFrom(key: CollectionKey, id: string) {
    setData((current) => {
      const value = current[key] as AppRecord[]
      const deleted = value.find((item) => item.id === id)
      if (deleted && pendingDelete?.id === id && pendingDelete.key === key) {
        setUndoDelete({ ...pendingDelete, item: deleted })
      }
      return {
        ...current,
        [key]: value.filter((item) => item.id !== id),
      }
    })
    setToast('已删除，可撤销')
    triggerHaptic('warning')
  }

  function restoreDeleted() {
    if (!undoDelete) return
    setData((current) => {
      const value = current[undoDelete.key] as AppRecord[]
      if (value.some((item) => item.id === undoDelete.item.id)) return current
      return {
        ...current,
        [undoDelete.key]: [undoDelete.item, ...value],
      }
    })
    setUndoDelete(null)
    notify('已恢复')
  }

  function requestDelete(next: NonNullable<PendingDelete>) {
    setPendingDelete(next)
    triggerHaptic('warning')
  }

  function confirmDelete() {
    if (!pendingDelete) return
    removeFrom(pendingDelete.key, pendingDelete.id)
    setPendingDelete(null)
  }

  function toggleTask(id: string) {
    const target = data.tasks.find((task) => task.id === id)
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    }))
    if (target) notify(target.done ? '已恢复待办' : '完成一项，漂亮')
  }

  function toggleHabit(id: string, date = selectedDate) {
    const target = data.habits.find((habit) => habit.id === id)
    const alreadyDone = target?.days.includes(date)
    setData((current) => ({
      ...current,
      habits: current.habits.map((habit) => {
        if (habit.id !== id) return habit
        const hasDay = habit.days.includes(date)
        return {
          ...habit,
          days: hasDay ? habit.days.filter((day) => day !== date) : [...habit.days, date],
        }
      }),
    }))
    if (target) notify(alreadyDone ? '已取消打卡' : '习惯打卡成功')
  }

  function quickAdd(
    text: string,
    options?: {
      forceView?: QuickCaptureTarget
      ledgerOverride?: Partial<Pick<LedgerItem, 'category' | 'type'>>
    },
  ) {
    const value = text.trim()
    if (!value) return false

    if (options?.forceView === 'ledger') {
      const ledger = parseQuickLedger(value, selectedDate)
      if (!ledger) return false
      addLedger({ ...ledger, ...options.ledgerOverride })
      return true
    }

    if (options?.forceView === 'calendar') {
      const event = parseQuickEvent(value, selectedDate) ?? {
        title: value,
        date: selectedDate,
        start: '09:00',
        end: '10:00',
        category: '生活',
        note: '快捷记录',
      }
      addEvent(event)
      return true
    }

    if (options?.forceView === 'tasks') {
      const task = parseQuickTask(value, selectedDate) ?? {
        title: value,
        due: selectedDate,
        priority: 'medium' as Priority,
        list: '快捷',
        important: true,
        urgent: false,
      }
      addTask(task)
      return true
    }

    if (options?.forceView === 'notes') {
      addNote({
        title: value.slice(0, 18),
        body: value,
        color: 'amber',
        pinned: false,
      })
      return true
    }

    const ledger = parseQuickLedger(text, selectedDate)
    if (ledger) {
      addLedger({ ...ledger, ...options?.ledgerOverride })
      return true
    }

    const event = parseQuickEvent(text, selectedDate)
    if (event) {
      addEvent(event)
      return true
    }

    const task = parseQuickTask(text, selectedDate)
    if (task) {
      addTask(task)
      return true
    }

    addNote({
      title: value.slice(0, 18),
      body: value,
      color: 'amber',
      pinned: false,
    })
    return true
  }

  function currentTitle() {
    if (view === 'today') return '今日'
    if (view === 'settings') return '设置'
    return modules.find((module) => module.key === view)?.title ?? '更多'
  }

  return (
    <main
      className={`app-shell appearance-${settings.appearance} theme-${settings.theme} font-${settings.fontSize} ${settings.reduceMotion ? 'reduce-motion' : ''}`}
      style={{ '--keyboard-height': `${keyboardHeight}px` } as CSSProperties}
    >
      <section className="phone-frame" aria-label="拾光清单日常管理应用">
        <Header
          title={currentTitle()}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          stats={ledgerStats}
          canGoBack={view !== 'today'}
          onBack={goBack}
        />

        <section className="content-area page-pop" key={view} ref={contentRef}>
          {view === 'today' && (
            <TodayView
              data={data}
              selectedDate={selectedDate}
              events={dayEvents}
              tasks={dueTasks}
              stats={ledgerStats}
              reminders={reminders}
              quickPreviewEnabled={settings.quickPreview}
              homeModules={settings.homeModules}
              setView={navigate}
              openQuickCreate={openQuickCreate}
              quickAdd={quickAdd}
              setHomeModuleSlot={setHomeModuleSlot}
              toggleTask={toggleTask}
              toggleHabit={toggleHabit}
            />
          )}

          {view === 'calendar' && (
            <CalendarView
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('calendar')
              }}
              events={dayEvents}
              allEvents={data.events}
              onAdd={addEvent}
              onUpdate={updateEvent}
              onRemove={(event) => requestDelete({
                key: 'events',
                id: event.id,
                title: event.title,
                detail: `${event.start}-${event.end} · ${event.category}`,
                icon: 'calendar',
                tone: 'blue',
              })}
            />
          )}

          {view === 'ledger' && (
            <LedgerView
              selectedDate={selectedDate}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('ledger')
              }}
              query={query}
              setQuery={setQuery}
              stats={ledgerStats}
              monthlyBudget={settings.monthlyBudget}
              updateMonthlyBudget={(monthlyBudget) => updateSettings({ monthlyBudget })}
              items={monthLedger.filter((item) => searchLedger(item, query))}
              onAdd={addLedger}
              onUpdate={updateLedger}
              onRemove={(item) => requestDelete({
                key: 'ledger',
                id: item.id,
                title: item.title,
                detail: `${item.type === 'expense' ? '支出' : '收入'} · ${currency.format(item.amount)}`,
                icon: 'ledger',
                tone: 'leaf',
              })}
            />
          )}

          {view === 'tasks' && (
            <TasksView
              selectedDate={selectedDate}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('tasks')
              }}
              tasks={data.tasks}
              onAdd={addTask}
              onUpdate={updateTask}
              onToggle={toggleTask}
              onRemove={(task) => requestDelete({
                key: 'tasks',
                id: task.id,
                title: task.title,
                detail: `${task.list} · ${task.due}`,
                icon: 'tasks',
                tone: 'peach',
              })}
            />
          )}

          {view === 'habits' && (
            <HabitsView
              habits={data.habits}
              selectedDate={selectedDate}
              onAdd={addHabit}
              onUpdate={updateHabit}
              onToggle={toggleHabit}
              onRemove={(habit) => requestDelete({
                key: 'habits',
                id: habit.id,
                title: habit.title,
                detail: `已打卡 ${habit.days.length} 天`,
                icon: 'habit',
                tone: 'violet',
              })}
            />
          )}

          {view === 'timetable' && (
            <TimetableView
              courses={data.courses}
              slots={data.timetableSlots}
              profiles={data.timetableProfiles}
              semesters={data.semesters}
              selectedDate={selectedDate}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('timetable')
              }}
              onAdd={addCourse}
              onUpdate={updateCourse}
              onUpdateSlots={updateTimetableSlots}
              onUpdateProfiles={updateTimetableProfiles}
              onUpdateSemesters={updateSemesters}
              onRemove={(course) => requestDelete({
                key: 'courses',
                id: course.id,
                title: course.title,
                detail: `${course.semester} · ${weekNames[course.day - 1]} · 第 ${course.slot || getSlotFromTime(course.start, data.timetableSlots)} 节`,
                icon: 'book',
                tone: 'blue',
              })}
            />
          )}

          {view === 'matrix' && (
            <MatrixView
              tasks={data.tasks}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('matrix')
              }}
              onAdd={addTask}
              onUpdate={updateTask}
              onToggle={toggleTask}
              onRemove={(task) => requestDelete({
                key: 'tasks',
                id: task.id,
                title: task.title,
                detail: `${task.list} · ${task.due}`,
                icon: 'matrix',
                tone: 'amber',
              })}
            />
          )}

          {view === 'countdown' && (
            <CountdownView
              countdowns={data.countdowns}
              onAdd={addCountdown}
              onUpdate={updateCountdown}
              onRemove={(item) => requestDelete({
                key: 'countdowns',
                id: item.id,
                title: item.title,
                detail: `${item.type} · ${item.date}`,
                icon: 'countdown',
                tone: 'rose',
              })}
            />
          )}

          {view === 'focus' && (
            <FocusView
              sessions={data.focusSessions}
              selectedDate={selectedDate}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('focus')
              }}
              onAdd={addFocusSession}
              onRemove={(session) => requestDelete({
                key: 'focusSessions',
                id: session.id,
                title: session.note,
                detail: `${session.focusMinutes} 分钟专注 · ${session.date}`,
                icon: 'focus',
                tone: 'blue',
              })}
            />
          )}

          {view === 'journal' && (
            <JournalView
              entries={data.journalEntries}
              selectedDate={selectedDate}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('journal')
              }}
              ledger={data.ledger}
              tasks={data.tasks}
              onSave={saveJournalEntry}
              onRemove={(entry) => requestDelete({
                key: 'journalEntries',
                id: entry.id,
                title: entry.title,
                detail: `${entry.date} · ${entry.mood}`,
                icon: 'journal',
                tone: 'violet',
              })}
            />
          )}

          {view === 'notes' && (
            <NotesView
              notes={data.notes}
              autoOpen={launchAction === 'new'}
              onAutoOpenHandled={() => {
                setLaunchAction(null)
                syncViewUrl('notes')
              }}
              onAdd={addNote}
              onUpdate={updateNote}
              onRemove={(note) => requestDelete({
                key: 'notes',
                id: note.id,
                title: note.title,
                detail: note.pinned ? '置顶便签' : note.updatedAt,
                icon: 'notes',
                tone: 'sun',
              })}
            />
          )}

          {view === 'reports' && (
            <ReportsView
              data={data}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              stats={ledgerStats}
              onJump={(nextView, action) => {
                if (action === 'new') {
                  openQuickCreate(nextView)
                  return
                }
                navigate(nextView)
              }}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              data={data}
              settings={settings}
              modules={modules}
              setHomeModuleSlot={setHomeModuleSlot}
              exportData={exportData}
              importData={importData}
              resetAllData={resetAllData}
              updateSettings={updateSettings}
              setModuleMode={setModuleMode}
            />
          )}
        </section>

        {toast && (
          <div className={undoDelete ? 'toast-bubble undo-toast' : 'toast-bubble'} role="status" aria-live="polite">
            <Icon name="check" />
            <span>{toast}</span>
            {undoDelete && (
              <button type="button" onClick={restoreDeleted}>
                撤销
              </button>
            )}
          </div>
        )}

        {updateReady && (
          <button className="toast-bubble update-toast" type="button" onClick={() => window.location.reload()} aria-live="polite">
            <Icon name="sparkles" />
            <span>新版本已准备好，点击刷新</span>
          </button>
        )}

        {!isOnline && (
          <div className="network-pill" role="status" aria-live="polite">
            <Icon name="lock" />
            <span>离线可用</span>
          </div>
        )}

        <ConfirmSheet
          pending={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />

        <BottomNav
          active={view}
          navModules={navModules}
          setView={navigate}
          onQuickCreate={openQuickCreate}
          clearLaunchAction={() => setLaunchAction(null)}
          appearance={settings.appearance}
        />
      </section>
    </main>
  )
}

function Header({
  selectedDate,
  setSelectedDate,
  canGoBack,
  onBack,
}: {
  title: string
  selectedDate: string
  setSelectedDate: (date: string) => void
  stats: { income: number; expense: number; balance: number }
  canGoBack: boolean
  onBack: () => void
}) {
  return (
    <header className="app-header">
      {canGoBack ? (
        <button className="brand-mark brand-return" type="button" onClick={onBack} aria-label="返回上一页">
          <BrandGlyph />
        </button>
      ) : (
        <div className="brand-mark" aria-hidden="true">
          <BrandGlyph />
        </div>
      )}
      <label className="date-chip">
        <span>日期</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </label>
    </header>
  )
}

function TodayView({
  data,
  selectedDate,
  events,
  tasks,
  stats,
  reminders,
  quickPreviewEnabled,
  homeModules,
  setView,
  openQuickCreate,
  quickAdd,
  setHomeModuleSlot,
  toggleTask,
  toggleHabit,
}: {
  data: AppData
  selectedDate: string
  events: EventItem[]
  tasks: TaskItem[]
  stats: { income: number; expense: number; balance: number }
  reminders: string[]
  quickPreviewEnabled: boolean
  homeModules: ModuleKey[]
  setView: (view: ViewKey, options?: { replace?: boolean }) => void
  openQuickCreate: (view: ViewKey) => void
  quickAdd: (text: string, options?: { forceView?: QuickCaptureTarget; ledgerOverride?: Partial<Pick<LedgerItem, 'category' | 'type'>> }) => boolean
  setHomeModuleSlot: (index: number, key: ModuleKey) => void
  toggleTask: (id: string) => void
  toggleHabit: (id: string, date?: string) => void
}) {
  const [quickText, setQuickText] = useState('')
  const [quickLedgerType, setQuickLedgerType] = useState<QuickLedgerType | null>(null)
  const [quickLedgerCategory, setQuickLedgerCategory] = useState<string | null>(null)
  const [quickForcedView, setQuickForcedView] = useState<QuickCaptureTarget | null>(null)
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'calendar' | 'tasks' | 'ledger' | 'timetable'>('all')
  const [replacingHomeSlot, setReplacingHomeSlot] = useState<number | null>(null)
  const quickInputRef = useRef<HTMLInputElement | null>(null)
  const reminderRef = useRef<HTMLElement | null>(null)
  const timelineRef = useRef<HTMLElement | null>(null)
  const courseRef = useRef<HTMLElement | null>(null)
  const habitRef = useRef<HTMLElement | null>(null)
  const taskRef = useRef<HTMLElement | null>(null)
  const todayLedger = data.ledger.filter((item) => item.date === selectedDate)
  const todayCourses = data.courses.filter((course) => course.day === dayIndex(new Date(`${selectedDate}T12:00:00`)))
  const sortedTodayCourses = [...todayCourses].sort((a, b) => (a.start || '').localeCompare(b.start || '') || (a.slot || 1) - (b.slot || 1))
  const todayTimelineItems = [
    ...events.map((event) => ({
      id: `event-${event.id}`,
      time: event.start,
      sort: event.start,
      title: event.title,
      detail: `${event.category} · ${event.end}`,
      kind: 'calendar' as const,
      icon: 'calendar' as IconName,
      tone: 'blue',
      view: 'calendar' as ViewKey,
    })),
    ...sortedTodayCourses.map((course) => ({
      id: `course-${course.id}`,
      time: course.start,
      sort: course.start || `课${String(course.slot || 99).padStart(2, '0')}`,
      title: course.shortTitle ? `${course.shortTitle} · ${course.title}` : course.title,
      detail: [course.place, course.teacher, `${course.start}-${course.end}`].filter(Boolean).join(' · '),
      kind: 'timetable' as const,
      icon: 'book' as IconName,
      tone: 'violet',
      view: 'timetable' as ViewKey,
    })),
    ...tasks
      .filter((task) => !task.done)
      .slice(0, 4)
      .map((task, index) => ({
        id: `task-${task.id}`,
        time: task.due < selectedDate ? '过期' : task.due === selectedDate ? '待办' : '稍后',
        sort: task.due < selectedDate ? `00:${index}` : task.due === selectedDate ? `23:${index}` : `29:${index}`,
        title: task.title,
        detail: `${task.list} · ${task.important ? '重要' : '普通'} / ${task.urgent ? '紧急' : '不急'}`,
        kind: 'tasks' as const,
        icon: 'tasks' as IconName,
        tone: task.due < selectedDate ? 'rose' : 'peach',
        view: 'tasks' as ViewKey,
      })),
    ...todayLedger.slice(0, 3).map((item, index) => ({
      id: `ledger-${item.id}`,
      time: item.type === 'income' ? '收入' : '支出',
      sort: `28:${index}`,
      title: item.title,
      detail: `${item.category} · ${item.type === 'income' ? '+' : '-'}${currency.format(item.amount)}`,
      kind: 'ledger' as const,
      icon: 'ledger' as IconName,
      tone: item.type === 'income' ? 'blue' : 'leaf',
      view: 'ledger' as ViewKey,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort))
  const timelineTabs = [
    { key: 'all' as const, label: '全部', count: todayTimelineItems.length },
    { key: 'calendar' as const, label: '日程', count: todayTimelineItems.filter((item) => item.kind === 'calendar').length },
    { key: 'tasks' as const, label: '待办', count: todayTimelineItems.filter((item) => item.kind === 'tasks').length },
    { key: 'ledger' as const, label: '记账', count: todayTimelineItems.filter((item) => item.kind === 'ledger').length },
    { key: 'timetable' as const, label: '课表', count: todayTimelineItems.filter((item) => item.kind === 'timetable').length },
  ]
  const visibleTimelineItems = timelineFilter === 'all'
    ? todayTimelineItems
    : todayTimelineItems.filter((item) => item.kind === timelineFilter)
  const completedHabits = data.habits.filter((habit) => habit.days.includes(selectedDate)).length
  const habitRate = data.habits.length ? Math.round((completedHabits / data.habits.length) * 100) : 0
  const canSubmitQuick = !!quickText.trim()
  const quickIntent = useMemo(() => previewQuickText(quickText, selectedDate), [quickText, selectedDate])
  const quickLedgerDraft = useMemo(() => parseQuickLedger(quickText, selectedDate), [quickText, selectedDate])
  const quickLedgerTypeValue = quickLedgerType ?? quickLedgerDraft?.type ?? 'expense'
  const quickExpenseCategories = ['餐饮', '交通', '购物', '学习', '娱乐', '健康', '住房', '其他']
  const quickIncomeCategories = ['工资', '兼职', '红包', '奖金', '报销', '退款', '收入']
  const quickLedgerCategories = quickLedgerTypeValue === 'income' ? quickIncomeCategories : quickExpenseCategories
  const quickLedgerCategoryValue = quickLedgerCategory ?? (
    quickLedgerCategories.includes(quickLedgerDraft?.category ?? '') ? quickLedgerDraft?.category : quickLedgerCategories[0]
  )
  const quickCorrectionActions: Array<{ label: string; icon: IconName; view: QuickCaptureTarget }> = [
    { label: '记账', icon: 'ledger', view: 'ledger' },
    { label: '日程', icon: 'calendar', view: 'calendar' },
    { label: '清单', icon: 'tasks', view: 'tasks' },
    { label: '便签', icon: 'notes', view: 'notes' },
  ]
  const quickActiveView = quickForcedView ?? quickIntent?.view ?? 'notes'
  const quickPreview = quickPreviewEnabled
    ? quickIntent
    : quickText.trim()
      ? {
          icon: 'pen' as IconName,
          text: quickIntent ? '将直接记录到对应模块' : '无法识别时会保存为便签',
          tone: quickIntent?.tone,
        }
      : null
  const quickSamples = ['午饭23元', '地铁6元', '明天3点开会', '下周二交作业']
  const todayDigest = [
    events.length ? `${events.length} 个日程` : '',
    tasks.length ? `${tasks.length} 个待办` : '',
    stats.expense ? `支出 ${currency.format(stats.expense)}` : '',
  ].filter(Boolean).join(' · ') || '今天还很清爽'
  const todayExpense = todayLedger.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const budgetRate = data.settings.monthlyBudget > 0 ? Math.min(100, Math.round((stats.expense / data.settings.monthlyBudget) * 100)) : 0
  const openTaskCount = tasks.filter((task) => !task.done).length
  const normalizedHomeModules = normalizeHomeModules(homeModules)
  const homeModuleCards = modules.map((module) => {
    const view = module.key
    const todayEventCount = events.length
    const memo: Record<ModuleKey, { value: string; meta: string; action: string }> = {
      calendar: { value: todayEventCount ? `${todayEventCount} 项` : '空白', meta: todayEventCount ? '今日安排' : '添加一个时间点', action: '加日程' },
      ledger: { value: todayExpense ? currency.format(todayExpense) : '¥0', meta: data.settings.monthlyBudget > 0 ? `预算 ${budgetRate}%` : '今日支出', action: '记一笔' },
      tasks: { value: openTaskCount ? `${openTaskCount} 项` : '清爽', meta: openTaskCount ? '待处理清单' : '没有待办压力', action: '写清单' },
      habits: { value: `${habitRate}%`, meta: data.habits.length ? `${completedHabits}/${data.habits.length} 已完成` : '建立一个习惯', action: '打卡' },
      timetable: { value: todayCourses.length ? `${todayCourses.length} 门` : '无课', meta: todayCourses.length ? '今日课表' : '查看学期表', action: '看课表' },
      matrix: { value: `${data.tasks.length} 项`, meta: '重要紧急分层', action: '排优先级' },
      countdown: { value: `${data.countdowns.length} 个`, meta: '纪念日与考试', action: '看倒数' },
      focus: { value: `${data.focusSessions.filter((session) => session.date === selectedDate).length} 轮`, meta: '番茄专注', action: '开始专注' },
      journal: { value: data.journalEntries.some((entry) => entry.date === selectedDate) ? '已记录' : '未写', meta: '心情与日记', action: '写日记' },
      notes: { value: `${data.notes.length} 条`, meta: '随手想法', action: '写便签' },
      reports: { value: currency.format(stats.balance), meta: '月度复盘', action: '看报告' },
    }
    return { ...module, ...memo[view], view }
  })
  const pinnedHomeCards = normalizedHomeModules
    .map((key) => homeModuleCards.find((card) => card.key === key))
    .filter(Boolean) as Array<(typeof homeModuleCards)[number]>
  const jumpActions = [
    { label: '提醒', icon: 'bell' as IconName, ref: reminderRef },
    { label: '时间线', icon: 'calendar' as IconName, ref: timelineRef },
    { label: '课表', icon: 'book' as IconName, ref: courseRef },
    { label: '打卡', icon: 'habit' as IconName, ref: habitRef },
    { label: '清单', icon: 'tasks' as IconName, ref: taskRef },
  ]

  function submitQuick(event: FormEvent) {
    event.preventDefault()
    if (!quickText.trim()) return
    const ledgerOverride = quickLedgerDraft
      ? { type: quickLedgerTypeValue, category: quickLedgerCategoryValue }
      : undefined
    const ok = quickAdd(quickText, {
      forceView: quickActiveView,
      ledgerOverride,
    })
    if (ok) {
      setQuickText('')
      setQuickLedgerType(null)
      setQuickLedgerCategory(null)
      setQuickForcedView(null)
    }
  }

  function fillQuickSample(sample: string) {
    setQuickText(sample)
    setQuickLedgerType(null)
    setQuickLedgerCategory(null)
    setQuickForcedView(null)
  }

  function jumpTo(ref: RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: data.settings.reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  function openQuickCorrection(view: QuickCaptureTarget) {
    const text = quickText.trim()
    if (!text) {
      openQuickCreate(view)
      return
    }
    setQuickForcedView(view)
    if (view !== 'ledger') {
      setQuickLedgerType(null)
      setQuickLedgerCategory(null)
    }
  }

  return (
    <div className="stack today-page">
      <section className="hero-card">
        <div>
          <span className="eyebrow">今日小结</span>
          <h1>今天稳稳推进</h1>
          <p className="hero-subtitle">{todayDigest}</p>
        </div>
        <div className="daily-score" style={{ '--score': `${habitRate}%` } as CSSProperties}>
          <strong>{habitRate}%</strong>
          <span>打卡</span>
        </div>
        <div className="summary-grid">
          <Metric icon="calendar" label="日程" value={`${events.length} 项`} />
          <Metric icon="tasks" label="待办" value={`${tasks.length} 项`} />
          <Metric icon="ledger" label="支出" value={currency.format(stats.expense)} />
        </div>
      </section>

      <form className="quick-capture" onSubmit={submitQuick}>
        <span aria-hidden="true"><Icon name="pen" /></span>
        <div className="quick-capture-copy">
          <input
            ref={quickInputRef}
            aria-label="快捷记录"
            enterKeyHint="done"
            placeholder="午饭23元 / 周五交作业"
            value={quickText}
            onChange={(event) => {
              setQuickText(event.target.value)
              setQuickLedgerType(null)
              setQuickLedgerCategory(null)
              setQuickForcedView(null)
            }}
          />
        </div>
        <button type="submit" disabled={!canSubmitQuick}>记录</button>
      </form>
      {quickPreview && (
        <div className={quickPreview.tone ? `quick-preview ${quickPreview.tone}` : 'quick-preview'} data-quick-status={quickPreviewEnabled ? 'preview' : 'direct'}>
          <Icon name={quickPreview.icon} />
          <span>{quickPreview.text}</span>
          {quickLedgerDraft && (
            <>
              <div className="quick-type-row" aria-label="记账收支类型">
                {(['expense', 'income'] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={quickLedgerTypeValue === type ? 'active' : ''}
                    onClick={() => {
                      setQuickLedgerType(type)
                      setQuickLedgerCategory(null)
                    }}
                  >
                    {type === 'expense' ? '支出' : '收入'}
                  </button>
                ))}
              </div>
              <div className="quick-category-row" aria-label="记账分类修正">
                {quickLedgerCategories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={quickLedgerCategoryValue === category ? 'active' : ''}
                    onClick={() => setQuickLedgerCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="quick-correction-row" aria-label="快捷记录纠错">
            {quickCorrectionActions.map((action) => (
              <button
                type="button"
                key={action.label}
                className={quickActiveView === action.view ? 'active' : ''}
                aria-pressed={quickActiveView === action.view}
                onClick={() => openQuickCorrection(action.view)}
              >
                <Icon name={action.icon} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="quick-sample-row" aria-label="快捷记录示例">
        {quickSamples.map((sample) => (
          <button type="button" key={sample} onClick={() => fillQuickSample(sample)}>
            {sample}
          </button>
        ))}
      </div>

      <SectionTitle icon="modules" title="常用功能" hint="长按替换" />
      <div className="quick-action-rail home-card-grid" aria-label="首页常用功能">
        {pinnedHomeCards.map((card, index) => (
          <button
            className={`quick-action-chip home-module-card tone-${card.tone}`}
            key={`${card.key}-${index}`}
            style={{ '--tap-index': index } as CSSProperties}
            type="button"
            onClick={() => setView(card.view)}
            onContextMenu={(event) => {
              event.preventDefault()
              setReplacingHomeSlot(index)
            }}
            onPointerDown={(event) => {
              const target = event.currentTarget
              const timeout = window.setTimeout(() => {
                setReplacingHomeSlot(index)
                triggerHaptic('tap')
              }, 520)
              const clear = () => window.clearTimeout(timeout)
              target.addEventListener('pointerup', clear, { once: true })
              target.addEventListener('pointerleave', clear, { once: true })
              target.addEventListener('pointercancel', clear, { once: true })
            }}
          >
            <span><Icon name={card.icon} /></span>
            <strong>{card.title}</strong>
            <small>{card.value} · {card.meta}</small>
          </button>
        ))}
      </div>
      {replacingHomeSlot !== null && (
        <section className="home-module-picker">
          <div>
            <strong>替换第 {replacingHomeSlot + 1} 个首页入口</strong>
            <button type="button" onClick={() => setReplacingHomeSlot(null)}>完成</button>
          </div>
          <div>
            {homeModuleCards.map((card) => (
              <button
                className={normalizedHomeModules[replacingHomeSlot] === card.key ? 'active' : ''}
                type="button"
                key={card.key}
                onClick={() => {
                  setHomeModuleSlot(replacingHomeSlot, card.key)
                  setReplacingHomeSlot(null)
                }}
              >
                <Icon name={card.icon} />
                {card.shortTitle}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="home-jump-card">
        <div>
          <span className="eyebrow">快速查看</span>
          <strong>直接跳到今天的内容</strong>
        </div>
        <div>
          {jumpActions.map((action) => (
            <button type="button" key={action.label} onClick={() => jumpTo(action.ref)}>
              <Icon name={action.icon} />
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <SectionTitle icon="modules" title="全部功能" hint={`${modules.length}`} />
      <div className="today-module-grid" aria-label="全部功能入口">
        {homeModuleCards.map((module, index) => (
          <button
            className={`module-card home-module-card tone-${module.tone}`}
            type="button"
            key={module.key}
            style={{ '--tap-index': index } as CSSProperties}
            onClick={() => setView(module.view)}
          >
            <span className={`module-icon tone-${module.tone}`}><Icon name={module.icon} /></span>
            <span className="module-copy">
              <strong>{module.title}</strong>
              <small>{module.value} · {module.meta}</small>
            </span>
            <span className="module-stat">{module.action}</span>
          </button>
        ))}
      </div>

      <section ref={reminderRef} className="home-anchor-section">
      <SectionTitle icon="bell" title="今日提醒" hint={reminders.length > 1 ? `+${reminders.length - 1}` : undefined} />
      <div className="reminder-list">
        {reminders.slice(0, 1).map((item) => (
          <div className="reminder-item sticker" key={item}>
            <span className="reminder-mark"><Icon name="bell" /></span>
            <p>{item}</p>
            {reminders.length > 1 && <span className="reminder-more">还有 {reminders.length - 1} 条</span>}
          </div>
        ))}
      </div>
      </section>

      <section ref={timelineRef} className="home-anchor-section">
      <SectionTitle icon="calendar" title="今日时间线" hint={todayTimelineItems.length ? `${todayTimelineItems.length}` : undefined} />
      <div className="timeline-filter-tabs" aria-label="今日时间线筛选">
        {timelineTabs.map((tab) => (
          <button
            className={timelineFilter === tab.key ? 'active' : ''}
            type="button"
            key={tab.key}
            onClick={() => setTimelineFilter(tab.key)}
          >
            <span>{tab.label}</span>
            <strong>{tab.count}</strong>
          </button>
        ))}
      </div>
      <div className="timeline today-timeline">
        {visibleTimelineItems.map((item) => (
          <button className={`timeline-item with-action tone-${item.tone}`} key={item.id} type="button" onClick={() => setView(item.view)}>
            <time>{item.time}</time>
            <span className="timeline-kind"><Icon name={item.icon} /></span>
            <div>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          </button>
        ))}
        {!visibleTimelineItems.length && <EmptyState text={todayTimelineItems.length ? '这个筛选里暂时没有内容。' : '今天还没有安排，可以先写下一件最想完成的小事。'} action={todayTimelineItems.length ? '看全部' : '快捷记录'} onAction={() => {
          if (todayTimelineItems.length) {
            setTimelineFilter('all')
          } else {
            setQuickText('明天3点开会')
          }
        }} />}
      </div>
      </section>

      <section ref={courseRef} className="home-anchor-section">
      <SectionTitle icon="book" title="今日课表" hint={todayCourses.length ? `${todayCourses.length}` : undefined} />
      <div className="course-strip">
        {todayCourses.map((course) => (
          <div className={`course-chip ${course.color}`} key={course.id}>
            <strong>{course.title}</strong>
            <span>{course.start}-{course.end} · {course.place}</span>
          </div>
        ))}
        {!todayCourses.length && <EmptyState text="今日没有课程，呼吸一下。" action="打开课表" onAction={() => setView('timetable')} />}
      </div>
      </section>

      <section ref={habitRef} className="home-anchor-section">
      <SectionTitle icon="habit" title="习惯打卡" hint={`${completedHabits}/${data.habits.length}`} />
      <div className="habit-strip">
        <div className="habit-strip-progress" aria-label={`今日习惯完成 ${habitRate}%`}>
          <span style={{ '--progress': habitRate / 100 } as CSSProperties} />
        </div>
        {data.habits.map((habit) => (
          <button
            className={habit.days.includes(selectedDate) ? `habit-pill ${habit.color} active` : `habit-pill ${habit.color}`}
            key={habit.id}
            type="button"
            style={{ '--tap-index': data.habits.indexOf(habit) } as CSSProperties}
            onClick={() => toggleHabit(habit.id, selectedDate)}
          >
            {habit.days.includes(selectedDate) ? '✓ ' : ''}{habit.title}
          </button>
        ))}
        {!data.habits.length && <EmptyState text="还没有习惯，先放一个很容易完成的小目标。" action="添加习惯" onAction={() => setView('habits')} />}
      </div>
      </section>

      <section ref={taskRef} className="home-anchor-section">
      <SectionTitle icon="tasks" title="待办清单" />
      <div className="list">
        {tasks.slice(0, 5).map((task) => (
          <button
            className={task.done ? 'task-row done' : 'task-row'}
            key={task.id}
            type="button"
            onClick={() => toggleTask(task.id)}
          >
            <span className={`check-dot ${task.priority}`} />
            <span>{task.title}</span>
            <small>{task.list}</small>
          </button>
        ))}
        {!tasks.length && <EmptyState text="今天还没有待办，可以先写下一件最重要的小事。" action="添加清单" onAction={() => setView('tasks')} />}
      </div>
      </section>
    </div>
  )
}

function CalendarView({
  selectedDate,
  setSelectedDate,
  autoOpen = false,
  onAutoOpenHandled,
  events,
  allEvents,
  onAdd,
  onUpdate,
  onRemove,
}: {
  selectedDate: string
  setSelectedDate: (date: string) => void
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  events: EventItem[]
  allEvents: EventItem[]
  onAdd: (event: Omit<EventItem, 'id'>) => void
  onUpdate: (event: EventItem) => void
  onRemove: (event: EventItem) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false)
  const [form, setForm] = useState({
    title: '',
    date: selectedDate,
    start: '09:00',
    end: '10:00',
    category: '生活',
    note: '',
  })
  const invalidTimeRange = form.start >= form.end
  const canSubmitEvent = !!form.title.trim() && !invalidTimeRange
  const timeShortcuts = [
    { label: '早上', start: '08:00', end: '09:00' },
    { label: '上午', start: '09:00', end: '10:00' },
    { label: '午后', start: '14:00', end: '15:00' },
    { label: '晚上', start: '19:00', end: '20:00' },
  ]
  const categoryShortcuts = ['生活', '工作', '学习', '健康', '家庭']
  const sortedEvents = [...events].sort((a, b) => a.start.localeCompare(b.start))
  const dayCategories = [...new Set(sortedEvents.map((event) => event.category))].slice(0, 3)
  const firstEvent = sortedEvents[0]
  const lastEvent = sortedEvents.at(-1)
  const busyLabel = sortedEvents.length >= 4 ? '很充实' : sortedEvents.length >= 2 ? '有节奏' : sortedEvents.length === 1 ? '轻安排' : '空出来'
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`)
  const weekStart = addDays(selectedDateObject, 1 - dayIndex(selectedDateObject))
  const calendarDays = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(new Date(`${weekStart}T12:00:00`), offset)
    const dateObject = new Date(`${date}T12:00:00`)
    const label = date === todayIso ? '今天' : weekNames[dayIndex(dateObject) - 1]
    const count = allEvents.filter((event) => event.date === date).length
    return { date, label, day: date.slice(8, 10), month: date.slice(5, 7), count }
  })

  function selectDate(date: string) {
    triggerHaptic('tap')
    setSelectedDate(date)
  }

  useEffect(() => {
    if (!sheetOpen || editingId) return
    setForm((current) => ({ ...current, date: selectedDate }))
  }, [editingId, selectedDate, sheetOpen])

  function resetForm() {
    setEditingId(null)
    setForm({
      title: '',
      date: selectedDate,
      start: '09:00',
      end: '10:00',
      category: '生活',
      note: '',
    })
  }

  function openNew() {
    resetForm()
    setShouldAutoFocus(false)
    setSheetOpen(true)
  }

  useEffect(() => {
    if (!autoOpen) return
    setEditingId(null)
    setForm({
      title: '',
      date: selectedDate,
      start: '09:00',
      end: '10:00',
      category: '生活',
      note: '',
    })
    setShouldAutoFocus(false)
    setSheetOpen(true)
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled, selectedDate])

  function startEdit(event: EventItem) {
    setEditingId(event.id)
    setShouldAutoFocus(false)
    setForm({
      title: event.title,
      date: event.date,
      start: event.start,
      end: event.end,
      category: event.category,
      note: event.note,
    })
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    resetForm()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const title = form.title.trim()
    if (!canSubmitEvent) return
    if (editingId) {
      onUpdate({ ...form, id: editingId, title })
    } else {
      onAdd({ ...form, title })
    }
    closeSheet()
  }

  return (
    <div className="stack calendar-page">
      <button className="action-card" type="button" onClick={openNew}>
        <span className="module-icon tone-blue"><Icon name="calendar" /></span>
        <div>
          <strong>新增日程</strong>
          <small>安排这一天</small>
        </div>
        <Icon name="chevron" />
      </button>

      <div className="calendar-date-strip" aria-label="切换日程日期">
        <button className="calendar-today-button" type="button" onClick={() => selectDate(todayIso)}>
          <Icon name="sun" />
          <span>今天</span>
        </button>
        <label className="calendar-jump-control">
          <Icon name="calendar" />
          <input aria-label="跳转到具体日期" type="date" value={selectedDate} onChange={(event) => selectDate(event.target.value)} />
        </label>
        <div className="calendar-day-rail">
          {calendarDays.map((item) => (
            <button
              className={item.date === selectedDate ? 'active' : ''}
              type="button"
              key={item.date}
              onClick={() => selectDate(item.date)}
              aria-label={`${item.date}，${item.count} 项日程`}
            >
              <small>{item.label}</small>
              <strong>{item.day}</strong>
              <span>{item.count ? `${item.count}项` : item.month}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="calendar-day-brief">
        <div className="calendar-date-card">
          <small>{selectedDate.slice(0, 7)}</small>
          <strong>{selectedDate.slice(8, 10)}</strong>
          <span>{busyLabel}</span>
        </div>
        <div className="calendar-day-copy">
          <span className="eyebrow">今日安排</span>
          <strong>{sortedEvents.length ? `${sortedEvents.length} 件事 · ${firstEvent?.start}-${lastEvent?.end}` : '今天还很清爽'}</strong>
          <div className="calendar-tag-row">
            {(dayCategories.length ? dayCategories : ['可安排']).map((category) => (
              <span key={category}>{category}</span>
            ))}
          </div>
        </div>
      </section>

      <SectionTitle icon="sun" title="这一天" />
      <div className="timeline">
        {sortedEvents.map((event) => (
          <article className="timeline-item with-action" key={event.id} onClick={() => startEdit(event)} role="button" tabIndex={0} onKeyDown={(keyEvent) => {
            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') startEdit(event)
          }}>
            <time>{event.start}</time>
            <div>
              <strong>{event.title}</strong>
              <span>{event.category} · {event.end} {event.note ? `· ${event.note}` : ''}</span>
            </div>
            <button type="button" onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onRemove(event)
            }} aria-label={`删除${event.title}`}>×</button>
          </article>
        ))}
        {!sortedEvents.length && <EmptyState text="这一天还没有安排。" action="添加日程" onAction={openNew} />}
      </div>
      <BottomSheet open={sheetOpen} title={editingId ? '编辑日程' : '新增日程'} hint={form.date} icon="calendar" tone="blue" onClose={closeSheet} autoFocusFirst={shouldAutoFocus} confirmOnDirty>
        <form className="sheet-form" onSubmit={submit}>
          <input aria-label="日程标题" enterKeyHint="next" placeholder="例如：和朋友吃饭" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <div className="shortcut-pills schedule-time-pills" aria-label="常用时间段">
            {timeShortcuts.map((item) => (
              <button
                className={form.start === item.start && form.end === item.end ? 'active' : ''}
                type="button"
                key={item.label}
                onClick={() => setForm({ ...form, start: item.start, end: item.end })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="form-grid three">
            <input aria-label="日期" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <input aria-label="开始时间" type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} />
            <input aria-label="结束时间" type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} />
          </div>
          <div className="shortcut-pills category-pills" aria-label="日程分类快捷选择">
            {categoryShortcuts.map((category) => (
              <button
                className={form.category === category ? 'active' : ''}
                type="button"
                key={category}
                onClick={() => setForm({ ...form, category })}
              >
                {category}
              </button>
            ))}
          </div>
          <input aria-label="日程备注" placeholder="地点 / 需要准备的事" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          <div className="edit-actions">
            <button className="primary-action" type="submit" disabled={!canSubmitEvent}>{editingId ? '保存修改' : '加入日程'}</button>
            {editingId && <button className="soft-action danger" type="button" onClick={() => {
              const current = events.find((event) => event.id === editingId)
              if (current) onRemove(current)
              closeSheet()
            }}>删除</button>}
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}

function LedgerView({
  selectedDate,
  autoOpen = false,
  onAutoOpenHandled,
  query,
  setQuery,
  stats,
  monthlyBudget,
  updateMonthlyBudget,
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  selectedDate: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  query: string
  setQuery: (query: string) => void
  stats: { income: number; expense: number; balance: number; topCategory?: [string, number] }
  monthlyBudget: number
  updateMonthlyBudget: (monthlyBudget: number) => void
  items: LedgerItem[]
  onAdd: (item: Omit<LedgerItem, 'id'>) => void
  onUpdate: (item: LedgerItem) => void
  onRemove: (item: LedgerItem) => void
}) {
  const [quickText, setQuickText] = useState('')
  const quickParsed = useMemo(() => parseQuickLedger(quickText, selectedDate), [quickText, selectedDate])
  const [quickLedgerType, setQuickLedgerType] = useState<QuickLedgerType | null>(null)
  const [quickLedgerCategory, setQuickLedgerCategory] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState(String(monthlyBudget))
  const [showMonthDetails, setShowMonthDetails] = useState(false)
  const quickInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense' as LedgerType,
    category: '餐饮',
    date: selectedDate,
    note: '',
  })
  const budgetRate = monthlyBudget > 0 ? Math.min(100, Math.round((stats.expense / monthlyBudget) * 100)) : 0
  const budgetLeft = monthlyBudget - stats.expense
  const budgetTone = monthlyBudget > 0 && stats.expense > monthlyBudget ? 'danger' : budgetRate >= 80 ? 'warn' : 'calm'
  const budgetMessage = monthlyBudget > 0
    ? budgetLeft >= 0 ? `还可以花 ${currency.format(budgetLeft)}` : `已超出 ${currency.format(Math.abs(budgetLeft))}`
    : '填写预算后会自动提醒进度'
  const amountShortcuts: number[] = []
  const categoryShortcuts = form.type === 'income'
    ? ['收入', '工资', '兼职', '其他']
    : ['餐饮', '交通', '购物', '学习', '娱乐', '其他']
  const categoryOptions = form.type === 'income'
    ? ['收入', '工资', '兼职', '其他']
    : ['餐饮', '交通', '购物', '住房', '健康', '学习', '娱乐', '其他']
  const quickLedgerTypeValue = quickLedgerType ?? quickParsed?.type ?? 'expense'
  const quickCategoryOptions = quickLedgerTypeValue === 'income'
    ? ['收入', '工资', '兼职', '红包', '奖金', '报销', '退款', '其他']
    : ['餐饮', '交通', '购物', '学习', '娱乐', '健康', '住房', '其他']
  const quickParsedCategory = quickParsed?.category
  const quickLedgerCategoryValue: string = quickLedgerCategory ?? (
    quickParsedCategory && quickCategoryOptions.includes(quickParsedCategory) ? quickParsedCategory : quickCategoryOptions[0] ?? '其他'
  )
  const ledgerAmount = Number(form.amount)
  const invalidLedgerAmount = form.amount.trim() !== '' && (!Number.isFinite(ledgerAmount) || ledgerAmount <= 0)
  const canSubmitLedger = Number.isFinite(ledgerAmount) && ledgerAmount > 0
  const todayItems = items.filter((item) => item.date === selectedDate)
  const monthExpenses = items.filter((item) => item.type === 'expense')
  const categoryTotals = categoryOptions
    .map((category) => ({
      category,
      total: monthExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
  const totalExpenseForChart = categoryTotals.reduce((sum, item) => sum + item.total, 0)
  const categoryChart = categoryTotals.slice(0, 5)
  const todayExpense = todayItems.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const todayIncome = todayItems.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const spendDays = new Set(monthExpenses.map((item) => item.date)).size
  const averageSpendDay = spendDays ? Math.round(stats.expense / spendDays) : 0
  const dailyBudgetTarget = monthlyBudget > 0 ? Math.round(monthlyBudget / 30) : 0
  const todayBudgetTone = dailyBudgetTarget > 0 && todayExpense > dailyBudgetTarget ? 'warn' : 'calm'
  const ledgerInsight = categoryChart[0]
    ? `${categoryChart[0].category}占 ${Math.round((categoryChart[0].total / Math.max(1, totalExpenseForChart)) * 100)}%，本月最明显`
    : '先记一笔，拾光会自动整理花销重点'
  const quickLedgerSuggestions = categoryTotals.slice(0, 4).map((item) => item.category)
  const quickBaseChips = quickLedgerTypeValue === 'income'
    ? ['收入', '工资', '兼职', '红包', '奖金', '报销', '退款', '其他']
    : ['餐饮', '交通', '购物', '学习', '健康', '住房', '娱乐', '其他']
  const quickLedgerChips = Array.from(new Set([...quickLedgerSuggestions, ...quickBaseChips]))
    .filter((category) => quickCategoryOptions.includes(category))
    .slice(0, 6)

  useEffect(() => {
    setBudgetDraft(String(monthlyBudget))
  }, [monthlyBudget])

  useEffect(() => {
    if (!sheetOpen || editingId) return
    setForm((current) => ({ ...current, date: selectedDate }))
  }, [editingId, selectedDate, sheetOpen])

  function commitBudget() {
    const nextBudget = Number(budgetDraft)
    if (!Number.isFinite(nextBudget) || nextBudget < 0) {
      setBudgetDraft(String(monthlyBudget))
      return
    }
    updateMonthlyBudget(Math.round(nextBudget))
  }

  function resetForm() {
    setEditingId(null)
    setForm({
      title: '',
      amount: '',
      type: 'expense',
      category: '餐饮',
      date: selectedDate,
      note: '',
    })
  }

  useEffect(() => {
    if (!autoOpen) return
    setEditingId(null)
    setForm({
      title: '',
      amount: '',
      type: 'expense',
      category: '餐饮',
      date: selectedDate,
      note: '',
    })
    setShouldAutoFocus(false)
    setSheetOpen(true)
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled, selectedDate])

  function openNew() {
    resetForm()
    setShouldAutoFocus(false)
    setSheetOpen(true)
  }

  function startEdit(item: LedgerItem) {
    setEditingId(item.id)
    setShouldAutoFocus(false)
    setForm({
      title: item.title,
      amount: String(item.amount),
      type: item.type,
      category: item.category,
      date: item.date,
      note: item.note,
    })
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    resetForm()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmitLedger) return
    const fallbackTitle = form.title.trim() || form.category || (form.type === 'income' ? '收入' : '支出')
    const payload = { ...form, amount: ledgerAmount, title: fallbackTitle }
    if (editingId) {
      onUpdate({ ...payload, id: editingId })
    } else {
      onAdd(payload)
    }
    closeSheet()
  }

  function submitQuick(event: FormEvent) {
    event.preventDefault()
    const parsed = parseQuickLedger(quickText, selectedDate)
    if (!parsed) {
      const fallbackTitle = quickText.trim()
      if (!fallbackTitle) return
      setEditingId(null)
      setForm({
        title: fallbackTitle,
        amount: '',
        type: quickLedgerTypeValue,
        category: quickLedgerCategoryValue,
        date: selectedDate,
        note: '由快捷记账转为手动补全',
      })
      setShouldAutoFocus(false)
      setSheetOpen(true)
      return
    }
    onAdd({ ...parsed, type: quickLedgerTypeValue, category: quickLedgerCategoryValue })
    setQuickText('')
    setQuickLedgerType(null)
    setQuickLedgerCategory(null)
  }

  return (
    <div className="stack ledger-page">
      <div className="ledger-board">
        <Metric icon="ledger" label="支出" value={currency.format(stats.expense)} />
        <Metric icon="income" label="收入" value={currency.format(stats.income)} />
        <Metric icon="balance" label="结余" value={currency.format(stats.balance)} />
      </div>

      <section className={`budget-card ${budgetTone}`} style={{ '--budget-progress': `${budgetRate / 100}` } as CSSProperties}>
        <div>
          <span className="eyebrow">本月预算</span>
          <strong>{monthlyBudget > 0 ? currency.format(monthlyBudget) : '未设置'}</strong>
          <p>{budgetMessage}</p>
        </div>
        <label>
          <span>预算</span>
          <input
            aria-label="本月预算"
            inputMode="decimal"
            value={budgetDraft}
            onChange={(event) => setBudgetDraft(event.target.value)}
            onBlur={commitBudget}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        </label>
        <div className="budget-track" aria-label={`本月预算已使用 ${budgetRate}%`}>
          <span />
        </div>
        <footer>
          <span>已用 {budgetRate}%</span>
          <strong>{stats.topCategory ? `${stats.topCategory[0]}最多` : '暂无主要分类'}</strong>
        </footer>
      </section>

      <section className={`ledger-daily-recap ${todayBudgetTone}`}>
        <div>
          <span className="eyebrow">今日复盘</span>
          <strong>{currency.format(todayExpense)}</strong>
          <p>{todayItems.length ? `今天 ${todayItems.length} 笔，${todayIncome ? `收入 ${currency.format(todayIncome)}，` : ''}${ledgerInsight}` : '今天还没有流水，记录越顺手越容易坚持。'}</p>
        </div>
        <div className="ledger-mini-stats">
          <span>
            <b>{averageSpendDay ? currency.format(averageSpendDay) : '—'}</b>
            <small>有记录日均</small>
          </span>
          <span>
            <b>{dailyBudgetTarget ? currency.format(dailyBudgetTarget) : '—'}</b>
            <small>建议日预算</small>
          </span>
        </div>
      </section>

      <SectionTitle icon="pen" title="快速记账" />
      <form className="quick-capture" onSubmit={submitQuick}>
        <span aria-hidden="true"><Icon name="ledger" /></span>
        <input
          ref={quickInputRef}
          aria-label="快速记账"
          enterKeyHint="done"
          placeholder="午饭23元 / 工资5000"
          value={quickText}
          onChange={(event) => setQuickText(event.target.value)}
        />
        <button type="submit">记录</button>
      </form>
      <div className="quick-type-row ledger-quick-type" aria-label="快速记账收支类型">
        {(['expense', 'income'] as const).map((type) => (
          <button
            type="button"
            key={type}
            className={quickLedgerTypeValue === type ? 'active' : ''}
            onClick={() => {
              setQuickLedgerType(type)
              setQuickLedgerCategory(null)
              quickInputRef.current?.focus()
            }}
          >
            {type === 'expense' ? '支出' : '收入'}
          </button>
        ))}
      </div>
      <div className="ledger-smart-chips" aria-label="常用记账分类">
        {quickLedgerChips.map((category) => (
          <button
            type="button"
            key={category}
            className={quickLedgerCategoryValue === category ? 'active' : ''}
            aria-pressed={quickLedgerCategoryValue === category}
            onClick={() => {
              setQuickLedgerType(quickLedgerTypeValue)
              setQuickLedgerCategory(category)
              quickInputRef.current?.focus()
            }}
          >
            <Icon name="ledger" />
            {category}
          </button>
        ))}
      </div>
      {quickParsed && (
        <div className="quick-ledger-preview">
          <span className="module-icon tone-leaf"><Icon name="ledger" /></span>
          <div>
            <small>将记录为{quickLedgerTypeValue === 'income' ? '收入' : '支出'}</small>
            <strong>{quickParsed.title} · {currency.format(quickParsed.amount)}</strong>
            <em>{quickLedgerCategoryValue} · {quickParsed.date}</em>
          </div>
        </div>
      )}

      <button className="action-card" type="button" onClick={openNew}>
        <span className="module-icon tone-leaf"><Icon name="ledger" /></span>
        <div>
          <strong>手动记一笔</strong>
          <small>细调金额与分类</small>
        </div>
        <Icon name="chevron" />
      </button>

      <SectionTitle icon="ledger" title="今日流水" hint={todayItems.length ? `${todayItems.length} 笔` : '今天'} />
      <div className="list today-ledger-list">
        {todayItems.map((item) => (
          <div className="money-row editable" key={item.id} onClick={() => startEdit(item)} role="button" tabIndex={0} onKeyDown={(keyEvent) => {
            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') startEdit(item)
          }}>
            <div>
              <span>{item.title}</span>
              <small>{item.category} · {item.note || item.date}</small>
            </div>
            <strong className={item.type}>{item.type === 'income' ? '+' : '-'}{currency.format(item.amount)}</strong>
            <button type="button" onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              onRemove(item)
            }} aria-label={`删除${item.title}`}>×</button>
          </div>
        ))}
        {!todayItems.length && <EmptyState text="今天还没有花销。" action="记一笔" onAction={openNew} />}
      </div>

      <SectionTitle icon="reports" title="分类占比" hint={totalExpenseForChart ? currency.format(totalExpenseForChart) : '本月'} />
      <section className="ledger-category-card">
        <div className="ledger-donut" style={{ '--ledger-fill': `${Math.min(100, Math.round(((categoryChart[0]?.total ?? 0) / Math.max(1, totalExpenseForChart)) * 100))}%` } as CSSProperties}>
          <strong>{categoryChart[0]?.category ?? '暂无'}</strong>
          <span>{categoryChart[0] ? `${Math.round((categoryChart[0].total / Math.max(1, totalExpenseForChart)) * 100)}%` : '0%'}</span>
        </div>
        <div className="ledger-category-list">
          {categoryChart.map((item, index) => {
            const rate = Math.round((item.total / Math.max(1, totalExpenseForChart)) * 100)
            return (
              <button type="button" key={item.category} onClick={() => setQuery(item.category)}>
                <i style={{ '--bar-rate': `${rate}%`, '--bar-index': index } as CSSProperties} />
                <span>{item.category}</span>
                <em>{currency.format(item.total)} · {rate}%</em>
              </button>
            )
          })}
          {!categoryChart.length && <p>记一笔后，这里会显示本月主要花销类别。</p>}
        </div>
      </section>

      <SectionTitle icon="balance" title="本月账目" hint={`${items.length}`} />
      <button className="soft-action full-width" type="button" onClick={() => setShowMonthDetails((value) => !value)}>
        {showMonthDetails ? '收起明细' : '查看本月明细'}
      </button>
      {showMonthDetails && (
        <>
          <input className="search-input" aria-label="搜索账目" placeholder="搜索名称、分类、备注" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="list">
            {items.map((item) => (
              <div className="money-row editable" key={item.id} onClick={() => startEdit(item)} role="button" tabIndex={0} onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Enter' || keyEvent.key === ' ') startEdit(item)
              }}>
                <div>
                  <span>{item.title}</span>
                  <small>{item.category} · {item.date}</small>
                </div>
                <strong className={item.type}>{item.type === 'income' ? '+' : '-'}{currency.format(item.amount)}</strong>
                <button type="button" onClick={(clickEvent) => {
                  clickEvent.stopPropagation()
                  onRemove(item)
                }} aria-label={`删除${item.title}`}>×</button>
              </div>
            ))}
            {!items.length && <EmptyState text={query ? '没有匹配的账目。' : '这个月还没有账目。'} action={query ? undefined : '记一笔支出'} onAction={query ? undefined : openNew} />}
          </div>
        </>
      )}
      <BottomSheet open={sheetOpen} title={editingId ? '编辑账目' : '记一笔'} hint={form.type === 'expense' ? '默认支出' : '收入'} icon="ledger" tone="leaf" onClose={closeSheet} autoFocusFirst={shouldAutoFocus} confirmOnDirty>
        <form className="sheet-form" onSubmit={submit}>
          <div className="form-grid">
            <input className="amount-first-input" aria-label="金额" inputMode="decimal" enterKeyHint="done" placeholder="金额" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            <select aria-label="收支类型" value={form.type} onChange={(event) => {
              const type = event.target.value as LedgerType
              setForm({
                ...form,
                type,
                category: type === 'income' ? '收入' : form.category === '收入' ? '餐饮' : form.category,
              })
            }}>
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </div>
          <input aria-label="账目名称" enterKeyHint="next" placeholder={form.type === 'expense' ? '可选：午饭、地铁、奶茶' : '可选：工资、兼职'} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          {form.type === 'expense' && amountShortcuts.length > 0 && (
            <div className="shortcut-pills" aria-label="常用金额">
              {amountShortcuts.map((amount) => (
                <button type="button" key={amount} onClick={() => setForm({ ...form, amount: String(amount) })}>
                  {currency.format(amount)}
                </button>
              ))}
            </div>
          )}
          <div className="shortcut-pills category-pills" aria-label="常用分类">
            {categoryShortcuts.map((category) => (
              <button
                className={form.category === category ? 'active' : ''}
                type="button"
                key={category}
                onClick={() => setForm({ ...form, category })}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="form-grid">
            <select aria-label="账目分类" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {categoryOptions.map((category) => <option key={category}>{category}</option>)}
            </select>
            <input aria-label="账目日期" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </div>
          {invalidLedgerAmount && (
            <div className="form-alert danger">
              <Icon name="bell" />
              <span>金额需要大于 0，支持小数。</span>
            </div>
          )}
          <input aria-label="账目备注" placeholder="备注" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          <div className="edit-actions">
            <button className="primary-action" type="submit" disabled={!canSubmitLedger}>{editingId ? '保存修改' : '保存账目'}</button>
            {editingId && <button className="soft-action danger" type="button" onClick={() => {
              const current = items.find((item) => item.id === editingId)
              if (current) onRemove(current)
              closeSheet()
            }}>删除</button>}
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}

function TasksView({
  selectedDate,
  autoOpen = false,
  onAutoOpenHandled,
  tasks,
  onAdd,
  onUpdate,
  onToggle,
  onRemove,
}: {
  selectedDate: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  tasks: TaskItem[]
  onAdd: (task: Omit<TaskItem, 'id' | 'done'>) => void
  onUpdate: (task: TaskItem) => void
  onToggle: (id: string) => void
  onRemove: (task: TaskItem) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false)
  const [taskFilter, setTaskFilter] = useState<'open' | 'today' | 'important' | 'done'>('open')
  const [form, setForm] = useState({
    title: '',
    due: selectedDate,
    priority: 'medium' as Priority,
    list: '生活',
    important: true,
    urgent: false,
  })

  useEffect(() => {
    if (!sheetOpen || editingId) return
    setForm((current) => ({ ...current, due: selectedDate }))
  }, [editingId, selectedDate, sheetOpen])

  function resetForm() {
    setEditingId(null)
    setForm({
      title: '',
      due: selectedDate,
      priority: 'medium',
      list: '生活',
      important: true,
      urgent: false,
    })
  }

  useEffect(() => {
    if (!autoOpen) return
    setEditingId(null)
    setForm({
      title: '',
      due: selectedDate,
      priority: 'medium',
      list: '生活',
      important: true,
      urgent: false,
    })
    setShouldAutoFocus(false)
    setSheetOpen(true)
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled, selectedDate])

  function openNew() {
    triggerHaptic('tap')
    resetForm()
    setShouldAutoFocus(false)
    setSheetOpen(true)
  }

  function startEdit(task: TaskItem) {
    triggerHaptic('tap')
    setEditingId(task.id)
    setShouldAutoFocus(false)
    setForm({
      title: task.title,
      due: task.due,
      priority: task.priority,
      list: task.list,
      important: task.important,
      urgent: task.urgent,
    })
    setSheetOpen(true)
  }

  function closeSheet(withHaptic = true) {
    if (withHaptic) triggerHaptic('tap')
    setSheetOpen(false)
    resetForm()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return

    if (editingId) {
      const existing = tasks.find((task) => task.id === editingId)
      if (existing) {
        onUpdate({ ...existing, ...form, title })
      }
      closeSheet(false)
      return
    }

    onAdd({ ...form, title })
    closeSheet(false)
  }

  const taskFilters: { key: typeof taskFilter; label: string; count: number }[] = [
    { key: 'open', label: '待办', count: tasks.filter((task) => !task.done).length },
    { key: 'today', label: '今天', count: tasks.filter((task) => !task.done && task.due <= selectedDate).length },
    { key: 'important', label: '重要', count: tasks.filter((task) => !task.done && task.important).length },
    { key: 'done', label: '完成', count: tasks.filter((task) => task.done).length },
  ]
  const filteredTasks = tasks
    .filter((task) => {
      if (taskFilter === 'done') return task.done
      if (taskFilter === 'today') return task.due <= selectedDate
      if (taskFilter === 'important') return task.important
      return true
    })
    .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due))
  const taskFilterLabel = taskFilters.find((item) => item.key === taskFilter)?.label ?? '待办'
  const overdueCount = tasks.filter((task) => !task.done && task.due < selectedDate).length
  const todayCount = tasks.filter((task) => !task.done && task.due === selectedDate).length

  function taskDueLabel(task: TaskItem) {
    if (task.done) return '已完成'
    if (task.due < selectedDate) return '已过期'
    if (task.due === selectedDate) return '今天'
    return task.due
  }

  return (
    <div className="stack tasks-page">
      <button className="action-card" type="button" onClick={openNew}>
        <span className="module-icon tone-peach"><Icon name="tasks" /></span>
        <div>
          <strong>新增清单</strong>
          <small>轻点事项可编辑</small>
        </div>
        <Icon name="chevron" />
      </button>

      <div className="task-filter-tabs" aria-label="清单筛选">
        {taskFilters.map((item) => (
          <button
            className={taskFilter === item.key ? 'active' : ''}
            type="button"
            key={item.key}
            onClick={() => setTaskFilter(item.key)}
          >
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>

      {(overdueCount > 0 || todayCount > 0) && (
        <div className="task-day-strip" aria-label="今日清单状态">
          {overdueCount > 0 && <span className="danger"><Icon name="bell" />过期 {overdueCount}</span>}
          {todayCount > 0 && <span><Icon name="calendar" />今天 {todayCount}</span>}
        </div>
      )}

      <SectionTitle icon="tasks" title={`${taskFilterLabel}清单`} hint={`${filteredTasks.length}`} />
      <div className="list">
        {filteredTasks.map((task) => (
          <div
            className={`${task.done ? 'task-row done' : 'task-row'} ${!task.done && task.due < selectedDate ? 'overdue' : ''}`}
            key={task.id}
            onClick={() => startEdit(task)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'Enter' || keyEvent.key === ' ') startEdit(task)
            }}
            role="button"
            tabIndex={0}
          >
            <button type="button" onClick={(event) => {
              event.stopPropagation()
              onToggle(task.id)
            }} aria-label={`切换${task.title}`}>
              <span className={`check-dot ${task.priority}`} />
            </button>
            <div>
              <span>{task.title}</span>
              <small>{task.list} · {taskDueLabel(task)} · {task.important ? '重要' : '普通'} / {task.urgent ? '紧急' : '不急'}</small>
            </div>
            <button className="row-edit-button" type="button" onClick={(event) => {
              event.stopPropagation()
              startEdit(task)
            }} aria-label={`编辑${task.title}`}>
              <Icon name="pen" />
            </button>
          </div>
        ))}
        {!filteredTasks.length && <EmptyState text={taskFilter === 'done' ? '还没有完成记录，先完成一个小任务。' : '这个分类暂时是空的。'} action="添加清单" onAction={openNew} />}
      </div>
      <TaskEditorSheet
        open={sheetOpen}
        title={editingId ? '编辑清单' : '新增清单'}
        hint={taskToQuadrantLabel(form)}
        form={form}
        setForm={setForm}
        autoFocusFirst={shouldAutoFocus}
        onSubmit={submit}
        onClose={closeSheet}
        onDelete={editingId ? () => {
          const current = tasks.find((task) => task.id === editingId)
          if (current) onRemove(current)
          closeSheet()
        } : undefined}
      />
    </div>
  )
}

function TaskEditorSheet({
  open,
  title,
  hint,
  form,
  setForm,
  autoFocusFirst = false,
  onSubmit,
  onClose,
  onDelete,
}: {
  open: boolean
  title: string
  hint?: string
  form: TaskDraft
  setForm: (next: TaskDraft) => void
  autoFocusFirst?: boolean
  onSubmit: (event: FormEvent) => void
  onClose: () => void
  onDelete?: () => void
}) {
  const quadrants: { key: Quadrant; title: string; icon: IconName; tone: string }[] = [
    { key: 'urgentImportant', title: '重要紧急', icon: 'sparkles', tone: 'peach' },
    { key: 'important', title: '重要不急', icon: 'calendar', tone: 'leaf' },
    { key: 'urgent', title: '紧急不重要', icon: 'bell', tone: 'amber' },
    { key: 'later', title: '不急不重要', icon: 'dark', tone: 'violet' },
  ]
  const dueShortcuts = [
    { label: '今天', value: todayIso },
    { label: '明天', value: addDays(today, 1) },
    { label: '本周', value: addDays(today, Math.max(0, 7 - dayIndex(today))) },
    { label: '下周', value: addDays(today, 7) },
  ]
  const listShortcuts = ['生活', '学习', '工作', '事务']
  const priorityShortcuts: { label: string; value: Priority }[] = [
    { label: '低', value: 'low' },
    { label: '中', value: 'medium' },
    { label: '高', value: 'high' },
  ]
  const canSubmitTask = !!form.title.trim()

  return (
    <BottomSheet open={open} title={title} hint={hint} icon="tasks" tone="peach" onClose={onClose} autoFocusFirst={autoFocusFirst} confirmOnDirty>
      <form className="sheet-form" onSubmit={onSubmit}>
        <input aria-label="任务标题" enterKeyHint="done" placeholder="例如：预约体检" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <div className="shortcut-pills" aria-label="截止日期快捷选择">
          {dueShortcuts.map((item) => (
            <button
              className={form.due === item.value ? 'active' : ''}
              type="button"
              key={item.label}
              onClick={() => setForm({ ...form, due: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="shortcut-pills category-pills" aria-label="清单分类快捷选择">
          {listShortcuts.map((item) => (
            <button
              className={form.list === item ? 'active' : ''}
              type="button"
              key={item}
              onClick={() => setForm({ ...form, list: item })}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="shortcut-pills priority-pills" aria-label="优先级快捷选择">
          {priorityShortcuts.map((item) => (
            <button
              className={form.priority === item.value ? `active ${item.value}` : item.value}
              type="button"
              key={item.value}
              onClick={() => setForm({ ...form, priority: item.value })}
            >
              {item.label}优先级
            </button>
          ))}
        </div>
        <div className="form-grid three">
          <input aria-label="截止日期" type="date" value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} />
          <select aria-label="优先级" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
          <select aria-label="清单分类" value={form.list} onChange={(event) => setForm({ ...form, list: event.target.value })}>
            <option>生活</option>
            <option>工作</option>
            <option>学习</option>
            <option>事务</option>
            <option>四象限</option>
          </select>
        </div>
        <div className="matrix-mode task-quadrants" aria-label="四象限">
          {quadrants.map((quadrant) => {
            const flags = quadrantToFlags(quadrant.key)
            const active = form.important === flags.important && form.urgent === flags.urgent
            return (
              <button
                className={active ? `active tone-${quadrant.tone}` : `tone-${quadrant.tone}`}
                type="button"
                key={quadrant.key}
                onClick={() => setForm({ ...form, ...flags, priority: flags.important && flags.urgent ? 'high' : flags.important || flags.urgent ? 'medium' : 'low' })}
              >
                <Icon name={quadrant.icon} />
                {quadrant.title}
              </button>
            )
          })}
        </div>
        <div className="edit-actions">
          <button className="primary-action" type="submit" disabled={!canSubmitTask}>保存</button>
          {onDelete && <button className="soft-action danger" type="button" onClick={onDelete}>删除</button>}
        </div>
      </form>
    </BottomSheet>
  )
}

function HabitsView({
  habits,
  selectedDate,
  onAdd,
  onUpdate,
  onToggle,
  onRemove,
}: {
  habits: HabitItem[]
  selectedDate: string
  onAdd: (title: string, color?: string) => void
  onUpdate: (habit: HabitItem) => void
  onToggle: (id: string, date?: string) => void
  onRemove: (habit: HabitItem) => void
}) {
  const habitSuggestions = ['喝水', '阅读', '背单词', '早睡', '运动', '整理书桌']
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', color: 'mint' })
  const week = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const todayDone = habits.filter((habit) => habit.days.includes(selectedDate)).length
  const habitRate = habits.length ? Math.round((todayDone / habits.length) * 100) : 0
  const canSubmitHabit = !!form.title.trim()
  const editingHabit = editingId ? habits.find((habit) => habit.id === editingId) : undefined

  function openNewHabit() {
    setEditingId(null)
    setForm({ title: '', color: 'mint' })
    setSheetOpen(true)
  }

  function openEditHabit(habit: HabitItem) {
    setEditingId(habit.id)
    setForm({ title: habit.title, color: habit.color || 'mint' })
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingId(null)
    setForm({ title: '', color: 'mint' })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return
    if (editingHabit) {
      onUpdate({ ...editingHabit, title, color: form.color })
    } else {
      onAdd(title, form.color)
    }
    closeSheet()
  }

  return (
    <div className="stack habits-page">
      <section className="habit-summary-card">
        <div className="daily-score" style={{ '--score': `${habitRate}%` } as CSSProperties}>
          <strong>{habitRate}%</strong>
          <span>今日</span>
        </div>
        <div>
          <span className="eyebrow">今日习惯</span>
          <strong>{todayDone}/{habits.length} 已完成</strong>
          <p>{habitRate >= 100 ? '今天已经全完成。' : `还差 ${Math.max(0, habits.length - todayDone)} 项。`}</p>
        </div>
      </section>

      <button className="action-card habit-add-card" type="button" onClick={openNewHabit}>
        <span className="module-icon tone-violet"><Icon name="habit" /></span>
        <div>
          <strong>添加习惯</strong>
          <small>从一件小事开始</small>
        </div>
        <Icon name="chevron" />
      </button>

      <SectionTitle icon="check" title="本周打卡" />
      <div className="habit-board">
        <div className="week-head">
          <span />
          {week.map((day) => <strong key={day.iso}>{day.label}</strong>)}
          <strong>率</strong>
          <span />
        </div>
        {habits.map((habit) => {
          const weekDone = week.filter((day) => habit.days.includes(day.iso)).length
          const weekRate = Math.round((weekDone / week.length) * 100)
          return (
            <div className="habit-grid-row" key={habit.id} style={{ '--habit-progress': `${weekRate}%` } as CSSProperties}>
              <button className="habit-name" type="button" onClick={() => openEditHabit(habit)}>
                <span className={`habit-color ${habit.color}`} />
                <strong>{habit.title}</strong>
              </button>
              {week.map((day, index) => {
                const checked = habit.days.includes(day.iso)
                return (
                  <button
                    className={checked ? 'day-dot active' : 'day-dot'}
                    key={day.iso}
                    type="button"
                    aria-label={`${habit.title} ${day.iso}`}
                    aria-pressed={checked}
                    style={{ '--tap-index': index } as CSSProperties}
                    onClick={() => onToggle(habit.id, day.iso)}
                  />
                )
              })}
              <span className="habit-week-rate" style={{ '--habit-week-rate': `${weekRate}%` } as CSSProperties}>
                <strong>{weekRate}%</strong>
                <i><b /></i>
              </span>
              <button className="tiny-delete" type="button" onClick={() => onRemove(habit)} aria-label={`删除${habit.title}`}>×</button>
            </div>
          )
        })}
        {!habits.length && (
          <EmptyState text="还没有打卡习惯，先挑一件轻松的小事。" action="添加第一个习惯" onAction={openNewHabit} />
        )}
      </div>

      <BottomSheet open={sheetOpen} title={editingHabit ? '编辑习惯' : '新增习惯'} hint={editingHabit ? '改成更适合现在的节奏' : '轻一点，更容易坚持'} icon="habit" tone="violet" onClose={closeSheet}>
        <form className="sheet-form habit-sheet-form" onSubmit={submit}>
          <div className="habit-suggestion-grid">
            {habitSuggestions.map((item) => (
              <button
                className={form.title === item ? 'active' : ''}
                type="button"
                key={item}
                onClick={() => setForm({ ...form, title: item })}
              >
                {item}
              </button>
            ))}
          </div>
          <input aria-label="习惯名称" enterKeyHint="done" placeholder="例如：早睡、背单词" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <div className="segmented habit-color-picker">
            {['mint', 'rose', 'amber', 'blue'].map((color) => (
              <button className={form.color === color ? `active ${color}` : color} type="button" key={color} onClick={() => setForm({ ...form, color })} aria-label={`习惯颜色${color}`} />
            ))}
          </div>
          <div className="edit-actions">
            <button className="primary-action" type="submit" disabled={!canSubmitHabit}>{editingHabit ? '保存习惯' : '加入打卡'}</button>
            {editingHabit && <button className="soft-action danger" type="button" onClick={() => {
              onRemove(editingHabit)
              closeSheet()
            }}>删除</button>}
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}

function TimetableView({
  courses,
  slots,
  profiles,
  semesters,
  selectedDate,
  autoOpen = false,
  onAutoOpenHandled,
  onAdd,
  onUpdate,
  onUpdateSlots,
  onUpdateProfiles,
  onUpdateSemesters,
  onRemove,
}: {
  courses: CourseItem[]
  slots: TimetableSlot[]
  profiles: TimetableProfile[]
  semesters: SemesterConfig[]
  selectedDate: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  onAdd: (course: Omit<CourseItem, 'id'>) => void
  onUpdate: (course: CourseItem) => void
  onUpdateSlots: (slots: TimetableSlot[]) => void
  onUpdateProfiles: (profiles: TimetableProfile[]) => void
  onUpdateSemesters: (semesters: SemesterConfig[]) => void
  onRemove: (course: CourseItem) => void
}) {
  const normalizedProfiles = profiles.length ? profiles : normalizeTimetableProfiles([], slots)
  const selectedDay = dayIndex(new Date(`${selectedDate}T12:00:00`))
  const fallbackSemesterCode = getSemesterCode(selectedDate)
  const semesterOptions = useMemo(
    () =>
      Array.from(new Set([fallbackSemesterCode, ...semesters.map((semester) => semester.code), ...courses.map((course) => course.semester || fallbackSemesterCode)]))
        .sort((a, b) => b.localeCompare(a)),
    [courses, fallbackSemesterCode, semesters],
  )
  const [semesterCode, setSemesterCode] = useState(fallbackSemesterCode)
  const semesterConfig = semesters.find((semester) => semester.code === semesterCode) ?? normalizeSemesters([], normalizedProfiles, courses).find((semester) => semester.code === semesterCode) ?? defaultSemesters[0]
  const activeProfile = normalizedProfiles.find((profile) => profile.id === semesterConfig.profileId) ?? normalizedProfiles[0]
  const activeSlots = activeProfile?.slots.length ? activeProfile.slots : (slots.length ? slots : defaultTimetableSlots)
  const resolveSlot = useCallback((slotIndex: number) =>
    activeSlots.find((slot) => slot.index === slotIndex) ?? activeSlots[0] ?? defaultTimetableSlots[0],
  [activeSlots])
  const configuredVisibleDays = semesterConfig.visibleDays.length ? semesterConfig.visibleDays : (activeProfile?.showWeekend ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5])
  const visibleDays = [...new Set([...configuredVisibleDays, selectedDay])].sort((a, b) => a - b)
  const visibleWeekNames = weekNames.map((name, index) => ({ name, day: index + 1 })).filter((item) => visibleDays.includes(item.day))
  const currentWeek = getSemesterWeek(selectedDate, semesterConfig)
  const safeStartWeek = Math.min(currentWeek, semesterConfig.totalWeeks)
  const safeEndWeek = Math.max(safeStartWeek, semesterConfig.totalWeeks)
  const semesterCourses = courses.filter((course) => course.semester === semesterCode)
  const courseMemory = Array.from(new Map(courses.map((course) => [`${course.title}-${course.teacher}-${course.place}`, course])).values())
    .sort((a, b) => (b.semester || '').localeCompare(a.semester || ''))
  const activeCourses = courses
    .filter((course) => course.semester === semesterCode)
    .filter((course) => courseIsActiveInWeek(course, currentWeek))
  const semesterOccupiedMap = useMemo(() => {
    const map = new Map<string, CourseItem[]>()
    semesterCourses.forEach((course) => {
      occupiedSlotsForCourse(course, activeSlots).forEach((slotIndex) => {
        const key = `${course.day}-${slotIndex}`
        const current = map.get(key) ?? []
        current.push(course)
        map.set(key, current.sort((a, b) => (a.startWeek || 1) - (b.startWeek || 1)))
      })
    })
    return map
  }, [activeSlots, semesterCourses])
  const weekOccupiedMap = useMemo(() => {
    const map = new Map<string, CourseItem[]>()
    activeCourses.forEach((course) => {
      occupiedSlotsForCourse(course, activeSlots).forEach((slotIndex) => {
        const key = `${course.day}-${slotIndex}`
        const current = map.get(key) ?? []
        current.push(course)
        map.set(key, current.sort((a, b) => (a.slot || 1) - (b.slot || 1)))
      })
    })
    return map
  }, [activeCourses, activeSlots])
  const todayCourses = activeCourses
    .filter((course) => course.day === selectedDay)
    .sort((a, b) => (a.slot || 1) - (b.slot || 1))
  const nextCourse = todayCourses[0]
  const activeSlotCount = activeCourses.reduce((sum, course) => sum + Math.max(1, course.slotSpan || 1), 0)
  const todaySlotCount = todayCourses.reduce((sum, course) => sum + Math.max(1, course.slotSpan || 1), 0)
  const suggestedEmptySlots = activeSlots
    .filter((slot) => !semesterCourses.some((course) =>
      course.day === selectedDay &&
      occupiedSlotsForCourse(course, activeSlots).includes(slot.index) &&
      weekSetsOverlap(getCourseWeeks(course), buildWeekList(safeStartWeek, safeEndWeek, 'all')),
    ))
    .slice(0, 4)
  const suggestedNextSlot = suggestedEmptySlots[0]?.index ?? nextEmptySlot(semesterCourses, selectedDay, activeSlots, safeStartWeek, safeEndWeek)
  const [mode, setMode] = useState<'today' | 'week' | 'semester'>('today')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [timeSheetOpen, setTimeSheetOpen] = useState(false)
  const semesterTableRef = useRef<HTMLDivElement | null>(null)
  const [slotDraft, setSlotDraft] = useState<TimetableSlot[]>(() => activeSlots.map((slot) => ({ ...slot })))
  const [form, setForm] = useState({
    title: '',
    shortTitle: '',
    semester: semesterCode,
    day: selectedDay,
    slot: nextEmptySlot(semesterCourses, selectedDay, activeSlots, safeStartWeek, safeEndWeek),
    slotSpan: 1,
    start: '09:00',
    end: '10:30',
    startWeek: safeStartWeek,
    endWeek: safeEndWeek,
    weekRule: 'all' as WeekRule,
    weeks: buildWeekList(safeStartWeek, safeEndWeek, 'all'),
    customTime: false,
    place: '',
    teacher: '',
    color: 'blue',
  })
  const formSlotPosition = Math.max(0, activeSlots.findIndex((slot) => slot.index === form.slot))
  const maxFormSlotSpan = Math.max(1, activeSlots.length - formSlotPosition)
  const formSlotSpan = Math.min(Math.max(1, form.slotSpan || 1), maxFormSlotSpan)
  const formTime = getCourseSlotTime(form.slot, formSlotSpan, activeSlots)
  const formOccupiedSlots = new Set(
    activeSlots
      .slice(formSlotPosition, formSlotPosition + formSlotSpan)
      .map((slot) => slot.index),
  )
  const memoryQuery = formTitleKey(form.title)
  const filteredCourseMemory = courseMemory
    .filter((course) => {
      if (!memoryQuery) return course.semester === semesterCode
      return [course.title, course.shortTitle, course.teacher, course.place]
        .filter(Boolean)
        .some((value) => formTitleKey(value).includes(memoryQuery))
    })
    .slice(0, 8)
  const weekShortcuts = [
    { label: '全学期', start: 1, end: semesterConfig.totalWeeks },
    { label: '本周起', start: safeStartWeek, end: safeEndWeek },
    { label: '前半学期', start: 1, end: Math.ceil(semesterConfig.totalWeeks / 2) },
    { label: '后半学期', start: Math.ceil(semesterConfig.totalWeeks / 2) + 1, end: semesterConfig.totalWeeks },
  ]
  const formStartWeek = Math.min(form.startWeek, form.endWeek)
  const formEndWeek = Math.max(form.startWeek, form.endWeek)
  const conflictingCourse = courses.find((course) => {
    if (editingId && course.id === editingId) return false
    if ((course.semester || fallbackSemesterCode) !== form.semester) return false
    if (course.day !== form.day) return false
    if (!occupiedSlotsForCourse(course, activeSlots).some((slotIndex) => formOccupiedSlots.has(slotIndex))) return false
    return weekSetsOverlap(getCourseWeeks(course), buildWeekList(formStartWeek, formEndWeek, form.weekRule))
  })
  const canSubmitCourse = !!form.title.trim() && !conflictingCourse

  useEffect(() => {
    if (semesterOptions.includes(semesterCode)) return
    setSemesterCode(fallbackSemesterCode)
  }, [fallbackSemesterCode, semesterCode, semesterOptions])

  useEffect(() => {
    if (timeSheetOpen) return
    setSlotDraft(activeSlots.map((slot) => ({ ...slot })))
  }, [activeSlots, timeSheetOpen])

  useEffect(() => {
    if (mode !== 'semester') return
    const timeout = window.setTimeout(() => {
      const table = semesterTableRef.current
      const todayHead = table?.querySelector<HTMLElement>(`[data-semester-day="${selectedDay}"]`)
      if (!table || !todayHead) return
      table.scrollLeft = Math.max(0, todayHead.offsetLeft - table.clientWidth / 2 + todayHead.clientWidth / 2)
    }, 80)
    return () => window.clearTimeout(timeout)
  }, [mode, selectedDay])

  const invalidSlotIndex = slotDraft.findIndex((slot, index) => {
    if (slot.start >= slot.end) return true
    if (index === 0) return false
    return slot.start < slotDraft[index - 1].end
  })
  const canSaveSlots = slotDraft.length > 0 && invalidSlotIndex === -1
  const activeSlotPresetKey = timetableSlotPresets.find((preset) =>
    preset.slots.length === slotDraft.length &&
    preset.slots.every((slot, index) =>
      slot.start === slotDraft[index]?.start && slot.end === slotDraft[index]?.end,
    ),
  )?.key

  function resetForm(day = selectedDay, slot = nextEmptySlot(semesterCourses, selectedDay, activeSlots, safeStartWeek, safeEndWeek)) {
    const time = resolveSlot(slot)
    setEditingId(null)
    setForm({
      title: '',
      shortTitle: '',
      semester: semesterCode,
      day,
      slot,
      slotSpan: 1,
      start: time.start,
      end: time.end,
      startWeek: safeStartWeek,
      endWeek: safeEndWeek,
      weekRule: 'all',
      weeks: buildWeekList(safeStartWeek, safeEndWeek, 'all'),
      customTime: false,
      place: '',
      teacher: '',
      color: 'blue',
    })
  }

  useEffect(() => {
    if (!autoOpen) return
    const slot = suggestedNextSlot
    const time = resolveSlot(slot)
    setEditingId(null)
    setForm({
      title: '',
      shortTitle: '',
      semester: semesterCode,
      day: selectedDay,
      slot,
      slotSpan: 1,
      start: time.start,
      end: time.end,
      startWeek: safeStartWeek,
      endWeek: safeEndWeek,
      weekRule: 'all',
      weeks: buildWeekList(safeStartWeek, safeEndWeek, 'all'),
      customTime: false,
      place: '',
      teacher: '',
      color: 'blue',
    })
    setMode('week')
    setSheetOpen(true)
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled, resolveSlot, safeEndWeek, safeStartWeek, selectedDay, semesterCode, suggestedNextSlot])

  function closeSheet() {
    setSheetOpen(false)
    resetForm()
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!form.title.trim() || conflictingCourse) return
    const payload = {
      ...form,
      slotSpan: formSlotSpan,
      title: form.title.trim(),
      shortTitle: form.shortTitle.trim() || getCourseShortTitle(form.title),
      start: formTime.start,
      end: formTime.end,
      startWeek: Math.min(form.startWeek, form.endWeek),
      endWeek: Math.max(form.startWeek, form.endWeek),
      weekRule: form.weekRule,
      weeks: buildWeekList(formStartWeek, formEndWeek, form.weekRule),
      customTime: form.customTime,
      place: form.place.trim(),
      teacher: form.teacher.trim(),
    }

    if (editingId) {
      onUpdate({ ...payload, id: editingId })
    } else {
      onAdd(payload)
    }
    closeSheet()
  }

  function editCourse(course: CourseItem) {
    const slotIndex = course.slot || getSlotFromTime(course.start, activeSlots)
    const slotPosition = Math.max(0, activeSlots.findIndex((slot) => slot.index === slotIndex))
    const slotSpan = Math.min(Math.max(1, course.slotSpan || 1), Math.max(1, activeSlots.length - slotPosition))
    const time = getCourseSlotTime(slotIndex, slotSpan, activeSlots)
    setEditingId(course.id)
    setForm({
      title: course.title,
      shortTitle: course.shortTitle || getCourseShortTitle(course.title),
      semester: course.semester || semesterCode,
      day: course.day,
      slot: slotIndex,
      slotSpan,
      start: time.start,
      end: time.end,
      startWeek: course.startWeek || 1,
      endWeek: course.endWeek || 18,
      weekRule: course.weekRule || 'all',
      weeks: getCourseWeeks(course),
      customTime: Boolean(course.customTime),
      place: course.place,
      teacher: course.teacher,
      color: course.color,
    })
    setSheetOpen(true)
  }

  function pickMemory(course: CourseItem) {
    const slot = form.slot || course.slot || getSlotFromTime(course.start, activeSlots)
    const slotSpan = formSlotSpan
    const time = getCourseSlotTime(slot, slotSpan, activeSlots)
    setForm({
      ...form,
      title: course.title,
      shortTitle: course.shortTitle || getCourseShortTitle(course.title),
      semester: semesterCode,
      slot,
      slotSpan,
      start: time.start,
      end: time.end,
      weekRule: course.weekRule || form.weekRule,
      weeks: getCourseWeeks(course),
      customTime: Boolean(course.customTime),
      place: course.place,
      teacher: course.teacher,
      color: course.color,
    })
  }

  function openEmptyCell(day: number, slot: number) {
    const time = resolveSlot(slot)
    setEditingId(null)
    setForm({
      ...form,
      title: '',
      shortTitle: '',
      semester: semesterCode,
      day,
      slot,
      slotSpan: 1,
      start: time.start,
      end: time.end,
      startWeek: safeStartWeek,
      endWeek: safeEndWeek,
      weekRule: 'all',
      weeks: buildWeekList(safeStartWeek, safeEndWeek, 'all'),
      customTime: false,
      place: '',
      teacher: '',
    })
    setSheetOpen(true)
  }

  function openTimeSettings() {
    triggerHaptic('tap')
    setSlotDraft(activeSlots.map((slot) => ({ ...slot })))
    setTimeSheetOpen(true)
  }

  function applySlotPreset(preset: (typeof timetableSlotPresets)[number]) {
    triggerHaptic('tap')
    setSlotDraft(preset.slots.map((slot) => ({ ...slot })))
  }

  function updateSlotDraft(index: number, key: 'start' | 'end', value: string) {
    setSlotDraft((current) => current.map((slot) => (slot.index === index ? { ...slot, [key]: value } : slot)))
  }

  function addSlotDraft() {
    setSlotDraft((current) => {
      const last = current.at(-1)
      const startMinutes = (timeToMinutes(last?.end) ?? 20 * 60) + 10
      const endMinutes = startMinutes + 45
      return [
        ...current,
        {
          index: current.length + 1,
          label: `${current.length + 1}`,
          group: last?.group ?? 'custom',
          start: minutesToTime(startMinutes),
          end: minutesToTime(endMinutes),
        },
      ]
    })
  }

  function removeSlotDraft(index: number) {
    setSlotDraft((current) => current.filter((slot) => slot.index !== index).map((slot, slotIndex) => ({
      ...slot,
      index: slotIndex + 1,
      label: slot.label || `${slotIndex + 1}`,
    })))
  }

  function switchSemesterProfile(profileId: string) {
    const nextSemesters = semesters.map((semester) =>
      semester.code === semesterCode ? { ...semester, profileId } : semester,
    )
    onUpdateSemesters(nextSemesters)
  }

  function saveTimeSettings() {
    if (!canSaveSlots) return
    const nextSlots = normalizeTimetableSlots(slotDraft)
    onUpdateProfiles(normalizedProfiles.map((profile) =>
      profile.id === activeProfile.id ? { ...profile, slots: nextSlots } : profile,
    ))
    onUpdateSlots(nextSlots)
    setTimeSheetOpen(false)
  }

  return (
    <div className="stack timetable-page">
      <section className="timetable-hero">
        <span className="module-icon tone-blue"><Icon name="book" /></span>
        <div>
          <div className="timetable-hero-head">
            <small>{semesterCode} · 第 {currentWeek} 周 · {weekNames[selectedDay - 1]}</small>
            <div className="timetable-hero-actions">
              <label className="semester-select">
                <span>学期</span>
                <select value={semesterCode} onChange={(event) => setSemesterCode(event.target.value)} aria-label="选择学期">
                  {semesterOptions.map((semester) => <option value={semester} key={semester}>{semester}</option>)}
                </select>
              </label>
              <button className="timetable-time-button" type="button" onClick={openTimeSettings}>
                <Icon name="settings" />
                <span>{activeProfile?.name ?? '作息'}</span>
              </button>
            </div>
          </div>
          <strong>{nextCourse ? `${nextCourse.shortTitle || nextCourse.title} · 第 ${formatSlotRange(nextCourse.slot || getSlotFromTime(nextCourse.start, activeSlots), nextCourse.slotSpan || 1)} 节` : '今天没有课程'}</strong>
          <p>{nextCourse ? [nextCourse.title, nextCourse.place, nextCourse.teacher].filter(Boolean).join(' · ') : '点表格空白处就能添加课程。'}</p>
          <div className="timetable-stats">
            <span><b>{semesterCourses.length} 门</b><small>本学期</small></span>
            <span><b>{activeSlotCount} 小节</b><small>本周</small></span>
            <span><b>{todaySlotCount} 小节</b><small>今日</small></span>
          </div>
        </div>
      </section>

      <div className="segmented timetable-tabs">
        <button className={mode === 'today' ? 'active' : ''} type="button" onClick={() => setMode('today')}>今日</button>
        <button className={mode === 'week' ? 'active' : ''} type="button" onClick={() => setMode('week')}>本周</button>
        <button className={mode === 'semester' ? 'active' : ''} type="button" onClick={() => setMode('semester')}>学期表</button>
      </div>

      {mode === 'today' && (
        <section className="course-day-panel">
          <SectionTitle icon="sun" title="今日课程" hint={`${todayCourses.length} 门 · ${todaySlotCount} 小节`} />
          <div className="day-course-list">
            {todayCourses.map((course) => {
              const slotIndex = course.slot || getSlotFromTime(course.start, activeSlots)
              const slotSpan = course.slotSpan || 1
              const time = getCourseSlotTime(slotIndex, slotSpan, activeSlots)
              return (
                <button className={`day-course-card ${course.color}`} type="button" key={course.id} onClick={() => editCourse(course)}>
                  <span className="day-course-time">
                    <strong>{formatSlotRange(slotIndex, slotSpan)}</strong>
                    <small>{time.start}<br />{time.end}</small>
                  </span>
                  <span className="day-course-main">
                    <strong>{course.shortTitle || getCourseShortTitle(course.title)} · {course.title}</strong>
                    <small>{[course.place, course.teacher, `${course.startWeek || 1}-${course.endWeek || 18}周`].filter(Boolean).join(' · ')}</small>
                  </span>
                </button>
              )
            })}
            {!todayCourses.length && (
              <div className="day-course-empty">
                <button
                  className="day-course-empty-main"
                  type="button"
                  onClick={() => openEmptyCell(selectedDay, suggestedNextSlot)}
                >
                  <Icon name="pen" />
                  <strong>今天还没排课</strong>
                  <span>选一个常用节次，直接录入课程。</span>
                </button>
                <button
                  className="day-course-primary-add"
                  type="button"
                  onClick={() => openEmptyCell(selectedDay, suggestedNextSlot)}
                >
                  添加下一节课
                </button>
                <div className="empty-slot-picks" aria-label="快速选择节次">
                  {(suggestedEmptySlots.length ? suggestedEmptySlots : activeSlots.slice(0, 4)).map((slot) => (
                    <button type="button" key={slot.index} onClick={() => openEmptyCell(selectedDay, slot.index)}>
                      <strong>第 {slot.index} 节</strong>
                      <span>{slot.start}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {mode === 'week' && (
        <section className="week-course-panel">
          <SectionTitle icon="calendar" title="本周课表" hint={`${activeProfile?.name || '自定义作息'} · 第 ${currentWeek} 周`} />
          <div className="week-grid-scroll">
            <div className="week-grid-table" style={{ '--week-days': visibleWeekNames.length } as CSSProperties}>
              <div className="week-grid-head time-head">节次</div>
              {visibleWeekNames.map(({ name, day }) => (
                <div className={day === selectedDay ? 'week-grid-head today' : 'week-grid-head'} key={name}>
                  <strong>{name.replace('周', '')}</strong>
                  <small>{activeCourses.filter((course) => course.day === day).length || '空'}</small>
                </div>
              ))}
              {activeSlots.map((slot) => (
                <Fragment key={slot.index}>
                  <div className="week-grid-slot">
                    <strong>{slot.label || slot.index}</strong>
                    <span>{slot.start}<br />{slot.end}</span>
                  </div>
                  {visibleWeekNames.map(({ day, name }) => {
                    const occupiedCourses = weekOccupiedMap.get(`${day}-${slot.index}`) ?? []
                    return occupiedCourses.length ? (
                      <div className="week-grid-course-stack" key={`${slot.index}-${name}`}>
                        {occupiedCourses.map((course) => {
                          const startSlot = course.slot || getSlotFromTime(course.start, activeSlots)
                          const isStart = startSlot === slot.index
                          const isEnd = occupiedSlotsForCourse(course, activeSlots).at(-1) === slot.index
                          const time = getCourseSlotTime(startSlot, course.slotSpan || 1, activeSlots)
                          return (
                            <button
                              className={`week-grid-course ${course.color}${isStart ? course.slotSpan > 1 ? ' spans' : '' : ` continuation${isEnd ? ' end' : ''}`}`}
                              type="button"
                              key={`${course.id}-${slot.index}`}
                              onClick={() => editCourse(course)}
                            >
                              <strong>{isStart ? course.shortTitle || getCourseShortTitle(course.title) : '续'}</strong>
                              {isStart ? (
                                <>
                                  <span>{course.title}</span>
                                  <small>{[course.place, course.teacher].filter(Boolean).join(' · ') || formatWeekRule(course.startWeek || 1, course.endWeek || semesterConfig.totalWeeks, course.weekRule || 'all')}</small>
                                  <em>{time.start}-{time.end}</em>
                                </>
                              ) : (
                                <small>{course.slotSpan || 1} 小节</small>
                              )}
                            </button>
                          )
                        })}
                        <button className="week-mini-add" type="button" onClick={() => openEmptyCell(day, slot.index)}>＋</button>
                      </div>
                    ) : (
                      <button className="week-grid-empty" type="button" key={`${slot.index}-${name}`} onClick={() => openEmptyCell(day, slot.index)}>
                        <span>＋</span>
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {(mode !== 'today' || todayCourses.length > 0) && <button className="action-card timetable-add-card" type="button" onClick={() => {
        resetForm(selectedDay, nextEmptySlot(semesterCourses, selectedDay, activeSlots, safeStartWeek, safeEndWeek))
        setSheetOpen(true)
      }}>
        <span className="module-icon tone-blue"><Icon name="book" /></span>
        <div>
          <strong>添加课程</strong>
          <small>课程会自动记忆</small>
        </div>
        <Icon name="chevron" />
      </button>}

      <BottomSheet open={sheetOpen} title={editingId ? '编辑课程' : '添加课程'} hint={`${form.semester} · ${weekNames[form.day - 1]} · 第 ${formatSlotRange(form.slot, formSlotSpan)} 节`} icon="book" tone="blue" onClose={closeSheet} autoFocusFirst={false} confirmOnDirty>
        <form className="sheet-form course-sheet-form" onSubmit={submit}>
          {!!filteredCourseMemory.length && (
            <div className="course-memory" aria-label="课程记忆">
              {filteredCourseMemory.map((course) => (
                <button className={course.color} type="button" key={course.id} onClick={() => pickMemory(course)}>
                  <strong>{course.shortTitle || getCourseShortTitle(course.title)}</strong>
                  <span>{course.title}</span>
                  {(course.place || course.teacher) && <small>{[course.place, course.teacher].filter(Boolean).join(' · ')}</small>}
                </button>
              ))}
            </div>
          )}
          <input aria-label="课程名" enterKeyHint="next" placeholder="例如：数学 / 瑜伽 / 画画" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <input aria-label="课程缩写" enterKeyHint="next" placeholder="缩写，例如：数 / 英 / 物" value={form.shortTitle} onChange={(event) => setForm({ ...form, shortTitle: event.target.value })} />
          <div className="form-grid three course-slot-grid">
            <select aria-label="星期" value={form.day} onChange={(event) => setForm({ ...form, day: Number(event.target.value) })}>
              {weekNames.map((name, index) => <option value={index + 1} key={name}>{name}</option>)}
            </select>
            <select aria-label="节次" value={form.slot} onChange={(event) => {
              const slot = Number(event.target.value)
              const slotPosition = Math.max(0, activeSlots.findIndex((item) => item.index === slot))
              const slotSpan = Math.min(form.slotSpan || 1, Math.max(1, activeSlots.length - slotPosition))
              const time = getCourseSlotTime(slot, slotSpan, activeSlots)
              setForm({ ...form, slot, slotSpan, start: time.start, end: time.end })
            }}>
              {activeSlots.map((slot) => <option value={slot.index} key={slot.index}>第 {slot.index} 节</option>)}
            </select>
            <span className="time-readonly">{formTime.start}-{formTime.end}</span>
          </div>
          <div className="course-span-control">
            <div>
              <strong>连续课时</strong>
              <small>大学一大节课可包含多个小节</small>
            </div>
            <div className="segmented course-span-picker" aria-label="连续课时数量">
              {Array.from({ length: maxFormSlotSpan }, (_, index) => index + 1).map((span) => (
                <button
                  className={formSlotSpan === span ? 'active' : ''}
                  type="button"
                  key={span}
                  disabled={span > maxFormSlotSpan}
                  onClick={() => {
                    const time = getCourseSlotTime(form.slot, span, activeSlots)
                    setForm({ ...form, slotSpan: span, start: time.start, end: time.end })
                  }}
                >
                  {span} 小节
                </button>
              ))}
            </div>
            <span className="course-span-summary">
              第 {formatSlotRange(form.slot, formSlotSpan)} 节 · {formTime.start}-{formTime.end}
            </span>
          </div>
          <div className="form-grid course-week-grid">
            <input aria-label="开始周" inputMode="numeric" type="number" min="1" max="30" value={form.startWeek} onChange={(event) => setForm({ ...form, startWeek: Number(event.target.value) || 1 })} />
            <input aria-label="结束周" inputMode="numeric" type="number" min="1" max="30" value={form.endWeek} onChange={(event) => setForm({ ...form, endWeek: Number(event.target.value) || 18 })} />
          </div>
          <div className="segmented course-week-rule" aria-label="周次规则">
            {[
              { key: 'all', label: '每周' },
              { key: 'odd', label: '单周' },
              { key: 'even', label: '双周' },
            ].map((item) => (
              <button
                className={form.weekRule === item.key ? 'active' : ''}
                type="button"
                key={item.key}
                onClick={() => setForm({ ...form, weekRule: item.key as WeekRule })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="shortcut-pills week-range-pills" aria-label="周次快捷选择">
            {weekShortcuts.map((item) => (
              <button
                className={formStartWeek === item.start && formEndWeek === item.end ? 'active' : ''}
                type="button"
                key={item.label}
                onClick={() => setForm({ ...form, startWeek: item.start, endWeek: item.end })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="course-span-summary">{formatWeekRule(formStartWeek, formEndWeek, form.weekRule)} · 实际 {buildWeekList(formStartWeek, formEndWeek, form.weekRule).length} 周</span>
          {form.startWeek > form.endWeek && (
            <div className="form-alert warn">
              <Icon name="bell" />
              <span>开始周大于结束周，保存时会自动按 {formEndWeek}-{formStartWeek} 周整理。</span>
            </div>
          )}
          {conflictingCourse && (
            <div className="form-alert danger">
              <Icon name="bell" />
              <span>第 {formatSlotRange(form.slot, formSlotSpan)} 节与「{conflictingCourse.shortTitle || conflictingCourse.title}」占用时间重叠，请调整节次、连续课时或周次。</span>
            </div>
          )}
          <div className="form-grid">
            <input aria-label="地点" placeholder="地点" value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} />
            <input aria-label="老师或备注" placeholder="老师/备注" value={form.teacher} onChange={(event) => setForm({ ...form, teacher: event.target.value })} />
          </div>
          <div className="segmented course-colors">
            {['blue', 'rose', 'amber', 'mint'].map((color) => (
              <button className={form.color === color ? `active ${color}` : color} type="button" key={color} onClick={() => setForm({ ...form, color })} aria-label={`课程颜色${color}`} />
            ))}
          </div>
          <div className="edit-actions">
            <button className="primary-action" type="submit" disabled={!canSubmitCourse}>{editingId ? '保存课程' : '加入课表'}</button>
            {editingId && <button className="soft-action danger" type="button" onClick={() => {
              const current = courses.find((course) => course.id === editingId)
              if (current) onRemove(current)
              closeSheet()
            }}>删除课程</button>}
          </div>
        </form>
      </BottomSheet>

      <BottomSheet
        open={timeSheetOpen}
        title="作息与节次"
        hint={`${semesterConfig.name} 使用「${activeProfile?.name ?? '自定义作息'}」`}
        icon="settings"
        tone="blue"
        onClose={() => setTimeSheetOpen(false)}
        autoFocusFirst={false}
      >
        <div className="timetable-time-sheet">
          <div className="timetable-profile-list" aria-label="作息方案">
            {normalizedProfiles.map((profile) => (
              <button
                className={profile.id === activeProfile.id ? 'active' : ''}
                type="button"
                key={profile.id}
                onClick={() => switchSemesterProfile(profile.id)}
              >
                <strong>{profile.name}</strong>
                <span>{profile.slots.length} 节 · {profile.showWeekend ? '含周末' : '工作日'}</span>
              </button>
            ))}
          </div>
          <div className="timetable-preset-list" aria-label="课时预设">
            {timetableSlotPresets.map((preset) => (
              <button
                className={activeSlotPresetKey === preset.key ? 'active' : ''}
                type="button"
                key={preset.key}
                aria-pressed={activeSlotPresetKey === preset.key}
                onClick={() => applySlotPreset(preset)}
              >
                <strong>{preset.label}</strong>
                <span>{activeSlotPresetKey === preset.key ? '当前作息' : `${preset.slots[0].start} 开始`}</span>
              </button>
            ))}
          </div>
          <div className="timetable-slot-editor">
            <div className="timetable-slot-header" aria-hidden="true">
              <span>节次</span>
              <span>开始</span>
              <span />
              <span>结束</span>
              <span />
            </div>
            {slotDraft.map((slot, index) => {
              const invalid = invalidSlotIndex === index
              return (
                <div className={invalid ? 'timetable-slot-row invalid' : 'timetable-slot-row'} key={slot.index}>
                  <strong>第 {slot.index} 节</strong>
                  <label>
                    <span>开始</span>
                    <input aria-label={`第${slot.index}节开始时间`} type="time" value={slot.start} onChange={(event) => updateSlotDraft(slot.index, 'start', event.target.value)} />
                  </label>
                  <span className="timetable-time-arrow">→</span>
                  <label>
                    <span>结束</span>
                    <input aria-label={`第${slot.index}节结束时间`} type="time" value={slot.end} onChange={(event) => updateSlotDraft(slot.index, 'end', event.target.value)} />
                  </label>
                  <button className="slot-remove-button" type="button" disabled={slotDraft.length <= 1} onClick={() => removeSlotDraft(slot.index)} aria-label={`删除第${slot.index}节`}>×</button>
                </div>
              )
            })}
          </div>
          {!canSaveSlots && (
            <div className="form-alert danger">
              <Icon name="bell" />
              <span>第 {slotDraft[invalidSlotIndex]?.index ?? 1} 节时间有重叠或结束早于开始，请调整后保存。</span>
            </div>
          )}
          <div className="edit-actions timetable-time-actions">
            <button className="primary-action" type="button" disabled={!canSaveSlots} onClick={saveTimeSettings}>保存作息</button>
            <button className="soft-action" type="button" onClick={addSlotDraft}>添加节次</button>
            <button className="soft-action" type="button" onClick={() => applySlotPreset(timetableSlotPresets[0])}>恢复默认</button>
          </div>
        </div>
      </BottomSheet>

      {mode === 'semester' && (
        <>
          <SectionTitle icon="book" title="学期课表" hint={`${semesterCode} · 第 ${currentWeek} 周`} />
          <div className="semester-scroll" ref={semesterTableRef}>
            <div className="semester-table" style={{ '--semester-days': visibleWeekNames.length } as CSSProperties}>
              <div className="semester-head time-head">时间</div>
              {visibleWeekNames.map(({ name, day }) => <div className={day === selectedDay ? 'semester-head today' : 'semester-head'} data-semester-day={day} key={name}>{name}</div>)}
              {activeSlots.map((slot) => (
                <Fragment key={slot.index}>
                  <div className="slot-time">
                    <strong>{slot.index}</strong>
                    <span>{slot.start}<br />{slot.end}</span>
                  </div>
                  {visibleWeekNames.map(({ name, day }) => {
                    const occupiedCourses = semesterOccupiedMap.get(`${day}-${slot.index}`) ?? []
                    return occupiedCourses.length ? (
                      <div className="semester-course-stack" key={`${slot.index}-${name}`}>
                        {occupiedCourses.map((course) => {
                          const startSlot = course.slot || getSlotFromTime(course.start, activeSlots)
                          const isStart = startSlot === slot.index
                          const isEnd = occupiedSlotsForCourse(course, activeSlots).at(-1) === slot.index
                          return (
                            <article className={`semester-course ${course.color}${isStart ? course.slotSpan > 1 ? ' spans' : '' : ` continuation${isEnd ? ' end' : ''}`}`} key={`${course.id}-${slot.index}`} onClick={() => editCourse(course)} role="button" tabIndex={0} onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') editCourse(course)
                            }}>
                              <strong>{isStart ? course.shortTitle || getCourseShortTitle(course.title) : '续'}</strong>
                              {isStart ? (
                                <>
                                  <span>{course.title}</span>
                                  <small>{[course.place, course.teacher].filter(Boolean).join(' · ')}</small>
                                  <em>{course.startWeek || 1}-{course.endWeek || 18}周 · {course.slotSpan || 1}小节</em>
                                </>
                              ) : (
                                <small>{course.shortTitle || getCourseShortTitle(course.title)} · 至第 {formatSlotRange(startSlot, course.slotSpan || 1)} 节</small>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    ) : (
                      <button className="semester-empty" type="button" key={`${slot.index}-${name}`} onClick={() => openEmptyCell(day, slot.index)}>
                        +
                      </button>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MatrixView({
  tasks,
  autoOpen = false,
  onAutoOpenHandled,
  onAdd,
  onUpdate,
  onToggle,
  onRemove,
}: {
  tasks: TaskItem[]
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  onAdd: (task: Omit<TaskItem, 'id' | 'done'>) => void
  onUpdate: (task: TaskItem) => void
  onToggle: (id: string) => void
  onRemove: (task: TaskItem) => void
}) {
  const quadrants: { key: Quadrant; title: string; hint: string; icon: IconName; tone: string }[] = [
    { key: 'urgentImportant', title: '重要紧急', hint: '马上处理', icon: 'sparkles', tone: 'peach' },
    { key: 'important', title: '重要不急', hint: '安排时间', icon: 'calendar', tone: 'leaf' },
    { key: 'urgent', title: '紧急不重要', hint: '尽快搞定', icon: 'bell', tone: 'amber' },
    { key: 'later', title: '不急不重要', hint: '有空再说', icon: 'dark', tone: 'violet' },
  ]
  const [editor, setEditor] = useState<{ mode: 'new' | 'edit'; quadrant: Quadrant; taskId?: string } | null>(null)
  const [draft, setDraft] = useState<TaskDraft>({
    title: '',
    due: todayIso,
    list: '四象限',
    priority: 'medium',
    important: true,
    urgent: true,
  })
  const editingTask = editor?.taskId ? tasks.find((task) => task.id === editor.taskId) : undefined
  const openTasks = tasks.filter((task) => !task.done)
  const urgentImportantCount = openTasks.filter((task) => taskToQuadrant(task) === 'urgentImportant').length
  const importantCount = openTasks.filter((task) => task.important).length
  const todayCount = openTasks.filter((task) => task.due === todayIso).length

  useEffect(() => {
    if (!autoOpen) return
    openNew('urgentImportant')
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled])

  function openNew(quadrant: Quadrant) {
    const flags = quadrantToFlags(quadrant)
    triggerHaptic('tap')
    setEditor({ mode: 'new', quadrant })
    setDraft({
      ...flags,
      title: '',
      due: todayIso,
      list: '四象限',
      priority: flags.important && flags.urgent ? 'high' : flags.important || flags.urgent ? 'medium' : 'low',
    })
  }

  function openEdit(task: TaskItem) {
    triggerHaptic('tap')
    setEditor({ mode: 'edit', quadrant: taskToQuadrant(task), taskId: task.id })
    setDraft({
      title: task.title,
      due: task.due,
      list: task.list,
      priority: task.priority,
      important: task.important,
      urgent: task.urgent,
    })
  }

  function closeEditor(withHaptic = true) {
    if (withHaptic) triggerHaptic('tap')
    setEditor(null)
    setDraft({
      title: '',
      due: todayIso,
      list: '四象限',
      priority: 'medium',
      important: true,
      urgent: true,
    })
  }

  function saveMatrixTask(event: FormEvent) {
    event.preventDefault()
    if (!editor) return
    const title = draft.title.trim()
    if (!title) return

    if (editor.mode === 'edit' && editingTask) {
      onUpdate({
        ...editingTask,
        ...draft,
        title,
        list: draft.list.trim() || '四象限',
      })
    } else if (editor.mode === 'edit') {
      closeEditor(false)
      return
    } else {
      onAdd({
        ...draft,
        title,
        list: draft.list.trim() || '四象限',
      })
    }

    closeEditor(false)
  }

  return (
    <div className="stack matrix-page">
      <section className="matrix-summary-card">
        <span className="module-icon tone-amber"><Icon name="matrix" /></span>
        <div>
          <small>优先级总览</small>
          <strong>{urgentImportantCount > 0 ? `${urgentImportantCount} 件马上处理` : '没有紧急重要事项'}</strong>
          <p>{importantCount} 件重要事项，{todayCount} 件今天到期。</p>
        </div>
      </section>
      <div className="matrix-grid">
        {quadrants.map((quadrant) => (
          <section
            className={`matrix-box ${quadrant.key}`}
            key={quadrant.key}
            onClick={(event) => {
              const target = event.target as HTMLElement
              if (target.closest('.matrix-task, .matrix-add-zone, button, input, select, textarea')) return
              openNew(quadrant.key)
            }}
          >
            <h3><span className={`module-icon tone-${quadrant.tone}`}><Icon name={quadrant.icon} /></span>{quadrant.title}</h3>
            <small>{quadrant.hint}</small>
            {openTasks.filter((task) => taskToQuadrant(task) === quadrant.key).map((task) => (
              <article
                className={task.done ? 'matrix-task done' : 'matrix-task'}
                key={task.id}
                onClick={() => openEdit(task)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter' || keyEvent.key === ' ') openEdit(task)
                }}
                role="button"
                tabIndex={0}
              >
                <button type="button" onClick={(event) => {
                  event.stopPropagation()
                  onToggle(task.id)
                }} aria-label={`完成${task.title}`}>
                  <span className={`check-dot ${task.priority}`} />
                </button>
                <div>
                  <span>{task.title}</span>
                  <small>{task.due} · {task.list}</small>
                </div>
                <button className="row-edit-button" type="button" onClick={(event) => {
                  event.stopPropagation()
                  openEdit(task)
                }} aria-label={`编辑${task.title}`}>
                  <Icon name="pen" />
                </button>
              </article>
            ))}
            <button className="matrix-add-zone" type="button" onClick={() => openNew(quadrant.key)}>
              <Icon name="pen" />
              新增
            </button>
          </section>
        ))}
      </div>
      <TaskEditorSheet
        open={!!editor}
        title={editor?.mode === 'edit' ? '编辑象限事项' : '添加象限事项'}
        hint={taskToQuadrantLabel(draft)}
        form={draft}
        setForm={(next) => {
          setDraft(next)
          if (editor) setEditor({ ...editor, quadrant: taskToQuadrant(next) })
        }}
        onSubmit={saveMatrixTask}
        onClose={closeEditor}
        onDelete={editor?.taskId ? () => {
          if (editingTask) onRemove(editingTask)
          closeEditor()
        } : undefined}
      />
    </div>
  )
}

function CountdownView({
  countdowns,
  onAdd,
  onUpdate,
  onRemove,
}: {
  countdowns: CountdownItem[]
  onAdd: (item: Omit<CountdownItem, 'id'>) => void
  onUpdate: (item: CountdownItem) => void
  onRemove: (item: CountdownItem) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    date: addDays(today, 7),
    type: '纪念日',
    color: 'rose',
  })
  const dateShortcuts = [
    { label: '一周后', value: addDays(today, 7) },
    { label: '一个月', value: addMonthsClamped(today, 1) },
    { label: '三个月', value: addMonthsClamped(today, 3) },
    { label: '半年', value: addMonthsClamped(today, 6) },
  ]
  const typeShortcuts = ['纪念日', '生日', '考试', '旅行', '还款']
  const canSubmitCountdown = !!form.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(form.date)

  function resetForm() {
    setEditingId(null)
    setForm({
      title: '',
      date: addDays(today, 7),
      type: '纪念日',
      color: 'rose',
    })
  }

  function openNew() {
    triggerHaptic('tap')
    resetForm()
    setSheetOpen(true)
  }

  function startEdit(item: CountdownItem) {
    triggerHaptic('tap')
    setEditingId(item.id)
    setForm({
      title: item.title,
      date: item.date,
      type: item.type,
      color: item.color,
    })
    setSheetOpen(true)
  }

  function closeSheet(withHaptic = true) {
    if (withHaptic) triggerHaptic('tap')
    setSheetOpen(false)
    resetForm()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) return
    if (editingId) {
      const existing = countdowns.find((item) => item.id === editingId)
      if (existing) onUpdate({ ...existing, ...form, title })
      closeSheet(false)
      return
    }
    onAdd({ ...form, title })
    closeSheet(false)
  }

  function removeEditingItem() {
    const current = countdowns.find((item) => item.id === editingId)
    if (current) onRemove(current)
    closeSheet(false)
  }

  const sortedItems = sortedCountdowns(countdowns)
  const nearestFutureId = sortedItems.find((item) => daysBetween(todayIso, item.date) >= 0)?.id

  return (
    <div className="stack countdown-page">
      <button className="action-card" type="button" onClick={openNew}>
        <span className="module-icon tone-rose"><Icon name="countdown" /></span>
        <div>
          <strong>新增倒数日</strong>
          <small>记录值得期待的日子</small>
        </div>
        <Icon name="chevron" />
      </button>

      <SectionTitle icon="heart" title="期待清单" />
      <div className="countdown-list">
        {sortedItems.map((item) => {
          const dayCount = daysBetween(todayIso, item.date)
          return (
            <article className={`countdown-card ${item.color} ${item.id === nearestFutureId ? 'featured' : ''} ${dayCount < 0 ? 'past' : dayCount <= 7 ? 'soon' : 'future'}`} key={item.id} onClick={() => startEdit(item)} role="button" tabIndex={0} onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                startEdit(item)
              }
            }}>
              <div>
                <div className="countdown-meta">
                  <span>{item.type}</span>
                  {item.id === nearestFutureId && <b>最近</b>}
                </div>
                <strong>{item.title}</strong>
                <small>{item.date}</small>
              </div>
              <em>
                <strong>{Math.abs(dayCount)}</strong>
                <small>{dayCount < 0 ? '已过' : dayCount === 0 ? '今天' : '天后'}</small>
              </em>
            </article>
          )
        })}
        {!countdowns.length && <EmptyState text="还没有值得期待的小日子。" action="新增倒数日" onAction={openNew} />}
      </div>
      <BottomSheet
        open={sheetOpen}
        title={editingId ? '编辑倒数日' : '新增倒数日'}
        hint={form.date}
        icon="countdown"
        tone="rose"
        onClose={closeSheet}
        autoFocusFirst={false}
      >
        <form className="sheet-form" onSubmit={submit}>
          <input aria-label="纪念日名称" enterKeyHint="next" placeholder="例如：生日、考试、旅行" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <div className="shortcut-pills countdown-date-pills" aria-label="倒数日期快捷选择">
            {dateShortcuts.map((item) => (
              <button
                className={form.date === item.value ? 'active' : ''}
                type="button"
                key={item.label}
                onClick={() => setForm({ ...form, date: item.value })}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="shortcut-pills category-pills" aria-label="倒数类型快捷选择">
            {typeShortcuts.map((type) => (
              <button
                className={form.type === type ? 'active' : ''}
                type="button"
                key={type}
                onClick={() => setForm({ ...form, type })}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="form-grid three">
            <input aria-label="日期" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <select aria-label="类型" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option>纪念日</option>
              <option>生日</option>
              <option>考试</option>
              <option>旅行</option>
              <option>还款</option>
            </select>
            <select aria-label="颜色" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })}>
              <option value="rose">玫瑰</option>
              <option value="amber">蜂蜜</option>
              <option value="blue">雾蓝</option>
              <option value="mint">薄荷</option>
            </select>
          </div>
          <div className="edit-actions">
            <button className="primary-action" type="submit" disabled={!canSubmitCountdown}>{editingId ? '保存倒数日' : '加入倒数'}</button>
            {editingId && <button className="soft-action danger" type="button" onClick={removeEditingItem}>删除</button>}
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}

function FocusView({
  sessions,
  selectedDate,
  autoOpen = false,
  onAutoOpenHandled,
  onAdd,
  onRemove,
}: {
  sessions: FocusSession[]
  selectedDate: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  onAdd: (session: Omit<FocusSession, 'id'>) => void
  onRemove: (session: FocusSession) => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState({
    focusMinutes: 25,
    breakMinutes: 5,
    scholarMode: true,
    password: '',
    note: '',
  })
  const [timer, setTimer] = useState<{
    mode: 'focus' | 'break'
    remaining: number
    total: number
    locked: boolean
    paused: boolean
    session: Omit<FocusSession, 'id'>
  } | null>(null)
  const [unlockText, setUnlockText] = useState('')
  const todaySessions = sessions.filter((session) => session.date === selectedDate)
  const totalFocus = todaySessions.reduce((sum, session) => sum + session.focusMinutes, 0)
  const completedSessions = todaySessions.filter((session) => session.completed).length
  const focusGoal = 120
  const focusRate = Math.min(100, Math.round((totalFocus / focusGoal) * 100))
  const focusPresets = [
    { label: '短冲刺', focusMinutes: 15, breakMinutes: 3 },
    { label: '标准', focusMinutes: 25, breakMinutes: 5 },
    { label: '深度', focusMinutes: 45, breakMinutes: 10 },
  ]
  const invalidFocusMinutes =
    !Number.isFinite(Number(form.focusMinutes)) ||
    !Number.isFinite(Number(form.breakMinutes)) ||
    Number(form.focusMinutes) < 1 ||
    Number(form.breakMinutes) < 1

  useEffect(() => {
    if (!timer || timer.paused) return
    const tick = window.setInterval(() => {
      setTimer((current) => {
        if (!current) return null
        if (current.paused) return current
        if (current.remaining > 1) return { ...current, remaining: current.remaining - 1 }
        if (current.mode === 'focus') {
          onAdd(current.session)
          const breakSeconds = current.session.breakMinutes * 60
          return { ...current, mode: 'break', remaining: breakSeconds, total: breakSeconds, locked: false, paused: false }
        }
        return null
      })
    }, 1000)

    return () => window.clearInterval(tick)
  }, [onAdd, timer])

  useEffect(() => {
    if (!autoOpen) return
    setSheetOpen(true)
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled])

  function startFocus(event: FormEvent) {
    event.preventDefault()
    if (invalidFocusMinutes) return
    const focusMinutes = Math.max(1, Number(form.focusMinutes))
    const breakMinutes = Math.max(1, Number(form.breakMinutes))
    const session = {
      date: selectedDate,
      focusMinutes,
      breakMinutes,
      scholarMode: form.scholarMode,
      completed: true,
      note: form.note.trim() || '专注一轮',
    }
    setTimer({ mode: 'focus', remaining: focusMinutes * 60, total: focusMinutes * 60, locked: form.scholarMode, paused: false, session })
    setSheetOpen(false)
  }

  function unlockScholar() {
    if (!form.password || unlockText === form.password) {
      setTimer((current) => current ? { ...current, locked: false } : null)
      setUnlockText('')
    }
  }

  const timerTotal = timer?.total ?? Math.max(1, Number(form.focusMinutes)) * 60
  const timerProgress = timer ? Math.round(((timerTotal - timer.remaining) / timerTotal) * 100) : 0

  return (
    <div className="stack focus-page">
      <section className={timer?.locked ? 'focus-lock focus-hero active' : 'focus-lock focus-hero'}>
        <span className="focus-ring" style={{ '--focus-progress': `${timerProgress}%` } as CSSProperties}>
          <i><Icon name={timer?.mode === 'break' ? 'sun' : 'focus'} /></i>
        </span>
        <div>
          <small>{timer?.mode === 'break' ? '休息时间' : timer?.paused ? '已暂停' : timer ? '专注进行中' : '番茄专注'}</small>
          <strong>{formatTimer(timer?.remaining ?? form.focusMinutes * 60)}</strong>
          <p>{timer?.locked ? '学霸模式已锁定，输入密码可提前解锁。' : timer?.paused ? '暂停一下也没关系，回来继续。' : timer ? `${timerProgress}% · 结束后自动进入休息。` : '设置专注与休息时长，开始一轮番茄。'}</p>
        </div>
      </section>

      {timer && !timer.locked && (
        <div className="focus-controls">
          <button className="soft-action" type="button" onClick={() => setTimer((current) => current ? { ...current, paused: !current.paused } : null)}>
            {timer.paused ? '继续' : '暂停'}
          </button>
          <button className="soft-action danger" type="button" onClick={() => setTimer(null)}>结束本轮</button>
        </div>
      )}

      {timer?.locked && (
        <div className="quick-capture">
          <span aria-hidden="true"><Icon name="lock" /></span>
          <input aria-label="解锁密码" type="password" enterKeyHint="done" placeholder="输入解锁密码" value={unlockText} onChange={(event) => setUnlockText(event.target.value)} />
          <button type="button" onClick={unlockScholar}>解锁</button>
        </div>
      )}

      <section className="focus-summary-card">
        <div className="focus-summary-ring" style={{ '--focus-day-progress': `${focusRate}%` } as CSSProperties}>
          <strong>{focusRate}%</strong>
          <span>今日</span>
        </div>
        <div>
          <small>今日专注</small>
          <strong>{totalFocus} 分钟</strong>
          <p>{completedSessions ? `已完成 ${completedSessions} 轮，继续保持节奏。` : '先从一轮短番茄开始，进入状态就好。'}</p>
        </div>
        <span className={form.scholarMode ? 'focus-mode-badge active' : 'focus-mode-badge'}>
          <Icon name={form.scholarMode ? 'lock' : 'focus'} />
          {form.scholarMode ? '学霸模式' : '普通模式'}
        </span>
      </section>

      <button className="action-card focus-start-card" type="button" onClick={() => setSheetOpen(true)}>
        <span className="module-icon tone-blue"><Icon name="focus" /></span>
        <div>
          <strong>{timer ? '调整下一轮番茄' : '开始一轮番茄'}</strong>
          <small>今日 {totalFocus} 分钟 · {form.focusMinutes} 分钟专注 · {form.scholarMode ? '学霸模式' : '普通模式'}</small>
        </div>
        <Icon name="chevron" />
      </button>

      <SectionTitle icon="reports" title="专注记录" hint={`${todaySessions.length}`} />
      <div className="list">
        {todaySessions.map((session) => (
          <div className={session.completed ? 'focus-session-card completed' : 'focus-session-card'} key={session.id}>
            <span className="module-icon tone-blue"><Icon name={session.scholarMode ? 'lock' : 'focus'} /></span>
            <div>
              <span>{session.note}</span>
              <small>{session.focusMinutes} 分钟专注 · {session.breakMinutes} 分钟休息 {session.scholarMode ? '· 学霸模式' : ''}</small>
            </div>
            <strong className={session.completed ? 'focus-session-status done' : 'focus-session-status running'}>{session.completed ? '完成' : '进行中'}</strong>
            <button className="focus-session-delete" type="button" onClick={() => onRemove(session)} aria-label={`删除${session.note}`}>
              ×
            </button>
          </div>
        ))}
        {!todaySessions.length && <EmptyState text="今天还没有专注记录，先来一轮短番茄。" action="设置番茄钟" onAction={() => setSheetOpen(true)} />}
      </div>
      <BottomSheet
        open={sheetOpen}
        title="设置番茄钟"
        hint={`${form.focusMinutes} 分钟专注 · ${form.breakMinutes} 分钟休息`}
        icon="focus"
        tone="blue"
        onClose={() => setSheetOpen(false)}
      >
        <form className="sheet-form" onSubmit={startFocus}>
          <div className="shortcut-pills focus-preset-pills" aria-label="专注时长预设">
            {focusPresets.map((preset) => (
              <button
                className={form.focusMinutes === preset.focusMinutes && form.breakMinutes === preset.breakMinutes ? 'active' : ''}
                type="button"
                key={preset.label}
                onClick={() => setForm({ ...form, focusMinutes: preset.focusMinutes, breakMinutes: preset.breakMinutes })}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="form-grid three">
            <input aria-label="专注分钟" inputMode="numeric" enterKeyHint="next" type="number" min="1" value={form.focusMinutes} onChange={(event) => setForm({ ...form, focusMinutes: Number(event.target.value) })} />
            <input aria-label="休息分钟" inputMode="numeric" enterKeyHint="next" type="number" min="1" value={form.breakMinutes} onChange={(event) => setForm({ ...form, breakMinutes: Number(event.target.value) })} />
            <input aria-label="解锁密码" type="password" enterKeyHint="next" placeholder="解锁密码" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </div>
          {invalidFocusMinutes && (
            <div className="form-alert danger">
              <Icon name="bell" />
              <span>专注和休息时间都需要大于 0 分钟。</span>
            </div>
          )}
          <input aria-label="专注备注" enterKeyHint="done" placeholder="这轮想完成什么" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          <button className={form.scholarMode ? 'toggle-line active' : 'toggle-line'} type="button" onClick={() => setForm({ ...form, scholarMode: !form.scholarMode })}>
            <Icon name="lock" />
          <span>
            <strong>学霸模式</strong>
            <small>开始后锁定页面</small>
          </span>
          </button>
          <button className="primary-action" type="submit" disabled={invalidFocusMinutes}>开始专注</button>
        </form>
      </BottomSheet>
    </div>
  )
}

function JournalView({
  entries,
  selectedDate,
  autoOpen = false,
  onAutoOpenHandled,
  ledger,
  tasks,
  onSave,
  onRemove,
}: {
  entries: JournalEntry[]
  selectedDate: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  ledger: LedgerItem[]
  tasks: TaskItem[]
  onSave: (entry: Omit<JournalEntry, 'id'>) => void
  onRemove: (entry: JournalEntry) => void
}) {
  const existing = entries.find((entry) => entry.date === selectedDate)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [journalFilter, setJournalFilter] = useState<'month' | 'all'>('month')
  const [editingDate, setEditingDate] = useState(selectedDate)
  const [form, setForm] = useState({
    mood: existing?.mood ?? '🙂',
    title: existing?.title ?? '',
    body: existing?.body ?? '',
    weather: existing?.weather ?? '待同步',
  })
  const dayExpense = ledger.filter((item) => item.date === selectedDate && item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const finishedTasks = tasks.filter((task) => task.due === selectedDate && task.done).length
  const moods = ['😊', '🙂', '😐', '😴', '🥳', '🌧️']
  const dailyQuote = useMemo(() => getDailyQuote(editingDate), [editingDate])
  const journalTemplates = [
    { label: '每日一句', title: '每日一句话', body: dailyQuote },
    { label: '小复盘', title: '今天的小复盘', body: '做得不错：\n还想改进：\n明天继续：' },
    { label: '感谢', title: '今天的感谢', body: '今天让我觉得温暖的是：' },
  ]
  const moodLabels: Record<string, string> = {
    '😊': '开心',
    '🙂': '平静',
    '😐': '一般',
    '😴': '疲惫',
    '🥳': '兴奋',
    '🌧️': '低落',
  }
  const monthEntries = entries.filter((entry) => entry.date.startsWith(selectedDate.slice(0, 7)))
  const moodStats = moods.map((mood) => ({ mood, count: monthEntries.filter((entry) => entry.mood === mood).length }))
  const dominantMood = [...moodStats].sort((a, b) => b.count - a.count)[0]
  const dominantMoodRate = dominantMood?.count && monthEntries.length
    ? Math.round((dominantMood.count / monthEntries.length) * 100)
    : 0
  const visibleJournalEntries = [...(journalFilter === 'month' ? monthEntries : entries)].sort((a, b) => b.date.localeCompare(a.date))
  const canSubmitJournal = true

  useEffect(() => {
    const next = entries.find((entry) => entry.date === selectedDate)
    setEditingDate(selectedDate)
    setForm({
      mood: next?.mood ?? '🙂',
      title: next?.title ?? '',
      body: next?.body ?? '',
      weather: next?.weather ?? '待同步',
    })
  }, [entries, selectedDate])

  const openTodayJournal = useCallback(() => {
    const next = entries.find((entry) => entry.date === selectedDate)
    setEditingDate(selectedDate)
    setForm({
      mood: next?.mood ?? '🙂',
      title: next?.title ?? '',
      body: next?.body ?? '',
      weather: next?.weather ?? '待同步',
    })
    setSheetOpen(true)
  }, [entries, selectedDate])

  useEffect(() => {
    if (!autoOpen) return
    openTodayJournal()
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled, openTodayJournal])

  function openEntry(entry: JournalEntry) {
    setEditingDate(entry.date)
    setForm({
      mood: entry.mood,
      title: entry.title,
      body: entry.body,
      weather: entry.weather,
    })
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    const next = entries.find((entry) => entry.date === selectedDate)
    setEditingDate(selectedDate)
    setForm({
      mood: next?.mood ?? '🙂',
      title: next?.title ?? '',
      body: next?.body ?? '',
      weather: next?.weather ?? '待同步',
    })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmitJournal) return
    onSave({
      date: editingDate,
      mood: form.mood,
      title: form.title.trim() || '今日一句话',
      body: form.body.trim(),
      weather: form.weather,
    })
    closeSheet()
  }

  function removeEditingJournal() {
    const current = entries.find((entry) => entry.date === editingDate)
    if (current) onRemove(current)
    closeSheet()
  }

  function syncWeather() {
    if (!navigator.geolocation) {
      setForm((current) => ({ ...current, weather: '浏览器不支持定位' }))
      return
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`)
        const weather = await response.json() as { current?: { temperature_2m?: number; weather_code?: number } }
        const temp = weather.current?.temperature_2m
        setForm((current) => ({ ...current, weather: Number.isFinite(temp) ? `${temp}°C · 天气码 ${weather.current?.weather_code ?? '-'}` : '天气已同步' }))
      } catch {
        setForm((current) => ({ ...current, weather: '天气同步失败' }))
      }
    }, () => setForm((current) => ({ ...current, weather: '未授权定位' })))
  }

  return (
    <div className="stack journal-page">
      <section className="journal-summary">
        <Metric icon="ledger" label="当天支出" value={currency.format(dayExpense)} />
        <Metric icon="tasks" label="完成任务" value={`${finishedTasks} 项`} />
        <Metric icon="weather" label="天气" value={form.weather} />
      </section>

      <button className="action-card" type="button" onClick={openTodayJournal}>
        <span className="module-icon tone-violet"><Icon name="mood" /></span>
        <div>
          <strong>{existing ? '编辑今日日记' : '写一篇今日日记'}</strong>
          <small>{selectedDate} · 记下今天</small>
        </div>
        <Icon name="chevron" />
      </button>

      <SectionTitle icon="reports" title="月度心情" hint={`${monthEntries.length} 篇`} />
      <div className="mood-chart">
        <header className="mood-chart-head">
          <b>{dominantMood?.count ? dominantMood.mood : '○'}</b>
          <strong>{dominantMood?.count ? `本月最多：${moodLabels[dominantMood.mood]}` : '本月还没有心情记录'}</strong>
          <em>{dominantMoodRate}%</em>
        </header>
        {moodStats.map((item) => (
          <div key={item.mood}>
            <span>{item.mood}</span>
            <i style={{ height: `${Math.max(10, item.count * 18)}px`, '--mood-count': `${Math.min(1, item.count / Math.max(1, monthEntries.length))}` } as CSSProperties} />
            <small>{item.count}</small>
          </div>
        ))}
      </div>

      <SectionTitle icon="journal" title="日记列表" hint={`${visibleJournalEntries.length}`} />
      <div className="segmented journal-filter-tabs" aria-label="日记筛选">
        <button className={journalFilter === 'month' ? 'active' : ''} type="button" onClick={() => setJournalFilter('month')}>本月</button>
        <button className={journalFilter === 'all' ? 'active' : ''} type="button" onClick={() => setJournalFilter('all')}>全部</button>
      </div>
      <div className="list">
        {visibleJournalEntries.map((entry) => (
          <div className="journal-entry-row editable" key={entry.id} onClick={() => openEntry(entry)} role="button" tabIndex={0} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') openEntry(entry)
          }}>
            <div>
              <span>{entry.mood} {entry.title}</span>
              <small>{entry.date} · {entry.weather}</small>
            </div>
            <button type="button" onClick={(event) => {
              event.stopPropagation()
              onRemove(entry)
            }} aria-label={`删除${entry.title}`}>×</button>
          </div>
        ))}
        {!visibleJournalEntries.length && <EmptyState text={entries.length ? '本月还没有日记。' : '还没有日记，先写今天的一句话。'} action="写日记" onAction={openTodayJournal} />}
      </div>

      <BottomSheet
        open={sheetOpen}
        title={entries.some((entry) => entry.date === editingDate) ? '编辑日记' : '写日记'}
        hint={editingDate}
        icon="mood"
        tone="violet"
        onClose={closeSheet}
      >
        <form className="sheet-form" onSubmit={submit}>
          <div className="mood-row">
            {moods.map((mood) => (
              <button className={form.mood === mood ? 'active' : ''} type="button" key={mood} onClick={() => setForm({ ...form, mood })}>{mood}</button>
            ))}
          </div>
          <div className="shortcut-pills journal-template-pills" aria-label="日记模板">
            {journalTemplates.map((template) => (
              <button
                type="button"
                key={template.label}
                onClick={() => setForm({
                  ...form,
                  title: template.title,
                  body: template.body,
                })}
              >
                {template.label}
              </button>
            ))}
          </div>
          <p className="daily-quote-hint">每日一句已从 {dailyQuotes.length} 句中按日期轮换：{dailyQuote}</p>
          <input aria-label="日记标题" enterKeyHint="next" placeholder="每日一句话 / 标题" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <textarea aria-label="短文日记" enterKeyHint="done" placeholder="今天发生了什么？" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
          <div className="edit-actions">
            <button className="primary-action" type="submit" disabled={!canSubmitJournal}>保存日记</button>
            <button className="soft-action" type="button" onClick={syncWeather}>同步天气</button>
            {entries.some((entry) => entry.date === editingDate) && <button className="soft-action danger" type="button" onClick={removeEditingJournal}>删除日记</button>}
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}

function NotesView({
  notes,
  autoOpen = false,
  onAutoOpenHandled,
  onAdd,
  onUpdate,
  onRemove,
}: {
  notes: NoteItem[]
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  onAdd: (note: Omit<NoteItem, 'id' | 'updatedAt'>) => void
  onUpdate: (note: NoteItem) => void
  onRemove: (note: NoteItem) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [noteQuery, setNoteQuery] = useState('')
  const [noteFilter, setNoteFilter] = useState<'all' | 'pinned'>('all')
  const [form, setForm] = useState({ title: '', body: '', color: 'amber', pinned: false })
  const sortedNotes = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  const normalizedNoteQuery = noteQuery.trim().toLowerCase()
  const visibleNotes = sortedNotes.filter((note) => {
    const matchesFilter = noteFilter === 'all' || note.pinned
    const matchesQuery = !normalizedNoteQuery || [note.title, note.body, note.updatedAt].some((value) => value.toLowerCase().includes(normalizedNoteQuery))
    return matchesFilter && matchesQuery
  })
  const canSubmitNote = !!form.title.trim() || !!form.body.trim()

  function closeSheet() {
    setSheetOpen(false)
    setEditingId(null)
    setForm({ title: '', body: '', color: 'amber', pinned: false })
  }

  function openNew() {
    setEditingId(null)
    setForm({ title: '', body: '', color: 'amber', pinned: false })
    setSheetOpen(true)
  }

  useEffect(() => {
    if (!autoOpen) return
    openNew()
    onAutoOpenHandled?.()
  }, [autoOpen, onAutoOpenHandled])

  function edit(note: NoteItem) {
    setEditingId(note.id)
    setForm({ title: note.title, body: note.body, color: note.color, pinned: note.pinned })
    setSheetOpen(true)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const title = form.title.trim()
    const body = form.body.trim()
    if (!title && !body) return
    if (editingId) {
      const existing = notes.find((note) => note.id === editingId)
      if (existing) onUpdate({ ...existing, ...form, title: title || '未命名便签', body })
      closeSheet()
      return
    }
    onAdd({ ...form, title: title || '未命名便签', body })
    closeSheet()
  }

  function removeEditingNote() {
    const current = notes.find((note) => note.id === editingId)
    if (current) onRemove(current)
    closeSheet()
  }

  return (
    <div className="stack notes-page">
      <button className="note-compose-card" type="button" onClick={openNew}>
        <span className="module-icon tone-sun"><Icon name="notes" /></span>
        <div>
          <small>随手备忘</small>
          <strong>新建一张便签</strong>
          <p>灵感、购物、临时号码，先记下来再整理。</p>
        </div>
        <Icon name="pen" />
      </button>

      <div className="note-toolbar">
        <input className="search-input" aria-label="搜索便签" enterKeyHint="search" placeholder="搜索便签标题或内容" value={noteQuery} onChange={(event) => setNoteQuery(event.target.value)} />
        <div className="segmented note-filter-tabs" aria-label="便签筛选">
          <button className={noteFilter === 'all' ? 'active' : ''} type="button" onClick={() => setNoteFilter('all')}>全部</button>
          <button className={noteFilter === 'pinned' ? 'active' : ''} type="button" onClick={() => setNoteFilter('pinned')}>置顶</button>
        </div>
      </div>

      <SectionTitle icon="notes" title="便签墙" hint={`${visibleNotes.length}/${notes.length}`} />
      <div className="note-grid">
        {visibleNotes.map((note) => (
          <article
            className={note.pinned ? `note-card ${note.color} pinned` : `note-card ${note.color}`}
            key={note.id}
            onClick={() => edit(note)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                edit(note)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`编辑${note.title}`}
          >
            <strong>{note.title}</strong>
            {note.pinned && <span className="pin-badge">置顶</span>}
            <p>{note.body}</p>
            <small>{note.updatedAt}</small>
          </article>
        ))}
        {!visibleNotes.length && (
          <EmptyState
            text={notes.length ? '没有找到匹配的便签。' : '还没有便签，先留下一点小事。'}
            action={notes.length ? undefined : '新建便签'}
            onAction={notes.length ? undefined : openNew}
          />
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        title={editingId ? '编辑便签' : '新建便签'}
        hint={editingId ? '轻点卡片即可继续修改' : '更适合临时想法和碎片记录'}
        icon="notes"
        tone="sun"
        onClose={closeSheet}
        autoFocusFirst={false}
      >
        <form className="form-card sheet-form" onSubmit={submit}>
          <input aria-label="便签标题" enterKeyHint="next" placeholder="标题" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <textarea aria-label="便签内容" enterKeyHint="done" placeholder="随手记一点，不一定要变成任务。" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
          <div className="note-color-picker" aria-label="便签颜色">
            {[
              { key: 'amber', label: '暖黄' },
              { key: 'rose', label: '玫瑰' },
              { key: 'blue', label: '晴蓝' },
              { key: 'mint', label: '薄荷' },
            ].map((item) => (
              <button
                className={form.color === item.key ? `note-color-swatch ${item.key} active` : `note-color-swatch ${item.key}`}
                type="button"
                key={item.key}
                onClick={() => setForm({ ...form, color: item.key })}
              >
                <span />
                {item.label}
              </button>
            ))}
            <button className={form.pinned ? 'toggle-line active' : 'toggle-line'} type="button" onClick={() => setForm({ ...form, pinned: !form.pinned })}>{form.pinned ? '已置顶' : '置顶'}</button>
          </div>
          <div className="edit-actions">
            <button className="primary-action" type="submit" disabled={!canSubmitNote}>{editingId ? '保存便签' : '加入便签'}</button>
            {editingId && <button className="soft-action danger" type="button" onClick={removeEditingNote}>删除</button>}
          </div>
        </form>
      </BottomSheet>
    </div>
  )
}

function ReportsView({
  data,
  selectedDate,
  setSelectedDate,
  stats,
  onJump,
}: {
  data: AppData
  selectedDate: string
  setSelectedDate: (date: string) => void
  stats: { income: number; expense: number; balance: number }
  onJump: (view: ViewKey, action?: 'new') => void
}) {
  const month = selectedDate.slice(0, 7)
  const year = selectedDate.slice(0, 4)
  const reportMonthDate = new Date(`${month}-15T12:00:00`)
  const isCurrentMonth = month === todayIso.slice(0, 7)
  const monthTasks = data.tasks.filter((task) => task.due.startsWith(month))
  const monthDone = monthTasks.filter((task) => task.done).length
  const monthFocus = data.focusSessions.filter((session) => session.date.startsWith(month)).reduce((sum, session) => sum + session.focusMinutes, 0)
  const yearExpense = data.ledger.filter((item) => item.date.startsWith(year) && item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const monthLedger = data.ledger.filter((item) => item.date.startsWith(month))
  const monthEvents = data.events.filter((event) => event.date.startsWith(month))
  const monthNotes = data.notes.filter((note) => note.updatedAt.startsWith(month))
  const moodEntries = data.journalEntries.filter((entry) => entry.date.startsWith(month))
  const monthHabits = data.habits.reduce((sum, habit) => sum + habit.days.filter((day) => day.startsWith(month)).length, 0)
  const taskRate = monthTasks.length ? Math.round((monthDone / monthTasks.length) * 100) : 0
  const focusHours = Math.round((monthFocus / 60) * 10) / 10
  const ledgerByCategory = monthLedger
    .filter((item) => item.type === 'expense')
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.amount
      return acc
    }, {})
  const topCategory = Object.entries(ledgerByCategory).sort((a, b) => b[1] - a[1])[0]
  const categoryBars = Object.entries(ledgerByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
  const maxCategoryExpense = Math.max(1, ...categoryBars.map(([, amount]) => amount))
  const topMood = Object.entries(moodEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] ?? 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1])[0]
  const yearlyExpenses = Array.from({ length: 12 }, (_, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}`
    return data.ledger.filter((item) => item.date.startsWith(key) && item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  })
  const maxYearExpense = Math.max(1, ...yearlyExpenses)
  const bestMonthIndex = yearlyExpenses.findIndex((value) => value === maxYearExpense)
  const monthlyBudget = data.settings.monthlyBudget
  const budgetRate = monthlyBudget > 0 ? Math.round((stats.expense / monthlyBudget) * 100) : 0
  const budgetLeft = monthlyBudget - stats.expense
  const budgetSummary = monthlyBudget > 0
    ? budgetLeft >= 0 ? `预算还剩 ${currency.format(budgetLeft)}` : `预算超出 ${currency.format(Math.abs(budgetLeft))}`
    : '未设置预算'
  const insightItems = [
    monthlyBudget > 0
      ? budgetLeft >= 0
        ? `本月预算已使用 ${budgetRate}%，还剩 ${currency.format(budgetLeft)} 可以安排。`
        : `本月预算已使用 ${budgetRate}%，超出 ${currency.format(Math.abs(budgetLeft))}，建议看一下高频分类。`
      : '还没有设置月预算，记账页可以直接填写本月预算。',
    topCategory ? `本月花得最多的是「${topCategory[0]}」，共 ${currency.format(topCategory[1])}。` : '本月还没有支出分类，账本会从第一笔开始变清楚。',
    monthTasks.length ? `清单完成率 ${taskRate}%，完成了 ${monthDone} / ${monthTasks.length} 项。` : '本月还没安排清单，可以先放三件最重要的小事。',
    monthFocus ? `专注累计 ${focusHours} 小时，已经有稳定推进的痕迹。` : '本月还没有专注记录，可以先从 15 分钟番茄开始。',
  ]
  const reportLead = budgetLeft < 0
    ? '先收一收花费节奏'
    : taskRate >= 60
      ? '这个月推进感不错'
      : monthFocus >= 60
        ? '专注习惯正在长出来'
        : '先抓一个小节奏'
  const reportStatus = taskRate >= 80 ? '推进很稳' : taskRate >= 40 ? '正在推进' : '慢慢启动'
  const reportTags = [
    { label: '预算', value: monthlyBudget > 0 ? `${budgetRate}%` : '未设' },
    { label: '专注', value: `${monthFocus} 分钟` },
    { label: '日记', value: `${moodEntries.length} 篇` },
  ]
  const reportSummaryCards = [
    { label: '钱花在哪', value: topCategory ? topCategory[0] : '还不明显', detail: topCategory ? currency.format(topCategory[1]) : '记几笔后会出现趋势', icon: 'ledger' as IconName },
    { label: '推进状态', value: `${monthDone}/${monthTasks.length || 0}`, detail: monthTasks.length ? `完成率 ${taskRate}%` : '先放三件小事', icon: 'tasks' as IconName },
    { label: '情绪温度', value: topMood ? topMood[0] : '待记录', detail: `${moodEntries.length} 篇日记`, icon: 'mood' as IconName },
  ]
  const reportActions: { label: string; hint: string; icon: IconName; tone: string; view: ViewKey; action?: 'new' }[] = [
    { label: topCategory ? '复盘支出' : '补一笔账', hint: topCategory ? `${topCategory[0]}最多` : '从第一笔开始', icon: 'ledger', tone: 'leaf', view: 'ledger' },
    { label: monthTasks.length ? '看清单' : '写清单', hint: monthTasks.length ? `${monthTasks.length - monthDone} 项待推进` : '放三件小事', icon: 'tasks', tone: 'peach', view: 'tasks' },
    { label: moodEntries.length ? '翻日记' : '记心情', hint: moodEntries.length ? `${moodEntries.length} 篇记录` : '写一句也行', icon: 'journal', tone: 'violet', view: 'journal', action: moodEntries.length ? undefined : 'new' },
    { label: monthFocus ? '看专注' : '开番茄', hint: monthFocus ? `${focusHours} 小时` : '先来 15 分钟', icon: 'focus', tone: 'blue', view: 'focus', action: monthFocus ? undefined : 'new' },
  ]

  function shiftReportMonth(offset: number) {
    setSelectedDate(addMonthsClamped(reportMonthDate, offset))
  }

  return (
    <div className="stack report-page">
      <section className="report-month-switcher" aria-label="报告月份切换">
        <button type="button" onClick={() => shiftReportMonth(-1)} aria-label="查看上月报告">
          <Icon name="chevron" />
          上月
        </button>
        <div>
          <small>正在复盘</small>
          <strong>{month}</strong>
        </div>
        <button type="button" onClick={() => shiftReportMonth(1)} aria-label="查看下月报告">
          下月
          <Icon name="chevron" />
        </button>
        {!isCurrentMonth && (
          <button className="report-month-today" type="button" onClick={() => setSelectedDate(todayIso)}>
            回本月
          </button>
        )}
      </section>
      <section className="report-hero">
        <div className="report-score-ring" style={{ '--report-progress': `${taskRate}%` } as CSSProperties}>
          <span className="module-icon tone-amber"><Icon name="reports" /></span>
          <strong>{taskRate}%</strong>
        </div>
        <div>
          <small>{month} 月度报告</small>
          <strong>{reportStatus}</strong>
          <p>今年累计支出 {currency.format(yearExpense)}，本月专注 {monthFocus} 分钟，留下 {moodEntries.length} 篇日记。</p>
          <div className="report-hero-tags">
            {reportTags.map((item) => (
              <span key={item.label}>
                <small>{item.label}</small>
                <b>{item.value}</b>
              </span>
            ))}
          </div>
        </div>
      </section>
      <div className="report-summary-strip">
        {reportSummaryCards.map((item) => (
          <article key={item.label}>
            <span className="module-icon tone-amber"><Icon name={item.icon} /></span>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <em>{item.detail}</em>
          </article>
        ))}
      </div>
      <div className="report-metric-strip">
        <Metric icon="ledger" label="本月支出" value={currency.format(stats.expense)} />
        <Metric icon="balance" label="本月结余" value={currency.format(stats.balance)} />
        <Metric icon="focus" label="专注小时" value={`${focusHours}`} />
      </div>
      <div className="report-kpi-grid">
        <article>
          <span>日程</span>
          <strong>{monthEvents.length}</strong>
          <small>本月安排</small>
        </article>
        <article>
          <span>习惯</span>
          <strong>{monthHabits}</strong>
          <small>打卡次数</small>
        </article>
        <article>
          <span>便签</span>
          <strong>{monthNotes.length}</strong>
          <small>本月更新</small>
        </article>
        <article>
          <span>预算</span>
          <strong>{monthlyBudget > 0 ? `${budgetRate}%` : '-'}</strong>
          <small>{budgetSummary}</small>
        </article>
      </div>
      <SectionTitle icon="sparkles" title="本月洞察" hint={`${insightItems.length} 条`} />
      <div className="report-insights">
        {insightItems.map((item, index) => (
          <article className={index === 0 ? 'lead' : ''} key={item} style={{ '--tap-index': index } as CSSProperties}>
            <span>{index + 1}</span>
            <div>
              {index === 0 && <strong>{reportLead}</strong>}
              <p>{item}</p>
            </div>
          </article>
        ))}
      </div>
      <SectionTitle icon="sparkles" title="下一步" hint="直接行动" />
      <div className="report-action-grid">
        {reportActions.map((item) => (
          <button className={`tone-${item.tone}`} type="button" key={item.label} onClick={() => onJump(item.view, item.action)}>
            <span className={`module-icon tone-${item.tone}`}><Icon name={item.icon} /></span>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </button>
        ))}
      </div>
      <SectionTitle icon="ledger" title="支出结构" hint={topCategory ? topCategory[0] : '暂无'} />
      <div className="report-category-bars">
        {categoryBars.length ? categoryBars.map(([category, amount], index) => (
          <article key={category} style={{ '--tap-index': index } as CSSProperties}>
            <span className="module-icon tone-amber"><Icon name="ledger" /></span>
            <div>
              <strong>{category}</strong>
              <i>
                <b style={{ width: `${Math.max(10, Math.round((amount / maxCategoryExpense) * 100))}%` }} />
              </i>
            </div>
            <em>{currency.format(amount)}</em>
          </article>
        )) : (
          <article className="empty">
            <span className="module-icon tone-amber"><Icon name="ledger" /></span>
            <strong>记录一笔支出后，这里会自动生成分类占比。</strong>
          </article>
        )}
      </div>
      <SectionTitle icon="mood" title="心情与日记" />
      <div className="report-card">
        <strong>{topMood ? `${topMood[0]} 是本月最多的心情` : '本月还没有心情记录'}</strong>
        <p>共记录 {moodEntries.length} 篇日记，完成 {monthDone} 项任务，留下 {data.notes.length} 张便签。</p>
      </div>
      <SectionTitle icon="calendar" title="年度支出" hint={bestMonthIndex >= 0 ? `${bestMonthIndex + 1} 月最高` : undefined} />
      <div className="report-bars">
        {yearlyExpenses.map((expense, index) => (
          <div className={expense === maxYearExpense && expense > 0 ? 'peak' : ''} key={`${year}-${index + 1}`}>
            <i style={{ height: `${Math.max(8, Math.round((expense / maxYearExpense) * 92))}px` }} />
            <span>{index + 1}</span>
            <small>{expense ? formatShortCurrency(expense) : '-'}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsView({
  data,
  settings,
  modules,
  setHomeModuleSlot,
  exportData,
  importData,
  resetAllData,
  updateSettings,
  setModuleMode,
}: {
  data: AppData
  settings: AppSettings
  modules: ModuleMeta[]
  setHomeModuleSlot: (index: number, key: ModuleKey) => void
  exportData: () => Promise<void>
  importData: (file: File) => Promise<void>
  resetAllData: () => void
  updateSettings: (next: Partial<AppSettings>) => void
  setModuleMode: (key: ModuleKey, mode: ModuleMode) => void
}) {
  type SettingsPanel = 'root' | 'appearance' | 'modules' | 'quick' | 'motion' | 'data' | 'budget' | 'update'
  const [panel, setPanel] = useState<SettingsPanel>('root')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState(String(settings.monthlyBudget))
  const [updateChecking, setUpdateChecking] = useState(false)
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const pinnedModules = modules.filter((module) => ['nav', 'both'].includes(settings.moduleModes[module.key])).slice(0, MAX_NAV_MODULES)
  const homeModuleKeys = normalizeHomeModules(settings.homeModules)
  const navCount = pinnedModules.length
  const appearanceLabel = appearanceOptions.find((item) => item.key === settings.appearance)?.label ?? '手账'
  const themeLabel = themeOptions.find((item) => item.key === settings.theme)?.label ?? '奶油'
  const monthExpense = data.ledger.filter((item) => item.date.startsWith(todayIso.slice(0, 7)) && item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const budgetRate = settings.monthlyBudget > 0 ? Math.round((monthExpense / settings.monthlyBudget) * 100) : 0
  const budgetLeft = settings.monthlyBudget - monthExpense

  const recordCount =
    data.events.length +
    data.ledger.length +
    data.tasks.length +
    data.habits.length +
    data.courses.length +
    data.countdowns.length +
    data.focusSessions.length +
    data.journalEntries.length +
    data.notes.length
  const settingsOverview = [
    { label: '外观', value: appearanceLabel, icon: 'appearance' as IconName, panel: 'appearance' as SettingsPanel },
    { label: '预算', value: settings.monthlyBudget > 0 ? `${budgetRate}%` : '未设', icon: 'ledger' as IconName, panel: 'budget' as SettingsPanel },
    { label: '首页', value: `${homeModuleKeys.length} 个`, icon: 'modules' as IconName, panel: 'modules' as SettingsPanel },
    { label: '更新', value: APP_VERSION, icon: 'sparkles' as IconName, panel: 'update' as SettingsPanel },
  ]

  async function handleImportChange(event: FormEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (file) await importData(file)
    event.currentTarget.value = ''
  }

  useEffect(() => {
    setBudgetDraft(String(settings.monthlyBudget))
  }, [settings.monthlyBudget])

  function commitSettingsBudget() {
    const nextBudget = Number(budgetDraft)
    if (!Number.isFinite(nextBudget) || nextBudget < 0) {
      setBudgetDraft(String(settings.monthlyBudget))
      return
    }
    triggerHaptic('success')
    updateSettings({ monthlyBudget: Math.round(nextBudget) })
  }

  function openSettingsPanel(nextPanel: SettingsPanel) {
    triggerHaptic('tap')
    setPanel(nextPanel)
  }

  function returnSettingsHome() {
    triggerHaptic('tap')
    setPanel('root')
  }

  function updateSettingWithTap(next: Partial<AppSettings>) {
    triggerHaptic('tap')
    updateSettings(next)
  }

  function togglePinnedModule(module: ModuleMeta) {
    triggerHaptic('tap')
    const isPinned = settings.moduleModes[module.key] === 'nav' || settings.moduleModes[module.key] === 'both'
    setModuleMode(module.key, isPinned ? 'home' : 'both')
  }

  function applyPreset(kind: 'life' | 'focus' | 'night') {
    triggerHaptic('success')
    if (kind === 'life') {
      updateSettings({
        appearance: 'journal',
        theme: 'matcha',
        fontSize: 'normal',
        reduceMotion: false,
      })
      return
    }
    if (kind === 'focus') {
      updateSettings({
        appearance: 'clean',
        theme: 'moon',
        fontSize: 'small',
        reduceMotion: false,
      })
      return
    }
    updateSettings({
      appearance: 'dark',
      theme: 'moon',
      fontSize: 'normal',
      reduceMotion: true,
    })
  }

  async function checkForUpdate() {
    setUpdateChecking(true)
    setUpdateError(null)
    try {
      const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const manifest = await response.json() as UpdateManifest
      if (!manifest.version || !manifest.apkUrl) throw new Error('manifest')
      setUpdateManifest(manifest)
      triggerHaptic(isNewerVersion(manifest.version, APP_VERSION) ? 'success' : 'tap')
    } catch {
      setUpdateError('暂时没有发现可用的新版本，请稍后再试。')
      setUpdateManifest(null)
      triggerHaptic('warning')
    } finally {
      setUpdateChecking(false)
    }
  }

  function openUpdateUrl(url?: string) {
    const target = url || updateManifest?.releaseUrl || UPDATE_RELEASES_URL
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  if (panel !== 'root') {
    return (
      <div className="stack settings-panel">
        <button className="settings-back" type="button" onClick={returnSettingsHome}>
          <Icon name="back" />
          设置中心
        </button>

        {panel === 'appearance' && (
          <>
            <SectionTitle icon="appearance" title="外观与显示" hint={`${appearanceLabel} · ${themeLabel}`} />
            <div className="appearance-grid">
              {appearanceOptions.map((item) => (
                <button
                  className={settings.appearance === item.key ? `appearance-card ${item.key} active` : `appearance-card ${item.key}`}
                  type="button"
                  key={item.key}
                  onClick={() => updateSettingWithTap({ appearance: item.key })}
                >
                  <span aria-hidden="true" />
                  <Icon name={item.icon} />
                  <strong>{item.label}</strong>
                  <small>{item.desc}</small>
                </button>
              ))}
            </div>

            <SectionTitle icon="heart" title="配色包" />
            <div className="theme-grid">
              {themeOptions.map((item) => (
                <button className={settings.theme === item.key ? `theme-swatch ${item.key} active` : `theme-swatch ${item.key}`} type="button" key={item.key} onClick={() => updateSettingWithTap({ theme: item.key })}>
                  <span />
                  {item.label}
                </button>
              ))}
            </div>

            <SectionTitle icon="type" title="字号" />
            <div className="segmented">
              {fontOptions.map((item) => (
                <button className={settings.fontSize === item.key ? 'active' : ''} key={item.key} type="button" onClick={() => updateSettingWithTap({ fontSize: item.key })}>{item.label}</button>
              ))}
            </div>
          </>
        )}

        {panel === 'modules' && (
          <>
            <SectionTitle icon="modules" title="首页入口" hint={`${homeModuleKeys.length}/${MAX_HOME_MODULES}`} />
            <div className="home-module-settings-grid">
              {homeModuleKeys.map((key, index) => {
                const selected = modules.find((module) => module.key === key) ?? modules[0]
                return (
                  <label key={`${key}-${index}`}>
                    <span>{index + 1}</span>
                    <Icon name={selected.icon} />
                    <select value={key} onChange={(event) => setHomeModuleSlot(index, event.target.value as ModuleKey)}>
                      {modules.map((module) => (
                        <option key={module.key} value={module.key}>{module.title}</option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </div>

            <SectionTitle icon="modules" title="底部导航" hint={`固定 ${navCount}/${MAX_NAV_MODULES} · 共 ${navCount + 2} 项`} />
            <div className="nav-preview-card">
              <small>实时预览</small>
              <div>
                <span><Icon name="home" />今日</span>
                {pinnedModules.slice(0, MAX_NAV_MODULES).map((module) => (
                <span key={module.key}><Icon name={module.icon} />{module.shortTitle}</span>
              ))}
              <span><Icon name="settings" />设置</span>
            </div>
              <p>选择最常用的 3 个功能固定到底栏。</p>
            </div>
            <div className="module-console module-picker-grid">
              {modules.map((module) => (
                <article className={`module-control compact ${settings.moduleModes[module.key]}`} key={module.key}>
                  <button
                    className={`module-pin-card ${settings.moduleModes[module.key] === 'nav' || settings.moduleModes[module.key] === 'both' ? 'active' : ''}`}
                    type="button"
                    disabled={!(settings.moduleModes[module.key] === 'nav' || settings.moduleModes[module.key] === 'both') && navCount >= MAX_NAV_MODULES}
                    onClick={() => togglePinnedModule(module)}
                    aria-pressed={settings.moduleModes[module.key] === 'nav' || settings.moduleModes[module.key] === 'both'}
                  >
                    <span className={`module-icon tone-${module.tone}`}><Icon name={module.icon} /></span>
                    <i>{settings.moduleModes[module.key] === 'nav' || settings.moduleModes[module.key] === 'both' ? '已固定' : navCount >= MAX_NAV_MODULES ? '底栏已满' : '固定到底栏'}</i>
                  </button>
                  <div>
                    <strong>{module.title}</strong>
                    <small>{module.desc}</small>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {panel === 'quick' && (
          <>
            <SectionTitle icon="pen" title="快捷记录" hint={settings.quickPreview ? '识别预览开启' : '直接记录'} />
            <button className={settings.quickPreview ? 'toggle-line active' : 'toggle-line'} type="button" onClick={() => updateSettingWithTap({ quickPreview: !settings.quickPreview })}>
              <Icon name="wand" />
              <span>
                <strong>输入前先确认</strong>
                <small>输入“午饭23元”“周五交作业”会先显示识别结果，再点击记录。</small>
              </span>
            </button>
            <div className="settings-note">
              <Icon name="ledger" />
              <span>快捷记录支持收支、日程、待办和便签：例如“午饭23元”“工资5000”“周五交作业”“明天9点开会”。</span>
            </div>
          </>
        )}

        {panel === 'update' && (
          <>
            <SectionTitle icon="sparkles" title="版本更新" hint={`当前 ${APP_VERSION}`} />
            <section className="update-center-card">
              <div>
                <span className="eyebrow">版本中心</span>
                <strong>{updateManifest ? `发现 ${updateManifest.version}` : `当前版本 ${APP_VERSION}`}</strong>
                <p>
                  {updateManifest
                    ? isNewerVersion(updateManifest.version, APP_VERSION)
                      ? updateManifest.forceUpdate
                        ? '这个版本建议尽快更新，但仍由你手动确认下载安装。'
                        : '发现新版，可按需下载；不喜欢新版也可以回到历史版本。'
                      : '当前已经是最新版本，也可以打开历史版本页回退安装。'
                    : '点击检查后，会查看是否有可下载的新版本。'}
                </p>
              </div>
              <button className="primary-action" type="button" disabled={updateChecking} onClick={() => void checkForUpdate()}>
                {updateChecking ? '检查中...' : '检查新版本'}
              </button>
            </section>
            {updateManifest && (
              <div className="update-release-card">
                <div className="update-release-head">
                  <div>
                    <span className="eyebrow">更新包</span>
                    <strong>拾光清单 {updateManifest.version}</strong>
                    <small>{updateManifest.publishedAt || '已准备好下载'}</small>
                  </div>
                  <span className="update-version-badge">APK</span>
                </div>
                {updateManifest.notes?.length ? (
                  <ul className="update-note-list">
                    {updateManifest.notes.slice(0, 4).map((note) => <li key={note}>{note}</li>)}
                  </ul>
                ) : (
                  <p>这个版本没有填写更新说明。</p>
                )}
                <div className="edit-actions update-release-actions">
                  <button className="primary-action" type="button" onClick={() => openUpdateUrl(updateManifest.apkUrl)}>下载 APK</button>
                  <button className="soft-action" type="button" onClick={() => openUpdateUrl(updateManifest.releaseUrl)}>查看说明</button>
                  <button className="soft-action" type="button" onClick={() => openUpdateUrl(updateManifest.releasesUrl || UPDATE_HISTORY_URL)}>历史版本</button>
                </div>
              </div>
            )}
            {updateError && (
              <div className="form-alert warn">
                <Icon name="bell" />
                <span>{updateError}</span>
              </div>
            )}
            <div className="settings-note">
              <Icon name="lock" />
              <span>发现新版本后可以手动下载；如果不想升级，也可以从历史版本里安装之前的版本。</span>
            </div>
          </>
        )}

        {panel === 'budget' && (
          <>
            <SectionTitle icon="ledger" title="预算提醒" hint={settings.monthlyBudget > 0 ? `${budgetRate}% 已用` : '未设置'} />
            <section className={`settings-budget-card ${budgetLeft < 0 ? 'danger' : budgetRate >= 80 ? 'warn' : 'calm'}`}>
              <div>
                <span className="eyebrow">本月预算</span>
                <strong>{settings.monthlyBudget > 0 ? currency.format(settings.monthlyBudget) : '未设置'}</strong>
                <p>{settings.monthlyBudget > 0 ? budgetLeft >= 0 ? `本月还剩 ${currency.format(budgetLeft)}` : `已超出 ${currency.format(Math.abs(budgetLeft))}` : '设置后会在首页、记账和月报里提醒。'}</p>
              </div>
              <label>
                <span>预算金额</span>
                <input
                  aria-label="月预算金额"
                  inputMode="decimal"
                  value={budgetDraft}
                  onChange={(event) => setBudgetDraft(event.target.value)}
                  onBlur={commitSettingsBudget}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                />
              </label>
            </section>
            <div className="settings-note">
              <Icon name="bell" />
              <span>当预算使用率超过 80% 或超支时，首页“今日提醒”会自动出现预算提醒。</span>
            </div>
          </>
        )}

        {panel === 'data' && (
          <>
            <SectionTitle icon="reset" title="数据与备份" hint={`${recordCount} 条记录`} />
            <div className="data-snapshot-grid">
              <article>
                <span>日程</span>
                <strong>{data.events.length}</strong>
              </article>
              <article>
                <span>账目</span>
                <strong>{data.ledger.length}</strong>
              </article>
              <article>
                <span>清单</span>
                <strong>{data.tasks.length}</strong>
              </article>
              <article>
                <span>便签</span>
                <strong>{data.notes.length}</strong>
              </article>
            </div>
            <div className="settings-note backup-note">
              <Icon name="lock" />
              <span>备份会包含日程、账目、清单、课表、日记、便签与当前外观设置。导入前建议先导出一份当前数据。</span>
            </div>
            <div className="backup-actions">
              <button className="primary-action" type="button" onClick={() => void exportData()}>导出备份</button>
              <button className="soft-action" type="button" onClick={() => importInputRef.current?.click()}>导入备份</button>
              <button
                className="soft-action danger"
                type="button"
                onClick={() => {
                  triggerHaptic('warning')
                  setResetConfirmOpen(true)
                }}
              >
                恢复初始数据
              </button>
              <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportChange} />
            </div>
          </>
        )}

        <BottomSheet
          open={resetConfirmOpen}
          title="恢复初始数据"
          hint="建议先导出一份备份"
          icon="reset"
          tone="rose"
          onClose={() => setResetConfirmOpen(false)}
        >
          <div className="confirm-sheet">
            <p>确定要覆盖当前记录吗？</p>
            <small>这会把日程、账目、清单、课表、日记和便签恢复到初始示例数据。</small>
            <div className="edit-actions">
              <button className="soft-action" type="button" onClick={() => setResetConfirmOpen(false)}>先不恢复</button>
              <button
                className="soft-action danger"
                type="button"
                onClick={() => {
                  triggerHaptic('warning')
                  resetAllData()
                  setResetConfirmOpen(false)
                }}
              >
                恢复
              </button>
            </div>
          </div>
        </BottomSheet>

        {panel === 'motion' && (
          <>
            <SectionTitle icon="motion" title="动效与辅助" />
            <button className={settings.reduceMotion ? 'toggle-line active' : 'toggle-line'} type="button" onClick={() => updateSettingWithTap({ reduceMotion: !settings.reduceMotion })}>
              <span>减少动画</span>
              <strong>{settings.reduceMotion ? '已开启' : '已关闭'}</strong>
            </button>
            <button className="toggle-line" type="button" onClick={() => {
              triggerHaptic('warning')
              updateSettings(defaultSettings)
            }}>
              <span>恢复默认设置</span>
              <strong>重置</strong>
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="stack settings-home">
      <section className="settings-hero">
        <span className="module-icon tone-violet"><Icon name="settings" /></span>
        <div>
          <strong>设置中心</strong>
          <p>{appearanceLabel} · {themeLabel} · 首页 {homeModuleKeys.length} 个入口</p>
        </div>
      </section>

      <div className="settings-overview" aria-label="设置状态概览">
        {settingsOverview.map((item) => (
          <button
            type="button"
            key={item.label}
            onClick={() => openSettingsPanel(item.panel)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>

      <div className="preset-grid preset-strip" aria-label="外观预设">
        <button
          className={settings.appearance === 'journal' ? 'preset-card life active' : 'preset-card life'}
          type="button"
          onClick={() => applyPreset('life')}
          aria-pressed={settings.appearance === 'journal'}
        >
          <Icon name="journal" />
          <span>
            <strong>生活手账</strong>
            <small>温柔记录</small>
          </span>
          <i aria-hidden="true"><b /><b /><b /></i>
        </button>
        <button
          className={settings.appearance === 'clean' ? 'preset-card focus active' : 'preset-card focus'}
          type="button"
          onClick={() => applyPreset('focus')}
          aria-pressed={settings.appearance === 'clean'}
        >
          <Icon name="clean" />
          <span>
            <strong>专注效率</strong>
            <small>清爽紧凑</small>
          </span>
          <i aria-hidden="true"><b /><b /><b /></i>
        </button>
        <button
          className={settings.appearance === 'dark' ? 'preset-card night active' : 'preset-card night'}
          type="button"
          onClick={() => applyPreset('night')}
          aria-pressed={settings.appearance === 'dark'}
        >
          <Icon name="dark" />
          <span>
            <strong>夜间整理</strong>
            <small>低亮安静</small>
          </span>
          <i aria-hidden="true"><b /><b /><b /></i>
        </button>
      </div>

      <div className="settings-entry-list">
        <SettingsEntry icon="ledger" title="预算提醒" value={settings.monthlyBudget > 0 ? `${currency.format(settings.monthlyBudget)} / 已用 ${budgetRate}%` : '未设置'} onClick={() => openSettingsPanel('budget')} />
        <SettingsEntry icon="reset" title="数据与备份" value={`${recordCount} 条记录`} onClick={() => openSettingsPanel('data')} />
        <SettingsEntry icon="sparkles" title="版本更新" value={`当前 ${APP_VERSION}`} onClick={() => openSettingsPanel('update')} />
        <SettingsEntry icon="appearance" title="外观与显示" value={`${appearanceLabel} / ${themeLabel}`} onClick={() => openSettingsPanel('appearance')} />
        <SettingsEntry icon="modules" title="首页与底栏" value={`首页 ${homeModuleKeys.length} 个 / 底栏 ${navCount + 2} 项`} onClick={() => openSettingsPanel('modules')} />
        <SettingsEntry icon="pen" title="快捷记录" value={settings.quickPreview ? '输入时显示识别结果' : '直接提交记录'} onClick={() => openSettingsPanel('quick')} />
        <SettingsEntry icon="motion" title="动效与辅助" value={settings.reduceMotion ? '减少动画' : '柔和动效'} onClick={() => openSettingsPanel('motion')} />
      </div>
    </div>
  )
}

function SettingsEntry({ icon, title, value, onClick }: { icon: IconName; title: string; value: string; onClick: () => void }) {
  return (
    <button className="settings-entry" type="button" onClick={onClick}>
      <span className="module-icon tone-blue"><Icon name={icon} /></span>
      <span>
        <strong>{title}</strong>
        <small>{value}</small>
      </span>
      <Icon name="chevron" />
    </button>
  )
}

function BottomNav({
  active,
  navModules,
  setView,
  onQuickCreate,
  clearLaunchAction,
  appearance,
}: {
  active: ViewKey
  navModules: ModuleMeta[]
  setView: (view: ViewKey, options?: { replace?: boolean }) => void
  onQuickCreate: (view: ViewKey) => void
  clearLaunchAction: () => void
  appearance: AppearanceKey
}) {
  const quickCreateViews = new Set<ViewKey>(['calendar', 'ledger', 'tasks', 'timetable', 'matrix', 'focus', 'journal', 'notes'])
  const longPressTimer = useRef<number | null>(null)
  const longPressHandled = useRef(false)

  const items: { key: ViewKey; title: string; icon: IconName }[] = [
    { key: 'today' as ViewKey, title: '今日', icon: 'home' },
    ...navModules.slice(0, MAX_NAV_MODULES).map((module) => ({ key: module.key as ViewKey, title: module.shortTitle, icon: module.icon })),
    { key: 'settings' as ViewKey, title: '设置', icon: 'settings' as IconName },
  ]

  function clearLongPress() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function startLongPress(item: { key: ViewKey; title: string }) {
    clearLongPress()
    longPressHandled.current = false
    if (!quickCreateViews.has(item.key)) return
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null
      longPressHandled.current = true
      onQuickCreate(item.key)
    }, 430)
  }

  return (
    <nav className="bottom-nav" aria-label="底部导航" style={{ '--nav-count': items.length } as CSSProperties}>
      {items.map((item) => (
        <button
          className={active === item.key ? 'active' : ''}
          key={item.key}
          type="button"
          data-quick-create={quickCreateViews.has(item.key) ? 'true' : undefined}
          onPointerDown={() => startLongPress(item)}
          onPointerLeave={clearLongPress}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
          onContextMenu={(event) => {
            if (!quickCreateViews.has(item.key)) return
            event.preventDefault()
            clearLongPress()
            longPressHandled.current = true
            onQuickCreate(item.key)
          }}
          onClick={() => {
            clearLongPress()
            if (longPressHandled.current) {
              longPressHandled.current = false
              return
            }
            triggerHaptic('tap')
            clearLaunchAction()
            setView(item.key, { replace: true })
          }}
          aria-current={active === item.key ? 'page' : undefined}
          aria-label={quickCreateViews.has(item.key) ? `打开${item.title}，长按新增` : `打开${item.title}`}
        >
          <span><Icon name={item.icon} /></span>
          {quickCreateViews.has(item.key) && <i aria-hidden="true">+</i>}
          {item.title}
        </button>
      ))}
      <i className={`nav-glow ${appearance}`} aria-hidden="true" />
    </nav>
  )
}

function Metric({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="metric">
      <span><Icon name={icon} /> {label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SectionTitle({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <div className="section-title">
      <h2><span><Icon name={icon} /></span>{title}</h2>
      {hint && <em>{hint}</em>}
    </div>
  )
}

function EmptyState({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) {
  if (action && onAction) {
    return (
      <button className="empty-state empty-action" type="button" onClick={onAction}>
        <Icon name="sparkles" />
        <span>{text}</span>
        <strong>{action}</strong>
      </button>
    )
  }

  return (
    <div className="empty-state">
      <Icon name="sparkles" />
      <span>{text}</span>
    </div>
  )
}

function ConfirmSheet({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingDelete
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <BottomSheet
      open={!!pending}
      title="确认删除"
      hint="删除后无法恢复"
      icon={pending?.icon ?? 'sparkles'}
      tone={pending?.tone ?? 'rose'}
      onClose={onCancel}
    >
      <div className="confirm-sheet">
        <p>要删除「{pending?.title}」吗？</p>
        {pending?.detail && <small>{pending.detail}</small>}
        <div className="edit-actions">
          <button className="soft-action" type="button" onClick={onCancel}>再想想</button>
          <button className="soft-action danger" type="button" onClick={onConfirm}>删除</button>
        </div>
      </div>
    </BottomSheet>
  )
}

function BottomSheet({
  open,
  title,
  hint,
  icon,
  tone = 'blue',
  onClose,
  autoFocusFirst = false,
  confirmOnDirty = false,
  children,
}: {
  open: boolean
  title: string
  hint?: string
  icon: IconName
  tone?: string
  onClose: () => void
  autoFocusFirst?: boolean
  confirmOnDirty?: boolean
  children: ReactNode
}) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDirty, setIsDirty] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const sheetRef = useRef<HTMLElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const requestClose = useCallback(() => {
    if (confirmOnDirty && isDirty) {
      setShowCloseConfirm(true)
      return
    }
    onClose()
  }, [confirmOnDirty, isDirty, onClose])

  const discardAndClose = useCallback(() => {
    setShowCloseConfirm(false)
    setIsDirty(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => {
      window.setTimeout(() => previousFocusRef.current?.focus({ preventScroll: true }), 0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleBackRequest(event: Event) {
      event.preventDefault()
      requestClose()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = [...(sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? [])].filter((element) => element.offsetParent !== null)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) {
        event.preventDefault()
        return
      }

      const active = document.activeElement
      const focusOutsideSheet = active instanceof Node && !sheetRef.current?.contains(active)
      if (event.shiftKey && (active === first || focusOutsideSheet)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || focusOutsideSheet)) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('shiguang:back-request', handleBackRequest)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('shiguang:back-request', handleBackRequest)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, requestClose])

  useEffect(() => {
    if (!open) {
      setDragOffset(0)
      setIsDirty(false)
      setShowCloseConfirm(false)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setIsDirty(false)
      setShowCloseConfirm(false)
    }
  }, [open, title])

  useEffect(() => {
    if (!open || !autoFocusFirst) return
    const timeout = window.setTimeout(() => {
      const target = sheetRef.current?.querySelector<HTMLElement>(
        '[autofocus], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
      )
      target?.focus({ preventScroll: true })
    }, 220)
    return () => window.clearTimeout(timeout)
  }, [autoFocusFirst, open, title])

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target.closest('button, input, select, textarea, .sheet-body')) return
    if (!target.closest('.sheet-handle, .sheet-header')) return
    dragStartY.current = event.clientY
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragStartY.current === null) return
    setDragOffset(Math.max(0, event.clientY - dragStartY.current))
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragStartY.current === null) return
    const shouldClose = dragOffset > 142 || event.clientY - dragStartY.current > 168
    dragStartY.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (shouldClose) {
      setDragOffset(0)
      requestClose()
      return
    }
    setDragOffset(0)
  }

  function cancelDrag(event: ReactPointerEvent<HTMLElement>) {
    dragStartY.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    setDragOffset(0)
  }

  if (!open) return null

  return (
    <div className="sheet-layer">
      <button className="sheet-backdrop" type="button" aria-label="关闭弹层" onClick={requestClose} />
      <section
        ref={sheetRef}
        className={dragOffset > 0 ? 'bottom-sheet dragging' : 'bottom-sheet'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ '--sheet-drag': `${dragOffset}px` } as CSSProperties}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onInputCapture={() => setIsDirty(true)}
        onChangeCapture={() => setIsDirty(true)}
      >
        <span className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <span className={`module-icon tone-${tone}`}><Icon name={icon} /></span>
          <div>
            <strong>{title}</strong>
            {hint && <small>{hint}</small>}
          </div>
          <button className="sheet-close-button" type="button" onClick={requestClose} aria-label="关闭">×</button>
        </div>
        {showCloseConfirm && (
          <div className="sheet-dirty-confirm" role="status">
            <Icon name="bell" />
            <span>还有未保存内容</span>
            <button type="button" onClick={() => setShowCloseConfirm(false)}>继续编辑</button>
            <button type="button" onClick={discardAndClose}>放弃关闭</button>
          </div>
        )}
        <div className="sheet-body">
          {children}
        </div>
      </section>
    </div>
  )
}

function useLocalData() {
  const [data, setData] = useState<AppData>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData

    try {
      const parsed = JSON.parse(raw) as Partial<AppData> | StoredAppData
      const storedVersion = isStoredAppData(parsed) ? parsed.version : 0
      return migrateAppData(isStoredAppData(parsed) ? parsed.data : parsed, storedVersion)
    } catch {
      return seedData
    }
  })
  const initialDataRef = useRef(data)
  const hasHydratedNativeStore = useRef(false)

  useEffect(() => {
    let cancelled = false

    Preferences.get({ key: STORAGE_KEY })
      .then(({ value }) => {
        if (cancelled) return

        if (!value) {
          const payload = JSON.stringify({ version: STORAGE_VERSION, data: initialDataRef.current })
          void Preferences.set({ key: STORAGE_KEY, value: payload })
          return
        }

        const parsed = JSON.parse(value) as Partial<AppData> | StoredAppData
        const storedVersion = isStoredAppData(parsed) ? parsed.version : 0
        const nextData = migrateAppData(isStoredAppData(parsed) ? parsed.data : parsed, storedVersion)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, data: nextData }))
        setData(nextData)
      })
      .catch(() => {
        // Keep the web preview usable if the native bridge is unavailable.
      })
      .finally(() => {
        hasHydratedNativeStore.current = true
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const payload = JSON.stringify({ version: STORAGE_VERSION, data })
    localStorage.setItem(STORAGE_KEY, payload)
    if (!hasHydratedNativeStore.current) return

    Preferences.set({ key: STORAGE_KEY, value: payload }).catch(() => {
      // localStorage remains the fallback persistence layer.
    })
  }, [data])

  useEffect(() => {
    let cancelled = false
    let removeAppStateListener: (() => void) | undefined

    function persistSnapshot() {
      const payload = JSON.stringify({ version: STORAGE_VERSION, data })
      localStorage.setItem(STORAGE_KEY, payload)
      if (hasHydratedNativeStore.current) {
        void Preferences.set({ key: STORAGE_KEY, value: payload })
      }
    }

    window.addEventListener('pagehide', persistSnapshot)
    import('@capacitor/app')
      .then(({ App: CapacitorApp }) =>
        CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) persistSnapshot()
        }),
      )
      .then((listener) => {
        if (cancelled) {
          void listener.remove()
          return
        }
        removeAppStateListener = () => void listener.remove()
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      window.removeEventListener('pagehide', persistSnapshot)
      removeAppStateListener?.()
    }
  }, [data])

  return [data, setData] as const
}

function isStoredAppData(value: Partial<AppData> | StoredAppData): value is StoredAppData {
  return 'data' in value && typeof value.data === 'object'
}

function listOrSeed<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function recordsOrSeed<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? value.filter(isRecord) as T[] : fallback
}

function textOrFallback(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function dateOrFallback(value: unknown, fallback = todayIso) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback
}

function timeOrFallback(value: unknown, fallback = '09:00') {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback
}

function numberOrFallback(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const next = Number(value)
  return Number.isFinite(next) ? Math.min(max, Math.max(min, next)) : fallback
}

function idOrNew(value: unknown) {
  return textOrFallback(value, cryptoId())
}

function migrateAppData(parsed: Partial<AppData>, storedVersion = STORAGE_VERSION): AppData {
  const importedSettings: Partial<AppSettings> = parsed.settings ?? {}
  const importedModuleModes = (parsed.settings?.moduleModes ?? {}) as Partial<Record<ModuleKey, ModuleMode>>
  const moduleModes = storedVersion < 2
    ? { ...defaultSettings.moduleModes }
    : modules.reduce<Record<ModuleKey, ModuleMode>>((acc, module) => {
        const importedMode = importedModuleModes[module.key]
        const nextMode = importedMode && validModuleModes.has(importedMode) ? importedMode : defaultSettings.moduleModes[module.key]
        const alreadyPinned = Object.values(acc).filter((mode) => mode === 'nav' || mode === 'both').length
        acc[module.key] = (nextMode === 'nav' || nextMode === 'both') && alreadyPinned >= MAX_NAV_MODULES ? 'home' : nextMode
        return acc
      }, { ...defaultSettings.moduleModes })
  const monthlyBudget = Number(importedSettings.monthlyBudget)
  const settings: AppSettings = {
    ...defaultSettings,
    ...importedSettings,
    appearance: validAppearanceKeys.has(importedSettings.appearance as AppearanceKey) ? importedSettings.appearance as AppearanceKey : defaultSettings.appearance,
    theme: validThemeKeys.has(importedSettings.theme as ThemeKey) ? importedSettings.theme as ThemeKey : defaultSettings.theme,
    fontSize: validFontSizeKeys.has(importedSettings.fontSize as FontSizeKey) ? importedSettings.fontSize as FontSizeKey : defaultSettings.fontSize,
    reduceMotion: typeof importedSettings.reduceMotion === 'boolean' ? importedSettings.reduceMotion : defaultSettings.reduceMotion,
    quickPreview: typeof importedSettings.quickPreview === 'boolean' ? importedSettings.quickPreview : defaultSettings.quickPreview,
    monthlyBudget: Number.isFinite(monthlyBudget) && monthlyBudget >= 0 ? Math.round(monthlyBudget) : defaultSettings.monthlyBudget,
    moduleModes,
    homeModules: normalizeHomeModules(importedSettings.homeModules),
  }
  const timetableSlots = normalizeTimetableSlots(parsed.timetableSlots)
  const timetableProfiles = normalizeTimetableProfiles(parsed.timetableProfiles, timetableSlots)
  const semesters = normalizeSemesters(parsed.semesters, timetableProfiles, recordsOrSeed(parsed.courses, seedData.courses))

  return {
    ...seedData,
    ...parsed,
    events: recordsOrSeed(parsed.events, seedData.events).map((event) => ({
      id: idOrNew(event.id),
      title: textOrFallback(event.title, '未命名日程'),
      date: dateOrFallback(event.date),
      start: timeOrFallback(event.start, '09:00'),
      end: timeOrFallback(event.end, '10:00'),
      category: textOrFallback(event.category, '生活'),
      note: typeof event.note === 'string' ? event.note : '',
    })),
    ledger: recordsOrSeed(parsed.ledger, seedData.ledger).map((item) => ({
      id: idOrNew(item.id),
      title: textOrFallback(item.title, '未命名账目'),
      amount: numberOrFallback(item.amount, 0, 0),
      type: validLedgerTypes.has(item.type) ? item.type : 'expense',
      category: textOrFallback(item.category, item.type === 'income' ? '收入' : '其他'),
      date: dateOrFallback(item.date),
      note: typeof item.note === 'string' ? item.note : '',
    })),
    tasks: recordsOrSeed(parsed.tasks, seedData.tasks).map((task) => ({
      id: idOrNew(task.id),
      title: textOrFallback(task.title, '未命名清单'),
      due: dateOrFallback(task.due),
      priority: validPriorities.has(task.priority) ? task.priority : 'medium',
      list: textOrFallback(task.list, '生活'),
      done: typeof task.done === 'boolean' ? task.done : false,
      important: typeof task.important === 'boolean' ? task.important : task.priority === 'high',
      urgent: typeof task.urgent === 'boolean' ? task.urgent : dateOrFallback(task.due) <= todayIso,
    })),
    habits: recordsOrSeed(parsed.habits, seedData.habits).map((habit) => ({
      id: idOrNew(habit.id),
      title: textOrFallback(habit.title, '未命名习惯'),
      color: textOrFallback(habit.color, 'mint'),
      days: listOrSeed(habit.days, []).filter((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)),
    })),
    timetableSlots,
    timetableProfiles,
    semesters,
    courses: recordsOrSeed(parsed.courses, seedData.courses).map((course) => {
      const slot = Math.round(numberOrFallback(course.slot, getSlotFromTime(timeOrFallback(course.start, '09:00'), timetableSlots), 1, timetableSlots.length))
      const slotPosition = Math.max(0, timetableSlots.findIndex((item) => item.index === slot))
      const maxSpan = Math.max(1, timetableSlots.length - slotPosition)
      const slotSpan = Math.round(numberOrFallback(course.slotSpan, getSlotSpanFromTimes(course.start, course.end, timetableSlots), 1, maxSpan))
      const time = getCourseSlotTime(slot, slotSpan, timetableSlots)
      const startWeek = Math.round(numberOrFallback(course.startWeek, 1, 1, 30))
      const endWeek = Math.round(numberOrFallback(course.endWeek, 18, 1, 30))
      const importedRule = course.weekRule
      const weekRule: WeekRule = importedRule === 'odd' || importedRule === 'even' || importedRule === 'range' || importedRule === 'custom' ? importedRule : 'all'
      const importedWeeks = listOrSeed(course.weeks, [])
        .map((week) => Math.round(numberOrFallback(week, 1, 1, 30)))
        .filter((week, index, arr) => arr.indexOf(week) === index)
        .sort((a, b) => a - b)
      return {
        id: idOrNew(course.id),
        title: textOrFallback(course.title, '未命名课程'),
        shortTitle: textOrFallback(course.shortTitle, getCourseShortTitle(textOrFallback(course.title, '课'))),
        semester: textOrFallback(course.semester, getSemesterCode(todayIso)),
        day: Math.round(numberOrFallback(course.day, 1, 1, 7)),
        slot,
        slotSpan,
        start: typeof course.customTime === 'boolean' && course.customTime ? timeOrFallback(course.start, time.start) : time.start,
        end: typeof course.customTime === 'boolean' && course.customTime ? timeOrFallback(course.end, time.end) : time.end,
        startWeek,
        endWeek,
        weekRule,
        weeks: weekRule === 'custom' && importedWeeks.length ? importedWeeks : buildWeekList(startWeek, endWeek, weekRule),
        customTime: typeof course.customTime === 'boolean' ? course.customTime : false,
        place: typeof course.place === 'string' ? course.place : '',
        teacher: typeof course.teacher === 'string' ? course.teacher : '',
        color: textOrFallback(course.color, 'blue'),
      }
    }),
    countdowns: recordsOrSeed(parsed.countdowns, seedData.countdowns).map((item) => ({
      id: idOrNew(item.id),
      title: textOrFallback(item.title, '未命名倒数日'),
      date: dateOrFallback(item.date, addDays(today, 7)),
      type: textOrFallback(item.type, '纪念日'),
      color: textOrFallback(item.color, 'rose'),
    })),
    focusSessions: recordsOrSeed(parsed.focusSessions, seedData.focusSessions).map((session) => ({
      id: idOrNew(session.id),
      date: dateOrFallback(session.date),
      focusMinutes: Math.round(numberOrFallback(session.focusMinutes, 25, 1, 240)),
      breakMinutes: Math.round(numberOrFallback(session.breakMinutes, 5, 1, 120)),
      scholarMode: typeof session.scholarMode === 'boolean' ? session.scholarMode : false,
      completed: typeof session.completed === 'boolean' ? session.completed : false,
      note: typeof session.note === 'string' ? session.note : '',
    })),
    journalEntries: recordsOrSeed(parsed.journalEntries, seedData.journalEntries).map((entry) => ({
      id: idOrNew(entry.id),
      date: dateOrFallback(entry.date),
      mood: textOrFallback(entry.mood, '🙂'),
      title: textOrFallback(entry.title, '今日记录'),
      body: typeof entry.body === 'string' ? entry.body : '',
      weather: typeof entry.weather === 'string' ? entry.weather : '',
    })),
    notes: recordsOrSeed(parsed.notes, seedData.notes).map((note) => ({
      id: idOrNew(note.id),
      title: textOrFallback(note.title, '未命名便签'),
      body: typeof note.body === 'string' ? note.body : '',
      color: textOrFallback(note.color, 'cream'),
      pinned: typeof note.pinned === 'boolean' ? note.pinned : false,
      updatedAt: dateOrFallback(note.updatedAt),
    })),
    settings,
  }
}

const weekNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return toIsoDate(next)
}

function addMonthsClamped(date: Date, months: number) {
  const next = new Date(date)
  const targetDay = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(targetDay, lastDay))
  return toIsoDate(next)
}

function dayIndex(date: Date) {
  return date.getDay() || 7
}

function getWeekDays(date: string) {
  const base = new Date(`${date}T12:00:00`)
  const day = base.getDay() || 7
  const monday = new Date(base)
  monday.setDate(base.getDate() - day + 1)
  return Array.from({ length: 7 }, (_, index) => {
    const item = new Date(monday)
    item.setDate(monday.getDate() + index)
    return { iso: toIsoDate(item), label: ['一', '二', '三', '四', '五', '六', '日'][index] }
  })
}

function getSemesterCode(date: string) {
  return `${date.slice(0, 4)}${Number(date.slice(5, 7)) < 8 ? '01' : '02'}`
}

function getSemesterStartDate(date: string) {
  const year = date.slice(0, 4)
  return `${year}-${Number(date.slice(5, 7)) < 8 ? '02' : '09'}-01`
}

function buildWeekList(startWeek: number, endWeek: number, rule: WeekRule = 'all') {
  const start = Math.max(1, Math.min(startWeek, endWeek))
  const end = Math.max(startWeek, endWeek)
  const weeks = Array.from({ length: end - start + 1 }, (_, index) => start + index)
  if (rule === 'odd') return weeks.filter((week) => week % 2 === 1)
  if (rule === 'even') return weeks.filter((week) => week % 2 === 0)
  return weeks
}

function getCourseWeeks(course: CourseItem) {
  if (course.weekRule === 'custom' && course.weeks.length) return [...new Set(course.weeks)].sort((a, b) => a - b)
  return buildWeekList(course.startWeek || 1, course.endWeek || 18, course.weekRule || 'all')
}

function courseIsActiveInWeek(course: CourseItem, week: number) {
  return getCourseWeeks(course).includes(week)
}

function weekSetsOverlap(a: number[], b: number[]) {
  const bSet = new Set(b)
  return a.some((week) => bSet.has(week))
}

function getLedgerStats(items: LedgerItem[]) {
  const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const expense = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const topCategory = Object.entries(
    items.filter((item) => item.type === 'expense').reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.amount
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0]
  return { income, expense, balance: income - expense, topCategory }
}

function buildDailyReminders(
  data: AppData,
  selectedDate: string,
  stats: { income: number; expense: number; topCategory?: [string, number] },
  events: EventItem[],
) {
  const reminders: string[] = []
  const overdue = data.tasks.filter((task) => !task.done && task.due < todayIso).length
  const dueToday = data.tasks.filter((task) => !task.done && task.due === selectedDate).length
  const pendingHabits = data.habits.filter((habit) => !habit.days.includes(selectedDate)).length
  const todayCourses = data.courses.filter((course) => course.day === dayIndex(new Date(`${selectedDate}T12:00:00`))).length
  const nearest = sortedCountdowns(data.countdowns)[0]
  const monthlyBudget = data.settings.monthlyBudget
  const budgetRate = monthlyBudget > 0 ? Math.round((stats.expense / monthlyBudget) * 100) : 0
  const budgetLeft = monthlyBudget - stats.expense

  if (overdue) reminders.push(`有 ${overdue} 个待办已经过期，可以先清掉最小的一项。`)
  if (dueToday) reminders.push(`今天有 ${dueToday} 个待办到期，适合放进固定时间块。`)
  if (monthlyBudget > 0 && budgetLeft < 0) reminders.push(`本月预算已超出 ${currency.format(Math.abs(budgetLeft))}，可以先看一下高频支出。`)
  if (monthlyBudget > 0 && budgetLeft >= 0 && budgetRate >= 80) reminders.push(`本月预算已用 ${budgetRate}%，还剩 ${currency.format(budgetLeft)}。`)
  if (todayCourses) reminders.push(`今天有 ${todayCourses} 节课，课前可以提前 10 分钟准备。`)
  if (!events.length) reminders.push('今天还没有日程安排，可以留一个专注块给重要事项。')
  if (pendingHabits) reminders.push(`还有 ${pendingHabits} 个习惯没打卡，点一下就能补上。`)
  if (nearest) reminders.push(`${nearest.title} 还有 ${daysBetween(todayIso, nearest.date)} 天。`)
  if (stats.topCategory) reminders.push(`本月支出最多的是${stats.topCategory[0]}，已经花了 ${currency.format(stats.topCategory[1])}。`)
  return reminders.slice(0, 4)
}

function getCourseShortTitle(title: string) {
  const clean = title.trim()
  if (!clean) return '课'
  const known: Record<string, string> = {
    数学: '数',
    语文: '语',
    英语: '英',
    物理: '物',
    化学: '化',
    生物: '生',
    历史: '史',
    地理: '地',
    政治: '政',
    体育: '体',
    音乐: '音',
    美术: '美',
    计算机: '计',
    信息技术: '信',
  }
  const matched = Object.entries(known).find(([name]) => clean.includes(name))
  if (matched) return matched[1]
  const letters = clean.match(/[A-Za-z]+/g)?.join('')
  if (letters) return letters.slice(0, 2).toUpperCase()
  return Array.from(clean).slice(0, 2).join('')
}

function formTitleKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function getSemesterWeek(date: string, semester?: SemesterConfig) {
  const current = new Date(`${date}T12:00:00`)
  const start = new Date(`${semester?.startDate ?? getSemesterStartDate(date)}T12:00:00`)
  const diff = Math.floor((current.getTime() - start.getTime()) / 86_400_000)
  return Math.min(semester?.totalWeeks ?? 30, Math.max(1, Math.floor(diff / 7) + 1))
}

function normalizeTimetableSlots(value: unknown): TimetableSlot[] {
  if (!Array.isArray(value)) return defaultTimetableSlots.map((slot) => ({ ...slot }))
  const normalized: TimetableSlot[] = []
  value.forEach((slot, index) => {
    if (!slot || typeof slot !== 'object') return
    const candidate = slot as Partial<TimetableSlot>
    const group = ['morning', 'afternoon', 'evening', 'custom'].includes(candidate.group ?? '')
      ? candidate.group as TimetableSlot['group']
      : defaultTimetableSlots[index]?.group ?? 'custom'
    normalized.push({
      index: Math.round(numberOrFallback(candidate.index, index + 1, 1, 20)),
      label: textOrFallback(candidate.label, `${index + 1}`),
      group,
      start: timeOrFallback(candidate.start, defaultTimetableSlots[index]?.start ?? '08:00'),
      end: timeOrFallback(candidate.end, defaultTimetableSlots[index]?.end ?? '08:45'),
    })
  })
  normalized.sort((a, b) => a.index - b.index)
  const reindexed = normalized.map((slot, index) => ({ ...slot, index: index + 1 }))
  return reindexed.length ? reindexed : defaultTimetableSlots.map((slot) => ({ ...slot }))
}

function normalizeTimetableProfiles(value: unknown, fallbackSlots: TimetableSlot[] = defaultTimetableSlots): TimetableProfile[] {
  const fallback = fallbackSlots.length ? fallbackSlots : defaultTimetableSlots
  const rawProfiles = Array.isArray(value) ? value.filter(isRecord) as Partial<TimetableProfile>[] : []
  const profiles = rawProfiles.map((profile, index) => {
    const slots = normalizeTimetableSlots(profile.slots?.length ? profile.slots : fallback)
    return {
      id: textOrFallback(profile.id, `profile-${index + 1}`),
      name: textOrFallback(profile.name, index === 0 ? '自定义作息' : `作息 ${index + 1}`),
      slots,
      showWeekend: typeof profile.showWeekend === 'boolean' ? profile.showWeekend : false,
    }
  })
  return profiles.length ? profiles : [
    {
      id: 'standard',
      name: '自定义作息',
      slots: normalizeTimetableSlots(fallback),
      showWeekend: false,
    },
    ...defaultTimetableProfiles.slice(1).map((profile) => ({
      ...profile,
      slots: profile.slots.map((slot) => ({ ...slot })),
    })),
  ]
}

function normalizeSemesters(value: unknown, profiles: TimetableProfile[], courses: CourseItem[] = []): SemesterConfig[] {
  const profileId = profiles[0]?.id ?? 'standard'
  const rawSemesters = Array.isArray(value) ? value.filter(isRecord) as Partial<SemesterConfig>[] : []
  const semesterCodes = new Set([
    defaultSemesterCode,
    ...courses.map((course) => course.semester || defaultSemesterCode),
    ...rawSemesters.map((semester) => semester.code || defaultSemesterCode),
  ])
  const normalized = Array.from(semesterCodes).map((code) => {
    const imported = rawSemesters.find((semester) => semester.code === code)
    const visibleDays = listOrSeed(imported?.visibleDays, [1, 2, 3, 4, 5])
      .map((day) => Math.round(numberOrFallback(day, 1, 1, 7)))
      .filter((day, index, arr) => arr.indexOf(day) === index)
      .sort((a, b) => a - b)
    const totalWeeks = Math.round(numberOrFallback(imported?.totalWeeks, 18, 1, 30))
    return {
      code,
      name: textOrFallback(imported?.name, `${code.slice(0, 4)}-${code.endsWith('01') ? '春' : '秋'}季学期`),
      startDate: dateOrFallback(imported?.startDate, getSemesterStartDate(todayIso)),
      totalWeeks,
      profileId: profiles.some((profile) => profile.id === imported?.profileId) ? imported?.profileId as string : profileId,
      visibleDays: visibleDays.length ? visibleDays : [1, 2, 3, 4, 5],
      currentWeek: imported?.currentWeek ? Math.round(numberOrFallback(imported.currentWeek, 1, 1, totalWeeks)) : undefined,
    }
  })
  return normalized.length ? normalized : defaultSemesters.map((semester) => ({ ...semester, profileId, visibleDays: [...semester.visibleDays] }))
}

function timeToMinutes(value: unknown) {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function minutesToTime(value: number) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatWeekRule(startWeek: number, endWeek: number, rule: WeekRule = 'all') {
  const start = Math.min(startWeek, endWeek)
  const end = Math.max(startWeek, endWeek)
  const label = rule === 'odd' ? '单周' : rule === 'even' ? '双周' : rule === 'custom' ? '指定周' : '每周'
  return `${start}-${end} 周 · ${label}`
}

function getSlotFromTime(start: string, slots = defaultTimetableSlots) {
  const exact = slots.find((slot) => slot.start === start)
  if (exact) return exact.index
  const targetMinutes = timeToMinutes(start)
  if (targetMinutes === null) return slots[0]?.index ?? 1
  const sorted = [...slots].sort((a, b) => {
    const aMinutes = timeToMinutes(a.start) ?? targetMinutes
    const bMinutes = timeToMinutes(b.start) ?? targetMinutes
    return Math.abs(aMinutes - targetMinutes) - Math.abs(bMinutes - targetMinutes)
  })
  return sorted[0]?.index ?? 1
}

function getSlotSpanFromTimes(start: unknown, end: unknown, slots = defaultTimetableSlots) {
  if (typeof start !== 'string' || typeof end !== 'string') return 1
  const startSlot = getSlotFromTime(start, slots)
  const startIndex = slots.findIndex((slot) => slot.index === startSlot)
  if (startIndex < 0) return 1
  const targetEnd = timeToMinutes(end)
  if (targetEnd === null) return 1
  const endIndex = slots.findIndex((slot, index) =>
    index >= startIndex && (timeToMinutes(slot.end) ?? 0) >= targetEnd,
  )
  if (endIndex < startIndex) return 1
  return endIndex - startIndex + 1
}

function getCourseSlotTime(slotIndex: number, slotSpan: number, slots = defaultTimetableSlots) {
  const startPosition = Math.max(0, slots.findIndex((slot) => slot.index === slotIndex))
  const endPosition = Math.min(slots.length - 1, startPosition + Math.max(1, slotSpan) - 1)
  return {
    start: slots[startPosition]?.start ?? '08:00',
    end: slots[endPosition]?.end ?? slots[startPosition]?.end ?? '08:45',
  }
}

function formatSlotRange(slotIndex: number, slotSpan = 1) {
  return slotSpan > 1 ? `${slotIndex}-${slotIndex + slotSpan - 1}` : `${slotIndex}`
}

function occupiedSlotsForCourse(course: CourseItem, slots = defaultTimetableSlots) {
  const start = course.slot || getSlotFromTime(course.start, slots)
  const span = Math.max(1, course.slotSpan || 1)
  const startPosition = Math.max(0, slots.findIndex((slot) => slot.index === start))
  return slots.slice(startPosition, startPosition + span).map((slot) => slot.index)
}

function weeksOverlap(course: CourseItem, startWeek: number, endWeek: number) {
  const courseStartWeek = course.startWeek || 1
  const courseEndWeek = course.endWeek || 18
  const normalizedStart = Math.min(startWeek, endWeek)
  const normalizedEnd = Math.max(startWeek, endWeek)
  return normalizedStart <= courseEndWeek && normalizedEnd >= courseStartWeek
}

function nextEmptySlot(
  courses: CourseItem[],
  day: number,
  slots = defaultTimetableSlots,
  startWeek = 1,
  endWeek = 30,
) {
  const used = new Set(
    courses
      .filter((course) => course.day === day && weeksOverlap(course, startWeek, endWeek))
      .flatMap((course) => occupiedSlotsForCourse(course, slots)),
  )
  return slots.find((slot) => !used.has(slot.index))?.index ?? slots[0]?.index ?? 1
}

function searchLedger(item: LedgerItem, query: string) {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return [item.title, item.category, item.note, item.date].some((value) => value.toLowerCase().includes(term))
}

function previewQuickText(text: string, selectedDate: string): { icon: IconName; text: string; view: QuickCaptureTarget; tone?: 'income' | 'expense' } | null {
  const value = text.trim()
  if (!value) return null

  const ledger = parseQuickLedger(value, selectedDate)
  if (ledger) {
    return {
      icon: 'ledger',
      view: 'ledger',
      text: `将记录为${ledger.type === 'expense' ? '支出' : '收入'}：${ledger.title} ${currency.format(ledger.amount)}`,
      tone: ledger.type,
    }
  }

  const event = parseQuickEvent(value, selectedDate)
  if (event) {
    return {
      icon: 'calendar',
      view: 'calendar',
      text: `将加入日程：${event.date} ${event.start} ${event.title}`,
    }
  }

  const task = parseQuickTask(value, selectedDate)
  if (task) {
    return {
      icon: task.due === selectedDate ? 'tasks' : 'calendar',
      view: 'tasks',
      text: `将加入清单：${task.due} · ${task.title}`,
    }
  }

  return {
    icon: 'notes',
    view: 'notes',
    text: `将存为便签：${value.slice(0, 18)}`,
  }
}

function formatShortCurrency(value: number) {
  if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`
  return `¥${Math.round(value)}`
}

function isNewerVersion(nextVersion: string, currentVersion: string) {
  const nextParts = nextVersion.split('.').map((part) => Number(part.replace(/\D/g, '')) || 0)
  const currentParts = currentVersion.split('.').map((part) => Number(part.replace(/\D/g, '')) || 0)
  const length = Math.max(nextParts.length, currentParts.length)
  for (let index = 0; index < length; index += 1) {
    const next = nextParts[index] ?? 0
    const current = currentParts[index] ?? 0
    if (next > current) return true
    if (next < current) return false
  }
  return false
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function taskToQuadrant(task: Pick<TaskItem, 'important' | 'urgent'>): Quadrant {
  if (task.important && task.urgent) return 'urgentImportant'
  if (task.important) return 'important'
  if (task.urgent) return 'urgent'
  return 'later'
}

function taskToQuadrantLabel(task: Pick<TaskItem, 'important' | 'urgent'>) {
  return {
    urgentImportant: '重要紧急',
    important: '重要不急',
    urgent: '紧急不重要',
    later: '不急不重要',
  }[taskToQuadrant(task)]
}

function quadrantToFlags(quadrant: Quadrant): Pick<TaskItem, 'important' | 'urgent'> {
  return {
    urgentImportant: { important: true, urgent: true },
    important: { important: true, urgent: false },
    urgent: { important: false, urgent: true },
    later: { important: false, urgent: false },
  }[quadrant]
}

function sortedCountdowns(items: CountdownItem[]) {
  return [...items].sort((a, b) => {
    const aDays = daysBetween(todayIso, a.date)
    const bDays = daysBetween(todayIso, b.date)
    const aIsPast = aDays < 0
    const bIsPast = bDays < 0

    if (aIsPast !== bIsPast) return aIsPast ? 1 : -1
    if (aIsPast) return bDays - aDays
    return aDays - bDays
  })
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T00:00:00`).getTime()
  return Math.ceil((end - start) / 86400000)
}

function cryptoId() {
  if ('crypto' in window && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default App

