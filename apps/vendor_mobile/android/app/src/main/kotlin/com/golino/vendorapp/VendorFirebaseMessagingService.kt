package com.golino.vendorapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class VendorFirebaseMessagingService : FirebaseMessagingService() {
    private val notificationChannelId = "vendor_push_channel"

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        createNotificationChannel()

        val title = message.notification?.title
            ?: message.data["title"]
            ?: "اعلان جدید"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: "یک اعلان جدید دریافت شد."

        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("push_topic", message.data["topic"])
            putExtra("push_order_id", message.data["orderId"])
            putExtra("push_support_ticket_id", message.data["supportTicketId"])
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, notificationChannelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        NotificationManagerCompat.from(this).notify(
            System.currentTimeMillis().toInt(),
            notification,
        )
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                notificationChannelId,
                "Vendor Push Notifications",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "اعلان‌های عملیاتی فروشنده"
            }

            val manager =
                getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
