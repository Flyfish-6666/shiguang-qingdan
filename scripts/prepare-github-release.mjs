import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const root = process.cwd()
const version = process.env.RELEASE_VERSION || process.argv[2]
const repo = process.env.GITHUB_REPO || 'Flyfish-6666/shiguang-qingdan'
const sourceApk = resolve(root, process.env.APK_PATH || join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'))

if (!version || !/^\d+\.\d+(?:\.\d+)?$/.test(version)) {
  console.error('请传入版本号，例如：npm run release:github -- 1.3')
  process.exit(1)
}

if (!existsSync(sourceApk)) {
  console.error(`没有找到 APK：${sourceApk}`)
  console.error('请先运行 npm run apk:debug，或用 APK_PATH 指定 APK 文件。')
  process.exit(1)
}

const versionCode = Number(version.replace(/\D/g, ''))
const tag = `v${version}`
const apkName = `shiguang-qingdan-${version}.apk`
const localApkName = `拾光清单-${version}.apk`
const releaseDir = join(root, 'release', tag)
mkdirSync(releaseDir, { recursive: true })

const releaseApk = join(releaseDir, apkName)
const localApk = resolve(root, '..', localApkName)
copyFileSync(sourceApk, releaseApk)
copyFileSync(sourceApk, localApk)

const notesPath = join(root, 'release-notes.txt')
const fallbackNotes = [
  `拾光清单 ${version} 更新`,
  '优化手机端界面细节与日常记录体验',
]
const rawNotes = existsSync(notesPath)
  ? readFileSync(notesPath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  : fallbackNotes
const brokenNotes = rawNotes.filter((line) => /�|\?{3,}|鈥|鎷|娓|鍗|鐨|涓/.test(line))

if (brokenNotes.length) {
  console.error('release-notes.txt 里疑似有乱码，请先用 UTF-8 重新保存后再发布：')
  brokenNotes.forEach((line) => console.error(`- ${line}`))
  process.exit(1)
}

const notes = rawNotes.length ? rawNotes : fallbackNotes

const publishedAt = new Date().toISOString().slice(0, 10)
const manifest = {
  version,
  versionCode,
  apkUrl: `https://github.com/${repo}/releases/download/${tag}/${apkName}`,
  releaseUrl: `https://github.com/${repo}/releases/tag/${tag}`,
  releasesUrl: `https://github.com/${repo}/releases`,
  forceUpdate: false,
  publishedAt,
  notes,
}

const manifestText = `${JSON.stringify(manifest, null, 2)}\n`
const releaseBody = [
  `# 拾光清单 ${version}`,
  '',
  '把日程、记账、清单、课表、便签和日常记录放进一个更轻的手机工具里。这一版继续优先打磨手机端的顺手程度和视觉质感。',
  '',
  '## 本次更新',
  '',
  ...notes.map((note) => `- ${note}`),
  '',
  '## 安装方式',
  '',
  `1. 下载本页下方的 \`${apkName}\`。`,
  '2. 在安卓手机上打开安装包，按系统提示完成安装。',
  '3. 如果系统提示“未知来源”，按提示允许本次安装即可。',
  '',
  '## 测试建议',
  '',
  '- 先试首页快捷记录：例如“午饭23元”“尺子5元”。',
  '- 再试常用功能入口、记账分类、课程表、便签和设置页。',
  '- 如果覆盖安装后显示异常，可以先退出 App 再重新打开一次。',
  '',
  '## 版本信息',
  '',
  `- 版本：${version}`,
  `- 发布日期：${publishedAt}`,
  `- 安装包：${apkName}`,
  '- 更新方式：手动下载，不强制升级。',
  '',
].join('\n')

writeFileSync(join(releaseDir, 'update.json'), manifestText, 'utf8')
writeFileSync(join(root, 'update.json'), manifestText, 'utf8')
writeFileSync(join(root, 'public', 'update.json'), manifestText, 'utf8')
writeFileSync(join(releaseDir, 'release-body.md'), releaseBody, 'utf8')

console.log(`已准备 GitHub Release：${tag}`)
console.log(`APK：release/${tag}/${basename(releaseApk)}`)
console.log(`本地安装包：${localApk}`)
console.log(`update.json：release/${tag}/update.json，并已同步到 public/update.json`)
console.log(`Release 正文：release/${tag}/release-body.md`)
console.log('下一步：创建 GitHub Release，上传 APK，并把 release-body.md 作为发布说明。')
