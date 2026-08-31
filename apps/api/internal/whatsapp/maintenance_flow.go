package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/nippon-toyota/hrms/internal/maintenance"
)

const (
	msgMaintenanceAwaitLocation = `Please enter the *Location* for the maintenance ticket.

Example: Workshop Bay 3, Showroom, Main Office`

	msgMaintenanceAwaitCategory = `Please enter the *Category* of the issue.

Example: Electrical, Plumbing, HVAC, Civil, IT`

	msgMaintenanceAwaitDescription = `Please describe the issue in detail.`

	msgMaintenanceTicketCreated = `Your maintenance ticket (*%s*) has been submitted successfully!

Our team will review it shortly. Reply *Hi* to return to the main menu.`

	msgMaintenanceError = `There was an error creating your maintenance ticket. Please try again or contact support.`
)

func (s *Service) beginMaintenanceFlow(ctx context.Context, sess *Session, from string) error {
	sess.State = StateMaintenanceAwaitLocation
	s.sessions.Set(from, sess)
	return s.sendText(ctx, from, msgMaintenanceAwaitLocation)
}

func (s *Service) handleMaintenanceAwaitLocation(ctx context.Context, sess *Session, from, input string) error {
	if len(strings.TrimSpace(input)) < 2 {
		return s.sendText(ctx, from, "Location name is too short. "+msgMaintenanceAwaitLocation)
	}

	sess.TempMaintenanceLocation = strings.TrimSpace(input)
	sess.State = StateMaintenanceAwaitCategory
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, msgMaintenanceAwaitCategory)
}

func (s *Service) handleMaintenanceAwaitCategory(ctx context.Context, sess *Session, from, input string) error {
	if len(strings.TrimSpace(input)) < 2 {
		return s.sendText(ctx, from, "Category name is too short. "+msgMaintenanceAwaitCategory)
	}

	sess.TempMaintenanceCategory = strings.TrimSpace(input)
	sess.State = StateMaintenanceAwaitDescription
	s.sessions.Set(from, sess)

	return s.sendText(ctx, from, msgMaintenanceAwaitDescription)
}

func (s *Service) handleMaintenanceAwaitDescription(ctx context.Context, sess *Session, from, input string, timestamp int64) error {
	if len(strings.TrimSpace(input)) < 5 {
		return s.sendText(ctx, from, "Description is too short. "+msgMaintenanceAwaitDescription)
	}

	sess.TempMaintenanceDescription = strings.TrimSpace(input)

	// Create the ticket!
	name := "WhatsApp User"
	if emp, _ := s.empRepo.FindByPhone(ctx, from); emp != nil {
		name = emp.Name
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
		ReporterName: name, // We store the name
		LocationID:   locID,
		CategoryID:   catID,
		Description:  sess.TempMaintenanceDescription,
		Timestamp:    timestamp,
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
