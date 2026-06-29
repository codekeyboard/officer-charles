from core.util.functions.env import env

realtime_config = {
  "plugins": {

    # Names
    "DeviceLocation":     "core.realtime.plugins.DeviceLocation",
    "InternalSystem":     "core.realtime.plugins.InternalSystem",
    "KnowledgeBase":      "core.realtime.plugins.KnowledgeBase",
    "Language":           "core.realtime.plugins.Language",
    "Translator":         "core.realtime.plugins.Translator",
    "AssistantUI":        "core.realtime.plugins.AssistantUI",
    "LocalStorage":       "core.realtime.plugins.LocalStorage",
    "Payload":            "core.realtime.plugins.Payload",
    "Service":            "core.realtime.plugins.Service",
    "ResourceEncryption": "core.realtime.plugins.ResourceEncryption",
    "API":                "core.realtime.plugins.API",
    "QRCode":             "core.realtime.plugins.QRCode",
    "TextOnly":           "core.realtime.plugins.TextOnly",
    "Actions":            "core.realtime.plugins.Actions",
    "ChatLogger":         "core.realtime.plugins.ChatLogger",
    "UsageCalculator":    "core.realtime.plugins.UsageCalculator",
    "KnowledgeQuery":     "core.realtime.plugins.KnowledgeQuery",
    "Collections":        "core.realtime.plugins.Collections",
    "InfoDocuments":      "core.realtime.plugins.InfoDocuments",

    # Nick Aliases
    "location":           "core.realtime.plugins.DeviceLocation",
    "isa":                "core.realtime.plugins.InternalSystem",
    "kb":                 "core.realtime.plugins.KnowledgeBase",
    "lang":               "core.realtime.plugins.Language",
    "translator":         "core.realtime.plugins.Translator",
    "ui":                 "core.realtime.plugins.AssistantUI",
    "local_storage":      "core.realtime.plugins.LocalStorage",
    "payload":            "core.realtime.plugins.Payload",
    "service":            "core.realtime.plugins.Service",
    "encrypt":            "core.realtime.plugins.ResourceEncryption",
    "api":                "core.realtime.plugins.API",
    "qr":                 "core.realtime.plugins.QRCode",
    "text":               "core.realtime.plugins.TextOnly",
    "actions":            "core.realtime.plugins.Actions",
    "history":            "core.realtime.plugins.ChatLogger",
    "usage":              "core.realtime.plugins.UsageCalculator",
    "kq":                 "core.realtime.plugins.KnowledgeQuery",
    "collection":         "core.realtime.plugins.Collections",
    "docs":          "core.realtime.plugins.InfoDocuments",

    # Plugins enabled by default
    'default': [
      'local_storage',
      'payload',
      'service',
      # 'encrypt',
      'usage',
    ]
  },

  # 
  # Plugins Configuration
  # 

  # ChatLogger
  'ChatLogger': {
    'db': {
      'host'    : env('PLUGIN_CHATLOGGER_DB_HOST', env('DB_HOST', '127.0.0.1')),
      'port'    : env('PLUGIN_CHATLOGGER_DB_PORT', env('DB_PORT', 3306       )),
      'user'    : env('PLUGIN_CHATLOGGER_DB_USER', env('DB_USER', 'root'     )),
      'password': env('PLUGIN_CHATLOGGER_DB_PASS', env('DB_PASS', 'root'     )),
      'database': env('PLUGIN_CHATLOGGER_DB_NAME', 'chat_logger'),
    }
  },

  'KnowldgeQuery':{
    'db': {
      'host'    : env('PLUGIN_KnowldgeQuery_DB_HOST', env('DB_HOST', '127.0.0.1')),
      'port'    : env('PLUGIN_KnowldgeQuery_DB_PORT', env('DB_PORT', 3306       )),
      'user'    : env('PLUGIN_KnowldgeQuery_DB_USER', env('DB_USER', 'root'     )),
      'password': env('PLUGIN_KnowldgeQuery_DB_PASS', env('DB_PASS', 'root'     )),
      'database': env('PLUGIN_KnowldgeQuery_DB_NAME', 'kquery'),
    }  
  },

  # TextOnly
  'TextOnly': {
    'enabled': env('PLUGIN_TEXTONLY_ENABLED', env('TEXT_ONLY', 'false')).lower() in ['true', '1', 'yes'],
  },
}
