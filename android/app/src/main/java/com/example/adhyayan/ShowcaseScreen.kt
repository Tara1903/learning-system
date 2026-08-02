package com.example.adhyayan

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.adhyayan.core.designsystem.component.AdhyayanButton
import com.example.adhyayan.core.designsystem.component.AdhyayanCard
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme

@Composable
fun ShowcaseScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AdhyayanTheme.colors.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        BasicText(
            text = "Adhyayan UI Engine",
            style = AdhyayanTheme.typography.titleLarge.copy(color = AdhyayanTheme.colors.textPrimary)
        )
        Spacer(modifier = Modifier.height(8.dp))
        BasicText(
            text = "Phase 0 Complete. Material 3 Abandoned.",
            style = AdhyayanTheme.typography.bodyMedium.copy(color = AdhyayanTheme.colors.textSecondary)
        )
        
        Spacer(modifier = Modifier.height(48.dp))

        AdhyayanCard(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                 BasicText(
                    text = "Floating Depth Card",
                    style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary)
                )
            }
        }

        Spacer(modifier = Modifier.height(48.dp))

        AdhyayanButton(
            text = "Spring Physics Button",
            onClick = { /* Demo spring physics */ }
        )
    }
}

// Temporary Box import for the ShowcaseScreen
@Composable
fun Box(contentAlignment: Alignment, modifier: Modifier, content: @Composable () -> Unit) {
    androidx.compose.foundation.layout.Box(
        contentAlignment = contentAlignment,
        modifier = modifier,
        content = { content() }
    )
}
