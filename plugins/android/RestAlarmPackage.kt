package __PACKAGE_NAME__

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class RestAlarmAccessModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "RestAlarmAccess"

  private fun canSchedule(): Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
    (reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()

  @ReactMethod
  fun canScheduleExactAlarms(promise: Promise) {
    promise.resolve(canSchedule())
  }

  @ReactMethod
  fun requestExactAlarmAccess(promise: Promise) {
    try {
      if (!canSchedule()) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
          Uri.parse("package:${reactApplicationContext.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("REST_ALARM_SETTINGS", "Не удалось открыть настройки точных будильников", error)
    }
  }
}

class RestAlarmPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(RestAlarmAccessModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
