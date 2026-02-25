package com.chronosbooth.app

import android.Manifest
import android.graphics.Bitmap
import android.os.Bundle
import android.view.HapticFeedbackConstants
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel

class ChronosActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ChronosApp()
        }
    }
}

@Composable
fun ChronosApp(viewModel: ChronosViewModel = viewModel()) {
    Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF0A0502)) {
        when (val state = viewModel.state) {
            is AppState.Landing -> LandingScreen { viewModel.startJourney() }
            is AppState.Camera -> CameraScreen { viewModel.onImageCaptured(it) }
            is AppState.Analyzing -> ProcessingScreen("LOCKING IDENTITY")
            is AppState.IdentityLocked -> IdentityLockedScreen(state.signature) { viewModel.proceedToEras() }
            is AppState.SelectingEra -> EraSelectionScreen { viewModel.selectEra(it) }
            is AppState.Manifesting -> ProcessingScreen("WEAVING REALITY")
            is AppState.Result -> ResultScreen(state.manifestation, state.era) { viewModel.reset() }
        }
    }
}

@Composable
fun LandingScreen(onBegin: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("CHRONOS", fontSize = 64.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Text("BOOTH", fontSize = 48.sp, fontWeight = FontWeight.Light, color = Color(0xFF10B981))
        Spacer(Modifier.height(48.dp))
        Text(
            "Temporal Imaging System V3.0",
            color = Color(0xFF10B981).copy(alpha = 0.7f),
            fontSize = 14.sp,
            letterSpacing = 2.sp
        )
        Spacer(Modifier.height(64.dp))
        Button(
            onClick = onBegin,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
            modifier = Modifier.fillMaxWidth().height(60.dp),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("BEGIN JOURNEY", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun CameraScreen(onCapture: (Bitmap) -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val previewView = remember { PreviewView(context) }
    val imageCapture = remember { ImageCapture.Builder().build() }
    var hasPermission by remember { mutableStateOf(false) }
    
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        hasPermission = it
    }
    
    LaunchedEffect(Unit) { launcher.launch(Manifest.permission.CAMERA) }

    if (hasPermission) {
        Box(Modifier.fillMaxSize()) {
            AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize()) { view ->
                val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
                cameraProviderFuture.addListener({
                    val provider = cameraProviderFuture.get()
                    val preview = Preview.Builder().build().also { it.setSurfaceProvider(view.surfaceProvider) }
                    try {
                        provider.unbindAll()
                        provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_FRONT_CAMERA, preview, imageCapture)
                    } catch (e: Exception) {}
                }, ContextCompat.getMainExecutor(context))
            }
            
            Box(
                Modifier.align(Alignment.BottomCenter).padding(bottom = 64.dp).size(80.dp)
                    .clip(CircleShape).border(4.dp, Color(0xFF10B981), CircleShape)
                    .clickable {
                        previewView.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
                        imageCapture.takePicture(ContextCompat.getMainExecutor(context), object : ImageCapture.OnImageCapturedCallback() {
                            override fun onCaptureSuccess(image: ImageProxy) {
                                onCapture(image.toBitmap())
                                image.close()
                            }
                            override fun onError(e: ImageCaptureException) {}
                        })
                    },
                contentAlignment = Alignment.Center
            ) {
                Box(Modifier.size(60.dp).clip(CircleShape).background(Color.White))
            }
        }
    }
}

@Composable
fun ProcessingScreen(label: String) {
    val infiniteTransition = rememberInfiniteTransition()
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(2000, easing = LinearEasing))
    )
    Column(Modifier.fillMaxSize(), Arrangement.Center, Alignment.CenterHorizontally) {
        Icon(Icons.Default.Refresh, null, Modifier.size(80.dp).rotate(rotation), tint = Color(0xFF10B981))
        Spacer(Modifier.height(24.dp))
        Text(label, color = Color.White, fontWeight = FontWeight.Bold, letterSpacing = 4.sp)
    }
}

@Composable
fun IdentityLockedScreen(signature: String, onProceed: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Text("TEMPORAL SIGNATURE", color = Color(0xFF10B981), fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
        Spacer(Modifier.height(16.dp))
        Box(Modifier.weight(1f).background(Color(0xFF1A1A1A)).padding(16.dp).verticalScroll(rememberScrollState())) {
            Text(signature, color = Color.White, fontSize = 16.sp, lineHeight = 24.sp)
        }
        Spacer(Modifier.height(24.dp))
        Button(onProceed, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)), modifier = Modifier.fillMaxWidth().height(60.dp), shape = RoundedCornerShape(8.dp)) {
            Text("PROCEED TO ERAS", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun EraSelectionScreen(onEraSelected: (Era) -> Unit) {
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("SELECT ERA", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
        Spacer(Modifier.height(16.dp))
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(eras) { era ->
                Card(
                    modifier = Modifier.height(140.dp).clickable { onEraSelected(era) },
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A))
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(era.name, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                        Spacer(Modifier.height(4.dp))
                        Text(era.description, fontSize = 12.sp, color = Color.Gray, lineHeight = 16.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun ResultScreen(manifestation: String, era: String, onReset: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp)) {
        Text("MANIFESTED: $era", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
        Spacer(Modifier.height(16.dp))
        Box(Modifier.weight(1f).background(Color(0xFF1A1A1A)).padding(16.dp).verticalScroll(rememberScrollState())) {
            Text(manifestation, color = Color.White, fontSize = 18.sp, lineHeight = 28.sp)
        }
        Spacer(Modifier.height(24.dp))
        Button(onReset, colors = ButtonDefaults.buttonColors(containerColor = Color.White), modifier = Modifier.fillMaxWidth().height(60.dp), shape = RoundedCornerShape(8.dp)) {
            Text("NEW JOURNEY", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}
