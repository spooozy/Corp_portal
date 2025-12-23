package handlers

import (
	"corp-portal/internal/database"
	"corp-portal/internal/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func GetTasks(c *gin.Context) {
	teamID := c.Query("team_id")
	requestorID, _ := c.Get("userID")
	requestorRole, _ := c.Get("role")

	var currentAdmin models.User
	database.DB.First(&currentAdmin, requestorID)

	var targetTeam models.Team
	if err := database.DB.First(&targetTeam, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	if requestorRole.(models.Role) < 2 && *currentAdmin.TeamID != targetTeam.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	var tasks []models.Task
	err := database.DB.Where("team_id = ?", teamID).
		Preload("Assignee").
		Preload("Creator").
		Order("created_at desc").
		Find(&tasks).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func CreateTask(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	role := c.MustGet("role").(models.Role)

	var input struct {
		Title       string              `json:"title" binding:"required"`
		Description string              `json:"description"`
		Priority    models.TaskPriority `json:"priority"`
		DueDate     *time.Time          `json:"due_date"`
		AssigneeID  *uint               `json:"assignee_id"`
		TeamID      uint                `json:"team_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	database.DB.First(&user, userID)

	isTeamLeader := user.TeamID != nil && *user.TeamID == input.TeamID && role >= 1
	if !isTeamLeader && role < 2 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only leaders can create tasks"})
		return
	}

	task := models.Task{
		Title:          input.Title,
		Description:    input.Description,
		Priority:       input.Priority,
		DueDate:        input.DueDate,
		AssigneeID:     input.AssigneeID,
		TeamID:         input.TeamID,
		CreatorID:      userID,
		OrganizationID: *user.OrganizationID,
		Status:         models.StatusTodo,
	}

	if err := database.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}
	c.JSON(http.StatusCreated, task)
}

func UpdateTask(c *gin.Context) {
	taskID := c.Param("id")
	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	task.UpdatedAt = time.Now()
	database.DB.Save(&task)
	c.JSON(http.StatusOK, task)
}

func DeleteTask(c *gin.Context) {
	taskID := c.Param("id")
	userID := c.MustGet("userID").(uint)
	role := c.MustGet("role").(models.Role)

	var task models.Task
	if err := database.DB.First(&task, taskID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var user models.User
	database.DB.First(&user, userID)

	isTeamLeader := user.TeamID != nil && *user.TeamID == task.TeamID && role >= 1
	isAdmin := role >= 2

	if !isTeamLeader && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "У вас нет прав для удаления этой задачи"})
		return
	}

	if err := database.DB.Delete(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Задача успешно удалена"})
}
