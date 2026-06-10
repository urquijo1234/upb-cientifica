package auth

import (
	"context"
	"log"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// Claves para almacenar info en el contexto
type contextKey string

const UserContextKey contextKey = "user"

// UnaryInterceptor valida JWT en cada llamada unary.
// Excepción: OpenSession (porque ahí se valida el JWT por primera vez).
func UnaryInterceptor(validator *JwtValidator) grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (interface{}, error) {
		// OpenSession lleva el JWT en el body, no en metadata
		if strings.HasSuffix(info.FullMethod, "/OpenSession") {
			return handler(ctx, req)
		}

		claims, err := extractAndValidate(ctx, validator)
		if err != nil {
			log.Printf("[gRPC auth] rechazo: %v", err)
			return nil, status.Errorf(codes.Unauthenticated, "JWT inválido: %v", err)
		}

		newCtx := context.WithValue(ctx, UserContextKey, claims)
		return handler(newCtx, req)
	}
}

// StreamInterceptor para los RPCs de streaming.
func StreamInterceptor(validator *JwtValidator) grpc.StreamServerInterceptor {
	return func(
		srv interface{},
		ss grpc.ServerStream,
		info *grpc.StreamServerInfo,
		handler grpc.StreamHandler,
	) error {
		claims, err := extractAndValidate(ss.Context(), validator)
		if err != nil {
			log.Printf("[gRPC stream auth] rechazo: %v", err)
			return status.Errorf(codes.Unauthenticated, "JWT inválido: %v", err)
		}

		wrapped := &wrappedStream{
			ServerStream: ss,
			ctx:          context.WithValue(ss.Context(), UserContextKey, claims),
		}
		return handler(srv, wrapped)
	}
}

type wrappedStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (w *wrappedStream) Context() context.Context {
	return w.ctx
}

func extractAndValidate(ctx context.Context, validator *JwtValidator) (*Claims, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "sin metadata")
	}

	auth := md.Get("authorization")
	if len(auth) == 0 {
		return nil, status.Error(codes.Unauthenticated, "sin header authorization")
	}

	token := strings.TrimPrefix(auth[0], "Bearer ")
	return validator.Validate(token)
}

// GetUser extrae los claims del contexto.
func GetUser(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(UserContextKey).(*Claims)
	return claims, ok
}