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
const releaseDir = join(root, 'release', tag)
mkdirSync(releaseDir, { recursive: true })

const releaseApk = join(releaseDir, apkName)
copyFileSync(sourceApk, releaseApk)

const notesPath = join(root, 'release-notes.txt')
const notes = existsSync(notesPath)
  ? readFileSync(notesPath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  : [`拾光清单 ${version} 更新`]

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
writeFileSync(join(releaseDir, 'update.json'), manifestText)
writeFileSync(join(root, 'update.json'), manifestText)
writeFileSync(join(root, 'public', 'update.json'), manifestText)

console.log(`已准备 GitHub Release：${tag}`)
console.log(`APK：release/${tag}/${basename(releaseApk)}`)
console.log(`update.json：release/${tag}/update.json，并已同步到 public/update.json`)
console.log('下一步：创建 GitHub Release，上传 APK，然后提交 public/update.json。')
