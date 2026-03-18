# Android Studio 运行与打包

## 1. 开发模式运行（连接本地服务）
```bash
npm run dev
npx cap copy android
npx cap sync android
npx cap open android
```

### Android Studio 内操作
- 创建模拟器：Tools → Device Manager → Create Device
- 运行：点击 Run 按钮选择模拟器或真机
- 真机调试：手机开启 USB 调试 → 用数据线连接
- Logcat：View → Tool Windows → Logcat

## 2. 打包前切换为本地文件模式
- 在 [capacitor.config.ts](capacitor.config.ts) 中删除 `server` 配置
- 重新构建并同步：
```bash
npm run build
npx cap copy android
npx cap sync android
```

## 3. 解决 file:// 资源加载失败
- 确认 [next.config.mjs](next.config.mjs) 使用 `assetPrefix: "./"` 和 `output: "export"`
- MainActivity 添加 WebView 配置：
```java
webSettings.setAllowFileAccess(true);
webSettings.setAllowFileAccessFromFileURLs(true);
webSettings.setAllowUniversalAccessFromFileURLs(true);
```

## 4. Android 权限
- AndroidManifest.xml 添加：
```xml
<uses-permission android:name="android.permission.INTERNET" />
```
- 开发时允许明文流量：
```xml
<application android:usesCleartextTraffic="true" ...>
```

## 5. 常见问题
- Gradle 同步失败：尝试配置国内镜像或升级 Gradle
- 模拟器黑屏：删除旧 AVD 后重建，或切换为 x86_64 镜像
- 资源 404：确认 build 输出为 `out/` 并执行 `npx cap sync android`
