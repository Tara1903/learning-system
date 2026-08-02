package com.example.adhyayan.feature.dashboard.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.adhyayan.core.database.dao.CourseDao
import com.example.adhyayan.core.database.dao.TaskDao
import com.example.adhyayan.core.database.model.CourseEntity
import com.example.adhyayan.core.database.model.TaskEntity
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

// Map Entities to UI Models
data class Course(val id: String, val title: String, val progress: Float)
data class Task(val id: String, val title: String, val dueDate: String)

sealed interface DashboardUiState {
    object Loading : DashboardUiState
    data class Success(val courses: List<Course>, val tasks: List<Task>) : DashboardUiState
    data class Error(val message: String) : DashboardUiState
}

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val courseDao: CourseDao,
    private val taskDao: TaskDao
) : ViewModel() {

    // Combine both Room flows into a single UI State Flow
    val uiState: StateFlow<DashboardUiState> = combine(
        courseDao.getCourses(),
        taskDao.getTasks()
    ) { courses, tasks ->
        DashboardUiState.Success(
            courses = courses.map { Course(it.id, it.title, it.progress) },
            tasks = tasks.map { Task(it.id, it.title, it.dueDate) }
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = DashboardUiState.Loading
    )

    init {
        // Simulate network sync inserting data into Room on first load
        viewModelScope.launch {
            courseDao.insertCourses(
                listOf(
                    CourseEntity("1", "Advanced Quantum Mechanics (Offline)", 0.65f),
                    CourseEntity("2", "Computational Neuroscience (Offline)", 0.32f),
                    CourseEntity("3", "Astrophysics 101 (Offline)", 0.89f)
                )
            )
            taskDao.insertTasks(
                listOf(
                    TaskEntity("1", "Submit Research Paper Draft", "Tomorrow, 11:59 PM"),
                    TaskEntity("2", "Read Chapter 4: Neural Networks", "Friday, 10:00 AM")
                )
            )
        }
    }
}
