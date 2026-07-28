FROM golang:1.26.5-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /gateway ./cmd/server/main.go

FROM alpine:3.20
WORKDIR /root/
COPY --from=builder /gateway .
COPY --from=builder /app/configs ./configs
EXPOSE 8080
CMD ["./gateway"]
