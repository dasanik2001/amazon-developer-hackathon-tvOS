package com.multitv.guardian

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
 */
class GuardianAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "GuardianAccessibility"
        var currentForegroundPackage: String = ""
        var currentMediaTitle: String = ""
        var currentTextSnippets: MutableList<String> = mutableListOf()
        var instance: GuardianAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "Guardian Accessibility Service connected on Fire TV OS")

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 500
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or 
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName == applicationContext.packageName) return // Ignore own app

        currentForegroundPackage = packageName

        // Check if event is from a known streaming application
        val isVideoApp = when {
            packageName.contains("youtube") -> true
            packageName.contains("amazonvideo") -> true
            packageName.contains("netflix") -> true
            packageName.contains("disney") -> true
            else -> false
        }

        if (isVideoApp) {
            extractScreenContent(rootInActiveWindow)
        }
    }

    /**
     * Recursively traverses AccessibilityNodeInfo tree to capture video titles,
     * captions, and on-screen textual context from the active TV screen.
     */
    private fun extractScreenContent(node: AccessibilityNodeInfo?) {
        if (node == null) return

        try {
            val textList = mutableListOf<String>()
            traverseNodes(node, textList, depth = 0, maxDepth = 6)

            if (textList.isNotEmpty()) {
                currentTextSnippets = textList.take(15).toMutableList()
                // Often the first large header or non-empty string is the media title
                val candidateTitle = textList.firstOrNull { it.length > 5 && !it.contains("http") }
                if (!candidateTitle.isNullOrBlank()) {
                    currentMediaTitle = candidateTitle
                }
                Log.d(TAG, "Extracted from $currentForegroundPackage: Title='$currentMediaTitle', Snippets=${currentTextSnippets.size}")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error inspecting node tree: ${e.message}")
        }
    }

    private fun traverseNodes(node: AccessibilityNodeInfo, textList: MutableList<String>, depth: Int, maxDepth: Int) {
        if (depth > maxDepth) return

        val text = node.text?.toString()?.trim()
        val desc = node.contentDescription?.toString()?.trim()

        if (!text.isNullOrEmpty() && text.length > 2 && !textList.contains(text)) {
            textList.add(text)
        }
        if (!desc.isNullOrEmpty() && desc.length > 2 && !textList.contains(desc)) {
            textList.add(desc)
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                traverseNodes(child, textList, depth + 1, maxDepth)
                child.recycle()
            }
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
