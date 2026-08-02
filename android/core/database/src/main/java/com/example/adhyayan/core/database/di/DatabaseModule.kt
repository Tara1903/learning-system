package com.example.adhyayan.core.database.di

import android.content.Context
import androidx.room.Room
import com.example.adhyayan.core.database.AdhyayanDatabase
import com.example.adhyayan.core.database.dao.CourseDao
import com.example.adhyayan.core.database.dao.StreakDao
import com.example.adhyayan.core.database.dao.TaskDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAdhyayanDatabase(
        @ApplicationContext context: Context
    ): AdhyayanDatabase {
        return Room.databaseBuilder(
            context,
            AdhyayanDatabase::class.java,
            "adhyayan_database"
        ).build()
    }

    @Provides
    fun provideCourseDao(database: AdhyayanDatabase): CourseDao = database.courseDao()

    @Provides
    fun provideTaskDao(database: AdhyayanDatabase): TaskDao = database.taskDao()

    @Provides
    fun provideStreakDao(database: AdhyayanDatabase): StreakDao = database.streakDao()
}
