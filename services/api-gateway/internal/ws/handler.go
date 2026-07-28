package ws

import (
	"net/http"

	"github.com/gorilla/websocket"
)

type Handler struct {
	wsHub    *Hub
	upgrader websocket.Upgrader
}

func NewHandler(hub *Hub, readBufferSize, writeBufferSize int) *Handler {
	return &Handler{
		wsHub: hub,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  readBufferSize,
			WriteBufferSize: writeBufferSize,
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	ServeWS(h.wsHub, conn)
}
