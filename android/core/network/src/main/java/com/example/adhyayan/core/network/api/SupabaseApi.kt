package com.example.adhyayan.core.network.api

import retrofit2.http.GET
import retrofit2.http.Header

data class SupabaseCourse(
    val id: String,
    val title: String,
    val description: String?
)

interface SupabaseApi {
    @GET("rest/v1/courses?select=*")
    suspend fun getCourses(
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String
    ): List<SupabaseCourse>
}
