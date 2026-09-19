package com.multitv.guardian

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.Timer
import java.util.TimerTask

/**
 * Fire TV OS Foreground Service that displays a persistent floating Guardian HUD
 * over third-party apps (YouTube, Netflix, Prime Video) and samples media frames
 * and context every 2 minutes for ingestion into the backend RAG database.
 */
class GuardianOverlayService : Service() {

    companion object {
        private const val TAG = "GuardianOverlayService"
        private const val CHANNEL_ID = "guardian_overlay_channel"
        private const val NOTIFICATION_ID = 1001
        private const val SAMPLE_INTERVAL_MS = 2 * 60 * 1000L // Every 2 minutes (120 seconds)

        const val ACTION_START = "com.multitv.guardian.action.START"
        const val ACTION_STOP = "com.multitv.guardian.action.STOP"
        const val EXTRA_CHILD_ID = "child_id"
        const val EXTRA_CHILD_NAME = "child_name"
        const val EXTRA_BACKEND_URL = "backend_url"
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var sampleTimer: Timer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var childId: String = "child_aarav"
    private var childName: String = "Aarav"
    private var backendUrl: String = "http://10.0.2.2:3001/api" // Default Android emulator host

    private lateinit var mediaSessionTracker: MediaSessionTracker

    override fun onCreate() {
        super.onCreate()
        mediaSessionTracker = MediaSessionTracker(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        intent?.getStringExtra(EXTRA_CHILD_ID)?.let { childId = it }
        intent?.getStringExtra(EXTRA_CHILD_NAME)?.let { childName = it }
        intent?.getStringExtra(EXTRA_BACKEND_URL)?.let { backendUrl = it }

        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        createFloatingOverlay()
        startPeriodicIngestion()

        Log.i(TAG, "Guardian Overlay Service started for $childName (Child ID: $childId)")
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Family TV Guardian Active Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitors Fire TV media playback and provides viewing intelligence"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }

        return builder
            .setContentTitle("Family TV Guardian Active")
            .setContentText("Monitoring viewing context for $childName (Sampling every 2 min)")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .build()
    }

    /**
     * Creates a floating system overlay HUD (TYPE_APPLICATION_OVERLAY)
     * positioned in the top-right corner of the Fire TV screen.
     */
    private fun createFloatingOverlay() {
        if (overlayView != null) return

        try {
            windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

            val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
            }

            // Flag NOT_FOCUSABLE and NOT_TOUCH_MODAL allows Fire TV remote events
            // to pass straight through to YouTube / Prime / Netflix underneath!
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                x = 40
                y = 40
            }

            // Construct Overlay HUD View programmatically
            val container = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(24, 12, 28, 12)
                setBackgroundColor(Color.parseColor("#E60B0F19")) // Sleek semi-transparent dark pill
            }

            val icon = TextView(this).apply {
                text = "🛡️ "
                textSize = 14f
            }

            val label = TextView(this).apply {
                text = "Guardian • $childName (Active)"
                setTextColor(Color.parseColor("#FF9900")) // Fire TV Gold
                textSize = 13f
            }

            container.addView(icon)
            container.addView(label)

            overlayView = container
            windowManager?.addView(overlayView, params)
            Log.i(TAG, "Floating system overlay added to WindowManager")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create floating overlay (check SYSTEM_ALERT_WINDOW permission): ${e.message}")
        }
    }

    /**
     * Starts the periodic 2-minute sampling timer.
     */
    private fun startPeriodicIngestion() {
        sampleTimer?.cancel()
        sampleTimer = Timer()

        sampleTimer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                try {
                    sampleAndIngestFrameContext()
                } catch (e: Exception) {
                    Log.e(TAG, "Error in periodic sampling task: ${e.message}")
                }
            }
        }, 10000L, SAMPLE_INTERVAL_MS) // First sample at 10s, then every 2 minutes
    }

    /**
     * Samples the current Fire TV state: foreground package, window titles, media session,
     * and POSTs the context payload to /api/overlay/ingest-frame.
     */
    private fun sampleAndIngestFrameContext() {
        val currentPackage = GuardianAccessibilityService.currentForegroundPackage.ifEmpty {
            "com.google.android.youtube.tv" // Fallback to simulated app if running standalone
        }

        // Poll media session
        mediaSessionTracker.pollActiveMedia(currentPackage)

        val appName = when {
            currentPackage.contains("youtube") -> "YouTube"
            currentPackage.contains("amazonvideo") -> "Amazon Prime Video"
            currentPackage.contains("netflix") -> "Netflix"
            currentPackage.contains("disney") -> "Disney+"
            else -> "Streaming Player"
        }

        val mediaTitle = mediaSessionTracker.activeMediaTitle.ifEmpty {
            GuardianAccessibilityService.currentMediaTitle.ifEmpty {
                "Featured Viewing Stream"
            }
        }

        val textSnippets = GuardianAccessibilityService.currentTextSnippets

        Log.i(TAG, "[2-Min Sample Triggered] App: $appName ($currentPackage), Title: '$mediaTitle', Snippets: ${textSnippets.size}")

        // Dispatch HTTP POST to Family TV Guardian Backend
        dispatchIngestionPayload(appName, currentPackage, mediaTitle, textSnippets)
    }

    private fun dispatchIngestionPayload(
        appName: String,
        appPackage: String,
        mediaTitle: String,
        textSnippets: List<String>
    ) {
        Thread {
            try {
                val endpoint = URL("$backendUrl/overlay/ingest-frame")
                val conn = endpoint.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 5000
                conn.readTimeout = 5000

                val payload = JSONObject().apply {
                    put("child_id", childId)
                    put("app_name", appName)
                    put("app_package", appPackage)
                    put("media_title", mediaTitle)
                    put("text_snippets", JSONArray(textSnippets))
                    put("timestamp", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date()))
                    put("duration_increment_sec", 120) // 2 minutes
                }

                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }

                val responseCode = conn.responseCode
                Log.i(TAG, "Ingestion dispatched successfully. Backend HTTP response: $responseCode")
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Could not reach backend at $backendUrl: ${e.message}")
            }
        }.start()
    }

    override fun onDestroy() {
        super.onDestroy()
        sampleTimer?.cancel()
        sampleTimer = null

        if (overlayView != null && windowManager != null) {
            try {
                windowManager?.removeView(overlayView)
            } catch (e: Exception) {
                Log.w(TAG, "Error removing overlay view: ${e.message}")
            }
            overlayView = null
        }
        Log.i(TAG, "Guardian Overlay Service destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
