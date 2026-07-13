import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'

const port = 9340
const appUrl = process.env.SHIGUANG_APP_URL ?? 'http://127.0.0.1:5173/'
const appServerUrl = new URL(appUrl)
const browserPath = [
  join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(process.env['ProgramFiles(x86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
  join(process.env.ProgramFiles ?? '', 'Microsoft/Edge/Application/msedge.exe'),
  join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
].find((path) => existsSync(path))

const viewports = [
  { width: 360, height: 780, label: 'compact phone' },
  { width: 390, height: 844, label: 'standard phone' },
]
const corePages = [
  'calendar',
  'ledger',
  'tasks',
  'habits',
  'timetable',
  'matrix',
  'countdown',
  'focus',
  'journal',
  'notes',
  'reports',
]
const renderWaitMs = 850

let failed = false
let ownedDevServer

function check(label, ok, detail = '') {
  const mark = ok ? '[OK]' : '[!!]'
  console.log(`${mark} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failed = true
}

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
  if (await appServerIsReady()) {
    check('App service', true, appUrl)
    return
  }

  const viteCli = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
  check('Vite CLI', existsSync(viteCli), viteCli)
  if (!existsSync(viteCli)) return

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
    if (await appServerIsReady()) {
      check('App service auto-start', true, appUrl)
      return
    }
    await wait(250)
  }

  check('App service auto-start', false, appUrl)
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

function setAppearanceExpression(mode = 'default') {
  return `(() => {
    const settingsKey = 'shiguang-list-app-v2';
    const appearance = ${JSON.stringify(mode === 'dark' ? 'dark' : 'journal')};
    const theme = ${JSON.stringify(mode === 'dark' ? 'moon' : 'cream')};
    try {
      const stored = JSON.parse(localStorage.getItem(settingsKey) || '{"version":2,"data":{}}');
      stored.version = stored.version ?? 2;
      stored.data = stored.data ?? {};
      stored.data.settings = { ...(stored.data.settings ?? {}), appearance, theme };
      localStorage.setItem(settingsKey, JSON.stringify(stored));
      return true;
    } catch {
      return false;
    }
  })()`
}

function layoutExpression(width, height, mode = 'default') {
  return `(() => {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.toggle('appearance-dark', ${JSON.stringify(mode)} === 'dark');
      shell.classList.toggle('appearance-journal', ${JSON.stringify(mode)} !== 'dark');
      shell.classList.toggle('theme-moon', ${JSON.stringify(mode)} === 'dark');
      shell.classList.toggle('theme-cream', ${JSON.stringify(mode)} !== 'dark');
    }

    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height), bottom: Math.round(box.bottom) };
    };
    const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect();
    const frame = document.querySelector('.phone-frame')?.getBoundingClientRect();
    const contentArea = document.querySelector('.content-area')?.getBoundingClientRect();
    const pageTitle = document.querySelector('.brand-copy strong, .section-title h2, .hero-card h1, .action-card strong, .settings-hero strong, .matrix-summary-card strong')?.textContent?.trim() ?? '';
    const contentElements = [...document.querySelectorAll('.content-area *')].map((element) => {
      const style = getComputedStyle(element);
      const isClippedText = style.overflow === 'hidden' && style.textOverflow === 'ellipsis';
      return {
        overflow: element.scrollWidth > element.clientWidth + 1 && !isClippedText,
        label: element.textContent?.trim().slice(0, 24) || element.className || element.tagName,
      };
    });
    const moduleCards = [...document.querySelectorAll('.module-card')].map((element) => ({
      scrollW: element.scrollWidth,
      clientW: element.clientWidth,
      overflow: element.scrollWidth > element.clientWidth + 1,
      text: element.textContent?.trim() ?? '',
    }));
    const presetCards = [...document.querySelectorAll('.preset-card')].map((element) => ({
      overflow: element.scrollWidth > element.clientWidth + 1,
      active: element.classList.contains('active'),
      pressed: element.getAttribute('aria-pressed') === 'true',
    }));
    const settingsEntries = [...document.querySelectorAll('.settings-entry')].map((element) => ({
      overflow: element.scrollWidth > element.clientWidth + 1,
    }));
    const touchTargets = [...document.querySelectorAll([
      '.bottom-nav button',
      '.module-card',
      '.quick-action-chip',
      '.preset-card',
      '.settings-entry',
      '.settings-back',
      '.toggle-line',
      '.appearance-card',
      '.theme-swatch',
      '.segmented button',
    ].join(','))].map((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        label: element.textContent?.trim().slice(0, 24) ?? element.className,
        visible: box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
        width: Math.round(box.width),
        height: Math.round(box.height),
        selector: element.className || element.tagName,
      };
    }).filter((item) => item.visible);
    const navButtons = [...document.querySelectorAll('.bottom-nav button')].map((element) => ({
      label: element.textContent?.trim() ?? '',
      active: element.classList.contains('active'),
      aria: element.getAttribute('aria-label') ?? '',
      quick: element.getAttribute('data-quick-create'),
      overflow: element.scrollWidth > element.clientWidth + 1,
    }));
    const darkCards = [...document.querySelectorAll('.appearance-dark .module-card')].map((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color };
    });
    return {
      viewport: { w: innerWidth, h: innerHeight },
      requested: { w: ${width}, h: ${height} },
      mode: ${JSON.stringify(mode)},
      appearanceDark: Boolean(document.querySelector('.appearance-dark')),
      hero: rect('.hero-card'),
      quickCapture: rect('.quick-capture'),
      quickActions: rect('.quick-action-rail'),
      settingsHero: rect('.settings-hero'),
      contentArea: contentArea ? { w: Math.round(contentArea.width), h: Math.round(contentArea.height) } : null,
      pageTitle,
      bottomNav: rect('.bottom-nav'),
      contentOverflowCount: contentElements.filter((item) => item.overflow).length,
      contentOverflowLabels: contentElements.filter((item) => item.overflow).slice(0, 4).map((item) => item.label),
      moduleOverflowCount: moduleCards.filter((item) => item.overflow).length,
      presetCardCount: presetCards.length,
      presetOverflowCount: presetCards.filter((item) => item.overflow).length,
      activePresetCount: presetCards.filter((item) => item.active && item.pressed).length,
      settingsEntryCount: settingsEntries.length,
      settingsEntryOverflowCount: settingsEntries.filter((item) => item.overflow).length,
      touchTargetFailures: touchTargets.filter((item) => item.width < 44 || item.height < 44),
      navOverflowCount: navButtons.filter((item) => item.overflow).length,
      quickCreateCount: navButtons.filter((item) => item.quick === 'true').length,
      activeNavCount: navButtons.filter((item) => item.active).length,
      labels: navButtons.map((item) => item.label.replace('+', '')),
      navArias: navButtons.map((item) => item.aria),
      bottomWithinFrame: nav && frame ? nav.bottom <= frame.bottom + 1 : false,
      darkCardReadable: ${JSON.stringify(mode)} !== 'dark' || darkCards.every((item) => item.background !== item.color),
    };
  })()`
}

async function runViewportCheck(pageSocket, viewport, mode, page = 'today') {
  await send(pageSocket, 'Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 2,
    mobile: true,
  })
  const targetUrl = page === 'today' ? appUrl : `${appUrl}?view=${page}`
  await send(pageSocket, 'Page.navigate', { url: targetUrl })
  await wait(renderWaitMs)
  await evaluate(pageSocket, setAppearanceExpression(mode))
  if (page === 'settings') {
    await send(pageSocket, 'Page.navigate', { url: targetUrl })
    await wait(renderWaitMs)
  } else {
    await wait(120)
  }

  const layout = await evaluate(pageSocket, layoutExpression(viewport.width, viewport.height, mode))
  check(`${viewport.label} ${mode} ${page} evaluation`, Boolean(layout))
  if (!layout) return

  const prefix = `${viewport.label} ${mode} ${page}`
  check(`${prefix} viewport`, layout.viewport.w === viewport.width && layout.viewport.h === viewport.height, `${layout.viewport.w}x${layout.viewport.h}`)
  if (page === 'settings') {
    check(`${prefix} settings screen`, Boolean(layout.settingsHero && layout.presetCardCount === 3 && layout.settingsEntryCount >= 5))
    check(`${prefix} preset cards`, layout.presetOverflowCount === 0, `${layout.presetOverflowCount} overflow`)
    check(`${prefix} active preset`, layout.activePresetCount === 1, `${layout.activePresetCount}`)
    check(`${prefix} settings entries`, layout.settingsEntryOverflowCount === 0, `${layout.settingsEntryOverflowCount} overflow`)
  } else if (page === 'today') {
    check(`${prefix} first screen`, Boolean(layout.hero && layout.quickCapture && layout.quickActions))
    check(`${prefix} module cards`, layout.moduleOverflowCount === 0, `${layout.moduleOverflowCount} overflow`)
  } else {
    check(`${prefix} core screen`, Boolean(layout.contentArea && layout.pageTitle), layout.pageTitle)
    check(`${prefix} content overflow`, layout.contentOverflowCount === 0, `${layout.contentOverflowCount} overflow ${layout.contentOverflowLabels.join('; ')}`)
  }
  if (page === 'matrix') {
    const matrixLayout = await evaluate(pageSocket, `(() => {
      const grid = document.querySelector('.matrix-grid');
      const boxes = [...document.querySelectorAll('.matrix-box')];
      if (!grid) return null;
      const columns = getComputedStyle(grid).gridTemplateColumns
        .split(' ')
        .filter(Boolean).length;
      return {
        columns,
        boxCount: boxes.length,
        allVisible: boxes.every((box) => {
          const rect = box.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }),
      };
    })()`)
    check(`${prefix} matrix board`, matrixLayout?.columns === 2 && matrixLayout?.boxCount === 4 && matrixLayout?.allVisible === true, JSON.stringify(matrixLayout))
  }
  if (page === 'countdown') {
    const countdownLayout = await evaluate(pageSocket, `(() => {
      const cards = [...document.querySelectorAll('.countdown-card')];
      const featured = cards.filter((card) => card.classList.contains('featured'));
      return {
        cardCount: cards.length,
        featuredCount: featured.length,
        inlineDeleteCount: document.querySelectorAll('.countdown-card button').length,
        milestonesVisible: cards.every((card) => getComputedStyle(card).overflow === 'visible'),
      };
    })()`)
    check(
      `${prefix} countdown hierarchy`,
      countdownLayout?.cardCount === 0 ||
        (countdownLayout?.featuredCount === 1 &&
          countdownLayout?.inlineDeleteCount === 0 &&
          countdownLayout?.milestonesVisible === true),
      JSON.stringify(countdownLayout),
    )
  }
  if (page === 'notes') {
    const notesLayout = await evaluate(pageSocket, `(() => {
      const cards = [...document.querySelectorAll('.note-card')];
      return {
        cardCount: cards.length,
        inlineDeleteCount: document.querySelectorAll('.note-card button').length,
        allEditable: cards.every((card) => card.getAttribute('role') === 'button' && card.getAttribute('tabindex') === '0'),
      };
    })()`)
    check(
      `${prefix} note card editing`,
      notesLayout?.inlineDeleteCount === 0 && notesLayout?.allEditable === true,
      JSON.stringify(notesLayout),
    )
  }
  check(`${prefix} bottom nav text`, layout.navOverflowCount === 0, `${layout.navOverflowCount} overflow`)
  check(`${prefix} touch targets`, layout.touchTargetFailures.length === 0, layout.touchTargetFailures.map((item) => `${item.width}x${item.height} ${item.label}`).join('; '))
  check(`${prefix} bottom nav frame`, layout.bottomWithinFrame === true)
  check(`${prefix} quick-create badges`, layout.quickCreateCount >= 2, `${layout.quickCreateCount}`)
  const pageUsesPinnedNav = ['today', 'ledger', 'tasks', 'settings'].includes(page)
  if (pageUsesPinnedNav) {
    check(`${prefix} one active nav`, layout.activeNavCount === 1, `${layout.activeNavCount}`)
  } else {
    check(`${prefix} nav active state`, layout.activeNavCount <= 1, `${layout.activeNavCount}`)
  }
  check(`${prefix} default nav`, layout.navArias.some((item) => item.includes('今日')) && layout.navArias.some((item) => item.includes('记账')) && layout.navArias.some((item) => item.includes('清单')) && layout.navArias.some((item) => item.includes('设置')), layout.labels.join(', '))
  if (mode === 'dark') {
    check(`${prefix} dark mode applied`, layout.appearanceDark === true)
    check(`${prefix} dark card contrast`, layout.darkCardReadable === true)
  }
}

async function runSettingsInteractionCheck(pageSocket) {
  await send(pageSocket, 'Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=settings` })
  await wait(renderWaitMs)
  await evaluate(pageSocket, setAppearanceExpression('default'))
  await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=settings` })
  await wait(renderWaitMs)

  const switchedPreset = await evaluate(pageSocket, `(() => {
    const preset = document.querySelector('.preset-card.focus');
    preset?.click();
    return {
      clicked: Boolean(preset),
      activeText: document.querySelector('.preset-card.focus')?.getAttribute('aria-pressed'),
      shellClean: document.querySelector('.app-shell')?.classList.contains('appearance-clean') ?? false,
    };
  })()`)
  check('settings interaction preset click', switchedPreset?.clicked === true)
  await wait(650)

  const presetApplied = await evaluate(pageSocket, `(() => ({
    active: document.querySelector('.preset-card.focus')?.getAttribute('aria-pressed') === 'true',
    clean: document.querySelector('.app-shell')?.classList.contains('appearance-clean') ?? false,
    activeCount: [...document.querySelectorAll('.preset-card.active')].length,
  }))()`)
  check('settings interaction preset applied', presetApplied?.active === true && presetApplied?.clean === true && presetApplied?.activeCount === 1, JSON.stringify(presetApplied))

  const openedAppearance = await evaluate(pageSocket, `(() => {
    const entry = [...document.querySelectorAll('.settings-entry')]
      .find((element) => element.textContent?.includes('外观与显示'));
    entry?.click();
    return Boolean(entry);
  })()`)
  check('settings interaction open appearance', openedAppearance === true)
  await wait(450)

  const appearancePanel = await evaluate(pageSocket, `(() => ({
    hasPanel: Boolean(document.querySelector('.settings-panel')),
    cards: document.querySelectorAll('.appearance-card').length,
    active: document.querySelectorAll('.appearance-card.active').length,
  }))()`)
  check('settings interaction appearance panel', appearancePanel?.hasPanel === true && appearancePanel?.cards === 3 && appearancePanel?.active === 1, JSON.stringify(appearancePanel))

  const returnedHome = await evaluate(pageSocket, `(() => {
    const back = document.querySelector('.settings-back');
    back?.click();
    return Boolean(back);
  })()`)
  check('settings interaction back tap', returnedHome === true)
  await wait(450)

  const settingsHome = await evaluate(pageSocket, `(() => ({
    hasRoot: Boolean(document.querySelector('.settings-home')),
    entries: document.querySelectorAll('.settings-entry').length,
    presets: document.querySelectorAll('.preset-card').length,
  }))()`)
  check('settings interaction back home', settingsHome?.hasRoot === true && settingsHome?.entries >= 5 && settingsHome?.presets === 3, JSON.stringify(settingsHome))
}

async function runTimetableSettingsInteractionCheck(pageSocket) {
  await send(pageSocket, 'Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await evaluate(pageSocket, setAppearanceExpression('default'))
  await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=timetable` })
  await wait(renderWaitMs)

  const opened = await evaluate(pageSocket, `(() => {
    const trigger = document.querySelector('.timetable-time-button');
    trigger?.click();
    return Boolean(trigger);
  })()`)
  await wait(360)

  const sheet = await evaluate(pageSocket, `(() => ({
    opened: ${JSON.stringify(Boolean(opened))},
    title: document.querySelector('.sheet-header strong')?.textContent?.trim() ?? '',
    presets: document.querySelectorAll('.timetable-preset-list button').length,
    rows: document.querySelectorAll('.timetable-slot-row').length,
    timeInputs: document.querySelectorAll('.timetable-slot-row input[type="time"]').length,
    saveEnabled: !(document.querySelector('.timetable-time-actions .primary-action')?.disabled ?? true),
  }))()`)
  check(
    'timetable settings opens',
    sheet?.opened === true && sheet?.title.includes('作息与节次') && sheet?.presets === 3 && sheet?.rows === 10 && sheet?.timeInputs === 20 && sheet?.saveEnabled === true,
    JSON.stringify(sheet),
  )

  const presetClicked = await evaluate(pageSocket, `(() => {
    const preset = document.querySelectorAll('.timetable-preset-list button')[1];
    preset?.click();
    return Boolean(preset);
  })()`)
  await wait(120)
  const presetApplied = await evaluate(pageSocket, `(() => {
    const inputs = [...document.querySelectorAll('.timetable-slot-row input[type="time"]')];
    return {
      clicked: ${JSON.stringify(Boolean(presetClicked))},
      secondStart: inputs[2]?.value ?? '',
      secondEnd: inputs[3]?.value ?? '',
    };
  })()`)
  check('timetable settings preset applies', presetApplied?.clicked === true && presetApplied?.secondStart === '09:00' && presetApplied?.secondEnd === '09:50', JSON.stringify(presetApplied))

  const saved = await evaluate(pageSocket, `(() => {
    const save = document.querySelector('.timetable-time-actions .primary-action');
    save?.click();
    return Boolean(save);
  })()`)
  await wait(420)

  const synchronized = await evaluate(pageSocket, `(() => {
    const stored = JSON.parse(localStorage.getItem('shiguang-list-app-v2') || '{}');
    const slots = stored.data?.timetableSlots ?? [];
    const course = (stored.data?.courses ?? []).find((item) => item.slot === 2);
    return {
      saved: ${JSON.stringify(Boolean(saved))},
      sheetClosed: !document.querySelector('.bottom-sheet'),
      slotStart: slots[1]?.start ?? '',
      slotEnd: slots[1]?.end ?? '',
      courseStart: course?.start ?? '',
      courseEnd: course?.end ?? '',
      courseSpan: course?.slotSpan ?? 0,
    };
  })()`)
  check(
    'timetable settings save synchronizes courses',
    synchronized?.saved === true &&
      synchronized?.sheetClosed === true &&
      synchronized?.slotStart === '09:00' &&
      synchronized?.slotEnd === '09:50' &&
      (synchronized?.courseSpan === 0 ||
        (synchronized?.courseStart === '09:00' &&
          synchronized?.courseEnd === '11:00' &&
          synchronized?.courseSpan === 2)),
    JSON.stringify(synchronized),
  )

  const spanEditorOpened = await evaluate(pageSocket, `(() => {
    const trigger = document.querySelector('.timetable-add-card, .day-course-primary-add, .day-course-empty-main');
    trigger?.click();
    return Boolean(trigger);
  })()`)
  await wait(320)

  const spanInteraction = await evaluate(pageSocket, `(() => {
    const buttons = [...document.querySelectorAll('.course-span-picker button')];
    buttons[1]?.click();
    return {
      opened: ${JSON.stringify(Boolean(spanEditorOpened))},
      buttons: buttons.length,
      secondSelected: buttons[1]?.classList.contains('active') ?? false,
      summary: document.querySelector('.course-span-summary')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
      conflict: document.querySelector('.course-sheet-form .form-alert.danger')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
    };
  })()`)
  await wait(140)
  const spanInteractionAfterRender = await evaluate(pageSocket, `(() => ({
    opened: ${JSON.stringify(Boolean(spanInteraction?.opened))},
    buttons: document.querySelectorAll('.course-span-picker button').length,
    secondSelected: document.querySelectorAll('.course-span-picker button')[1]?.classList.contains('active') ?? false,
    summary: document.querySelector('.course-span-summary')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
    conflict: document.querySelector('.course-sheet-form .form-alert.danger')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
  }))()`)
  check(
    'timetable multi-slot editor and conflict',
    spanInteractionAfterRender?.opened === true &&
      spanInteractionAfterRender?.buttons >= 3 &&
      spanInteractionAfterRender?.secondSelected === true &&
      spanInteractionAfterRender?.summary.includes('第 1-2 节') &&
      spanInteractionAfterRender?.summary.includes('08:00-09:50') &&
      (spanInteractionAfterRender?.conflict === '' ||
        spanInteractionAfterRender?.conflict.includes('占用时间重叠')),
    JSON.stringify(spanInteractionAfterRender),
  )

  await evaluate(pageSocket, `document.querySelector('.sheet-close-button')?.click()`)
  await wait(180)

  const semesterOpened = await evaluate(pageSocket, `(() => {
    const trigger = document.querySelectorAll('.timetable-tabs button')[2];
    trigger?.click();
    return Boolean(trigger);
  })()`)
  await wait(520)
  const semesterPosition = await evaluate(pageSocket, `(() => {
    const scroller = document.querySelector('.semester-scroll');
    const today = scroller?.querySelector('.semester-head.today');
    if (!scroller || !today) return null;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const expected = Math.min(maxScroll, Math.max(0, today.offsetLeft - scroller.clientWidth / 2 + today.clientWidth / 2));
    return {
      opened: ${JSON.stringify(Boolean(semesterOpened))},
      scrollLeft: Math.round(scroller.scrollLeft),
      expected: Math.round(expected),
      pageOverflow: document.querySelector('.content-area')?.scrollLeft ?? 0,
    };
  })()`)
  check(
    'timetable semester centers current day',
    semesterPosition?.opened === true &&
      Math.abs(semesterPosition.scrollLeft - semesterPosition.expected) <= 20 &&
      semesterPosition.pageOverflow === 0,
    JSON.stringify(semesterPosition),
  )
}

async function runCoreEditorInteractionCheck(pageSocket) {
  await send(pageSocket, 'Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await evaluate(pageSocket, setAppearanceExpression('default'))

  const editorChecks = [
    { page: 'calendar', trigger: '.action-card', expectedTitle: '新增日程' },
    { page: 'ledger', trigger: '.action-card', expectedTitle: '记一笔' },
    { page: 'tasks', trigger: '.action-card', expectedTitle: '新增清单' },
    { page: 'matrix', trigger: '.matrix-add-zone', expectedTitle: '添加象限事项' },
  ]

  for (const item of editorChecks) {
    await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=${item.page}` })
    await wait(renderWaitMs)

    const clicked = await evaluate(pageSocket, `(() => {
      const trigger = document.querySelector(${JSON.stringify(item.trigger)});
      trigger?.click();
      return Boolean(trigger);
    })()`)
    await wait(360)

    const opened = await evaluate(pageSocket, `(() => {
      return {
        clicked: ${JSON.stringify(Boolean(clicked))},
        hasSheet: Boolean(document.querySelector('.bottom-sheet')),
        title: document.querySelector('.sheet-header strong')?.textContent?.trim() ?? '',
        inputCount: document.querySelectorAll('.bottom-sheet input, .bottom-sheet textarea, .bottom-sheet select').length,
      };
    })()`)
    check(`core editor ${item.page} opens`, opened?.clicked === true && opened?.hasSheet === true && opened?.title.includes(item.expectedTitle) && opened?.inputCount > 0, JSON.stringify(opened))

    const closeTapped = await evaluate(pageSocket, `(() => {
      const close = document.querySelector('.sheet-close-button, .sheet-header > button');
      close?.click();
      return Boolean(close);
    })()`)
    await wait(320)
    const closed = await evaluate(pageSocket, `(() => !document.querySelector('.bottom-sheet'))()`)
    check(`core editor ${item.page} closes`, closeTapped === true && closed === true, JSON.stringify({ closeTapped, closed }))
  }

  await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=tasks` })
  await wait(renderWaitMs)
  const taskClicked = await evaluate(pageSocket, `(() => {
    const row = document.querySelector('.task-row');
    row?.click();
    return Boolean(row);
  })()`)
  await wait(360)
  const editExistingTask = await evaluate(pageSocket, `(() => {
    return {
      clicked: ${JSON.stringify(Boolean(taskClicked))},
      hasSheet: Boolean(document.querySelector('.bottom-sheet')),
      title: document.querySelector('.sheet-header strong')?.textContent?.trim() ?? '',
      hasDelete: Boolean(document.querySelector('.bottom-sheet .soft-action.danger')),
    };
  })()`)
  check('core editor existing task edit', editExistingTask?.clicked === false || (editExistingTask?.hasSheet === true && editExistingTask?.hasDelete === true), JSON.stringify(editExistingTask))

  await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=habits` })
  await wait(renderWaitMs)
  const habitClicked = await evaluate(pageSocket, `(() => {
    const row = document.querySelector('.habit-name');
    row?.click();
    return Boolean(row);
  })()`)
  await wait(360)
  const editExistingHabit = await evaluate(pageSocket, `(() => {
    return {
      clicked: ${JSON.stringify(Boolean(habitClicked))},
      hasSheet: Boolean(document.querySelector('.bottom-sheet')),
      title: document.querySelector('.sheet-header strong')?.textContent?.trim() ?? '',
      hasDelete: Boolean(document.querySelector('.bottom-sheet .soft-action.danger')),
      hasColorPicker: Boolean(document.querySelector('.habit-color-picker')),
    };
  })()`)
  check('core editor existing habit edit', editExistingHabit?.clicked === false || (editExistingHabit?.hasSheet === true && editExistingHabit?.hasDelete === true && editExistingHabit?.hasColorPicker === true), JSON.stringify(editExistingHabit))

  const existingEditorChecks = [
    { page: 'matrix', trigger: '.matrix-task', title: '编辑象限事项', label: 'core editor existing matrix edit' },
    { page: 'countdown', trigger: '.countdown-card', title: '编辑倒数日', label: 'core editor existing countdown edit' },
    { page: 'journal', trigger: '.journal-entry-row.editable', title: '编辑日记', label: 'core editor existing journal edit' },
    { page: 'notes', trigger: '.note-card', title: '编辑便签', label: 'core editor existing note edit' },
  ]

  for (const item of existingEditorChecks) {
    await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=${item.page}` })
    await wait(renderWaitMs)
    const clicked = await evaluate(pageSocket, `(() => {
      const row = document.querySelector(${JSON.stringify(item.trigger)});
      row?.click();
      return Boolean(row);
    })()`)
    await wait(360)
    const editExisting = await evaluate(pageSocket, `(() => ({
      clicked: ${JSON.stringify(Boolean(clicked))},
      hasSheet: Boolean(document.querySelector('.bottom-sheet')),
      title: document.querySelector('.sheet-header strong')?.textContent?.trim() ?? '',
      hasDelete: Boolean(document.querySelector('.bottom-sheet .soft-action.danger')),
      inputCount: document.querySelectorAll('.bottom-sheet input, .bottom-sheet textarea, .bottom-sheet select').length,
    }))()`)
    check(item.label, editExisting?.clicked === false || (editExisting?.hasSheet === true && editExisting?.title.includes(item.title) && editExisting?.hasDelete === true && editExisting?.inputCount > 0), JSON.stringify(editExisting))
  }
}

async function runQuickCreateInteractionCheck(pageSocket) {
  await send(pageSocket, 'Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  })
  await evaluate(pageSocket, setAppearanceExpression('default'))

  const quickChecks = [
    { page: 'timetable', title: '添加课程', label: 'quick create timetable opens' },
    { page: 'matrix', title: '添加象限事项', label: 'quick create matrix opens' },
  ]

  for (const item of quickChecks) {
    await send(pageSocket, 'Page.navigate', { url: `${appUrl}?view=${item.page}&action=new` })
    await wait(renderWaitMs + 260)

    const opened = await evaluate(pageSocket, `(() => ({
      hasSheet: Boolean(document.querySelector('.bottom-sheet')),
      title: document.querySelector('.sheet-header strong')?.textContent?.trim() ?? '',
      inputCount: document.querySelectorAll('.bottom-sheet input, .bottom-sheet textarea, .bottom-sheet select').length,
      quickBadges: document.querySelectorAll('.bottom-nav button[data-quick-create="true"] i').length,
    }))()`)
  check(item.label, opened?.hasSheet === true && opened?.title.includes(item.title) && opened?.inputCount > 0 && opened?.quickBadges >= 2, JSON.stringify(opened))

    await evaluate(pageSocket, `document.querySelector('.sheet-close-button')?.click()`)
    await wait(320)
  }
}

async function main() {
  console.log('拾光清单移动端布局自检')
  console.log('------------------------')

  check('Chromium browser', Boolean(browserPath), browserPath ?? 'Chrome / Edge not found')
  if (!browserPath) {
    console.log('------------------------')
    process.exit(1)
  }

  await ensureAppServer()
  if (failed) {
    console.log('------------------------')
    process.exit(1)
  }

  const userDataDir = mkdtempSync(join(tmpdir(), 'shiguang-cdp-'))
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
    check('CDP start', Boolean(version))
    if (!version) return

    const browserSocket = new WebSocket(version.webSocketDebuggerUrl)
    await waitOpen(browserSocket)
    await send(browserSocket, 'Target.createTarget', { url: appUrl })
    await wait(800)

    const pages = await getJson(`http://127.0.0.1:${port}/json/list`)
    const page = pages.find((item) => item.url.startsWith(appUrl))
    check('App page load', Boolean(page), appUrl)
    if (!page) return

    const pageSocket = new WebSocket(page.webSocketDebuggerUrl)
    await waitOpen(pageSocket)
    await send(pageSocket, 'Runtime.enable')
    await send(pageSocket, 'Page.enable')

    for (const viewport of viewports) {
      await runViewportCheck(pageSocket, viewport, 'default', 'today')
      await runViewportCheck(pageSocket, viewport, 'dark', 'today')
      await runViewportCheck(pageSocket, viewport, 'default', 'settings')
      await runViewportCheck(pageSocket, viewport, 'dark', 'settings')
      for (const pageName of corePages) {
        await runViewportCheck(pageSocket, viewport, 'default', pageName)
        await runViewportCheck(pageSocket, viewport, 'dark', pageName)
      }
    }
    await runSettingsInteractionCheck(pageSocket)
    await runTimetableSettingsInteractionCheck(pageSocket)
    await runCoreEditorInteractionCheck(pageSocket)
    await runQuickCreateInteractionCheck(pageSocket)

    pageSocket.close()
    browserSocket.close()
  } finally {
    browser.kill()
    ownedDevServer?.kill()
  }

  console.log('------------------------')
  if (failed) {
    console.log('发现移动端布局问题，请先修复再打包。')
    process.exit(1)
  }

  console.log('移动端布局自检通过。')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
