import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'

const port = 9351
const appUrl = process.env.SHIGUANG_APP_URL ?? 'http://127.0.0.1:5173/'
const appServerUrl = new URL(appUrl)
const outputDir = join(process.cwd(), 'screenshots')
const browserPath = [
  join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(process.env['ProgramFiles(x86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(process.env.ProgramFiles ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
].find((path) => existsSync(path))

const shots = [
  { name: '01-today-journal', page: 'today', appearance: 'journal' },
  { name: '02-settings-journal', page: 'settings', appearance: 'journal' },
  { name: '03-habits-journal', page: 'habits', appearance: 'journal' },
  { name: '04-timetable-journal', page: 'timetable', appearance: 'journal' },
  { name: '05-matrix-journal', page: 'matrix', appearance: 'journal' },
  { name: '06-reports-journal', page: 'reports', appearance: 'journal' },
  { name: '07-today-dark', page: 'today', appearance: 'dark' },
  { name: '08-settings-dark', page: 'settings', appearance: 'dark' },
  { name: '09-focus-journal', page: 'focus', appearance: 'journal' },
  { name: '10-focus-dark', page: 'focus', appearance: 'dark' },
  { name: '11-timetable-dark', page: 'timetable', appearance: 'dark' },
  { name: '12-reports-dark', page: 'reports', appearance: 'dark' },
  { name: '13-ledger-journal', page: 'ledger', appearance: 'journal' },
  { name: '14-tasks-journal', page: 'tasks', appearance: 'journal' },
  { name: '15-journal-journal', page: 'journal', appearance: 'journal' },
  { name: '16-notes-journal', page: 'notes', appearance: 'journal' },
  { name: '17-countdown-journal', page: 'countdown', appearance: 'journal' },
  { name: '18-ledger-dark', page: 'ledger', appearance: 'dark' },
  { name: '19-tasks-dark', page: 'tasks', appearance: 'dark' },
  { name: '20-journal-dark', page: 'journal', appearance: 'dark' },
  { name: '21-notes-dark', page: 'notes', appearance: 'dark' },
  { name: '22-countdown-dark', page: 'countdown', appearance: 'dark' },
  { name: '26-calendar-journal', page: 'calendar', appearance: 'journal' },
  { name: '27-calendar-dark', page: 'calendar', appearance: 'dark' },
  { name: '28-habits-dark', page: 'habits', appearance: 'dark' },
  { name: '29-matrix-dark', page: 'matrix', appearance: 'dark' },
  { name: '30-timetable-times-journal', page: 'timetable', appearance: 'journal', timetableTimes: true },
  { name: '31-timetable-times-dark', page: 'timetable', appearance: 'dark', timetableTimes: true },
  { name: '32-timetable-course-journal', page: 'timetable', appearance: 'journal', timetableCourse: true },
  { name: '33-timetable-course-dark', page: 'timetable', appearance: 'dark', timetableCourse: true },
  { name: '34-timetable-semester-journal', page: 'timetable', appearance: 'journal', timetableSemester: true },
  { name: '35-timetable-semester-dark', page: 'timetable', appearance: 'dark', timetableSemester: true },
  { name: '23-offline-journal', page: 'today', appearance: 'journal', offline: true },
  { name: '24-settings-appearance-journal', page: 'settings', appearance: 'journal', panel: '外观与显示' },
  { name: '25-settings-modules-dark', page: 'settings', appearance: 'dark', panel: '首页与底栏' },
]

const bottomAuditPages = new Set(['today', 'calendar', 'matrix', 'reports', 'settings', 'focus'])

let ownedDevServer

async function getJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} ${response.status}`)
  return response.json()
}

async function appServerIsReady() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const response = await fetch(appUrl, { signal: controller.signal })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

async function ensureAppServer() {
  if (await appServerIsReady()) return

  const viteCli = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
  if (!existsSync(viteCli)) throw new Error(`Vite CLI not found: ${viteCli}`)

  ownedDevServer = spawn(process.execPath, [
    viteCli,
    '--host',
    appServerUrl.hostname,
    '--port',
    appServerUrl.port || '5173',
  ], {
    cwd: process.cwd(),
    detached: false,
    stdio: 'ignore',
  })

  for (let index = 0; index < 40; index += 1) {
    if (await appServerIsReady()) return
    await wait(250)
  }

  throw new Error(`App service did not start: ${appUrl}`)
}

function waitOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
}

async function send(socket, method, params = {}) {
  const id = ++send.id
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => {
    function onMessage(event) {
      const message = JSON.parse(String(event.data))
      if (message.id !== id) return
      socket.removeEventListener('message', onMessage)
      if (message.error) reject(new Error(JSON.stringify(message.error)))
      else resolve(message.result)
    }

    socket.addEventListener('message', onMessage)
  })
}
send.id = 0

async function evaluate(pageSocket, expression) {
  const result = await send(pageSocket, 'Runtime.evaluate', { expression, returnByValue: true })
  if (result.exceptionDetails) {
    const message = result.exceptionDetails.exception?.description
      ?? result.exceptionDetails.text
      ?? 'Runtime.evaluate failed'
    throw new Error(message)
  }
  return result.result.value
}

function appearanceExpression(appearance, includeSemesterCourse = false) {
  const theme = appearance === 'dark' ? 'moon' : 'cream'
  return `(() => {
    const settingsKey = 'shiguang-list-app-v2';
    const preferencesKey = 'CapacitorStorage.' + settingsKey;
    const stored = JSON.parse(localStorage.getItem(settingsKey) || '{"version":3,"data":{}}');
    stored.version = 3;
    stored.data = stored.data ?? {};
    stored.data.settings = { ...(stored.data.settings ?? {}), appearance: ${JSON.stringify(appearance)}, theme: ${JSON.stringify(theme)} };
    if (${JSON.stringify(includeSemesterCourse)}) {
      const today = new Date();
      const year = String(today.getFullYear());
      const month = today.getMonth() + 1;
      const semester = year + (month < 8 ? '01' : '02');
      stored.data.courses = [{
        id: 'snapshot-course-span',
        title: '高等数学',
        shortTitle: '高数',
        semester,
        day: 1,
        slot: 1,
        slotSpan: 2,
        start: '08:00',
        end: '09:50',
        startWeek: 1,
        endWeek: 18,
        weekRule: 'all',
        weeks: Array.from({ length: 18 }, (_, index) => index + 1),
        customTime: false,
        place: 'A301',
        teacher: '林老师',
        color: 'blue'
      }];
    }
    const payload = JSON.stringify(stored);
    localStorage.setItem(settingsKey, payload);
    localStorage.setItem(preferencesKey, payload);
  })()`
}

function clearAppearanceBootScriptExpression(identifier) {
  return `(() => {
    window.__shiguangSnapshotScriptIds = window.__shiguangSnapshotScriptIds || [];
    window.__shiguangSnapshotScriptIds.push(${JSON.stringify(identifier)});
  })()`
}

async function capturePng(pageSocket, name) {
  const image = await send(pageSocket, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  })
  const file = join(outputDir, `${name}.png`)
  writeFileSync(file, Buffer.from(image.data, 'base64'))
  console.log(`[OK] ${file}`)
}

function bottomClearanceExpression() {
  return `(() => {
    const scroller = document.querySelector('.content-area');
    const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect();
    if (!scroller || !nav) return { ok: false, reason: 'missing scroller or nav' };

    const visible = [...scroller.querySelectorAll('section, article, .report-card, .report-insights, .matrix-box, .settings-entry, .settings-panel > *, .appearance-grid, .theme-grid, .segmented, .module-console, .nav-preview-card, .hero-card, .focus-summary-card, .action-card')]
      .map((element) => {
        const box = element.getBoundingClientRect();
        return { bottom: box.bottom, height: box.height, text: element.textContent?.trim().slice(0, 24) ?? element.className };
      })
      .filter((item) => item.height > 8 && item.bottom > 0 && item.bottom <= nav.top - 2);
    const last = visible.at(-1);
    const clearance = last ? Math.round(nav.top - last.bottom) : -1;
    return {
      ok: Boolean(last) && clearance >= 10,
      clearance,
      navTop: Math.round(nav.top),
      lastText: last?.text ?? '',
      scrollTop: Math.round(scroller.scrollTop),
      scrollHeight: Math.round(scroller.scrollHeight),
      clientHeight: Math.round(scroller.clientHeight),
    };
  })()`
}

function scrollContentToBottomExpression() {
  return `(() => {
    const scroller = document.querySelector('.content-area');
    if (!scroller) return false;
    scroller.style.scrollBehavior = 'auto';
    scroller.scrollTop = scroller.scrollHeight;
    return true;
  })()`
}

function offlinePillExpression() {
  return `(() => {
    const pill = document.querySelector('.network-pill')?.getBoundingClientRect();
    const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect();
    const toast = document.querySelector('.toast-bubble')?.getBoundingClientRect();
    if (!pill || !nav) return { ok: false, reason: 'missing offline pill or nav' };
    return {
      ok: pill.bottom <= nav.top - 8 && pill.width > 80 && pill.height >= 32 && !toast,
      pillBottom: Math.round(pill.bottom),
      navTop: Math.round(nav.top),
      hasToast: Boolean(toast),
      width: Math.round(pill.width),
      height: Math.round(pill.height),
    };
  })()`
}

function openSettingsPanelExpression(panelLabel) {
  return `(() => {
    const entry = [...document.querySelectorAll('.settings-entry')]
      .find((element) => element.textContent?.includes(${JSON.stringify(panelLabel)}));
    entry?.click();
    return Boolean(entry);
  })()`
}

function openTimetableTimesExpression() {
  return `(() => {
    const trigger = document.querySelector('.timetable-time-button');
    trigger?.click();
    return Boolean(trigger);
  })()`
}

function openTimetableCourseExpression() {
  return `(() => {
    const trigger = document.querySelector('.timetable-add-card, .day-course-primary-add, .day-course-empty-main');
    trigger?.click();
    return Boolean(trigger);
  })()`
}

function selectTimetableCourseSpanExpression() {
  return `(() => {
    const button = document.querySelectorAll('.course-span-picker button')[1];
    button?.click();
    return Boolean(button);
  })()`
}

function openTimetableSemesterExpression() {
  return `(() => {
    const trigger = document.querySelectorAll('.timetable-tabs button')[2];
    trigger?.click();
    return Boolean(trigger);
  })()`
}

function focusTimetableSemesterCourseExpression() {
  return `(() => {
    const course = document.querySelector('.semester-course.spans');
    const content = document.querySelector('.content-area');
    if (course && content) {
      const courseRect = course.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      content.scrollTop += courseRect.top - contentRect.top - content.clientHeight * 0.56;
    }
    return Boolean(course);
  })()`
}

async function main() {
  if (!browserPath) throw new Error('Chrome / Edge not found')

  mkdirSync(outputDir, { recursive: true })
  await ensureAppServer()

  const userDataDir = join(tmpdir(), `shiguang-snapshot-${Date.now()}`)
  const browser = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=390,844',
    'about:blank',
  ], { stdio: 'ignore' })

  try {
    let version
    for (let index = 0; index < 30; index += 1) {
      try {
        version = await getJson(`http://127.0.0.1:${port}/json/version`)
        break
      } catch {
        await wait(150)
      }
    }
    if (!version) throw new Error('CDP did not start')

    const browserSocket = new WebSocket(version.webSocketDebuggerUrl)
    await waitOpen(browserSocket)
    await send(browserSocket, 'Target.createTarget', { url: appUrl })
    await wait(800)

    const pages = await getJson(`http://127.0.0.1:${port}/json/list`)
    const page = pages.find((item) => item.url.startsWith(appUrl))
    if (!page) throw new Error(`App page not found: ${appUrl}`)

    const pageSocket = new WebSocket(page.webSocketDebuggerUrl)
    await waitOpen(pageSocket)
    await send(pageSocket, 'Runtime.enable')
    await send(pageSocket, 'Page.enable')
    await send(pageSocket, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    })

    for (const shot of shots) {
      const targetUrl = shot.page === 'today' ? appUrl : `${appUrl}?view=${shot.page}`
      const bootScript = await send(pageSocket, 'Page.addScriptToEvaluateOnNewDocument', {
        source: appearanceExpression(shot.appearance, shot.timetableSemester === true),
      })
      await send(pageSocket, 'Page.navigate', { url: targetUrl })
      await wait(950)
      await send(pageSocket, 'Page.removeScriptToEvaluateOnNewDocument', {
        identifier: bootScript.identifier,
      })
      await evaluate(pageSocket, clearAppearanceBootScriptExpression(bootScript.identifier))
      await evaluate(pageSocket, `document.body.classList.add('snapshot-ready')`)
      if (shot.offline) {
        await evaluate(pageSocket, `window.dispatchEvent(new Event('offline'))`)
        await wait(260)
        const offlinePill = await evaluate(pageSocket, offlinePillExpression())
        if (!offlinePill?.ok) {
          throw new Error(`Offline pill failed for ${shot.name}: ${JSON.stringify(offlinePill)}`)
        }
      }
      if (shot.panel) {
        const opened = await evaluate(pageSocket, openSettingsPanelExpression(shot.panel))
        if (!opened) throw new Error(`Settings panel not found for ${shot.name}: ${shot.panel}`)
        await wait(360)
      }
      if (shot.timetableTimes) {
        const opened = await evaluate(pageSocket, openTimetableTimesExpression())
        if (!opened) throw new Error(`Timetable time settings not found for ${shot.name}`)
        await wait(420)
      }
      if (shot.timetableCourse) {
        const opened = await evaluate(pageSocket, openTimetableCourseExpression())
        if (!opened) throw new Error(`Timetable course editor not found for ${shot.name}`)
        await wait(360)
        const selected = await evaluate(pageSocket, selectTimetableCourseSpanExpression())
        if (!selected) throw new Error(`Timetable course span selector not found for ${shot.name}`)
        await wait(220)
      }
      if (shot.timetableSemester) {
        const opened = await evaluate(pageSocket, openTimetableSemesterExpression())
        if (!opened) throw new Error(`Timetable semester tab not found for ${shot.name}`)
        await wait(360)
        const focused = await evaluate(pageSocket, focusTimetableSemesterCourseExpression())
        if (!focused) throw new Error(`Timetable spanning course not found for ${shot.name}`)
        await wait(320)
      }
      await capturePng(pageSocket, shot.name)

      if (bottomAuditPages.has(shot.page)) {
        await evaluate(pageSocket, scrollContentToBottomExpression())
        await wait(420)
        const clearance = await evaluate(pageSocket, bottomClearanceExpression())
        if (!clearance?.ok) {
          throw new Error(`Bottom clearance failed for ${shot.name}: ${JSON.stringify(clearance)}`)
        }
        await wait(260)
        await capturePng(pageSocket, `${shot.name}-bottom`)
      }
    }

    pageSocket.close()
    browserSocket.close()
  } finally {
    browser.kill()
    ownedDevServer?.kill()
  }

  console.log('视觉快照已生成。')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
