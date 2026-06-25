package whatsapp

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/nippon-toyota/hrms/internal/doubletick"
)

// Service orchestrates WhatsApp conversations.
// It is the only place that touches both the session store and the DoubleTick client.
type Service struct {
	dt      *doubletick.Client
	sessions SessionStore
}

// NewService constructs a Service.
func NewService(dt *doubletick.Client, sessions SessionStore) *Service {
	return &Service{dt: dt, sessions: sessions}
}

// HandleWebhook processes one inbound DoubleTick webhook event.
// It is safe to call concurrently.
func (s *Service) HandleWebhook(ctx context.Context, wh *doubletick.Webhook) error {
	if !wh.IsInbound() {
		// Delivery status update — acknowledge, no action needed.
		return nil
	}

	from := wh.Data.From
	input := strings.TrimSpace(wh.Data.Body())

	slog.Info("whatsapp inbound",
		"from", from,
		"type", wh.Data.Type,
		"input", input,
	)

	// Retrieve or bootstrap session.
	sess, ok := s.sessions.Get(from)
	if !ok {
		sess = &Session{Phone: from, State: StateIdle}
	}

	// Global escape hatch — "0" always returns to main menu.
	if input == "0" {
		sess.reset()
		s.sessions.Set(from, sess)
		return s.send(ctx, from, msgMainMenu)
	}

	// Route to the correct state handler.
	var err error
	switch sess.State {
	case StateIdle, StateMainMenu:
		err = s.handleMainMenu(ctx, sess, from, input)
	case StatePayslipAwaitID:
		err = s.handlePayslipID(ctx, sess, from, input)
	case StateTicketAwaitTitle:
		err = s.handleTicketTitle(ctx, sess, from, input)
	case StateTicketAwaitDesc:
		err = s.handleTicketDesc(ctx, sess, from, input)
	case StateTicketAwaitConfirm:
		err = s.handleTicketConfirm(ctx, sess, from, input)
	default:
		sess.reset()
		err = s.send(ctx, from, msgMainMenu)
	}

	if err != nil {
		slog.Error("whatsapp state handler error",
			"from", from,
			"state", sess.State,
			"err", err,
		)
	}
	return err
}

// ─── State handlers ───────────────────────────────────────────────────────────

// handleMainMenu interprets the user's top-level menu selection.
func (s *Service) handleMainMenu(ctx context.Context, sess *Session, from, input string) error {
	switch input {
	case "1", "payslip", "pay slip":
		sess.State = StatePayslipAwaitID
		s.sessions.Set(from, sess)
		return s.send(ctx, from, msgPayslipAwaitID)

	case "2", "ticket", "raise ticket", "maintenance":
		sess.State = StateTicketAwaitTitle
		s.sessions.Set(from, sess)
		return s.send(ctx, from, msgTicketAwaitTitle)

	case "3", "holiday", "holidays", "holiday calendar":
		// Holiday calendar is stateless — show and return to idle.
		sess.State = StateIdle
		s.sessions.Set(from, sess)
		return s.send(ctx, from, msgHolidayCalendar)

	case "hi", "hello", "hey", "start", "menu", "help", "":
		// Any greeting or empty → welcome + main menu.
		sess.State = StateMainMenu
		s.sessions.Set(from, sess)
		return s.send(ctx, from, msgMainMenu)

	default:
		return s.send(ctx, from, msgUnknownOption)
	}
}

// handlePayslipID processes the employee's ID submission.
func (s *Service) handlePayslipID(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.send(ctx, from, msgPayslipAwaitID)
	}

	employeeID := strings.ToUpper(strings.TrimSpace(input))

	// ── TODO: validate employeeID against Supabase employees table ──────────
	// For now we accept any non-empty string and stub the response.
	// Replace with: employee, err := s.employeeRepo.FindByID(ctx, employeeID)
	// ────────────────────────────────────────────────────────────────────────

	sess.EmployeeID = employeeID
	sess.State = StateIdle
	s.sessions.Set(from, sess)

	return s.send(ctx, from, msgPayslipReady(employeeID))
}

// handleTicketTitle captures the ticket title.
func (s *Service) handleTicketTitle(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.send(ctx, from, msgTicketAwaitTitle)
	}

	sess.Ticket.Title = input
	sess.State = StateTicketAwaitDesc
	s.sessions.Set(from, sess)

	return s.send(ctx, from, msgTicketAwaitDesc)
}

// handleTicketDesc captures the ticket description and asks for confirmation.
func (s *Service) handleTicketDesc(ctx context.Context, sess *Session, from, input string) error {
	if input == "" {
		return s.send(ctx, from, msgTicketAwaitDesc)
	}

	sess.Ticket.Description = input
	sess.State = StateTicketAwaitConfirm
	s.sessions.Set(from, sess)

	return s.send(ctx, from, msgTicketConfirmPrompt(sess.Ticket.Title, sess.Ticket.Description))
}

// handleTicketConfirm submits or cancels the ticket based on the user's reply.
func (s *Service) handleTicketConfirm(ctx context.Context, sess *Session, from, input string) error {
	switch strings.ToLower(input) {
	case "yes", "y", "submit", "confirm":
		ticketID, err := s.createTicket(ctx, sess)
		if err != nil {
			slog.Error("failed to create ticket", "from", from, "err", err)
			sess.reset()
			s.sessions.Set(from, sess)
			return s.send(ctx, from, "⚠️ Failed to raise your ticket. Please try again later.\n\nReply *0* for main menu.")
		}
		sess.reset()
		s.sessions.Set(from, sess)
		return s.send(ctx, from, msgTicketCreated(ticketID))

	case "no", "n", "cancel":
		sess.reset()
		s.sessions.Set(from, sess)
		return s.send(ctx, from, msgTicketCancelled)

	default:
		// Re-prompt — don't advance state.
		return s.send(ctx, from, msgTicketConfirmPrompt(sess.Ticket.Title, sess.Ticket.Description))
	}
}

// ─── Domain helpers ───────────────────────────────────────────────────────────

// createTicket persists the ticket draft to the database and returns its ID.
// ── TODO: inject a TicketRepository and replace this stub. ──────────────────
func (s *Service) createTicket(_ context.Context, sess *Session) (string, error) {
	// Placeholder — replace with actual Supabase insert once the schema is ready.
	ticketID := fmt.Sprintf("TKT-%s-001", strings.ToUpper(sess.Phone[len(sess.Phone)-4:]))
	slog.Info("ticket created (stub)",
		"id", ticketID,
		"phone", sess.Phone,
		"title", sess.Ticket.Title,
	)
	return ticketID, nil
}

// send is a convenience wrapper around the DoubleTick text API.
func (s *Service) send(ctx context.Context, to, text string) error {
	_, err := s.dt.SendText(ctx, to, text)
	if err != nil {
		return fmt.Errorf("whatsapp send to %s: %w", to, err)
	}
	return nil
}
