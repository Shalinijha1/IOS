package app.glassline.os;

/**
 * Opened by the phone's assistant gesture (hold power or home, depending on the phone) once Glassline is chosen as the
 * digital assistant: Glassline's assistant appears over whatever is on screen and starts listening.
 */
public class AssistActivity extends MainActivity {
    @Override protected boolean isPanel() { return true; }

    @Override protected String startUrl() {
        return "https://appassets.androidplatform.net/assets/index.html?app=1&android=1&panel=assist";
    }
}
