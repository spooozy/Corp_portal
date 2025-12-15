package models

import (
	"time"
)

type UserProfileResponse struct {
	ID             uint      `json:"id"`
	Email          string    `json:"email"`
	FullName       string    `json:"full_name"`
	AvatarURL      string    `json:"avatar_url"`
	Bio            string    `json:"bio"`
	Phone          string    `json:"phone"`
	OrganizationID *uint     `json:"organization_id"`
	TeamID         *uint     `json:"team_id"`
	Role           Role      `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	Organization *OrganizationResponse `json:"organization,omitempty"`
	Team         *TeamResponse         `json:"team,omitempty"`
}

type OrganizationResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	AvatarURL   string    `json:"avatar_url"`
	OwnerID     uint      `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`
}

type TeamResponse struct {
	ID             uint                `json:"id"`
	Name           string              `json:"name"`
	Description    string              `json:"description"`
	AvatarURL      string              `json:"avatar_url"`
	OrganizationID uint                `json:"organization_id"`
	LeaderID       *uint               `json:"leader_id"`
	CreatedAt      time.Time           `json:"created_at"`
	Leader         *UserSimpleResponse `json:"leader,omitempty"`
}

type UserSimpleResponse struct {
	ID        uint   `json:"id"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	Role      Role   `json:"role"`
}

type TeamProfileResponse struct {
	ID             uint      `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	AvatarURL      string    `json:"avatar_url"`
	OrganizationID uint      `json:"organization_id"`
	LeaderID       *uint     `json:"leader_id"`
	CreatedAt      time.Time `json:"created_at"`

	Organization *OrganizationResponse `json:"organization,omitempty"`
	Leader       *UserSimpleResponse   `json:"leader,omitempty"`
	Members      []UserSimpleResponse  `json:"members,omitempty"`
}

type OrganizationProfileResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	AvatarURL   string    `json:"avatar_url"`
	OwnerID     uint      `json:"owner_id"`
	CreatedAt   time.Time `json:"created_at"`

	Teams []TeamResponse       `json:"teams,omitempty"`
	Users []UserSimpleResponse `json:"users,omitempty"`
}
