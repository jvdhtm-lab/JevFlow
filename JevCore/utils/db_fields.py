"""Shared custom DB field helpers (stub — extend as needed)."""
import html

from django.db import models


def sanitize_text(value):
    """Escape HTML in free-text input (stdlib only, no bleach dependency)."""
    if value is None:
        return value
    return html.escape(str(value))


class SanitizedTextField(models.TextField):
    """TextField that HTML-escapes its value on save."""

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        return sanitize_text(value)
