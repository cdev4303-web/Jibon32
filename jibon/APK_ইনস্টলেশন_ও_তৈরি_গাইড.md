# জীবন টেইলার্স (Jibon Tailor) - Release APK সাইনিং, GitHub Actions ও ডেটা অক্ষত রেখে আপডেট গাইড

এই প্রোজেক্টটিতে **জীবন টেইলার্স** ম্যানেজমেন্ট সিস্টেমের স্বয়ংক্রিয় **GitHub Actions Signed Release APK Builder** এবং সম্পূর্ণ অ্যান্ড্রয়েড সোর্স কোড প্রস্তুত করে দেওয়া হয়েছে।

---

## 🛑 সমস্যার মূল কারণ এবং স্থায়ী সমাধান:

### আগে কেন Uninstall করতে হতো এবং ডেটা মুছে যেত?
1. পূর্বে GitHub Actions-এ `assembleDebug` চলছিল এবং প্রতিবার GitHub-এর নতুন সার্ভারে একটি **অস্থায়ী (Random) Debug Keystore** তৈরি হতো।
2. অ্যান্ড্রয়েডের সিকিউরিটি নিয়ম অনুযায়ী, ইনস্টল থাকা অ্যাপের **Signing Key** এবং নতুন আপডেটের **Signing Key** হুবহু একই না হলে অ্যান্ড্রয়েড সরাসরি আপডেট ইনস্টল করতে দেয় না (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`)।
3. ফলে আগের ভার্সন আনইনস্টল করতে হতো। আর অ্যান্ড্রয়েড অ্যাপ আনইনস্টল করলে ডিভাইসে থাকা WebView `localStorage`, `IndexedDB`, এবং ডাটাবেজ স্বয়ংক্রিয়ভাবে মুছে যায়।

### এখন যেভাবে সমাধান করা হয়েছে:
1. **স্থায়ী Release Keystore:** অ্যাপটি এখন সবসময় একটি স্থায়ী ক্রিপ্টোগ্রাফিক Release Keystore দিয়ে সাইন হয়ে বের হবে।
2. **অক্ষত Application ID:** `com.jibontailor.app` সম্পূর্ণ অপরিবর্তিত রাখা হয়েছে (কোনো `.debug` সাফিক্স ছাড়া)।
3. **স্বয়ংক্রিয় Version Code বৃদ্ধি:** প্রতিবার বিল্ড করার সময় `versionCode` স্বয়ংক্রিয়ভাবে বাড়তে থাকবে (যেমন: ১০১, ১০২, ১০৩...), যাতে অ্যান্ড্রয়েড নির্বিঘ্নে আপডেট গ্রহণ করে।
4. **অক্ষত ডেটা:** একই সাইনিং কি (Signing Key) ও একই প্যাকেজ নেম থাকার কারণে, পুরোনো অ্যাপ আনইনস্টল করার প্রয়োজন হবে না। নতুন APK ফাইলটির উপর ক্লিক করলেই **"Update"** অপশন আসবে এবং ভেতরের কাস্টমার, ইনভয়েস ও মেজারমেন্ট ডেটা সম্পূর্ণ অক্ষত থাকবে!

---

## 🔑 ধাপ ১: স্থায়ী Release Keystore তৈরি করা (একবার মাত্র করতে হবে)

আপনার কম্পিউটারে (টার্মিনাল বা কমান্ড প্রম্পটে) নিচের কমান্ডটি দিয়ে একটি নিরাপদ Release Keystore তৈরি করুন:

```bash
keytool -genkey -v -keystore jibon-tailor-release.jks -alias jibontailor -keyalg RSA -keysize 2048 -validity 10000
```
*(পাসওয়ার্ড মনে রাখবেন, যেমন ধরা যাক আপনি পাসওয়ার্ড দিলেন: `Jibon@Tailor2025`)*

এরপর এই ফাইলটিকে **Base64** টেক্সটে রূপান্তর করুন:

* **ম্যাক বা লিনাক্সে:**
  ```bash
  base64 -w 0 jibon-tailor-release.jks > keystore_base64.txt
  ```
* **উইন্ডোজ PowerShell-এ:**
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("jibon-tailor-release.jks")) | Set-Content keystore_base64.txt
  ```
`keystore_base64.txt` ফাইলে যে দীর্ঘ টেক্সট কোডটি তৈরি হবে, সেটি কপি করে নিন।

> ⚠️ **জরুরি সতর্কতা:** `jibon-tailor-release.jks` ফাইলটি পেনড্রাইভ বা গুগল ড্রাইভে আজীবনের জন্য সুরক্ষিত রাখুন। এটি কখনো রিপোজিটোরির কোডে সরাসরি পুশ করবেন না।

---

## 🔒 ধাপ ২: GitHub Repository Secrets সেটআপ করুন

আপনার GitHub রিপোজিটোরিতে যান (উদা: `https://github.com/আপনার_ইউজার/jibon-tailor`):
1. **Settings** ট্যাবে যান।
2. বামপাশের মেনু থেকে **Secrets and variables** > **Actions**-এ ক্লিক করুন।
3. **New repository secret** বোতাম চেপে নিচের ৪টি Secret যোগ করুন:

| Secret-এর নাম | মান (Value) | উদাহরণ |
| :--- | :--- | :--- |
| `KEYSTORE_BASE64` | ধাপ ১-এ পাওয়া বেস৬৪ টেক্সট স্ট্রিং | `MIID...` (সম্পূর্ণ লম্বা কোডটি) |
| `KEYSTORE_PASSWORD` | আপনার Keystore-এর পাসওয়ার্ড | `আপনার_পাসওয়ার্ড` |
| `KEY_ALIAS` | কি অ্যালাইয়াসের নাম | `jibontailor` |
| `KEY_PASSWORD` | কি পাসওয়ার্ড (সাধারণত Keystore পাসওয়ার্ডের সমান) | `আপনার_পাসওয়ার্ড` |

---

## 🚀 ধাপ ৩: GitHub Actions দিয়ে Signed Release APK তৈরি ও আপডেট

1. আপনার GitHub রিপোজিটোরির **"Actions"** ট্যাবে যান।
2. বামপাশে **"Build Jibon Tailor Android APK"** দেখতে পাবেন।
3. **"Run workflow"** বোতামে চাপুন।
   - চাইলে আপনি নির্দিষ্ট `version_name` (যেমন: `1.0.1`) দিতে পারেন, অথবা খালি রেখে সরাসরি সবুজ বোতাম চাপুন।
4. ২-৩ মিনিটের মধ্যে বিল্ড সম্পন্ন হয়ে সবুজ টিক (✅) দেখাবে।
5. বিল্ড রেজাল্টের **Artifacts** সেকশনে **`Jibon-Tailor-Android-Release-APK`** ডাউনলোড করুন।
6. জিপ ফাইলের ভেতর আপনি পাবেন:
   - **`Jibon-Tailor-release-latest.apk`**
   - **`Jibon-Tailor-v1.0.0-build101-release.apk`**
7. ফোনে পাঠানো মাত্রই অ্যান্ড্রয়েড এটিকে আগের অ্যাপের **Update** হিসেবে চিহ্নিত করবে। কোনো Uninstall ছাড়াই সরাসরি **Update** এ চাপলে আপনার সমস্ত পুরোনো হিসাব ও ডাটা অক্ষত থাকবে!

---

## 🔄 ভবিষ্যৎ ডেভেলপমেন্ট ফ্লো (Seamless Update Workflow):

1. **Google AI Studio-তে কোড ঠিক বা ফিচার যোগ করুন।**
2. **GitHub-এ এক্সপোর্ট/পুশ করুন:** Settings > Export to GitHub.
3. **GitHub Actions স্বয়ংক্রিয়ভাবে চলবে:** এবং আপনার সেই সিক্রেট Keystore ব্যবহার করে signed APK বানিয়ে ফেলবে।
4. **ফোনে APK ডাউনলোড করে সরাসরি ইনস্টল (Update) করুন:** পুরোনো ডেটা ১ সেকেন্ডেও মুছবে না!
