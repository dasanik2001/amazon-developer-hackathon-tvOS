package com.multitv.guardian

import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

/**
 * React Native Bridge Module exposing Fire TV OS system overlay controls
 * and monitoring status to the JavaScript / TypeScript TV UI.
 */
class GuardianBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "GuardianBridgeModule"

    @ReactMethod
    fun startOverlay(childId: String, childName: String, backendUrl: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, GuardianOverlayService::class.java).apply {
                action = GuardianOverlayService.ACTION_START
                putExtra(GuardianOverlayService.EXTRA_CHILD_ID, childId)
                putExtra(GuardianOverlayService.EXTRA_CHILD_NAME, childName)
                putExtra(GuardianOverlayService.EXTRA_BACKEND_URL, backendUrl)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", "Failed to start Guardian Overlay: ${e.message}")
        }
    }

    @ReactMethod
    fun stopOverlay(promise: Promise) {
        try {
            val intent = Intent(reactContext, GuardianOverlayService::class.java).apply {
                action = GuardianOverlayService.ACTION_STOP
            }
            reactContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop Guardian Overlay: ${e.message}")
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        val map = WritableNativeMap()

        val canDrawOverlays = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(reactContext)
        } else {
            true
        }

        map.putBoolean("canDrawOverlays", canDrawOverlays)
        map.putBoolean("accessibilityConnected", GuardianAccessibilityService.instance != null)
        map.putString("currentForegroundPackage", GuardianAccessibilityService.currentForegroundPackage)
        promise.resolve(map)
    }
}
