package com.example.adhyayan.core.designsystem.component

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.core.designsystem.theme.adhyayanGlow

/**
 * 100% custom TextField component bypassing Material Design.
 * Features animated glowing borders on focus and no default underlines.
 */
@Composable
fun AdhyayanTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    visualTransformation: VisualTransformation = VisualTransformation.None,
    isError: Boolean = false
) {
    var isFocused by remember { mutableStateOf(false) }

    val defaultBorderColor = if (isError) Color(0xFFEF4444) else Color(0x1AFFFFFF)
    val focusedBorderColor = if (isError) Color(0xFFEF4444) else AdhyayanTheme.colors.primary

    val animatedBorderColor by animateColorAsState(
        targetValue = if (isFocused) focusedBorderColor else defaultBorderColor,
        label = "borderColor"
    )

    val animatedGlowColor by animateColorAsState(
        targetValue = if (isFocused) focusedBorderColor.copy(alpha = 0.3f) else Color.Transparent,
        label = "glowColor"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .adhyayanGlow(color = animatedGlowColor, radius = 12.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(AdhyayanTheme.colors.surfaceElevated)
            .border(1.dp, animatedBorderColor, RoundedCornerShape(16.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        contentAlignment = Alignment.CenterStart
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            textStyle = AdhyayanTheme.typography.bodyLarge.copy(color = AdhyayanTheme.colors.textPrimary),
            cursorBrush = SolidColor(AdhyayanTheme.colors.primary),
            visualTransformation = visualTransformation,
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { focusState ->
                    isFocused = focusState.isFocused
                }
        )

        if (value.isEmpty() && !isFocused) {
            androidx.compose.foundation.text.BasicText(
                text = placeholder,
                style = AdhyayanTheme.typography.bodyLarge.copy(color = AdhyayanTheme.colors.textSecondary)
            )
        }
    }
}
