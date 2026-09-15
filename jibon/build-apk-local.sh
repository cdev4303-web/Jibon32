#!/bin/bash
set -e

echo "=================================================="
echo "    Jibon Tailor - Android APK Build Utility"
echo "=================================================="

# Check for Java
if ! command -v javac &> /dev/null; then
    echo "⚠️ Warning: Java (JDK 17+) is required to build an Android APK."
    echo "Please install JDK: sudo apt install openjdk-17-jdk (Linux) or download from https://adoptium.net/"
    exit 1
fi

echo "✅ Java found: $(javac -version)"

cd android-studio-project

if [ -f "./gradlew" ]; then
    chmod +x ./gradlew
    echo "🚀 Building Release APK with Gradle..."
    ./gradlew assembleRelease
    echo "🎉 APK built successfully in android-studio-project/app/build/outputs/apk/release/"
else
    echo "ℹ️ Note: To build directly, open the 'android-studio-project' folder in Android Studio"
    echo "   and select: Build > Build Bundle(s) / APK(s) > Build APK(s)."
fi
