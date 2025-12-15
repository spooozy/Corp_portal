package database

import (
	"log"
	"os"

	"corp-portal/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "portal.db"
	}

	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	log.Println("Connected to SQLite (Pure Go) successfully")

	log.Println("Running Migrations...")
	err = db.AutoMigrate(
		&models.User{},
		&models.Organization{},
		&models.Team{},
		&models.Invite{},
		&models.News{},
		&models.Document{},
	)
	if err != nil {
		log.Fatal("Migration failed: ", err)
	}

	DB = db
}
