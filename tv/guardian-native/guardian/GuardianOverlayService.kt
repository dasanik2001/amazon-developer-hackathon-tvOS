package com.anonymous.MultiTVSample.guardian

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
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
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
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
import java.util.concurrent.TimeUnit

/**
 * Fire TV OS Foreground Service that displays a persistent floating Guardian HUD
 * over third-party apps (YouTube, Netflix, Prime Video) and samples media frames
 * and context every 2 minutes for ingestion into the backend RAG database.
 *
 * Listens in realtime via WebSocket to the Parent Dashboard for remote toggle of
 * parental control monitoring!
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

        var instance: GuardianOverlayService? = null
        var isMonitoringActive: Boolean = true
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var iconView: TextView? = null
    private var labelView: TextView? = null
    private var sampleTimer: Timer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var childId: String = "child_aarav"
    private var childName: String = "Aarav"
    private var backendUrl: String = "http://10.0.2.2:3001/api" // Default Android emulator host
    private var currentAppName: String = ""
    private var currentAppPackage: String = ""
    private var appPollerRunnable: Runnable? = null

    private var webSocket: WebSocket? = null
    private val okHttpClient = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private lateinit var mediaSessionTracker: MediaSessionTracker

    override fun onCreate() {
        super.onCreate()
        instance = this
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, buildForegroundNotification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIFICATION_ID, buildForegroundNotification())
        }
        createFloatingOverlay()
        startForegroundAppPoller()
        startPeriodicIngestion()
        connectRealtimeWebSocket()
        fetchInitialMonitoringState()

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
                text = if (isMonitoringActive) "🛡️ " else "⏸️ "
                textSize = 14f
            }
            iconView = icon

            val label = TextView(this).apply {
                textSize = 13f
            }
            labelView = label

            container.addView(icon)
            container.addView(label)

            overlayView = container
            windowManager?.addView(overlayView, params)
            updateOverlayDisplay()
            Log.i(TAG, "Floating system overlay added to WindowManager")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create floating overlay (check SYSTEM_ALERT_WINDOW permission): ${e.message}")
        }
    }

    /**
     * Updates the overlay UI on the main thread, respecting active app name and monitoring state.
     */
    fun updateOverlayDisplay() {
        mainHandler.post {
            if (!isMonitoringActive) {
                iconView?.text = "⏸️ "
                labelView?.setTextColor(Color.parseColor("#94A3B8"))
                labelView?.text = "Guardian • $childName (Paused)"
            } else {
                iconView?.text = "🛡️ "
                labelView?.setTextColor(Color.parseColor("#FF9900"))
                val displayApp = when {
                    currentAppName.isNotBlank() && currentAppName != "TV Home" && currentAppName != "Streaming App" -> currentAppName
                    currentAppName == "TV Home" -> "TV Home"
                    else -> "Active"
                }
                labelView?.text = "Guardian • $childName ($displayApp)"
            }
        }
    }

    /**
     * Updates the floating HUD pill with the active application name.
     */
    fun updateOverlayStatus(appName: String, appPackage: String = "") {
        currentAppName = appName
        if (appPackage.isNotEmpty()) currentAppPackage = appPackage
        updateOverlayDisplay()
    }

    /**
     * Dynamically sets whether monitoring and metadata streaming is active,
     * triggered remotely from the Parent Web Dashboard!
     */
    fun setMonitoringEnabled(enabled: Boolean) {
        isMonitoringActive = enabled
        Log.i(TAG, "[Parent Control Trigger] Monitoring state remotely set to: ${if (enabled) "ENABLED" else "PAUSED"}")
        updateOverlayDisplay()
    }

    /**
     * Connects to backend WebSocket stream (/ws) to listen for remote Parent Dashboard commands.
     */
    private fun connectRealtimeWebSocket() {
        Thread {
            try {
                val wsUrl = backendUrl
                    .replace("http://", "ws://")
                    .replace("https://", "wss://")
                    .replace("/api", "/ws")

                Log.i(TAG, "Connecting to realtime backend WebSocket at $wsUrl")
                val request = Request.Builder().url(wsUrl).build()

                webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        Log.i(TAG, "⚡ Realtime WebSocket connected to Family TV Guardian Server")
                    }

                    override fun onMessage(webSocket: WebSocket, text: String) {
                        try {
                            val json = JSONObject(text)
                            val type = json.optString("type")
                            Log.d(TAG, "WebSocket event received: $type")

                            if (type == "monitoring:state") {
                                val data = json.optJSONObject("data")
                                val enabled = data?.optBoolean("enabled", true) ?: true
                                setMonitoringEnabled(enabled)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Failed to parse incoming WebSocket message: ${e.message}")
                        }
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        Log.w(TAG, "WebSocket failure: ${t.message}. Reconnecting in 5s...")
                        mainHandler.postDelayed({ connectRealtimeWebSocket() }, 5000L)
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        Log.i(TAG, "WebSocket closed: $reason. Reconnecting in 5s...")
                        mainHandler.postDelayed({ connectRealtimeWebSocket() }, 5000L)
                    }
                })
            } catch (e: Exception) {
                Log.w(TAG, "Error initiating WebSocket connection: ${e.message}")
            }
        }.start()
    }

    /**
     * Fetches current monitoring state on launch from /api/overlay/control
     */
    private fun fetchInitialMonitoringState() {
        Thread {
            try {
                val url = URL("$backendUrl/overlay/control")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                if (conn.responseCode == 200) {
                    val body = conn.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(body)
                    val enabled = json.optBoolean("enabled", true)
                    setMonitoringEnabled(enabled)
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Could not fetch initial monitoring state: ${e.message}")
            }
        }.start()
    }

    /**
     * Called when user opens or switches into a new streaming or media application.
     */
    fun onForegroundAppChanged(appName: String, pkg: String) {
        if (!isMonitoringActive) {
            Log.d(TAG, "Parental control monitoring is paused. Skipping app switch notification.")
            return
        }

        Log.i(TAG, "Foreground app switched to $appName ($pkg). Scheduling prompt sample in 8s...")

        // Dispatch instant app switch event to server so Web Dashboard updates with zero latency
        Thread {
            try {
                val endpoint = URL("$backendUrl/overlay/app-change")
                val conn = endpoint.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                val payload = JSONObject().apply {
                    put("child_id", childId)
                    put("app_name", appName)
                    put("app_package", pkg)
                }
                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(payload.toString())
                    writer.flush()
                }
                val resp = conn.responseCode
                Log.d(TAG, "Notified backend of app switch to $appName: $resp")
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Could not send app-change to backend: ${e.message}")
            }
        }.start()

        // Schedule an early sample for the newly launched app so we don't have to wait full 2 mins
        mainHandler.postDelayed({
            Thread {
                try {
                    sampleAndIngestFrameContext()
                } catch (e: Exception) {
                    Log.e(TAG, "Error in app switch sample: ${e.message}")
                }
            }.start()
        }, 8000L)
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
     * Starts a periodic poller (every 2s) to actively detect foreground apps
     * even if accessibility events are throttled or delayed.
     */
    private fun startForegroundAppPoller() {
        val runnable = object : Runnable {
            override fun run() {
                try {
                    val detected = detectForegroundApp()
                    if (detected != null) {
                        val (appName, pkg) = detected
                        if (pkg != currentAppPackage) {
                            Log.i(TAG, "Foreground poller detected app switch: $appName ($pkg)")
                            currentAppPackage = pkg
                            currentAppName = appName
                            GuardianAccessibilityService.currentForegroundPackage = pkg
                            GuardianAccessibilityService.currentAppName = appName
                            updateOverlayDisplay()
                            if (pkg != "com.google.android.tvlauncher") {
                                onForegroundAppChanged(appName, pkg)
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Foreground poller error: ${e.message}")
                }
                mainHandler.postDelayed(this, 2000L)
            }
        }
        appPollerRunnable = runnable
        mainHandler.post(runnable)
    }

    private fun detectForegroundApp(): Pair<String, String>? {
        // 1. Check GuardianAccessibilityService active window
        GuardianAccessibilityService.instance?.queryActiveWindowPackage()?.let { pkg ->
            return Pair(resolveAppName(pkg), pkg)
        }

        // 2. Check GuardianAccessibilityService cached package
        val accPkg = GuardianAccessibilityService.currentForegroundPackage
        if (accPkg.isNotEmpty() && accPkg != packageName && accPkg != "android" && accPkg != "com.android.systemui") {
            return Pair(resolveAppName(accPkg), accPkg)
        }

        // 3. Check UsageStatsManager
        try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            if (usm != null) {
                val time = System.currentTimeMillis()
                val events = usm.queryEvents(time - 1000 * 30, time)
                val event = UsageEvents.Event()
                var lastPkg: String? = null
                while (events.hasNextEvent()) {
                    events.getNextEvent(event)
                    if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                        val p = event.packageName
                        if (p != null && p != packageName && p != "android" && p != "com.android.systemui") {
                            lastPkg = p
                        }
                    }
                }
                if (lastPkg != null) {
                    return Pair(resolveAppName(lastPkg), lastPkg)
                }
            }
        } catch (e: Exception) {
            // ignore
        }

        // 4. Check ActivityManager
        try {
            val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            val procs = am?.runningAppProcesses
            if (procs != null) {
                for (p in procs) {
                    if (p.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                        p.processName != packageName &&
                        p.processName != "android" &&
                        p.processName != "com.android.systemui") {
                        return Pair(resolveAppName(p.processName), p.processName)
                    }
                }
            }
        } catch (e: Exception) {
            // ignore
        }

        return null
    }

    fun resolveAppName(pkg: String): String {
        return when {
            pkg.contains("smarttube") -> "SmartTube"
            pkg.contains("youtube") -> "YouTube"
            pkg.contains("amazonvideo") || pkg.contains("avod") -> "Prime Video"
            pkg.contains("netflix") -> "Netflix"
            pkg.contains("disney") || pkg.contains("hotstar") -> "Disney+ Hotstar"
            pkg.contains("twitch") -> "Twitch"
            pkg.contains("hulu") -> "Hulu"
            pkg.contains("apple") && pkg.contains("tv") -> "Apple TV"
            pkg.contains("crunchyroll") -> "Crunchyroll"
            pkg.contains("tubi") -> "Tubi"
            pkg.contains("pluto") -> "Pluto TV"
            pkg.contains("plex") -> "Plex"
            pkg.contains("tvlauncher") -> "TV Home"
            else -> {
                try {
                    val pm = packageManager
                    val info = pm.getApplicationInfo(pkg, 0)
                    pm.getApplicationLabel(info).toString()
                } catch (e: Exception) {
                    "Streaming App"
                }
            }
        }
    }

    /**
     * Samples the current Fire TV state: foreground package, window titles, media session,
     * and POSTs the context payload to /api/overlay/ingest-frame.
     */
    private fun sampleAndIngestFrameContext() {
        if (!isMonitoringActive) {
            Log.d(TAG, "Parental control monitoring is paused by parent. Skipping frame context sampling.")
            return
        }

        // Dynamically scrape latest screen text from active window
        GuardianAccessibilityService.instance?.refreshScreenContext()

        val currentPackage = currentAppPackage.ifEmpty {
            GuardianAccessibilityService.currentForegroundPackage
        }
        if (currentPackage.isEmpty() || currentPackage == "com.google.android.tvlauncher") {
            Log.d(TAG, "No active streaming application in foreground. Skipping sample.")
            return
        }

        // Poll media session
        mediaSessionTracker.pollActiveMedia(currentPackage)

        val appName = currentAppName.ifEmpty {
            GuardianAccessibilityService.currentAppName.ifEmpty {
                resolveAppName(currentPackage)
            }
        }

        // Determine best genuine media title:
        val candidateTitle = when {
            GuardianAccessibilityService.isValidTitle(mediaSessionTracker.activeMediaTitle) -> mediaSessionTracker.activeMediaTitle
            GuardianAccessibilityService.isValidTitle(GuardianAccessibilityService.currentMediaTitle) -> GuardianAccessibilityService.currentMediaTitle
            GuardianAccessibilityService.isValidTitle(mediaSessionTracker.activeMediaSubtitle) -> mediaSessionTracker.activeMediaSubtitle
            GuardianAccessibilityService.isValidTitle(GuardianNotificationListenerService.lastMediaTitle) -> GuardianNotificationListenerService.lastMediaTitle
            else -> null
        }

        val mediaTitle = candidateTitle ?: GuardianAccessibilityService.currentTextSnippets.firstOrNull { snippet ->
            GuardianAccessibilityService.isValidTitle(snippet)
        } ?: "$appName Stream"

        val mediaArtist = when {
            mediaSessionTracker.activeMediaArtist.isNotEmpty() -> mediaSessionTracker.activeMediaArtist
            GuardianAccessibilityService.currentMediaSubtitle.isNotEmpty() -> GuardianAccessibilityService.currentMediaSubtitle
            GuardianNotificationListenerService.lastMediaArtist.isNotEmpty() -> GuardianNotificationListenerService.lastMediaArtist
            else -> "$appName Featured"
        }

        val synopsis = GuardianAccessibilityService.currentMediaSynopsis.ifEmpty {
            mediaSessionTracker.activeMediaSynopsis.ifEmpty {
                GuardianNotificationListenerService.lastMediaSynopsis
            }
        }

        // Filter out any text snippets originating from Guardian's own overlay
        val textSnippets = GuardianAccessibilityService.currentTextSnippets
            .filter { snippet ->
                !snippet.startsWith("🛡️") &&
                !snippet.startsWith("Guardian", ignoreCase = true) &&
                !snippet.contains("Guardian •")
            }
            .toMutableList()

        if (synopsis.isNotEmpty() && !textSnippets.contains(synopsis)) {
            textSnippets.add(0, synopsis)
        }

        Log.i(TAG, "[Sample Ingestion] App: $appName ($currentPackage), Title: '$mediaTitle', Artist: '$mediaArtist', Snippets: ${textSnippets.size}")

        // Dispatch HTTP POST to Family TV Guardian Backend
        dispatchIngestionPayload(appName, currentPackage, mediaTitle, mediaArtist, synopsis, textSnippets)
    }

    private fun dispatchIngestionPayload(
        appName: String,
        appPackage: String,
        mediaTitle: String,
        mediaArtist: String,
        synopsis: String,
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
                    put("media_artist", mediaArtist)
                    put("synopsis", synopsis)
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
        instance = null
        appPollerRunnable?.let { mainHandler.removeCallbacks(it) }
        appPollerRunnable = null
        sampleTimer?.cancel()
        sampleTimer = null

        try {
            webSocket?.close(1000, "Service destroyed")
        } catch (e: Exception) {
            // ignore
        }
        webSocket = null

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
