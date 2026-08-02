package com.example.adhyayan.feature.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.adhyayan.core.designsystem.component.AdhyayanButton
import com.example.adhyayan.core.designsystem.component.AdhyayanCard
import com.example.adhyayan.core.designsystem.component.AdhyayanNavigationBar
import com.example.adhyayan.core.designsystem.component.AdhyayanProgressRing
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.core.designsystem.theme.bouncyClick

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onNavigateToAiTutor: () -> Unit,
    onNavigateToCourse: (String) -> Unit,
    onNavigateToProfile: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Home", "Courses", "AI Tutor", "Profile")

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AdhyayanTheme.colors.background)
    ) {
        when (val state = uiState) {
            is DashboardUiState.Loading -> {
                // Centered subtle loading indicator (or shimmering skeleton in future)
                BasicText(
                    text = "Loading workspace...",
                    style = AdhyayanTheme.typography.bodyLarge.copy(color = AdhyayanTheme.colors.textSecondary),
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            is DashboardUiState.Success -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 100.dp) // Leave space for bottom nav
                ) {
                    // Header
                    Column(modifier = Modifier.padding(24.dp)) {
                        BasicText(
                            text = "Welcome back, Taras",
                            style = AdhyayanTheme.typography.titleLarge.copy(color = AdhyayanTheme.colors.textPrimary)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        BasicText(
                            text = "Ready to continue your journey?",
                            style = AdhyayanTheme.typography.bodyLarge.copy(color = AdhyayanTheme.colors.primary)
                        )
                    }

                    // Active Courses (Horizontal Scroll)
                    BasicText(
                        text = "Active Courses",
                        style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary),
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
                    )
                    
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 24.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(state.courses) { course ->
                            CourseProgressCard(
                                course = course,
                                onClick = { onNavigateToCourse(course.id) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    // Upcoming Tasks (Vertical Scroll)
                    BasicText(
                        text = "Upcoming Tasks",
                        style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary),
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
                    )

                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.tasks) { task ->
                            TaskCard(task)
                        }
                        
                        item {
                            Spacer(modifier = Modifier.height(32.dp))
                            // AI Tutor Teaser
                            AdhyayanCard(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    BasicText(
                                        text = "Stuck on a concept?",
                                        style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary)
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    AdhyayanButton(
                                        text = "Ask AI Tutor",
                                        onClick = onNavigateToAiTutor
                                    )
                                }
                            }
                        }
                    }
                }
            }
            is DashboardUiState.Error -> {
                 BasicText(
                    text = state.message,
                    style = AdhyayanTheme.typography.bodyLarge.copy(color = AdhyayanTheme.colors.primary),
                    modifier = Modifier.align(Alignment.Center)
                )
            }
        }

        // Custom Floating Navigation Bar
        AdhyayanNavigationBar(
            items = tabs,
            selectedIndex = selectedTab,
            onItemSelected = { 
                selectedTab = it 
                if (it == 3) onNavigateToProfile()
            },
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

@Composable
private fun CourseProgressCard(course: Course, onClick: () -> Unit) {
    AdhyayanCard(
        modifier = Modifier
            .width(280.dp)
            .height(160.dp)
            .bouncyClick(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                BasicText(
                    text = course.title,
                    style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary)
                )
                Spacer(modifier = Modifier.height(8.dp))
                BasicText(
                    text = "Continue Learning",
                    style = AdhyayanTheme.typography.labelMedium.copy(color = AdhyayanTheme.colors.primary)
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            AdhyayanProgressRing(
                progress = course.progress,
                size = 80.dp,
                strokeWidth = 6.dp
            )
        }
    }
}

@Composable
private fun TaskCard(task: Task) {
    AdhyayanCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                BasicText(
                    text = task.title,
                    style = AdhyayanTheme.typography.bodyLarge.copy(color = AdhyayanTheme.colors.textPrimary)
                )
                Spacer(modifier = Modifier.height(4.dp))
                BasicText(
                    text = "Due: ${task.dueDate}",
                    style = AdhyayanTheme.typography.labelMedium.copy(color = AdhyayanTheme.colors.textSecondary)
                )
            }
            // Future: Checkbox component
        }
    }
}
