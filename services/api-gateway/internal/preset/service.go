package preset

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
)

type Service interface {
	GetPresets(ctx context.Context) ([]PresetPiece, error)
}

type FilePresetService struct {
	configPath string
}

func NewPresetService(configPath string) *FilePresetService {
	return &FilePresetService{
		configPath: configPath,
	}
}

func (s *FilePresetService) GetPresets(ctx context.Context) ([]PresetPiece, error) {
	pathsToTry := []string{
		s.configPath,
		filepath.Join("..", s.configPath),
		filepath.Join("..", "..", s.configPath),
		"configs/presets.json",
		"../configs/presets.json",
	}

	var data []byte
	var err error

	for _, path := range pathsToTry {
		if path == "" {
			continue
		}
		data, err = os.ReadFile(path)
		if err == nil {
			break
		}
	}

	if err != nil {
		return []PresetPiece{}, err
	}

	var presets []PresetPiece
	if err := json.Unmarshal(data, &presets); err != nil {
		return []PresetPiece{}, err
	}

	return presets, nil
}
