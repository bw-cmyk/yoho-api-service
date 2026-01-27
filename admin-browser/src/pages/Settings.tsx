import { useState } from 'react'
import { Save } from 'lucide-react'

interface Settings {
  siteName: string
  siteUrl: string
  maintenanceMode: boolean
  emailNotifications: boolean
  apiRateLimit: number
  sessionTimeout: number
  maxUploadSize: number
  defaultLanguage: string
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    siteName: 'Yoho Platform',
    siteUrl: 'https://yoho.app',
    maintenanceMode: false,
    emailNotifications: true,
    apiRateLimit: 1000,
    sessionTimeout: 30,
    maxUploadSize: 10,
    defaultLanguage: 'zh-CN',
  })

  const handleSave = () => {
    alert('设置已保存')
  }

  return (
    <div className="max-w-3xl">
      {/* Basic Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">基本设置</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">站点名称</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">站点 URL</label>
              <input
                type="text"
                value={settings.siteUrl}
                onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认语言</label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">安全设置</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API 请求限制 (次/分钟)</label>
              <input
                type="number"
                value={settings.apiRateLimit}
                onChange={(e) => setSettings({ ...settings, apiRateLimit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">会话超时 (分钟)</label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">最大上传大小 (MB)</label>
            <input
              type="number"
              value={settings.maxUploadSize}
              onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">功能开关</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">维护模式</p>
              <p className="text-sm text-gray-500">开启后网站将显示维护页面</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`relative w-12 h-6 rounded-full transition ${
                settings.maintenanceMode ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                  settings.maintenanceMode ? 'left-7' : 'left-1'
                }`}
              ></span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">邮件通知</p>
              <p className="text-sm text-gray-500">系统事件邮件通知</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
              className={`relative w-12 h-6 rounded-full transition ${
                settings.emailNotifications ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                  settings.emailNotifications ? 'left-7' : 'left-1'
                }`}
              ></span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
        >
          <Save size={20} className="mr-2" />
          保存设置
        </button>
      </div>
    </div>
  )
}
