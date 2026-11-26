package app.glassline.os;

import android.Manifest;
import android.app.SearchManager;
import android.app.role.RoleManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.AlarmClock;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;

import org.json.JSONObject;

import java.util.ArrayList;

/**
 * Glassline's voice assistant on Android: listens with the phone's own speech recognizer, answers with its
 * text-to-speech voice, and carries out requests through the phone's own apps (dialer, messages, clock, maps, browser,
 * camera). Calls and messages open pre-filled for the person to confirm; nothing is sent or dialled silently.
 */
final class Assistant implements RecognitionListener {
    static final int REQ_MIC = 11, REQ_CONTACTS = 12;
    private final MainActivity a;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady;
    private String pendingSpeech;
    private long lastLevel;

    Assistant(MainActivity activity) { this.a = activity; }

    private boolean granted(String p) { return a.checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED; }

    private void send(String key, Object value) {
        try { a.js("window.GOS && GOS.androidSpeech && GOS.androidSpeech(" + JSONObject.quote(new JSONObject().put(key, value).toString()) + ")"); }
        catch (Exception ignored) { }
    }

    private boolean start(Intent i) {
        try { a.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return true; }
        catch (ActivityNotFoundException | SecurityException e) { return false; }
    }

    /* ---------- listening and speaking ---------- */

    void listen() {
        if (!granted(Manifest.permission.RECORD_AUDIO)) { a.requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO }, REQ_MIC); send("state", "permission"); return; }
        a.runOnUiThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(a)) { send("error", "unavailable"); return; }
            if (recognizer == null) { recognizer = SpeechRecognizer.createSpeechRecognizer(a); recognizer.setRecognitionListener(this); }
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                    .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            recognizer.startListening(i);
        });
    }

    void stopListening() { a.runOnUiThread(() -> { if (recognizer != null) recognizer.stopListening(); }); }

    void speak(String text) {
        a.runOnUiThread(() -> {
            if (tts == null) {
                pendingSpeech = text;
                tts = new TextToSpeech(a, status -> {
                    ttsReady = status == TextToSpeech.SUCCESS;
                    if (ttsReady && pendingSpeech != null) { tts.speak(pendingSpeech, TextToSpeech.QUEUE_FLUSH, null, "glassline"); pendingSpeech = null; }
                });
            } else if (ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "glassline");
            else pendingSpeech = text;
        });
    }

    void permissionResult(int code, boolean ok) {
        if (code == REQ_MIC) { if (ok) listen(); else send("error", "denied"); }
        else if (code == REQ_CONTACTS) send("contacts", ok);
    }

    void destroy() {
        if (recognizer != null) { recognizer.destroy(); recognizer = null; }
        if (tts != null) { tts.shutdown(); tts = null; }
    }

    @Override public void onReadyForSpeech(Bundle params) { send("state", "ready"); }
    @Override public void onBeginningOfSpeech() { send("state", "speaking"); }
    @Override public void onRmsChanged(float rms) { long now = System.currentTimeMillis(); if (now - lastLevel > 90) { lastLevel = now; send("level", Math.max(0, rms)); } }
    @Override public void onBufferReceived(byte[] buffer) { }
    @Override public void onEndOfSpeech() { send("state", "processing"); }
    @Override public void onEvent(int eventType, Bundle params) { }

    @Override public void onError(int error) {
        String name;
        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH: name = "no-match"; break;
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: name = "timeout"; break;
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: name = "denied"; break;
            case SpeechRecognizer.ERROR_NETWORK: case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: name = "network"; break;
            default: name = "error-" + error;
        }
        send("error", name);
    }

    @Override public void onResults(Bundle results) { send("final", first(results)); }
    @Override public void onPartialResults(Bundle partial) { String t = first(partial); if (!t.isEmpty()) send("partial", t); }

    private static String first(Bundle b) {
        ArrayList<String> list = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return list == null || list.isEmpty() ? "" : list.get(0);
    }

    /* ---------- contacts and actions ---------- */

    /** {"name","number"} for the best match, {} for none, or {"permission":true} while access is being requested. */
    String findContact(String name) {
        try {
            if (!granted(Manifest.permission.READ_CONTACTS)) {
                a.requestPermissions(new String[]{ Manifest.permission.READ_CONTACTS }, REQ_CONTACTS);
                return new JSONObject().put("permission", true).toString();
            }
            Uri uri = Uri.withAppendedPath(ContactsContract.CommonDataKinds.Phone.CONTENT_FILTER_URI, Uri.encode(name));
            String[] cols = { ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER };
            try (Cursor c = a.getContentResolver().query(uri, cols, null, null, null)) {
                if (c != null && c.moveToFirst()) return new JSONObject().put("name", c.getString(0)).put("number", c.getString(1)).toString();
            }
        } catch (Exception ignored) { }
        return "{}";
    }

    boolean dial(String number) { return start(new Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", number, null))); }

    boolean sms(String number, String body) {
        return start(new Intent(Intent.ACTION_SENDTO, Uri.fromParts("smsto", number, null)).putExtra("sms_body", body));
    }

    boolean alarm(int hour, int minute, String label) {
        return start(new Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR, hour).putExtra(AlarmClock.EXTRA_MINUTES, minute)
                .putExtra(AlarmClock.EXTRA_MESSAGE, label).putExtra(AlarmClock.EXTRA_SKIP_UI, true));
    }

    boolean timer(int seconds, String label) {
        return start(new Intent(AlarmClock.ACTION_SET_TIMER).putExtra(AlarmClock.EXTRA_LENGTH, seconds)
                .putExtra(AlarmClock.EXTRA_MESSAGE, label).putExtra(AlarmClock.EXTRA_SKIP_UI, true));
    }

    boolean navigate(String query) { return start(new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(query)))); }

    boolean webSearch(String query) {
        if (start(new Intent(Intent.ACTION_WEB_SEARCH).putExtra(SearchManager.QUERY, query))) return true;
        return start(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/search?q=" + Uri.encode(query))));
    }

    boolean camera() { return start(new Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA)); }

    /** Whether Glassline is the phone's digital assistant (opened by holding power or home). */
    boolean isAssistant() {
        if (Build.VERSION.SDK_INT >= 29) {
            RoleManager rm = a.getSystemService(RoleManager.class);
            return rm != null && rm.isRoleAvailable(RoleManager.ROLE_ASSISTANT) && rm.isRoleHeld(RoleManager.ROLE_ASSISTANT);
        }
        String flat = Settings.Secure.getString(a.getContentResolver(), "assistant");
        return flat != null && flat.startsWith(a.getPackageName() + "/");
    }

    /** Opens Android's default-apps page, where "Digital assistant app" lives. */
    void chooseAssistant() {
        if (!start(new Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS))) start(new Intent(Settings.ACTION_VOICE_INPUT_SETTINGS));
    }
}
