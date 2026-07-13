import { existsSync, readFileSync } from 'node:fs'
import { platform } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const isWindows = platform() === 'win32'

function check(label, ok, detail = '') {
  const mark = ok ? '[OK]' : '[!!]'
  console.log(`${mark} ${label}${detail ? ` - ${detail}` : ''}`)
  return ok
}

function commandVersion(command, args = ['--version']) {
  if (command === 'npm') {
    const userAgentVersion = process.env.npm_config_user_agent?.match(/npm\/([^\s]+)/)?.[1]
    if (userAgentVersion) return userAgentVersion

    if (process.env.npm_execpath && existsSync(process.env.npm_execpath)) {
      const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], { encoding: 'utf8' })
      if (!result.error && result.status === 0) return (result.stdout || result.stderr).trim().split('\n')[0]
    }
  }

  const executable = isWindows && command === 'npm' ? 'npm.cmd' : command
  const result = spawnSync(executable, args, { encoding: 'utf8' })
  if (result.error || result.status !== 0) return null
  return (result.stdout || result.stderr).trim().split('\n')[0]
}

function readAndroidSdkFromLocalProperties() {
  const file = join(root, 'android', 'local.properties')
  if (!existsSync(file)) return null
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find((item) => item.trim().startsWith('sdk.dir='))
  if (!line) return null
  return line.slice('sdk.dir='.length).replace(/\\\\/g, '\\').replace(/\\:/g, ':').trim()
}

function androidSdkCandidates() {
  return [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    readAndroidSdkFromLocalProperties(),
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
    process.env.USERPROFILE ? join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk') : null,
    'C:\\Android\\Sdk',
    'D:\\Android\\Sdk',
  ].filter(Boolean)
}

console.log('拾光清单移动端环境自检')
console.log('----------------------')

const nodeVersion = commandVersion('node')
const npmVersion = commandVersion('npm')
check('Node.js', !!nodeVersion, nodeVersion || '未找到 node')
check('npm', !!npmVersion, npmVersion || '未找到 npm')
check('Capacitor 配置', existsSync(join(root, 'capacitor.config.ts')), 'capacitor.config.ts')
check('Android 工程', existsSync(join(root, 'android', 'gradlew.bat')) || existsSync(join(root, 'android', 'gradlew')), 'android/')
check('iOS 工程', existsSync(join(root, 'ios', 'App')), 'ios/App')

const sdkPath = androidSdkCandidates().find((item) => existsSync(item))
check('Android SDK', !!sdkPath, sdkPath ? resolve(sdkPath) : '未找到，请安装 Android Studio 或配置 ANDROID_HOME / android/local.properties')
if (sdkPath) {
  check('Android platform-tools', existsSync(join(sdkPath, 'platform-tools')), join(sdkPath, 'platform-tools'))
  check('Android build-tools', existsSync(join(sdkPath, 'build-tools')), join(sdkPath, 'build-tools'))
  check('Android platforms', existsSync(join(sdkPath, 'platforms')), join(sdkPath, 'platforms'))
}

const xcode = commandVersion('xcodebuild')
check('Xcode / xcodebuild', !!xcode, xcode || (isWindows ? 'Windows 只能同步 iOS 工程，不能本机编译 iOS' : '未找到 xcodebuild'))

const requiredAssets = [
  'public/icon-192.png',
  'public/icon-512.png',
  'public/apple-touch-icon.png',
  'public/manifest.webmanifest',
  'public/sw.js',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  'android/app/src/main/res/drawable-port-xxxhdpi/splash.png',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
]

requiredAssets.forEach((asset) => check(`资源 ${asset}`, existsSync(join(root, asset))))

console.log('----------------------')
if (!sdkPath) {
  console.log('下一步：安装 Android Studio 后运行 npm run mobile:doctor，再运行 npm run android:debug 生成 APK。')
} else {
  console.log('下一步：运行 npm run android:debug 生成 debug APK。')
}
