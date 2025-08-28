# Development commands
.PHONY: dev simulate test refresh apply clean

# Setup development environment  
dev:
	python -m venv venv
	venv\Scripts\activate && pip install -e .[dev]
	@echo "Development environment ready. Activate with: venv\Scripts\activate"

# Run the PingFederate API simulator
simulate:
	@echo "Starting PingFederate API simulator on http://localhost:8080"
	pf-agent simulate up

# Run test suite
test:
	pytest -v

# Manual license refresh
refresh:
	@echo "Triggering manual license refresh..."
	pf-agent refresh

# Example license application
apply:
	@echo "Example: Applying sample license to pf-dev-2"
	pf-agent license apply --instance pf-dev-2 --file ./samples/pf_new.lic

# Clean up build artifacts
clean:
	rmdir /s /q build dist *.egg-info __pycache__ .pytest_cache 2>nul || true
	
# Install in development mode
install:
	pip install -e .

# Run linting
lint:
	black pf_agent/
	isort pf_agent/
	mypy pf_agent/
