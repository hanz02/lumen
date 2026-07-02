package com.plantarapp

import android.database.sqlite.SQLiteDatabase
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

/**
 * Read-only access to the bundled plant database (assets/plant_db.sqlite,
 * built by tools/export_to_sqlite.py behind its integrity gate). The asset is
 * copied to filesDir on first use each process — at 200 KB that is cheaper
 * and simpler to defend than staleness bookkeeping, and guarantees a fresh
 * export always wins.
 */
class PlantDataModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val DB_ASSET = "plant_db.sqlite"
        private const val E_DB_UNAVAILABLE = "E_DB_UNAVAILABLE"

        // Subset of the 27 plant columns the TS Plant interface consumes.
        private val TEXT_COLS = listOf(
            "plant_id", "scientific_name_accepted", "common_name_main", "family",
            "shade_category", "aspect_orientation", "direct_sun_tolerance",
            "final_confidence", "value_status",
        )
        private val LUX_COLS = listOf(
            "maintenance_lux_min", "maintenance_lux_max",
            "preferred_lux_min", "preferred_lux_max",
        )
        // Scientific-reference enrichment (DLI / photoperiod / PPFD): loaded for
        // display only and NEVER scored — the engine compares measured spot lux,
        // not these. Surfaced in the recommendation card's "Light science" panel.
        private val REF_COLS = listOf(
            "dli_min", "dli_max",
            "photoperiod_min", "photoperiod_max",
            "maintenance_ppfd_min", "maintenance_ppfd_max",
            "preferred_ppfd_min", "preferred_ppfd_max",
        )
    }

    private var db: SQLiteDatabase? = null

    override fun getName(): String {
        return "PlantDataModule"
    }

    @Synchronized
    private fun ensureDb(): SQLiteDatabase {
        db?.let { if (it.isOpen) return it }
        val dbFile = File(reactContext.filesDir, DB_ASSET)
        reactContext.assets.open(DB_ASSET).use { input ->
            dbFile.outputStream().use { output -> input.copyTo(output) }
        }
        val opened = SQLiteDatabase.openDatabase(
            dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY
        )
        db = opened
        return opened
    }

    @ReactMethod
    fun getPlants(promise: Promise) {
        try {
            val database = ensureDb()
            val cols = TEXT_COLS + LUX_COLS + REF_COLS
            val plants = Arguments.createArray()
            database.rawQuery(
                "SELECT ${cols.joinToString(", ")} FROM plant ORDER BY plant_id", null
            ).use { cursor ->
                while (cursor.moveToNext()) {
                    val row = Arguments.createMap()
                    for (col in TEXT_COLS) {
                        val i = cursor.getColumnIndexOrThrow(col)
                        if (cursor.isNull(i)) row.putNull(col)
                        else row.putString(col, cursor.getString(i))
                    }
                    for (col in LUX_COLS + REF_COLS) {
                        val i = cursor.getColumnIndexOrThrow(col)
                        if (cursor.isNull(i)) row.putNull(col)
                        else row.putDouble(col, cursor.getDouble(i))
                    }
                    plants.pushMap(row)
                }
            }
            promise.resolve(plants)
        } catch (e: Exception) {
            promise.reject(E_DB_UNAVAILABLE, "Could not read plant database.", e)
        }
    }

    @ReactMethod
    fun getMeta(promise: Promise) {
        try {
            val database = ensureDb()
            val meta = Arguments.createMap()
            database.rawQuery("SELECT key, value FROM meta", null).use { cursor ->
                while (cursor.moveToNext()) {
                    meta.putString(cursor.getString(0), cursor.getString(1))
                }
            }
            promise.resolve(meta)
        } catch (e: Exception) {
            promise.reject(E_DB_UNAVAILABLE, "Could not read plant database meta.", e)
        }
    }

    override fun invalidate() {
        db?.close()
        db = null
        super.invalidate()
    }
}
