from core.util.functions.env import env

# 
# SSL Config
# 

ssl_config = {
  
    'certificate': env("SSL_CERTIFICATE", None),
    'private':     env("SSL_PRIVATE",     None),
    'password':    env("SSL_PASSWORD",    None),

}
