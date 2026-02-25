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
    Era("Ancient Egypt", "Majestic pyramids and pharaoh robes."),
    Era("Viking Age", "Rugged fjords and thick furs."),
    Era("Renaissance Italy", "Lush balconies and velvet garments."),
    Era("Cyberpunk Future", "Rain-slicked streets and neon cybernetics."),
    Era("Wild West", "Dusty trails and quick-draw duels."),
    Era("Ancient Greece", "Marble temples and heroic myths."),
    Era("Imperial Japan", "Zen gardens and samurai honor."),
    Era("Roaring Twenties", "Jazz clubs and art deco glitz."),
    Era("Medieval Europe", "Stone castles and knightly chivalry."),
    Era("Space Age", "Lunar bases and retro-futurism."),
    Era("Pirate Golden Age", "Tropical islands and hidden gold."),
    Era("Steampunk London", "Brass gears and foggy streets."),
    Era("Ancient Rome", "Colosseum cheers and toga elegance."),
    Era("Stone Age", "Cave paintings and primal survival."),
    Era("French Revolution", "Barricades and the spirit of liberty."),
    Era("Incan Empire", "Sun temples in the high Andes."),
    Era("1960s Psychedelia", "Kaleidoscopic colors and peace."),
    Era("Industrial Revolution", "Steam whistles and iron works."),
    Era("Colonial America", "Quill pens and revolutionary fire."),
    Era("Aztec Civilization", "Great pyramids and ritual arts."),
    Era("Information Age", "Silicon circuits and the global web.")
)

sealed class AppState {
    object Landing : AppState()
    object Camera : AppState()
    object Analyzing : AppState()
    data class IdentityLocked(val signature: String) : AppState()
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
                    text("Analyze this portrait for facial structure, expression, hair, and clothing. Create a detailed 'Temporal Signature' describing the person's unique essence for time-travel reconstruction.")
                })
                temporalSignature = response.text ?: "Identity essence captured."
                state = AppState.IdentityLocked(temporalSignature)
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
                val prompt = "Based on this signature: $temporalSignature, manifest the person in the era: ${era.name} (${era.description}). " +
                        "Describe their historical transformation in vivid detail, preserving their core identity but adapting attire and surroundings."
                val response = flashModel.generateContent(content {
                    image(bitmap)
                    text(prompt)
                })
                state = AppState.Result(response.text ?: "Manifestation complete.", era.name)
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
