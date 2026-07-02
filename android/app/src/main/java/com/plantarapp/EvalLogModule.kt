package com.plantarapp

import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * Append-only CSV evaluation log (Ch 4 data capture: AR-vs-tape pairs,
 * phone-vs-UT383 lux pairs, recommendation snapshots). Lives in filesDir so
 * it survives app restarts; exported via the Android share sheet as a real
 * text/csv attachment (a content:// URI via FileProvider — see
 * res/xml/file_paths.xml + the <provider> in AndroidManifest.xml), so the
 * recipient gets an actual .csv file, not inline plain text in the message
 * body. Row construction/escaping happens in JS (src/eval/evalLog.ts) — this
 * module only owns bytes and the share intent.
 */
class EvalLogModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val FILE_NAME = "plantar_eval_log.csv"
        private const val E_LOG_IO = "E_LOG_IO"
        private const val E_NO_ACTIVITY = "E_NO_ACTIVITY"
        private const val E_LOG_EMPTY = "E_LOG_EMPTY"
    }

    private fun logFile(): File {
        return File(reactContext.filesDir, FILE_NAME)
    }

    override fun getName(): String {
        return "EvalLogModule"
    }

    /** Appends one pre-built CSV line (no trailing newline needed). */
    @ReactMethod
    fun append(line: String, promise: Promise) {
        try {
            logFile().appendText(line + "\n")
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(E_LOG_IO, "Could not append to the evaluation log.", e)
        }
    }

    @ReactMethod
    fun stat(promise: Promise) {
        try {
            val f = logFile()
            val result = Arguments.createMap()
            if (!f.exists()) {
                result.putBoolean("exists", false)
                result.putInt("bytes", 0)
                result.putInt("lines", 0)
            } else {
                val text = f.readText()
                result.putBoolean("exists", true)
                result.putInt("bytes", text.toByteArray().size)
                result.putInt("lines", text.lineSequence().count { it.isNotBlank() })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject(E_LOG_IO, "Could not stat the evaluation log.", e)
        }
    }

    @ReactMethod
    fun readAll(promise: Promise) {
        try {
            val f = logFile()
            promise.resolve(if (f.exists()) f.readText() else "")
        } catch (e: Exception) {
            promise.reject(E_LOG_IO, "Could not read the evaluation log.", e)
        }
    }

    /** Opens the share sheet with the whole CSV as a real text/csv ATTACHMENT
     *  (a content:// URI via FileProvider), so it opens correctly in Sheets /
     *  Excel and lands in email as a proper .csv file, not raw inline text. */
    @ReactMethod
    fun share(promise: Promise) {
        try {
            val f = logFile()
            if (!f.exists() || f.length() == 0L) {
                promise.reject(E_LOG_EMPTY, "The evaluation log is empty.")
                return
            }
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject(E_NO_ACTIVITY, "No foreground activity to share from.")
                return
            }
            val uri = FileProvider.getUriForFile(
                reactContext,
                "${reactContext.packageName}.fileprovider",
                f
            )
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "text/csv"
                putExtra(Intent.EXTRA_SUBJECT, FILE_NAME)
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(Intent.createChooser(send, "Export evaluation log"))
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(E_LOG_IO, "Could not share the evaluation log.", e)
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        try {
            logFile().delete()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject(E_LOG_IO, "Could not clear the evaluation log.", e)
        }
    }
}
