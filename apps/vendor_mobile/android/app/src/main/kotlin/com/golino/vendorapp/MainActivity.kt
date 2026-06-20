package com.golino.vendorapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val notificationChannelId = "vendor_push_channel"
    private val methodChannelName = "com.golino.vendorapp/notifications"
    private val sessionChannelName = "com.golino.vendorapp/session_storage"
    private val sessionPrefsName = "vendor_mobile_storage"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        createNotificationChannel()

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, methodChannelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "showForegroundNotification" -> {
                        val id = call.argument<Int>("id") ?: System.currentTimeMillis().toInt()
                        val title = call.argument<String>("title") ?: "اعلان جدید"
                        val body = call.argument<String>("body") ?: "یک اعلان جدید دریافت شد."
                        showForegroundNotification(id, title, body)
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, sessionChannelName)
            .setMethodCallHandler { call, result ->
                val prefs = getSharedPreferences(sessionPrefsName, Context.MODE_PRIVATE)
                when (call.method) {
                    "saveSession" -> {
                        val key = call.argument<String>("key")
                        val value = call.argument<String>("value")
                        if (key.isNullOrBlank() || value == null) {
                            result.error("invalid_args", "کلید یا مقدار سشن معتبر نیست.", null)
                        } else {
                            prefs.edit().putString(key, value).apply()
                            result.success(true)
                        }
                    }
                    "loadSession" -> {
                        val key = call.argument<String>("key")
                        if (key.isNullOrBlank()) {
                            result.error("invalid_args", "کلید سشن معتبر نیست.", null)
                        } else {
                            result.success(prefs.getString(key, null))
                        }
                    }
                    "clearSession" -> {
                        val key = call.argument<String>("key")
                        if (key.isNullOrBlank()) {
                            result.error("invalid_args", "کلید سشن معتبر نیست.", null)
                        } else {
                            prefs.edit().remove(key).apply()
                            result.success(true)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                notificationChannelId,
                "Vendor Push Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "اعلان‌های عملیاتی فروشنده"
            }

            val manager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun showForegroundNotification(id: Int, title: String, body: String) {
        val notification = NotificationCompat.Builder(this, notificationChannelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this).notify(id, notification)
    }
}
