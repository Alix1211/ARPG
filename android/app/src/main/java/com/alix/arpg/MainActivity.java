package com.alix.arpg;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.util.Map;
import java.util.Iterator;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

// 골드 퀘스트 사가 앱 틀 (문플로 방식)
// 켤 때마다 깃허브 페이지의 최신 게임을 불러오고, 인터넷이 안 되면 앱 안에 든 예비 판으로 실행한다.
// 저장은 게임 쪽(localStorage)과 앱 쪽(SharedPreferences "store")에 같이 적어, 두 판이 같은 저장을 쓴다.
public final class MainActivity extends Activity {
    private static final String REMOTE = "https://alix1211.github.io/ARPG/game/town.html";
    private static final String LOCAL = "https://appassets.androidplatform.net/assets/game/town.html";
    private WebView game;
    private SharedPreferences store;
    // 연결 정보는 게임 저장과 분리: 백업 파일에 기기별 Uri를 넣지 않는다.
    private SharedPreferences backupPrefs;
    private static final int REQ_BACKUP = 502, REQ_LINK = 505, MAX_BACKUP_BYTES = 8000000;
    private final ScheduledExecutorService backupIO = Executors.newSingleThreadScheduledExecutor();
    private final Object backupLock = new Object();
    private ScheduledFuture<?> pendingBackup;
    private volatile boolean restoringBackup = false, pickingBackup = false;
    private volatile String pendingRestore = null;
    private volatile boolean awaitingRestoreReload = false;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private boolean usingLocal = false, remoteOk = false;
    private long backAt = 0;

    private void loadLocal() { if (usingLocal) return; usingLocal = true; if (game != null) game.loadUrl(LOCAL); }

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        store = getSharedPreferences("store", MODE_PRIVATE);
        backupPrefs = getSharedPreferences("backup", MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
        getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(v -> ui.postDelayed(this::hideBars, 1500));
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        game = new WebView(this);
        game.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        game.setBackgroundColor(Color.rgb(28, 22, 16));
        WebSettings s = game.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r.isForMainFrame() && !usingLocal) ui.post(MainActivity.this::loadLocal);
            }
            @Override public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse e) {
                if (r.isForMainFrame() && !usingLocal) ui.post(MainActivity.this::loadLocal);
            }
            @Override public void onPageFinished(WebView v, String url) {
                if (url != null && url.startsWith(REMOTE)) remoteOk = true;
                if (awaitingRestoreReload) { awaitingRestoreReload = false; restoringBackup = false; }
            }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                Toast.makeText(MainActivity.this, "화면이 멈춰서 다시 시작합니다", Toast.LENGTH_LONG).show();
                recreate();
                return true;
            }
        });
        game.setWebChromeClient(new WebChromeClient());
        game.addJavascriptInterface(new Bridge(), "ArpgBridge");
        setContentView(game);
        requestHighestRefreshRate();
        // 주소 끝에 시각을 붙여 게임 코드(town.html)는 늘 최신으로, 그림 파일(art_*.js)은 이름이 같으면 저장해 둔 것을 씀
        game.loadUrl(REMOTE + "?t=" + System.currentTimeMillis());
        ui.postDelayed(() -> { if (!remoteOk) loadLocal(); }, 40000);   // 40초 안에 못 받으면 앱 안의 예비 판으로
    }

    /** 게임이 부르는 앱 기능: 저장 보관 */
    private final class Bridge {
        @JavascriptInterface public String load() {
            try { JSONObject o = new JSONObject(); for (Map.Entry<String, ?> e : store.getAll().entrySet()) o.put(e.getKey(), String.valueOf(e.getValue())); return o.toString(); }
            catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void put(String k, String v) {
            if (k == null || !k.startsWith("arpg_") || v == null) return;
            synchronized (backupLock) { if (restoringBackup) return; store.edit().putString(k, v).apply(); }
            queueBackup(false);
        }
        @JavascriptInterface public void del(String k) {
            if (k == null || !k.startsWith("arpg_")) return;
            synchronized (backupLock) { if (restoringBackup) return; store.edit().remove(k).apply(); }
            queueBackup(false);
        }
        @JavascriptInterface public boolean isApp() { return true; }
        @JavascriptInterface public String backupStatus() {
            try { return new JSONObject().put("linked", backupUri() != null)
                .put("at", backupPrefs.getLong("backupAt", 0)).put("held", backupPrefs.getBoolean("held", false))
                .put("error", backupPrefs.getString("error", "")).toString(); }
            catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface public void pickBackup() {
            runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                .setTitle("드라이브 백업 파일 고르기")
                .setItems(new String[]{"새 백업 파일 만들기", "기존 백업 파일 연결"}, (d, which) -> pickDocument(which == 0))
                .setNegativeButton("취소", null).show());
        }
        @JavascriptInterface public void restoreBackup() { readBackup(); }
        @JavascriptInterface public void cancelRestore() { pendingRestore = null; restoringBackup = false; }
        @JavascriptInterface public void applyBackup() {
            final String text = pendingRestore;
            if (text == null || !restoringBackup) return;
            pendingRestore = null;
            backupIO.execute(() -> {
                try {
                    JSONObject all = validBackup(text);
                    SharedPreferences.Editor edit = store.edit();
                    for (String k : store.getAll().keySet()) if (k.startsWith("arpg_")) edit.remove(k);
                    for (Iterator<String> it = all.keys(); it.hasNext();) { String k = it.next(); edit.putString(k, all.getString(k)); }
                    if (!edit.commit()) throw new IllegalStateException();
                    backupPrefs.edit().putBoolean("held", false).remove("error").apply();
                    awaitingRestoreReload = true;
                    js("window.onArpgBackupApplied&&window.onArpgBackupApplied(" + JSONObject.quote(text) + ")");
                } catch (Exception e) { restoringBackup = false; js("window.onArpgBackupFail&&window.onArpgBackupFail('기기 저장을 갱신하지 못했습니다.')"); }
            });
        }
    }

    private void js(String code) { ui.post(() -> { if (game != null) game.evaluateJavascript(code, null); }); }
    private void backupNotice(String message) { js("window.onArpgBackup&&window.onArpgBackup(" + JSONObject.quote(message) + ")"); }
    private Uri backupUri() { String u = backupPrefs.getString("uri", null); return u == null ? null : Uri.parse(u); }

    // 문플로와 같은 Storage Access Framework: 구글 로그인/API 키 없이 드라이브의 파일을 지정한다.
    private void pickDocument(boolean create) {
        pickingBackup = true;
        Intent i = new Intent(create ? Intent.ACTION_CREATE_DOCUMENT : Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(create ? "application/json" : "*/*");
        if (create) i.putExtra(Intent.EXTRA_TITLE, "arpg_save.json");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try { startActivityForResult(i, create ? REQ_BACKUP : REQ_LINK); }
        catch (ActivityNotFoundException e) { pickingBackup = false; backupNotice("파일 선택 화면을 열지 못했습니다."); }
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_BACKUP && req != REQ_LINK) return;
        pickingBackup = false;
        if (res != RESULT_OK || data == null || data.getData() == null) { backupNotice("파일 선택을 취소했습니다."); return; }
        Uri u = data.getData();
        try {
            int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if (flags != (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION)) throw new IllegalStateException();
            getContentResolver().takePersistableUriPermission(u, flags);
            backupPrefs.edit().putString("uri", u.toString()).putLong("backupAt", 0)
                .putBoolean("held", req == REQ_LINK).remove("error").apply();
            if (req == REQ_BACKUP) { queueBackup(true); backupNotice("연결했습니다. 저장할 때 자동으로 백업합니다."); }
            else backupNotice("기존 파일을 연결했습니다. 백업에서 불러오기를 눌러 이어 하세요. 불러오기 전에는 파일을 덮어쓰지 않습니다.");
        } catch (Exception e) { backupNotice("읽기·쓰기 권한을 유지할 수 없습니다. 파일을 다시 골라 주세요."); }
    }

    private void queueBackup(boolean force) {
        synchronized (backupLock) {
            if (backupUri() == null || restoringBackup || pickingBackup || backupPrefs.getBoolean("held", false)) return;
            if (pendingBackup != null && !pendingBackup.isDone()) {
                if (!force) return;
                pendingBackup.cancel(false);
            }
            pendingBackup = backupIO.schedule(() -> {
                synchronized (backupLock) { pendingBackup = null; }
                writeBackup();
            }, force ? 0 : 5, TimeUnit.SECONDS);
        }
    }

    private JSONObject snapshot() throws Exception {
        JSONObject o = new JSONObject();
        for (Map.Entry<String, ?> e : store.getAll().entrySet())
            if (e.getKey().startsWith("arpg_") && e.getValue() instanceof String) o.put(e.getKey(), e.getValue());
        return o;
    }

    // 백업 형식은 기존 arpg_* 값의 묶음. v3 내부 필드/시각을 다시 만들거나 변환하지 않는다.
    static JSONObject validBackup(String text) throws Exception {
        if (text == null || text.getBytes(StandardCharsets.UTF_8).length > MAX_BACKUP_BYTES) throw new IllegalArgumentException();
        JSONObject all = new JSONObject(text);
        for (Iterator<String> it = all.keys(); it.hasNext();) {
            String k = it.next();
            if (!k.startsWith("arpg_") || !(all.get(k) instanceof String)) throw new IllegalArgumentException();
        }
        JSONObject s = new JSONObject(all.getString("arpg_save_v3"));
        if (!(s.get("v") instanceof Number) || s.getDouble("v") != 3 || !(s.get("lv") instanceof Number)
            || s.getDouble("lv") != s.getInt("lv") || s.getInt("lv") < 1 || s.getInt("lv") > 70 || !(s.get("gold") instanceof Number)
            || !(s.get("hp") instanceof Number) || !(s.get("mp") instanceof Number)
            || !(s.get("stats") instanceof JSONObject) || !(s.get("bag") instanceof JSONArray)
            || !(s.get("eq") instanceof JSONObject)) throw new IllegalArgumentException();
        return all;
    }

    private void writeBackup() {
        Uri u = backupUri();
        if (u == null || restoringBackup || pickingBackup || backupPrefs.getBoolean("held", false)) return;
        try {
            JSONObject all = snapshot();
            if (!all.has("arpg_save_v3")) return; // 처음 시작/초기화 직후에는 빈 저장으로 백업을 훼손하지 않는다.
            String text = all.toString(); validBackup(text);
            try (OutputStream out = getContentResolver().openOutputStream(u, "wt")) {
                if (out == null) throw new IllegalStateException();
                out.write(text.getBytes(StandardCharsets.UTF_8));
            }
            backupPrefs.edit().putLong("backupAt", System.currentTimeMillis()).remove("error").apply();
            backupNotice("");
        } catch (Exception e) {
            backupPrefs.edit().putString("error", "백업 실패").apply();
            backupNotice("백업하지 못했습니다. 인터넷 연결과 파일 권한을 확인해 주세요. 이 기기의 저장은 유지됩니다.");
        }
    }

    private void readBackup() {
        final Uri u = backupUri();
        if (u == null) { js("window.onArpgBackupFail&&window.onArpgBackupFail('먼저 백업 파일을 골라 주세요.')"); return; }
        synchronized (backupLock) { if (restoringBackup) return; restoringBackup = true; }
        backupIO.execute(() -> {
            try {
                String text;
                try (InputStream in = getContentResolver().openInputStream(u); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    if (in == null) throw new IllegalArgumentException();
                    byte[] buf = new byte[65536]; int n;
                    while ((n = in.read(buf)) != -1) { if (out.size() + n > MAX_BACKUP_BYTES) throw new IllegalArgumentException(); out.write(buf, 0, n); }
                    text = out.toString("UTF-8");
                }
                JSONObject all = validBackup(text);
                pendingRestore = all.toString();
                // 웹의 엄격한 JSON 검사까지 통과한 뒤 applyBackup에서 기기 저장을 교체한다.
                js("window.onArpgRestore&&window.onArpgRestore(" + JSONObject.quote(pendingRestore) + ")");
            } catch (Exception e) {
                restoringBackup = false;
                js("window.onArpgBackupFail&&window.onArpgBackupFail('불러올 수 없는 파일입니다. ARPG 백업 파일과 연결 상태를 확인해 주세요. 기존 저장은 유지됩니다.')");
            }
        });
    }

    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    private void requestHighestRefreshRate() {
        try {
            Display d = getWindowManager().getDefaultDisplay();
            float best = d.getRefreshRate();
            for (float r : d.getSupportedRefreshRates()) if (r > best) best = r;
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.preferredRefreshRate = best;
            getWindow().setAttributes(lp);
        } catch (Exception ignored) { }
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) hideBars(); }
    @Override protected void onResume() { super.onResume(); hideBars(); requestHighestRefreshRate(); if (game != null) game.onResume(); }
    @Override protected void onPause() {
        if (game != null) { game.evaluateJavascript("try{UI.save()}catch(e){}", r -> queueBackup(true)); game.onPause(); }
        super.onPause();
    }

    // 뒤로 가기: 열린 창이 있으면 닫고, 없으면 두 번 눌러야 끝냄
    @Override public void onBackPressed() {
        if (game == null) { super.onBackPressed(); return; }
        game.evaluateJavascript("(function(){try{if(GAME.isOpen()){GAME.closeAll();return 1}}catch(e){}return 0})()", r -> {
            if ("1".equals(r)) return;
            long now = System.currentTimeMillis();
            if (now - backAt < 2000) finish();
            else { backAt = now; Toast.makeText(this, "한 번 더 누르면 끝냅니다", Toast.LENGTH_SHORT).show(); }
        });
    }
}
