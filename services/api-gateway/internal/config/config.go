package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port                string
	AIEngineURL         string
	WorkerPoolSize      int
	WorkerPoolQueueCap  int
	RateLimitRPS        float64
	MaxMultipartMemory  int64
	PresetsConfigPath   string
	DefaultReferenceID  string
	ReadTimeout         time.Duration
	WriteTimeout        time.Duration
	IdleTimeout         time.Duration
	ShutdownTimeout     time.Duration
}

func LoadConfig() *Config {
	port := getEnv("PORT", "8080")
	aiEngineURL := getEnv("AI_ENGINE_URL", "http://localhost:8000")
	workerPoolSize := getEnvAsInt("WORKER_POOL_SIZE", 10)
	workerQueueCap := getEnvAsInt("WORKER_POOL_QUEUE_CAPACITY", 100)
	rateLimitRPS := getEnvAsFloat("RATE_LIMIT_RPS", 100.0)
	maxMemoryMB := getEnvAsInt("MAX_MULTIPART_MEMORY_MB", 32)
	presetsConfigPath := getEnv("PRESETS_CONFIG_PATH", "configs/presets.json")
	defaultRefID := getEnv("DEFAULT_REFERENCE_ID", "pirates-of-the-caribbean")
	readTimeoutSec := getEnvAsInt("SERVER_READ_TIMEOUT_SEC", 90)
	writeTimeoutSec := getEnvAsInt("SERVER_WRITE_TIMEOUT_SEC", 120)
	idleTimeoutSec := getEnvAsInt("SERVER_IDLE_TIMEOUT_SEC", 120)
	shutdownTimeoutSec := getEnvAsInt("SERVER_SHUTDOWN_TIMEOUT_SEC", 10)

	return &Config{
		Port:                port,
		AIEngineURL:         aiEngineURL,
		WorkerPoolSize:      workerPoolSize,
		WorkerPoolQueueCap:  workerQueueCap,
		RateLimitRPS:        rateLimitRPS,
		MaxMultipartMemory:  int64(maxMemoryMB) << 20,
		PresetsConfigPath:   presetsConfigPath,
		DefaultReferenceID:  defaultRefID,
		ReadTimeout:         time.Duration(readTimeoutSec) * time.Second,
		WriteTimeout:        time.Duration(writeTimeoutSec) * time.Second,
		IdleTimeout:         time.Duration(idleTimeoutSec) * time.Second,
		ShutdownTimeout:     time.Duration(shutdownTimeoutSec) * time.Second,
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	valStr := getEnv(key, "")
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultVal
}

func getEnvAsFloat(key string, defaultVal float64) float64 {
	valStr := getEnv(key, "")
	if val, err := strconv.ParseFloat(valStr, 64); err == nil {
		return val
	}
	return defaultVal
}
