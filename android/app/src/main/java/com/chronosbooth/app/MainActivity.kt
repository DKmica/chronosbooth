package com.chronosbooth.app

import android.Manifest
import android.graphics.Bitmap
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import kotlinx.coroutines.launch

val ChronosBlack = Color(0xFF0A0502)
val ChronosEmerald = Color(0xFF10B981)

val HISTORICAL_ERAS = listOf(
    Era("egypt", "Ancient Egypt", "Majestic pyramids and pharaoh robes.", "https://picsum.photos/seed/egypt/800/600"),
    Era("cyberpunk", "Neon Future", "Cybernetic enhancements and neon lights.", "https://picsum.photos/seed/cyberpunk/800/600"),
    Era("viking", "Viking Age", "Rugged fjords and thick furs.", "https://picsum.photos/seed/viking/800/600"),
    Era("renaissance", "Renaissance", "Lush balconies and velvet garments.", "https://picsum.photos/seed/renaissance/800/600")
)

class MainActivity : ComponentActivity() {
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted -> if (!isGranted) finish() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        setContent {
            MaterialTheme {
                ChronosBoothApp()
            }
        }
    }
}

@Composable
fun ChronosBoothApp() {
    val scope = rememberCoroutineScope()
    var appState by remember { mutableStateOf("landing") }
    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var manifestationResult by remember { mutableStateOf<String?>(null) }

    // Use gemini-1.5-flash for stable image processing
    val apiKey = "AIzaSyB8XZONysobdhZC3SFke6FH1TDO7r-uVPI"
    val model = remember { GenerativeModel("gemini-1.5-flash", apiKey) }

    Box(modifier = Modifier.fillMaxSize().background(ChronosBlack)) {
        when (appState) {
            "landing" -> LandingScreen { appState = "capture" }
            "capture" -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Button(onClick = { /* Placeholder capture logic */ appState = "era-select" }) {
                    Text("Capture Portrait")
                }
            }
            "era-select" -> EraSelectorScreen(HISTORICAL_ERAS) { era ->
                appState = "manifesting"
                scope.launch {
                    try {
                        val result = model.generateContent(content {
                            // Ensure image logic is handled if bitmap is provided
                            text("Transform into era: ${era.name}. ${era.description}")
                        }).text
                        manifestationResult = result
                        appState = "result"
                    } catch (e: Exception) {
                        manifestationResult = "TEMPORAL DISRUPTION: ${e.message}"
                        appState = "result"
                    }
                }
            }
            "manifesting" -> LoadingScreen("Weaving Reality...")
            "result" -> ResultScreen(manifestationResult) { appState = "landing" }
        }
    }
}

@Composable
fun LandingScreen(onStart: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("CHRONOS", style = MaterialTheme.typography.displayLarge, color = Color.White, fontWeight = FontWeight.Bold)
        Text("BOOTH", style = MaterialTheme.typography.displayMedium, color = ChronosEmerald)
        Spacer(Modifier.height(48.dp))
        Button(onClick = onStart, colors = ButtonDefaults.buttonColors(containerColor = ChronosEmerald)) {
            Text("BEGIN JOURNEY", color = Color.Black)
        }
    }
}

@Composable
fun EraSelectorScreen(eras: List<Era>, onSelected: (Era) -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Select Era", style = MaterialTheme.typography.headlineMedium, color = Color.White)
        Spacer(Modifier.height(16.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(eras) { era ->
                Card(modifier = Modifier.clickable { onSelected(era) }.aspectRatio(1f)) {
                    Box {
                        AsyncImage(model = era.image, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        Text(era.name, modifier = Modifier.align(Alignment.BottomStart).padding(8.dp), color = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
fun LoadingScreen(msg: String) {
    Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        CircularProgressIndicator(color = ChronosEmerald)
        Text(msg, color = Color.White, modifier = Modifier.padding(top = 16.dp))
    }
}

@Composable
fun ResultScreen(result: String?, onReset: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().padding(24.dp).verticalScroll(rememberScrollState())) {
        Text("Manifestation", color = ChronosEmerald, style = MaterialTheme.typography.headlineLarge)
        Text(result ?: "Error", color = Color.White)
        Button(onClick = onReset, modifier = Modifier.padding(top = 32.dp)) { Text("New Journey") }
    }
}
