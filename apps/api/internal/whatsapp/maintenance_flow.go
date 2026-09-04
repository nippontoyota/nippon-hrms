package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"path"
	"strings"

	"github.com/nippon-toyota/hrms/internal/doubletick"
	"github.com/nippon-toyota/hrms/internal/maintenance"
)

const (
	msgMaintenanceAwaitBranch   = `Please select your *branch* for the maintenance ticket.`
	msgMaintenanceAwaitLocation = `Please enter the *Location* for the maintenance ticket.

Example: Workshop Bay 3, Showroom, Main Office`

	msgMaintenanceAwaitCategory = `Please select the *Category* of the issue.`

	msgMaintenanceAwaitDescription = `Please describe the issue in detail.`
	msgMaintenanceAwaitImage       = `Please attach a clear photo of the issue, or reply "Skip" if you do not have one.`

	msgMaintenanceTicketCreated = `Your maintenance ticket (*%s*) has been submitted successfully!

Our team will review it shortly. Reply *Hi* to return to the main menu.`

	msgMaintenanceError        = `There was an error creating your maintenance ticket. Please try again or contact support.\n\nReply *Hi* to return to the main menu.`
	msgMaintenanceImageInvalid = `That file is not a supported photo. Please send a JPEG, PNG, or WEBP image, or reply "Skip" to submit without a photo.`
)

func maintenanceBranchListSections(branches []maintenance.Branch) []doubletick.InteractiveListSection {
	rows := make([]doubletick.InteractiveListRow, 0, len(branches))
	for _, branch := range branches {
		rows = append(rows, doubletick.InteractiveListRow{ID: "branch_" + branch.ID, Title: branch.Name})
	}
	return []doubletick.InteractiveListSection{{Title: "Branches", Rows: rows}}
}

func maintenanceCategoryListSections() []doubletick.InteractiveListSection {
	return []doubletick.InteractiveListSection{
		{
			Title: "Categories",
			Rows: []doubletick.InteractiveListRow{
				{ID: "cat_electrical", Title: "Electrical", Description: "Lighting, wiring, power issues"},
				{ID: "cat_plumbing", Title: "Plumbing", Description: "Leaks, pipes, washroom"},
				{ID: "cat_hvac", Title: "HVAC", Description: "Air conditioning, cooling"},
				{ID: "cat_civil", Title: "Civil", Description: "Building, painting, structural"},
				{ID: "cat_it", Title: "IT & Network", Description: "Computers, internet, printers"},
			},
		},
	}
}

func (s *Service) beginMaintenanceFlow(ctx context.Context, sess *Session, from string) error {
	branches, err := s.maintenanceStore.ListActiveBranches(ctx)
	if err != nil || len(branches) == 0 {
		return s.sendText(ctx, from, msgMaintenanceError)
	}
	sess.State = StateMaintenanceAwaitBranch
	s.sessions.Set(from, sess)
	_, err = s.dt.SendInteractiveList(ctx, from, "", msgMaintenanceAwaitBranch, "", "Select Branch", maintenanceBranchListSections(branches))
	return err
}

func (s *Service) handleMaintenanceAwaitBranch(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}
	input = strings.TrimSpace(input)
	if strings.HasPrefix(strings.ToLower(input), "branch_") {
		input = input[len("branch_"):]
	}
	branch, err := s.maintenanceStore.GetActiveBranch(ctx, input)
	if err != nil {
		return nil
	}
	sess.TempMaintenanceBranchID = branch.ID
	sess.State = StateMaintenanceAwaitLocation
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgMaintenanceAwaitLocation)
}

func (s *Service) handleMaintenanceAwaitLocation(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	// Guard against duplicate webhook payload triggering the next state
	if input == payloadRequestMaintenance || canonicalInput(input) == payloadRequestMaintenance {
		return nil
	}

	if len(strings.TrimSpace(input)) < 2 {
		return s.sendText(ctx, from, "Location name is too short. "+msgMaintenanceAwaitLocation)
	}

	sess.TempMaintenanceLocation = strings.TrimSpace(input)
	sess.State = StateMaintenanceAwaitCategory
	s.sessions.Set(from, sess)

	_, err := s.dt.SendInteractiveList(ctx, from, "", msgMaintenanceAwaitCategory, "", "Select Category", maintenanceCategoryListSections())
	return err
}

func (s *Service) handleMaintenanceAwaitCategory(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	// Map the ID back to a readable category name
	catName := ""
	lowerInput := strings.ToLower(strings.TrimSpace(input))
	switch lowerInput {
	case "cat_electrical", "electrical":
		catName = "Electrical"
	case "cat_plumbing", "plumbing":
		catName = "Plumbing"
	case "cat_hvac", "hvac":
		catName = "HVAC"
	case "cat_civil", "civil":
		catName = "Civil"
	case "cat_it", "it", "it & network":
		catName = "IT"
	}

	if catName == "" {
		// Silently drop any invalid text (including duplicate DoubleTick webhooks and shadow echoes)
		// The interactive list is already visible to the user, so we don't need to spam them with errors.
		return nil
	}

	sess.TempMaintenanceCategory = strings.TrimSpace(catName)
	sess.State = StateMaintenanceAwaitDescription
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, msgMaintenanceAwaitDescription)
}

func (s *Service) handleMaintenanceAwaitDescription(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	// Guard against WhatsApp's text-fallback echoing the category list selection or the prompt itself
	lowerInput := strings.ToLower(strings.TrimSpace(input))
	strippedInput := strings.ReplaceAll(strings.ReplaceAll(lowerInput, " ", ""), "\n", "")

	if strings.HasPrefix(lowerInput, "cat_") ||
		lowerInput == "electrical" || lowerInput == "plumbing" ||
		lowerInput == "hvac" || lowerInput == "civil" || lowerInput == "it" ||
		strings.Contains(lowerInput, "select category") ||
		strings.Contains(lowerInput, "category of the issue") ||
		strings.EqualFold(input, sess.TempMaintenanceCategory) ||
		strippedInput == "electricallighting,wiring,powerissues" ||
		strippedInput == "plumbingleaks,pipes,washroom" ||
		strippedInput == "hvacairconditioning,cooling" ||
		strippedInput == "civilbuilding,painting,structural" ||
		strippedInput == "it&networkcomputers,internet,printers" ||
		strippedInput == "itcomputers,internet,printers" {
		return nil
	}

	if len(strings.TrimSpace(input)) < 5 {
		return s.sendText(ctx, from, "Description is too short. "+msgMaintenanceAwaitDescription)
	}

	sess.TempMaintenanceDescription = strings.TrimSpace(input)
	sess.State = StateMaintenanceAwaitImage
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgMaintenanceAwaitImage)
}

func (s *Service) handleMaintenanceAwaitImage(ctx context.Context, sess *Session, from, input, msgType, imageURL, imageCaption string, timestamp int64, messageID, rawPayload string) error {
	if isGreeting(input) || isGreeting(imageCaption) || isGreeting(imageURL) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, "Hi")
	}
	skippedImage := isMaintenanceImageSkipped(input)
	if skippedImage {
		imageURL = ""
		imageCaption = ""
		msgType = ""
	}
	if !skippedImage && !isSupportedMaintenanceImage(msgType, imageURL) {
		slog.Warn("rejected maintenance media", "media_type", strings.ToLower(strings.TrimSpace(msgType)), "has_media_url", strings.TrimSpace(imageURL) != "")
		return s.sendText(ctx, from, msgMaintenanceImageInvalid)
	}
	sess.TempMaintenanceImageURL = strings.TrimSpace(imageURL)
	sess.TempMaintenanceImageCaption = strings.TrimSpace(imageCaption)

	// Create the ticket!
	if _, err := s.maintenanceStore.GetActiveBranch(ctx, sess.TempMaintenanceBranchID); err != nil {
		return s.sendText(ctx, from, msgMaintenanceError)
	}
	name := "WhatsApp User"
	employeeID := ""
	if emp, _ := s.empRepo.FindByPhone(ctx, from); emp != nil {
		name = emp.Name
		employeeID = emp.ID
	}

	// 1. Resolve Location and Category
	locID, _, err := s.maintenanceStore.MatchLocation(ctx, sess.TempMaintenanceLocation)
	if err != nil {
		slog.Error("failed to match location", "err", err)
		return s.sendText(ctx, from, msgMaintenanceError)
	}

	catID, _, err := s.maintenanceStore.MatchCategory(ctx, sess.TempMaintenanceCategory)
	if err != nil {
		slog.Error("failed to match category", "err", err)
		return s.sendText(ctx, from, msgMaintenanceError)
	}

	// 3. Create Ticket
	ticketNum, err := s.maintenanceStore.CreateTicket(ctx, maintenance.TicketData{
		BranchID:        sess.TempMaintenanceBranchID,
		ReporterName:    name, // We store the name
		EmployeeID:      employeeID,
		LocationID:      locID,
		CategoryID:      catID,
		Description:     sess.TempMaintenanceDescription,
		ImageURL:        sess.TempMaintenanceImageURL,
		ImageCaption:    sess.TempMaintenanceImageCaption,
		SourcePhone:     from,
		SourceMessageID: messageID,
		Timestamp:       timestamp,
	})
	if err != nil {
		slog.Error("failed to create ticket", "err", err)
		return s.sendText(ctx, from, msgMaintenanceError)
	}

	// Finish flow
	sess.resetFlow()
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, fmt.Sprintf(msgMaintenanceTicketCreated, ticketNum))
}

func isMaintenanceImageSkipped(input string) bool {
	switch strings.ToLower(strings.TrimSpace(input)) {
	case "skip", "no photo", "no photo available", "none", "not available", "no":
		return true
	default:
		return false
	}
}

func isSupportedMaintenanceImage(msgType, imageURL string) bool {
	if strings.TrimSpace(imageURL) == "" {
		return false
	}

	mediaType := strings.ToLower(strings.TrimSpace(msgType))
	if mediaType == "image" {
		return true
	}
	if mediaType != "file" && mediaType != "document" {
		return false
	}

	parsed, err := url.Parse(strings.TrimSpace(imageURL))
	if err != nil {
		return false
	}
	switch strings.ToLower(path.Ext(parsed.Path)) {
	case ".jpg", ".jpeg", ".png", ".webp":
		return true
	default:
		return false
	}
}
