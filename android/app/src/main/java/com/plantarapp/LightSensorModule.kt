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
 * Streams raw ambient-light (TYPE_LIGHT) samples to JS while a capture is
 * running. TYPE_LIGHT is an ON-CHANGE sensor: it reports once on registration
 * and then only when the value changes, so silence between events means "value
 * held steady" — the JS plateau module (src/sensor/plateau.ts) is responsible
 * for hold-last-value resampling and the plateau-median reduction.
 */
class LightSensorModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        const val EVENT_NAME = "PlantAR_LightSample"
        private const val E_NO_LIGHT_SENSOR = "E_NO_LIGHT_SENSOR"
        private const val E_ALREADY_RUNNING = "E_ALREADY_RUNNING"
    }

    private val sensorManager: SensorManager by lazy {
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    }

    private var running = false

    override fun getName(): String {
        return "LightSensorModule"
    }

    @ReactMethod
    fun start(promise: Promise) {
        val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)

        if (sensor == null) {
            promise.reject(
                E_NO_LIGHT_SENSOR,
                "This device has no ambient light sensor."
            )
            return
        }

        if (running) {
            promise.reject(
                E_ALREADY_RUNNING,
                "A light capture is already running."
            )
            return
        }

        sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_FASTEST)
        running = true

        val info = Arguments.createMap().apply {
            putString("sensorName", sensor.name)
            putDouble("maxRangeLux", sensor.maximumRange.toDouble())
        }
        promise.resolve(info)
    }

    @ReactMethod
    fun stop() {
        if (!running) return
        sensorManager.unregisterListener(this)
        running = false
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_LIGHT) return
        if (!reactContext.hasActiveReactInstance()) return

        val sample = Arguments.createMap().apply {
            // ns since boot -> ms; JS keys plateau math off arrival time, this
            // native timestamp is carried along for evaluation logs
            putDouble("timestampMs", event.timestamp / 1_000_000.0)
            putDouble("lux", event.values[0].toDouble())
        }
        reactContext.emitDeviceEvent(EVENT_NAME, sample)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    override fun invalidate() {
        stop()
        super.invalidate()
    }
}
