package app.glassline.os;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;

import org.json.JSONArray;
import org.json.JSONObject;
import org.xmlpull.v1.XmlPullParser;
import org.xmlpull.v1.XmlPullParserFactory;

import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Third-party icon packs in the common ADW / Nova format: the pack declares an activity for one of the theme actions
 * below, and maps each app's launch component to a drawable in appfilter.xml
 * (res/xml/appfilter.xml, or res/raw, or assets/appfilter.xml).
 */
final class IconPacks {
    private IconPacks() { }
    static final String[] ACTIONS = { "org.adw.launcher.THEMES", "org.adw.ActivityStarter.THEMES", "com.novalauncher.THEME" };

    private static String loadedPack;
    private static Resources packRes;
    private static final Map<String, String> map = new HashMap<>();   // "pkg/cls" -> drawable name

    static JSONArray list(Context c) {
        PackageManager pm = c.getPackageManager();
        JSONArray out = new JSONArray();
        Set<String> seen = new HashSet<>();
        for (String action : ACTIONS) {
            for (ResolveInfo ri : pm.queryIntentActivities(new Intent(action), PackageManager.GET_META_DATA)) {
                String pkg = ri.activityInfo.packageName;
                if (!seen.add(pkg)) continue;
                try { out.put(new JSONObject().put("pkg", pkg).put("label", String.valueOf(ri.loadLabel(pm)))); } catch (Exception ignored) { }
            }
        }
        return out;
    }

    static synchronized void clear() { loadedPack = null; packRes = null; map.clear(); }

    /** The pack's drawable for this launch component, or null to use the app's own icon. */
    static synchronized Drawable icon(Context c, String pack, String pkg, String cls) {
        if (pack == null || pack.isEmpty()) return null;
        if (!pack.equals(loadedPack)) load(c, pack);
        if (packRes == null) return null;
        String name = map.get(pkg + "/" + cls);
        if (name == null) name = map.get(pkg + "/");       // some packs map a package without its activity
        if (name == null) return null;
        int id = packRes.getIdentifier(name, "drawable", pack);
        if (id == 0) id = packRes.getIdentifier(name, "mipmap", pack);
        if (id == 0) return null;
        try { return packRes.getDrawable(id, null); } catch (Resources.NotFoundException e) { return null; }
    }

    private static void load(Context c, String pack) {
        loadedPack = pack; packRes = null; map.clear();
        try {
            packRes = c.getPackageManager().getResourcesForApplication(pack);
            XmlPullParser xp = null;
            int xml = packRes.getIdentifier("appfilter", "xml", pack);
            if (xml != 0) xp = packRes.getXml(xml);
            else {
                InputStream in = null;
                int raw = packRes.getIdentifier("appfilter", "raw", pack);
                if (raw != 0) in = packRes.openRawResource(raw);
                else try { in = packRes.getAssets().open("appfilter.xml"); } catch (Exception ignored) { }
                if (in != null) { xp = XmlPullParserFactory.newInstance().newPullParser(); xp.setInput(in, "UTF-8"); }
            }
            if (xp == null) return;
            for (int ev = xp.getEventType(); ev != XmlPullParser.END_DOCUMENT; ev = xp.next()) {
                if (ev != XmlPullParser.START_TAG || !"item".equals(xp.getName())) continue;
                String comp = xp.getAttributeValue(null, "component"), draw = xp.getAttributeValue(null, "drawable");
                if (comp == null || draw == null) continue;
                // ComponentInfo{com.example/com.example.MainActivity}
                int a = comp.indexOf('{'), b = comp.indexOf('}');
                if (a < 0 || b < a) continue;
                String flat = comp.substring(a + 1, b);
                int slash = flat.indexOf('/');
                if (slash < 0) { map.put(flat + "/", draw); continue; }
                String p = flat.substring(0, slash), cl = flat.substring(slash + 1);
                if (cl.startsWith(".")) cl = p + cl;
                map.put(p + "/" + cl, draw);
                map.putIfAbsent(p + "/", draw);
            }
        } catch (Exception e) {
            packRes = null; map.clear();
        }
    }
}
