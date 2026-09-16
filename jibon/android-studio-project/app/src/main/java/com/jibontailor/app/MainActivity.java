package com.jibontailor.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.List;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "JibonTailorApp";
    private WebView webView;
    private ValueCallback<Uri[]> mFilePathCallback;
    private String mCameraPhotoPath;
    private static final int INPUT_FILE_REQUEST_CODE = 1001;
    private static final int PERMISSION_REQUEST_CODE = 1002;

    // Secure virtual HTTPS domain provided by AndroidX WebViewAssetLoader for 100% offline ES-module & CORS compliance
    private static final String APP_ASSET_URL = "https://appassets.androidplatform.net/assets/web/index.html";
    // Local embedded fallback
    private static final String APP_LOCAL_FALLBACK = "file:///android_asset/web/index.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        setContentView(webView);

        requestAppPermissions();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " JibonTailorApp/1.0.0");

        // Attach Native JavaScript Interface Bridges
        WebAppInterface nativeBridge = new WebAppInterface();
        webView.addJavascriptInterface(nativeBridge, "AndroidNativeApp");
        webView.addJavascriptInterface(nativeBridge, "AndroidBridge");

        // Native Download Listener for WebView
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    if (url != null && url.startsWith("data:")) {
                        // Handle data: URI download (image, pdf, or json backup)
                        if (url.contains("image/")) {
                            String filename = "Jibon_Tailor_" + System.currentTimeMillis() + ".png";
                            nativeBridge.saveImageBase64(url, filename, "Downloaded Image");
                        } else if (url.contains("application/pdf")) {
                            String filename = "Jibon_Tailor_" + System.currentTimeMillis() + ".pdf";
                            nativeBridge.savePdfBase64(url, filename);
                        } else if (url.contains("json") || (mimetype != null && mimetype.contains("json"))) {
                            String filename = "jibon_tailor_backup_" + System.currentTimeMillis() + ".json";
                            byte[] decoded = nativeBridge.decodeBase64(url);
                            if (decoded != null) {
                                String jsonStr = new String(decoded, "UTF-8");
                                nativeBridge.saveBackupJson(jsonStr, filename);
                            }
                        }
                    } else if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        request.setMimeType(mimetype);
                        request.allowScanningByMediaScanner();
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "JibonTailor_Download");
                        DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                            Toast.makeText(MainActivity.this, "ডাউনলোড শুরু হয়েছে...", Toast.LENGTH_SHORT).show();
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Download error", e);
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
                if (response != null) {
                    return response;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // If it's WhatsApp or Tel, open native intent
                if (url.startsWith("whatsapp://") || url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "WhatsApp অ্যাপটি খুঁজে পাওয়া যায়নি", Toast.LENGTH_SHORT).show();
                    }
                } else if (url.startsWith("tel:") || url.startsWith("mailto:")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Log.e(TAG, "Error opening URI", e);
                    }
                }
                return false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    Log.e(TAG, "WebView error: " + error.getDescription());
                    // Fallback to file URL if asset loader ever encounters issues
                    String currentUrl = view.getUrl();
                    if (currentUrl == null || !currentUrl.startsWith("file:///")) {
                        view.loadUrl(APP_LOCAL_FALLBACK);
                    }
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d("WebViewConsole", consoleMessage.message() + " -- Line "
                        + consoleMessage.lineNumber() + " of " + consoleMessage.sourceId());
                return true;
            }

            // Camera, Gallery, and File Chooser (Smart handling for Backup & Images)
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                boolean isJsonBackupRequest = false;
                boolean isImageRequest = false;

                if (fileChooserParams != null && fileChooserParams.getAcceptTypes() != null) {
                    for (String type : fileChooserParams.getAcceptTypes()) {
                        if (type != null) {
                            String lower = type.trim().toLowerCase(Locale.ROOT);
                            if (lower.contains("json") || lower.endsWith(".json")) {
                                isJsonBackupRequest = true;
                            }
                            if (lower.contains("image")) {
                                isImageRequest = true;
                            }
                        }
                    }
                }

                // If user is restoring a backup file (.json)
                if (isJsonBackupRequest) {
                    mCameraPhotoPath = null;
                    Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                    contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    contentSelectionIntent.setType("*/*");
                    String[] mimeTypes = new String[]{"application/json", "text/plain", "application/octet-stream", "*/*"};
                    contentSelectionIntent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);

                    Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
                    chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
                    chooserIntent.putExtra(Intent.EXTRA_TITLE, "ব্যাকআপ ফাইল (.json) নির্বাচন করুন");
                    startActivityForResult(chooserIntent, INPUT_FILE_REQUEST_CODE);
                    return true;
                }

                // Otherwise, for garment/customer photos, allow Camera capture + Image selection
                Intent takePictureIntent = null;
                File photoFile = null;
                try {
                    photoFile = createImageFile();
                } catch (IOException ex) {
                    Log.e(TAG, "Unable to create image file", ex);
                }

                if (photoFile != null) {
                    mCameraPhotoPath = "file:" + photoFile.getAbsolutePath();
                    Uri photoURI = FileProvider.getUriForFile(MainActivity.this,
                            getPackageName() + ".fileprovider", photoFile);
                    takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                    takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }

                Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentSelectionIntent.setType(isImageRequest ? "image/*" : "*/*");

                Intent[] intentArray;
                if (takePictureIntent != null) {
                    intentArray = new Intent[]{takePictureIntent};
                } else {
                    intentArray = new Intent[0];
                }

                Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "ছবি তুলুন বা গ্যালারি থেকে সিলেক্ট করুন");
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray);

                startActivityForResult(chooserIntent, INPUT_FILE_REQUEST_CODE);
                return true;
            }
        });

        // Load the embedded offline application bundled in APK assets via secure asset loader
        webView.loadUrl(APP_ASSET_URL);
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{
                        Manifest.permission.CAMERA,
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                }, PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == INPUT_FILE_REQUEST_CODE) {
            if (mFilePathCallback == null) {
                super.onActivityResult(requestCode, resultCode, data);
                return;
            }
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK) {
                if (data == null || data.getData() == null) {
                    if (mCameraPhotoPath != null) {
                        results = new Uri[]{Uri.parse(mCameraPhotoPath)};
                    }
                } else {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /**
     * JavaScript Interface Bridge exposed to Web App as window.AndroidNativeApp & window.AndroidBridge
     */
    public class WebAppInterface {

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        /**
         * 1. Native Android PrintManager and WebView.createPrintDocumentAdapter()
         * Opens native Android print dialog, supporting printers and "Save as PDF" with A4 format.
         */
        @JavascriptInterface
        public void printDocument(final String jobName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (webView == null) return;
                    try {
                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (printManager != null) {
                            String name = (jobName != null && !jobName.trim().isEmpty())
                                    ? jobName.trim()
                                    : "Jibon_Tailor_Document";
                            PrintDocumentAdapter printAdapter;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                printAdapter = webView.createPrintDocumentAdapter(name);
                            } else {
                                printAdapter = webView.createPrintDocumentAdapter();
                            }
                            PrintAttributes.Builder builder = new PrintAttributes.Builder();
                            builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                            builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                            builder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
                            printManager.print(name, printAdapter, builder.build());
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Native print error", e);
                        Toast.makeText(MainActivity.this, "প্রিন্টার চালু করা যায়নি: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        /**
         * 1b. Dedicated Isolated HTML Printing
         * Renders target invoice or Karigar ledger in an off-screen WebView and invokes PrintManager.
         * Ensures 100% clean A4 print without application UI, modals, or cutoffs.
         */
        @JavascriptInterface
        public void printHtml(final String htmlContent, final String jobName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        final String name = (jobName != null && !jobName.trim().isEmpty())
                                ? jobName.trim()
                                : "Jibon_Tailor_Print";

                        final WebView printWebView = new WebView(MainActivity.this);
                        WebSettings printSettings = printWebView.getSettings();
                        printSettings.setJavaScriptEnabled(false);
                        printSettings.setDomStorageEnabled(true);
                        printSettings.setAllowFileAccess(true);
                        printSettings.setAllowContentAccess(true);

                        printWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageFinished(WebView view, String url) {
                                try {
                                    PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                    if (printManager != null) {
                                        PrintDocumentAdapter printAdapter;
                                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                            printAdapter = view.createPrintDocumentAdapter(name);
                                        } else {
                                            printAdapter = view.createPrintDocumentAdapter();
                                        }
                                        PrintAttributes.Builder builder = new PrintAttributes.Builder();
                                        builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                                        builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                                        printManager.print(name, printAdapter, builder.build());
                                    }
                                } catch (Exception ex) {
                                    Log.e(TAG, "printHtml onPageFinished error", ex);
                                }
                            }
                        });

                        printWebView.loadDataWithBaseURL("file:///android_asset/web/", htmlContent, "text/html", "UTF-8", null);
                    } catch (Exception e) {
                        Log.e(TAG, "printHtml init error", e);
                        Toast.makeText(MainActivity.this, "প্রিন্ট শুরু করা যায়নি: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        /**
         * 2. Native PNG Save to Android MediaStore (Pictures/JibonTailor)
         * Supports Android 10+ Scoped Storage & Android 9- legacy public storage.
         */
        @JavascriptInterface
        public boolean saveImageBase64(final String base64Data, final String filename, final String title) {
            try {
                final byte[] imageBytes = decodeBase64(base64Data);
                if (imageBytes == null || imageBytes.length == 0) {
                    showToast("ছবি প্রসেস করা সম্ভব হয়নি");
                    return false;
                }

                final String cleanFilename = (filename != null && !filename.trim().isEmpty())
                        ? filename.trim()
                        : "Invoice_" + System.currentTimeMillis() + ".png";

                boolean success = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    // Android 10+ Scoped Storage MediaStore
                    ContentResolver resolver = getContentResolver();
                    ContentValues contentValues = new ContentValues();
                    contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, cleanFilename);
                    contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "image/png");
                    contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/JibonTailor");
                    contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);
                    if (imageUri != null) {
                        OutputStream fos = resolver.openOutputStream(imageUri);
                        if (fos != null) {
                            fos.write(imageBytes);
                            fos.flush();
                            fos.close();
                        }
                        contentValues.clear();
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                        resolver.update(imageUri, contentValues, null, null);
                        success = true;
                    }
                } else {
                    // Android 9 and below: Public Pictures Directory
                    File picturesDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "JibonTailor");
                    if (!picturesDir.exists()) {
                        picturesDir.mkdirs();
                    }
                    File imageFile = new File(picturesDir, cleanFilename);
                    FileOutputStream fos = new FileOutputStream(imageFile);
                    fos.write(imageBytes);
                    fos.flush();
                    fos.close();

                    MediaScannerConnection.scanFile(MainActivity.this,
                            new String[]{imageFile.getAbsolutePath()},
                            new String[]{"image/png"}, null);
                    success = true;
                }

                if (success) {
                    showToast("✅ ছবি সফলভাবে গ্যালারিতে সংরক্ষিত হয়েছে (Pictures/JibonTailor)");
                } else {
                    showToast("ছবি সেভ করা সম্ভব হয়নি");
                }
                return success;
            } catch (Exception e) {
                Log.e(TAG, "Save image error", e);
                showToast("ছবি সেভ করতে ত্রুটি: " + e.getMessage());
                return false;
            }
        }

        /**
         * 3. Native PDF Save to Android Downloads (Downloads/JibonTailor)
         */
        @JavascriptInterface
        public boolean savePdfBase64(final String base64Data, final String filename) {
            try {
                final byte[] pdfBytes = decodeBase64(base64Data);
                if (pdfBytes == null || pdfBytes.length == 0) {
                    showToast("PDF ফাইল প্রসেস করা সম্ভব হয়নি");
                    return false;
                }

                final String cleanFilename = (filename != null && !filename.trim().isEmpty())
                        ? filename.trim()
                        : "Invoice_" + System.currentTimeMillis() + ".pdf";

                boolean success = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = getContentResolver();
                    ContentValues contentValues = new ContentValues();
                    contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, cleanFilename);
                    contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                    contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/JibonTailor");
                    contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri pdfUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                    if (pdfUri != null) {
                        OutputStream fos = resolver.openOutputStream(pdfUri);
                        if (fos != null) {
                            fos.write(pdfBytes);
                            fos.flush();
                            fos.close();
                        }
                        contentValues.clear();
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                        resolver.update(pdfUri, contentValues, null, null);
                        success = true;
                    }
                } else {
                    File downloadsDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "JibonTailor");
                    if (!downloadsDir.exists()) {
                        downloadsDir.mkdirs();
                    }
                    File pdfFile = new File(downloadsDir, cleanFilename);
                    FileOutputStream fos = new FileOutputStream(pdfFile);
                    fos.write(pdfBytes);
                    fos.flush();
                    fos.close();

                    MediaScannerConnection.scanFile(MainActivity.this,
                            new String[]{pdfFile.getAbsolutePath()},
                            new String[]{"application/pdf"}, null);
                    success = true;
                }

                if (success) {
                    showToast("✅ PDF সফলভাবে Downloads ফোল্ডারে সংরক্ষিত হয়েছে");
                } else {
                    showToast("PDF সেভ করা সম্ভব হয়নি");
                }
                return success;
            } catch (Exception e) {
                Log.e(TAG, "Save PDF error", e);
                showToast("PDF সেভ করতে সমস্যা: " + e.getMessage());
                return false;
            }
        }

        /**
         * 4 & 5. Native WhatsApp Image Share with Intent.ACTION_SEND ("image/png") and FileProvider
         * Direct share screen ready with image attachment.
         */
        @JavascriptInterface
        public boolean shareImageWhatsApp(final String base64Data, final String filename, final String phoneNumber, final String captionText) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] imageBytes = decodeBase64(base64Data);
                        if (imageBytes == null || imageBytes.length == 0) {
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    showToast("ছবি প্রসেস করা যায়নি");
                                }
                            });
                            return;
                        }

                        String cleanFilename = (filename != null && !filename.trim().isEmpty())
                                ? filename.trim()
                                : "Invoice_Share_" + System.currentTimeMillis() + ".png";

                        File cacheDir = new File(getCacheDir(), "shared_images");
                        if (!cacheDir.exists()) {
                            cacheDir.mkdirs();
                        }
                        File imageFile = new File(cacheDir, cleanFilename);
                        FileOutputStream fos = new FileOutputStream(imageFile);
                        fos.write(imageBytes);
                        fos.flush();
                        fos.close();

                        final Uri contentUri = FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                imageFile
                        );

                        final Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("image/png");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        shareIntent.setClipData(ClipData.newRawUri("Invoice PNG", contentUri));
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                        if (captionText != null && !captionText.trim().isEmpty()) {
                            shareIntent.putExtra(Intent.EXTRA_TEXT, captionText.trim());
                        }

                        // Check if WhatsApp or WhatsApp Business is installed
                        boolean isWhatsAppInstalled = isPackageInstalled("com.whatsapp");
                        boolean isWhatsAppBusinessInstalled = isPackageInstalled("com.whatsapp.w4b");

                        Intent targetIntent = shareIntent;
                        if (isWhatsAppInstalled) {
                            targetIntent.setPackage("com.whatsapp");
                            grantUriPermission("com.whatsapp", contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        } else if (isWhatsAppBusinessInstalled) {
                            targetIntent.setPackage("com.whatsapp.w4b");
                            grantUriPermission("com.whatsapp.w4b", contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        } else {
                            // Fallback to system chooser for all apps
                            targetIntent = Intent.createChooser(shareIntent, "ইনভয়েস শেয়ার করুন");
                            targetIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            targetIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            try {
                                List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(shareIntent, PackageManager.MATCH_DEFAULT_ONLY);
                                for (ResolveInfo resolveInfo : resInfoList) {
                                    grantUriPermission(resolveInfo.activityInfo.packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                }
                            } catch (Exception ignored) {}
                        }

                        final Intent finalIntent = targetIntent;
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    startActivity(finalIntent);
                                } catch (Exception ex) {
                                    Log.e(TAG, "WhatsApp share error, falling back to chooser", ex);
                                    shareIntent.setPackage(null);
                                    Intent chooser = Intent.createChooser(shareIntent, "ইনভয়েস শেয়ার করুন");
                                    chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    try {
                                        startActivity(chooser);
                                    } catch (Exception ex2) {
                                        showToast("শেয়ার অ্যাপ খুলতে ব্যর্থ: " + ex2.getMessage());
                                    }
                                }
                            }
                        });
                    } catch (Exception e) {
                        Log.e(TAG, "WhatsApp share error", e);
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                showToast("WhatsApp শেয়ার করতে সমস্যা: " + e.getMessage());
                            }
                        });
                    }
                }
            }).start();
            return true;
        }

        /**
         * General Image Sharing via Android System Chooser to ANY platform
         * (WhatsApp, Messenger, Facebook, IMO, Telegram, Bluetooth, Google Drive, Email, etc.)
         * When captionText is null or empty, it strictly shares ONLY the PNG image without any text.
         */
        @JavascriptInterface
        public boolean shareImageGeneral(final String base64Data, final String filename, final String captionText) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] imageBytes = decodeBase64(base64Data);
                        if (imageBytes == null || imageBytes.length == 0) {
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    showToast("ছবি প্রসেস করা সম্ভব হয়নি");
                                }
                            });
                            return;
                        }

                        String cleanFilename = (filename != null && !filename.trim().isEmpty())
                                ? filename.trim()
                                : "Jibon_Tailor_Invoice_" + System.currentTimeMillis() + ".png";

                        File cacheDir = new File(getCacheDir(), "shared_images");
                        if (!cacheDir.exists()) cacheDir.mkdirs();
                        File imageFile = new File(cacheDir, cleanFilename);
                        FileOutputStream fos = new FileOutputStream(imageFile);
                        fos.write(imageBytes);
                        fos.flush();
                        fos.close();

                        final Uri contentUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", imageFile);

                        final Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("image/png");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        shareIntent.setClipData(ClipData.newRawUri("Invoice PNG", contentUri));
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                        // Strict requirement: Only attach text if explicitly provided and non-empty.
                        // If empty, shares ONLY the PNG image without text/captions.
                        if (captionText != null && !captionText.trim().isEmpty()) {
                            shareIntent.putExtra(Intent.EXTRA_TEXT, captionText.trim());
                        }

                        final Intent chooser = Intent.createChooser(shareIntent, "শেয়ার করুন (Share PNG)");
                        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                        // Grant read permission to all matching activities
                        try {
                            List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(shareIntent, PackageManager.MATCH_DEFAULT_ONLY);
                            for (ResolveInfo resolveInfo : resInfoList) {
                                String packageName = resolveInfo.activityInfo.packageName;
                                grantUriPermission(packageName, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            }
                        } catch (Exception ex) {
                            Log.w(TAG, "grantUriPermission query error", ex);
                        }

                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    startActivity(chooser);
                                } catch (Exception e) {
                                    Log.e(TAG, "start chooser error", e);
                                    try {
                                        startActivity(shareIntent);
                                    } catch (Exception e2) {
                                        showToast("শেয়ার অ্যাপ চালু করা যায়নি: " + e2.getMessage());
                                    }
                                }
                            }
                        });
                    } catch (Exception e) {
                        Log.e(TAG, "Share general error", e);
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                showToast("শেয়ার করতে সমস্যা হয়েছে: " + e.getMessage());
                            }
                        });
                    }
                }
            }).start();
            return true;
        }

        /**
         * Dedicated Pure PNG Sharing (Zero text, zero caption) to any platform
         */
        @JavascriptInterface
        public boolean shareImagePngOnly(final String base64Data, final String filename) {
            return shareImageGeneral(base64Data, filename, "");
        }

        /**
         * 6. Native Data Backup JSON Save & Share
         * Saves JSON to Downloads/JibonTailor directory, shows Toast notice,
         * and triggers system Share sheet so user can save to Drive, WhatsApp, Files, etc.
         */
        @JavascriptInterface
        public boolean saveBackupJson(final String jsonContent, final String filename) {
            try {
                if (jsonContent == null || jsonContent.trim().isEmpty()) {
                    showToast("ব্যাকআপ ডাটা পাওয়া যায়নি");
                    return false;
                }

                final byte[] jsonBytes = jsonContent.getBytes("UTF-8");
                final String cleanFilename = (filename != null && !filename.trim().isEmpty())
                        ? filename.trim()
                        : "jibon_tailor_backup_" + new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date()) + ".json";

                boolean success = false;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = getContentResolver();
                    ContentValues contentValues = new ContentValues();
                    contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, cleanFilename);
                    contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                    contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/JibonTailor");
                    contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);

                    Uri jsonUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                    if (jsonUri != null) {
                        OutputStream fos = resolver.openOutputStream(jsonUri);
                        if (fos != null) {
                            fos.write(jsonBytes);
                            fos.flush();
                            fos.close();
                        }
                        contentValues.clear();
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                        resolver.update(jsonUri, contentValues, null, null);
                        success = true;
                    }
                } else {
                    File downloadsDir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "JibonTailor");
                    if (!downloadsDir.exists()) {
                        downloadsDir.mkdirs();
                    }
                    File jsonFile = new File(downloadsDir, cleanFilename);
                    FileOutputStream fos = new FileOutputStream(jsonFile);
                    fos.write(jsonBytes);
                    fos.flush();
                    fos.close();

                    MediaScannerConnection.scanFile(MainActivity.this,
                            new String[]{jsonFile.getAbsolutePath()},
                            new String[]{"application/json"}, null);
                    success = true;
                }

                if (success) {
                    showToast("✅ ব্যাকআপ ফাইল Downloads ফোল্ডারে সংরক্ষিত হয়েছে (" + cleanFilename + ")");

                    // Also make a cache copy and launch system share sheet (Google Drive, WhatsApp, Files)
                    try {
                        File cacheDir = new File(getCacheDir(), "shared_backups");
                        if (!cacheDir.exists()) cacheDir.mkdirs();
                        File shareFile = new File(cacheDir, cleanFilename);
                        FileOutputStream fos = new FileOutputStream(shareFile);
                        fos.write(jsonBytes);
                        fos.flush();
                        fos.close();

                        final Uri shareUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", shareFile);
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                                    shareIntent.setType("application/json");
                                    shareIntent.putExtra(Intent.EXTRA_STREAM, shareUri);
                                    shareIntent.putExtra(Intent.EXTRA_SUBJECT, cleanFilename);
                                    shareIntent.putExtra(Intent.EXTRA_TEXT, "জীবন টেইলার ব্যাকআপ ফাইল (" + cleanFilename + ")");
                                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                    Intent chooser = Intent.createChooser(shareIntent, "ব্যাকআপ ফাইল সংরক্ষণ বা শেয়ার করুন (Drive/WhatsApp/Files)");
                                    startActivity(chooser);
                                } catch (Exception ex) {
                                    Log.e(TAG, "Share backup error", ex);
                                }
                            }
                        });
                    } catch (Exception ex) {
                        Log.w(TAG, "Cache share backup copy error", ex);
                    }
                } else {
                    showToast("ব্যাকআপ ফাইল সংরক্ষণ করা যায়নি");
                }
                return success;
            } catch (Exception e) {
                Log.e(TAG, "Save backup error", e);
                showToast("ব্যাকআপ ফাইলে সমস্যা: " + e.getMessage());
                return false;
            }
        }

        private byte[] decodeBase64(String input) {
            if (input == null) return null;
            String clean = input.trim();
            int commaIdx = clean.indexOf(',');
            if (commaIdx >= 0) {
                clean = clean.substring(commaIdx + 1);
            }
            return Base64.decode(clean, Base64.DEFAULT);
        }

        private boolean isPackageInstalled(String packageName) {
            PackageManager pm = getPackageManager();
            try {
                pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                return false;
            }
        }

        private void showToast(final String msg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
