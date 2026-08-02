package com.example.adhyayan.feature.course_viewer.ui

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class LessonState(
    val title: String,
    val videoUrl: String,
    val articleContent: String
)

@HiltViewModel
class CourseViewerViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow<LessonState?>(null)
    val uiState: StateFlow<LessonState?> = _uiState.asStateFlow()

    fun loadCourse(courseId: String) {
        // Mock loading a course lesson from database or network
        _uiState.value = LessonState(
            title = "Introduction to the Design System",
            videoUrl = "https://storage.googleapis.com/exoplayer-test-media-0/BigBuckBunny_320x180.mp4",
            articleContent = "Welcome to the Adhyayan platform.\n\nIn this lesson, we will explore why we abandoned Material Design in favor of a physics-driven architecture. \n\nNotice how the video player above does not use Google's standard UI, but instead relies on our custom bouncy clicks and glassmorphic overlays."
        )
    }
}
