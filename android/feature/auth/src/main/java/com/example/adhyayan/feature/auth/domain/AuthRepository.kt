package com.example.adhyayan.feature.auth.domain

import com.example.adhyayan.core.auth.AuthManager
import com.example.adhyayan.feature.auth.data.AuthApi
import com.example.adhyayan.feature.auth.data.LoginRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val authManager: AuthManager
) {
    suspend fun login(email: String, passwordHash: String): Result<Unit> {
        return try {
            val response = authApi.login(LoginRequest(email, passwordHash))
            authManager.saveToken(response.token)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
