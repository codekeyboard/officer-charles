from core.util.functions.env import env

# 
# Brain Config
# 

service_config = {

    "assistant": {
        'host': env("ASSISTANT_WSS_HOST", "0.0.0.0"),
        'port': int(env("ASSISTANT_WSS_PORT", 4401)),
    }

}
