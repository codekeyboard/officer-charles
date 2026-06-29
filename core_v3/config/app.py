from core.util.functions.env import env

from .assistant import assistant_config
from .service import service_config
from .ssl import ssl_config
from .db import db_config
from .realtime import realtime_config
from .completion import completion_config
from .assistants import assistants_config

app_config = {

    # Debug
    "debug": env("DEBUG", False),

    # OpenAI
    'openai': {
        'org': env("OPENAI_ORG", None),
        'key': env("OPENAI_KEY", None),
    },

    # Join config from other files
    'assistant': assistant_config,
    'service': service_config,
    'ssl': ssl_config,
    'db': db_config,
    'realtime': realtime_config,
    'completion': completion_config,
    'assistants': assistants_config,
}
