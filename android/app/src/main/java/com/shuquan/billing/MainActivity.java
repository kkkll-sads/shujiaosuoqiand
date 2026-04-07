package com.shuquan.billing;

import android.Manifest;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AlertDialog;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;

public class MainActivity extends BridgeActivity {
    private static final int STARTUP_PERMISSION_REQUEST_CODE = 1001;
    private static final int WEB_PERM_REQUEST_CODE = 2001;
    private boolean isPermissionDialogShowing = false;
    private int statusBarHeightDp = 0;
    private int navBarHeightDp = 0;
    private String pendingWebPermCallbackId = null;
    private String pendingWebPermName = null;

    private DownloadManager downloadManager;
    private long currentDownloadId = -1;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private BroadcastReceiver downloadReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(true);
            insetsController.setAppearanceLightNavigationBars(true);
        }

        int statusBarPx = 0;
        int resId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resId > 0) {
            statusBarPx = getResources().getDimensionPixelSize(resId);
        }
        float density = getResources().getDisplayMetrics().density;
        statusBarHeightDp = Math.round(statusBarPx / density);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = getBridge().getWebView();
                if (wv != null && wv.canGoBack()) {
                    wv.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });

        downloadManager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        registerDownloadReceiver();

        requestStartupPermissions();

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }

        WebSettings settings = webView.getSettings();
        settings.setTextZoom(100);

        webView.addJavascriptInterface(new NativeBridge(), "NativeBridge");

        webView.post(() -> updateSafeAreaFromInsets(webView));
        webView.postDelayed(() -> updateSafeAreaFromInsets(webView), 500);
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView wv = getBridge().getWebView();
        if (wv != null) {
            wv.postDelayed(() -> updateSafeAreaFromInsets(wv), 200);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        progressHandler.removeCallbacksAndMessages(null);
        if (downloadReceiver != null) {
            try {
                unregisterReceiver(downloadReceiver);
            } catch (Exception ignored) {}
        }
    }

    private void updateSafeAreaFromInsets(WebView webView) {
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(webView);
        if (insets != null) {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
            float d = getResources().getDisplayMetrics().density;
            int topDp = Math.round(Math.max(bars.top, cutout.top) / d);
            int bottomDp = Math.round(bars.bottom / d);
            if (topDp > 0) statusBarHeightDp = topDp;
            navBarHeightDp = bottomDp;
        }
        injectSafeArea(webView);
    }

    private void injectSafeArea(WebView webView) {
        String js = "document.documentElement.style.setProperty('--safe-top','"
                + statusBarHeightDp + "px');"
                + "document.documentElement.style.setProperty('--safe-bottom','"
                + navBarHeightDp + "px');";
        webView.evaluateJavascript(js, null);
    }

    private void callJs(String script) {
        WebView wv = getBridge().getWebView();
        if (wv != null) {
            wv.post(() -> wv.evaluateJavascript(script, null));
        }
    }

    // ======================== NativeBridge ========================

    public class NativeBridge {
        @JavascriptInterface
        public boolean isDownloadApkSupported() {
            return true;
        }

        @JavascriptInterface
        public void downloadApk(String url) {
            runOnUiThread(() -> startApkDownload(url));
        }

        @JavascriptInterface
        public String checkAppPermission(String key) {
            String perm = mapKeyToAndroidPerm(key);
            if (perm == null) return "granted";
            if (ContextCompat.checkSelfPermission(MainActivity.this, perm)
                    == PackageManager.PERMISSION_GRANTED) {
                return "granted";
            }
            if (ActivityCompat.shouldShowRequestPermissionRationale(MainActivity.this, perm)) {
                return "denied";
            }
            return "prompt";
        }

        @JavascriptInterface
        public void requestAppPermission(String key, String callbackId) {
            String perm = mapKeyToAndroidPerm(key);
            if (perm == null) {
                callJs("window.__onNativePermResult&&window.__onNativePermResult('"
                        + callbackId + "','granted')");
                return;
            }
            if (ContextCompat.checkSelfPermission(MainActivity.this, perm)
                    == PackageManager.PERMISSION_GRANTED) {
                callJs("window.__onNativePermResult&&window.__onNativePermResult('"
                        + callbackId + "','granted')");
                return;
            }
            runOnUiThread(() -> {
                pendingWebPermCallbackId = callbackId;
                pendingWebPermName = perm;
                ActivityCompat.requestPermissions(
                        MainActivity.this, new String[]{perm}, WEB_PERM_REQUEST_CODE);
            });
        }

        @JavascriptInterface
        public void goToAppSettings() {
            runOnUiThread(() -> openAppSettings());
        }

        @JavascriptInterface
        public String resolveDnsTxt(String domain, String dnsServer) {
            DatagramSocket socket = null;
            try {
                socket = new DatagramSocket();
                socket.setSoTimeout(5000);

                byte[] query = buildDnsTxtQuery(domain);
                InetAddress serverAddr = InetAddress.getByName(dnsServer);
                DatagramPacket packet = new DatagramPacket(query, query.length, serverAddr, 53);
                socket.send(packet);

                byte[] buffer = new byte[1024];
                DatagramPacket response = new DatagramPacket(buffer, buffer.length);
                socket.receive(response);

                List<String> records = parseDnsTxtResponse(response.getData(), response.getLength());
                return new JSONArray(records).toString();
            } catch (Exception e) {
                return "[]";
            } finally {
                if (socket != null) {
                    try { socket.close(); } catch (Exception ignored) {}
                }
            }
        }
    }

    private static byte[] buildDnsTxtQuery(String domain) {
        String[] labels = domain.split("\\.");
        int querySize = 12 + domain.length() + 2 + 4;
        byte[] query = new byte[querySize];

        int transactionId = (int) (Math.random() * 65536);
        query[0] = (byte) ((transactionId >> 8) & 0xFF);
        query[1] = (byte) (transactionId & 0xFF);
        query[2] = 0x01;
        query[3] = 0x00;
        query[4] = 0x00;
        query[5] = 0x01;
        for (int i = 6; i < 12; i++) query[i] = 0x00;

        int pos = 12;
        for (String label : labels) {
            query[pos++] = (byte) label.length();
            for (int i = 0; i < label.length(); i++) {
                query[pos++] = (byte) label.charAt(i);
            }
        }
        query[pos++] = 0x00;
        query[pos++] = 0x00;
        query[pos++] = 0x10; // TXT = 16
        query[pos++] = 0x00;
        query[pos] = 0x01;   // IN = 1

        return query;
    }

    private static List<String> parseDnsTxtResponse(byte[] response, int length) {
        List<String> result = new ArrayList<>();
        try {
            int answerCount = ((response[6] & 0xFF) << 8) | (response[7] & 0xFF);
            int pos = 12;

            while (pos < length && response[pos] != 0) {
                pos += (response[pos] & 0xFF) + 1;
            }
            pos += 5;

            for (int i = 0; i < answerCount && pos < length; i++) {
                pos += 2;
                int type = ((response[pos] & 0xFF) << 8) | (response[pos + 1] & 0xFF);
                pos += 2;
                pos += 6;
                int dataLength = ((response[pos] & 0xFF) << 8) | (response[pos + 1] & 0xFF);
                pos += 2;

                if (type == 16) {
                    int txtLength = response[pos] & 0xFF;
                    pos++;
                    StringBuilder sb = new StringBuilder();
                    for (int j = 0; j < txtLength && pos + j < length; j++) {
                        sb.append((char) (response[pos + j] & 0xFF));
                    }
                    result.add(sb.toString());
                    pos += txtLength;
                } else {
                    pos += dataLength;
                }
            }
        } catch (Exception ignored) {}
        return result;
    }

    private void startApkDownload(String url) {
        if (currentDownloadId != -1) {
            downloadManager.remove(currentDownloadId);
            progressHandler.removeCallbacksAndMessages(null);
        }

        String fileName = "app_update_" + System.currentTimeMillis() + ".apk";

        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(getString(R.string.app_name) + " 更新");
            request.setDescription("正在下载新版本...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            request.setMimeType("application/vnd.android.package-archive");

            currentDownloadId = downloadManager.enqueue(request);
            startProgressPolling();
        } catch (Exception e) {
            callJs("if(window.__onApkDownloadFailed)window.__onApkDownloadFailed('"
                    + escapeJs(e.getMessage()) + "')");
        }
    }

    private void startProgressPolling() {
        progressHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (currentDownloadId == -1) return;

                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(currentDownloadId);
                Cursor cursor = null;
                try {
                    cursor = downloadManager.query(query);
                    if (cursor != null && cursor.moveToFirst()) {
                        int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                        int bytesIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                        int totalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);

                        int status = cursor.getInt(statusIdx);
                        long downloaded = cursor.getLong(bytesIdx);
                        long total = cursor.getLong(totalIdx);

                        if (status == DownloadManager.STATUS_RUNNING || status == DownloadManager.STATUS_PENDING) {
                            int percent = total > 0 ? (int) (downloaded * 100 / total) : 0;
                            callJs("if(window.__onApkDownloadProgress)window.__onApkDownloadProgress(" + percent + ")");
                            progressHandler.postDelayed(this, 500);
                        } else if (status == DownloadManager.STATUS_FAILED) {
                            int reasonIdx = cursor.getColumnIndex(DownloadManager.COLUMN_REASON);
                            int reason = cursor.getInt(reasonIdx);
                            currentDownloadId = -1;
                            callJs("if(window.__onApkDownloadFailed)window.__onApkDownloadFailed('下载失败(错误码:" + reason + ")')");
                        }
                    }
                } finally {
                    if (cursor != null) cursor.close();
                }
            }
        }, 500);
    }

    private void registerDownloadReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != currentDownloadId) return;

                currentDownloadId = -1;
                progressHandler.removeCallbacksAndMessages(null);
                callJs("if(window.__onApkDownloadProgress)window.__onApkDownloadProgress(100)");
                callJs("if(window.__onApkDownloadComplete)window.__onApkDownloadComplete()");

                installApk(id);
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, filter);
        }
    }

    private void installApk(long downloadId) {
        try {
            Uri downloadUri = downloadManager.getUriForDownloadedFile(downloadId);
            if (downloadUri == null) {
                callJs("if(window.__onApkDownloadFailed)window.__onApkDownloadFailed('无法获取下载文件')");
                return;
            }

            DownloadManager.Query query = new DownloadManager.Query();
            query.setFilterById(downloadId);
            Cursor cursor = null;
            String localPath = null;
            try {
                cursor = downloadManager.query(query);
                if (cursor != null && cursor.moveToFirst()) {
                    int localUriIdx = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                    String localUri = cursor.getString(localUriIdx);
                    if (localUri != null) {
                        localPath = Uri.parse(localUri).getPath();
                    }
                }
            } finally {
                if (cursor != null) cursor.close();
            }

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (localPath != null) {
                File apkFile = new File(localPath);
                Uri contentUri = FileProvider.getUriForFile(this,
                        BuildConfig.APPLICATION_ID + ".fileprovider", apkFile);
                installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                installIntent.setDataAndType(downloadUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            startActivity(installIntent);
        } catch (Exception e) {
            callJs("if(window.__onApkDownloadFailed)window.__onApkDownloadFailed('"
                    + escapeJs(e.getMessage()) + "')");
        }
    }

    private static String escapeJs(String s) {
        if (s == null) return "未知错误";
        return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
    }

    // ======================== Permissions ========================

    private String mapKeyToAndroidPerm(String key) {
        if (key == null) return null;
        switch (key) {
            case "location":  return Manifest.permission.ACCESS_FINE_LOCATION;
            case "camera":    return Manifest.permission.CAMERA;
            case "microphone": return Manifest.permission.RECORD_AUDIO;
            case "notifications":
                return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                        ? Manifest.permission.POST_NOTIFICATIONS : null;
            case "storage":
                return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                        ? Manifest.permission.READ_MEDIA_IMAGES
                        : Manifest.permission.READ_EXTERNAL_STORAGE;
            default: return null;
        }
    }

    private void requestStartupPermissions() {
        List<String> requiredPermissions = new ArrayList<>();

        addIfNotGranted(requiredPermissions, Manifest.permission.CAMERA);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            addIfNotGranted(requiredPermissions, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            addIfNotGranted(requiredPermissions, Manifest.permission.READ_MEDIA_IMAGES);
            addIfNotGranted(requiredPermissions, Manifest.permission.POST_NOTIFICATIONS);
        } else {
            addIfNotGranted(requiredPermissions, Manifest.permission.READ_EXTERNAL_STORAGE);
        }

        addIfNotGranted(requiredPermissions, Manifest.permission.ACCESS_COARSE_LOCATION);
        addIfNotGranted(requiredPermissions, Manifest.permission.ACCESS_FINE_LOCATION);

        if (!requiredPermissions.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                requiredPermissions.toArray(new String[0]),
                STARTUP_PERMISSION_REQUEST_CODE
            );
        }
    }

    private void addIfNotGranted(List<String> target, String permission) {
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            target.add(permission);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == WEB_PERM_REQUEST_CODE && pendingWebPermCallbackId != null) {
            boolean granted = grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            String state;
            if (granted) {
                state = "granted";
            } else if (pendingWebPermName != null
                    && !ActivityCompat.shouldShowRequestPermissionRationale(this, pendingWebPermName)) {
                state = "denied_permanent";
            } else {
                state = "denied";
            }
            callJs("window.__onNativePermResult&&window.__onNativePermResult('"
                    + pendingWebPermCallbackId + "','" + state + "')");
            pendingWebPermCallbackId = null;
            pendingWebPermName = null;
            return;
        }

        if (requestCode == STARTUP_PERMISSION_REQUEST_CODE) {
            boolean hasDenied = false;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    hasDenied = true;
                    break;
                }
            }
            if (hasDenied) {
                showPermissionSettingsDialog();
            }
        }
    }

    private void showPermissionSettingsDialog() {
        if (isPermissionDialogShowing || isFinishing()) {
            return;
        }

        isPermissionDialogShowing = true;

        new AlertDialog.Builder(this)
            .setTitle(getString(R.string.permission_denied_title))
            .setMessage(getString(R.string.permission_denied_message))
            .setNegativeButton(getString(R.string.permission_later), (dialog, which) -> {
                isPermissionDialogShowing = false;
                dialog.dismiss();
            })
            .setPositiveButton(getString(R.string.permission_go_settings), (dialog, which) -> {
                isPermissionDialogShowing = false;
                openAppSettings();
            })
            .setOnCancelListener(dialog -> isPermissionDialogShowing = false)
            .show();
    }

    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getPackageName(), null));
        startActivity(intent);
    }
}
