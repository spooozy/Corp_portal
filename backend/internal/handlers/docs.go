package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/models"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func GetDocuments(c *gin.Context) {
	userID, _ := c.Get("userID")
	searchQuery := c.Query("search")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.OrganizationID == nil {
		c.JSON(http.StatusOK, []models.Document{})
		return
	}

	var docs []models.Document
	db := database.DB.Model(&models.Document{}).
		Where("organization_id = ?", *user.OrganizationID).
		Preload("Author").
		Preload("Tags")
	if user.Role < models.RoleAdmin {
		if user.TeamID != nil {
			db = db.Where("team_id IS NULL OR team_id = ?", *user.TeamID)
		} else {
			db = db.Where("team_id IS NULL")
		}
	}
	if searchQuery != "" {
		query := "%" + searchQuery + "%"
		db = db.Joins("LEFT JOIN document_tags dt ON dt.document_id = documents.id").
			Joins("LEFT JOIN tags t ON t.id = dt.tag_id").
			Where("documents.title LIKE ? OR documents.description LIKE ? OR t.name LIKE ?", query, query, query).
			Group("documents.id")
	}

	if err := db.Order("created_at desc").Find(&docs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch documents"})
		return
	}

	c.JSON(http.StatusOK, docs)
}
func UploadDocument(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	role := c.MustGet("role").(models.Role)

	title := c.PostForm("title")
	description := c.PostForm("description")
	forTeamStr := c.PostForm("for_team")
	tagsIDsStr := c.PostForm("tags_ids")

	if title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title is required"})
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	ext := filepath.Ext(file.Filename)
	newFileName := uuid.New().String() + ext
	dst := "uploads/documents/" + newFileName
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	fileURL := "http://localhost:8080/" + dst
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

	doc := models.Document{
		Title:          title,
		Description:    description,
		FileURL:        fileURL,
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
		if role < models.RoleManager && !isTeamLeader {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only leaders can upload team documents"})
			return
		}
		doc.TeamID = user.TeamID
	} else {
		if role < models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can upload global documents"})
			return
		}
	}

	database.DB.Create(&doc)
	doc.Author = user
	c.JSON(http.StatusCreated, doc)
}
