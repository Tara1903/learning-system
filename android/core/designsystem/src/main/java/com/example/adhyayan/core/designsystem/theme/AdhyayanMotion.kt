package com.example.adhyayan.core.designsystem.theme

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback

/**
 * The Adhyayan Motion Engine.
 * Provides standard, physics-based animation curves.
 * 
 * "Every interaction must have weight, momentum and intention."
 */
object AdhyayanMotion {
    val springBouncy = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessLow
    )

    val springSnappy = spring<Float>(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMedium
    )
}

/**
 * A custom modifier for all touch targets.
 * Replaces default Material ripples with a physical scale-down (squish) effect on press.
 */
fun Modifier.bouncyClick(
    interactionSource: MutableInteractionSource? = null,
    onClick: () -> Unit
): Modifier = composed {
    val hapticFeedback = LocalHapticFeedback.current
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = AdhyayanMotion.springBouncy,
        label = "bouncyClickScale"
    )

    val actualInteractionSource = interactionSource ?: remember { MutableInteractionSource() }

    this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
        .pointerInput(actualInteractionSource) {
            awaitPointerEventScope {
                while (true) {
                    awaitFirstDown(requireUnconsumed = false)
                    isPressed = true
                    hapticFeedback?.performHapticFeedback(HapticFeedbackType.TextHandleMove) // Subtle vibration
                    waitForUpOrCancellation()
                    isPressed = false
                }
            }
        }
        .clickable(
            interactionSource = actualInteractionSource,
            indication = null, // Strictly remove default ripple indication
            onClick = onClick
        )
}
