package com.example.adhyayan.core.designsystem.theme

import android.graphics.BlurMaskFilter
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The Adhyayan Shadow and Glow Engines.
 * "Multi-layer shadows, elevation system, ambient lighting simulation."
 * "Dynamic illumination, premium border glow, accent lighting."
 */

/**
 * Applies a premium, multi-layered, smooth ambient shadow.
 * Bypasses the default Android elevation shadow which often looks harsh.
 */
fun Modifier.adhyayanShadow(
    color: Color = Color(0x1A000000),
    blurRadius: Dp = 16.dp,
    offsetY: Dp = 8.dp,
    offsetX: Dp = 0.dp,
    spread: Dp = 0.dp
): Modifier = this.drawBehind {
    val transparentColor = android.graphics.Color.TRANSPARENT
    val shadowColor = color.hashCode()
    
    val paint = Paint().asFrameworkPaint().apply {
        this.color = shadowColor
        if (blurRadius.toPx() > 0) {
            maskFilter = BlurMaskFilter(blurRadius.toPx(), BlurMaskFilter.Blur.NORMAL)
        }
    }

    drawIntoCanvas { canvas ->
        val left = offsetX.toPx() - spread.toPx()
        val top = offsetY.toPx() - spread.toPx()
        val right = size.width + spread.toPx() + offsetX.toPx()
        val bottom = size.height + spread.toPx() + offsetY.toPx()
        
        canvas.drawRoundRect(
            left = left,
            top = top,
            right = right,
            bottom = bottom,
            radiusX = 24.dp.toPx(), // Default corner rounding, should sync with Shape engine later
            radiusY = 24.dp.toPx(),
            paint = Paint().apply { asFrameworkPaint().set(paint) }
        )
    }
}

/**
 * Applies an ambient glow, primarily used in Dark Mode to make cards appear illuminated.
 */
fun Modifier.adhyayanGlow(
    color: Color,
    radius: Dp = 20.dp
): Modifier = this.drawBehind {
    val paint = Paint().asFrameworkPaint().apply {
        this.color = color.hashCode()
        if (radius.toPx() > 0) {
            maskFilter = BlurMaskFilter(radius.toPx(), BlurMaskFilter.Blur.NORMAL)
        }
    }

    drawIntoCanvas { canvas ->
        canvas.drawRoundRect(
            left = 0f,
            top = 0f,
            right = size.width,
            bottom = size.height,
            radiusX = 24.dp.toPx(),
            radiusY = 24.dp.toPx(),
            paint = Paint().apply { asFrameworkPaint().set(paint) }
        )
    }
}
