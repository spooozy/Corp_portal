package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/models"
	"corp-portal/internal/utils"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type GoogleAuthInput struct {
	Token string `json:"token" binding:"required"`
}

type GoogleUserResult struct {
	Sub           string `json:"sub"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}

func GoogleLogin(c *gin.Context) {
	var input GoogleAuthInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := http.Get("https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + input.Token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to connect to Google API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google Token"})
		return
	}

	var googleUser GoogleUserResult
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Google response"})
		return
	}

	var user models.User
	result := database.DB.Where("email = ?", googleUser.Email).First(&user)

	if result.Error != nil {
		randomPassword := uuid.New().String()
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)

		user = models.User{
			Email:     googleUser.Email,
			Password:  string(hashedPassword),
			FullName:  googleUser.Name,
			AvatarURL: googleUser.Picture,
			Role:      models.RoleUser,
		}

		if err := database.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create user"})
			return
		}
	}

	token, err := utils.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":         user.ID,
			"full_name":  user.FullName,
			"role":       user.Role,
			"email":      user.Email,
			"avatar_url": user.AvatarURL,
		},
	})
}
