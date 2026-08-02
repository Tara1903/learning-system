package com.example.adhyayan.core.designsystem.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

@Immutable
data class AdhyayanColors(
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val primary: Color,
    val onPrimary: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val borderGlow: Color
)

val AdhyayanDarkColors = AdhyayanColors(
    background = Color(0xFF09090B),
    surface = Color(0xFF111216),
    surfaceElevated = Color(0xFF181A20),
    primary = Color(0xFF3B82F6), // Electric Blue accent
    onPrimary = Color(0xFFFFFFFF),
    textPrimary = Color(0xFFFAFAFA),
    textSecondary = Color(0xFFA1A1AA),
    borderGlow = Color(0x333B82F6) // Soft blue glow
)

val AdhyayanLightColors = AdhyayanColors(
    background = Color(0xFFFDFDFD),
    surface = Color(0xFFFFFFFF),
    surfaceElevated = Color(0xFFF4F4F5),
    primary = Color(0xFF2563EB),
    onPrimary = Color(0xFFFFFFFF),
    textPrimary = Color(0xFF09090B),
    textSecondary = Color(0xFF52525B),
    borderGlow = Color(0x11000000)
)

val LocalAdhyayanColors = staticCompositionLocalOf {
    AdhyayanDarkColors
}
