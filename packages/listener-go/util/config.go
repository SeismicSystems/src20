package util

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

func LoadEnv() {
	envPath := filepath.Join("..", "contracts", ".env")
	err := godotenv.Load(envPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load environment variables: %v", err)
	}
}

func RequireEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		fmt.Fprintf(os.Stderr, "Missing required environment variable: %s", key)
	}
	return value
}
