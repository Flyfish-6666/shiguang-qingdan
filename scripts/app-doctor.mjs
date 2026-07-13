import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const appSource = readText('src/App.tsx')
const appStyles = readText('src/App.css')
const quickCaptureSource = readText('src/quickCapture.ts')
const capacitorConfig = readText('capacitor.config.ts')
const serviceWorker = readText('public/sw.js')
const manifest = JSON.parse(readText('public/manifest.webmanifest'))

const shortcutViews = ['calendar', 'ledger', 'tasks', 'focus', 'journal', 'notes']
const shortcutComponents = {
  calendar: 'CalendarView',
  ledger: 'LedgerView',
  tasks: 'TasksView',
  focus: 'FocusView',
  journal: 'JournalView',
  notes: 'NotesView',
}
const appShellAssets = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/icons.svg',
]
const requiredFiles = [
  'src/App.tsx',
  'src/quickCapture.ts',
  'capacitor.config.ts',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/icon-192.png',
  'public/icon-512.png',
  'public/apple-touch-icon.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  'android/app/src/main/res/drawable-port-xxxhdpi/splash.png',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
]
const forbiddenTemplateFiles = [
  'src/assets/vite.svg',
]
const nativeMetadataFiles = [
  'capacitor.config.ts',
  'android/app/src/main/res/values/strings.xml',
  'android/app/src/main/assets/capacitor.config.json',
  'ios/App/App/Info.plist',
  'ios/App/App/capacitor.config.json',
]
const appName = '\u62fe\u5149\u6e05\u5355'
const mojibakePattern = /[\u93f7\u60e7\u539c\u5a93\u5445\u5d1f\ufffd]/u

let failed = false

function readText(path) {
  return readFileSync(join(root, path), 'utf8')
}

function check(label, ok, detail = '') {
  const mark = ok ? '[OK]' : '[!!]'
  console.log(`${mark} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failed = true
}

function shortcutFor(view) {
  return manifest.shortcuts?.find((shortcut) => shortcut.url === `/?view=${view}&action=new`)
}

function shortcutRouteIsWired(view) {
  const component = shortcutComponents[view]
  const routePattern = new RegExp(
    `view === '${view}'[\\s\\S]*?<${component}[\\s\\S]*?autoOpen=\\{launchAction === 'new'\\}[\\s\\S]*?syncViewUrl\\('${view}'\\)`,
  )
  return routePattern.test(appSource)
}

console.log('拾光清单 App 一致性自检')
console.log('------------------------')

check('manifest 名称', manifest.name === '拾光清单', manifest.name)
check('manifest 展示模式', manifest.display === 'standalone', manifest.display)
check('manifest 竖屏锁定', manifest.orientation === 'portrait', manifest.orientation)
check('Capacitor App ID', capacitorConfig.includes("appId: 'com.shiguang.qingdan'"), 'com.shiguang.qingdan')
check('Capacitor App 名称', capacitorConfig.includes("appName: '拾光清单'"), '拾光清单')
check('Capacitor Web 目录', capacitorConfig.includes("webDir: 'dist'"), 'dist')
check('service worker 缓存版本', /shiguang-list-v\d+/.test(serviceWorker.match(/CACHE_NAME = '([^']+)'/)?.[1] ?? ''))
nativeMetadataFiles.forEach((file) => {
  const text = existsSync(join(root, file)) ? readText(file) : ''
  check(`原生元信息 ${file}`, text.includes(appName), appName)
  check(`原生元信息无乱码 ${file}`, !mojibakePattern.test(text))
})

requiredFiles.forEach((file) => check(`关键文件 ${file}`, existsSync(join(root, file))))
forbiddenTemplateFiles.forEach((file) => check(`模板残留 ${file}`, !existsSync(join(root, file)), '应移除'))
appShellAssets.forEach((asset) => check(`离线缓存 ${asset}`, serviceWorker.includes(`'${asset}'`)))

shortcutViews.forEach((view) => {
  const shortcut = shortcutFor(view)
  check(`快捷入口 ${view}`, !!shortcut, shortcut?.name ?? '缺失')
  check(`路由视图 ${view}`, appSource.includes(`view === '${view}'`))
  check(`快捷弹层 ${view}`, shortcutRouteIsWired(view))
})

check('快捷入口数量', manifest.shortcuts?.length === shortcutViews.length, `${manifest.shortcuts?.length ?? 0}/${shortcutViews.length}`)
check('PWA 图标 192', manifest.icons?.some((icon) => icon.src === '/icon-192.png' && icon.sizes === '192x192'))
check('PWA 图标 512', manifest.icons?.some((icon) => icon.src === '/icon-512.png' && icon.sizes === '512x512'))
check('更新提示事件', appSource.includes('shiguang:update-ready'))
check('安装主题色同步', appSource.includes("meta[name='theme-color']") && appSource.includes("settings.appearance === 'dark'") && appSource.includes('#15172c'))
check('离线状态提示', appSource.includes("window.addEventListener('offline'") && appSource.includes("window.addEventListener('online'") && appSource.includes('network-pill') && appStyles.includes('.network-pill'))
check('安卓返回键事件', appSource.includes('shiguang:back-request'))
check('模块触感反馈', appSource.includes('@capacitor/haptics') && appSource.includes("triggerHaptic('tap')") && appStyles.includes('.module-card::before') && appStyles.includes('.module-card:hover'))
check('首页新增捷径', appSource.includes('openQuickCreate') && appStyles.includes('.quick-action-rail') && appStyles.includes('.quick-action-chip'))
check('快捷短句示例', appSource.includes('quickSamples') && appSource.includes('fillQuickSample') && appSource.includes('quickInputRef') && appStyles.includes('.quick-sample-row'))
check('快捷记录状态提示', appSource.includes('quickIntent') && appSource.includes('data-quick-status') && appStyles.includes(".quick-preview[data-quick-status='direct']"))
check('快捷记账收支纠错', appSource.includes('quickLedgerType') && appSource.includes('quick-type-row') && appSource.includes('quick-category-row') && appStyles.includes('.quick-type-row') && appStyles.includes('.quick-category-row'))
check('中文金额与大词库记账', quickCaptureSource.includes('chineseNumberToAmount') && quickCaptureSource.includes('尺子') && quickCaptureSource.includes('手机壳') && quickCaptureSource.includes('娱乐'))
check('每日一句话独立轮换', appSource.includes("from './dailyQuotes'") && readText('src/dailyQuotes.ts').includes('getDailyQuote') && readText('src/dailyQuotes.ts').includes('dailyQuotes'))
check('底栏误触保护', appSource.includes('clearLaunchAction') && appStyles.includes('.bottom-nav button.active'))
check('底栏长按新增', appSource.includes('onQuickCreate={openQuickCreate}') && appSource.includes('startLongPress') && appSource.includes('longPressHandled') && appSource.includes('onContextMenu') && appSource.includes('data-quick-create') && appStyles.includes(".bottom-nav button[data-quick-create='true'] i") && appSource.includes('长按新增'))
check('删除可撤销', appSource.includes('DeletedSnapshot') && appSource.includes('restoreDeleted') && appSource.includes('undo-toast') && appStyles.includes('.toast-bubble.undo-toast'))
check('弹层聚焦兜底', appSource.includes('sheetRef.current?.querySelector') && appSource.includes('preventScroll: true'))
check('弹层未保存内提示', appSource.includes('showCloseConfirm') && appSource.includes('sheet-dirty-confirm') && appStyles.includes('.sheet-dirty-confirm') && !appSource.includes('window.confirm('))
check('普通新增不强制弹键盘', appSource.includes('autoFocusFirst = false') && appSource.includes('setShouldAutoFocus(false)') && !appSource.includes('autoFocus={shouldAutoFocus}') && !appSource.includes('autoFocus={!editingId}') && !appSource.includes(' autoFocus enterKeyHint'))
check('同页新增弹层', appSource.includes("syncViewUrl(nextView, 'new')") && appSource.includes("function syncViewUrl(nextView: ViewKey, action?: 'new')"))
check('自然语言快捷记录', appSource.includes('明天3点开会') && quickCaptureSource.includes('quickTimeRangeFromHint') && quickCaptureSource.includes('guessEventCategory'))
check('原生数据持久化', appSource.includes('@capacitor/preferences') && appSource.includes('Preferences.get({ key: STORAGE_KEY })') && appSource.includes('Preferences.set({ key: STORAGE_KEY, value: payload })') && appSource.includes("window.addEventListener('pagehide', persistSnapshot)") && appSource.includes("CapacitorApp.addListener('appStateChange'"))
check('稳定打卡动画', appSource.includes("'--tap-index'") && appStyles.includes('pill-in') && appStyles.includes('scaleX(var(--progress, 0))'))
check('底栏原生动效', appStyles.includes('nav-dot-pop') && appStyles.includes('.bottom-nav button:active'))
check('深色可读性兜底', appStyles.includes('.appearance-dark .reminder-item p') && appStyles.includes('.appearance-dark .habit-pill.active'))
check('深色日期图标适配', appStyles.includes('.appearance-dark .date-chip input::-webkit-calendar-picker-indicator') && appStyles.includes('filter: invert(1)'))
check('自适应底栏密度', appStyles.includes('calc(76px - var(--nav-count, 5) * 4px)') && appStyles.includes('grid-template-columns: repeat(var(--nav-count, 5), minmax(0, 1fr))'))
check('模块卡片窄屏收紧', appStyles.includes('@media (max-width: 410px)') && appStyles.includes('grid-template-columns: 36px minmax(0, 1fr)') && appStyles.includes('max-width: min(72px, 100%)') && appStyles.includes('right: 8px') && appStyles.includes('transform: rotate(18deg)'))
check('移动弹层安全区', appStyles.includes('max-height: min(calc(84dvh - min(var(--keyboard-height), 280px)), 720px)') && appStyles.includes('padding-bottom: calc(76px + var(--safe-bottom))'))
check('原生触感插件', appSource.includes('Haptics.notification') && appSource.includes('ImpactStyle.Light') && appSource.includes('NotificationType.Warning'))
check('设置预设预览卡', appSource.includes('preset-grid preset-strip') && appSource.includes('preset-card life') && appStyles.includes('.preset-grid.preset-strip .preset-card') && appStyles.includes('.preset-grid.preset-strip .preset-card.night'))
check('设置预设选中态', appSource.includes("aria-pressed={settings.appearance === 'journal'}") && appSource.includes("preset-card night active") && appStyles.includes(".preset-grid.preset-strip .preset-card.active::after") && appStyles.includes("content: '当前'"))
check('Logo 返回按钮', appSource.includes('className="brand-mark brand-return"') && !appSource.includes('<Icon name="back" />\n          <BrandGlyph />') && appStyles.includes('.brand-return::before') && appStyles.includes('.brand-return:focus-visible'))
check('设置触感反馈', appSource.includes('openSettingsPanel') && appSource.includes('updateSettingWithTap') && appSource.includes('togglePinnedModule') && appSource.includes("triggerHaptic('success')") && appSource.includes("triggerHaptic('warning')"))
check('GitHub 非强制更新与回退', appSource.includes('forceUpdate') && appSource.includes('UPDATE_HISTORY_URL') && appSource.includes('历史版本') && readText('public/update.json').includes('"forceUpdate": false') && readText('package.json').includes('release:github'))
check('设置交互自检', readText('scripts/mobile-layout-doctor.mjs').includes('runSettingsInteractionCheck') && readText('scripts/mobile-layout-doctor.mjs').includes('settings interaction preset applied'))
check('核心编辑交互自检', readText('scripts/mobile-layout-doctor.mjs').includes('runCoreEditorInteractionCheck') && readText('scripts/mobile-layout-doctor.mjs').includes('core editor existing task edit') && readText('scripts/mobile-layout-doctor.mjs').includes('core editor existing habit edit') && readText('scripts/mobile-layout-doctor.mjs').includes('core editor existing countdown edit') && readText('scripts/mobile-layout-doctor.mjs').includes('core editor existing journal edit') && readText('scripts/mobile-layout-doctor.mjs').includes('core editor existing note edit'))
check('底栏长按新增交互自检', readText('scripts/mobile-layout-doctor.mjs').includes('runQuickCreateInteractionCheck') && readText('scripts/mobile-layout-doctor.mjs').includes('quick create timetable opens') && readText('scripts/mobile-layout-doctor.mjs').includes('quick create matrix opens'))
check('触控尺寸自检', readText('scripts/mobile-layout-doctor.mjs').includes('touchTargetFailures') && readText('scripts/mobile-layout-doctor.mjs').includes('touch targets'))
check('核心页面布局自检', readText('scripts/mobile-layout-doctor.mjs').includes("'reports'") && readText('scripts/mobile-layout-doctor.mjs').includes('content overflow'))
check('视觉快照自检', readText('package.json').includes('"visual:snapshot": "node scripts/visual-snapshot.mjs"') && readText('scripts/visual-snapshot.mjs').includes('Page.captureScreenshot') && readText('scripts/visual-snapshot.mjs').includes('CapacitorStorage.') && readText('scripts/visual-snapshot.mjs').includes('23-offline-journal') && readText('scripts/visual-snapshot.mjs').includes('offlinePillExpression'))
check('底栏遮挡视觉自检', readText('scripts/visual-snapshot.mjs').includes('bottomAuditPages') && readText('scripts/visual-snapshot.mjs').includes('bottomClearanceExpression') && readText('scripts/visual-snapshot.mjs').includes('-bottom'))
check('完整体验质量门', readText('package.json').includes('"quality:verify": "npm run verify && npm run layout:doctor"'))

console.log('------------------------')
if (failed) {
  console.log('发现不一致项，请先修复再打包。')
  process.exit(1)
}

console.log('App 自检通过：PWA、快捷入口、路由和关键资源已对齐。')

