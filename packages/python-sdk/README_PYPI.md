# SVG API Python SDK

A production-ready Python client for the SVG API - access 50,000+ icons from 20+ open-source libraries.

_This file contains additional PyPI-specific packaging documentation._

## Development

### Setup

```bash
# Install poetry
pip install poetry

# Install dependencies
poetry install

# Install with dev dependencies
poetry install --with dev
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=svg_api --cov-report=html

# Run specific test file
poetry run pytest tests/test_client.py
```

### Code Quality

```bash
# Format code
poetry run ruff check svg_api --fix

# Type checking
poetry run mypy svg_api

# Run pre-commit hooks
poetry run pre-commit run --all-files
```

### Building

```bash
# Build package
poetry build

# Check package
poetry check
```

### Publishing

```bash
# Publish to PyPI (requires credentials)
poetry publish

# Or build and publish manually
poetry build
twine upload dist/*
```

## Project Structure

```
svg_api/
├── svg_api/
│   ├── __init__.py      # Package exports
│   ├── client.py        # Main client classes
│   ├── types.py         # Pydantic models
│   ├── errors.py        # Exception classes
│   └── utils.py         # Helper functions
├── examples/            # Usage examples
├── tests/              # Test suite (to be added)
├── pyproject.toml      # Poetry configuration
├── README.md           # Main documentation
└── LICENSE             # MIT License
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `poetry run ruff check svg_api --fix`
6. Run `poetry run mypy svg_api`
7. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
