package com.example.adhyayan.core.designsystem.component

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import kotlinx.coroutines.delay

@Composable
fun AdhyayanTypewriterText(
    fullText: String,
    modifier: Modifier = Modifier,
    isUser: Boolean = false,
    delayPerChar: Long = 30L, // Fast typing effect
    onAnimationComplete: () -> Unit = {}
) {
    var displayedCharacterCount by remember { mutableIntStateOf(0) }

    LaunchedEffect(fullText) {
        // Reset if text changes
        displayedCharacterCount = 0
        while (displayedCharacterCount < fullText.length) {
            delay(delayPerChar)
            displayedCharacterCount++
        }
        onAnimationComplete()
    }

    val currentText = fullText.substring(0, displayedCharacterCount)
    
    AdhyayanChatBubble(
        text = currentText,
        isUser = isUser,
        modifier = modifier,
        isStreaming = displayedCharacterCount < fullText.length
    )
}
