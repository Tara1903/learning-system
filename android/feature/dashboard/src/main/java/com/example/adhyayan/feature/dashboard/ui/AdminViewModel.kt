package com.example.adhyayan.feature.dashboard.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.adhyayan.feature.dashboard.data.CreateUserRequest
import com.example.adhyayan.feature.dashboard.domain.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AdminUiState {
    object Idle : AdminUiState
    object Loading : AdminUiState
    object Success : AdminUiState
    data class Error(val message: String) : AdminUiState
}

@HiltViewModel
class AdminViewModel @Inject constructor(
    private val adminRepository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<AdminUiState>(AdminUiState.Idle)
    val uiState: StateFlow<AdminUiState> = _uiState.asStateFlow()

    fun resetState() {
        _uiState.value = AdminUiState.Idle
    }

    fun createUser(role: String, request: CreateUserRequest) {
        viewModelScope.launch {
            _uiState.value = AdminUiState.Loading
            val result = if (role == "student") {
                adminRepository.createStudent(request)
            } else {
                adminRepository.createTeacher(request)
            }

            result.fold(
                onSuccess = {
                    _uiState.value = AdminUiState.Success
                },
                onFailure = {
                    _uiState.value = AdminUiState.Error(it.message ?: "An unknown error occurred")
                }
            )
        }
    }
}
