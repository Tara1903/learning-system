package com.example.adhyayan.core.network.api

import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

data class NvidiaChatRequest(
    val model: String = "google/gemma-2-9b-it",
    val messages: List<NvidiaMessage>,
    val max_tokens: Int = 1024,
    val temperature: Double = 0.5,
    val top_p: Double = 1.0,
    val stream: Boolean = false
)

data class NvidiaMessage(
    val role: String,
    val content: String
)

data class NvidiaChatResponse(
    val id: String,
    val choices: List<NvidiaChoice>
)

data class NvidiaChoice(
    val index: Int,
    val message: NvidiaMessage,
    val finish_reason: String?
)

interface NvidiaApi {
    @POST("v1/chat/completions")
    suspend fun chatCompletions(
        @Header("Authorization") authHeader: String,
        @Body request: NvidiaChatRequest
    ): NvidiaChatResponse
}
