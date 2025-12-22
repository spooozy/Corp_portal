package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/middleware"
	"corp-portal/internal/models"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type UpdateUserInput struct {
	Bio      string `json:"bio"`
	Phone    string `json:"phone"`
	FullName string `json:"full_name"`
	Role     *int   `json:"role"`
	TeamID   *uint  `json:"team_id"`
}

func DeleteAccount(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var user models.User
	database.DB.First(&user, userID)

	if user.Role == models.RoleSuperAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Owner cannot delete account. Delete organization first or transfer ownership."})
		return
	}

	database.DB.Delete(&user)
	c.JSON(http.StatusOK, gin.H{"message": "Account deleted"})
}

func LeaveOrganization(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var user models.User
	database.DB.First(&user, userID)

	if user.Role == models.RoleSuperAdmin {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Owner cannot leave organization."})
		return
	}

	database.DB.Model(&user).Updates(map[string]interface{}{
		"organization_id": nil,
		"team_id":         nil,
		"role":            models.RoleUser,
	})

	c.JSON(http.StatusOK, gin.H{"message": "You left the organization"})
}

func GetUserByID(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	targetID := c.Param("id")

	var requestor models.User
	database.DB.First(&requestor, requestorID)

	var target models.User
	if err := database.DB.First(&target, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if requestor.ID != target.ID {
		if requestor.OrganizationID == nil || target.OrganizationID == nil || *requestor.OrganizationID != *target.OrganizationID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only view profiles within your organization"})
			return
		}
	}
	response := buildUserProfileResponse(&target)
	c.JSON(http.StatusOK, response)
}

func buildUserProfileResponse(user *models.User) models.UserProfileResponse {
	response := models.UserProfileResponse{
		ID:             user.ID,
		Email:          user.Email,
		FullName:       user.FullName,
		AvatarURL:      user.AvatarURL,
		Bio:            user.Bio,
		Phone:          user.Phone,
		OrganizationID: user.OrganizationID,
		TeamID:         user.TeamID,
		Role:           user.Role,
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      user.UpdatedAt,
	}

	if user.OrganizationID != nil {
		var org models.Organization
		if err := database.DB.
			Select("id", "name", "description", "avatar_url", "owner_id", "created_at").
			First(&org, *user.OrganizationID).Error; err == nil {
			response.Organization = &models.OrganizationResponse{
				ID:          org.ID,
				Name:        org.Name,
				Description: org.Description,
				AvatarURL:   org.AvatarURL,
				OwnerID:     org.OwnerID,
				CreatedAt:   org.CreatedAt,
			}
		}
	}

	if user.TeamID != nil {
		var team models.Team
		if err := database.DB.
			Select("id", "name", "description", "avatar_url", "organization_id", "leader_id", "created_at").
			First(&team, *user.TeamID).Error; err == nil {

			teamResponse := &models.TeamResponse{
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
			response.Team = teamResponse
		}
	}

	return response
}

func UpdateUserByID(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)
	targetID := c.Param("id")

	targetIDUint, err := strconv.ParseUint(targetID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	var target models.User
	if err := database.DB.First(&target, targetIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	isSelf := target.ID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isSelf && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}
	fullName := c.PostForm("full_name")
	bio := c.PostForm("bio")
	phone := c.PostForm("phone")
	teamIDStr := c.PostForm("team_id")
	roleStr := c.PostForm("role")

	updates := make(map[string]interface{})
	if c.Request.Form != nil {
		if _, hasFullName := c.Request.Form["full_name"]; hasFullName {
			updates["full_name"] = fullName
		}
		if _, hasBio := c.Request.Form["bio"]; hasBio {
			updates["bio"] = bio
		}
		if _, hasPhone := c.Request.Form["phone"]; hasPhone {
			updates["phone"] = phone
		}
	}

	if isAdmin {
		if c.Request.Form != nil {
			if _, hasTeamID := c.Request.Form["team_id"]; hasTeamID && teamIDStr != "" {
				teamIDUint, err := strconv.ParseUint(teamIDStr, 10, 32)
				if err == nil {
					teamID := uint(teamIDUint)
					if teamID == 0 {
						updates["team_id"] = nil
					} else {
						var team models.Team
						if err := database.DB.First(&team, teamID).Error; err == nil {
							if target.OrganizationID != nil && team.OrganizationID == *target.OrganizationID {
								updates["team_id"] = teamID
							}
						}
					}
				}
			}

			if _, hasRole := c.Request.Form["role"]; hasRole && roleStr != "" {
				roleInt, err := strconv.Atoi(roleStr)
				if err == nil && roleInt >= int(models.RoleUser) && roleInt <= int(models.RoleSuperAdmin) {
					updates["role"] = roleInt
				}
			}
		}
	}
	if file, err := c.FormFile("avatar"); err == nil && file != nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
		if !allowedExts[ext] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type"})
			return
		}

		filename := fmt.Sprintf("user_%d_%d%s", target.ID, time.Now().Unix(), ext)
		uploadPath := filepath.Join("uploads", "avatars", filename)

		os.MkdirAll(filepath.Dir(uploadPath), 0755)

		if err := c.SaveUploadedFile(file, uploadPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
			return
		}

		if target.AvatarURL != "" && strings.HasPrefix(target.AvatarURL, "/uploads/avatars/") {
			oldPath := filepath.Join("uploads", "avatars", filepath.Base(target.AvatarURL))
			os.Remove(oldPath)
		}

		updates["avatar_url"] = "/uploads/avatars/" + filename
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&target).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user: " + err.Error()})
			return
		}
		database.DB.First(&target, target.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    buildUserProfileResponse(&target),
	})
}

func UploadAvatar(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	config := middleware.DefaultUploadConfig("uploads/avatars")
	middleware.Upload(config)(c)

	if c.IsAborted() {
		return
	}

	if hasFile, _ := c.Get("hasFile"); !hasFile.(bool) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	fileName, _ := c.Get("fileName")

	if user.AvatarURL != "" && !strings.HasPrefix(user.AvatarURL, "http") {
		oldPath := filepath.Join("uploads/avatars", filepath.Base(user.AvatarURL))
		os.Remove(oldPath)
	}

	avatarURL := "/uploads/avatars/" + fileName.(string)
	if err := database.DB.Model(&user).Update("avatar_url", avatarURL).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Avatar uploaded successfully",
		"avatar_url": avatarURL,
	})
}

func UploadUserAvatar(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)
	targetID := c.Param("id")

	targetIDUint, err := strconv.ParseUint(targetID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var target models.User
	if err := database.DB.First(&target, targetIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	isSelf := target.ID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isSelf && !isAdmin {
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

	filename := fmt.Sprintf("user_%d_%d%s", target.ID, time.Now().Unix(), ext)
	uploadPath := filepath.Join("uploads", "avatars", filename)

	if err := os.MkdirAll(filepath.Dir(uploadPath), 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory"})
		return
	}

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Удаляем старый аватар
	if target.AvatarURL != "" && strings.HasPrefix(target.AvatarURL, "/uploads/avatars/") {
		oldPath := filepath.Join("uploads", "avatars", filepath.Base(target.AvatarURL))
		if _, err := os.Stat(oldPath); err == nil {
			os.Remove(oldPath)
		}
	}

	avatarURL := "/uploads/avatars/" + filename
	if err := database.DB.Model(&target).Update("avatar_url", avatarURL).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Avatar uploaded successfully",
		"avatar_url": avatarURL,
	})
}

func RemoveUserAvatar(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)
	targetID := c.Param("id")

	targetIDUint, err := strconv.ParseUint(targetID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var target models.User
	if err := database.DB.First(&target, targetIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	isSelf := target.ID == requestorID
	isAdmin := requestorRole >= models.RoleAdmin

	if !isSelf && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	if target.AvatarURL != "" && strings.HasPrefix(target.AvatarURL, "/uploads/avatars/") {
		fileName := filepath.Base(target.AvatarURL)
		filePath := filepath.Join("uploads", "avatars", fileName)

		if _, err := os.Stat(filePath); err == nil {
			if err := os.Remove(filePath); err != nil {
				fmt.Printf("Failed to remove avatar file: %v\n", err)
			}
		}
	}

	if err := database.DB.Model(&target).Update("avatar_url", "").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Avatar removed successfully",
	})
}

func KickFromOrganization(c *gin.Context) {
	requestorID := c.MustGet("userID").(uint)
	requestorRole := c.MustGet("role").(models.Role)
	targetID := c.Param("id")

	if requestorRole < models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can remove members"})
		return
	}

	var requestor models.User
	database.DB.First(&requestor, requestorID)

	var target models.User
	if err := database.DB.First(&target, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if requestor.ID == target.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Use 'Leave' to exit organization yourself"})
		return
	}

	if requestor.OrganizationID == nil || target.OrganizationID == nil || *requestor.OrganizationID != *target.OrganizationID {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not in your organization"})
		return
	}

	if target.Role == models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot remove the organization owner"})
		return
	}

	err := database.DB.Model(&target).Updates(map[string]interface{}{
		"organization_id": nil,
		"team_id":         nil,
		"role":            models.RoleUser,
	}).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("User %s removed from organization", target.FullName)})
}
