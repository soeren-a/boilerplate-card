"""The Setting Saver"""

from __future__ import annotations

from homeassistant.core import HomeAssistant, callback
from homeassistant.components import websocket_api

from homeassistant.util.json import load_json, save_json

import voluptuous as vol

DOMAIN = "settings_saver"
PERSISTENCE = ".valve.settings.json"

async def async_setup(hass, config):
    """Reguster the WS commands."""
    hass.components.websocket_api.async_register_command(ws_get_json)
    hass.components.websocket_api.async_register_command(ws_save_save)

    return True


@websocket_api.websocket_command(
    {
        vol.Required("type"): "saver/get_json",
    }
)
@callback
def ws_get_json(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Reads the data from a JSON file."""
    data = load_json(hass.config.path(PERSISTENCE), default={})
    connection.send_result(msg["id"], data)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "saver/set_json",
        vol.Optional("data"): dict,
    }
)
@websocket_api.async_response
async def ws_save_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Saves the data as JSON file (under config root)."""
    await hass.async_add_executor_job(
        save_json(hass.config.path(PERSISTENCE), msg["data"])
    )
    connection.send_result(msg["id"], msg["data"])
