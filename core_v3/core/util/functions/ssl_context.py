import ssl

import os, sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from core.util.functions.config import config
from core.util.functions.env import env

def ssl_context(cert_path=None, key_path=None, password=None, use_config=True, use_env=True):
  if use_config:
    cert_path = config('ssl.certificate', cert_path) if cert_path is None else cert_path
    key_path  = config('ssl.private',     key_path ) if key_path  is None else key_path
    password  = config('ssl.password',    password ) if password  is None else password

  if use_env:
    cert_path = env('SSL_CERTIFICATE', cert_path) if cert_path is None else cert_path
    key_path  = env('SSL_PRIVATE',     key_path ) if key_path  is None else key_path
    password  = env('SSL_PASSWORD',    password ) if password  is None else password

  if cert_path and key_path:
    ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ctx.load_cert_chain(
      certfile = cert_path,
      keyfile  = key_path,
      password = password,
    )
    return ctx

  return None
