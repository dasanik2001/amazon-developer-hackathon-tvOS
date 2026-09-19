package com.anonymous.MultiTVSample.guardian

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Fire TV OS Accessibility Service that monitors active foreground streaming applications
 * (YouTube, Amazon Prime Video, Netflix, Disney+) and extracts on-screen media context.
 *
 * Enhanced with Amazon Ignite / Chromium web accessibility flags, self-overlay window filtering,
 * persistent media context retention, and alphanumeric title validation.
 */
class GuardianAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "GuardianAccessibility"
        var currentForegroundPackage: String = ""
        var currentAppName: String = "Streaming App"
        var currentMediaTitle: String = ""
        var currentMediaSubtitle: String = ""
        var currentMediaSynopsis: String = ""
        var currentTextSnippets: MutableList<String> = mutableListOf()
        var instance: GuardianAccessibilityService? = null

        private val NAVIGATION_BLACKLIST = setOf(
            "home", "store", "live tv", "categories", "my stuff", "settings",
            "search", "profiles", "help", "terms", "privacy", "back", "next",
            "play", "pause", "resume", "episodes", "more info", "watch trailer",
            "prime video", "primevideo", "prime video stream", "prime video featured",
            "amazon", "amazon.com", "netflix", "youtube", "disney+", "hotstar", "tv home",
            "close", "cancel", "done", "hd", "4k", "hdr", "cc", "subtitles",
            "audio", "language", "restart", "skip", "details", "add to watchlist",
            "season", "movies", "tv shows", "browse", "sign in", "who is watching",
            "recommended", "trending", "explore", "library", "channels", "live",
            "streaming app", "active", "paused", "guardian", "presentation", "stream",
            "play episode", "resume episode", "start over", "next episode", "watch from beginning",
            "video", "audio & languages", "subtitles & audio", "x-ray", "bonus"
        )

        /**
         * Validates whether a candidate string is a plausible content title.
         * Must contain at least 2 alphanumeric characters and not be in the navigation/brand blacklist.
         */
        fun isValidTitle(candidate: String?): Boolean {
            if (candidate.isNullOrBlank()) return false
            val trimmed = candidate.trim()
            if (trimmed.length < 2 || trimmed.length > 120) return false
            // Must contain at least 2 alphanumeric characters (reject pure emojis like 🛡️ or punctuation)
            if (!trimmed.contains(Regex("[a-zA-Z0-9]{2,}"))) return false
            // Reject Guardian's own overlay text
            if (trimmed.startsWith("🛡️") || trimmed.startsWith("Guardian", ignoreCase = true)) return false
            // Reject Amazon GTI tokens or system IDs
            if (trimmed.startsWith("amzn1.", ignoreCase = true) || trimmed.contains(".gti.", ignoreCase = true)) return false
            if (trimmed.equals("amazon.com", ignoreCase = true) || trimmed.equals("amazon", ignoreCase = true)) return false
            // Reject timestamps like "1:31:15"
            if (trimmed.matches(Regex("^[0-9:.]+$"))) return false
            // Reject URLs
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return false

            val lower = trimmed.lowercase()
            if (NAVIGATION_BLACKLIST.contains(lower)) return false

            return true
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "Guardian Accessibility Service connected on Fire TV OS / Android TV")

        // Enable enhanced web accessibility for Amazon Ignite / Chromium web runtimes
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPES_ALL_MASK
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 200
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REQUEST_ENHANCED_WEB_ACCESSIBILITY
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        // Ignore own Guardian overlay app
        if (packageName == applicationContext.packageName) return

        // Filter out transient system UI, system keyguard, and keyboards
        if (packageName == "android" ||
            packageName == "com.android.systemui" ||
            packageName.contains("inputmethod") ||
            packageName.contains("keyguard")) {
            return
        }

        val previousPackage = currentForegroundPackage
        val appName = getReadableAppName(packageName)

        if (previousPackage != packageName) {
            currentForegroundPackage = packageName
            currentAppName = appName
            Log.i(TAG, "Switched active foreground app: $appName ($packageName)")

            // Reset old title and snippets when switching to a different app
            currentMediaTitle = ""
            currentMediaSubtitle = ""
            currentMediaSynopsis = ""
            currentTextSnippets.clear()

            // Update floating overlay badge text immediately
            GuardianOverlayService.instance?.updateOverlayStatus(appName, packageName)

            // Trigger early sample for newly launched app
            if (packageName != "com.google.android.tvlauncher") {
                GuardianOverlayService.instance?.onForegroundAppChanged(appName, packageName)
            }
        }

        // Also inspect event text/contentDescription directly
        inspectEventContent(event)

        // Always extract screen content for active third-party apps
        if (packageName != "com.google.android.tvlauncher") {
            extractScreenContent(rootInActiveWindow)
        }
    }

    /**
     * Inspects direct event text, content description, and event source node.
     */
    private fun inspectEventContent(event: AccessibilityEvent) {
        try {
            // Check event text list
            for (cs in event.text) {
                val str = cs?.toString()?.trim() ?: continue
                if (isValidTitle(str) && currentMediaTitle.isEmpty()) {
                    currentMediaTitle = str
                    Log.i(TAG, "Captured media title from AccessibilityEvent text: '$str'")
                }
                if (str.length > 2 && !currentTextSnippets.contains(str)) {
                    currentTextSnippets.add(str)
                }
            }

            // Check content description
            val desc = event.contentDescription?.toString()?.trim()
            if (!desc.isNullOrEmpty()) {
                if (isValidTitle(desc) && currentMediaTitle.isEmpty()) {
                    currentMediaTitle = desc
                    Log.i(TAG, "Captured media title from AccessibilityEvent description: '$desc'")
                }
                if (desc.length > 2 && !currentTextSnippets.contains(desc)) {
                    currentTextSnippets.add(desc)
                }
            }

            // Inspect event source node if available
            event.source?.let { sourceNode ->
                extractScreenContent(sourceNode)
                sourceNode.recycle()
            }
        } catch (e: Exception) {
            // ignore
        }
    }

    /**
     * Actively queries the package name of the root window in the active window hierarchy.
     */
    fun queryActiveWindowPackage(): String? {
        return try {
            val root = rootInActiveWindow
            val pkg = root?.packageName?.toString()
            if (!pkg.isNullOrEmpty() && pkg != packageName && pkg != "android" && pkg != "com.android.systemui") {
                pkg
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Dynamically refreshes screen text context from the currently active window.
     */
    fun refreshScreenContext() {
        try {
            extractScreenContent(rootInActiveWindow)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to refresh screen context: ${e.message}")
        }
    }

    /**
     * Resolves human-readable app name for third-party streaming apps and general apps.
     */
    fun getReadableAppName(pkg: String): String {
        return when {
            pkg.contains("smarttube") -> "SmartTube"
            pkg.contains("youtube") -> "YouTube"
            pkg.contains("netflix") -> "Netflix"
            pkg.contains("amazonvideo") || pkg.contains("avod") -> "Prime Video"
            pkg.contains("disney") || pkg.contains("hotstar") -> "Disney+ Hotstar"
            pkg.contains("twitch") -> "Twitch"
            pkg.contains("hulu") -> "Hulu"
            pkg.contains("apple") && pkg.contains("tv") -> "Apple TV"
            pkg.contains("crunchyroll") -> "Crunchyroll"
            pkg.contains("tubi") -> "Tubi"
            pkg.contains("pluto") -> "Pluto TV"
            pkg.contains("plex") -> "Plex"
            pkg.contains("jiocinema") -> "JioCinema"
            pkg.contains("zee5") -> "ZEE5"
            pkg.contains("sonyliv") -> "SonyLIV"
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
     * Recursively traverses AccessibilityNodeInfo tree to capture video titles,
     * captions, synopsis, and on-screen textual context from the active TV screen.
     * Explicitly ignores the Guardian overlay window and retains previously captured context.
     */
    private fun extractScreenContent(rootNode: AccessibilityNodeInfo?) {
        try {
            val textList = mutableListOf<String>()
            var priorityTitle: String? = null
            var detectedSynopsis: String? = null
            var detectedSubtitle: String? = null

            fun traverse(node: AccessibilityNodeInfo?, depth: Int) {
                if (node == null || depth > 25) return

                // CRITICAL: Filter out own package nodes to prevent reading Guardian overlay UI!
                val nodePkg = node.packageName?.toString() ?: ""
                if (nodePkg == applicationContext.packageName) return

                val viewId = node.viewIdResourceName?.lowercase() ?: ""
                val text = node.text?.toString()?.trim()
                val desc = node.contentDescription?.toString()?.trim()

                val candidate = when {
                    !text.isNullOrEmpty() && text.length > 1 -> text
                    !desc.isNullOrEmpty() && desc.length > 1 -> desc
                    else -> null
                }

                if (candidate != null) {
                    // Check if candidate is from own overlay or blacklisted
                    if (!candidate.startsWith("🛡️") && !candidate.startsWith("Guardian", ignoreCase = true)) {
                        val lower = candidate.lowercase()
                        val isNav = NAVIGATION_BLACKLIST.contains(lower)

                        // 1. Check if viewId indicates title or headline
                        val isTitleId = viewId.contains("title") || 
                                        viewId.contains("headline") || 
                                        viewId.contains("program") ||
                                        viewId.contains("track_name") ||
                                        viewId.contains("exo_title") ||
                                        viewId.contains("item_name") ||
                                        viewId.contains("content_title") ||
                                        viewId.contains("asset_title")

                        if (isTitleId && !isNav && priorityTitle == null && isValidTitle(candidate)) {
                            priorityTitle = candidate
                        }

                        // 2. Check if viewId indicates description or synopsis
                        val isDescId = viewId.contains("synopsis") || 
                                       viewId.contains("description") || 
                                       viewId.contains("summary") || 
                                       viewId.contains("plot") ||
                                       viewId.contains("metadata_line") ||
                                       viewId.contains("overview")

                        if (isDescId && detectedSynopsis == null && candidate.length > 15) {
                            detectedSynopsis = candidate
                        }

                        // 3. Check for episode or subtitle ID
                        val isSubId = viewId.contains("subtitle") || 
                                      viewId.contains("episode") || 
                                      viewId.contains("artist") ||
                                      viewId.contains("season")

                        if (isSubId && detectedSubtitle == null && candidate.length in 3..80 && !isNav) {
                            detectedSubtitle = candidate
                        }

                        // Add to textList if valid and not already present
                        if (!textList.contains(candidate)) {
                            textList.add(candidate)
                        }
                    }
                }

                for (i in 0 until node.childCount) {
                    val child = node.getChild(i)
                    if (child != null) {
                        traverse(child, depth + 1)
                        child.recycle()
                    }
                }
            }

            // Traverse root node
            rootNode?.let { traverse(it, 0) }

            // Also traverse interactive windows if available, EXCLUDING own overlay window
            try {
                windows?.forEach { win ->
                    val winRoot = win.root
                    val winPkg = winRoot?.packageName?.toString() ?: ""
                    // Explicitly skip own Guardian overlay window!
                    if (winPkg != applicationContext.packageName) {
                        winRoot?.let { traverse(it, 0) }
                    }
                }
            } catch (e: Exception) {
                // ignore
            }

            if (textList.isNotEmpty()) {
                currentTextSnippets = textList.take(25).toMutableList()

                // Resolve best title using priorityTitle or first valid candidate
                val resolvedTitle = priorityTitle ?: textList.firstOrNull { str ->
                    isValidTitle(str)
                }

                if (!resolvedTitle.isNullOrBlank()) {
                    currentMediaTitle = resolvedTitle
                }
                detectedSubtitle?.let { currentMediaSubtitle = it }
                detectedSynopsis?.let { 
                    currentMediaSynopsis = it 
                    if (!currentTextSnippets.contains(it)) {
                        currentTextSnippets.add(0, it)
                    }
                }

                Log.d(TAG, "Extracted from $currentForegroundPackage: Title='$currentMediaTitle', Subtitle='$currentMediaSubtitle', Snippets=${currentTextSnippets.size}")
            } else {
                // If current screen has no text (e.g. video playing on SurfaceView),
                // DO NOT overwrite currentMediaTitle with empty or overlay text!
                // Keep the persistent title previously captured from the detail screen / OSD.
                Log.d(TAG, "No new text nodes found on active screen. Retaining persistent media context: Title='$currentMediaTitle'")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error inspecting node tree: ${e.message}")
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "Guardian Accessibility Service interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.i(TAG, "Guardian Accessibility Service destroyed")
    }
}
