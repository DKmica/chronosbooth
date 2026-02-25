package com.chronosbooth.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val ChronosColors = darkColorScheme()

@Composable
fun ChronosBoothTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ChronosColors,
        content = content
    )
}
