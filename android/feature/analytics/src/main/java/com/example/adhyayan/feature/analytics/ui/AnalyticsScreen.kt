package com.example.adhyayan.feature.analytics.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.adhyayan.core.designsystem.component.AdhyayanBarChart
import com.example.adhyayan.core.designsystem.component.AdhyayanCard
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme

@Composable
fun AnalyticsScreen(
    viewModel: AnalyticsViewModel
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AdhyayanTheme.colors.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
        ) {
            // Header
            BasicText(
                text = "Your Progress",
                style = AdhyayanTheme.typography.headlineMedium.copy(color = AdhyayanTheme.colors.textPrimary)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Streak Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                AdhyayanCard(modifier = Modifier.weight(1f)) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        BasicText(
                            text = "🔥",
                            style = AdhyayanTheme.typography.headlineLarge
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        BasicText(
                            text = "${uiState.currentStreak} Days",
                            style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary)
                        )
                        BasicText(
                            text = "Current Streak",
                            style = AdhyayanTheme.typography.labelMedium.copy(color = AdhyayanTheme.colors.textSecondary)
                        )
                    }
                }

                AdhyayanCard(modifier = Modifier.weight(1f)) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        BasicText(
                            text = "🏆",
                            style = AdhyayanTheme.typography.headlineLarge
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        BasicText(
                            text = "${uiState.longestStreak} Days",
                            style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary)
                        )
                        BasicText(
                            text = "Longest Streak",
                            style = AdhyayanTheme.typography.labelMedium.copy(color = AdhyayanTheme.colors.textSecondary)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(48.dp))

            // Activity Chart
            BasicText(
                text = "Weekly Activity",
                style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary)
            )
            Spacer(modifier = Modifier.height(16.dp))
            
            AdhyayanCard(modifier = Modifier.fillMaxWidth()) {
                Box(modifier = Modifier.padding(24.dp)) {
                    AdhyayanBarChart(
                        data = uiState.weeklyProgress,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}
