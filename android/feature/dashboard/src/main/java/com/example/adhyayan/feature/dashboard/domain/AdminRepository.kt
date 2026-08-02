package com.example.adhyayan.feature.dashboard.domain

import com.example.adhyayan.feature.dashboard.data.AdminApi
import com.example.adhyayan.feature.dashboard.data.CreateUserRequest
import com.example.adhyayan.feature.dashboard.data.CreateUserResponse
import javax.inject.Inject

class AdminRepository @Inject constructor(
    private val adminApi: AdminApi
) {
    suspend fun createStudent(request: CreateUserRequest): Result<CreateUserResponse> {
        return try {
            val response = adminApi.createStudent(request)
            if (response.success) {
                Result.success(response)
            } else {
                Result.failure(Exception(response.message ?: "Failed to create student"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createTeacher(request: CreateUserRequest): Result<CreateUserResponse> {
        return try {
            val response = adminApi.createTeacher(request)
            if (response.success) {
                Result.success(response)
            } else {
                Result.failure(Exception(response.message ?: "Failed to create teacher"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
