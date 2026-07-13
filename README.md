# 拾光清单

拾光清单是一款移动端优先的日常管理 App，集成日程、记账、待办清单、习惯打卡、课表、番茄专注、便签、日记、预算提醒、数据备份和年月度报告。

## 功能

- 今日概览：日程、待办、支出、习惯进度、课表、倒数日和今日提醒
- 快捷记录：支持“午饭23元”“工资5000”“周五交作业”“下周一复习”“明天9点开会”等输入，无法识别时会保存为便签
- 快捷反馈：开启识别预览时展示分流结果，关闭预览时也会提示直接提交去向
- 日程表：底部弹层新增/编辑，按日期管理时间段、分类和备注
- 日程快捷：常用时间段、分类快捷选择、无效时间阻止保存和重叠提醒
- 记账：默认支出、快速记账、月预算进度、超支提醒和分类统计
- 清单：待办、完成状态、优先级、截止日期、分类和四象限联动
- 清单筛选：待办/今天/重要/完成切换，过期与今日事项状态提示
- 习惯：本周打卡、百分比进度动画、底部弹层新增和颜色选择
- 课表：今日/本周/学期表视图，课程记忆、周次、教室、老师和颜色
- 课表校验：周次快捷选择，同节次周次冲突会提示并阻止保存
- 番茄专注：专注/休息计时、学霸模式、密码解锁、暂停/继续和进度环
- 番茄预设：短冲刺、标准、深度三种常用时长，一键切换
- 日记与心情：每日短文、心情记录、天气字段和月度心情统计
- 日记模板：一句话、小复盘、感谢模板，本月/全部列表筛选
- 便签：轻量备忘、置顶、搜索、筛选、颜色便签墙和底部弹层编辑
- 报告：月度任务、预算、心情、专注、习惯和年度支出趋势
- 设置：外观模式、主题色、字号、底部导航模块、预算、备份和动效
- 设置体验：底部导航模块使用两列卡片选择，首页功能区仍保留完整入口
- 底栏体验：点按切换模块，长按日程、记账、清单、专注、日记或便签可直接打开新增弹层
- 安全操作：删除记录后会显示“撤销”入口，短时间内可恢复误删内容
- 数据：Capacitor Preferences + localStorage 双层版本化存储，支持 JSON 导出、导入和恢复初始数据
- App 化：已接入 Capacitor，支持 Android / iOS 原生工程同步
- 原生外壳：Android / iOS 图标与启动图已统一为拾光清单暖色视觉
- 离线体验：PWA manifest、service worker 离线缓存和新版本提示
- 安装体验：PWA 快捷入口可直接打开日程、记账、清单、番茄专注、日记和便签，并自动弹出对应操作面板；模块切换会同步地址

## 运行

```bash
npm install
npm run dev
```

## 构建检查

```bash
npm run build
npm run lint
npm run verify
npm run quality:verify
npm run quick-capture:doctor
npm run layout:doctor
npm run mobile:sync
npm run mobile:doctor
npm run mobile:verify
npm run app:doctor
```

## 移动端打包

```bash
npm run mobile:sync
```

这会先构建前端，再把 `dist` 同步到 `android` 和 `ios` 原生工程。

如果想做一轮更完整的移动端验收，可以运行：

```bash
npm run mobile:verify
```

它会依次执行 App 自检、生产构建、lint、移动端环境检查和 Capacitor 同步。

已接入的 Capacitor 插件：

- `@capacitor/app`：安卓返回键和应用生命周期基础能力
- `@capacitor/haptics`：底栏、模块、打卡、删除确认等高频操作的轻触感反馈
- `@capacitor/keyboard`：键盘高度适配，避免底部弹层被遮挡
- `@capacitor/preferences`：App 端原生键值存储，网页端继续使用 localStorage 兜底
- `@capacitor/status-bar`：原生状态栏透明叠加，并随外观切换明暗文字
- `@capacitor/splash-screen`：启动屏基础配置，减少网页壳的突兀感

### Android

```bash
npm run android:open
```

也可以在 `android` 目录运行：

```bash
.\gradlew.bat assembleDebug
```

Android 真机/打包需要本机安装 Android Studio 或 Android SDK，并配置 `ANDROID_HOME` / `ANDROID_SDK_ROOT`。下载完成后 debug APK 会出现在：

```text
android/app/build/outputs/apk/debug/
```

Windows 上最直接的配置方式：

1. 安装 Android Studio，并在 SDK Manager 里安装 Android SDK Platform、Build-Tools 和 Platform-Tools。
2. 确认 SDK 路径，常见位置是 `C:\Users\<用户名>\AppData\Local\Android\Sdk`。
3. 设置环境变量 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 指向该路径；也可以在 `android/local.properties` 写入：

```properties
sdk.dir=C\:\\Users\\<用户名>\\AppData\\Local\\Android\\Sdk
```

4. 重新运行：

```bash
npm run mobile:doctor
npm run apk:debug
```

如果首次构建卡住，常见原因是 Gradle 分发包或 Android SDK 下载问题，不是前端代码错误。

当前项目的 Web 构建、lint、Android/iOS Capacitor 同步已经通过；本机检查未发现 `ANDROID_HOME` / `ANDROID_SDK_ROOT` 或常见 Android SDK 目录，所以生成 APK 暂时卡在原生环境配置阶段。

### iOS

```bash
npm run ios:open
```

iOS 工程已经生成，但真正编译和真机安装需要 macOS、Xcode 和 Apple Developer 账号；Windows 上只能生成并同步工程。

## App 配置

- App ID：`com.shiguang.qingdan`
- App 名称：`拾光清单`
- Web 输出目录：`dist`
- 图标：`public/icon-192.png`、`public/icon-512.png`、`public/apple-touch-icon.png`
- 原生图标/启动图：Android `res/mipmap-*` 与 `res/drawable*/splash.png`、iOS `Assets.xcassets`
- PWA：`public/manifest.webmanifest`、`public/sw.js`
- 本地数据：`Capacitor Preferences` 与 `localStorage` 双写封装，带版本号迁移，支持 JSON 备份
- 后台保存：切换应用、锁屏或页面隐藏时会主动保存一份最新数据快照
- 环境自检：`npm run mobile:doctor` 会检查 Android SDK、Xcode、Capacitor 工程和关键图标/启动图资源
- App 一致性自检：`npm run app:doctor` 会检查 PWA 快捷入口、离线缓存、路由、Capacitor App ID 和关键资源是否对齐
- 模板残留自检：`npm run app:doctor` 会阻止 Vite 示例资源等模板文件重新混入项目
- 快捷记录行为自检：`npm run quick-capture:doctor` 会检查“午饭23元”“明早跑步”“下周二交作业”等输入是否正确分流
- 移动端布局自检：`npm run layout:doctor` 会自动启动临时预览服务，并用 360×780 / 390×844 手机视口检查首页、设置页、日程、记账、清单、浅色、深色、模块卡片、设置预设卡、底栏默认项和快捷入口是否溢出
- 移动端交互自检：布局自检还会模拟设置页真实操作，包括切换外观预设、进入外观设置页、返回设置首页，并检查主要按钮触控尺寸不低于 44px
- 快速质量检查：`npm run verify` 会执行 App 自检、快捷记录行为自检、生产构建和 lint，适合每轮逻辑修改后快速校验
- 完整体验检查：`npm run quality:verify` 会在 `verify` 之后继续跑移动端布局自检，适合每轮界面打磨后使用

## 下一步想法

- 做真实移动端截图巡检，继续修夜间模式、紧凑布局和小屏适配
- 增加更完整的桌面/锁屏小组件方案调研，优先考虑 Capacitor 插件可行性
- 预算升级为分类预算，并在月报里展示分类超支风险
- 评估 SQLite 分类账本/长期统计存储，让多年数据查询更稳
- 配置 Android SDK 后生成 debug APK，再做真机交互测试
