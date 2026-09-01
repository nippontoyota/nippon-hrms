package maintenance

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	db    *pgxpool.Pool
	media *MediaStorage
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func NewStoreWithStorage(db *pgxpool.Pool, supabaseURL, serviceKey, doubleTickKey string) *Store {
	return &Store{db: db, media: &MediaStorage{baseURL: strings.TrimRight(supabaseURL, "/"), serviceKey: serviceKey, doubleTickKey: doubleTickKey, bucket: "maintenance-images"}}
}

const maxMaintenanceImageBytes int64 = 10 * 1024 * 1024

type MediaStorage struct{ baseURL, serviceKey, doubleTickKey, bucket string }

func (m *MediaStorage) ensureBucket(ctx context.Context) error {
	body := strings.NewReader(fmt.Sprintf(`{"id":%q,"name":%q,"public":true}`, m.bucket, m.bucket))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.baseURL+"/storage/v1/bucket", body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+m.serviceKey)
	req.Header.Set("apikey", m.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusConflict&& resp.StatusCode != http.StatusConflict resp.StatusCode != http.StatusConflict && resp.StatusCode != http.StatusBadRequest {
		return fmt.Errorf("ensure maintenance image bucket: status %d", resp.StatusCode)
	}
	return nil
}

func (m *MediaStorage) copyImage(ctx context.Context, sourceURL, sourcePhone, messageID string) (string, error) {
	if m == nil || m.baseURL == "" || m.serviceKey == "" {
		return "", fmt.Errorf("maintenance image storage is not configured")
	}
	if err := m.ensureBucket(ctx); err != nil {
		return "", err
	}
	u, err := url.Parse(sourceURL)
	if err != nil || u.Scheme != "https" || u.Host == "" {
		return "", fmt.Errorf("invalid image URL")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, sourceURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", m.doubleTickKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("download maintenance image: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("download maintenance image: status %d", resp.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxMaintenanceImageBytes+1))
	if err != nil {
		return "", err
	}
	if int64(len(data)) > maxMaintenanceImageBytes {
		return "", fmt.Errorf("maintenance image exceeds 10MB")
	}
	contentType := resp.Header.Get("Content-Type")
	if i := strings.IndexByte(contentType, ';'); i >= 0 {
		contentType = contentType[:i]
	}
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(data)
	}
	allowed := map[string]string{"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
	ext, ok := allowed[contentType]
	if !ok {
		return "", fmt.Errorf("unsupported maintenance image type %q", contentType)
	}
	safePhone := strings.NewReplacer("+", "", "/", "", "\\", "").Replace(sourcePhone)
	safeMessageID := strings.NewReplacer("/", "", "\\", "", " ", "_").Replace(messageID)
	key := path.Join("whatsapp", safePhone, fmt.Sprintf("%d-%s.%s", time.Now().UnixNano(), safeMessageID, ext))
	uploadURL := m.baseURL + "/storage/v1/object/" + m.bucket + "/" + url.PathEscape(key)
	uReq, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	uReq.Header.Set("Authorization", "Bearer "+m.serviceKey)
	uReq.Header.Set("apikey", m.serviceKey)
	uReq.Header.Set("Content-Type", contentType)
	uReq.Header.Set("x-upsert", "false")
	uResp, err := http.DefaultClient.Do(uReq)
	if err != nil {
		return "", fmt.Errorf("upload maintenance image: %w", err)
	}
	defer uResp.Body.Close()
	if uResp.StatusCode < 200 || uResp.StatusCode >= 300 {
		return "", fmt.Errorf("upload maintenance image: status %d", uResp.StatusCode)
	}
	return m.baseURL + "/storage/v1/object/public/" + m.bucket + "/" + url.PathEscape(key), nil
}

// MatchLocation attempts to find a location by partial name match.
func (s *Store) MatchLocation(ctx context.Context, name string) (string, string, error) {
	var id, locName string
	err := s.db.QueryRow(ctx, `
		SELECT id, name FROM "Location" 
		WHERE is_active = true AND (name ILIKE $1 OR $1 ILIKE '%' || name || '%')
		ORDER BY CASE WHEN lower(name) = lower($2) THEN 0 ELSE 1 END, length(name)
		LIMIT 1`,
		"%"+name+"%", strings.TrimSpace(name)).Scan(&id, &locName)
	if err != nil {
		err = s.db.QueryRow(ctx, `INSERT INTO "Location" (id, name, is_active) VALUES (gen_random_uuid()::text, $1, true) RETURNING id`, strings.TrimSpace(name)).Scan(&id)\n\t\tif err != nil {\n\t\t\treturn "", "", fmt.Errorf("location %q not found and could not be created: %w", name, err)\n\t\t}\n\t\treturn id, strings.TrimSpace(name), nil
	}
	return id, locName, nil
}

// MatchCategory attempts to find a category by partial name match.
func (s *Store) MatchCategory(ctx context.Context, name string) (string, string, error) {
	var id, catName string
	err := s.db.QueryRow(ctx, `
		SELECT id, name FROM "Category" 
		WHERE is_active = true AND type = 'TICKET' AND (name ILIKE $1 OR $1 ILIKE '%' || name || '%')
		ORDER BY CASE WHEN lower(name) = lower($2) THEN 0 ELSE 1 END, length(name)
		LIMIT 1`,
		"%"+name+"%", strings.TrimSpace(name)).Scan(&id, &catName)
	if err != nil {
		return "", "", fmt.Errorf("category %q not found", name)
	}
	return id, catName, nil
}

type TicketData struct {
	ReporterName    string
	LocationID      string
	CategoryID      string
	Description     string
	Timestamp       int64
	ImageURL        string
	ImageCaption    string
	SourcePhone     string
	SourceMessageID string
}

// CreateTicket inserts a new ticket based on WhatsApp payload.
func (s *Store) CreateTicket(ctx context.Context, data TicketData) (string, error) {
	if data.ImageURL != "" {
		storedURL, err := s.media.copyImage(ctx, data.ImageURL, data.SourcePhone, data.SourceMessageID)
		if err != nil {
			return "", err
		}
		data.ImageURL = storedURL
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin ticket transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if data.SourceMessageID != "" {
		var existing string
		err = tx.QueryRow(ctx, `SELECT ticket_number FROM "Ticket" WHERE source_message_id = $1`, data.SourceMessageID).Scan(&existing)
		if err == nil {
			return existing, nil
		}
	}

	// Generate ticket number: MT-YYYY-XXXX
	year := time.Now().Year()
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, fmt.Sprintf("maintenance-ticket-%d", year)); err != nil {
		return "", fmt.Errorf("lock ticket sequence: %w", err)
	}
	if data.SourceMessageID != "" {
		var existing string
		if err = tx.QueryRow(ctx, `SELECT ticket_number FROM "Ticket" WHERE source_message_id = $1`, data.SourceMessageID).Scan(&existing); err == nil {
			return existing, nil
		}
	}

	var sequence int
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(
			MAX(CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)), 
			0
		) + 1 
		FROM "Ticket" 
		WHERE ticket_number LIKE $1`,
		fmt.Sprintf("MT-%d-%%", year)).Scan(&sequence)
	if err != nil {
		return "", fmt.Errorf("generate ticket sequence: %w", err)
	}

	ticketNumber := fmt.Sprintf("MT-%d-%04d", year, sequence)

	var createdAt time.Time
	if data.Timestamp > 0 {
		createdAt = time.Unix(data.Timestamp, 0)
	} else {
		createdAt = time.Now()
	}

	var ticketID string
	err = tx.QueryRow(ctx, `
		INSERT INTO "Ticket" (
			id, ticket_number, status, priority, 
			reporter_name, reporter_type, 
			location_id, category_id, description, 
			created_at, updated_at, image_url, image_caption, source_phone, source_message_id
		) VALUES (
			gen_random_uuid()::text, $1, 'NEW', 'MEDIUM', 
			$2, 'EMPLOYEE', 
			$3, $4, $5, 
			$6, $6, NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, '')
		) RETURNING id`,
		ticketNumber, data.ReporterName,
		data.LocationID, data.CategoryID, data.Description,
		createdAt, data.ImageURL, data.ImageCaption, data.SourcePhone, data.SourceMessageID).Scan(&ticketID)

	if err != nil {
		return "", fmt.Errorf("insert ticket: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO "TicketStatusHistory" (
			id, ticket_id, status, notes, created_at
		) VALUES (
			gen_random_uuid()::text, $1, 'NEW', 'Ticket created via WhatsApp Bot', $2
		)`, ticketID, createdAt)

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit ticket: %w", err)
	}
	return ticketNumber, nil
}
