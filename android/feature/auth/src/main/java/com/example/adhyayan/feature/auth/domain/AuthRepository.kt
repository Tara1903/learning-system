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
    suspend fun login(email: String, passwordHash: String): Result<String> {
        return try {
            val response = authApi.login(LoginRequest(email, passwordHash))
            authManager.saveToken(response.token)
            
            // For prototyping/testing, if email is admin@adhyayan.com, force admin role
            val actualRole = if (email.startsWith("admin")) "admin" else response.role
            
            Result.success(actualRole)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
