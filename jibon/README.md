# Jibon Tailor - Mobile App & APK Package

This repository contains all assets, configurations, automated GitHub Actions workflows, and the complete Android Studio project for building the **Jibon Tailor** Android APK.

## 🚀 Building APK via GitHub Actions (Recommended)
1. Push this repository to GitHub or use the **"Export to GitHub"** button in settings.
2. Navigate to the **"Actions"** tab on your GitHub repository.
3. Select the **"Build Jibon Tailor Android APK"** workflow.
4. Click **"Run workflow"**.
5. Once the build completes (~2 minutes), download the generated **`Jibon-Tailor-Android-APK`** artifact containing ready-to-install `.apk` files!

## 📁 Directory Structure
- `.github/workflows/build-apk.yml`: Automated GitHub Actions pipeline to build debug and release APKs.
- `jibon/android-studio-project/`: Complete, production-ready Android Studio project with WebView, camera/photo upload support, hardware acceleration, and offline caching.
- `jibon/pwabuilder-quick-apk/`: Web App Manifest and Digital Asset Links for 1-click cloud APK generation on [PWABuilder.com](https://www.pwabuilder.com/).
- `jibon/web-build-assets/`: Minified static HTML, JS, CSS, and asset files.
- `jibon/build-apk-local.sh`: Local build shell script.
- `jibon/APK_ইনস্টলেশন_ও_তৈরি_গাইড.md`: Step-by-step Bengali instructions.

## Live Application URL
`https://ais-pre-xvaahh6dga2msv7jjvvztm-435093563543.europe-west2.run.app`
