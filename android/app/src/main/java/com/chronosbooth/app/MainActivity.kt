package com.chronosbooth.app

import android.Manifest
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chronosbooth.app.ui.theme.ChronosBoothTheme

class MainActivity : ComponentActivity() {
    private val viewModel: ChronosViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ChronosBoothTheme {
                ChronosBoothApp(viewModel)
            }
        }
    }
}

@Composable
private fun ChronosBoothApp(viewModel: ChronosViewModel) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackBarHost = remember { SnackbarHostState() }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            viewModel.openCamera()
        } else {
            viewModel.onError("Camera permission denied.")
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap: Bitmap? ->
        if (bitmap != null) {
            viewModel.setSourceImage(bitmap)
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        runCatching {
            context.contentResolver.openInputStream(uri).use { input ->
                BitmapFactory.decodeStream(input)
            }
        }.onSuccess { bmp ->
            if (bmp != null) {
                viewModel.setSourceImage(bmp)
            } else {
                viewModel.onError("Could not decode selected image.")
            }
        }.onFailure {
            viewModel.onError("Could not open selected image.")
        }
    }

    LaunchedEffect(uiState.pendingCameraOpen) {
        if (uiState.pendingCameraOpen) {
            cameraLauncher.launch(null)
            viewModel.consumeCameraOpen()
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackBarHost.showSnackbar(it)
            viewModel.consumeError()
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(hostState = snackBarHost) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Chronos Booth", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            Text("Capture or upload a portrait, select an era, then generate a transformed image.")

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Button(onClick = { cameraPermissionLauncher.launch(Manifest.permission.CAMERA) }, modifier = Modifier.weight(1f)) {
                    Text("Capture")
                }
                OutlinedButton(onClick = { galleryLauncher.launch("image/*") }, modifier = Modifier.weight(1f)) {
                    Text("Upload")
                }
            }

            uiState.sourceBitmap?.let { bitmap ->
                Card {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = "Source portrait",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(230.dp)
                    )
                }
            }

            Text("Choose era")
            Era.values().forEach { era ->
                OutlinedButton(
                    onClick = { viewModel.selectEra(era) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (uiState.selectedEra == era) "✓ ${era.label}" else era.label)
                }
            }

            Button(
                onClick = { viewModel.generateChronosImage() },
                enabled = !uiState.isGenerating && uiState.sourceBitmap != null && uiState.selectedEra != null,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (uiState.isGenerating) "Generating..." else "Analyze + Generate")
            }

            if (uiState.isGenerating) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(modifier = Modifier.size(32.dp))
                }
            }

            uiState.analysisText?.let {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("AI analysis", fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(it)
                    }
                }
            }

            uiState.generatedImageBase64?.let { encoded ->
                val bytes = Base64.decode(encoded, Base64.DEFAULT)
                val generatedBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                if (generatedBitmap != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface)
                    ) {
                        Image(
                            bitmap = generatedBitmap.asImageBitmap(),
                            contentDescription = "Generated image",
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(280.dp)
                        )
                    }
                }
            }

            uiState.generatedTextFallback?.let {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Generation response", fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(it)
                    }
                }
            }
        }
    }
}
