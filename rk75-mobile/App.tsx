import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';

const SITE_URL = 'https://rk75-command.rk75command.workers.dev/';
const SITE_ORIGIN = new URL(SITE_URL).origin;

export default function App() {
  const webView = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(() => {
    setHasError(false);
    setIsReady(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    webView.current?.reload();
  }, []);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webView.current?.goBack();
      return true;
    });
    return () => listener.remove();
  }, [canGoBack]);

  const handleNavigation = useCallback((request: WebViewNavigation) => {
    if (request.url.startsWith(SITE_ORIGIN)) return true;
    void Linking.openURL(request.url).catch(() => setHasError(true));
    return false;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <WebView
        ref={webView}
        source={{ uri: SITE_URL }}
        originWhitelist={['https://*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        userAgent="RK75CommandMobile/1.0"
        onShouldStartLoadWithRequest={handleNavigation}
        onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
        onLoadEnd={() => {
          setIsReady(true);
          setHasError(false);
        }}
        onError={() => {
          setIsReady(true);
          setHasError(true);
        }}
        style={styles.webView}
      />

      {!isReady && <LaunchScreen />}

      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorEyebrow}>RK75 COMMAND</Text>
          <Text style={styles.errorTitle}>تعذّر الاتصال</Text>
          <Text style={styles.errorDescription}>تأكد من الإنترنت ثم أعد المحاولة.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="إعادة المحاولة" onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function LaunchScreen() {
  return (
    <LinearGradient colors={['#070b18', '#111a31', '#080b14']} style={styles.launchScreen}>
      <View style={styles.launchGlow} />
      <Text style={styles.brand}><Text style={styles.brandLight}>RK</Text><Text style={styles.brandGold}>75</Text></Text>
      <Text style={styles.brandSubtitle}>FATE WAR COMMAND</Text>
      <View style={styles.loadingRow}>
        <ActivityIndicator color="#ffd45c" size="small" />
        <Text style={styles.loadingText}>جارٍ فتح القيادة</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070b18' },
  webView: { flex: 1, backgroundColor: '#070b18' },
  launchScreen: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 5 },
  launchGlow: { position: 'absolute', width: 330, height: 330, borderRadius: 999, backgroundColor: 'rgba(255, 181, 67, 0.12)', top: '21%' },
  brand: { color: '#eef2ff', fontSize: 56, fontWeight: '900', letterSpacing: -4 },
  brandLight: { color: '#f7f9ff' },
  brandGold: { color: '#ffd45c' },
  brandSubtitle: { color: '#d0a74e', marginTop: 8, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  loadingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 48 },
  loadingText: { color: '#b8c4dd', fontSize: 13, fontWeight: '600' },
  errorOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#070b18', zIndex: 6 },
  errorEyebrow: { color: '#ffd45c', fontWeight: '800', fontSize: 11, letterSpacing: 2.5 },
  errorTitle: { color: '#fff', fontWeight: '800', fontSize: 28, marginTop: 13 },
  errorDescription: { color: '#aebbd4', fontSize: 14, marginTop: 10, textAlign: 'center' },
  retryButton: { marginTop: 28, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 14, backgroundColor: '#ffd45c' },
  retryText: { color: '#12131c', fontSize: 14, fontWeight: '900' },
});
