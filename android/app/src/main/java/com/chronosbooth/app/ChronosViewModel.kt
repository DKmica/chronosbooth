package com.chronosbooth.app

import android.graphics.Bitmap
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

data class Era(val name: String, val description: String)

val eras = listOf(
    Era("Ancient Egypt", "Golden sands and timeless Pharaohs."),
    Era("Viking Age", "Stormy seas and legendary warriors."),
    Era("Renaissance Italy", "Masters of art and the rebirth of culture."),
    Era("Cyberpunk Future", "Neon lights and high-tech rebellion."),
    Era("Wild West", "Gunslingers and the rugged frontier."),
    Era("Ancient Greece", "Birthplace of gods and philosophy."),
    Era("Imperial Japan", "Honor of the Samurai and cherry blossoms."),
    Era("Roaring Twenties", "Jazz, flappers, and clandestine glitz."),
    Era("Medieval Europe", "Chivalrous knights and stone fortresses."),
    Era("Space Age", "The final frontier and starlit voyages."),
    Era("Pirate Golden Age", "Black sails and buried treasure."),
    Era("Steampunk London", "Steam-powered machines and Victorian mystery."),
    Era("Ancient Rome", "Might of the legions and marble glory."),
    Era("Stone Age", "Primal fire and the dawn of humanity."),
    Era("French Revolution", "Liberty, equality, and the barricades."),
    Era("Incan Empire", "Mystical heights of the Andes peaks."),
    Era("1960s Psychedelia", "Counter-culture and kaleidoscopic visions."),
    Era("Industrial Revolution", "Iron, coal, and the birth of industry."),
    Era("Colonial America", "New worlds and the sparks of liberty."),
    Era("Aztec Civilization", "Sun temples and ritual excellence."),
    Era("Information Age", "The digital loom and global networks.")
)

sealed class AppState {
    object Landing : AppState()
    object Camera : AppState()
    object Analyzing : AppState()
    data class IdentityLocked(val signature: String, val bitmap: Bitmap) : AppState()
    object SelectingEra : AppState()
    object Manifesting : AppState()
    data class Result(val manifestation: String, val era: String) : AppState()
}

class ChronosViewModel : ViewModel() {
    var state by mutableStateOf<AppState>(AppState.Landing)
    var capturedBitmap by mutableStateOf<Bitmap?>(null)
    var temporalSignature by mutableStateOf("")

    private val apiKey = "AIzaSyB6PRze2bJV8T9MaPF_RJxj5qbKwdWNlxw"

    private val proModel = GenerativeModel("gemini-1.5-pro", apiKey)
    private val flashModel = GenerativeModel("gemini-1.5-flash", apiKey)

    fun startJourney() { state = AppState.Camera }

    fun onImageCaptured(bitmap: Bitmap) {
        capturedBitmap = bitmap
        state = AppState.Analyzing
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val response = proModel.generateContent(content {
                    image(bitmap)
                    text("Analyze this portrait for facial structure, expression, hair, and clothing. Create a detailed 'Temporal Signature' text.")
                })
                temporalSignature = response.text ?: ""
                state = AppState.IdentityLocked(temporalSignature, bitmap)
            } catch (e: Exception) {
                state = AppState.Camera
            }
        }
    }

    fun proceedToEras() { state = AppState.SelectingEra }

    fun selectEra(era: Era) {
        val bitmap = capturedBitmap ?: return
        state = AppState.Manifesting
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val prompt = "Based on this signature: $temporalSignature, manifest the person in the era: ${era.name}. " +
                        "Describe their historical transformation in detail."
                val response = flashModel.generateContent(content {
                    image(bitmap)
                    text(prompt)
                })
                state = AppState.Result(response.text ?: "", era.name)
            } catch (e: Exception) {
                state = AppState.SelectingEra
            }
        }
    }

    fun reset() {
        state = AppState.Landing
        capturedBitmap = null
        temporalSignature = ""
    }
}
