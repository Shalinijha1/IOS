package app.glassline.os;

import android.app.Notification;
import android.app.PendingIntent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Forwards the phone's notifications to Glassline (banners, Notification Centre, lock screen) once the person grants
 * notification access in Android Settings. Keeps each notification's tap action so Glassline can open it.
 */
public class NotificationService extends NotificationListenerService {
    private static NotificationService instance;
    private static final Map<String, PendingIntent> actions = new ConcurrentHashMap<>();

    @Override public void onListenerConnected() { instance = this; }
    @Override public void onListenerDisconnected() { if (instance == this) instance = null; }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        Notification n = sbn.getNotification();
        if (sbn.getPackageName().equals(getPackageName())) return;
        if ((n.flags & Notification.FLAG_ONGOING_EVENT) != 0 || (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return; // music players, downloads, group headers
        Bundle ex = n.extras;
        CharSequence title = ex.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = ex.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (text == null) text = ex.getCharSequence(Notification.EXTRA_TEXT);
        if (title == null && text == null) return;
        if (n.contentIntent != null) actions.put(sbn.getKey(), n.contentIntent);
        try {
            JSONObject o = new JSONObject();
            o.put("key", sbn.getKey());
            o.put("pkg", sbn.getPackageName());
            o.put("title", title == null ? "" : title.toString());
            o.put("text", text == null ? "" : text.toString());
            o.put("time", sbn.getPostTime());
            MainActivity a = MainActivity.current;
            if (a != null) a.js("window.GOS && GOS.androidNotify && GOS.androidNotify(" + JSONObject.quote(o.toString()) + ")");
        } catch (Exception ignored) { }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        actions.remove(sbn.getKey());
        MainActivity a = MainActivity.current;
        if (a != null) a.js("window.GOS && GOS.androidNotifyRemoved && GOS.androidNotifyRemoved(" + JSONObject.quote(sbn.getKey()) + ")");
    }

    static boolean open(String key) {
        PendingIntent pi = actions.get(key);
        if (pi == null) return false;
        try { pi.send(); } catch (PendingIntent.CanceledException e) { return false; }
        dismiss(key);
        return true;
    }

    static void dismiss(String key) {
        actions.remove(key);
        NotificationService s = instance;
        if (s != null) try { s.cancelNotification(key); } catch (SecurityException ignored) { }
    }
}
