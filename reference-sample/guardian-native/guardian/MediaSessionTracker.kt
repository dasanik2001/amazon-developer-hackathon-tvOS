package com.multitv.guardian

import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.util.Log

/**
 * Tracks active MediaSession instances across Fire TV OS to extract now-playing
 * titles, artist/creator metadata, and playback state from streaming apps.
 */
class MediaSessionTracker(private val context: Context) {

    companion object {
        private const val TAG = "MediaSessionTracker"
    }

    private val sessionManager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
    var activeMediaTitle: String = ""
    var activeMediaArtist: String = ""
    var isPlaying: Boolean = false

    fun pollActiveMedia(targetPackage: String? = null) {
        try {
            // Note: On Fire OS, accessing all sessions requires NotificationListenerService or system permission.
            // When available, iterate active controllers.
            val component = ComponentName(context, GuardianAccessibilityService::class.java)
            val controllers = sessionManager?.getActiveSessions(component) ?: emptyList()

            for (controller in controllers) {
                val pkg = controller.packageName
                if (targetPackage != null && pkg != targetPackage) continue

                val playbackState = controller.playbackState
                val state = playbackState?.state
                if (state == PlaybackState.STATE_PLAYING || state == PlaybackState.STATE_BUFFERING) {
                    isPlaying = true
                    val metadata = controller.metadata
                    if (metadata != null) {
                        activeMediaTitle = metadata.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
                        activeMediaArtist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
                        Log.d(TAG, "Active Media in $pkg: '$activeMediaTitle' by '$activeMediaArtist'")
                        return
                    }
                }
            }
        } catch (e: SecurityException) {
            // In standard permissions, fallback gracefully to AccessibilityNodeInfo extraction
            Log.d(TAG, "MediaSession active session inspection requires elevated permission, using Accessibility context.")
        } catch (e: Exception) {
            Log.w(TAG, "Error polling media sessions: ${e.message}")
        }
    }
}
