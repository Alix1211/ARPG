package com.alix.arpg;

import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
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
import org.json.JSONObject;

// 골드 퀘스트 사가 앱 틀 (문플로 방식)
// 켤 때마다 깃허브 페이지의 최신 게임을 불러오고, 인터넷이 안 되면 앱 안에 든 예비 판으로 실행한다.
// 저장은 게임 쪽(localStorage)과 앱 쪽(SharedPreferences "store")에 같이 적어, 두 판이 같은 저장을 쓴다.
public final class MainActivity extends Activity {
    private static final String REMOTE = "https://alix1211.github.io/ARPG/game/town.html";
    private static final String LOCAL = "https://appassets.androidplatform.net/assets/game/town.html";
    private WebView game;
    private SharedPreferences store;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private boolean usingLocal = false, remoteOk = false;
    private long backAt = 0;

    private void loadLocal() { if (usingLocal) return; usingLocal = true; if (game != null) game.loadUrl(LOCAL); }

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        store = getSharedPreferences("store", MODE_PRIVATE);
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
        @JavascriptInterface public void put(String k, String v) { store.edit().putString(k, v).apply(); }
        @JavascriptInterface public void del(String k) { store.edit().remove(k).apply(); }
        @JavascriptInterface public boolean isApp() { return true; }
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
        if (game != null) { game.evaluateJavascript("try{UI.save()}catch(e){}", null); game.onPause(); }
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
