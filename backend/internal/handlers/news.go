package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/models"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetTags(c *gin.Context) {
	var tags []models.Tag
	if err := database.DB.Order("name asc").Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}
	c.JSON(http.StatusOK, tags)
}

func GetNewsFeed(c *gin.Context) {
	userID, _ := c.Get("userID")
	searchQuery := c.Query("search")
	tagIDsParam := c.Query("tag_ids")
	authorIDsParam := c.Query("author_ids")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.OrganizationID == nil {
		c.JSON(http.StatusOK, []models.News{})
		return
	}

	var news []models.News

	db := database.DB.Model(&models.News{}).
		Where("organization_id = ?", *user.OrganizationID).
		Preload("Author").
		Preload("Tags")

	if user.Role < models.RoleAdmin {
		if user.TeamID != nil {
			db = db.Where("news.team_id IS NULL OR news.team_id = ?", *user.TeamID)
		} else {
			db = db.Where("news.team_id IS NULL")
		}
	}

	if authorIDsParam != "" {
		authorIDs := strings.Split(authorIDsParam, ",")
		db = db.Where("news.author_id IN ?", authorIDs)
	}

	if tagIDsParam != "" {
		tagIDs := strings.Split(tagIDsParam, ",")
		db = db.Joins("JOIN news_tags filter_nt ON filter_nt.news_id = news.id").
			Where("filter_nt.tag_id IN ?", tagIDs).
			Group("news_id")
	}

	if searchQuery != "" {
		query := "%" + searchQuery + "%"
		db = db.Joins("LEFT JOIN news_tags nt ON nt.news_id = news.id").
			Joins("LEFT JOIN tags t ON t.id = nt.tag_id").
			Where("(news.title LIKE ? OR news.content LIKE ? OR t.name LIKE ?)", query, query, query).
			Group("news.id")
	}

	if err := db.Order("created_at desc").Find(&news).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch news"})
		return
	}

	c.JSON(http.StatusOK, news)
}

func CreateNews(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	role := c.MustGet("role").(models.Role)
	title := c.PostForm("title")
	content := c.PostForm("content")
	forTeamStr := c.PostForm("for_team")
	tagsIDsStr := c.PostForm("tags_ids")

	if title == "" || content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title and Content are required"})
		return
	}
	var imagePath string
	file, err := c.FormFile("image")
	if err == nil {
		ext := filepath.Ext(file.Filename)
		newFileName := uuid.New().String() + ext
		dst := "uploads/news/" + newFileName

		if err := c.SaveUploadedFile(file, dst); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
			return
		}
		imagePath = "http://localhost:8080/" + dst
	}

	var user models.User
	if err := database.DB.Preload("Team").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var tags []models.Tag
	if tagsIDsStr != "" {
		idStrings := strings.Split(tagsIDsStr, ",")
		var ids []uint
		for _, idStr := range idStrings {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				ids = append(ids, uint(id))
			}
		}
		if len(ids) > 0 {
			database.DB.Where("id IN ?", ids).Find(&tags)
		}
	}
	news := models.News{
		Title:          title,
		Content:        content,
		ImageURL:       imagePath,
		Tags:           tags,
		OrganizationID: *user.OrganizationID,
		AuthorID:       userID,
		CreatedAt:      time.Now(),
	}
	forTeam, _ := strconv.ParseBool(forTeamStr)

	if forTeam {
		if user.TeamID == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You are not in a team"})
			return
		}
		isTeamLeader := user.Team != nil && user.Team.LeaderID != nil && *user.Team.LeaderID == user.ID
		if role < models.RoleAdmin && !isTeamLeader {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only team leaders can post team news"})
			return
		}
		news.TeamID = user.TeamID
	} else {
		if role < models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can post global news"})
			return
		}
	}

	if err := database.DB.Create(&news).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create news"})
		return
	}
	news.Author = user
	c.JSON(http.StatusCreated, news)
}

func GetOrganizationAuthors(c *gin.Context) {
	userID, _ := c.Get("userID")
	var currentUser models.User
	if err := database.DB.First(&currentUser, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var authors []models.User
	err := database.DB.Where("organization_id = ? AND role > ?", currentUser.OrganizationID, 1).
		Select("id, full_name").
		Order("full_name asc").
		Find(&authors).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch authors"})
		return
	}
	c.JSON(http.StatusOK, authors)
}

func UpdateNews(c *gin.Context) {
	newsID := c.Param("id")
	userID := c.MustGet("userID").(uint)
	role := c.MustGet("role").(models.Role)

	var news models.News
	if err := database.DB.Preload("Tags").First(&news, newsID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "News not found"})
		return
	}

	if news.AuthorID != userID && role < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	file, err := c.FormFile("image")
	if err == nil {
		oldImageURL := news.ImageURL

		ext := filepath.Ext(file.Filename)
		newFileName := uuid.New().String() + ext
		dst := "uploads/news/" + newFileName

		if err := c.SaveUploadedFile(file, dst); err == nil {
			news.ImageURL = "http://localhost:8080/" + dst
			if oldImageURL != "" {
				RemoveFileFromURL(oldImageURL)
			}
		}
	}

	news.Title = c.PostForm("title")
	news.Content = c.PostForm("content")
	news.UpdatedAt = time.Now()
	tagsIDsStr := c.PostForm("tags_ids")
	var tags []models.Tag

	if tagsIDsStr != "" {
		idStrings := strings.Split(tagsIDsStr, ",")
		var ids []uint
		for _, idStr := range idStrings {
			if id, err := strconv.Atoi(strings.TrimSpace(idStr)); err == nil {
				ids = append(ids, uint(id))
			}
		}
		if len(ids) > 0 {
			database.DB.Where("id IN ?", ids).Find(&tags)
		}
	}

	if err := database.DB.Model(&news).Association("Tags").Replace(tags); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tags"})
		return
	}

	if err := database.DB.Save(&news).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}

	c.JSON(http.StatusOK, news)
}

func DeleteNews(c *gin.Context) {
	newsID := c.Param("id")
	userID := c.MustGet("userID").(uint)
	role := c.MustGet("role").(models.Role)

	var news models.News
	if err := database.DB.First(&news, newsID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "News not found"})
		return
	}

	if news.AuthorID != userID && role < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	if news.ImageURL != "" {
		RemoveFileFromURL(news.ImageURL)
	}

	if err := database.DB.Delete(&news).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete from DB"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "News and image deleted"})
}

func RemoveFileFromURL(fileURL string) {
	if fileURL == "" {
		return
	}
	prefix := "http://localhost:8080/"
	if strings.HasPrefix(fileURL, prefix) {
		relativePath := strings.TrimPrefix(fileURL, prefix)
		_ = os.Remove(relativePath)
	}
}
