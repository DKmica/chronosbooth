# Keep WebView JavaScript interfaces if any are introduced in the future.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
