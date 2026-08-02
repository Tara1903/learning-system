package com.example.adhyayan.core.database.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "streaks")
data class StreakEntity(
    @PrimaryKey val userId: String,
    val currentStreak: Int,
    val longestStreak: Int,
    val lastLoginDate: Long
)
