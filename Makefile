.PHONY: help build run test lint clean docker-up docker-down

help:
	@echo "Piano Lab Development Commands:"
	@echo "  make build       - Build all microservices (Go, Frontend)"
	@echo "  make run         - Run microservices locally"
	@echo "  make test        - Run test suites across services"
	@echo "  make lint        - Run linters across Go 1.26, Python 3.13, and Frontend"
	@echo "  make docker-up   - Start services via Docker Compose"
	@echo "  make docker-down - Stop Docker Compose containers"
	@echo "  make clean       - Clean temporary build artifacts"

build:
	@echo "Building Go API Gateway..."
	@cd services/api-gateway && go build -o bin/gateway ./cmd/server/main.go
	@echo "Building Frontend..."
	@cd services/frontend && npm run build

lint:
	@echo "Linting Go API Gateway..."
	@cd services/api-gateway && go vet ./...
	@echo "Linting Python AI Engine..."
	@cd services/ai-engine && python -m ruff check . && python -m mypy src
	@echo "Linting Frontend..."
	@cd services/frontend && npm run lint




test:
	@echo "Testing Go API Gateway..."
	@cd services/api-gateway && go test -v ./...
	@echo "Testing Python AI Engine..."
	@cd services/ai-engine && python -m pytest -v

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down --remove-orphans

clean:
	rm -rf services/api-gateway/bin
	rm -rf services/frontend/.next
	rm -rf services/ai-engine/__pycache__
