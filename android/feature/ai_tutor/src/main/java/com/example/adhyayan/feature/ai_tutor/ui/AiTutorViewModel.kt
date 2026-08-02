package com.example.adhyayan.feature.ai_tutor.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.example.adhyayan.core.network.api.NvidiaApi

data class ChatMessage(
    val id: String,
    val text: String,
    val isUser: Boolean,
    val isStreaming: Boolean = false
)

@HiltViewModel
class AiTutorViewModel @Inject constructor(
    private val nvidiaApi: NvidiaApi
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()
    
    // The API key is injected directly for prototype simplicity
    private val nvidiaApiKey = "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"

    init {
        // Initial greeting
        _messages.value = listOf(
            ChatMessage(
                id = System.currentTimeMillis().toString(),
                text = "Hello Taras. I am your Adhyayan AI Tutor powered by Nvidia NIM. What concept shall we explore today?",
                isUser = false,
                isStreaming = true // Will trigger typewriter effect on UI
            )
        )
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return

        // Add user message
        val userMsg = ChatMessage(
            id = System.currentTimeMillis().toString(),
            text = text,
            isUser = true,
            isStreaming = false
        )
        
        _messages.value = _messages.value + userMsg

        // Add thinking placeholder
        val aiMsgId = (System.currentTimeMillis() + 1).toString()
        val thinkingMsg = ChatMessage(
            id = aiMsgId,
            text = "Thinking...",
            isUser = false,
            isStreaming = true
        )
        _messages.value = _messages.value + thinkingMsg

        // Call Nvidia API
        viewModelScope.launch {
            try {
                // Build message history
                val history = _messages.value
                    .filter { !it.isStreaming || it.id == aiMsgId }
                    .mapNotNull { 
                        if (it.id == aiMsgId) null 
                        else com.example.adhyayan.core.network.api.NvidiaMessage(
                            role = if (it.isUser) "user" else "assistant",
                            content = it.text
                        )
                    }
                
                val request = com.example.adhyayan.core.network.api.NvidiaChatRequest(
                    model = "google/gemma-2-9b-it",
                    messages = history
                )
                
                val response = nvidiaApi.chatCompletions("Bearer $nvidiaApiKey", request)
                val replyText = response.choices.firstOrNull()?.message?.content ?: "I'm sorry, I couldn't process that."
                
                // Update placeholder with actual response
                val updatedList = _messages.value.map {
                    if (it.id == aiMsgId) it.copy(text = replyText) else it
                }
                _messages.value = updatedList
                
            } catch (e: Exception) {
                val updatedList = _messages.value.map {
                    if (it.id == aiMsgId) it.copy(text = "Error: ${e.message}") else it
                }
                _messages.value = updatedList
            }
        }
    }

    fun onMessageStreamingComplete(messageId: String) {
        val updatedList = _messages.value.map {
            if (it.id == messageId) it.copy(isStreaming = false) else it
        }
        _messages.value = updatedList
    }
}
