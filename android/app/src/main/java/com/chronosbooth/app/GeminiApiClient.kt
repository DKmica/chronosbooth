package com.chronosbooth.app

import android.graphics.Bitmap
import android.util.Base64
import java.io.ByteArrayOutputStream
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

data class ImageGenerationResult(
    val imageBase64: String?,
    val fallbackText: String?
)

class GeminiApiClient(private val apiKey: String) {
    private val client = OkHttpClient()
    private val jsonMediaType = "application/json".toMediaType()

    fun analyzePortrait(bitmap: Bitmap, era: Era): String {
        val response = callModel(
            model = "gemini-1.5-flash",
            prompt = """
                Analyze the portrait for visual details useful for image generation.
                Keep it concise in 4-6 bullet points.
                Include: pose, clothing clues, expression, lighting, background summary.
                Target style: ${era.label}.
            """.trimIndent(),
            bitmap = bitmap,
            responseModalities = null
        )
        return response.text ?: "No analysis returned."
    }

    fun generateImage(bitmap: Bitmap, era: Era, analysis: String): ImageGenerationResult {
        val prompt = """
            Transform the person in this portrait into a ${era.label} scene.
            Preserve identity and face likeness.
            Style guidance: ${era.stylePrompt}.
            Input analysis:
            $analysis
            Output a single polished image.
        """.trimIndent()

        val response = callModel(
            model = "gemini-2.0-flash-preview-image-generation",
            prompt = prompt,
            bitmap = bitmap,
            responseModalities = listOf("TEXT", "IMAGE")
        )
        return ImageGenerationResult(
            imageBase64 = response.inlineImageBase64,
            fallbackText = response.text
        )
    }

    private fun callModel(
        model: String,
        prompt: String,
        bitmap: Bitmap,
        responseModalities: List<String>?
    ): ModelResponse {
        val endpoint = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"

        val imageBytes = ByteArrayOutputStream().use { stream ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
            stream.toByteArray()
        }
        val encodedImage = Base64.encodeToString(imageBytes, Base64.NO_WRAP)

        val parts = JSONArray()
            .put(JSONObject().put("text", prompt))
            .put(
                JSONObject().put(
                    "inline_data",
                    JSONObject()
                        .put("mime_type", "image/jpeg")
                        .put("data", encodedImage)
                )
            )

        val requestJson = JSONObject()
            .put("contents", JSONArray().put(JSONObject().put("parts", parts)))

        if (responseModalities != null) {
            requestJson.put(
                "generationConfig",
                JSONObject().put("responseModalities", JSONArray(responseModalities))
            )
        }

        val request = Request.Builder()
            .url(endpoint)
            .post(requestJson.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            val payload = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IllegalStateException("Gemini API error ${response.code}: $payload")
            }
            return parseResponse(payload)
        }
    }

    private fun parseResponse(payload: String): ModelResponse {
        val root = JSONObject(payload)
        val candidates = root.optJSONArray("candidates") ?: JSONArray()
        if (candidates.length() == 0) return ModelResponse(null, null)

        val firstCandidate = candidates.optJSONObject(0) ?: return ModelResponse(null, null)
        val content = firstCandidate.optJSONObject("content") ?: return ModelResponse(null, null)
        val parts = content.optJSONArray("parts") ?: JSONArray()

        var text: String? = null
        var imageBase64: String? = null

        for (i in 0 until parts.length()) {
            val part = parts.optJSONObject(i) ?: continue
            if (text == null) {
                text = part.optString("text").takeIf { it.isNotBlank() }
            }
            if (imageBase64 == null && part.has("inlineData")) {
                imageBase64 = part.optJSONObject("inlineData")?.optString("data")
            }
            if (imageBase64 == null && part.has("inline_data")) {
                imageBase64 = part.optJSONObject("inline_data")?.optString("data")
            }
        }
        return ModelResponse(text = text, inlineImageBase64 = imageBase64)
    }
}

data class ModelResponse(
    val text: String?,
    val inlineImageBase64: String?
)
