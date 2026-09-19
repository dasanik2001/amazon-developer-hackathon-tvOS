package com.anonymous.MultiTVSample.guardian

import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.util.Log

/**
 * Tracks active MediaSession instances across Fire TV OS and Android TV to extract now-playing
 * titles, artist/creator metadata, and playback state from streaming apps.
 *
 * Utilizes GuardianNotificationListenerService's bound instance to query active sessions
 * without triggering Android 13/14 SecurityExceptions.
 */
class MediaSessionTracker(private val context: Context) {

    companion object {
        private const val TAG = "MediaSessionTracker"

        private val GENERIC_TITLES = setOf(
            "prime video", "primevideo", "prime video stream", "prime video featured",
            "amazon", "amazon.com", "netflix", "youtube", "disney+",
            "hotstar", "twitch", "hulu", "streaming app", "stream", "video player",
            "cast", "android system", "tv home"
        )

        fun isValidContentTitle(title: String?): Boolean {
            if (title.isNullOrBlank()) return false
            val trimmed = title.trim()
            if (trimmed.length < 2 || trimmed.startsWith("🛡️") || trimmed.startsWith("Guardian")) return false
            if (trimmed.startsWith("amzn1.", ignoreCase = true) || trimmed.contains(".gti.", ignoreCase = true)) return false
            if (trimmed.equals("amazon.com", ignoreCase = true) || trimmed.equals("amazon", ignoreCase = true)) return false
            if (GENERIC_TITLES.contains(trimmed.lowercase())) return false
            return trimmed.contains(Regex("[a-zA-Z0-9]{2,}"))
        }
    }

    private val sessionManager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
    var activeMediaTitle: String = ""
    var activeMediaSubtitle: String = ""
    var activeMediaArtist: String = ""
    var activeMediaSynopsis: String = ""
    var isPlaying: Boolean = false

    fun pollActiveMedia(targetPackage: String? = null) {
        // 1. Let GuardianNotificationListenerService query active sessions directly
        val notifListener = GuardianNotificationListenerService.instance
        if (notifListener != null) {
            notifListener.inspectActiveMediaSessions(targetPackage)
            val notifTitle = GuardianNotificationListenerService.lastMediaTitle
            val notifPkg = GuardianNotificationListenerService.lastMediaPackage
            if (isValidContentTitle(notifTitle)) {
                if (targetPackage == null || notifPkg.isEmpty() || notifPkg.contains(targetPackage) || targetPackage.contains(notifPkg)) {
                    activeMediaTitle = notifTitle
                    activeMediaSubtitle = GuardianNotificationListenerService.lastMediaSubtitle
                    activeMediaArtist = GuardianNotificationListenerService.lastMediaArtist
                    activeMediaSynopsis = GuardianNotificationListenerService.lastMediaSynopsis
                    isPlaying = GuardianNotificationListenerService.isPlaying
                    Log.d(TAG, "Active Media via NotificationListener: '$activeMediaTitle' ('$activeMediaArtist') for pkg: $notifPkg")
                    return
                }
            }
        }

        // 2. Query MediaSessionManager fallback (if permissions permit)
        try {
            val component = ComponentName(context, GuardianNotificationListenerService::class.java)
            val controllers = sessionManager?.getActiveSessions(component) ?: emptyList()

            for (controller in controllers) {
                val pkg = controller.packageName
                if (targetPackage != null && !pkg.contains(targetPackage) && !targetPackage.contains(pkg)) continue

                val playbackState = controller.playbackState
                val state = playbackState?.state
                val isActiveState = state == PlaybackState.STATE_PLAYING || 
                                    state == PlaybackState.STATE_BUFFERING || 
                                    state == PlaybackState.STATE_PAUSED

                if (isActiveState || controllers.size == 1) {
                    val metadata = controller.metadata
                    if (metadata != null) {
                        val displayTitle = metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE)
                        val rawTitle = metadata.getString(MediaMetadata.METADATA_KEY_TITLE)
                        val displaySub = metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE)
                        val album = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM)
                        val artist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)
                            ?: metadata.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)

                        val title = when {
                            isValidContentTitle(displayTitle) -> displayTitle
                            isValidContentTitle(rawTitle) -> rawTitle
                            isValidContentTitle(displaySub) -> displaySub
                            isValidContentTitle(album) -> album
                            else -> null
                        }

                        if (!title.isNullOrBlank()) {
                            activeMediaTitle = title
                            activeMediaSubtitle = if (displaySub != null && displaySub != title) displaySub else (album ?: "")
                            activeMediaArtist = artist ?: ""
                            isPlaying = (state == PlaybackState.STATE_PLAYING)
                            Log.d(TAG, "Active Media in $pkg: '$activeMediaTitle' by '$activeMediaArtist'")
                            return
                        }
                    }
                }
            }
        } catch (e: SecurityException) {
            Log.d(TAG, "MediaSession active session inspection requires elevated permission, using Accessibility / NotificationListener context.")
        } catch (e: Exception) {
            Log.w(TAG, "Error polling media sessions: ${e.message}")
        }
    }
}
