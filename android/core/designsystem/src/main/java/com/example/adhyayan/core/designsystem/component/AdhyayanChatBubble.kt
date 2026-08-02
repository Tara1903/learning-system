package com.example.adhyayan.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.core.designsystem.theme.adhyayanGlow

@Composable
fun AdhyayanChatBubble(
    text: String,
    isUser: Boolean,
    modifier: Modifier = Modifier,
    isStreaming: Boolean = false // If true, apply a subtle pulse/glow
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isUser) {
            // AI Avatar placeholder
            Box(
                modifier = Modifier
                    .padding(top = 4.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(AdhyayanTheme.colors.primary.copy(alpha = 0.2f))
                    .padding(8.dp)
            ) {
                BasicText(
                    text = "AI",
                    style = AdhyayanTheme.typography.labelMedium.copy(color = AdhyayanTheme.colors.primary)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
        }

        Box(
            modifier = Modifier
                .weight(1f, fill = false)
                .then(
                    if (isUser) {
                        Modifier
                            .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp, bottomStart = 16.dp, bottomEnd = 4.dp))
                            .background(AdhyayanTheme.colors.surfaceElevated)
                            .padding(16.dp)
                    } else {
                        Modifier
                            .padding(top = 4.dp, bottom = 4.dp, end = 24.dp)
                    }
                )
        ) {
            val textColor = if (isUser) AdhyayanTheme.colors.textPrimary else AdhyayanTheme.colors.textPrimary
            
            // For the AI, we simulate text being projected rather than in a bubble
            val textModifier = if (!isUser && isStreaming) {
                Modifier.adhyayanGlow(color = AdhyayanTheme.colors.primary.copy(alpha = 0.4f), radius = 12.dp)
            } else {
                Modifier
            }

            BasicText(
                text = text,
                style = AdhyayanTheme.typography.bodyLarge.copy(color = textColor),
                modifier = textModifier
            )
        }
    }
}
