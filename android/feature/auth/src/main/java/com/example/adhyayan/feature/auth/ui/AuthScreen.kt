package com.example.adhyayan.feature.auth.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.adhyayan.core.designsystem.component.AdhyayanButton
import com.example.adhyayan.core.designsystem.component.AdhyayanCard
import com.example.adhyayan.core.designsystem.component.AdhyayanTextField
import com.example.adhyayan.core.designsystem.theme.AdhyayanTheme
import com.example.adhyayan.core.designsystem.theme.adhyayanGlow

@Composable
fun AuthScreen(
    viewModel: AuthViewModel,
    onLoginSuccess: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    if (uiState is AuthUiState.Success) {
        val role = (uiState as AuthUiState.Success).role
        onLoginSuccess(role)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AdhyayanTheme.colors.background)
    ) {
        // Decorative ambient glows for atmospheric background
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(top = 100.dp, start = 40.dp)
                .adhyayanGlow(color = AdhyayanTheme.colors.primary.copy(alpha = 0.2f), radius = 100.dp)
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Brand Logo / Header
            BasicText(
                text = "Adhyayan",
                style = AdhyayanTheme.typography.titleLarge.copy(color = AdhyayanTheme.colors.textPrimary)
            )
            Spacer(modifier = Modifier.height(8.dp))
            BasicText(
                text = "Welcome back. Access your learning universe.",
                style = AdhyayanTheme.typography.bodyMedium.copy(color = AdhyayanTheme.colors.textSecondary)
            )

            Spacer(modifier = Modifier.height(48.dp))

            AdhyayanCard(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    AdhyayanTextField(
                        value = email,
                        onValueChange = { email = it },
                        placeholder = "Email Address",
                        isError = uiState is AuthUiState.Error
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    AdhyayanTextField(
                        value = password,
                        onValueChange = { password = it },
                        placeholder = "Password",
                        visualTransformation = PasswordVisualTransformation(),
                        isError = uiState is AuthUiState.Error
                    )

                    AnimatedVisibility(
                        visible = uiState is AuthUiState.Error,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        BasicText(
                            text = (uiState as? AuthUiState.Error)?.message ?: "",
                            style = AdhyayanTheme.typography.labelMedium.copy(color = AdhyayanTheme.colors.primary), // Use primary or a dedicated error color later
                            modifier = Modifier.padding(top = 16.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(32.dp))

                    AdhyayanButton(
                        text = if (uiState is AuthUiState.Loading) "Authenticating..." else "Login",
                        onClick = { viewModel.login(email, password) },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}
