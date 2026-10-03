package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
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

	msgMaintenanceTicketCreated = `Your maintenance ticket (*%s*) has been submitted successfully!

Our team will review it shortly. Reply *Hi* to return to the main menu.`

	msgMaintenanceError = `There was an error creating your maintenance ticket. Please try again or contact support.\n\nReply *Hi* to return to the main menu.`
)

const maintenanceBranchPageSize = 9

func maintenanceBranchListSections(branches []maintenance.Branch, offset int) []doubletick.InteractiveListSection {
	end := offset + maintenanceBranchPageSize
	if end > len(branches) {
		end = len(branches)
	}
	rows := make([]doubletick.InteractiveListRow, 0, len(branches))
	for _, branch := range branches[offset:end] {
		rows = append(rows, doubletick.InteractiveListRow{ID: "branch_" + branch.ID, Title: branch.Name})
	}
	if end < len(branches) {
		rows = append(rows, doubletick.InteractiveListRow{
			ID:          "branch_next_" + strconv.Itoa(end),
			Title:       "Next page",
			Description: "Show more branches",
		})
	}
	if offset > 0 {
		rows = append(rows, doubletick.InteractiveListRow{
			ID:          "branch_back_" + strconv.Itoa(offset-maintenanceBranchPageSize),
			Title:       "Back",
			Description: "Return to the previous page",
		})
	}
	return []doubletick.InteractiveListSection{{Title: "Branches", Rows: rows}}
}

func maintenanceBranchPrompt(offset, total int) string {
	pages := (total + maintenanceBranchPageSize - 1) / maintenanceBranchPageSize
	page := offset/maintenanceBranchPageSize + 1
	return fmt.Sprintf("%s\n\nPage %d of %d", msgMaintenanceAwaitBranch, page, pages)
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
				{ID: "cat_fire_safety", Title: "Fire & Safety", Description: "Fire alarms, extinguishers"},
			},
		},
	}
}

func (s *Service) beginMaintenanceFlow(ctx context.Context, sess *Session, from string) error {
	branches, err := s.maintenanceStore.ListActiveBranches(ctx)
	if err != nil {
		slog.Error("failed to list maintenance branches", "err", err)
		return s.sendText(ctx, from, msgMaintenanceError)
	}
	if len(branches) == 0 {
		return s.sendText(ctx, from, "No active maintenance branches are configured. Please contact support.")
	}
	sess.State = StateMaintenanceAwaitBranch
	s.sessions.Set(from, sess)
	_, err = s.dt.SendInteractiveList(ctx, from, "", maintenanceBranchPrompt(0, len(branches)), "", "Select Branch", maintenanceBranchListSections(branches, 0))
	return err
}

func (s *Service) handleMaintenanceAwaitBranch(ctx context.Context, sess *Session, from, input string) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}
	input = strings.TrimSpace(input)
	pageAction := ""
	pageActionPrefix := ""
	if strings.HasPrefix(strings.ToLower(input), "branch_next_") {
		pageAction = input[len("branch_next_"):]
		pageActionPrefix = "branch_next_"
	} else if strings.HasPrefix(strings.ToLower(input), "branch_back_") {
		pageAction = input[len("branch_back_"):]
		pageActionPrefix = "branch_back_"
	}
	if pageActionPrefix != "" {
		offset, parseErr := strconv.Atoi(pageAction)
		if parseErr != nil || offset < 0 {
			return nil
		}
		branches, err := s.maintenanceStore.ListActiveBranches(ctx)
		if err != nil || offset >= len(branches) {
			return nil
		}
		_, err = s.dt.SendInteractiveList(ctx, from, "", maintenanceBranchPrompt(offset, len(branches)), "", "Select Branch", maintenanceBranchListSections(branches, offset))
		return err
	}
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
	case "cat_fire_safety", "fire & safety", "fire and safety", "fire":
		catName = "Fire & Safety"
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

func (s *Service) handleMaintenanceAwaitDescription(ctx context.Context, sess *Session, from, input, messageID string, timestamp int64) error {
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
		lowerInput == "hvac" || lowerInput == "civil" || lowerInput == "it" || lowerInput == "fire & safety" || lowerInput == "fire and safety" ||
		strings.Contains(lowerInput, "select category") ||
		strings.Contains(lowerInput, "category of the issue") ||
		strings.EqualFold(input, sess.TempMaintenanceCategory) ||
		strippedInput == "electricallighting,wiring,powerissues" ||
		strippedInput == "plumbingleaks,pipes,washroom" ||
		strippedInput == "hvacairconditioning,cooling" ||
		strippedInput == "civilbuilding,painting,structural" ||
		strippedInput == "it&networkcomputers,internet,printers" ||
		strippedInput == "itcomputers,internet,printers" || strippedInput == "fire&safetyfirealarms,extinguishers" {
		return nil
	}

	if len(strings.TrimSpace(input)) < 5 {
		return s.sendText(ctx, from, "Description is too short. "+msgMaintenanceAwaitDescription)
	}

	sess.TempMaintenanceDescription = strings.TrimSpace(input)
	sess.State = StateMaintenanceAwaitImage
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, "Would you like to attach an image? (Optional)\n\nPlease upload a photo now, or reply *Skip* to proceed.")
}

// createMaintenanceTicket finishes the flow once branch, location, category,
// and description have all been collected. Tickets no longer accept a photo:
// WhatsApp media downloads for this flow proved unreliable in production, so
// the image step was removed entirely rather than continuing to fight it.
func (s *Service) createMaintenanceTicket(ctx context.Context, sess *Session, from, messageID string, timestamp int64) error {
	if sess.TempMaintenanceBranchID != "" {
		if _, err := s.maintenanceStore.GetActiveBranch(ctx, sess.TempMaintenanceBranchID); err != nil {
			return s.sendText(ctx, from, msgMaintenanceError)
		}
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

func (s *Service) handleMaintenanceAwaitImage(ctx context.Context, sess *Session, from, input, imageURL, imageCaption, messageID string, timestamp int64) error {
	if isGreeting(input) {
		sess.resetFlow()
		s.sessions.Set(from, sess)
		return s.handleIdle(ctx, sess, from, input)
	}

	if imageURL != "" {
		sess.TempMaintenanceImageURL = imageURL
	} else if strings.EqualFold(strings.TrimSpace(input), "skip") || strings.EqualFold(strings.TrimSpace(input), "no") {
		sess.TempMaintenanceImageURL = ""
	} else {
		return s.sendText(ctx, from, "Please upload an image, or reply *Skip* to proceed without one.")
	}

	return s.createMaintenanceTicket(ctx, sess, from, messageID, timestamp)
}
