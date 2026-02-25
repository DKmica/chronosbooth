package com.chronosbooth.app

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ChronosUiState(
    val sourceBitmap: Bitmap? = null,
    val selectedEra: Era? = null,
    val analysisText: String? = null,
    val generatedImageBase64: String? = null,
    val generatedTextFallback: String? = null,
    val isGenerating: Boolean = false,
    val errorMessage: String? = null,
    val pendingCameraOpen: Boolean = false
)

class ChronosViewModel : ViewModel() {
    private val apiClient = GeminiApiClient(BuildConfig.GEMINI_API_KEY)

    private val _uiState = MutableStateFlow(ChronosUiState())
    val uiState: StateFlow<ChronosUiState> = _uiState.asStateFlow()

    fun setSourceImage(bitmap: Bitmap) {
        _uiState.update {
            it.copy(
                sourceBitmap = bitmap,
                analysisText = null,
                generatedImageBase64 = null,
                generatedTextFallback = null
            )
        }
    }

    fun selectEra(era: Era) {
        _uiState.update { it.copy(selectedEra = era) }
    }

    fun openCamera() {
        _uiState.update { it.copy(pendingCameraOpen = true) }
    }

    fun consumeCameraOpen() {
        _uiState.update { it.copy(pendingCameraOpen = false) }
    }

    fun onError(message: String) {
        _uiState.update { it.copy(errorMessage = message) }
    }

    fun consumeError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun generateChronosImage() {
        val state = _uiState.value
        val bitmap = state.sourceBitmap ?: run {
            onError("Please capture or upload an image first.")
            return
        }
        val era = state.selectedEra ?: run {
            onError("Please choose an era.")
            return
        }
        if (BuildConfig.GEMINI_API_KEY.isBlank()) {
            onError("Missing API key. Set GEMINI_API_KEY in local.properties or environment.")
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isGenerating = true, errorMessage = null) }

            runCatching {
                withContext(Dispatchers.IO) {
                    val analysis = apiClient.analyzePortrait(bitmap, era)
                    val imageResult = apiClient.generateImage(bitmap, era, analysis)
                    analysis to imageResult
                }
            }.onSuccess { (analysis, result) ->
                _uiState.update {
                    it.copy(
                        isGenerating = false,
                        analysisText = analysis,
                        generatedImageBase64 = result.imageBase64,
                        generatedTextFallback = result.fallbackText,
                        errorMessage = if (result.imageBase64 == null && result.fallbackText == null) "No output returned by model." else null
                    )
                }
            }.onFailure { throwable ->
                _uiState.update {
                    it.copy(isGenerating = false, errorMessage = throwable.message ?: "Generation failed.")
                }
            }
        }
    }
}
