import logging

from fastmcp.server.middleware import Middleware, MiddlewareContext
from fastmcp.tools.tool import ToolResult

logger = logging.getLogger(__name__)


class ToolLoggingMiddleware(Middleware):
    """Logs all tool inputs and outputs."""

    async def on_call_tool(self, context: MiddlewareContext, call_next):
        tool_name = context.message.name
        arguments = context.message.arguments

        # Log input using Context
        # await ctx.info(f"Tool '{tool_name}' called with arguments: {arguments}")
        logger.info(f"Tool '{tool_name}' called with arguments: {arguments}")

        # Execute the tool
        result: ToolResult = await call_next(context)

        # Log output using Context
        # await ctx.info(f"Tool '{tool_name}' returned: {result.to_mcp_result()}")
        logger.info(f"Tool '{tool_name}' returned: {result.to_mcp_result()}")

        return result
