package app.glassline.os;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

/**
 * Edge swipes in every app. Two invisible strips sit just below Android's status bar, at the top left and top right.
 * Pulling down on the left one opens Glassline's Notification Centre over the current app; the right one opens
 * Control Centre. Uses "Display over other apps" only; no accessibility access, so it can't read other apps' screens.
 * Runs as a foreground service (Android requires a visible notification for that) so the strips survive in the background.
 */
public class EdgeService extends Service {
    private static final String CHANNEL = "edge";
    private WindowManager wm;
    private View left, right;

    static void start(Context c) {
        if (!Settings.canDrawOverlays(c)) return;
        Intent i = new Intent(c, EdgeService.class);
        if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(i); else c.startService(i);
    }

    static void stop(Context c) { c.stopService(new Intent(c, EdgeService.class)); }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        foreground();
        if (left == null && Settings.canDrawOverlays(this)) addStrips();
        return START_STICKY;
    }

    private void foreground() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Edge swipes", NotificationManager.IMPORTANCE_MIN));
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        Notification n = b.setSmallIcon(R.drawable.ic_launcher_foreground).setContentTitle("Edge swipes are on")
                .setContentText("Pull down from the top left or top right in any app").setContentIntent(open).setOngoing(true).build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        else startForeground(1, n);
    }

    private void addStrips() {
        wm = getSystemService(WindowManager.class);
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int width = (int) (dm.widthPixels * 0.32f), height = (int) (22 * dm.density);
        int statusId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        int top = statusId > 0 ? getResources().getDimensionPixelSize(statusId) : (int) (24 * dm.density);
        left = strip("nc", Gravity.TOP | Gravity.START, width, height, top);
        right = strip("cc", Gravity.TOP | Gravity.END, width, height, top);
    }

    private View strip(String panel, int gravity, int w, int h, int y) {
        View v = new View(this);
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(w, h,
                Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        lp.gravity = gravity; lp.y = y;
        final float threshold = 24 * getResources().getDisplayMetrics().density;
        v.setOnTouchListener(new View.OnTouchListener() {
            float y0; boolean fired;
            @Override public boolean onTouch(View view, MotionEvent e) {
                switch (e.getActionMasked()) {
                    case MotionEvent.ACTION_DOWN: y0 = e.getRawY(); fired = false; return true;
                    case MotionEvent.ACTION_MOVE:
                        if (!fired && e.getRawY() - y0 > threshold) { fired = true; openPanel(panel); }
                        return true;
                    default: return true;
                }
            }
        });
        wm.addView(v, lp);
        return v;
    }

    private void openPanel(String panel) {
        Intent i = new Intent(this, PanelActivity.class).putExtra("panel", panel)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(i);
    }

    @Override
    public void onDestroy() {
        if (wm != null) { try { if (left != null) wm.removeView(left); if (right != null) wm.removeView(right); } catch (Exception ignored) { } }
        left = right = null;
        super.onDestroy();
    }
}
