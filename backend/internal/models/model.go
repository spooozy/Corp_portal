package models

import (
	"time"

	"gorm.io/gorm"
)

type Role int

const (
	RoleUser       Role = 0
	RoleEmployee   Role = 1
	RoleManager    Role = 2
	RoleAdmin      Role = 3
	RoleSuperAdmin Role = 4
)

type User struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	Email     string `gorm:"uniqueIndex;not null" json:"email"`
	Password  string `json:"-"`
	FullName  string `gorm:"not null" json:"full_name"`
	AvatarURL string `json:"avatar_url"`
	Bio       string `json:"bio"`
	Phone     string `json:"phone"`

	OrganizationID *uint         `json:"organization_id"`
	Organization   *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`

	TeamID *uint `json:"team_id"`
	Team   *Team `gorm:"foreignKey:TeamID" json:"team,omitempty"`

	Role Role `gorm:"default:0" json:"role"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Organization struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"uniqueIndex;not null" json:"name"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatar_url"`
	OwnerID     uint   `json:"owner_id"`

	Teams     []Team     `gorm:"constraint:OnDelete:CASCADE;" json:"teams,omitempty"`
	News      []News     `gorm:"constraint:OnDelete:CASCADE;" json:"news,omitempty"`
	Documents []Document `gorm:"constraint:OnDelete:CASCADE;" json:"documents,omitempty"`
	Users     []User     `gorm:"foreignKey:OrganizationID" json:"users,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

type Team struct {
	ID             uint          `gorm:"primaryKey" json:"id"`
	Name           string        `gorm:"not null;index:idx_org_team_name,unique" json:"name"`
	Description    string        `json:"description"`
	AvatarURL      string        `json:"avatar_url"`
	OrganizationID uint          `gorm:"not null;index:idx_org_team_name,unique" json:"organization_id"`
	Organization   *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`

	LeaderID *uint `json:"leader_id"`
	Leader   *User `json:"leader" gorm:"foreignKey:LeaderID"`

	Users []User `gorm:"foreignKey:TeamID" json:"users,omitempty"`

	CreatedAt time.Time `json:"created_at"`
}

type Invite struct {
	ID             uint           `gorm:"primarykey" json:"id"`
	Token          string         `gorm:"type:varchar(36);uniqueIndex;not null" json:"token"`
	OrganizationID uint           `gorm:"not null" json:"organization_id"`
	CreatedByID    uint           `gorm:"not null" json:"created_by_id"`
	ExpiresAt      time.Time      `gorm:"not null" json:"expires_at"`
	MaxUses        int            `gorm:"default:1" json:"max_uses"`
	Uses           int            `gorm:"default:0" json:"uses"`
	CreatedAt      time.Time      `json:"created_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	CreatedBy User `gorm:"foreignKey:CreatedByID" json:"created_by"`
}

type Tag struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"uniqueIndex;not null" json:"name"`
}

type News struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Title    string `gorm:"not null" json:"title"`
	Content  string `gorm:"not null" json:"content"`
	ImageURL string `json:"image_url"`
	Tags     []Tag  `gorm:"many2many:news_tags;" json:"tags"`

	OrganizationID uint  `gorm:"not null" json:"organization_id"`
	TeamID         *uint `json:"team_id"`

	AuthorID uint `json:"author_id"`
	Author   User `json:"author"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Document struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Title       string `gorm:"not null" json:"title"`
	Description string `json:"description"`
	FileURL     string `gorm:"not null" json:"file_url"`
	Tags        []Tag  `gorm:"many2many:document_tags;" json:"tags"`

	OrganizationID uint  `gorm:"not null" json:"organization_id"`
	TeamID         *uint `json:"team_id"`

	AuthorID uint `json:"author_id"`
	Author   User `json:"author"`

	CreatedAt time.Time `json:"created_at"`
}
