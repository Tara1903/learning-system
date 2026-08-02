package com.example.adhyayan.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.core.designsystem.theme.adhyayanGlow
import com.example.adhyayan.core.designsystem.theme.adhyayanShadow

/**
 * 100% custom Card component bypassing Material Design.
 * Features ambient glowing and multi-layered shadows depending on the active theme.
 */
@Composable
fun AdhyayanCard(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val backgroundColor = AdhyayanTheme.colors.surface
    val glowColor = AdhyayanTheme.colors.borderGlow

    Box(
        modifier = modifier
            .adhyayanGlow(color = glowColor, radius = 16.dp)
            .adhyayanShadow(
                color = AdhyayanTheme.colors.background.copy(alpha = 0.5f),
                blurRadius = 20.dp,
                offsetY = 10.dp
            )
            .clip(RoundedCornerShape(24.dp))
            .background(backgroundColor),
        content = content
    )
}
