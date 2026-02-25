package com.chronosbooth.app;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKeys;
import androidx.webkit.WebViewAssetLoader;

import com.google.ai.client.generativeai.GenerativeModel;
import com.google.ai.client.generativeai.java.GenerativeModelFutures;
import com.google.ai.client.generativeai.type.Content;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private ActivityResultLauncher<String> cameraPermissionLauncher;
    private SharedPreferences securePrefs;
    private static final String TAG = "ChronosBooth";
    private final Executor executor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            String masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC);
            securePrefs = EncryptedSharedPreferences.create(
                "chronos_prefs",
                masterKeyAlias,
                this,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            Log.e(TAG, "Secure storage init failed", e);
            securePrefs = getSharedPreferences("chronos_prefs_fallback", MODE_PRIVATE);
        }

        // Set the provided Gemini API Key
        securePrefs.edit().putString("google_ai_api_key", "AIzaSyB6PRze2bJV8T9MaPF_RJxj5qbKwdWNlxw").apply();

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);
        
        cameraPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            isGranted -> {
                Log.d(TAG, "Camera permission granted: " + isGranted);
                if (isGranted) {
                    // Try common callback names found in web-to-native implementations
                    webView.evaluateJavascript("if(window.onCameraPermissionGranted) onCameraPermissionGranted();", null);
                }
            }
        );

        configureWebView();
        webView.loadUrl("https://appassets.androidplatform.net/public/index.html");
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        
        webView.setBackgroundColor(Color.parseColor("#0a0502")); 
        
        webView.addJavascriptInterface(new ChronosBridge(), "ChronosAndroid");

        WebView.setWebContentsDebuggingEnabled(true);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.d(TAG, "Page Finished: " + url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                Log.e(TAG, "Error loading " + request.getUrl() + ": " + error.getDescription());
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) 
                        != PackageManager.PERMISSION_GRANTED) {
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
                    }
                    request.grant(request.getResources());
                });
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "JS: " + consoleMessage.message());
                return true;
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                Log.d(TAG, "JS Alert: " + message);
                result.confirm();
                return true;
            }
        });
    }

    public class ChronosBridge {
        @JavascriptInterface
        public void setApiKey(String key) {
            securePrefs.edit().putString("google_ai_api_key", key).apply();
            Log.d(TAG, "API Key saved securely.");
        }

        @JavascriptInterface
        public String getApiKey() {
            return securePrefs.getString("google_ai_api_key", "");
        }

        @JavascriptInterface
        public void analyzeImage(String base64Image, String callbackId) {
            Log.d(TAG, "analyzeImage called with callbackId: " + callbackId);
            String apiKey = getApiKey();
            executor.execute(() -> {
                try {
                    GenerativeModel gm = new GenerativeModel("gemini-1.5-pro", apiKey);
                    GenerativeModelFutures model = GenerativeModelFutures.from(gm);

                    Bitmap bitmap = decodeBase64(base64Image);
                    Content content = new Content.Builder()
                        .addText("Analyze this captured photo. Describe facial features, expression, pose, and clothing in detail for historical reconstruction.")
                        .addImage(bitmap)
                        .build();

                    String result = model.generateContent(content).get().getText();
                    Log.d(TAG, "Analysis successful: " + result);
                    
                    runOnUiThread(() -> {
                        // Support multiple possible callback names for robustness
                        String js = String.format(
                            "if(window.onAnalysisResult) { window.onAnalysisResult('%1$s', '%2$s'); }" +
                            "else if(window.handleAnalysisResult) { window.handleAnalysisResult('%1$s', '%2$s'); }" +
                            "else { console.error('No analysis callback found for %1$s'); }", 
                            callbackId, escapeJs(result)
                        );
                        webView.evaluateJavascript(js, null);
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Analysis failed", e);
                    sendErrorToWeb(callbackId, e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void transformToEra(String base64Image, String era, String callbackId) {
            Log.d(TAG, "transformToEra called for era: " + era + " with callbackId: " + callbackId);
            String apiKey = getApiKey();
            executor.execute(() -> {
                try {
                    GenerativeModel gm = new GenerativeModel("gemini-1.5-flash", apiKey);
                    GenerativeModelFutures model = GenerativeModelFutures.from(gm);

                    Bitmap bitmap = decodeBase64(base64Image);
                    String prompt = String.format("Preserve the core structure of the person's face in this photo, but repaint the entire scene to match the era: %s. Replace background, lighting, and attire.", era);
                    
                    Content content = new Content.Builder()
                        .addText(prompt)
                        .addImage(bitmap)
                        .build();

                    String result = model.generateContent(content).get().getText();
                    Log.d(TAG, "Transformation successful: " + result);
                    
                    runOnUiThread(() -> {
                        String js = String.format(
                            "if(window.onTransformationResult) { window.onTransformationResult('%1$s', '%2$s'); }" +
                            "else if(window.handleTransformationResult) { window.handleTransformationResult('%1$s', '%2$s'); }" +
                            "else { console.error('No transformation callback found for %1$s'); }",
                            callbackId, escapeJs(result)
                        );
                        webView.evaluateJavascript(js, null);
                    });
                } catch (Exception e) {
                    Log.e(TAG, "Transformation failed", e);
                    sendErrorToWeb(callbackId, e.getMessage());
                }
            });
        }

        private void sendErrorToWeb(String callbackId, String error) {
            runOnUiThread(() -> {
                String js = String.format(
                    "if(window.onBridgeError) { window.onBridgeError('%1$s', '%2$s'); }" +
                    "else if(window.handleBridgeError) { window.handleBridgeError('%1$s', '%2$s'); }",
                    callbackId, escapeJs(error)
                );
                webView.evaluateJavascript(js, null);
            });
        }

        private Bitmap decodeBase64(String base64Str) {
            try {
                String pureBase64 = base64Str;
                if (base64Str.contains(",")) {
                    pureBase64 = base64Str.substring(base64Str.indexOf(",") + 1);
                }
                byte[] decodedBytes = Base64.decode(pureBase64, Base64.DEFAULT);
                return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
            } catch (Exception e) {
                Log.e(TAG, "decodeBase64 failed", e);
                return null;
            }
        }

        private String escapeJs(String str) {
            if (str == null) return "";
            return str.replace("\\", "\\\\")
                      .replace("'", "\\'")
                      .replace("\"", "\\\"")
                      .replace("\n", "\\n")
                      .replace("\r", "\\r");
        }
    }
}
