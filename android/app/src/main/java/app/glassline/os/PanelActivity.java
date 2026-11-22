package app.glassline.os;

/**
 * Glassline's Control Centre or Notification Centre shown over whatever app is open (from an edge swipe).
 * Transparent, outside recents, in its own task: closing it reveals the app underneath.
 */
public class PanelActivity extends MainActivity {
    private static final String BASE = "https://appassets.androidplatform.net/assets/index.html?app=1&android=1&panel=";

    @Override protected boolean isPanel() { return true; }

    @Override protected String startUrl() {
        String p = getIntent() != null ? getIntent().getStringExtra("panel") : null;
        return BASE + ("cc".equals(p) ? "cc" : "nc");
    }
}
