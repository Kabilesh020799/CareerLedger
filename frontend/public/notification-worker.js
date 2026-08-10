self.addEventListener('push', (event) => {
  const notification = event.data?.json() || { title: 'Job Tracker reminder', body: 'A reminder is due.', url: '/dashboard' }
  event.waitUntil(self.registration.showNotification(notification.title, { body: notification.body, icon: '/vite.svg', data: { url: notification.url } }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/dashboard'))
})
