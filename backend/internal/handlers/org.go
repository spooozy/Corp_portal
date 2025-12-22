package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/models"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CreateOrgInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type CreateTeamInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	LeaderID    uint   `json:"leader_id"`
}

func CreateOrganization(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var input CreateOrgInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()

	org := models.Organization{
		Name:        input.Name,
		Description: input.Description,
		OwnerID:     userID,
	}
	if err := tx.Create(&org).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create organization"})
		return
	}
	result := tx.Model(&models.User{ID: userID}).Updates(map[string]interface{}{
		"organization_id": org.ID,
		"role":            int(models.RoleSuperAdmin),
	})

	if result.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update user role"})
		return
	}
	if result.RowsAffected == 0 {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusCreated, org)
}

func CreateTeam(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	userRole := c.MustGet("role").(models.Role)

	if userRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not enough permissions"})
		return
	}

	var input CreateTeamInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	database.DB.Select("organization_id").First(&user, userID)

	if user.OrganizationID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You are not in an organization"})
		return
	}

	var existingCount int64
	database.DB.Model(&models.Team{}).
		Where("organization_id = ? AND LOWER(name) = LOWER(?)", *user.OrganizationID, strings.TrimSpace(input.Name)).
		Count(&existingCount)

	if existingCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Команда с таким назнанием уже существует в организации",
		})
		return
	}

	team := models.Team{
		Name:           strings.TrimSpace(input.Name),
		Description:    input.Description,
		OrganizationID: *user.OrganizationID,
	}

	if input.LeaderID != 0 {
		var leader models.User
		if err := database.DB.First(&leader, input.LeaderID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Leader not found"})
			return
		}
		if leader.OrganizationID == nil || *leader.OrganizationID != *user.OrganizationID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Leader must be from the same organization"})
			return
		}

		team.LeaderID = &input.LeaderID

		if leader.Role < models.RoleManager {
			database.DB.Model(&leader).Update("role", models.RoleManager)
		}
	}

	if err := database.DB.Create(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create team"})
		return
	}

	c.JSON(http.StatusCreated, team)
}

func GetMyOrganization(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var user models.User
	database.DB.First(&user, userID)

	if user.OrganizationID == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "No organization"})
		return
	}

	var org models.Organization
	if err := database.DB.Preload("Teams").Preload("Users").First(&org, *user.OrganizationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	c.JSON(http.StatusOK, org)
}

func GetTeamByID(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	teamID := c.Param("id")

	var user models.User
	database.DB.First(&user, requestorID)

	var team models.Team
	if err := database.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}
	if user.OrganizationID == nil || team.OrganizationID != *user.OrganizationID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	response := buildTeamProfileResponse(&team)
	c.JSON(http.StatusOK, response)
}

func buildTeamProfileResponse(team *models.Team) models.TeamProfileResponse {
	response := models.TeamProfileResponse{
		ID:             team.ID,
		Name:           team.Name,
		Description:    team.Description,
		AvatarURL:      team.AvatarURL,
		OrganizationID: team.OrganizationID,
		LeaderID:       team.LeaderID,
		CreatedAt:      team.CreatedAt,
	}
	var org models.Organization
	if err := database.DB.
		Select("id", "name", "description", "avatar_url", "owner_id", "created_at").
		First(&org, team.OrganizationID).Error; err == nil {
		response.Organization = &models.OrganizationResponse{
			ID:          org.ID,
			Name:        org.Name,
			Description: org.Description,
			AvatarURL:   org.AvatarURL,
			OwnerID:     org.OwnerID,
			CreatedAt:   org.CreatedAt,
		}
	}
	if team.LeaderID != nil {
		var leader models.User
		if err := database.DB.
			Select("id", "full_name", "email", "avatar_url", "role").
			First(&leader, *team.LeaderID).Error; err == nil {
			response.Leader = &models.UserSimpleResponse{
				ID:        leader.ID,
				FullName:  leader.FullName,
				Email:     leader.Email,
				AvatarURL: leader.AvatarURL,
				Role:      leader.Role,
			}
		}
	}
	var members []models.User
	if err := database.DB.
		Select("id", "full_name", "email", "avatar_url", "role", "team_id").
		Where("team_id = ?", team.ID).
		Find(&members).Error; err == nil {
		response.Members = make([]models.UserSimpleResponse, len(members))
		for i, member := range members {
			response.Members[i] = models.UserSimpleResponse{
				ID:        member.ID,
				FullName:  member.FullName,
				Email:     member.Email,
				AvatarURL: member.AvatarURL,
				Role:      member.Role,
			}
		}
	}

	return response
}

func UpdateTeam(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)
	teamID := c.Param("id")

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		return
	}

	var team models.Team
	database.DB.First(&team, teamID)
	isLeader := team.LeaderID != nil && *team.LeaderID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isLeader && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only Team Leader or Admin can edit team"})
		return
	}

	newName := strings.TrimSpace(input.Name)
	if newName != "" && !strings.EqualFold(newName, team.Name) {
		var existingCount int64
		database.DB.Model(&models.Team{}).
			Where("organization_id = ? AND LOWER(name) = LOWER(?) AND id != ?",
				team.OrganizationID, newName, team.ID).
			Count(&existingCount)
		if existingCount > 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Это название уже занято другой командой",
			})
			return
		}
		team.Name = newName
	}

	database.DB.Model(&team).Updates(models.Team{
		Name:        input.Name,
		Description: input.Description,
	})
	c.JSON(http.StatusOK, team)
}

func UpdateOrganization(c *gin.Context) {
	requestorRole := c.MustGet("role").(models.Role)
	orgID := c.Param("id")

	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only Admins can edit organization"})
		return
	}

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	c.ShouldBindJSON(&input)

	var org models.Organization
	database.DB.First(&org, orgID)

	database.DB.Model(&org).Updates(models.Organization{
		Name:        input.Name,
		Description: input.Description,
	})
	c.JSON(http.StatusOK, org)
}
func GetOrganizationByID(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	targetOrgID := c.Param("id")

	var user models.User
	database.DB.First(&user, requestorID)

	var org models.Organization
	if err := database.DB.First(&org, targetOrgID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Org not found"})
		return
	}
	if user.OrganizationID == nil || *user.OrganizationID != org.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	response := buildOrganizationProfileResponse(&org)

	c.JSON(http.StatusOK, response)
}

func buildOrganizationProfileResponse(org *models.Organization) models.OrganizationProfileResponse {
	response := models.OrganizationProfileResponse{
		ID:          org.ID,
		Name:        org.Name,
		Description: org.Description,
		AvatarURL:   org.AvatarURL,
		OwnerID:     org.OwnerID,
		CreatedAt:   org.CreatedAt,
	}
	var teams []models.Team
	if err := database.DB.
		Select("id", "name", "description", "avatar_url", "organization_id", "leader_id", "created_at").
		Where("organization_id = ?", org.ID).
		Find(&teams).Error; err == nil {

		response.Teams = make([]models.TeamResponse, len(teams))
		for i, team := range teams {
			teamResponse := models.TeamResponse{
				ID:             team.ID,
				Name:           team.Name,
				Description:    team.Description,
				AvatarURL:      team.AvatarURL,
				OrganizationID: team.OrganizationID,
				LeaderID:       team.LeaderID,
				CreatedAt:      team.CreatedAt,
			}
			if team.LeaderID != nil {
				var leader models.User
				if err := database.DB.
					Select("id", "full_name", "email", "avatar_url", "role").
					First(&leader, *team.LeaderID).Error; err == nil {
					teamResponse.Leader = &models.UserSimpleResponse{
						ID:        leader.ID,
						FullName:  leader.FullName,
						Email:     leader.Email,
						AvatarURL: leader.AvatarURL,
						Role:      leader.Role,
					}
				}
			}
			response.Teams[i] = teamResponse
		}
	}
	var users []models.User
	if err := database.DB.
		Select("id", "full_name", "email", "avatar_url", "role", "team_id", "created_at").
		Where("organization_id = ?", org.ID).
		Find(&users).Error; err == nil {

		response.Users = make([]models.UserSimpleResponse, len(users))
		for i, user := range users {
			response.Users[i] = models.UserSimpleResponse{
				ID:        user.ID,
				FullName:  user.FullName,
				Email:     user.Email,
				AvatarURL: user.AvatarURL,
				Role:      user.Role,
			}
		}
	}

	return response
}

func UploadTeamAvatar(c *gin.Context) {
	teamID := c.Param("id")
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)

	var team models.Team
	if err := database.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	isLeader := team.LeaderID != nil && *team.LeaderID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isLeader && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}
	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type"})
		return
	}
	filename := fmt.Sprintf("team_%s_%d%s", teamID, time.Now().Unix(), ext)
	uploadPath := filepath.Join("uploads", "team_avatars", filename)

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	avatarURL := fmt.Sprintf("/uploads/team_avatars/%s", filename)

	if err := database.DB.Model(&team).Update("avatar_url", avatarURL).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Avatar uploaded successfully",
		"avatar_url": avatarURL,
	})
}

func RemoveTeamAvatar(c *gin.Context) {
	teamID := c.Param("id")
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)

	var team models.Team
	if err := database.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	isLeader := team.LeaderID != nil && *team.LeaderID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isLeader && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}
	if err := database.DB.Model(&team).Update("avatar_url", "").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Avatar removed"})
}

func UploadOrganizationAvatar(c *gin.Context) {
	orgID := c.Param("id")
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)

	var org models.Organization
	if err := database.DB.First(&org, orgID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	isOwner := org.OwnerID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isOwner && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type"})
		return
	}

	filename := fmt.Sprintf("org_%s_%d%s", orgID, time.Now().Unix(), ext)
	uploadPath := filepath.Join("uploads", "org_avatars", filename)

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	avatarURL := fmt.Sprintf("/uploads/org_avatars/%s", filename)
	if err := database.DB.Model(&org).Update("avatar_url", avatarURL).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Avatar uploaded successfully",
		"avatar_url": avatarURL,
	})
}

func RemoveOrganizationAvatar(c *gin.Context) {
	orgID := c.Param("id")
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)

	var org models.Organization
	if err := database.DB.First(&org, orgID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	isOwner := org.OwnerID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isOwner && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	if err := database.DB.Model(&org).Update("avatar_url", "").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Avatar removed"})
}

func GetFreeUsersInOrganization(c *gin.Context) {
	orgID := c.Param("id")

	var freeUsers []models.User
	if err := database.DB.
		Select("id", "full_name", "email", "avatar_url", "role").
		Where("organization_id = ? AND (team_id IS NULL OR team_id = 0)", orgID).
		Find(&freeUsers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	response := make([]models.UserSimpleResponse, len(freeUsers))
	for i, u := range freeUsers {
		response[i] = models.UserSimpleResponse{
			ID:        u.ID,
			FullName:  u.FullName,
			Email:     u.Email,
			AvatarURL: u.AvatarURL,
			Role:      u.Role,
		}
	}

	c.JSON(http.StatusOK, response)
}

func AddTeamMember(c *gin.Context) {
	teamID := c.Param("id")
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)

	var input struct {
		UserID uint `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var team models.Team
	if err := database.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	isLeader := team.LeaderID != nil && *team.LeaderID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isLeader && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only Leader or Admin can add members"})
		return
	}

	var targetUser models.User
	if err := database.DB.First(&targetUser, input.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if targetUser.OrganizationID == nil || *targetUser.OrganizationID != team.OrganizationID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User belongs to another organization"})
		return
	}
	if targetUser.TeamID != nil && *targetUser.TeamID != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is already in a team"})
		return
	}

	if err := database.DB.Model(&targetUser).Update("team_id", team.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User added to team"})
}

func RemoveTeamMember(c *gin.Context) {
	teamID := c.Param("id")
	targetUserID := c.Param("userId")

	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)

	var team models.Team
	if err := database.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	isLeader := team.LeaderID != nil && *team.LeaderID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isLeader && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	var targetUser models.User
	if err := database.DB.First(&targetUser, targetUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if targetUser.TeamID == nil || *targetUser.TeamID != team.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is not in this team"})
		return
	}

	if team.LeaderID != nil && *team.LeaderID == targetUser.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove team leader. Change leader first."})
		return
	}

	if err := database.DB.Model(&targetUser).Update("team_id", gorm.Expr("NULL")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User removed from team"})
}

func DeleteTeam(c *gin.Context) {
	teamID := c.Param("id")
	requestorRole := c.MustGet("role").(models.Role)

	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	var team models.Team
	if err := database.DB.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	tx := database.DB.Begin()
	if err := tx.Model(&models.User{}).Where("team_id = ?", team.ID).Update("team_id", gorm.Expr("NULL")).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update members"})
		return
	}
	if team.LeaderID != nil {
		var leader models.User
		if err := tx.First(&leader, *team.LeaderID).Error; err == nil {
			if leader.Role == models.RoleManager {
				tx.Model(&leader).Update("role", models.RoleUser)
			}
		}
	}
	if err := tx.Delete(&team).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete team"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Team deleted"})
}

type UpdateLeaderInput struct {
	LeaderID *uint `json:"leader_id"`
}

func UpdateTeamLeader(c *gin.Context) {
	teamID := c.Param("id")
	requestorRole := c.MustGet("role").(models.Role)

	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	var input UpdateLeaderInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var team models.Team
	if err := tx.First(&team, teamID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	if team.LeaderID != nil {
		var oldLeader models.User
		if err := tx.First(&oldLeader, *team.LeaderID).Error; err == nil {
			if oldLeader.Role == models.RoleManager {
				var otherTeamsCount int64
				if err := tx.Model(&models.Team{}).
					Where("leader_id = ? AND id != ?", oldLeader.ID, team.ID).
					Count(&otherTeamsCount).Error; err == nil && otherTeamsCount == 0 {
					if err := tx.Model(&oldLeader).Update("role", models.RoleUser).Error; err != nil {
						tx.Rollback()
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to demote old leader"})
						return
					}
				}
			}
		}
	}
	if input.LeaderID != nil && *input.LeaderID != 0 {
		var newLeader models.User
		if err := tx.First(&newLeader, *input.LeaderID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": "New leader not found"})
			return
		}

		if newLeader.OrganizationID == nil || *newLeader.OrganizationID != team.OrganizationID {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "User belongs to another organization"})
			return
		}
		if newLeader.TeamID == nil || *newLeader.TeamID != team.ID {
			if err := tx.Model(&newLeader).Update("team_id", team.ID).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add leader to team"})
				return
			}
		}
		if newLeader.Role < models.RoleManager {
			if err := tx.Model(&newLeader).Update("role", models.RoleManager).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to promote new leader"})
				return
			}
		}

		team.LeaderID = input.LeaderID
	} else {
		team.LeaderID = nil
	}

	if err := tx.Save(&team).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update team"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Leader updated successfully"})
}
