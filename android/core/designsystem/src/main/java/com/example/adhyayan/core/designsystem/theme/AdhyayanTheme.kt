package com.example.adhyayan.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable

object AdhyayanTheme {
    val colors: AdhyayanColors
        @Composable
        @ReadOnlyComposable
        get() = LocalAdhyayanColors.current

    val typography: AdhyayanTypography
        @Composable
        @ReadOnlyComposable
        get() = LocalAdhyayanTypography.current
}

@Composable
fun AdhyayanTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) AdhyayanDarkColors else AdhyayanLightColors

    CompositionLocalProvider(
        LocalAdhyayanColors provides colors,
        LocalAdhyayanTypography provides defaultTypography,
        content = content
    )
}
