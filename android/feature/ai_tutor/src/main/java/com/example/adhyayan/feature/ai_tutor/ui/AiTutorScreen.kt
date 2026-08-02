package com.example.adhyayan.feature.ai_tutor.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.adhyayan.core.designsystem.component.AdhyayanButton
import com.example.adhyayan.core.designsystem.component.AdhyayanChatBubble
import com.example.adhyayan.core.designsystem.component.AdhyayanTextField
import com.example.adhyayan.core.designsystem.component.AdhyayanTypewriterText
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme

@Composable
fun AiTutorScreen(viewModel: AiTutorViewModel) {
    val messages by viewModel.messages.collectAsStateWithLifecycle()
    var inputText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    // Auto-scroll to bottom when new messages arrive
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AdhyayanTheme.colors.background)
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AdhyayanTheme.colors.surfaceElevated.copy(alpha = 0.5f)) // Glass effect placeholder
                    .padding(vertical = 16.dp, horizontal = 24.dp)
            ) {
                BasicText(
                    text = "AI Tutor",
                    style = AdhyayanTheme.typography.titleMedium.copy(color = AdhyayanTheme.colors.textPrimary)
                )
            }

            // Chat History
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                reverseLayout = false
            ) {
                items(messages) { message ->
                    Box(modifier = Modifier.padding(vertical = 8.dp)) {
                        if (message.isStreaming) {
                            AdhyayanTypewriterText(
                                fullText = message.text,
                                isUser = message.isUser,
                                onAnimationComplete = {
                                    viewModel.onMessageStreamingComplete(message.id)
                                }
                            )
                        } else {
                            AdhyayanChatBubble(
                                text = message.text,
                                isUser = message.isUser
                            )
                        }
                    }
                }
            }

            // Input Area
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AdhyayanTheme.colors.surfaceElevated.copy(alpha = 0.8f))
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AdhyayanTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    placeholder = "Ask anything...",
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(12.dp))
                AdhyayanButton(
                    text = "Send",
                    onClick = {
                        viewModel.sendMessage(inputText)
                        inputText = ""
                    }
                )
            }
        }
    }
}
