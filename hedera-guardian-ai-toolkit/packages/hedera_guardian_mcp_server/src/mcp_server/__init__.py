import logging
import sys

from .settings import McpServerSettings

mcp_server_settings = McpServerSettings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, mcp_server_settings.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
