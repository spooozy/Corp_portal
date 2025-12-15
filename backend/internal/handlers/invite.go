package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Вспомогательная функция для получения текущего пользователя
func getUserFromContext(c *gin.Context) (models.User, error) {
	userID := c.MustGet("userID").(uint)
	var user models.User
	// Загружаем пользователя, чтобы узнать его OrganizationID
	if err := database.DB.First(&user, userID).Error; err != nil {
		return user, err
	}
	return user, nil
}

type CreateInviteInput struct {
	ExpiresInHours int `json:"expires_in_hours" binding:"required,min=1"`
	MaxUses        int `json:"max_uses" binding:"required,min=1"`
}

func CreateInvite(c *gin.Context) {
	requestorRole := c.MustGet("role").(models.Role)
	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	// ИСПРАВЛЕНИЕ: Загружаем пользователя из БД по ID
	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	var input CreateInviteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if user.OrganizationID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You must be in an organization"})
		return
	}

	invite := models.Invite{
		Token:          uuid.New().String(),
		OrganizationID: *user.OrganizationID,
		CreatedByID:    user.ID,
		ExpiresAt:      time.Now().Add(time.Hour * time.Duration(input.ExpiresInHours)),
		MaxUses:        input.MaxUses,
		Uses:           0,
	}

	if err := database.DB.Create(&invite).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create invite"})
		return
	}

	c.JSON(http.StatusCreated, invite)
}

func GetInvitesForOrganization(c *gin.Context) {
	requestorRole := c.MustGet("role").(models.Role)
	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.OrganizationID == nil {
		c.JSON(http.StatusOK, []models.Invite{})
		return
	}

	var invites []models.Invite
	database.DB.Preload("CreatedBy").Where("organization_id = ?", user.OrganizationID).Find(&invites)

	print("INVITES")
	print(invites)
	c.JSON(http.StatusOK, invites)
}

func DeleteInvite(c *gin.Context) {
	requestorRole := c.MustGet("role").(models.Role)
	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}
	token := c.Param("token")
	print("---TOKEN----")
	print(token)
	result := database.DB.Where("token = ?", token).Delete(&models.Invite{})
	if result.Error != nil || result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invite not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invite deleted"})
}

func JoinByInvite(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	token := c.Param("token")

	tx := database.DB.Begin()

	var invite models.Invite
	// Используем блокировку для предотвращения гонки при параллельных запросах
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("token = ?", token).First(&invite).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Invite not found"})
		return
	}

	if time.Now().After(invite.ExpiresAt) {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invite has expired"})
		return
	}
	if invite.Uses >= invite.MaxUses {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invite has reached its use limit"})
		return
	}

	// Сбрасываем текущую команду и организацию перед вступлением
	err := tx.Model(&models.User{}).Where("id = ?", userID).Updates(map[string]interface{}{
		"organization_id": invite.OrganizationID,
		"team_id":         gorm.Expr("NULL"), // Сброс команды
		"role":            models.RoleUser,   // Сброс роли на обычного юзера
	}).Error

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	if err := tx.Model(&invite).Update("uses", gorm.Expr("uses + 1")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invite usage"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Successfully joined organization"})
}

func GetPotentialLeaders(c *gin.Context) {
	requestorRole := c.MustGet("role").(models.Role)
	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	user, err := getUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	currentTeamID := c.Query("team_id")

	var potentialLeaders []models.User

	query := database.DB.Select("id", "full_name", "email", "avatar_url").
		Where("organization_id = ?", user.OrganizationID)

	if currentTeamID != "" {
		query = query.Where(
			"(id NOT IN (SELECT leader_id FROM teams WHERE leader_id IS NOT NULL AND id != ?) OR id IN (SELECT leader_id FROM teams WHERE id = ?))",
			currentTeamID, currentTeamID,
		)
	} else {
		query = query.Where("id NOT IN (SELECT leader_id FROM teams WHERE leader_id IS NOT NULL)")
	}

	if err := query.Find(&potentialLeaders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	c.JSON(http.StatusOK, potentialLeaders)
}
