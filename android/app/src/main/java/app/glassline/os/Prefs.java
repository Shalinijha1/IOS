package app.glassline.os;

import android.content.Context;
import android.content.SharedPreferences;

/** Small native settings that the services need without the web page running. */
final class Prefs {
    private Prefs() { }
    private static SharedPreferences p(Context c) { return c.getSharedPreferences("glassline", Context.MODE_PRIVATE); }

    static boolean edgeSwipes(Context c) { return p(c).getBoolean("edgeSwipes", false); }
    static void setEdgeSwipes(Context c, boolean on) { p(c).edit().putBoolean("edgeSwipes", on).apply(); }

    static String iconPack(Context c) { return p(c).getString("iconPack", ""); }
    static void setIconPack(Context c, String pkg) { p(c).edit().putString("iconPack", pkg == null ? "" : pkg).apply(); }
}
