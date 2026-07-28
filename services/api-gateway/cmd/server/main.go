package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"piano-lab/api-gateway/internal/analysis"
	"piano-lab/api-gateway/internal/coach"
	"piano-lab/api-gateway/internal/config"
	"piano-lab/api-gateway/internal/health"
	"piano-lab/api-gateway/internal/infrastructure/pool"
	"piano-lab/api-gateway/internal/middleware"
	"piano-lab/api-gateway/internal/preset"
	"piano-lab/api-gateway/internal/ws"
)

func main() {
	log.Printf("GOMAXPROCS runtime initialized with %d CPU cores", runtime.GOMAXPROCS(0))

	cfg := config.LoadConfig()

	bufPool := pool.NewBufferPool()
	workerPool := pool.NewWorkerPool(cfg.WorkerPoolSize, cfg.WorkerPoolQueueCap)
	defer workerPool.Shutdown()

	wsHub := ws.NewHub()
	go wsHub.Run()

	aiProxy := analysis.NewAIProxyService(cfg.AIEngineURL, bufPool)
	coachProxy := coach.NewAICoachProxyService(cfg.AIEngineURL)
	presetService := preset.NewPresetService(cfg.PresetsConfigPath)

	rateLimiter := middleware.NewRateLimiter(cfg.RateLimitRPS)
	healthHandler := health.NewHandler()
	presetHandler := preset.NewHandler(presetService)
	analyzeHandler := analysis.NewHandler(workerPool, aiProxy, cfg.MaxMultipartMemory, cfg.DefaultReferenceID)
	coachHandler := coach.NewHandler(workerPool, coachProxy)
	wsHandler := ws.NewHandler(wsHub, 1000, 1000)


	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", middleware.EnableCORS(middleware.Recovery(healthHandler.Handle)))
	mux.HandleFunc("/api/v1/presets", middleware.EnableCORS(middleware.Recovery(presetHandler.Handle)))
	mux.HandleFunc("/api/v1/analyze", middleware.EnableCORS(middleware.Recovery(rateLimiter.Middleware(analyzeHandler.Handle))))
	mux.HandleFunc("/api/v1/coach/chat", middleware.EnableCORS(middleware.Recovery(rateLimiter.Middleware(coachHandler.Handle))))
	mux.HandleFunc("/api/v1/ws", wsHandler.Handle)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      mux,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	shutdownCh := make(chan os.Signal, 1)
	signal.Notify(shutdownCh, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		log.Printf("Piano Lab High-Scale API Gateway listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	<-shutdownCh
	log.Println("Shutting down High-Scale API Gateway gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Forced shutdown error: %v", err)
	}

	log.Println("API Gateway stopped cleanly.")
}
