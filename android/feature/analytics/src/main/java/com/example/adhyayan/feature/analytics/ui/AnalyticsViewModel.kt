package com.example.adhyayan.feature.analytics.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.adhyayan.core.database.dao.StreakDao
import com.example.adhyayan.core.database.model.StreakEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AnalyticsUiState(
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val weeklyProgress: List<Float> = listOf(0.2f, 0.5f, 0.8f, 1.0f, 0.6f, 0.9f, 0.3f) // Mock data for bar chart
)

@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val streakDao: StreakDao
) : ViewModel() {

    val uiState: StateFlow<AnalyticsUiState> = streakDao.getStreak("user_taras")
        .map { streakEntity ->
            if (streakEntity != null) {
                AnalyticsUiState(
                    currentStreak = streakEntity.currentStreak,
                    longestStreak = streakEntity.longestStreak
                )
            } else {
                AnalyticsUiState() // Default mock state
            }
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = AnalyticsUiState()
        )

    init {
        // Initialize mock streak for demo purposes
        viewModelScope.launch {
            streakDao.updateStreak(
                StreakEntity(
                    userId = "user_taras",
                    currentStreak = 12,
                    longestStreak = 24,
                    lastLoginDate = System.currentTimeMillis()
                )
            )
        }
    }
}
