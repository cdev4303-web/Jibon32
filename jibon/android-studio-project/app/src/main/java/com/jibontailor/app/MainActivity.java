package com.jibontailor.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
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
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

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

    // The live deployed cloud URL of Jibon Tailor
    private static final String APP_ONLINE_URL = "https://ais-pre-xvaahh6dga2msv7jjvvztm-435093563543.europe-west2.run.app";
    // Local embedded fallback
    private static final String APP_LOCAL_FALLBACK = "file:///android_asset/web/index.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        requestAppPermissions();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
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
                        // Handle data: URI download (e.g. data:image/png;base64,... or data:application/pdf;base64,...)
                        if (url.contains("image/")) {
                            String filename = "Jibon_Tailor_" + System.currentTimeMillis() + ".png";
                            nativeBridge.saveImageBase64(url, filename, "Downloaded Image");
                        } else if (url.contains("application/pdf")) {
                            String filename = "Jibon_Tailor_" + System.currentTimeMillis() + ".pdf";
                            nativeBridge.savePdfBase64(url, filename);
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
                // If network fails, load local offline fallback
                if (request.isForMainFrame()) {
                    view.loadUrl(APP_LOCAL_FALLBACK);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            // Camera & Gallery File Chooser
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
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
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                    takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }

                Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentSelectionIntent.setType("image/*");

                Intent[] intentArray;
                if (photoFile != null) {
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

        // Load the main tailor management application
        webView.loadUrl(APP_ONLINE_URL);
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
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] imageBytes = decodeBase64(base64Data);
                        if (imageBytes == null || imageBytes.length == 0) {
                            showToast("ছবি প্রসেস করা যায়নি");
                            return;
                        }

                        String cleanFilename = (filename != null && !filename.trim().isEmpty())
                                ? filename.trim()
                                : "Invoice_Share_" + System.currentTimeMillis() + ".png";

                        // Save temporarily to cache directory for FileProvider sharing
                        File cacheDir = new File(getCacheDir(), "shared_images");
                        if (!cacheDir.exists()) {
                            cacheDir.mkdirs();
                        }
                        File imageFile = new File(cacheDir, cleanFilename);
                        FileOutputStream fos = new FileOutputStream(imageFile);
                        fos.write(imageBytes);
                        fos.flush();
                        fos.close();

                        Uri contentUri = FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                imageFile
                        );

                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("image/png");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                        if (captionText != null && !captionText.trim().isEmpty()) {
                            shareIntent.putExtra(Intent.EXTRA_TEXT, captionText.trim());
                        }

                        // Check if WhatsApp is installed
                        boolean isWhatsAppInstalled = isPackageInstalled("com.whatsapp");
                        boolean isWhatsAppBusinessInstalled = isPackageInstalled("com.whatsapp.w4b");

                        if (isWhatsAppInstalled) {
                            shareIntent.setPackage("com.whatsapp");
                        } else if (isWhatsAppBusinessInstalled) {
                            shareIntent.setPackage("com.whatsapp.w4b");
                        }

                        try {
                            startActivity(shareIntent);
                        } catch (Exception ex) {
                            // Fallback to general system chooser
                            Intent chooser = Intent.createChooser(shareIntent, "WhatsApp বা অন্যান্য অ্যাপে ইনভয়েস শেয়ার করুন");
                            startActivity(chooser);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "WhatsApp share error", e);
                        showToast("WhatsApp শেয়ার করতে সমস্যা: " + e.getMessage());
                    }
                }
            });
            return true;
        }

        /**
         * General Image Sharing via Android System Chooser
         */
        @JavascriptInterface
        public boolean shareImageGeneral(final String base64Data, final String filename, final String captionText) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] imageBytes = decodeBase64(base64Data);
                        if (imageBytes == null || imageBytes.length == 0) return;

                        String cleanFilename = (filename != null && !filename.trim().isEmpty())
                                ? filename.trim()
                                : "Share_" + System.currentTimeMillis() + ".png";

                        File cacheDir = new File(getCacheDir(), "shared_images");
                        if (!cacheDir.exists()) cacheDir.mkdirs();
                        File imageFile = new File(cacheDir, cleanFilename);
                        FileOutputStream fos = new FileOutputStream(imageFile);
                        fos.write(imageBytes);
                        fos.flush();
                        fos.close();

                        Uri contentUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", imageFile);

                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("image/png");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        if (captionText != null && !captionText.isEmpty()) {
                            shareIntent.putExtra(Intent.EXTRA_TEXT, captionText);
                        }

                        startActivity(Intent.createChooser(shareIntent, "ছবি শেয়ার করুন"));
                    } catch (Exception e) {
                        Log.e(TAG, "Share general error", e);
                    }
                }
            });
            return true;
        }

        private byte[] decodeBase64(String input) {
            if (input == null) return null;
            String clean = input;
            if (clean.contains(",")) {
                clean = clean.substring(clean.indexOf(",") + 1);
            }
            clean = clean.replaceAll("\\s+", "");
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
