from core.util.functions.env import env

completion_config = {
  "plugins": {

    # Names
    "DeviceLocation":     "core.completion.plugins.DeviceLocation",
    "InternalSystem":     "core.completion.plugins.InternalSystem",
    "KnowledgeBase":      "core.completion.plugins.KnowledgeBase",
    "Language":           "core.completion.plugins.Language",
    "Translator":         "core.completion.plugins.Translator",
    "AssistantUI":        "core.completion.plugins.AssistantUI",
    "LocalStorage":       "core.completion.plugins.LocalStorage",
    "Payload":            "core.completion.plugins.Payload",
    "Service":            "core.completion.plugins.Service",
    "ResourceEncryption": "core.completion.plugins.ResourceEncryption",
    "API":                "core.completion.plugins.API",
    "QRCode":             "core.completion.plugins.QRCode",
    "TextOnly":           "core.completion.plugins.TextOnly",
    "Actions":            "core.completion.plugins.Actions",
    "ChatLogger":         "core.completion.plugins.ChatLogger",
    "UsageCalculator":    "core.completion.plugins.UsageCalculator",
    "KnowledgeQuery":     "core.completion.plugins.KnowledgeQuery",
    "Collections":        "core.completion.plugins.Collections",
    "InfoDocuments":      "core.completion.plugins.InfoDocuments",

    # Nick Aliases
    "location":           "core.completion.plugins.DeviceLocation",
    "isa":                "core.completion.plugins.InternalSystem",
    "kb":                 "core.completion.plugins.KnowledgeBase",
    "lang":               "core.completion.plugins.Language",
    "translator":         "core.completion.plugins.Translator",
    "ui":                 "core.completion.plugins.AssistantUI",
    "local_storage":      "core.completion.plugins.LocalStorage",
    "payload":            "core.completion.plugins.Payload",
    "service":            "core.completion.plugins.Service",
    "encrypt":            "core.completion.plugins.ResourceEncryption",
    "api":                "core.completion.plugins.API",
    "qr":                 "core.completion.plugins.QRCode",
    "text":               "core.completion.plugins.TextOnly",
    "actions":            "core.completion.plugins.Actions",
    "history":            "core.completion.plugins.ChatLogger",
    "usage":              "core.completion.plugins.UsageCalculator",
    "kq":                 "core.completion.plugins.KnowledgeQuery",
    "collection":         "core.completion.plugins.Collections",
    "docs":               "core.completion.plugins.InfoDocuments",

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
  'Translator': {
      'db_name': env('PLUGIN_TRANSLATOR_DB_NAME', 'translator'),
  }
}