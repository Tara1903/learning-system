package com.example.adhyayan.core.network.api

import retrofit2.http.GET
import retrofit2.http.Header

data class SupabasePracticeSet(
    val id: String,
    val subject: String,
    val completionRate: Float?,
    val accuracyPercentage: Float?
)

interface SupabaseApi {
    @GET("rest/v1/practice_sets?select=*")
    suspend fun getPracticeSets(
        @Header("apikey") apiKey: String,
        @Header("Authorization") authHeader: String
    ): List<SupabasePracticeSet>
}
