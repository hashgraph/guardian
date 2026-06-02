"""
Unit tests for subscript_serializer.py - SubscriptConfig and serializer classes.

These tests use mocked Docling components to test the subscript handling logic
without requiring actual document parsing.
"""

from unittest.mock import Mock, patch

import unicodeit

from document_ingestion_worker.document_parsing.subscript_serializer import (
    ScriptAwareChunkingDocSerializer,
    ScriptAwareFallbackSerializer,
    ScriptAwareSerializerProvider,
    SubscriptConfig,
)


class TestSubscriptConfig:
    """Test suite for SubscriptConfig dataclass."""

    def test_default_config(self):
        """Test default configuration values."""
        config = SubscriptConfig()

        assert config.convert_to_unicode is True
        assert config.concatenate_inline is True
        assert config.enabled_script_types == {"sub", "super"}

    def test_custom_config_disable_unicode(self):
        """Test configuration with unicode conversion disabled."""
        config = SubscriptConfig(convert_to_unicode=False)

        assert config.convert_to_unicode is False
        assert config.concatenate_inline is True

    def test_custom_config_disable_concatenation(self):
        """Test configuration that disables inline concatenation."""
        config = SubscriptConfig(concatenate_inline=False)

        assert config.concatenate_inline is False
        assert config.convert_to_unicode is True

    def test_custom_config_subscript_only(self):
        """Test configuration for subscript only (no superscript)."""
        config = SubscriptConfig(enabled_script_types={"sub"})

        assert config.enabled_script_types == {"sub"}
        assert "super" not in config.enabled_script_types

    def test_custom_config_superscript_only(self):
        """Test configuration for superscript only."""
        config = SubscriptConfig(enabled_script_types={"super"})

        assert config.enabled_script_types == {"super"}
        assert "sub" not in config.enabled_script_types

    def test_config_fully_custom(self):
        """Test fully customized configuration."""
        config = SubscriptConfig(
            convert_to_unicode=False,
            concatenate_inline=True,
            enabled_script_types={"sub"},
        )

        assert config.convert_to_unicode is False
        assert config.concatenate_inline is True
        assert config.enabled_script_types == {"sub"}


class TestUnicodeitConversion:
    """Test suite for Unicode conversion using unicodeit library."""

    def test_subscript_digits_conversion(self):
        """Test that unicodeit converts subscript digits correctly."""
        for digit in "0123456789":
            result = unicodeit.replace("_{" + digit + "}")
            # Result should be different from original digit
            assert result != digit
            # Result should be a single character (Unicode subscript)
            assert len(result) == 1

    def test_superscript_digits_conversion(self):
        """Test that unicodeit converts superscript digits correctly."""
        for digit in "0123456789":
            result = unicodeit.replace("^{" + digit + "}")
            # Result should be different from original digit
            assert result != digit
            # Result should be a single character (Unicode superscript)
            assert len(result) == 1

    def test_subscript_specific_values(self):
        """Test specific Unicode values for subscript digits."""
        assert unicodeit.replace("_{0}") == "\u2080"
        assert unicodeit.replace("_{1}") == "\u2081"
        assert unicodeit.replace("_{2}") == "\u2082"
        assert unicodeit.replace("_{3}") == "\u2083"

    def test_superscript_specific_values(self):
        """Test specific Unicode values for superscript digits."""
        assert unicodeit.replace("^{0}") == "\u2070"
        assert unicodeit.replace("^{1}") == "\u00b9"  # Latin superscript 1
        assert unicodeit.replace("^{2}") == "\u00b2"  # Latin superscript 2
        assert unicodeit.replace("^{3}") == "\u00b3"  # Latin superscript 3

    def test_subscript_letters_conversion(self):
        """Test that unicodeit converts subscript letters (not just digits)."""
        # unicodeit supports some subscript letters
        result_n = unicodeit.replace("_{n}")
        result_i = unicodeit.replace("_{i}")
        assert result_n == "\u2099"  # subscript n
        assert result_i == "\u1d62"  # subscript i

    def test_superscript_letters_conversion(self):
        """Test that unicodeit converts superscript letters."""
        result_n = unicodeit.replace("^{n}")
        result_x = unicodeit.replace("^{x}")
        assert result_n == "\u207f"  # superscript n
        assert result_x == "\u02e3"  # superscript x

    def test_chemical_formula_co2(self):
        """Test CO2 conversion as a real-world example."""
        result = "CO" + unicodeit.replace("_{2}")
        assert result == "CO\u2082"  # CO₂

    def test_chemical_formula_h2o(self):
        """Test H2O conversion as a real-world example."""
        result = "H" + unicodeit.replace("_{2}") + "O"
        assert result == "H\u2082O"  # H₂O


class TestScriptAwareFallbackSerializerInit:
    """Test suite for ScriptAwareFallbackSerializer initialization."""

    def test_initialization_default_config(self):
        """Test serializer initialization with default config."""
        serializer = ScriptAwareFallbackSerializer()

        assert serializer.config is not None
        assert serializer.config.concatenate_inline is True
        assert serializer.config.convert_to_unicode is True

    def test_initialization_custom_config(self):
        """Test serializer initialization with custom config."""
        config = SubscriptConfig(convert_to_unicode=False)
        serializer = ScriptAwareFallbackSerializer(config=config)

        assert serializer.config.convert_to_unicode is False

    def test_initialization_disabled_config(self):
        """Test serializer with disabled concatenation."""
        config = SubscriptConfig(concatenate_inline=False)
        serializer = ScriptAwareFallbackSerializer(config=config)

        assert serializer.config.concatenate_inline is False


class TestScriptAwareFallbackSerializerConversion:
    """Test suite for Unicode conversion in ScriptAwareFallbackSerializer."""

    def test_convert_to_unicode_subscript_single_digit(self):
        """Test conversion of single digit to subscript."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("2", "sub")
        assert result == "\u2082"

    def test_convert_to_unicode_subscript_multiple_digits(self):
        """Test conversion of multiple digits to subscript."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("123", "sub")
        # unicodeit converts the entire string as one subscript group
        assert result == "\u2081\u2082\u2083"

    def test_convert_to_unicode_superscript_single_digit(self):
        """Test conversion of single digit to superscript."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("3", "super")
        assert result == "\u00b3"

    def test_convert_to_unicode_superscript_multiple_digits(self):
        """Test conversion of multiple digits to superscript."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("456", "super")
        assert result == "\u2074\u2075\u2076"

    def test_convert_to_unicode_mixed_content(self):
        """Test conversion of mixed digits and letters."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("2e", "sub")
        # unicodeit converts both: "2" -> subscript 2, "e" -> subscript e
        assert "\u2082" in result  # subscript 2

    def test_convert_to_unicode_letters_subscript(self):
        """Test conversion of letters to subscript (unicodeit feature)."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("n", "sub")
        assert result == "\u2099"  # subscript n

    def test_convert_to_unicode_letters_superscript(self):
        """Test conversion of letters to superscript."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("n", "super")
        assert result == "\u207f"  # superscript n

    def test_convert_to_unicode_baseline_no_change(self):
        """Test that baseline text is not converted."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("123", "baseline")
        assert result == "123"

    def test_convert_to_unicode_unknown_type_no_change(self):
        """Test that unknown script type returns original text."""
        serializer = ScriptAwareFallbackSerializer()

        result = serializer._convert_to_unicode("123", "unknown")
        assert result == "123"


class TestScriptAwareFallbackSerializerHasScriptChildren:
    """Test suite for _has_script_children method."""

    def _create_mock_text_item(self, text: str, script: str = "baseline") -> Mock:
        """Create a mock TextItem with specified text and script."""
        from docling_core.types.doc.document import TextItem

        item = Mock(spec=TextItem)
        item.text = text
        item.self_ref = f"#/texts/{id(item)}"

        # Create mock formatting
        item.formatting = Mock()
        item.formatting.script = Mock()
        item.formatting.script.value = script

        return item

    def _create_mock_group_with_children(self, children: list[Mock], doc: Mock) -> Mock:
        """Create a mock GroupItem with children."""
        group = Mock()
        group.children = []

        for child in children:
            child_ref = Mock()
            child_ref.resolve = Mock(return_value=child)
            group.children.append(child_ref)

        return group

    def test_has_script_children_with_subscript(self):
        """Test detection of subscript children."""
        serializer = ScriptAwareFallbackSerializer()
        doc = Mock()

        # Create children: "tCO" (baseline), "2" (sub), "e" (baseline)
        children = [
            self._create_mock_text_item("tCO", "baseline"),
            self._create_mock_text_item("2", "sub"),
            self._create_mock_text_item("e", "baseline"),
        ]

        group = self._create_mock_group_with_children(children, doc)

        assert serializer._has_script_children(group, doc) is True

    def test_has_script_children_with_superscript(self):
        """Test detection of superscript children."""
        serializer = ScriptAwareFallbackSerializer()
        doc = Mock()

        children = [
            self._create_mock_text_item("10", "baseline"),
            self._create_mock_text_item("3", "super"),
        ]

        group = self._create_mock_group_with_children(children, doc)

        assert serializer._has_script_children(group, doc) is True

    def test_has_script_children_no_script(self):
        """Test that groups without script children return False."""
        serializer = ScriptAwareFallbackSerializer()
        doc = Mock()

        children = [
            self._create_mock_text_item("Normal", "baseline"),
            self._create_mock_text_item("text", "baseline"),
        ]

        group = self._create_mock_group_with_children(children, doc)

        assert serializer._has_script_children(group, doc) is False

    def test_has_script_children_subscript_only_config(self):
        """Test detection respects config for subscript only."""
        config = SubscriptConfig(enabled_script_types={"sub"})
        serializer = ScriptAwareFallbackSerializer(config=config)
        doc = Mock()

        # Superscript child should be ignored
        children = [
            self._create_mock_text_item("10", "baseline"),
            self._create_mock_text_item("3", "super"),
        ]

        group = self._create_mock_group_with_children(children, doc)

        assert serializer._has_script_children(group, doc) is False

    def test_has_script_children_handles_missing_formatting(self):
        """Test graceful handling of children without formatting."""
        from docling_core.types.doc.document import TextItem

        serializer = ScriptAwareFallbackSerializer()
        doc = Mock()

        # Create child without formatting
        child = Mock(spec=TextItem)
        child.text = "text"
        child.formatting = None

        child_ref = Mock()
        child_ref.resolve = Mock(return_value=child)

        group = Mock()
        group.children = [child_ref]

        # Should not raise, should return False
        assert serializer._has_script_children(group, doc) is False


class TestScriptAwareSerializerProvider:
    """Test suite for ScriptAwareSerializerProvider."""

    def test_initialization_default_config(self):
        """Test provider initialization with default config."""
        provider = ScriptAwareSerializerProvider()

        assert provider.config is not None
        assert provider.config.concatenate_inline is True

    def test_initialization_custom_config(self):
        """Test provider initialization with custom config."""
        config = SubscriptConfig(convert_to_unicode=False)
        provider = ScriptAwareSerializerProvider(config=config)

        assert provider.config.convert_to_unicode is False

    @patch(
        "document_ingestion_worker.document_parsing.subscript_serializer.ScriptAwareChunkingDocSerializer"
    )
    def test_get_serializer_creates_correct_type(self, mock_serializer_class):
        """Test that get_serializer creates ScriptAwareChunkingDocSerializer."""
        provider = ScriptAwareSerializerProvider()
        mock_doc = Mock()

        mock_serializer_class.return_value = Mock()
        _serializer = provider.get_serializer(mock_doc)

        mock_serializer_class.assert_called_once_with(doc=mock_doc, config=provider.config)

    def test_get_serializer_passes_config(self):
        """Test that provider passes config to serializer."""
        config = SubscriptConfig(convert_to_unicode=False)
        provider = ScriptAwareSerializerProvider(config=config)
        mock_doc = Mock()

        with patch(
            "document_ingestion_worker.document_parsing.subscript_serializer.ScriptAwareChunkingDocSerializer"
        ) as mock_class:
            mock_class.return_value = Mock()
            _serializer = provider.get_serializer(mock_doc)

            # Verify config was passed
            call_kwargs = mock_class.call_args[1]
            assert call_kwargs["config"] == config


class TestScriptAwareChunkingDocSerializer:
    """Test suite for ScriptAwareChunkingDocSerializer."""

    @patch(
        "document_ingestion_worker.document_parsing.subscript_serializer.ChunkingDocSerializer.__init__"
    )
    def test_initialization_creates_fallback_serializer(self, mock_parent_init):
        """Test that initialization creates ScriptAwareFallbackSerializer."""
        mock_parent_init.return_value = None
        mock_doc = Mock()

        _serializer = ScriptAwareChunkingDocSerializer(doc=mock_doc)

        # Parent should be called with fallback_serializer
        mock_parent_init.assert_called_once()
        call_kwargs = mock_parent_init.call_args[1]
        assert "fallback_serializer" in call_kwargs
        assert isinstance(call_kwargs["fallback_serializer"], ScriptAwareFallbackSerializer)

    @patch(
        "document_ingestion_worker.document_parsing.subscript_serializer.ChunkingDocSerializer.__init__"
    )
    def test_initialization_passes_config_to_fallback(self, mock_parent_init):
        """Test that config is passed to fallback serializer."""
        mock_parent_init.return_value = None
        mock_doc = Mock()
        config = SubscriptConfig(convert_to_unicode=False)

        _serializer = ScriptAwareChunkingDocSerializer(doc=mock_doc, config=config)

        call_kwargs = mock_parent_init.call_args[1]
        fallback = call_kwargs["fallback_serializer"]
        assert fallback.config.convert_to_unicode is False
