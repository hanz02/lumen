package com.plantarapp

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ARModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val AR_MEASUREMENT_REQUEST = 9001
        private const val E_ACTIVITY_DOES_NOT_EXIST = "E_ACTIVITY_DOES_NOT_EXIST"
        private const val E_AR_ALREADY_RUNNING = "E_AR_ALREADY_RUNNING"
        private const val E_AR_CANCELLED = "E_AR_CANCELLED"
        private const val E_AR_FAILED = "E_AR_FAILED"
    }

    private var measurementPromise: Promise? = null

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            intent: Intent?
        ) {
            if (requestCode != AR_MEASUREMENT_REQUEST) return

            val promise = measurementPromise
            measurementPromise = null

            if (promise == null) return

            if (resultCode == Activity.RESULT_OK && intent != null) {
                val distanceMeters = intent.getFloatExtra("distance_meters", -1f)
                val distanceCm = intent.getFloatExtra("distance_cm", -1f)
                val measurementTool = intent.getStringExtra("measurement_tool") ?: "UNKNOWN"
                val overallQuality = intent.getStringExtra("overall_quality") ?: "UNKNOWN"
                val firstPointQuality = intent.getStringExtra("first_point_quality") ?: "UNKNOWN"
                val secondPointQuality = intent.getStringExtra("second_point_quality") ?: "UNKNOWN"

                if (distanceMeters >= 0f && distanceCm >= 0f) {
                    val result = Arguments.createMap().apply {
                        putDouble("distanceMeters", distanceMeters.toDouble())
                        putDouble("distanceCm", distanceCm.toDouble())
                        putString("measurementTool", measurementTool)
                        putString("overallQuality", overallQuality)
                        putString("firstPointQuality", firstPointQuality)
                        putString("secondPointQuality", secondPointQuality)
                    }

                    promise.resolve(result)
                } else {
                    promise.reject(
                        E_AR_FAILED,
                        "AR Activity returned invalid measurement."
                    )
                }
            } else {
                promise.reject(
                    E_AR_CANCELLED,
                    "AR measurement was cancelled."
                )
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String {
        return "ARModule"
    }

    @ReactMethod
    fun startARMeasurement(promise: Promise) {
        val activity = getCurrentActivity()

        if (activity == null) {
            promise.reject(
                E_ACTIVITY_DOES_NOT_EXIST,
                "Current Android activity is null."
            )
            return
        }

        if (measurementPromise != null) {
            promise.reject(
                E_AR_ALREADY_RUNNING,
                "Another AR measurement is already running."
            )
            return
        }

        measurementPromise = promise

        try {
            val intent = Intent(activity, ARMeasurementActivity::class.java)
            activity.startActivityForResult(intent, AR_MEASUREMENT_REQUEST)
        } catch (e: Exception) {
            measurementPromise = null
            promise.reject(E_AR_FAILED, e)
        }
    }
}