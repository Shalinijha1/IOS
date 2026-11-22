package app.glassline.os;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.ActivityOptions;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Hosts the Glassline OS web shell (packaged from ../../phone) full screen, and acts as an Android Home app:
 * the phone's own apps appear as Glassline icons and open as real Android apps.
 * Files are served from https://appassets.androidplatform.net so the page is a secure context:
 * camera, microphone, storage and location work as they do in a browser.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/index.html?app=1&android=1";
    private static final int REQ_MEDIA = 1, REQ_LOCATION = 2;

    /** Overridden by PanelActivity: Control Centre or Notification Centre shown over another app. */
    protected boolean isPanel() { return false; }
    protected String startUrl() { return START; }

    /** The running activity, so the notification listener can forward notifications to the page. */
    static MainActivity current;

    private WebView web;
    private PermissionRequest pendingMedia;
    private GeolocationPermissions.Callback pendingGeo;
    private String pendingGeoOrigin;
    private final Map<String, String> iconCache = new HashMap<>();

    private final BroadcastReceiver packages = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { js("window.GOS && GOS.emit('android-packages')"); }
    };
    private final BroadcastReceiver screen = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            boolean on = Intent.ACTION_SCREEN_ON.equals(i.getAction()) || Intent.ACTION_USER_PRESENT.equals(i.getAction());
            js("window.GOS && GOS.androidScreen && GOS.androidScreen(" + on + ")");
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (!isPanel()) current = this;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(isPanel() ? Color.TRANSPARENT : Color.BLACK);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setGeolocationEnabled(true);
        s.setTextZoom(100);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false;
                // Links meant for "a real browser tab" open in the phone's browser.
                if (req.isForMainFrame()) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException ignored) { }
                    return true;
                }
                return false;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!HOST.equals(request.getOrigin().getHost())) { request.deny(); return; }
                    List<String> need = new ArrayList<>();
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && !granted(Manifest.permission.CAMERA)) need.add(Manifest.permission.CAMERA);
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && !granted(Manifest.permission.RECORD_AUDIO)) need.add(Manifest.permission.RECORD_AUDIO);
                    }
                    if (need.isEmpty()) { request.grant(request.getResources()); return; }
                    pendingMedia = request;
                    requestPermissions(need.toArray(new String[0]), REQ_MEDIA);
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (granted(Manifest.permission.ACCESS_FINE_LOCATION)) { callback.invoke(origin, true, false); return; }
                pendingGeo = callback; pendingGeoOrigin = origin;
                requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
            }
        });

        web.addJavascriptInterface(new Bridge(), "GlasslineAndroid");
        setContentView(web);
        hideSystemBars();
        if (state != null && !isPanel()) web.restoreState(state); else web.loadUrl(startUrl());
        if (isPanel()) return;   // panels don't watch packages or the screen
        if (Prefs.edgeSwipes(this) && Settings.canDrawOverlays(this)) EdgeService.start(this);

        IntentFilter pf = new IntentFilter();
        pf.addAction(Intent.ACTION_PACKAGE_ADDED);
        pf.addAction(Intent.ACTION_PACKAGE_REMOVED);
        pf.addAction(Intent.ACTION_PACKAGE_CHANGED);
        pf.addDataScheme("package");
        registerReceiver(packages, pf);
        IntentFilter sf = new IntentFilter(Intent.ACTION_SCREEN_OFF);
        sf.addAction(Intent.ACTION_SCREEN_ON);
        registerReceiver(screen, sf);
    }

    @Override
    protected void onDestroy() {
        if (!isPanel()) try { unregisterReceiver(packages); unregisterReceiver(screen); } catch (IllegalArgumentException ignored) { }
        if (current == this) current = null;
        super.onDestroy();
    }

    /** Runs JavaScript in the page on the UI thread. */
    void js(String code) { runOnUiThread(() -> { if (web != null) web.evaluateJavascript(code, null); }); }

    private boolean granted(String p) { return checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED; }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        boolean ok = results.length > 0;
        for (int r : results) ok &= r == PackageManager.PERMISSION_GRANTED;
        if (code == REQ_MEDIA && pendingMedia != null) {
            if (ok) pendingMedia.grant(pendingMedia.getResources()); else pendingMedia.deny();
            pendingMedia = null;
        } else if (code == REQ_LOCATION && pendingGeo != null) {
            pendingGeo.invoke(pendingGeoOrigin, ok, false);
            pendingGeo = null;
        }
    }

    /** Full screen: Glassline draws its own status bar and home indicator. Swipe from an edge to show Android's bars. */
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /** Android's Back gesture: close what is open in Glassline, then go home. Never leaves the Home app. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("window.GOS && GOS.androidBack ? GOS.androidBack() : false", null);
    }

    /** Pressing Home while Glassline is the Home app returns to the Glassline home screen. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (isPanel()) { setIntent(intent); web.loadUrl(startUrl()); return; }
        if (intent != null && intent.hasCategory(Intent.CATEGORY_HOME)) web.evaluateJavascript("window.GOS && GOS.goHome()", null);
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); if (!isPanel()) web.saveState(out); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); hideSystemBars(); if (!isPanel()) js("window.GOS && GOS.emit && GOS.emit('android-resume')"); }

    private void start(Intent i) {
        runOnUiThread(() -> { try { startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (ActivityNotFoundException ignored) { } });
    }

    private String defaultPackage(Intent i) {
        ResolveInfo ri = getPackageManager().resolveActivity(i, PackageManager.MATCH_DEFAULT_ONLY);
        if (ri == null || ri.activityInfo == null) return null;
        String p = ri.activityInfo.packageName;
        return "android".equals(p) ? null : p;   // "android" means no default was chosen (the chooser would show)
    }

    /** Called from JavaScript as window.GlasslineAndroid. */
    private class Bridge {
        @JavascriptInterface
        public String listApps() {
            PackageManager pm = getPackageManager();
            Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
            JSONArray out = new JSONArray();
            for (ResolveInfo ri : pm.queryIntentActivities(main, 0)) {
                String pkg = ri.activityInfo.packageName;
                if (pkg.equals(getPackageName())) continue;
                try {
                    ApplicationInfo ai = ri.activityInfo.applicationInfo;
                    JSONObject o = new JSONObject();
                    o.put("pkg", pkg);
                    o.put("label", String.valueOf(ri.loadLabel(pm)));
                    o.put("category", ai.category);
                    o.put("system", (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0 && (ai.flags & ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0);
                    String pack = Prefs.iconPack(MainActivity.this);
                    String key = pkg + "/" + ri.activityInfo.name + "@" + pack + "@" + new java.io.File(ai.sourceDir).lastModified();
                    String icon = iconCache.get(key);
                    if (icon == null) {
                        Drawable themed = IconPacks.icon(MainActivity.this, pack, pkg, ri.activityInfo.name);
                        icon = themed != null ? packIconDataUrl(themed) : iconDataUrl(ri.loadIcon(pm));
                        iconCache.put(key, icon);
                    }
                    o.put("icon", icon);
                    out.put(o);
                } catch (Exception ignored) { }
            }
            return out.toString();
        }

        @JavascriptInterface
        public boolean launch(String pkg) {
            Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
            if (i == null) return false;
            start(i);
            return true;
        }

        /** Opens an app growing out of its icon's rectangle (screen pixels). */
        @JavascriptInterface
        public boolean launchFrom(String pkg, int x, int y, int w, int h) {
            Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
            if (i == null) return false;
            i.setSourceBounds(new Rect(x, y, x + w, y + h));
            Bundle opts = ActivityOptions.makeClipRevealAnimation(web, x, y, w, h).toBundle();
            runOnUiThread(() -> { try { startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), opts); } catch (ActivityNotFoundException ignored) { } });
            return true;
        }

        @JavascriptInterface
        public String defaultApps() {
            JSONObject o = new JSONObject();
            try {
                o.put("dialer", defaultPackage(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:"))));
                o.put("sms", defaultPackage(new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:"))));
                o.put("browser", defaultPackage(new Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com"))));
                o.put("camera", defaultPackage(new Intent(MediaStore.ACTION_IMAGE_CAPTURE)));
            } catch (Exception ignored) { }
            return o.toString();
        }

        @JavascriptInterface
        public void uninstall(String pkg) { start(new Intent(Intent.ACTION_DELETE, Uri.parse("package:" + pkg))); }

        @JavascriptInterface
        public void appInfo(String pkg) { start(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + pkg))); }

        @JavascriptInterface
        public void openPlayStore(String query) {
            Uri market = Uri.parse(query.isEmpty() ? "market://search?q=apps" : "market://search?q=" + Uri.encode(query));
            Intent i = new Intent(Intent.ACTION_VIEW, market);
            if (getPackageManager().resolveActivity(i, 0) == null) i = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/search?q=" + Uri.encode(query.isEmpty() ? "apps" : query) + "&c=apps"));
            start(i);
        }

        /** Real flashlight. Returns false when the phone has none. */
        @JavascriptInterface
        public boolean torch(boolean on) {
            try {
                CameraManager cm = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
                for (String id : cm.getCameraIdList()) {
                    Boolean flash = cm.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                    if (Boolean.TRUE.equals(flash)) { cm.setTorchMode(id, on); return true; }
                }
            } catch (Exception ignored) { }
            return false;
        }

        /** Media volume, 0..1. */
        @JavascriptInterface
        public void setVolume(double v) {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            am.setStreamVolume(AudioManager.STREAM_MUSIC, (int) Math.round(Math.max(0, Math.min(1, v)) * max), 0);
        }

        /** Brightness of the Glassline screen itself (changing the system setting needs a special permission). */
        @JavascriptInterface
        public void setBrightness(double v) {
            runOnUiThread(() -> {
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                lp.screenBrightness = (float) Math.max(0.05, Math.min(1, v));
                getWindow().setAttributes(lp);
            });
        }

        /** Wi-Fi, Bluetooth and the like can't be switched by apps since Android 10, so open Android's quick panel. */
        @JavascriptInterface
        public void openPanel(String name) {
            String action;
            switch (name) {
                case "wifi": action = Build.VERSION.SDK_INT >= 29 ? Settings.Panel.ACTION_WIFI : Settings.ACTION_WIFI_SETTINGS; break;
                case "internet": action = Build.VERSION.SDK_INT >= 29 ? Settings.Panel.ACTION_INTERNET_CONNECTIVITY : Settings.ACTION_DATA_ROAMING_SETTINGS; break;
                case "bluetooth": action = Settings.ACTION_BLUETOOTH_SETTINGS; break;
                case "airplane": action = Settings.ACTION_AIRPLANE_MODE_SETTINGS; break;
                default: action = Settings.ACTION_WIRELESS_SETTINGS;
            }
            start(new Intent(action));
        }

        @JavascriptInterface
        public void openSystemSettings() { start(new Intent(Settings.ACTION_SETTINGS)); }

        @JavascriptInterface
        public void chooseHomeApp() {
            Intent i = new Intent(Settings.ACTION_HOME_SETTINGS);
            if (getPackageManager().resolveActivity(i, 0) == null) i = new Intent(Settings.ACTION_SETTINGS);
            start(i);
        }

        @JavascriptInterface
        public boolean isDefaultHome() {
            Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
            ResolveInfo ri = getPackageManager().resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY);
            return ri != null && getPackageName().equals(ri.activityInfo.packageName);
        }

        @JavascriptInterface
        public boolean hasNotificationAccess() {
            String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
            return flat != null && flat.contains(new ComponentName(MainActivity.this, NotificationService.class).flattenToString());
        }

        @JavascriptInterface
        public void requestNotificationAccess() { start(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); }

        /** Opens a phone notification the way tapping it in Android would. */
        @JavascriptInterface
        public boolean openNotification(String key) { return NotificationService.open(key); }

        @JavascriptInterface
        public void cancelNotification(String key) { NotificationService.dismiss(key); }

        /** Closes a Control Centre / Notification Centre panel shown over another app. */
        @JavascriptInterface
        public void closePanel() { if (isPanel()) runOnUiThread(() -> { finish(); overridePendingTransition(0, android.R.anim.fade_out); }); }

        /** Edge swipes in every app: needs "Display over other apps". Returns whether they are now on. */
        @JavascriptInterface
        public boolean setEdgeSwipes(boolean on) {
            Prefs.setEdgeSwipes(MainActivity.this, on);
            if (!on) { EdgeService.stop(MainActivity.this); return false; }
            if (!Settings.canDrawOverlays(MainActivity.this)) {
                start(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName())));
                return false;
            }
            EdgeService.start(MainActivity.this);
            return true;
        }

        @JavascriptInterface
        public boolean edgeSwipesOn() { return Prefs.edgeSwipes(MainActivity.this) && Settings.canDrawOverlays(MainActivity.this); }

        /** Installed icon packs (ADW / Nova format) as [{pkg,label}]. */
        @JavascriptInterface
        public String listIconPacks() { return IconPacks.list(MainActivity.this).toString(); }

        @JavascriptInterface
        public String iconPack() { return Prefs.iconPack(MainActivity.this); }

        /** Applies an icon pack to every app ("" for the apps' own icons). */
        @JavascriptInterface
        public void setIconPack(String pkg) { Prefs.setIconPack(MainActivity.this, pkg); iconCache.clear(); IconPacks.clear(); }
    }

    /** Icon-pack drawables are finished artwork: draw them edge to edge. */
    private static String packIconDataUrl(Drawable d) {
        int size = 144;
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        d.setBounds(0, 0, size, size);
        d.draw(c);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.PNG, 100, bytes);
        return "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
    }

    /** Draws an app icon as a full-bleed square; Glassline rounds the corners. */
    private static String iconDataUrl(Drawable d) {
        int size = 144;
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        if (d instanceof AdaptiveIconDrawable) {
            // adaptive icons are 108dp layers with a 72dp safe zone: show the centre 81dp edge to edge
            AdaptiveIconDrawable a = (AdaptiveIconDrawable) d;
            int pad = size / 6;
            if (a.getBackground() != null) { a.getBackground().setBounds(-pad, -pad, size + pad, size + pad); a.getBackground().draw(c); }
            else c.drawColor(Color.WHITE);
            if (a.getForeground() != null) { a.getForeground().setBounds(-pad, -pad, size + pad, size + pad); a.getForeground().draw(c); }
        } else {
            // legacy icons keep their shape on a white tile
            c.drawColor(Color.WHITE);
            int inset = size / 7;
            d.setBounds(inset, inset, size - inset, size - inset);
            d.draw(c);
        }
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.PNG, 100, bytes);
        return "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
    }
}
