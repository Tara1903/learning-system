package com.example.adhyayan.feature.auth.data

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.POST

@Serializable
data class LoginRequest(val email: String, val passwordHash: String)

@Serializable
data class LoginResponse(val token: String, val userId: String, val name: String)

interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse
}
