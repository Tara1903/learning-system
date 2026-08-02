package com.example.adhyayan.core.designsystem.component

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme

@Composable
fun AdhyayanBarChart(
    data: List<Float>, // Values between 0f and 1f
    modifier: Modifier = Modifier,
    barColor: Color = AdhyayanTheme.colors.primary,
    trackColor: Color = AdhyayanTheme.colors.surfaceElevated
) {
    val animationProgress = remember { Animatable(0f) }

    LaunchedEffect(data) {
        animationProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1000)
        )
    }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(200.dp)
    ) {
        if (data.isEmpty()) return@Canvas

        val barCount = data.size
        val spacing = 16.dp.toPx()
        val totalSpacing = spacing * (barCount - 1)
        val barWidth = (size.width - totalSpacing) / barCount
        val maxBarHeight = size.height

        for (i in 0 until barCount) {
            val startX = i * (barWidth + spacing)
            
            // Draw track (background)
            drawRoundRect(
                color = trackColor,
                topLeft = Offset(startX, 0f),
                size = Size(barWidth, maxBarHeight),
                cornerRadius = CornerRadius(8.dp.toPx(), 8.dp.toPx())
            )

            // Draw animated fill
            val targetHeight = maxBarHeight * data[i]
            val currentHeight = targetHeight * animationProgress.value
            val startY = maxBarHeight - currentHeight

            drawRoundRect(
                color = barColor,
                topLeft = Offset(startX, startY),
                size = Size(barWidth, currentHeight),
                cornerRadius = CornerRadius(8.dp.toPx(), 8.dp.toPx())
            )
        }
    }
}
