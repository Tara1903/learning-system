package com.example.adhyayan.feature.course_viewer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.adhyayan.core.designsystem.component.AdhyayanVideoPlayer
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme

@Composable
fun CourseViewerScreen(
    viewModel: CourseViewerViewModel,
    courseId: String
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(courseId) {
        viewModel.loadCourse(courseId)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AdhyayanTheme.colors.background)
    ) {
        uiState?.let { state ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(16f / 9f)
                        .padding(16.dp)
                        .background(
                            color = AdhyayanTheme.colors.surfaceElevated,
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)
                        ),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                        BasicText(
                            text = "🎥",
                            style = AdhyayanTheme.typography.headlineLarge
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        BasicText(
                            text = "Video Coming Soon",
                            style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.primary)
                        )
                    }
                }

                // Lesson Content Section
                Column(modifier = Modifier.padding(24.dp)) {
                    BasicText(
                        text = state.title,
                        style = AdhyayanTheme.typography.headlineMedium.copy(color = AdhyayanTheme.colors.textPrimary)
                    )
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    // Adhyayan Rich Text (simulated with BasicText)
                    BasicText(
                        text = state.articleContent,
                        style = AdhyayanTheme.typography.bodyLarge.copy(color = AdhyayanTheme.colors.textSecondary)
                    )
                }
            }
        }
    }
}
