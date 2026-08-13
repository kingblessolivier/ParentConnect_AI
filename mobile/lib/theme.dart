import 'package:flutter/material.dart';

/// The "Empowered Trust" palette, shared with the web console and public site.
///
/// Deep blue carries structure and body text (high contrast on sand cream,
/// and it reads as trustworthy rather than clinical); terracotta is the
/// community/call-to-action colour; teal marks the health & youth context;
/// sand cream is the welcoming, non-clinical background.
///
/// Colours are defined once here so a screen never hard-codes one — that is
/// what keeps the app, the console and the site recognisably one programme.
abstract final class PcColors {
  static const deepBlue = Color(0xFF0F2C59);
  static const deepBlueStrong = Color(0xFF0A1E3D);
  static const terracotta = Color(0xFFE07A5F);
  static const terracottaStrong = Color(0xFFC25F45);
  static const teal = Color(0xFF3D9A8B);
  static const sand = Color(0xFFF4F1DE);
  static const surface = Color(0xFFFFFEFA);
  static const muted = Color(0xFF51637E);
  static const danger = Color(0xFFB23A2E);
  static const dangerSoft = Color(0xFFFBEAE7);
}

ThemeData buildPcTheme() {
  const scheme = ColorScheme.light(
    primary: PcColors.deepBlue,
    onPrimary: Colors.white,
    secondary: PcColors.terracotta,
    onSecondary: Colors.white,
    tertiary: PcColors.teal,
    surface: PcColors.surface,
    onSurface: PcColors.deepBlue,
    error: PcColors.danger,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: PcColors.sand,
    // Larger base text than Material's default: the primary user may be
    // reading Kinyarwanda slowly on a small screen (NFR-25/26).
    textTheme: const TextTheme(
      headlineSmall: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: PcColors.deepBlue),
      titleMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: PcColors.deepBlue),
      bodyLarge: TextStyle(fontSize: 16.5, height: 1.5, color: PcColors.deepBlue),
      bodyMedium: TextStyle(fontSize: 15, height: 1.5, color: PcColors.muted),
      labelLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: PcColors.sand,
      foregroundColor: PcColors.deepBlue,
      elevation: 0,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      color: PcColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE0DABD)),
      ),
      margin: EdgeInsets.zero,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: PcColors.terracotta,
        foregroundColor: Colors.white,
        // Generous hit area: core tasks should be reachable in ≤3 taps and
        // usable on a cheap touchscreen (NFR-25).
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: PcColors.surface,
      indicatorColor: PcColors.deepBlue.withValues(alpha: 0.10),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PcColors.deepBlue),
      ),
    ),
  );
}
