package middleware

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadConfig struct {
	MaxSize      int64
	AllowedTypes []string
	UploadDir    string
	FieldName    string
}

func DefaultUploadConfig(uploadDir string) UploadConfig {
	return UploadConfig{
		MaxSize:      5 * 1024 * 1024, // 5MB
		AllowedTypes: []string{"image/jpeg", "image/png", "image/gif", "image/webp"},
		UploadDir:    uploadDir,
		FieldName:    "avatar",
	}
}

func Upload(config UploadConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != "POST" && c.Request.Method != "PUT" {
			c.Next()
			return
		}
		file, header, err := c.Request.FormFile(config.FieldName)
		if err != nil {
			c.Set("hasFile", false)
			c.Next()
			return
		}
		defer file.Close()

		if header.Size > config.MaxSize {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Файл слишком большой. Максимальный размер: %dMB", config.MaxSize/(1024*1024)),
			})
			c.Abort()
			return
		}
		buffer := make([]byte, 512)
		_, err = file.Read(buffer)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Не удалось прочитать файл"})
			c.Abort()
			return
		}
		file.Seek(0, 0)

		mimeType := http.DetectContentType(buffer)
		allowed := false
		for _, t := range config.AllowedTypes {
			if t == mimeType {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Недопустимый тип файла. Разрешены: %s", strings.Join(config.AllowedTypes, ", ")),
			})
			c.Abort()
			return
		}
		ext := filepath.Ext(header.Filename)
		if ext == "" {
			switch mimeType {
			case "image/jpeg":
				ext = ".jpg"
			case "image/png":
				ext = ".png"
			case "image/gif":
				ext = ".gif"
			case "image/webp":
				ext = ".webp"
			default:
				ext = ".jpg"
			}
		}

		fileName := fmt.Sprintf("%s_%d%s",
			uuid.New().String()[:8],
			time.Now().Unix(),
			strings.ToLower(ext))

		if err := os.MkdirAll(config.UploadDir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось создать папку для загрузки"})
			c.Abort()
			return
		}

		filePath := filepath.Join(config.UploadDir, fileName)

		dst, err := os.Create(filePath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить файл"})
			c.Abort()
			return
		}
		defer dst.Close()
		if _, err = io.Copy(dst, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось сохранить файл"})
			c.Abort()
			return
		}
		c.Set("hasFile", true)
		c.Set("fileName", fileName)
		c.Set("filePath", filePath)
		c.Set("originalName", header.Filename)
		c.Set("fileSize", header.Size)
		c.Set("mimeType", mimeType)

		c.Next()
	}
}
