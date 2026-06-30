package importjob

import "time"

type EntityType string

const (
	EntityEmployees EntityType = "employees"
	EntityEPF       EntityType = "epf"
	EntityPayroll   EntityType = "payroll"
)

type Mode string

const (
	ModeReplace Mode = "replace"
	ModeAdd     Mode = "add"
)

type Status string

const (
	StatusPending   Status = "PENDING"
	StatusParsing   Status = "PARSING"
	StatusLoading   Status = "LOADING"
	StatusCompleted Status = "COMPLETED"
	StatusFailed    Status = "FAILED"
)

type FileFormat string

const (
	FormatCSV  FileFormat = "csv"
	FormatXLSX FileFormat = "xlsx"
)

type Resolution string

const (
	ResolutionPending      Resolution = "pending"
	ResolutionKeepExisting Resolution = "keep_existing"
	ResolutionUseImported  Resolution = "use_imported"
)

type Job struct {
	ID               string     `json:"id"`
	EntityType       EntityType `json:"entityType"`
	Mode             Mode       `json:"mode"`
	Month            *int       `json:"month,omitempty"`
	Year             *int       `json:"year,omitempty"`
	Status           Status     `json:"status"`
	FileName         string     `json:"fileName"`
	FileFormat       FileFormat `json:"fileFormat"`
	CreatedBy        string     `json:"createdBy"`
	TotalRows        int        `json:"totalRows"`
	Inserted         int        `json:"inserted"`
	SkippedIdentical int        `json:"skippedIdentical"`
	Rejected         int        `json:"rejected"`
	ConflictsPending int        `json:"conflictsPending"`
	ErrorMessage     string     `json:"errorMessage,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
	CompletedAt      *time.Time `json:"completedAt,omitempty"`
}

type JobError struct {
	ID      string `json:"id"`
	RowNum  int    `json:"rowNum"`
	Message string `json:"message"`
}

type Conflict struct {
	ID             string `json:"id"`
	NaturalKey     string `json:"naturalKey"`
	FieldName      string `json:"fieldName"`
	ExistingValue  string `json:"existingValue"`
	ImportedValue  string `json:"importedValue"`
	Resolution     string `json:"resolution"`
}

type PaginatedErrors struct {
	Items []JobError `json:"items"`
	Total int        `json:"total"`
	Page  int        `json:"page"`
	Limit int        `json:"limit"`
}

type PaginatedConflicts struct {
	Items []Conflict `json:"items"`
	Total int        `json:"total"`
	Page  int        `json:"page"`
	Limit int        `json:"limit"`
}

type ResolveRequest struct {
	ConflictIDs []string   `json:"conflictIds"`
	Resolution  Resolution `json:"resolution"`
}

type ResolveAllRequest struct {
	Resolution Resolution `json:"resolution"`
}

type Config struct {
	MaxFileMB int
	MaxRows   int
	TempDir   string
}
