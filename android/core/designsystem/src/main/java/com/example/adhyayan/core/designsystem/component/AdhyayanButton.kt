package com.example.adhyayan.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.core.designsystem.theme.bouncyClick

/**
 * 100% custom Button component bypassing Material Design.
 * Features physics-based spring animations on press instead of ripples.
 */
@Composable
fun AdhyayanButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    backgroundColor: Color = AdhyayanTheme.colors.primary,
    textColor: Color = AdhyayanTheme.colors.onPrimary,
    textStyle: TextStyle = AdhyayanTheme.typography.labelLarge,
    contentPadding: PaddingValues = PaddingValues(horizontal = 24.dp, vertical = 14.dp)
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .bouncyClick(onClick = onClick) // The custom spring physics interaction
            .clip(RoundedCornerShape(16.dp))
            .background(backgroundColor)
            .padding(contentPadding)
    ) {
        BasicText(
            text = text,
            style = textStyle.copy(color = textColor)
        )
    }
}
