package main

import (
	"log"
	"os"
	"time"

	"corp-portal/internal/database"
	"corp-portal/internal/handlers"
	"corp-portal/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using defaults")
	}

	database.Connect()

	r := gin.Default()

	// config := cors.DefaultConfig()
	// config.AllowOrigins = []string{"http://localhost:5173"}
	// config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173", "http://localhost:8080"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Content-Length", "Authorization", "Accept"},
		AllowCredentials: true,
		ExposeHeaders:    []string{"Content-Length"},
		MaxAge:           12 * time.Hour,
	}))

	r.Static("/uploads", "./uploads")

	api := r.Group("/api")
	{
		api.POST("/register", handlers.Register)
		api.POST("/login", handlers.Login)

		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/me", handlers.GetProfile)

			protected.DELETE("/profile", handlers.DeleteAccount)
			protected.POST("/profile/leave", handlers.LeaveOrganization)
			protected.POST("/profile/upload-avatar", handlers.UploadAvatar)
			protected.DELETE("/profile/remove-avatar", handlers.RemoveUserAvatar)

			protected.GET("/users/:id", handlers.GetUserByID)
			protected.PUT("/users/:id", handlers.UpdateUserByID)
			protected.DELETE("/users/:id/avatar", handlers.RemoveUserAvatar)
			protected.PUT("/users/:id/avatar", handlers.UploadUserAvatar)

			protected.POST("/organizations", handlers.CreateOrganization)
			protected.GET("/organizations/my", handlers.GetMyOrganization)
			protected.GET("/organizations/:id", handlers.GetOrganizationByID)
			protected.PUT("/organizations/:id", handlers.UpdateOrganization)
			protected.POST("/organizations/:id/upload-avatar", handlers.UploadOrganizationAvatar)
			protected.DELETE("/organizations/:id/avatar", handlers.RemoveOrganizationAvatar)

			protected.POST("/teams", handlers.CreateTeam)
			protected.GET("/teams/:id", handlers.GetTeamByID)
			protected.PUT("/teams/:id", handlers.UpdateTeam)
			protected.POST("/teams/:id/upload-avatar", handlers.UploadTeamAvatar)
			protected.DELETE("/teams/:id/avatar", handlers.RemoveTeamAvatar)
			protected.POST("/teams/:id/members", handlers.AddTeamMember)
			protected.DELETE("/teams/:id/members/:userId", handlers.RemoveTeamMember)
			protected.DELETE("/teams/:id", handlers.DeleteTeam)
			protected.PUT("/teams/:id/leader", handlers.UpdateTeamLeader)

			protected.GET("/organizations/:id/free-users", handlers.GetFreeUsersInOrganization)

			protected.POST("/invites", handlers.CreateInvite)
			protected.GET("/invites", handlers.GetInvitesForOrganization)
			protected.DELETE("/invites/:token", handlers.DeleteInvite)

			protected.GET("/potential-leaders", handlers.GetPotentialLeaders)
			protected.POST("/join/:token", handlers.JoinByInvite)

			protected.GET("/news", handlers.GetNewsFeed)
			protected.POST("/news", handlers.CreateNews)
			protected.GET("/tags", handlers.GetTags)

			protected.GET("/documents", handlers.GetDocuments)
			protected.POST("/documents", handlers.UploadDocument)

			protected.PUT("/users/:id/role", handlers.UpdateUserRole)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s...", port)
	r.Run(":" + port)
}
