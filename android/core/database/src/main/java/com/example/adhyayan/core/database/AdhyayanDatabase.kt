package com.example.adhyayan.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.adhyayan.core.database.dao.CourseDao
import com.example.adhyayan.core.database.dao.StreakDao
import com.example.adhyayan.core.database.dao.TaskDao
import com.example.adhyayan.core.database.model.CourseEntity
import com.example.adhyayan.core.database.model.StreakEntity
import com.example.adhyayan.core.database.model.TaskEntity

@Database(entities = [CourseEntity::class, TaskEntity::class, StreakEntity::class], version = 1, exportSchema = false)
abstract class AdhyayanDatabase : RoomDatabase() {
    abstract fun courseDao(): CourseDao
    abstract fun taskDao(): TaskDao
    abstract fun streakDao(): StreakDao
}
