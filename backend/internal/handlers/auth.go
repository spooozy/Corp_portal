package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/models"
	"corp-portal/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type RegisterInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		Email:    input.Email,
		Password: string(hashedPassword),
		FullName: input.FullName,
		Role:     models.RoleUser,
	}

	if result := database.DB.Create(&user); result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User with this email already exists"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Registration successful"})
}

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, err := utils.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":        user.ID,
			"full_name": user.FullName,
			"role":      user.Role,
		},
	})
}

func GetProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var user models.User
	if err := database.DB.Preload("Organization").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	response := buildUserProfileResponse(&user)
	c.JSON(http.StatusOK, response)
}

type UpdateRoleInput struct {
	Role int `json:"role" binding:"required"`
}

func UpdateUserRole(c *gin.Context) {
	requestorRole := c.MustGet("role").(models.Role)
	requestorID := c.MustGet("userID").(uint)

	if requestorRole < models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only Super Admin can manage roles"})
		return
	}

	targetUserID := c.Param("id")

	var input UpdateRoleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Role < 1 || input.Role > 3 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Allowed: 1 (User), 2 (Manager), 3 (Admin)"})
		return
	}

	var targetUser models.User
	if err := database.DB.First(&targetUser, targetUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	if targetUser.ID == requestorID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change your own role here"})
		return
	}

	if targetUser.Role == models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot demote another Super Admin"})
		return
	}

	requester, _ := getUserFromContext(c)
	if requester.OrganizationID == nil || targetUser.OrganizationID == nil || *requester.OrganizationID != *targetUser.OrganizationID {
		c.JSON(http.StatusForbidden, gin.H{"error": "User belongs to another organization"})
		return
	}

	if err := database.DB.Model(&targetUser).Update("role", input.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User role updated", "new_role": input.Role})
}
