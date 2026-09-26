package com.anonymous.MultiTVSample.guardian

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSession
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

/**
 * Listens for OS playback notifications and active MediaSessions from streaming apps
 * (Prime Video, Netflix, YouTube, Disney+, etc.) and extracts active media titles,
 * episode names, artists, and synopsis metadata.
 *
 * Includes automatic Amazon GTI (Global Title Identifier) resolution to fetch
 * genuine series/movie titles and synopses directly for Prime Video.
 */
class GuardianNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "GuardianNotifListener"
        var instance: GuardianNotificationListenerService? = null

        @Volatile
        var lastMediaTitle: String = ""
        @Volatile
        var lastMediaSubtitle: String = ""
        @Volatile
        var lastMediaArtist: String = ""
        @Volatile
        var lastMediaPackage: String = ""
        @Volatile
        var lastMediaSynopsis: String = ""
        @Volatile
        var isPlaying: Boolean = false

        private val gtiCache = ConcurrentHashMap<String, Pair<String, String>>()

        private val GENERIC_TITLES = setOf(
            "prime video", "primevideo", "prime video stream", "prime video featured",
            "amazon", "amazon.com", "netflix", "youtube", "disney+",
            "hotstar", "twitch", "hulu", "streaming app", "stream", "video player",
            "cast", "android system", "tv home", "unknown", "live tv dvr", "video", "audio"
        )

        fun isContentTitle(title: String?): Boolean {
            if (title.isNullOrBlank()) return false
            val trimmed = title.trim()
            if (trimmed.length < 2 || trimmed.startsWith("🛡️") || trimmed.startsWith("Guardian")) return false
            if (trimmed.startsWith("amzn1.", ignoreCase = true) || trimmed.contains(".gti.", ignoreCase = true)) return false
            if (trimmed.equals("amazon.com", ignoreCase = true) || trimmed.equals("amazon", ignoreCase = true)) return false
            if (GENERIC_TITLES.contains(trimmed.lowercase())) return false
            return trimmed.contains(Regex("[a-zA-Z0-9]{2,}"))
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.i(TAG, "Guardian Notification & Media Listener connected on Android TV")
        inspectActiveMediaSessions()
        inspectActiveNotifications()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        extractMediaFromNotification(sbn)
        inspectActiveMediaSessions()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        inspectActiveMediaSessions()
    }

    /**
     * Inspects active MediaSessions using MediaSessionManager with this bound NotificationListener component.
     */
    fun inspectActiveMediaSessions(targetPackage: String? = null): Boolean {
        try {
            val sessionManager = getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
            val component = ComponentName(this, GuardianNotificationListenerService::class.java)
            val controllers: List<MediaController> = sessionManager?.getActiveSessions(component) ?: emptyList()

            for (controller in controllers) {
                val pkg = controller.packageName
                if (targetPackage != null && !pkg.contains(targetPackage) && !targetPackage.contains(pkg)) {
                    continue
                }

                val playbackState = controller.playbackState
                val state = playbackState?.state
                val isActive = state == PlaybackState.STATE_PLAYING ||
                               state == PlaybackState.STATE_BUFFERING ||
                               state == PlaybackState.STATE_PAUSED

                if (isActive || controllers.size == 1) {
                    val metadata = controller.metadata
                    if (metadata != null) {
                        extractFromMetadata(metadata, pkg, state == PlaybackState.STATE_PLAYING, controller)
                        return true
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error inspecting MediaSessions via NotificationListener: ${e.message}")
        }
        return false
    }

    private fun extractFromMetadata(
        metadata: MediaMetadata,
        pkg: String,
        playing: Boolean,
        controller: MediaController? = null
    ) {
        val displayTitle = metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE)?.trim()
        val rawTitle = metadata.getString(MediaMetadata.METADATA_KEY_TITLE)?.trim()
        val displaySubtitle = metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE)?.trim()
        val album = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM)?.trim()
        val artist = (metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)
            ?: metadata.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST))?.trim()
        val displayDesc = metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_DESCRIPTION)?.trim()
        val mediaId = metadata.getString(MediaMetadata.METADATA_KEY_MEDIA_ID)?.trim()

        Log.d(TAG, "Inspecting $pkg MediaSession: rawTitle='$rawTitle', displayTitle='$displayTitle', mediaId='$mediaId'")

        // If Prime Video supplies a GTI (e.g. amzn1.dv.gti.f62ea081-9cb4-4f29-a075-e2ed7ef9189b)
        if (pkg.contains("amazonvideo") && mediaId != null && mediaId.startsWith("amzn1.dv.gti.")) {
            resolveAmazonGtiAsync(mediaId, pkg)
        }

        // Resolve the best genuine content title:
        val candidateTitle = when {
            isContentTitle(displayTitle) -> displayTitle
            isContentTitle(rawTitle) -> rawTitle
            isContentTitle(displaySubtitle) -> displaySubtitle
            isContentTitle(album) -> album
            else -> null
        }

        if (candidateTitle != null) {
            lastMediaTitle = candidateTitle
            lastMediaSubtitle = when {
                displaySubtitle != null && displaySubtitle != candidateTitle -> displaySubtitle
                album != null && album != candidateTitle -> album
                else -> ""
            }
            lastMediaArtist = artist ?: ""
            lastMediaSynopsis = displayDesc ?: ""
            lastMediaPackage = pkg
            isPlaying = playing
            Log.i(TAG, "Extracted genuine MediaSession title: '$lastMediaTitle' (Subtitle: '$lastMediaSubtitle') for $pkg")
        } else {
            // Check if any metadata key has a valid content title (excluding ID fields)
            var foundKeyTitle: String? = null
            try {
                for (key in metadata.keySet()) {
                    if (key == MediaMetadata.METADATA_KEY_MEDIA_ID || key.contains("MEDIA_ID", ignoreCase = true) || key.contains("ID", ignoreCase = true)) continue
                    val valStr = try { metadata.getString(key) } catch (e: Exception) { null }
                    if (isContentTitle(valStr)) {
                        foundKeyTitle = valStr
                        break
                    }
                }
            } catch (e: Exception) {
                // ignore
            }

            if (foundKeyTitle != null) {
                lastMediaTitle = foundKeyTitle
                lastMediaPackage = pkg
                isPlaying = playing
                Log.i(TAG, "Extracted genuine title from metadata key: '$lastMediaTitle' for $pkg")
            }
        }
    }

    /**
     * Resolves Amazon Digital Video Global Title Identifier (GTI) asynchronously
     * to obtain the real series/movie title and synopsis.
     */
    private fun resolveAmazonGtiAsync(gti: String, pkg: String) {
        if (gtiCache.containsKey(gti)) {
            val cached = gtiCache[gti]!!
            lastMediaTitle = cached.first
            lastMediaSynopsis = cached.second
            lastMediaPackage = pkg
            GuardianAccessibilityService.currentMediaTitle = cached.first
            GuardianAccessibilityService.currentMediaSynopsis = cached.second
            Log.i(TAG, "Resolved Amazon GTI from cache: Title='${cached.first}' for $pkg")
            return
        }

        Thread {
            try {
                val url = URL("https://www.primevideo.com/detail/$gti")
                val conn = url.openConnection() as HttpURLConnection
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
                conn.instanceFollowRedirects = true
                conn.connectTimeout = 7000
                conn.readTimeout = 7000
                if (conn.responseCode == 200) {
                    val html = conn.inputStream.bufferedReader().use { it.readText() }

                    // Extract title from meta title, JSON title, or title tag
                    var title = Regex("<meta\\s+name=[\"']title[\"']\\s+content=[\"']([^\"']+)[\"']", RegexOption.IGNORE_CASE)
                        .find(html)?.groupValues?.get(1)
                    if (title.isNullOrBlank()) {
                        title = Regex("\"title\"\\s*:\\s*\"([^\"]+)\"", RegexOption.IGNORE_CASE)
                            .find(html)?.groupValues?.get(1)
                    }
                    if (title.isNullOrBlank()) {
                        title = Regex("<title[^>]*>([^<]+)</title>", RegexOption.IGNORE_CASE)
                            .find(html)?.groupValues?.get(1)
                    }

                    // Extract synopsis from meta description or JSON description
                    var synopsis = Regex("<meta\\s+name=[\"']description[\"']\\s+content=[\"']([^\"']+)[\"']", RegexOption.IGNORE_CASE)
                        .find(html)?.groupValues?.get(1)
                    if (synopsis.isNullOrBlank()) {
                        synopsis = Regex("\"(?:description|synopsis)\"\\s*:\\s*\"([^\"]+)\"", RegexOption.IGNORE_CASE)
                            .find(html)?.groupValues?.get(1) ?: ""
                    }

                    // Unescape HTML entities
                    synopsis = synopsis
                        .replace("&#x27;", "'")
                        .replace("&quot;", "\"")
                        .replace("&amp;", "&")
                        .replace("&lt;", "<")
                        .replace("&gt;", ">")
                        .trim()

                    if (!title.isNullOrBlank()) {
                        // Clean up title: "Watch The Boys Season 4 – Prime Video" -> "The Boys Season 4"
                        var cleanTitle = title
                            .replace(Regex("^Watch\\s+", RegexOption.IGNORE_CASE), "")
                            .replace(Regex("^Prime Video:\\s*", RegexOption.IGNORE_CASE), "")
                            .replace(Regex("\\s*[–\\-|]\\s*Prime Video.*$", RegexOption.IGNORE_CASE), "")
                            .replace(Regex("\\s*[–\\-|]\\s*Amazon\\.com.*$", RegexOption.IGNORE_CASE), "")
                            .replace("&#x27;", "'")
                            .replace("&quot;", "\"")
                            .replace("&amp;", "&")
                            .trim()

                        if (cleanTitle.isNotEmpty() &&
                            isContentTitle(cleanTitle) &&
                            !cleanTitle.equals("Amazon.com", ignoreCase = true) &&
                            !cleanTitle.equals("Amazon", ignoreCase = true) &&
                            !cleanTitle.equals("Prime Video", ignoreCase = true) &&
                            !cleanTitle.startsWith("amzn1.", ignoreCase = true)
                        ) {
                            gtiCache[gti] = Pair(cleanTitle, synopsis)
                            lastMediaTitle = cleanTitle
                            lastMediaSynopsis = synopsis
                            lastMediaPackage = pkg
                            GuardianAccessibilityService.currentMediaTitle = cleanTitle
                            GuardianAccessibilityService.currentMediaSynopsis = synopsis
                            Log.i(TAG, "⚡ Successfully resolved Amazon GTI '$gti' -> Title: '$cleanTitle', Synopsis: '${synopsis.take(60)}...'")
                        }
                    }
                }
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Failed to resolve Amazon GTI '$gti': ${e.message}")
            }
        }.start()
    }

    fun inspectActiveNotifications() {
        try {
            val active = activeNotifications ?: return
            for (sbn in active) {
                extractMediaFromNotification(sbn)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error inspecting active notifications: ${e.message}")
        }
    }

    private fun extractMediaFromNotification(sbn: StatusBarNotification) {
        val pkg = sbn.packageName ?: return
        if (pkg == packageName || pkg == "android" || pkg == "com.android.systemui") return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim() ?: ""

        // Check if there is an active MediaSession token embedded in the notification
        val mediaSessionToken = extras.get(Notification.EXTRA_MEDIA_SESSION) as? MediaSession.Token
        if (mediaSessionToken != null) {
            try {
                val controller = MediaController(this, mediaSessionToken)
                val metadata = controller.metadata
                if (metadata != null) {
                    extractFromMetadata(metadata, pkg, true, controller)
                    return
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error inspecting MediaController from notification token: ${e.message}")
            }
        }

        // Only accept notification title if it's from a known streaming app, not system/recommendations
        val isStreamingApp = pkg.contains("youtube") || pkg.contains("amazonvideo") || 
                             pkg.contains("netflix") || pkg.contains("disney") || pkg.contains("hotstar")

        if (isStreamingApp && isContentTitle(title)) {
            lastMediaTitle = title
            lastMediaArtist = if (text.isNotEmpty()) text else subText
            lastMediaPackage = pkg
            isPlaying = true
            Log.i(TAG, "Extracted notification playback title from $pkg: '$title' ('$lastMediaArtist')")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.i(TAG, "Guardian Notification & Media Listener destroyed")
    }
}
