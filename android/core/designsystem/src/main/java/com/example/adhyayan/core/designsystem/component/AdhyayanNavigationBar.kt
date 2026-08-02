package com.example.adhyayan.core.designsystem.component

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.adhyayan.core.designsystem.theme.AdhyayanMotion
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.core.designsystem.theme.adhyayanGlow
import com.example.adhyayan.core.designsystem.theme.adhyayanShadow
import com.example.adhyayan.core.designsystem.theme.bouncyClick

/**
 * 100% Custom floating navigation bar bypassing Material Design's BottomNavigation.
 */
@Composable
fun AdhyayanNavigationBar(
    items: List<String>,
    selectedIndex: Int,
    onItemSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 24.dp)
            .adhyayanGlow(color = AdhyayanTheme.colors.primary.copy(alpha = 0.1f), radius = 24.dp)
            .adhyayanShadow(
                color = AdhyayanTheme.colors.background.copy(alpha = 0.8f),
                blurRadius = 32.dp,
                offsetY = 16.dp
            )
            .clip(RoundedCornerShape(32.dp))
            .background(AdhyayanTheme.colors.surfaceElevated.copy(alpha = 0.85f)) // Slightly translucent for premium glass feel
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            items.forEachIndexed { index, title ->
                val isSelected = index == selectedIndex
                AdhyayanNavItem(
                    title = title,
                    isSelected = isSelected,
                    onClick = { onItemSelected(index) }
                )
            }
        }
    }
}

@Composable
private fun AdhyayanNavItem(
    title: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val indicatorScale by animateFloatAsState(
        targetValue = if (isSelected) 1f else 0f,
        animationSpec = AdhyayanMotion.springBouncy,
        label = "indicatorScale"
    )

    val textColor = if (isSelected) AdhyayanTheme.colors.primary else AdhyayanTheme.colors.textSecondary

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .bouncyClick(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // Glowing dot indicator for active tab
        if (indicatorScale > 0.01f) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 2.dp) // Adjusted to fit under text conceptually
                    .size(4.dp)
                    .scale(indicatorScale)
                    .adhyayanGlow(color = AdhyayanTheme.colors.primary, radius = 4.dp)
                    .clip(CircleShape)
                    .background(AdhyayanTheme.colors.primary)
            )
        }

        BasicText(
            text = title,
            style = AdhyayanTheme.typography.labelLarge.copy(color = textColor),
            modifier = Modifier.padding(bottom = 6.dp)
        )
    }
}
