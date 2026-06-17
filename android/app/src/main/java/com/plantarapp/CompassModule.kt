package com.plantarapp

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Streams MAGNETIC-north azimuth samples (rotation-vector sensor) to JS for
 * the window-aspect capture. Capture protocol: phone held flat (screen up)
 * with its TOP EDGE pointing out through the window; the emitted azimuth is
 * the device Y-axis heading. True-north correction (magnetic declination) is
 * applied on the JS side using the declination from LocationModule — the
 * compass itself never claims true north.
 */
class CompassModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        const val EVENT_NAME = "PlantAR_CompassSample"
        private const val E_NO_COMPASS = "E_NO_COMPASS"
        private const val E_ALREADY_RUNNING = "E_ALREADY_RUNNING"
    }

    private val sensorManager: SensorManager by lazy {
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    private var running = false
    private var accuracy = SensorManager.SENSOR_STATUS_ACCURACY_LOW
    private val rotationMatrix = FloatArray(9)
    private val orientation = FloatArray(3)

    override fun getName(): String {
        return "CompassModule"
    }

    @ReactMethod
    fun start(promise: Promise) {
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)

        if (sensor == null) {
            promise.reject(E_NO_COMPASS, "This device has no rotation-vector sensor.")
            return
        }

        if (running) {
            promise.reject(E_ALREADY_RUNNING, "Compass capture already running.")
            return
        }

        sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI)
        running = true
        promise.resolve(null)
    }

    @ReactMethod
    fun stop() {
        if (!running) return
        sensorManager.unregisterListener(this)
        running = false
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ROTATION_VECTOR) return
        if (!reactContext.hasActiveReactInstance()) return

        SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
        SensorManager.getOrientation(rotationMatrix, orientation)
        val azimuthDeg =
            (Math.toDegrees(orientation[0].toDouble()) + 360.0) % 360.0

        val sample = Arguments.createMap().apply {
            putDouble("magneticAzimuthDeg", azimuthDeg)
            putString("accuracy", accuracyLabel(accuracy))
        }
        reactContext.emitDeviceEvent(EVENT_NAME, sample)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        this.accuracy = accuracy
    }

    private fun accuracyLabel(a: Int): String = when (a) {
        SensorManager.SENSOR_STATUS_ACCURACY_HIGH -> "high"
        SensorManager.SENSOR_STATUS_ACCURACY_MEDIUM -> "medium"
        SensorManager.SENSOR_STATUS_ACCURACY_LOW -> "low"
        else -> "unreliable"
    }

    override fun invalidate() {
        stop()
        super.invalidate()
    }
}
