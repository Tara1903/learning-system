package com.example.adhyayan

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.feature.ai_tutor.ui.AiTutorScreen
import com.example.adhyayan.feature.ai_tutor.ui.AiTutorViewModel
import com.example.adhyayan.feature.auth.ui.AuthScreen
import com.example.adhyayan.feature.auth.ui.AuthViewModel
import com.example.adhyayan.feature.dashboard.ui.DashboardScreen
import com.example.adhyayan.feature.dashboard.ui.DashboardViewModel
import dagger.hilt.android.AndroidEntryPoint

import com.example.adhyayan.feature.course_viewer.ui.CourseViewerScreen
import com.example.adhyayan.feature.course_viewer.ui.CourseViewerViewModel
import com.example.adhyayan.feature.analytics.ui.AnalyticsScreen
import com.example.adhyayan.feature.analytics.ui.AnalyticsViewModel

sealed class Screen {
    object Auth : Screen()
    object Dashboard : Screen()
    object AdminDashboard : Screen()
    object AdminCreateUser : Screen()
    object AiTutor : Screen()
    data class CourseViewer(val courseId: String) : Screen()
    object Analytics : Screen()
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      AdhyayanTheme {
        var currentScreen by remember { mutableStateOf<Screen>(Screen.Auth) }

        when (val screen = currentScreen) {
            is Screen.Auth -> {
                val authViewModel: AuthViewModel = hiltViewModel()
                AuthScreen(
                    viewModel = authViewModel,
                    onLoginSuccess = { role ->
                        if (role == "admin") {
                            currentScreen = Screen.AdminDashboard
                        } else {
                            currentScreen = Screen.Dashboard
                        }
                    }
                )
            }
            is Screen.AdminDashboard -> {
                com.example.adhyayan.feature.dashboard.ui.AdminDashboardScreen(
                    onNavigateToCreateUser = {
                        currentScreen = Screen.AdminCreateUser
                    },
                    onLogout = {
                        currentScreen = Screen.Auth
                    }
                )
            }
            is Screen.AdminCreateUser -> {
                val adminViewModel: com.example.adhyayan.feature.dashboard.ui.AdminViewModel = hiltViewModel()
                com.example.adhyayan.feature.dashboard.ui.AdminCreateUserScreen(
                    viewModel = adminViewModel,
                    onNavigateBack = {
                        currentScreen = Screen.AdminDashboard
                    }
                )
            }
            is Screen.Dashboard -> {
                val dashboardViewModel: DashboardViewModel = hiltViewModel()
                DashboardScreen(
                    viewModel = dashboardViewModel,
                    onNavigateToAiTutor = {
                        currentScreen = Screen.AiTutor
                    },
                    onNavigateToCourse = { courseId ->
                        currentScreen = Screen.CourseViewer(courseId)
                    },
                    onNavigateToProfile = {
                        currentScreen = Screen.Analytics
                    }
                )
            }
            is Screen.AiTutor -> {
                val aiTutorViewModel: AiTutorViewModel = hiltViewModel()
                AiTutorScreen(viewModel = aiTutorViewModel)
            }
            is Screen.CourseViewer -> {
                val courseViewerViewModel: CourseViewerViewModel = hiltViewModel()
                CourseViewerScreen(
                    viewModel = courseViewerViewModel,
                    courseId = screen.courseId
                )
            }
            is Screen.Analytics -> {
                val analyticsViewModel: AnalyticsViewModel = hiltViewModel()
                AnalyticsScreen(viewModel = analyticsViewModel)
            }
        }
      }
    }
  }
}
